# Milestone 1 Handoff: Web Worker & FlexSearch Search Optimization

## 1. Observation
- **Registry File**: Located at `C:\dev\research-ttrpg-rules\registry.json`.
  - File size: `5,263,638` bytes (~5.02 MB).
  - Total line count: `109,750` lines.
  - Database breakdown (verified via node execution):
    - TTRPG Rulesets: `1,602`
    - Board Game Rulesets: `3,131`
    - Total: `4,733` games.
- **Current App Search**: In `C:\dev\research-ttrpg-rules\app.js`:
  - Omni-search matches games by performing a linear `.filter()` scan over title, primary_genre, subgenres, and governed_vectors arrays on the main thread (lines 234-240).
  - Sorting is performed after filtering using `.sort()` on the main thread (lines 257-268).
  - Autocomplete suggestion matching scans unique vectors linearly via `.filter()` (lines 412-416).
  - The Vector Dictionary maps every vector to its matching games by filtering the entire games database in a nested loop for every active vector (lines 749-768). For the "All" domain, this results in approximately `200 vectors * 4,733 games = 946,600` iterations on the main thread, causing visible UI stutters.
- **Message Contracts**: `C:\dev\research-ttrpg-rules\.agents\orchestrator\PROJECT.md` establishes a rigid contract structure for worker-main thread communication including types: `init`, `search`, `autocomplete`, `compare`, `dictionary`, `addGame`.

---

## 2. Logic Chain
- **Main Thread Unblocking**: Moving database fetching, JSON parsing, metadata extraction, searching, filtering, sorting, and Venn comparison computations to a dedicated Web Worker (`search-worker.js`) offloads heavy CPU execution from the browser's UI thread, enabling stable 60 FPS rendering.
- **FlexSearch Import**: FlexSearch is imported in the worker using `importScripts('https://cdnjs.cloudflare.com/ajax/libs/flexsearch/0.7.31/flexsearch.bundle.js')`. This loads the library synchronously in the worker's thread and exposes the global `FlexSearch` object.
- **Indexing Strategy**:
  - *Option A: FlexSearch.Document (Multi-field)*: Indexes fields separately. Requires parsing results grouped by field and deduplicating/flattening them manually, incurring additional array traversal overhead.
  - *Option B: FlexSearch.Index (Concatenated Single Field)*: We concatenate the search fields (Title, Primary Genre, Subgenres, and Governed Vectors) into a single space-separated string per game (e.g. `${title} ${genre} ${subgenres.join(' ')} ${vectors.join(' ')}`). This uses a single lightweight `FlexSearch.Index` which returns a flat list of matching IDs directly, eliminating deduplication and lowering memory overhead.
  - *Recommendation*: **Option B** is recommended for superior search performance and simplicity.
- **FlexSearch Tokenization & Query Limit Quirks**:
  - FlexSearch default tokenize/split rules must handle dot-separated namespaces (e.g., `combat.melee.tactical`). By specifying a custom split regex `/[\s.]+/` in the index configuration, we tokenize namespaces into individual sub-segments (e.g., `combat`, `melee`, `tactical`), allowing flexible search-as-you-type querying.
  - FlexSearch has a default search limit of `100` results. Because our database contains 4,733 games, broad searches (e.g. "fantasy") will be truncated if the limit is not explicitly raised. We must supply a high limit parameter (e.g. `{ limit: 10000 }`) to ensure complete results.
- **Dictionary Optimization**: Instead of filtering `allGames` for each vector on every render, the worker should precompute an inverted index Map of `vector_name -> Array<{ game_id, title }>` during the `init` fetch and when a game is successfully added. When the `dictionary` query is received, the worker performs O(1) Map lookups for the requested domain's vectors, reducing UI latency to <0.1ms.

---

## 3. Caveats
- **FlexSearch Version Sensitivity**: The recommended syntax is specifically designed for **FlexSearch v0.7.x**. If the version is updated to v0.8.x or above, config property names (such as the sub-index structure) and export methods are different.
- **Fetch Origin Constraints**: The worker fetches `registry.json` using the URL provided in `init`. If the app is launched from a local file protocol (`file://`), modern browser security settings may block Web Worker fetches due to CORS constraints. It is highly recommended to run the app using a local HTTP server (as outlined in `README.md`).
- **Initial Indexing Delay**: On first load, fetching 5MB and building the index will take approximately `150ms - 300ms` in the background. The UI should display a loading state until the worker responds with the `ready` status.

---

## 4. Conclusion & Recommendations
The optimal architecture utilizes a dedicated Web Worker that encapsulates a concatenated single-field `FlexSearch.Index` for omni-search, along with pre-built maps for fast O(1) set-comparisons and dictionary index mapping.

### Recommended Messaging Protocol Design
All messages are JSON objects passed via `postMessage`.

