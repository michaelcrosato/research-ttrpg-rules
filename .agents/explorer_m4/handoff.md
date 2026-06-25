# Milestone 4 Handoff Report — Main Thread Integration

## 1. Observation

### Current Implementation in `app.js`
- **Database Fetching (Lines 29-41):** `loadDatabase` fetches `./registry.json` locally and maps it synchronously to `allGames`:
  ```javascript
  gamesData = await response.json();
  allGames = [
    ...gamesData.ttrpg.map(g => ({ ...g, medium: 'ttrpg' })),
    ...gamesData.board_game.map(g => ({ ...g, medium: 'board_game' }))
  ];
  ```
- **Explorer Grid Filtering & Sorting (Lines 230-268):** `renderExplorer` filters and sorts `allGames` synchronously on the main thread whenever the user types or updates filters:
  ```javascript
  let filtered = allGames.filter(game => {
    const matchesSearch = 
      game.title.toLowerCase().includes(filters.searchTerm) || ...
    ...
  });
  filtered.sort((a, b) => { ... });
  ```
- **Explorer Grid Rendering (Lines 285-325):** The DOM is rendered synchronously using `innerHTML` replacement for up to `visibleCount` cards (initial 60):
  ```javascript
  const visibleGames = filtered.slice(0, visibleCount);
  let cardsHTML = visibleGames.map(game => { ... }).join('');
  ...
  grid.innerHTML = cardsHTML;
  ```
- **Vector Search Autocomplete (Lines 418-447):** Keystroke events on `#vector-query-input` trigger synchronous inline filtering of the `uniqueVectors` Set:
  ```javascript
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    const matches = getMatches(val);
    ...
    suggestionsBox.innerHTML = matches.slice(0, 10).map(match => { ... });
  });
  ```
- **Venn Comparison Tool (Lines 562-585):** Clicking elements or changing selections triggers a synchronous comparison calculation on the main thread using JS Set operations:
  ```javascript
  const setA = new Set(gA.governed_vectors || []);
  const setB = new Set(gB.governed_vectors || []);
  const shared = Array.from(setA).filter(v => setB.has(v)).sort();
  const onlyA = Array.from(setA).filter(v => !setB.has(v)).sort();
  const onlyB = Array.from(setB).filter(v => !setA.has(v)).sort();
  ```
- **Vector Dictionary (Lines 733-768):** Clicking system domains filters unique vectors and scans the entire `allGames` array synchronously for matching vector associations:
  ```javascript
  container.innerHTML = vectors.map(vec => {
    const matchingGames = allGames.filter(g => g.governed_vectors && g.governed_vectors.includes(vec));
    ...
  });
  ```
- **BGG Integration & Database Editor (Lines 871-935, 975-1123):** Adds new games to local state `gamesData` and `allGames` synchronously, and executes BGG Search/Thing APIs to pre-fill editor forms.

### Search Worker API in `search-worker.js`
- **Worker Message Route (Lines 23-49):** The worker exposes a message receiver (`self.onmessage`) routing to:
  - `init` (builds indexes and O(1) autocomplete/dictionary cache maps, responds with `ready` status and `stats` payload)
  - `search` (executes FlexSearch queries, filters, sorts, responds with `searchResults` results list)
  - `autocomplete` (performs vector/game prefix matching, responds with `autocompleteResults` suggestions)
  - `compare` (calculates O(1) Venn diagrams using pre-cached Set instances, responds with `compareResults`)
  - `dictionary` (queries inverted index in O(1) to find games for a vector or lists all vectors in a domain, responds with `dictionaryResults`)
  - `addGame` (inserts and indexes new games dynamically, responds with `addGameDone` and updated statistics)

---

## 2. Logic Chain

