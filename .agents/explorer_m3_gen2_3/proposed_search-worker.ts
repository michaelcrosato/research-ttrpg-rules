/**
 * search-worker.ts
 * 
 * Web Worker implementation for indexing, omni-search, vector dictionary lookup, 
 * Venn comparisons, and autocomplete in the Systems Indexer application.
 */

/// <reference lib="webworker" />

import {
  GameRuleset,
  GameRulesetInternal,
  DictionaryGameEntry,
  SearchWorkerRequest,
  SearchWorkerResponse,
  InitRequest,
  SearchRequest,
  AutocompleteRequest,
  CompareRequest,
  DictionaryRequest,
  AddGameRequest,
  AddVectorRequest
} from './types';

// Declare standard worker importScripts
declare function importScripts(...urls: string[]): void;

// Load FlexSearch via CDN
// Using importScripts as standard browser Worker functionality
importScripts('https://cdnjs.cloudflare.com/ajax/libs/flexsearch/0.7.31/flexsearch.bundle.js');

// Define a type-safe worker scope reference that wraps DedicatedWorkerGlobalScope
// and enforces strongly typed messages
interface SearchWorkerGlobalScope {
  onmessage: ((this: SearchWorkerGlobalScope, ev: MessageEvent<SearchWorkerRequest>) => any) | null;
  postMessage(message: SearchWorkerResponse): void;
  FlexSearch: typeof FlexSearch;
  importScripts(...urls: string[]): void;
  performance: Performance;
}

const worker = self as unknown as SearchWorkerGlobalScope;

let games: GameRulesetInternal[] = [];
let index: FlexSearch.Index | null = null;
let invertedIndex: Map<string, DictionaryGameEntry[]> = new Map();
let uniqueVectors: Set<string> = new Set();
let isInitialized = false;
let gamesMap: Map<string, GameRulesetInternal> = new Map();
let searchCache: Map<string, { results: GameRulesetInternal[]; totalCount: number; total: number }> = new Map();

// Optimized cache structures
let sortedUniqueVectors: string[] = [];
let vectorsByDomain: Map<string, string[]> = new Map(); // domain -> array of sorted vectors

// Handle messages from the main thread
worker.onmessage = async function(e: MessageEvent<SearchWorkerRequest>) {
  const data = e.data;
  if (!data) return;
  
  const type = data.type || data.action;

  try {
    switch (type) {
      case 'init':
        await handleInit(data as InitRequest);
        break;
      case 'search':
        handleSearch(data as SearchRequest);
        break;
      case 'autocomplete':
        handleAutocomplete(data as AutocompleteRequest);
        break;
      case 'compare':
        handleCompare(data as CompareRequest);
        break;
      case 'dictionary':
        handleDictionary(data as DictionaryRequest);
        break;
      case 'addGame':
        handleAddGame(data as AddGameRequest);
        break;
      case 'addVector':
        handleAddVector(data as AddVectorRequest);
        break;
      default:
        worker.postMessage({ type: 'error', action: type, error: `Unknown type: ${type}` });
    }
  } catch (error: any) {
    worker.postMessage({ type: 'error', action: type, error: error.message });
  }
};

/**
 * Rebuilds cached helper structures for optimized O(1) dictionary and autocomplete queries.
 */
function rebuildVectorsCache(): void {
  const allNamespaces = new Set<string>();
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
    vectorsByDomain.get(domain)!.push(vector);
  }
}

/**
 * Cleans, optimizes, and freezes a game object to minimize memory overhead
 * and pre-calculate helper structures like Sets.
 * 
 * @param game - Raw game object
 * @returns Cleaned and frozen game object
 */
function cleanAndFreezeGame(game: any): GameRulesetInternal {
  const clean: GameRulesetInternal = {
    game_id: game.game_id,
    title: game.title,
    year: game.year !== undefined ? Number(game.year) : 0,
    medium: game.medium as 'ttrpg' | 'board_game' | undefined,
    primary_genre: game.primary_genre,
    subgenres: game.subgenres || [],
    governed_vectors: game.governed_vectors || [],
    vector_explanations: game.vector_explanations || {},
    description: '',
    extract: '',
    governed_vectors_set: new Set()
  };
  
  // Pre-calculate Set for optimized O(1) lookup during Venn comparison
  clean.governed_vectors_set = new Set(clean.governed_vectors);
  
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
function addToIndexAndDictionary(game: GameRulesetInternal): void {
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
      if (!invertedIndex.has(vector)) {
        invertedIndex.set(vector, []);
      }
      
      // O(1) dictionary lookups require mapping vector -> Array<{ game_id, title }>
      invertedIndex.get(vector)!.push({
        game_id: game.game_id,
        title: game.title,
        medium: (game.medium || 'ttrpg') as 'ttrpg' | 'board_game',
        year: game.year
      });
    }
  }
}

/**
 * Initializes the database, fetches registry.json, builds indices.
 * 
 * @param data - Configuration data
 */
