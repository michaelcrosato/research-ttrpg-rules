const path = require('path');
const fs = require('fs');

// Standalone memory test
async function run() {
  console.log("Starting standalone memory test...");
  
  // Construct large dataset (4,700 games)
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

  // Mock global/self context
  global.self = global;
  global.postMessage = (msg) => {
    // console.log("Worker posted message:", msg.type);
  };
  global.importScripts = (url) => {
    // Mock FlexSearch bundle
    global.FlexSearch = {
      Index: class {
        constructor() {
          this.docs = new Map();
          this.wordMap = new Map();
        }
        add(id, text) {
          this.docs.set(id, text);
          const words = text.toLowerCase().split(/[\s.]+/);
          for (const word of words) {
            if (!word) continue;
            for (let len = 1; len <= word.length; len++) {
              const prefix = word.substring(0, len);
              if (!this.wordMap.has(prefix)) {
                this.wordMap.set(prefix, new Set());
              }
              this.wordMap.get(prefix).add(id);
            }
          }
        }
        search(query, options) {
          const q = query.toLowerCase().trim();
          if (!q) return [];
          const matched = this.wordMap.get(q);
          if (matched) return Array.from(matched);
          return [];
        }
      }
    };
  };

  // Mock global fetch
  global.fetch = () => {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockRegistryPayload)
    });
  };

  // GC and measure memory before
  if (global.gc) {
    global.gc();
    console.log("Ran global.gc() before");
  } else {
    console.log("Warning: global.gc is not available. Run with node --expose-gc");
  }
  const memBefore = process.memoryUsage().heapUsed;

  // Load search-worker.js
  const workerCodePath = path.resolve(__dirname, '../search-worker.js');
  const workerCode = fs.readFileSync(workerCodePath, 'utf8');
  eval(workerCode);

  // Trigger initialization
  global.onmessage({ data: { type: 'init', dbUrl: 'registry.json' } });

  // Wait for init to complete
  await new Promise((resolve) => {
    const checkInit = setInterval(() => {
      if (global.isInitialized) {
        clearInterval(checkInit);
        resolve();
      }
    }, 10);
  });

  // GC and measure memory after
  if (global.gc) {
    global.gc();
    console.log("Ran global.gc() after");
  }
  const memAfter = process.memoryUsage().heapUsed;

  const diffMb = (memAfter - memBefore) / 1024 / 1024;
  console.log("\nStandalone memory results:");
  console.log(`- Games indexed: ${global.games.length}`);
  console.log(`- Memory before: ${(memBefore / 1024 / 1024).toFixed(3)} MB`);
  console.log(`- Memory after: ${(memAfter / 1024 / 1024).toFixed(3)} MB`);
  console.log(`- Net heap memory difference: ${diffMb.toFixed(3)} MB`);
}

run().catch(console.error);
