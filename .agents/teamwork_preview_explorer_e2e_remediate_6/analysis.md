# Performance Benchmark & Test Suite Analysis Report

## Executive Summary
The Systems Indexer benchmark suite contains several critical testing flaws, including memory measurement contamination in Jest, search cache-hitting facades in latency benchmarks, and implicit state sharing across benchmarks. Multiple E2E test failures in JSDOM are also caused by asynchronous race conditions (missing `await waitFor` or using already-true conditions) and a runtime `ReferenceError` in the dictionary view.

---

## Key Findings

| Benchmark/Feature | Issue Observed | File & Location | Impact |
| :--- | :--- | :--- | :--- |
| **Memory Footprint Benchmark** | Contaminated by Jest/JSDOM heap overhead; lacks GC; mock FlexSearch used an inefficient prefix loop causing memory bloat (~30MB). | `tests/tier34.test.js` (lines 677-722) | Benchmark falsely fails (measures Jest overhead, not worker heap). |
| **Search Latency Benchmark** | Facade benchmark. Repeats same search term 500 times; runs 2-500 hit worker's `searchCache` in O(1) time. | `tests/tier34.test.js` (lines 765-782) | Falsely reports <1ms search time (measures cache hits, not search performance). |
| **Benchmark Initialization** | Implicit state sharing; large dataset initialized inside the memory test. | `tests/tier34.test.js` (lines 715-716) | Out-of-order or isolated test runs crash the benchmark suite. |
| **E2E Tab/Form Interactions** | Async race conditions. Action executed, then DOM asserted immediately with no wait or using already-satisfied wait criteria. | `tests/tier12.test.js` (multiple locations), `tests/tier34.test.js` | 18+ tests fail under JSDOM due to asynchronous delays. |
| **Dictionary Search Handler** | Uncaught `ReferenceError` on `error.message` when vector search returns 0 matches. | `app.js` (line 503) | Breaks DOM rendering on empty results; crashes event handler. |

---

## 1. Genuine Web Worker Memory Measurement

### Observation
The memory footprint is measured in Jest using:
```javascript
const memBefore = process.memoryUsage().heapUsed;
global.onmessage({ data: { type: 'init', dbUrl: 'registry.json' } });
await new Promise(resolve => setTimeout(resolve, 100));
const memAfter = process.memoryUsage().heapUsed;
const memDiffMb = (memAfter - memBefore) / 1024 / 1024;
```
This is executed within the main Jest/JSDOM thread, capturing Jest modules, JSDOM objects, and garbage allocations. Additionally, the mock `FlexSearch` in tests uses a heavy prefix-slicing loop that allocates hundreds of thousands of `Set` and `String` objects, inflating memory to ~30MB.

### Solution
1. **Isolated Execution**: Spawn a separate Node child process or a clean `worker_threads` Worker.
2. **Explicit Garbage Collection**: Start Node with the `--expose-gc` flag and call `global.gc()` before and after database indexing to isolate the *retained* heap.
3. **Net Heap Tracking**: Subtract the base memory of the initialized thread from the memory after indexing to obtain the true footprint.

