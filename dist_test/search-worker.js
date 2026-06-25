/// <reference lib="webworker" />
// Load FlexSearch locally
// Using importScripts as standard browser Worker functionality
importScripts('./flexsearch.bundle.js');
const worker = self;
let games = [];
let index = null;
let invertedIndex = new Map();
let uniqueVectors = new Set();
let isInitialized = false;
let gamesMap = new Map();
let activeSearchTimeout = null;
let activeSearchId = 0;
let searchCache = new Map();
// Optimized cache structures
let sortedUniqueVectors = [];
let vectorsByDomain = new Map(); // domain -> array of sorted vectors
function handleInitWrapper(data, type) {
    handleInit(data).catch((error) => {
        worker.postMessage({
            type: 'error',
            action: type,
            error: error instanceof Error ? error.message : String(error),
        });
    });
}
// Handle messages from the main thread
worker.onmessage = function (e) {
    activeSearchId++;
    if (activeSearchTimeout) {
        clearTimeout(activeSearchTimeout);
        activeSearchTimeout = null;
    }
    const data = (e && e.data) || {};
    const type = data.type || data.action;
    try {
        switch (type) {
            case 'init':
                handleInitWrapper(data, type);
                break;
            case 'search':
                handleSearch(data);
                break;
            case 'autocomplete':
                handleAutocomplete(data);
                break;
            case 'compare':
                handleCompare(data);
                break;
            case 'dictionary':
                handleDictionary(data);
                break;
            case 'addGame':
                handleAddGame(data);
                break;
            case 'addVector':
                handleAddVector(data);
                break;
            default:
                worker.postMessage({
                    type: 'error',
                    action: type,
                    error: `Unknown type: ${type}`,
                });
        }
    }
    catch (error) {
        worker.postMessage({
            type: 'error',
            action: type,
            error: error instanceof Error ? error.message : String(error),
        });
    }
};
/**
 * Rebuilds cached helper structures for optimized O(1) dictionary and autocomplete queries.
 */
function rebuildVectorsCache() {
    const allNamespaces = new Set();
    for (const vector of uniqueVectors) {
        const parts = vector.split('.');
        let current = '';
        for (let i = 0; i < parts.length; i++) {
            current = current ? current + '.' + parts[i] : parts[i];
            allNamespaces.add(current);
        }
    }
    sortedUniqueVectors = Array.from(allNamespaces).sort((a, b) => a.localeCompare(b));
    vectorsByDomain.clear();
    for (const vector of sortedUniqueVectors) {
        const domain = vector.split('.')[0] || 'general';
        if (!vectorsByDomain.has(domain)) {
            vectorsByDomain.set(domain, []);
        }
        vectorsByDomain.get(domain).push(vector);
    }
}
/**
 * Cleans, optimizes, and freezes a game object to minimize memory overhead
 * and pre-calculate helper structures like Sets.
 *
 * @param game - Raw game object
 * @returns Cleaned and frozen game object
 */
function cleanAndFreezeGame(game) {
    const clean = {
        game_id: game.game_id,
        title: game.title,
        year: game.year !== undefined ? Number(game.year) : 0,
        medium: game.medium,
        primary_genre: game.primary_genre,
        subgenres: game.subgenres || [],
        governed_vectors: game.governed_vectors || [],
        vector_explanations: game.vector_explanations || {},
        description: game.description || '',
        extract: game.extract || '',
        governed_vectors_set: new Set(game.governed_vectors || []),
    };
    // Freeze to minimize memory overhead in V8
    Object.freeze(clean.subgenres);
    Object.freeze(clean.governed_vectors);
    Object.freeze(clean.vector_explanations);
    Object.freeze(clean);
    return clean;
}
/**
 * Adds a single game to both the FlexSearch index and the inverted index dictionary.
 *
 * @param game - Game data object
 */
function addToIndexAndDictionary(game) {
    // Construct search content
    const title = game.title || '';
    const primaryGenre = game.primary_genre || '';
    const subgenresStr = (game.subgenres || []).join(' ');
    const vectorsStr = (game.governed_vectors || []).join(' ');
    const searchContent = `${title} ${primaryGenre} ${subgenresStr} ${vectorsStr}`;
    // Add to FlexSearch Index
    if (index) {
        index.add(game.game_id, searchContent);
    }
    // Update inverted index for O(1) lookups and uniqueVectors Set
    if (game.governed_vectors) {
        for (const vector of game.governed_vectors) {
            uniqueVectors.add(vector);
            let list = invertedIndex.get(vector);
            if (!list) {
                list = [];
                invertedIndex.set(vector, list);
            }
            // O(1) dictionary lookups require mapping vector -> Array<{ game_id, title }>
            list.push({
                game_id: game.game_id,
                title: game.title,
                medium: game.medium,
                year: game.year,
            });
        }
    }
}
/**
 * Initializes the database, fetches registry.json, builds indices.
 *
 * @param data - Configuration data
 */