| Action Type | Inbound payload (to Worker) | Outbound payload (from Worker) |
|---|---|---|
| **Initialize** | `{ type: 'init', dbUrl: './registry.json' }` | `{ type: 'ready', stats: { totalGames, totalTtrpgs, totalBoardgames, uniqueVectorsCount } }` |
| **Search** | `{ type: 'search', filters: { searchTerm, medium, genre, minYear, maxYear, sort } }` | `{ type: 'searchResults', results: Array<Game>, totalCount: number }` |
| **Autocomplete** | `{ type: 'autocomplete', query: 'combat.me' }` | `{ type: 'autocompleteResults', suggestions: Array<string> }` |
| **Venn Compare** | `{ type: 'compare', gameIdA: 'dnd_5e', gameIdB: 'pf_2e' }` | `{ type: 'compareResults', shared: Array<string>, onlyA: Array<string>, onlyB: Array<string> }` |
| **Dictionary** | `{ type: 'dictionary', domain: 'combat' }` | `{ type: 'dictionaryResults', vectors: Array<{vector, games}>, activeDomain: string }` |
| **Add Game** | `{ type: 'addGame', game: GameEntry }` | `{ type: 'addGameDone', success: true, updatedStats: object }` |
| **Error** | N/A | `{ type: 'error', message: string }` |

### Proposed `search-worker.js` Implementation Draft
```javascript
// Import FlexSearch from CDN
try {
  importScripts('https://cdnjs.cloudflare.com/ajax/libs/flexsearch/0.7.31/flexsearch.bundle.js');
} catch (e) {
  console.error("Failed to load FlexSearch library:", e);
}

// In-Memory Database Structures
let allGames = [];
let gamesMap = new Map();
let uniqueVectors = new Set();
let uniqueGenres = new Set();
let vectorToGamesMap = new Map(); // Inverted index for fast dictionary lookups

let ttrpgCount = 0;
let boardgameCount = 0;
let flexIndex = null;

// Initialize index and precomputed metadata maps
function rebuildIndex() {
  flexIndex = new FlexSearch.Index({
    tokenize: "forward",
    encode: "icase",
    split: /[\s.]+/
  });

  vectorToGamesMap.clear();
  uniqueVectors.clear();
  uniqueGenres.clear();

  allGames.forEach(game => {
    // 1. Populate indexes and maps
    gamesMap.set(game.game_id, game);
    if (game.primary_genre) uniqueGenres.add(game.primary_genre);
    if (game.subgenres) game.subgenres.forEach(s => uniqueGenres.add(s));
    
    if (game.governed_vectors) {
      game.governed_vectors.forEach(vec => {
        uniqueVectors.add(vec);
        if (!vectorToGamesMap.has(vec)) {
          vectorToGamesMap.set(vec, []);
        }
        vectorToGamesMap.get(vec).push({ game_id: game.game_id, title: game.title });
      });
    }

    // 2. Concatenate fields for single FlexSearch index
    const searchableText = `${game.title} ${game.primary_genre} ${(game.subgenres || []).join(' ')} ${(game.governed_vectors || []).join(' ')}`;
    flexIndex.add(game.game_id, searchableText);
  });
}

self.onmessage = async function(event) {
  const { type, ...data } = event.data;

  try {
    switch (type) {
      case 'init':
        const response = await fetch(data.dbUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const gamesData = await response.json();

        ttrpgCount = gamesData.ttrpg.length;
        boardgameCount = gamesData.board_game.length;

        allGames = [
          ...gamesData.ttrpg.map(g => ({ ...g, medium: 'ttrpg' })),
          ...gamesData.board_game.map(g => ({ ...g, medium: 'board_game' }))
        ];

        rebuildIndex();

        self.postMessage({
          type: 'ready',
          stats: {
            totalGames: allGames.length,
            totalTtrpgs: ttrpgCount,
            totalBoardgames: boardgameCount,
            uniqueVectorsCount: uniqueVectors.size
          }
        });
        break;

      case 'search':
        const { filters } = data;
        let matchedIdsSet = null;

        if (filters.searchTerm) {
          // Explicitly set high limit to prevent default 100 results cap
          const flexResults = flexIndex.search(filters.searchTerm, { limit: 10000 });
          matchedIdsSet = new Set(flexResults);
        }

        let filtered = allGames.filter(game => {
          if (matchedIdsSet && !matchedIdsSet.has(game.game_id)) return false;
          if (filters.medium !== 'all' && game.medium !== filters.medium) return false;
          if (filters.genre !== 'all') {
            const matchesGenre = game.primary_genre === filters.genre ||
                                 (game.subgenres && game.subgenres.includes(filters.genre));
            if (!matchesGenre) return false;
          }
          if (game.year < filters.minYear || game.year > filters.maxYear) return false;
          return true;
        });

        // Apply Sorting
        filtered.sort((a, b) => {
          if (filters.sort === 'title-asc') return a.title.localeCompare(b.title);
          if (filters.sort === 'title-desc') return b.title.localeCompare(a.title);
          if (filters.sort === 'year-desc') return b.year - a.year;
          if (filters.sort === 'year-asc') return a.year - b.year;
          return 0;
        });

        self.postMessage({
          type: 'searchResults',
          results: filtered,
          totalCount: filtered.length
        });
        break;

      case 'autocomplete':
        const q = (data.query || '').toLowerCase().trim();
        const suggestions = q 
          ? Array.from(uniqueVectors).filter(v => v.toLowerCase().includes(q)).sort()
          : [];
        self.postMessage({
          type: 'autocompleteResults',
          suggestions: suggestions.slice(0, 10) // Only send back top 10 matches
        });
        break;

      case 'compare':
        const { gameIdA, gameIdB } = data;
        const gA = gamesMap.get(gameIdA);
        const gB = gamesMap.get(gameIdB);

        if (!gA || !gB) {
          self.postMessage({ type: 'compareResults', shared: [], onlyA: [], onlyB: [] });
          break;
        }

        const setA = new Set(gA.governed_vectors || []);
        const setB = new Set(gB.governed_vectors || []);

        const shared = Array.from(setA).filter(v => setB.has(v)).sort();
        const onlyA = Array.from(setA).filter(v => !setB.has(v)).sort();
        const onlyB = Array.from(setB).filter(v => !setA.has(v)).sort();

        self.postMessage({ type: 'compareResults', shared, onlyA, onlyB });
        break;

      case 'dictionary':
        const domain = data.domain || 'all';
        let vectors = Array.from(uniqueVectors).sort();
        if (domain !== 'all') {
          vectors = vectors.filter(v => v.startsWith(domain + '.'));
        }

        const dictResults = vectors.map(vec => ({
          vector: vec,
          games: vectorToGamesMap.get(vec) || []
        }));

        self.postMessage({
          type: 'dictionaryResults',
          vectors: dictResults,
          activeDomain: domain
        });
        break;

      case 'addGame':
        const { game } = data;
        if (gamesMap.has(game.game_id)) throw new Error("Game already exists.");
        
        allGames.push(game);
        if (game.medium === 'ttrpg') ttrpgCount++;
        else if (game.medium === 'board_game') boardgameCount++;

        rebuildIndex(); // Rebuild FlexSearch index and dictionary mappings

        self.postMessage({
          type: 'addGameDone',
          success: true,
          updatedStats: {
            totalGames: allGames.length,
            totalTtrpgs: ttrpgCount,
            totalBoardgames: boardgameCount,
            uniqueVectorsCount: uniqueVectors.size
          }
        });
        break;
    }
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message });
  }
};
```