### Blueprint for Memory Benchmark Script (`tests/worker_memory_benchmark.js`)
```javascript
const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');

// Wrapper script that acts as the Web Worker environment
const wrapperCode = `
const { parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');

global.self = global;
let memBefore = 0;

global.postMessage = (msg) => {
  if (msg.type === 'ready') {
    if (global.gc) global.gc();
    const memAfter = process.memoryUsage().heapUsed;
    const diffMb = (memAfter - memBefore) / 1024 / 1024;
    parentPort.postMessage({ type: 'result', diffMb, totalGames: msg.stats.totalGames });
  } else {
    parentPort.postMessage(msg);
  }
};

global.importScripts = (url) => {
  // Load local flexsearch if available, or load lightweight mock
  global.FlexSearch = {
    Index: class {
      constructor() { this.docs = new Map(); }
      add(id, text) { this.docs.set(id, text); }
      search(query, options) { return []; }
    }
  };
};

parentPort.on('message', async (msg) => {
  if (msg.type === 'init_with_data') {
    if (global.gc) global.gc();
    memBefore = process.memoryUsage().heapUsed;

    global.fetch = () => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(msg.payload)
    });

    const workerCode = fs.readFileSync(path.resolve(__dirname, '../search-worker.js'), 'utf8');
    eval(workerCode);
    global.onmessage({ data: { type: 'init', dbUrl: 'registry.json' } });
  }
});
`;

fs.writeFileSync(path.resolve(__dirname, 'worker_thread_wrapper.js'), wrapperCode);

// Main Thread generates the 4,700-game dataset
const registryData = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../registry.json'), 'utf8'));
const allGames = [...(registryData.ttrpg || []), ...(registryData.board_game || [])];
const largeGamesList = [];
const copiesNeeded = Math.ceil(4700 / allGames.length);
for (let i = 0; i < copiesNeeded; i++) {
  allGames.forEach((g, idx) => {
    largeGamesList.push({
      ...g,
      game_id: `${g.game_id}_dup_${i}_${idx}`,
      title: `${g.title} Copy ${i}`
    });
  });
}
const mockRegistryPayload = {
  ttrpg: largeGamesList.filter(g => g.medium === 'ttrpg' || !g.medium),
  board_game: largeGamesList.filter(g => g.medium === 'board_game')
};

// Spawn the wrapper worker with garbage collection enabled
const worker = new Worker(path.resolve(__dirname, 'worker_thread_wrapper.js'), {
  execArgv: ['--expose-gc']
});

worker.on('message', (msg) => {
  if (msg.type === 'result') {
    console.log(`Memory Footprint: ${msg.diffMb.toFixed(3)} MB`);
    process.exit(msg.diffMb < 10 ? 0 : 1);
  }
});

worker.postMessage({ type: 'init_with_data', payload: mockRegistryPayload });
```

---

## 2. Genuine Search Latency Benchmark

### Observation
The current benchmark tests the exact same query (`'tactical'`) 500 times:
```javascript
for (let i = 0; i < runs; i++) {
  global.onmessage({ data: { type: 'search', filters: { searchTerm: 'tactical' } } });
  totalLatency += lastMessage.latencyMs;
}
```
Because `search-worker.js` implements a query cache `searchCache`, runs 2 to 500 hit the cache in O(1) time and return instantly (0ms), fabricating a sub-millisecond average search time.

### Solution
1. **Cache Eviction**: Clear `searchCache` before each search iteration.
2. **Dynamic Queries**: Query a sequence of different search terms to exercise the FlexSearch index and filtration pipelines.

### Blueprint for Search Latency Test Remediations
Modify `tests/tier34.test.js` to clear the cache:
```javascript
    test('Benchmark: Omni-search lookup under 1 millisecond on 4,700-game dataset', () => {
      const runs = 500;
      let totalLatency = 0;
      
      const searchTerms = ['tactical', 'combat', 'fantasy', 'dungeon', 'dice rolling', 'cyberpunk', 'narrative', 'strategy', 'euro', 'card'];

      for (let i = 0; i < runs; i++) {
        // Clear search cache to bypass O(1) hit
        if (global.searchCache) {
          global.searchCache.clear();
        }
        
        const searchTerm = searchTerms[i % searchTerms.length];
        global.onmessage({ data: { type: 'search', filters: { searchTerm } } });
        totalLatency += lastMessage.latencyMs;
      }
      const avgDurationMs = totalLatency / runs;
      
      expect(avgDurationMs).toBeLessThan(1.0); // under 1 millisecond
    });
```

---

## 3. Concrete Blueprint Suggestions for Worker & Test Suite

