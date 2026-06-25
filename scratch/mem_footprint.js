/**
 * C:\dev\research-ttrpg-rules\scratch\mem_footprint.js
 * 
 * Independent memory footprint test.
 */

const fs = require('fs');
const path = require('path');

const registryPath = path.resolve(__dirname, '../registry.json');
const registryData = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

// Combine and duplicate up to 4700+ if needed, but registry.json already has 4733!
// So let's just use the actual 4733 games in registry.json!
const allOriginalGames = [
  ...(registryData.ttrpg || []),
  ...(registryData.board_game || [])
];

const mockRegistryPayload = {
  ttrpg: allOriginalGames.filter(g => g.medium === 'ttrpg' || !g.medium),
  board_game: allOriginalGames.filter(g => g.medium === 'board_game')
};

global.fetch = () => {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(mockRegistryPayload)
  });
};

global.self = global;
global.importScripts = () => {
  // Mock FlexSearch indexing behavior to match the test environment
  global.FlexSearch = {
    Index: class {
      constructor() {
        this.docs = new Map();
      }
      add(id, text) {
        this.docs.set(id, text);
      }
      search(query, options) {
        return [];
      }
    }
  };
};

if (global.gc) global.gc();
const memBefore = process.memoryUsage().heapUsed;

global.postMessage = (msg) => {
  if (msg && msg.type === 'ready') {
    if (global.gc) global.gc();
    const memAfter = process.memoryUsage().heapUsed;
    const diffMb = (memAfter - memBefore) / 1024 / 1024;
    console.log(`MEM_DIFF_MB:${diffMb.toFixed(4)}`);
    console.log(`Heap before init: ${(memBefore / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Heap after init: ${(memAfter / 1024 / 1024).toFixed(2)} MB`);
    process.exit(0);
  }
};

const workerCodePath = path.resolve(__dirname, '../dist/search-worker.js');
const workerCode = fs.readFileSync(workerCodePath, 'utf8');
eval(workerCode);

global.onmessage({ data: { type: 'init', dbUrl: 'registry.json' } });