1. **CPU Offloading:** Because all heavy data processing operations (FlexSearch text matching, year/medium/genre filtering, O(1) Venn set differences, O(1) dictionary maps, and sorting) are already implemented in `search-worker.js`, `app.js` can delegate all of these calculations by instantiating the worker once and posting JSON payloads.
2. **Concurrency & Latency:** Moving these computational bounds to a background worker reduces the main thread's duty cycle during search interactions to practically 0ms.
3. **Maintaining Asynchronous State:** Since Web Workers utilize asynchronous message passing, `app.js` must transition from its current synchronous execution model to an event-driven loop. A local state object in `app.js` tracking the current filter state, local reference copy of `allGames` (for modal render and forms), worker status (`isWorkerReady`), and currently active results (`currentSearchResults`) guarantees data synchronicity without double-fetching network resources.
4. **Rendering Bottlenecks:** Although the search worker can return filtered results in less than 5ms, rendering large lists (greater than 100 cards) via string manipulation (`grid.innerHTML = cardsHTML`) forces the browser's layout engine to block the main thread, introducing input latency (jank) during user typing.
5. **Dynamic Frame Budgets:** By using a dynamic budget checker inside `requestAnimationFrame`, we can append DOM elements in small chunks using `DocumentFragment`. Constraining each frame's execution slice (`performance.now() - startTime > 5` milliseconds) leaves the browser sufficient time to compute layout and paint under 8ms, satisfying a strict 60 FPS constraint.

---

## 3. Caveats

- **Network Fetch Cache:** The search worker fetches `registry.json` internally using the URL provided in the `init` action. To avoid double-downloading the database, the server configuration must support standard HTTP caching (e.g., `Cache-Control`). Alternatively, the browser handles double-fetching of identical assets locally using browser-internal disk/memory caches.
- **Worker State Mutability:** When the user utilizes the database editor to write a new game, the game is appended to the worker's in-memory array and indexed. `app.js` must update its local arrays (`allGames`, `gamesData`) in response to the `addGameDone` worker message to keep the editor's check list, comparison dropdowns, and download previews updated.
- **Typing Debouncing:** To avoid flooding the worker thread message queue during extremely rapid keystrokes, the search inputs in `app.js` should be debounced by 150-200ms.

---

## 4. Conclusion

The integration of `search-worker.js` and a progressive card rendering mechanism in `app.js` will fully eliminate main-thread bottlenecks. Below is the technical design to be used during the implementation phase.

### A. Worker Instantiation and Message Handling in `app.js`

Add the following initialization logic to `app.js`:

```javascript
let searchWorker;
let isWorkerReady = false;
let currentSearchResults = [];

// Initialize Web Worker
function initSearchWorker() {
  searchWorker = new Worker('search-worker.js');
  
  searchWorker.onmessage = function(e) {
    const data = e.data;
    if (!data) return;
    
    switch (data.type) {
      case 'ready':
        handleWorkerReady(data);
        break;
      case 'searchResults':
        handleWorkerSearchResults(data);
        break;
      case 'autocompleteResults':
        handleWorkerAutocompleteResults(data);
        break;
      case 'compareResults':
        handleWorkerCompareResults(data);
        break;
      case 'dictionaryResults':
        handleWorkerDictionaryResults(data);
        break;
      case 'addGameDone':
        handleWorkerAddGameDone(data);
        break;
      case 'error':
        console.error("Worker error:", data.error);
        break;
    }
  };
}
```

#### Message Router Handlers

1. **`handleWorkerReady(data)`**
   - Sets `isWorkerReady = true`.
   - Populates stats dashboard using `data.stats`:
     ```javascript
     document.getElementById('stat-total-games').textContent = data.stats.totalGames;
     document.getElementById('stat-total-ttrpgs').textContent = data.stats.ttrpgCount;
     document.getElementById('stat-total-boardgames').textContent = data.stats.boardGameCount;
     document.getElementById('stat-total-vectors').textContent = data.stats.uniqueVectors;
     ```
   - Triggers the first grid render: `renderExplorer()`.

2. **`handleWorkerSearchResults(data)`**
   - Stores results: `currentSearchResults = data.results`.
   - Updates count: `document.getElementById('results-count-number').textContent = data.totalCount`.
   - Invokes progressive renderer on `currentSearchResults.slice(0, visibleCount)`.

3. **`handleWorkerAutocompleteResults(data)`**
   - Populates `#vector-query-suggestions` list based on `data.suggestions` matching the current search input text.