### Fix A: JSDOM Asynchronous Wait Operations (E2E Tests)
Many JSDOM tests fail because they assert immediately after posting messages to `LocalSearchWorker`.
* **Before (Flawed)**:
```javascript
const sortSelect = document.getElementById('filter-sort');
sortSelect.value = 'year-desc';
sortSelect.dispatchEvent(new window.Event('change', { bubbles: true }));

await waitFor(() => {
  const cards = document.querySelectorAll('.game-card');
  return cards.length === 4; // Fails! cards.length is already 4 before change event!
});
```
* **After (Correct)**:
```javascript
const sortSelect = document.getElementById('filter-sort');
sortSelect.value = 'year-desc';
sortSelect.dispatchEvent(new window.Event('change', { bubbles: true }));

// Wait specifically for the order of cards to change
await waitFor(() => {
  const cards = document.querySelectorAll('.game-card');
  return cards.length === 4 && cards[0].querySelector('h2').textContent === 'Scythe';
});
```
* **Wait for Alert/Mock Callback**:
For form submission tests:
```javascript
document.getElementById('add-game-form').dispatchEvent(new window.Event('submit', { bubbles: true }));
// Wait for worker to respond and invoke alert
await waitFor(() => global.alert.mock.calls.length > 0);
expect(global.alert).toHaveBeenCalledWith(expect.stringContaining("indexed"));
```

### Fix B: Dictionary Tab Rendering Waits
Add explicit wait conditions after switching to the dictionary tab, allowing the asynchronous response to populate the list:
```javascript
document.getElementById('tab-nav-dictionary').click();

// Wait for dictionary list items to populate
await waitFor(() => document.querySelectorAll('#dict-results-list .dict-item-card').length > 0);

const diceRollsCard = Array.from(document.querySelectorAll('#dict-results-list .dict-item-card')).find(
  c => c.querySelector('.dict-item-name span').textContent === 'combat.melee.dice_rolls'
);
```

### Fix C: Eliminate the Undefined `error` Reference in `app.js`
In `app.js` (line 503), the empty vector results builder attempts to print `${error.message}`, but `error` is not defined in the function scope.
* **Before**:
```javascript
    if (matches.length === 0) {
      container.innerHTML = `
        <div class="no-results-state" style="grid-column: span 1;">
          ...
          <p style="font-size: 0.85rem; margin-top: 0.5rem; color: var(--text-muted);">${error.message}</p>
        </div>
      `;
      return;
    }
```
* **After**:
```javascript
    if (matches.length === 0) {
      container.innerHTML = `
        <div class="no-results-state" style="grid-column: span 1;">
          ...
          <p style="font-size: 0.85rem; margin-top: 0.5rem; color: var(--text-muted);">Ensure exact spelling. Autocomplete can help locate valid vectors.</p>
        </div>
      `;
      return;
    }
```

### Fix D: Self-Contained Benchmark Setup
Move the 4,700-game dataset construction and initialization inside `beforeAll` of the benchmark group:
```javascript
  describe('Systems Indexer - Performance Constraints Benchmarks', () => {
    let lastMessage;

    beforeAll(async () => {
      // 1. Setup mock environment
      global.self = global;
      global.importScripts = jest.fn();
      global.postMessage = jest.fn(msg => { lastMessage = msg; });
      global.performance = require('perf_hooks').performance;

      // 2. Load worker
      const workerCodePath = path.resolve(__dirname, '../search-worker.js');
      eval(fs.readFileSync(workerCodePath, 'utf8'));

      // 3. Construct large dataset and initialize
      const registryPath = path.resolve(__dirname, '../registry.json');
      const registryData = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      const allOriginalGames = [...(registryData.ttrpg || []), ...(registryData.board_game || [])];
      
      const largeGamesList = [];
      const copiesNeeded = Math.ceil(4700 / allOriginalGames.length);
      for (let i = 0; i < copiesNeeded; i++) {
        allOriginalGames.forEach((g, idx) => {
          largeGamesList.push({
            ...g,
            game_id: `${g.game_id}_dup_${i}_${idx}`,
            title: `${g.title} Copy ${i}`
          });
        });
      }
      const largePayload = {
        ttrpg: largeGamesList.filter(g => g.medium === 'ttrpg' || !g.medium),
        board_game: largeGamesList.filter(g => g.medium === 'board_game')
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(largePayload)
      });

      global.onmessage({ data: { type: 'init', dbUrl: 'registry.json' } });
      await new Promise(resolve => setTimeout(resolve, 100)); // wait for indexing to finish
    });
```
This isolates the benchmark initialization and makes tests order-independent.