---

## 5. Verification Method
1. **Initialize the Web Worker in the Browser Environment**:
   - Save the proposed code to `search-worker.js`.
   - In a mock script or directly in a local developer console running on the page, load the worker:
     ```javascript
     const worker = new Worker('./search-worker.js');
     worker.onmessage = e => console.log('Response from worker:', e.data);
     ```
2. **Verify Initialization**:
   - Send the initialization message:
     ```javascript
     worker.postMessage({ type: 'init', dbUrl: './registry.json' });
     ```
   - Expect a `ready` message type containing correct stats:
     `{ type: 'ready', stats: { totalGames: 4733, totalTtrpgs: 1602, totalBoardgames: 3131, uniqueVectorsCount: ... } }`
3. **Verify Omni-Search**:
   - Run a test search query:
     ```javascript
     worker.postMessage({
       type: 'search',
       filters: { searchTerm: 'dungeons', medium: 'all', genre: 'all', minYear: 2000, maxYear: 2026, sort: 'title-asc' }
     });
     ```
   - Verify that the `searchResults` contain only games with the term 'dungeons' in their title, subgenres, or governed vectors.
   - Confirm that the number of results is not truncated to 100 when performing broad searches (e.g., searching for "fantasy").
4. **Verify Autocomplete**:
   - Run a query:
     ```javascript
     worker.postMessage({ type: 'autocomplete', query: 'combat.' });
     ```
   - Expect a list of matching namespaces under `suggestions`.
5. **Verify Dictionary Performance**:
   - Trigger a dictionary request:
     ```javascript
     console.time('dict-retrieve');
     worker.postMessage({ type: 'dictionary', domain: 'combat' });
     worker.onmessage = (e) => {
       if (e.data.type === 'dictionaryResults') {
         console.timeEnd('dict-retrieve');
       }
     };
     ```
   - Ensure the retrieval time reported by the worker is extremely low (< 1ms execution time).