4. **`handleWorkerCompareResults(data)`**
   - Renders the Venn diagram circles (A Exclusive, Shared, B Exclusive counts) and inserts the lists in `#comparison-results` exactly as previously done, using `data.shared`, `data.onlyA`, `data.onlyB`.

5. **`handleWorkerDictionaryResults(data)`**
   - If `data.vector` is present (Single Vector Search result):
     Renders the matching games list in `#vector-search-results`.
   - If `data.vector` is null (Domain Dictionary result):
     Renders all vectors inside the active domain list in `#dict-results-list`.

6. **`handleWorkerAddGameDone(data)`**
   - Inserts `data.game` into the local `gamesData[medium]` and `allGames` arrays.
   - Triggers UI refreshes: `processMetadata()`, `renderDashboardStats()`, `populateGenreDropdown()`, `initializeCompareTool()`, `renderDictSidebar()`, and `updateEditorPreviews()`.
   - Resets the editor forms and fires `renderExplorer()` to refresh the active grid.

---

### B. Progressive Card Renderer Design

To prevent main-thread blockages, `app.js` will render cards using `requestAnimationFrame` with a dynamic 5ms execution budget per frame:

```javascript
let currentRenderJob = null;

/**
 * Creates a DOM element representing a game card.
 * Pre-instantiating elements is required for DocumentFragment updates.
 */
function createCardDOM(game) {
  const card = document.createElement('div');
  card.className = `game-card ${game.medium}`;
  card.addEventListener('click', () => openGameDetails(game.game_id));
  
  const content = document.createElement('div');
  
  const cardTop = document.createElement('div');
  cardTop.className = 'card-top';
  cardTop.innerHTML = `
    <span class="medium-badge ${game.medium}-badge">${game.medium === 'ttrpg' ? 'TTRPG' : 'Board Game'}</span>
    <span class="year-badge">${game.year}</span>
  `;
  content.appendChild(cardTop);
  
  const title = document.createElement('h2');
  title.textContent = game.title;
  content.appendChild(title);
  
  const genre = document.createElement('div');
  genre.className = 'primary-genre';
  genre.textContent = game.primary_genre;
  content.appendChild(genre);
  
  const tags = document.createElement('div');
  tags.className = 'subgenres-tags';
  if (game.subgenres) {
    game.subgenres.forEach(sub => {
      const tag = document.createElement('span');
      tag.className = 'subgenre-tag';
      tag.textContent = sub;
      tags.appendChild(tag);
    });
  }
  content.appendChild(tags);
  card.appendChild(content);
  
  const preview = document.createElement('div');
  preview.className = 'vectors-preview';
  const vectorsText = game.governed_vectors ? game.governed_vectors.slice(0, 3).join(', ') : 'none';
  const vectorsRemain = game.governed_vectors && game.governed_vectors.length > 3 
    ? ` (+${game.governed_vectors.length - 3} more)` 
    : '';
  preview.innerHTML = `<span>Vectors:</span> ${vectorsText}${vectorsRemain}`;
  card.appendChild(preview);
  
  return card;
}

/**
 * Progressive Card Renderer
 * Renders lists of games in batches using requestAnimationFrame, honoring the 8ms thread budget.
 */
function progressiveRender(gamesToRender, totalFilteredCount, gridElement) {
  // Cancel previous render queues
  if (currentRenderJob !== null) {
    cancelAnimationFrame(currentRenderJob);
    currentRenderJob = null;
  }
  
  gridElement.innerHTML = '';
  
  if (gamesToRender.length === 0) {
    gridElement.innerHTML = `
      <div class="no-results-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <p>No games in registry match your search filters.</p>
      </div>
    `;
    return;
  }
  
  let index = 0;
  
  // Optimization: If results list is <= 100 elements, render synchronously to display instantly
  if (gamesToRender.length <= 100) {
    const fragment = document.createDocumentFragment();
    for (const game of gamesToRender) {
      fragment.appendChild(createCardDOM(game));
    }
    gridElement.appendChild(fragment);
    return;
  }
  
  // Otherwise, render progressively in chunks (task duration strictly < 8ms)
  function renderBatch() {
    const startTime = performance.now();
    const fragment = document.createDocumentFragment();
    
    while (index < gamesToRender.length) {
      const game = gamesToRender[index];
      fragment.appendChild(createCardDOM(game));
      index++;
      
      // Dynamic budget constraint: yield execution if frame time exceeds 5ms
      if (performance.now() - startTime > 5) {
        break;
      }
    }
    
    gridElement.appendChild(fragment);
    
    if (index < gamesToRender.length) {
      currentRenderJob = requestAnimationFrame(renderBatch);
    } else {
      currentRenderJob = null;
      // Append Load More button if totalFilteredCount > visibleCount
      if (totalFilteredCount > visibleCount) {
        appendLoadMoreButton(gridElement, totalFilteredCount);
      }
    }
  }
  
  currentRenderJob = requestAnimationFrame(renderBatch);
}

function appendLoadMoreButton(gridElement, totalFilteredCount) {
  const container = document.createElement('div');
  container.className = 'load-more-container';
  
  const button = document.createElement('button');
  button.className = 'btn-load-more';
  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="6 9 12 15 18 9"></polyline></svg>
    <span>Load More (${totalFilteredCount - visibleCount} remaining)</span>
  `;
  button.addEventListener('click', () => {
    visibleCount += 60;
    const nextSlice = currentSearchResults.slice(0, visibleCount);
    progressiveRender(nextSlice, currentSearchResults.length, gridElement);
  });
  
  container.appendChild(button);
  gridElement.appendChild(container);
}
```

---

### C. Refactoring Action Plan for `app.js`

1. **State Redefinition:** Define `searchWorker`, `isWorkerReady`, and `currentSearchResults` global state variables at the top of `app.js`.
2. **Worker Instantiation:** Call `initSearchWorker()` inside `DOMContentLoaded` event listener.
3. **Registry Double-fetch Resolution:** Modify `loadDatabase` to run local setup files asynchronously and fire `init` to the worker.
4. **Input Debouncing:** Add a simple debounce function for `#omni-search` keyboard events:
   ```javascript
   function debounce(func, wait) {
     let timeout;
     return function(...args) {
       clearTimeout(timeout);
       timeout = setTimeout(() => func.apply(this, args), wait);
     };
   }
   ```
   Wrap the `#omni-search` input event callback in this debouncer (150ms) to reduce redundant worker processing.
