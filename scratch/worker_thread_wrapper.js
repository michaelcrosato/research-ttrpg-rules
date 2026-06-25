
const { parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');

// Mock Web Worker environment
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
  // Mock FlexSearch
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

parentPort.on('message', async (msg) => {
  if (msg.type === 'init_with_data') {
    if (global.gc) global.gc();
    memBefore = process.memoryUsage().heapUsed;

    // Mock global fetch to return our dataset
    global.fetch = () => {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(msg.payload)
      });
    };

    // Load search-worker.js
    const workerCodePath = path.resolve(__dirname, '../search-worker.js');
    const workerCode = fs.readFileSync(workerCodePath, 'utf8');
    eval(workerCode);

    // Call init
    global.onmessage({ data: { type: 'init', dbUrl: 'registry.json' } });
  }
});