async function handleInit(data: InitRequest): Promise<void> {
  // Support both new dbUrl parameter and old payload url/dbUrl
  const url = data.dbUrl || (data.payload && (data.payload.dbUrl || data.payload.url)) || 'registry.json';
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch registry from ${url}: status ${response.status}`);
  }
  
  const registryData = (await response.json()) as { ttrpg?: GameRuleset[]; board_game?: GameRuleset[] };
  
  // Combine TTRPGs and Board Games, identifying medium, and clean/freeze them to minimize memory
  const ttrpgs = (registryData.ttrpg || []).map(g => cleanAndFreezeGame({ ...g, medium: 'ttrpg' }));
  const boardGames = (registryData.board_game || []).map(g => cleanAndFreezeGame({ ...g, medium: 'board_game' }));
  games = [...ttrpgs, ...boardGames];
  
  // Build a concatenated single-field FlexSearch.Index for fast omni-search, 
  // utilizing split regex /[\s.]+/ for namespaced vectors.
  // Configure suggest: true to support prefix matching and fuzzy search (edit distance up to 2).
  index = new worker.FlexSearch.Index({
    tokenize: "forward",
    split: /[\s.]+/,
    suggest: true
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
      uniqueVectors: uniqueVectorsCount
    }
  });
}

/**
 * Handles search requests using FlexSearch index combined with filters and sorting.
 * 
 * @param data - Search parameter data
 */
function handleSearch(data: SearchRequest): void {
  if (!isInitialized) {
    throw new Error('Worker is not initialized. Please run init action first.');
  }
  
  const t0 = performance.now();
  const filters = data.filters || data.payload || {};
  
  // Coerce inputs to strings robustly
  const searchTerm = String(filters.searchTerm || '');
  const medium = String(filters.medium || 'all');
  const genre = String(filters.genre || 'all');
  const minYear = filters.minYear !== undefined ? Number(filters.minYear) : 1900;
  const maxYear = filters.maxYear !== undefined ? Number(filters.maxYear) : 2100;
  const sort = String(filters.sort || 'title-asc');

  const cacheKey = JSON.stringify({
    searchTerm,
    medium,
    genre,
    minYear,
    maxYear,
    sort
  });
  if (searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey)!;
    const duration = performance.now() - t0;
    worker.postMessage({
      type: 'searchResults',
      action: 'search',
      results: cached.results,
      totalCount: cached.totalCount,
      total: cached.total,
      latencyMs: duration
    });
    return;
  }
  
  let matchedIds: (string | number)[] | null = null;
  const trimmedSearch = searchTerm.trim().toLowerCase();
  
  if (trimmedSearch) {
    // Make sure to specify a high limit (e.g., limit: 10000) and suggest: true for fuzzy search.
    if (index) {
      matchedIds = index.search(trimmedSearch, { limit: 10000, suggest: true });
    }
  }
  
  let results: GameRulesetInternal[] = [];
  if (matchedIds !== null) {
    // Relevance sorting fix: preserve the sorting order returned by FlexSearch's search()
    results = matchedIds.map(id => gamesMap.get(String(id))).filter((g): g is GameRulesetInternal => !!g);
  } else {
    results = [...games];
  }
  
  // Apply additional filters
  results = results.filter(game => {
    // Medium filter
    const m = game.medium ? String(game.medium).toLowerCase() : '';
    if (medium !== 'all' && m !== medium.toLowerCase()) {
      return false;
    }
    
    // Genre filter
    if (genre !== 'all') {
      const targetGenre = genre.toLowerCase();
      const matchesPrimary = game.primary_genre && String(game.primary_genre).toLowerCase() === targetGenre;
      const matchesSub = game.subgenres && game.subgenres.some(sub => String(sub).toLowerCase() === targetGenre);
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
        return ta < tb ? -1 : (ta > tb ? 1 : 0);
      }
      case 'title-desc': {
        const ta = a.title || '';
        const tb = b.title || '';
        return tb < ta ? -1 : (tb > ta ? 1 : 0);
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
    total: results.length
  });
  
  worker.postMessage({
    type: 'searchResults',
    action: 'search',
    results,
    totalCount: results.length,
    total: results.length,
    latencyMs: duration
  });
}

/**
 * Handles autocomplete requests for vector queries or general search autocomplete.
 * 
 * @param data - Autocomplete parameter data
 */
function handleAutocomplete(data: AutocompleteRequest): void {
  if (!isInitialized) {
    throw new Error('Worker is not initialized. Please run init action first.');
  }
  
  const t0 = performance.now();
  const query = data.query !== undefined ? data.query : (data.payload && data.payload.query) || '';
  const autocompleteType = data.autocompleteType || (data.payload && data.payload.type) || 'vector';
  
  const q = String(query || '').trim().toLowerCase();
  
  let results: any[] = [];
  if (autocompleteType === 'vector') {
    if (q) {
      // Use pre-sorted unique vectors to avoid sorting on every request!
      results = sortedUniqueVectors.filter(v => v.toLowerCase().includes(q));
    } else {
      results = sortedUniqueVectors;
    }
  } else {
    // Autocomplete type game
    if (q) {
      let matchedIds: (string | number)[] = [];
      if (index) {
        matchedIds = index.search(q, { limit: 10, suggest: true });
      }
      // Relevance sorting fix: preserve FlexSearch's relevance order using map/find
      results = matchedIds
        .map(id => gamesMap.get(String(id)))
        .filter((g): g is GameRulesetInternal => !!g)
        .map(game => ({ game_id: game.game_id, title: game.title }));
    }
  }
  
  const duration = performance.now() - t0;
  
  worker.postMessage({
    type: 'autocompleteResults',
    action: 'autocomplete',
    suggestions: autocompleteType === 'vector' ? (results as string[]) : [],
    results: results,
    latencyMs: duration
  });
}

/**
 * Handles comparing two games using native JS Set operations for Venn comparisons.
 * 
 * @param data - Compare parameter data
 */
function handleCompare(data: CompareRequest): void {
  if (!isInitialized) {
    throw new Error('Worker is not initialized. Please run init action first.');
  }
  
  const t0 = performance.now();
  const gameIdA = data.gameIdA || (data.payload && data.payload.gameIdA);
  const gameIdB = data.gameIdB || (data.payload && data.payload.gameIdB);
  
  if (!gameIdA || !gameIdB) {
    throw new Error('Both gameIdA and gameIdB must be provided.');
  }
  
  const gameA = games.find(g => g.game_id === gameIdA);
  const gameB = games.find(g => g.game_id === gameIdB);
  
  if (!gameA) {
    throw new Error(`Game A not found with ID: ${gameIdA}`);
  }
  if (!gameB) {
    throw new Error(`Game B not found with ID: ${gameIdB}`);
  }
  
  // Implement pre-calculated Set lookups for optimized Venn comparisons (shared, only A, only B) in under 100μs.
  const setA = gameA.governed_vectors_set;
  const setB = gameB.governed_vectors_set;
  
  const shared = gameA.governed_vectors.filter(v => setB.has(v)).sort();
  const onlyA = gameA.governed_vectors.filter(v => !setB.has(v)).sort();
  const onlyB = gameB.governed_vectors.filter(v => !setA.has(v)).sort();
  
  const duration = performance.now() - t0;
  
  worker.postMessage({
    type: 'compareResults',
    action: 'compare',
    gameA,
    gameB,
    shared,
    onlyA,
    onlyB,
    latencyMs: duration
  });
}

/**
 * Handles dictionary requests utilizing the precomputed inverted index.
 * Enables O(1) dictionary lookups.
 * 
 * @param data - Dictionary parameter data
 */
function handleDictionary(data: DictionaryRequest): void {
  if (!isInitialized) {
    throw new Error('Worker is not initialized. Please run init action first.');
  }
  
  const domain = data.domain || (data.payload && data.payload.domain) || 'all';
  const vector = data.vector || (data.payload && data.payload.vector) || null;
  
  if (vector) {
    // Search through all keys in invertedIndex for hierarchical matching
    const results: DictionaryGameEntry[] = [];
    const seenGameIds = new Set<string>();
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
      vectors: results
    });
    return;
  }
  
  // Get pre-grouped vectors list for domain in O(1)
  let vectors: string[] = [];
  if (domain === 'all') {
    vectors = sortedUniqueVectors;
  } else {
    vectors = vectorsByDomain.get(domain) || [];
  }
  
  const results = vectors
    .filter(vec => uniqueVectors.has(vec))
    .map(vec => ({
      vector: vec,
      games: invertedIndex.get(vec) || []
    }));
  
  worker.postMessage({
    type: 'dictionaryResults',
    action: 'dictionary',
    domain,
    activeDomain: domain,
    results,
    vectors: results
  });
}

/**
 * Dynamically adds a new game to the local memory database and indexes it.
 * 
 * @param data - AddGame parameter data
 */
function handleAddGame(data: AddGameRequest): void {
  if (!isInitialized) {
    throw new Error('Worker is not initialized. Please run init action first.');
  }
  
  const game = data.game || (data.payload && data.payload.game);
  if (!game || !game.game_id || !game.title) {
    throw new Error('Invalid game data provided for addGame action.');
  }
  
  const exists = games.some(g => g.game_id === game.game_id);
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
  const totalTtrpgs = games.filter(g => g.medium === 'ttrpg').length;
  const totalBoardgames = games.filter(g => g.medium === 'board_game').length;
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
      uniqueVectorsCount
    },
    stats: {
      totalGames,
      uniqueVectors: uniqueVectorsCount
    }
  });
}

/**
 * Dynamically adds a new custom vector to the uniqueVectors Set.
 * 
 * @param data - AddVector parameter data
 */
function handleAddVector(data: AddVectorRequest): void {
  const vector = data.vector || (data.payload && data.payload.vector);
  if (vector && !uniqueVectors.has(vector)) {
    uniqueVectors.add(vector);
    rebuildVectorsCache();
  }
}

// Expose functions globally for testing environments
if (typeof self !== 'undefined') {
  (self as any).handleSearch = handleSearch;
  (self as any).handleDictionary = handleDictionary;
}
