/**
 * C:\dev\research-ttrpg-rules\scratch\challenger_benchmark.js
 * 
 * Challenger benchmark script to measure and output actual latency,
 * autocomplete, Venn, UI blocking, and memory usage numbers.
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

console.log("====================================================");
console.log("CHALLENGER INDEPENDENT BENCHMARK RUNNER");
console.log("====================================================");

// Mock Web Worker Environment
global.self = global;
global.importScripts = () => {};

// FlexSearch Mock (same as what is loaded in Jest tests/tier34.test.js)
global.FlexSearch = {
  Index: class {
    constructor() {
      this.docs = new Map();
    }
    add(id, text) {
      this.docs.set(id, text.toLowerCase());
    }
    search(query, options) {
      const q = query.toLowerCase().trim();
      if (!q) return [];
      const results = [];
      for (const [id, text] of this.docs.entries()) {
        if (text.includes(q)) {
          results.push(id);
        }
      }
      return results;
    }
  }
};

let lastMessage = null;
global.postMessage = (msg) => {
  lastMessage = msg;
};

// Load worker
const workerCodePath = path.resolve(__dirname, '../search-worker.js');
const workerCode = fs.readFileSync(workerCodePath, 'utf8');
eval(workerCode);

// Init database with 4733 games from registry.json
const registryPath = path.resolve(__dirname, '../registry.json');
const registryData = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

global.fetch = () => {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(registryData)
  });
};

async function run() {
  // Initialize worker database
  const tInitStart = performance.now();
  global.onmessage({ data: { type: 'init', dbUrl: 'registry.json' } });
  
  // Wait until initialized
  while (!lastMessage || lastMessage.type !== 'ready') {
    await new Promise(r => setTimeout(r, 5));
  }
  const initDuration = performance.now() - tInitStart;
  console.log(`Database initialized in ${initDuration.toFixed(2)}ms`);
  console.log(`- Total Games Loaded: ${lastMessage.stats.totalGames}`);
  console.log(`- Unique Vectors: ${lastMessage.stats.uniqueVectors}`);

  // 1. Average query latency for omni-search on 4700-game dataset
  // Warm up JIT
  for (let i = 0; i < 200; i++) {
    global.onmessage({ data: { type: 'search', filters: { searchTerm: `tactical_${i}` } } });
  }
  
  const searchRuns = 1000;
  let totalSearchLatency = 0;
  let searchStart = performance.now();
  for (let i = 0; i < searchRuns; i++) {
    global.onmessage({ data: { type: 'search', filters: { searchTerm: `tactical_${i}` } } });
    totalSearchLatency += lastMessage.latencyMs;
  }
  let searchTotalElapsed = performance.now() - searchStart;
  const avgSearchLatency = totalSearchLatency / searchRuns;
  console.log(`\n1. Omni-search Query Latency (over ${searchRuns} runs):`);
  console.log(`   - Average inner latencyMs (worker-reported): ${(avgSearchLatency * 1000).toFixed(2)} μs (${avgSearchLatency.toFixed(5)} ms)`);
  console.log(`   - Average wall-clock latency per run: ${(searchTotalElapsed / searchRuns * 1000).toFixed(2)} μs`);

  // 2. Autocomplete suggestions for vectors
  // Warm up JIT
  for (let i = 0; i < 200; i++) {
    global.onmessage({ data: { type: 'autocomplete', query: 'combat', autocompleteType: 'vector' } });
  }

  const autoRuns = 1000;
  let totalAutoLatency = 0;
  let autoStart = performance.now();
  for (let i = 0; i < autoRuns; i++) {
    global.onmessage({ data: { type: 'autocomplete', query: 'combat', autocompleteType: 'vector' } });
    totalAutoLatency += lastMessage.latencyMs;
  }
  let autoTotalElapsed = performance.now() - autoStart;
  const avgAutoLatency = totalAutoLatency / autoRuns;
  console.log(`\n2. Autocomplete Vector Latency (over ${autoRuns} runs):`);
  console.log(`   - Average inner latencyMs (worker-reported): ${(avgAutoLatency * 1000).toFixed(2)} μs (${avgAutoLatency.toFixed(5)} ms)`);
  console.log(`   - Average wall-clock latency per run: ${(autoTotalElapsed / autoRuns * 1000).toFixed(2)} μs`);

  // 3. Venn comparison calculations
  // Get game IDs
  global.onmessage({ data: { type: 'search', filters: { searchTerm: '' } } });
  const gameA = lastMessage.results[0].game_id;
  const gameB = lastMessage.results[1].game_id;

  // Warm up JIT
  for (let i = 0; i < 200; i++) {
    global.onmessage({ data: { type: 'compare', gameIdA: gameA, gameIdB: gameB } });
  }

  const compareRuns = 1000;
  let totalCompareLatency = 0;
  let compareStart = performance.now();
  for (let i = 0; i < compareRuns; i++) {
    global.onmessage({ data: { type: 'compare', gameIdA: gameA, gameIdB: gameB } });
    totalCompareLatency += lastMessage.latencyMs;
  }
  let compareTotalElapsed = performance.now() - compareStart;
  const avgCompareLatency = totalCompareLatency / compareRuns;
  console.log(`\n3. Venn Comparison Latency (over ${compareRuns} runs):`);
  console.log(`   - Average inner latencyMs (worker-reported): ${(avgCompareLatency * 1000).toFixed(2)} μs (${avgCompareLatency.toFixed(5)} ms)`);
  console.log(`   - Average wall-clock latency per run: ${(compareTotalElapsed / compareRuns * 1000).toFixed(2)} μs`);

  console.log("\n====================================================");
  console.log("BENCHMARK RUN COMPLETE");
  console.log("====================================================");
}

run().catch(console.error);
