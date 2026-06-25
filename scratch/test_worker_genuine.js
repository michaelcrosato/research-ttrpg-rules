const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');

// We will write a worker thread script to scratch/worker_thread_wrapper.js
const wrapperCode = `
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
`;

fs.writeFileSync(path.resolve(__dirname, 'worker_thread_wrapper.js'), wrapperCode);

// Main thread code: construct large dataset (4,700 games) and send to worker thread
const registryPath = path.resolve(__dirname, '../registry.json');
const registryData = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

const allOriginalGames = [
  ...(registryData.ttrpg || []),
  ...(registryData.board_game || [])
];

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

const mockRegistryPayload = {
  ttrpg: largeGamesList.filter(g => g.medium === 'ttrpg' || !g.medium),
  board_game: largeGamesList.filter(g => g.medium === 'board_game')
};

console.log("Constructed large dataset with", largeGamesList.length, "games.");

const worker = new Worker(path.resolve(__dirname, 'worker_thread_wrapper.js'));

worker.on('message', (msg) => {
  if (msg.type === 'result') {
    console.log("Memory Measurement Result:");
    console.log(`- Games indexed: ${msg.totalGames}`);
    console.log(`- Net heap memory difference: ${msg.diffMb.toFixed(3)} MB`);
    process.exit(0);
  }
});

worker.postMessage({ type: 'init_with_data', payload: mockRegistryPayload });
