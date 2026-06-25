const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

console.log("=== STARTING PROGRESSIVE RENDERING BENCHMARK ===");

// 1. Setup JSDOM
const htmlPath = path.resolve(__dirname, '../index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const dom = new JSDOM(htmlContent, { url: "http://localhost" });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.performance = performance;

// Polyfill requestAnimationFrame and cancelAnimationFrame
let rAFCallbacks = [];
global.requestAnimationFrame = (callback) => {
  rAFCallbacks.push(callback);
  return rAFCallbacks.length - 1;
};
global.cancelAnimationFrame = (id) => {
  rAFCallbacks[id] = null;
};

// Read app.js code and append global exports for benchmarking
const appCodePath = path.resolve(__dirname, '../app.js');
let appCode = fs.readFileSync(appCodePath, 'utf8');

// Append exports to global
appCode += `
global.progressiveRender = progressiveRender;
global.createCardDOM = createCardDOM;
`;

// Evaluate app.js
try {
  eval(appCode);
  console.log("✔ app.js evaluated successfully with exported functions.");
} catch (err) {
  console.error("❌ Failed to evaluate app.js:", err);
  process.exit(1);
}

// Helper to generate mock games
function generateMockGames(count) {
  const mockGames = [];
  for (let i = 0; i < count; i++) {
    mockGames.push({
      game_id: `game_${i}`,
      title: `Game Card Title ${i} - Stress Testing progressive rendering batch sizes`,
      year: 2020 + (i % 7),
      medium: i % 2 === 0 ? 'ttrpg' : 'board_game',
      primary_genre: 'Strategy',
      subgenres: ['Tactical', 'Combat'],
      governed_vectors: ['combat.melee.tactical', 'economy.market.worker_placement']
    });
  }
  return mockGames;
}

const gridElement = document.getElementById('games-grid');

// TEST A: default visibleCount (60 games) - Synchronous Path
console.log(`\n--- TEST A: Rendering 60 games (default visibleCount) ---`);
gridElement.innerHTML = '';
rAFCallbacks = [];
const start60 = performance.now();
global.progressiveRender(generateMockGames(60), 60, gridElement);
const duration60 = performance.now() - start60;
console.log(`- Rendering 60 games synchronously took: ${duration60.toFixed(3)} ms`);
console.log(`  rAF callbacks registered: ${rAFCallbacks.length}`);
if (duration60 > 8.0) {
  console.warn(`⚠ WARNING: Rendering 60 games synchronously exceeded 8ms frame budget!`);
} else {
  console.log(`✔ SUCCESS: Rendering 60 games synchronously is under 8ms.`);
}

// TEST B: boundary count (100 games) - Synchronous Path
console.log(`\n--- TEST B: Rendering 100 games (boundary of synchronous path) ---`);
gridElement.innerHTML = '';
rAFCallbacks = [];
const start100 = performance.now();
global.progressiveRender(generateMockGames(100), 100, gridElement);
const duration100 = performance.now() - start100;
console.log(`- Rendering 100 games synchronously took: ${duration100.toFixed(3)} ms`);
console.log(`  rAF callbacks registered: ${rAFCallbacks.length}`);
if (duration100 > 8.0) {
  console.warn(`⚠ WARNING: Rendering 100 games synchronously exceeded 8ms frame budget!`);
} else {
  console.log(`✔ SUCCESS: Rendering 100 games synchronously is under 8ms.`);
}

// TEST C: progressive rendering path (500 games)
console.log(`\n--- TEST C: Rendering 500 games (progressive path) ---`);
gridElement.innerHTML = '';
rAFCallbacks = [];
const start500 = performance.now();
global.progressiveRender(generateMockGames(500), 500, gridElement);
console.log(`- Initiated progressive render. rAF callbacks registered: ${rAFCallbacks.length}`);

// Run the requestAnimationFrame queue manually and measure the duration of each batch
let batchIndex = 0;
let maxBatchDuration = 0;
while (rAFCallbacks.length > 0) {
  const callbacksToRun = [...rAFCallbacks];
  rAFCallbacks = [];
  
  for (const cb of callbacksToRun) {
    if (cb) {
      const batchStart = performance.now();
      cb();
      const batchEnd = performance.now();
      const batchDuration = batchEnd - batchStart;
      maxBatchDuration = Math.max(maxBatchDuration, batchDuration);
      console.log(`  * Batch ${batchIndex++} JS execution time: ${batchDuration.toFixed(3)} ms (created ${gridElement.children.length} total elements)`);
    }
  }
}
const duration500 = performance.now() - start500;
console.log(`- Rendering 500 games progressively took: ${duration500.toFixed(3)} ms (total time across all frames)`);
console.log(`- Maximum single batch duration: ${maxBatchDuration.toFixed(3)} ms`);

if (maxBatchDuration > 8.0) {
  console.warn(`⚠ WARNING: At least one batch exceeded 8ms frame budget!`);
} else {
  console.log(`✔ SUCCESS: All progressive rendering batches stayed under 8ms frame budget.`);
}

console.log("\n=== PROGRESSIVE RENDERING BENCHMARK COMPLETE ===");
process.exit(0);