5. **Re-route Intersecting UI Calls:**
   - Replace local filters in `renderExplorer()` with `searchWorker.postMessage({ type: 'search', filters })`.
   - Replace autocomplete filtering with `searchWorker.postMessage({ type: 'autocomplete', query, autocompleteType: 'vector' })`.
   - Replace Venn calculation with `searchWorker.postMessage({ type: 'compare', gameIdA, gameIdB })`.
   - Replace dictionary listing with `searchWorker.postMessage({ type: 'dictionary', domain })`.
   - Replace dictionary individual search with `searchWorker.postMessage({ type: 'dictionary', vector })`.
   - Replace local indexing in `addNewGame()` with `searchWorker.postMessage({ type: 'addGame', game })`.
6. **Swap Render Methods:** Bind grid DOM updates to `progressiveRender()`.

---

## 5. Verification Method

To verify the integration, execute the following commands and check the specified targets:

1. **Verify Test Suite passes:**
   Run the project's test suite to ensure the search worker tests and end-to-end tests continue to succeed:
   ```pwsh
   npm test
   ```
2. **Inspect Chrome/Edge DevTools Performance Timeline:**
   - Select the Search Omni bar in the explorer view and type rapidly.
   - Record a 5-second CPU performance profile.
   - Verify that there are **0 Long Tasks** (tasks taking > 50ms) and that typing tasks take **< 8ms**, guaranteeing 60 FPS.
3. **Verify DOM Slicing and Card Appending:**
   - Search for a broad term (e.g. empty search showing all games).
   - Scroll down to check if the cards load progressively without freezing.
   - Click "Load More" and verify the next batch of 60 cards appends correctly.