async function handleInit(data) {
    let registryData = data.registryData || (data.payload && data.payload.registryData);
    if (!registryData) {
        // Support both new dbUrl parameter and old payload url/dbUrl
        const url = data.dbUrl || (data.payload && (data.payload.dbUrl || data.payload.url)) || 'registry.json';
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch registry from ${url}: status ${response.status}`);
        }
        const parsed = (await response.json());
        registryData = {
            ttrpg: parsed.ttrpg || [],
            board_game: parsed.board_game || [],
        };
    }
    // Combine TTRPGs and Board Games, identifying medium, and clean/freeze them to minimize memory
    const ttrpgs = (registryData.ttrpg || []).map((g) => cleanAndFreezeGame({ ...g, medium: 'ttrpg' }));
    const boardGames = (registryData.board_game || []).map((g) => cleanAndFreezeGame({ ...g, medium: 'board_game' }));
    games = [...ttrpgs, ...boardGames];
    // Build a concatenated single-field FlexSearch.Index for fast omni-search,
    // utilizing split regex /[\s.]+/ for namespaced vectors.
    // Configure suggest: true to support prefix matching and fuzzy search (edit distance up to 2).
    index = new worker.FlexSearch.Index({
        tokenize: 'forward',
        split: /[\s.]+/,
        suggest: true,
    });
    // Reset state
    invertedIndex = new Map();
    uniqueVectors = new Set();
    gamesMap = new Map();
    searchCache.clear();
    // Populate indices
    for (const game of games) {
        gamesMap.set(game.game_id, game);
        addToIndexAndDictionary(game);
    }
    // Build pre-sorted vectors cache
    rebuildVectorsCache();
    isInitialized = true;
    const totalGames = games.length;
    const totalTtrpgs = ttrpgs.length;
    const totalBoardgames = boardGames.length;
    const uniqueVectorsCount = uniqueVectors.size;
    worker.postMessage({
        type: 'ready',
        action: 'init',
        success: true,
        stats: {
            totalGames,
            totalTtrpgs,
            totalBoardgames,
            uniqueVectorsCount,
            ttrpgCount: totalTtrpgs,
            boardGameCount: totalBoardgames,
            uniqueVectors: uniqueVectorsCount,
        },
    });
}
/**
 * Streams search results progressively in chunks of 200 items.
 */
function streamSearchResults(results, totalCount, latencyMs, searchId) {
    const chunkSize = 200;
    if (results.length === 0) {
        worker.postMessage({
            type: 'searchResults',
            action: 'search',
            chunkIndex: 0,
            results: [],
            totalCount,
            total: totalCount,
            isComplete: true,
            latencyMs,
        });
        return;
    }
    // Send first chunk immediately
    const chunk0 = results.slice(0, chunkSize);
    const isComplete0 = results.length <= chunkSize;
    worker.postMessage({
        type: 'searchResults',
        action: 'search',
        chunkIndex: 0,
        results: chunk0,
        totalCount,
        total: totalCount,
        isComplete: isComplete0,
        latencyMs,
    });
    if (isComplete0) {
        return;
    }
    let chunkIndex = 1;
    const sendNextChunk = () => {
        if (searchId !== activeSearchId) {
            return;
        }
        const start = chunkIndex * chunkSize;
        const end = start + chunkSize;
        const chunk = results.slice(start, end);
        const isComplete = end >= results.length;
        worker.postMessage({
            type: 'searchResults',
            action: 'search',
            chunkIndex,
            results: chunk,
            totalCount,
            total: totalCount,
            isComplete,
            latencyMs,
        });
        if (!isComplete) {
            chunkIndex++;
            activeSearchTimeout = setTimeout(sendNextChunk, 0);
        }
    };
    activeSearchTimeout = setTimeout(sendNextChunk, 0);
}
/**
 * Handles search requests using FlexSearch index combined with filters and sorting.
 *
 * @param data - Search parameter data
 */
function handleSearch(data) {
    if (!isInitialized) {
        throw new Error('Worker is not initialized. Please run init action first.');
    }
    activeSearchId++;
    const searchId = activeSearchId;
    const t0 = performance.now();
    const filters = data.filters || data.payload || {};
    const searchTerm = String(filters.searchTerm || '');
    const medium = String(filters.medium || 'all');
    const genre = String(filters.genre || 'all');
    const minYear = Number(filters.minYear !== undefined ? filters.minYear : -10000);
    const maxYear = Number(filters.maxYear !== undefined ? filters.maxYear : 10000);
    const sort = String(filters.sort || 'title-asc');
    const cacheKey = JSON.stringify({
        searchTerm,
        medium,
        genre,
        minYear,
        maxYear,
        sort,
    });
    if (searchCache.has(cacheKey)) {
        const cached = searchCache.get(cacheKey);
        const duration = performance.now() - t0;
        streamSearchResults(cached.results, cached.totalCount, duration, searchId);
        return;
    }
    let matchedIds = null;
    const trimmedSearch = searchTerm.trim().toLowerCase();
    if (trimmedSearch) {
        // Make sure to specify a high limit (e.g., limit: 10000) and suggest: true for fuzzy search.
        if (index) {
            matchedIds = index.search(trimmedSearch, { limit: 10000, suggest: true });
        }
    }
    let results = [];
    if (matchedIds !== null) {
        // Relevance sorting fix: preserve the sorting order returned by FlexSearch's search()
        results = matchedIds.map((id) => gamesMap.get(String(id))).filter((g) => !!g);
    }
    else {
        results = [...games];
    }
    // Apply additional filters
    results = results.filter((game) => {
        // Medium filter
        const m = game.medium ? String(game.medium).toLowerCase() : '';
        if (medium !== 'all' && m !== medium.toLowerCase()) {
            return false;
        }
        // Genre filter
        if (genre !== 'all') {
            const targetGenre = genre.toLowerCase();
            const matchesPrimary = game.primary_genre && String(game.primary_genre).toLowerCase() === targetGenre;
            const matchesSub = game.subgenres && game.subgenres.some((sub) => String(sub).toLowerCase() === targetGenre);
            if (!matchesPrimary && !matchesSub) {
                return false;
            }
        }
        // Year filter
        const y = Number(game.year);
        if (y < minYear || y > maxYear) {
            return false;
        }
        return true;
    });
    // Apply sorting
    results.sort((a, b) => {
        switch (sort) {
            case 'title-asc': {
                const ta = a.title || '';
                const tb = b.title || '';
                return ta < tb ? -1 : ta > tb ? 1 : 0;
            }
            case 'title-desc': {
                const ta = a.title || '';
                const tb = b.title || '';
                return tb < ta ? -1 : tb > ta ? 1 : 0;
            }
            case 'year-asc':
                return (a.year || 0) - (b.year || 0);
            case 'year-desc':
                return (b.year || 0) - (a.year || 0);
            default:
                return 0; // Preserves the relative order (relevance order from FlexSearch!)
        }
    });
    const duration = performance.now() - t0;
    searchCache.set(cacheKey, {
        results,
        totalCount: results.length,
        total: results.length,
    });
    streamSearchResults(results, results.length, duration, searchId);
}
/**
 * Handles autocomplete requests for vector queries or general search autocomplete.
 *
 * @param data - Autocomplete parameter data
 */
function handleAutocomplete(data) {
    if (!isInitialized) {
        throw new Error('Worker is not initialized. Please run init action first.');
    }
    const t0 = performance.now();
    const query = data.query !== undefined ? data.query : (data.payload && data.payload.query) || '';
    const autocompleteType = data.autocompleteType || (data.payload && data.payload.type) || 'vector';
    const q = String(query || '')
        .trim()
        .toLowerCase();
    let suggestions = [];
    let results = [];
    if (autocompleteType === 'vector') {
        if (q) {
            // Use pre-sorted unique vectors to avoid sorting on every request!
            suggestions = sortedUniqueVectors.filter((v) => v.toLowerCase().includes(q));
        }
        else {
            suggestions = sortedUniqueVectors;
        }
        results = suggestions;
    }
    else {
        // Autocomplete type game
        if (q) {
            let matchedIds = [];
            if (index) {
                matchedIds = index.search(q, { limit: 10, suggest: true });
            }
            // Relevance sorting fix: preserve FlexSearch's relevance order using map/find
            results = matchedIds
                .map((id) => gamesMap.get(String(id)))
                .filter((g) => !!g)
                .map((game) => ({ game_id: game.game_id, title: game.title }));
        }
    }
    const duration = performance.now() - t0;
    worker.postMessage({
        type: 'autocompleteResults',
        action: 'autocomplete',
        suggestions,
        results,
        latencyMs: duration,
    });
}
/**
 * Handles comparing two games using native JS Set operations for Venn comparisons.
 *
 * @param data - Compare parameter data
 */
function handleCompare(data) {
    if (!isInitialized) {
        throw new Error('Worker is not initialized. Please run init action first.');
    }
    const t0 = performance.now();
    const gameIdA = data.gameIdA || (data.payload && data.payload.gameIdA);
    const gameIdB = data.gameIdB || (data.payload && data.payload.gameIdB);
    if (!gameIdA || !gameIdB) {
        throw new Error('Game IDs gameIdA and gameIdB are required for comparison.');
    }
    const gameA = games.find((g) => g.game_id === gameIdA);
    const gameB = games.find((g) => g.game_id === gameIdB);
    if (!gameA) {
        throw new Error(`Game A not found with ID: ${gameIdA}`);
    }
    if (!gameB) {
        throw new Error(`Game B not found with ID: ${gameIdB}`);
    }
    // Implement pre-calculated Set lookups for optimized Venn comparisons (shared, only A, only B) in under 100μs.
    const setA = gameA.governed_vectors_set;
    const setB = gameB.governed_vectors_set;
    const shared = gameA.governed_vectors.filter((v) => setB.has(v)).sort();
    const onlyA = gameA.governed_vectors.filter((v) => !setB.has(v)).sort();
    const onlyB = gameB.governed_vectors.filter((v) => !setA.has(v)).sort();
    const duration = performance.now() - t0;
    worker.postMessage({
        type: 'compareResults',
        action: 'compare',
        gameA,
        gameB,
        shared,
        onlyA,
        onlyB,
        latencyMs: duration,
    });
}
/**
 * Handles dictionary requests utilizing the precomputed inverted index.
 * Enables O(1) dictionary lookups.
 *
 * @param data - Dictionary parameter data
 */
function handleDictionary(data) {
    if (!isInitialized) {
        throw new Error('Worker is not initialized. Please run init action first.');
    }
    const domain = data.domain || (data.payload && data.payload.domain) || 'all';
    const vector = data.vector || (data.payload && data.payload.vector) || null;
    if (vector) {
        // Search through all keys in invertedIndex for hierarchical matching
        const results = [];
        const seenGameIds = new Set();
        for (const [key, gamesList] of invertedIndex.entries()) {
            if (key === vector || key.startsWith(vector + '.')) {
                for (const game of gamesList) {
                    if (!seenGameIds.has(game.game_id)) {
                        seenGameIds.add(game.game_id);
                        results.push(game);
                    }
                }
            }
        }
        results.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        worker.postMessage({
            type: 'dictionaryResults',
            action: 'dictionary',
            vector,
            results,
            vectors: results,
        });
        return;
    }
    // Get pre-grouped vectors list for domain in O(1)
    let vectors = [];
    if (domain === 'all') {
        vectors = sortedUniqueVectors;
    }
    else {
        vectors = vectorsByDomain.get(domain) || [];
    }
    const results = vectors
        .filter((vec) => uniqueVectors.has(vec))
        .map((vec) => ({
        vector: vec,
        games: invertedIndex.get(vec) || [],
    }));
    worker.postMessage({
        type: 'dictionaryResults',
        action: 'dictionary',
        activeDomain: domain,
        domain,
        results,
        vectors: results,
    });
}
/**
 * Dynamically adds a new game to the local memory database and indexes it.
 *
 * @param data - AddGame parameter data
 */
function handleAddGame(data) {
    if (!isInitialized) {
        throw new Error('Worker is not initialized. Please run init action first.');
    }
    const game = data.game || (data.payload && data.payload.game);
    if (!game || !game.game_id || !game.title) {
        throw new Error('Invalid game data provided for addGame action.');
    }
    const exists = games.some((g) => g.game_id === game.game_id);
    if (exists) {
        throw new Error(`Game with ID '${game.game_id}' already exists.`);
    }
    const cleaned = cleanAndFreezeGame(game);
    games.push(cleaned);
    gamesMap.set(cleaned.game_id, cleaned);
    addToIndexAndDictionary(cleaned);
    searchCache.clear();
    // Rebuild the cached vectors structures
    rebuildVectorsCache();
    const totalGames = games.length;
    const totalTtrpgs = games.filter((g) => g.medium === 'ttrpg').length;
    const totalBoardgames = games.filter((g) => g.medium === 'board_game').length;
    const uniqueVectorsCount = uniqueVectors.size;
    worker.postMessage({
        type: 'addGameDone',
        action: 'addGame',
        success: true,
        game: cleaned,
        updatedStats: {
            totalGames,
            totalTtrpgs,
            totalBoardgames,
            uniqueVectorsCount,
        },
        stats: {
            totalGames,
            uniqueVectors: uniqueVectorsCount,
        },
    });
}
/**
 * Dynamically adds a new custom vector to the uniqueVectors Set.
 *
 * @param data - AddVector parameter data
 */
function handleAddVector(data) {
    const vector = data.vector || (data.payload && data.payload.vector);
    if (vector && !uniqueVectors.has(vector)) {
        uniqueVectors.add(vector);
        rebuildVectorsCache();
    }
}
// Expose functions globally for testing environments
if (typeof self !== 'undefined') {
    self.handleSearch = handleSearch;
    self.handleDictionary = handleDictionary;
}

