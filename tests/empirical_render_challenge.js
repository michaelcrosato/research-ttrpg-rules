/**
 * tests/empirical_render_challenge.js
 *
 * Standalone stress test and performance verification script for progressive rendering
 * and main thread blockage in app.js.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { performance } = require('perf_hooks');

console.log('====================================================');
console.log('STARTING EMPIRICAL RENDER & MAIN THREAD CHALLENGE');
console.log('====================================================');

// 1. Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const { window } = dom;
const { document } = window;

const htmlPath = path.resolve(__dirname, '../index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');
document.documentElement.innerHTML = htmlContent;

// Expose globals for app.js
global.window = window;
global.document = document;
global.navigator = window.navigator;
global.HTMLElement = window.HTMLElement;
global.HTMLButtonElement = window.HTMLButtonElement;
global.DOMParser = window.DOMParser;
global.alert = console.log;

// Track requestAnimationFrame callbacks
let rafCallbacks = [];
window.requestAnimationFrame = (cb) => {
  rafCallbacks.push(cb);
  return rafCallbacks.length;
};
window.cancelAnimationFrame = (id) => {
  rafCallbacks[id - 1] = null;
};

// Also define globally for Node.js environment
global.requestAnimationFrame = window.requestAnimationFrame;
global.cancelAnimationFrame = window.cancelAnimationFrame;

// Polyfill performance on window
window.performance = performance;

// Load the actual registry database and duplicate it to create 500 games for testing
const registryPath = path.resolve(__dirname, '../registry.json');
const realRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

const baseTtrpgs = realRegistry.ttrpg || [];
const baseBoardGames = realRegistry.board_game || [];

const mockTtrpgs = [];
const mockBoardGames = [];
const allMockVectors = new Set();

const copiesNeeded = Math.ceil(500 / (baseTtrpgs.length + baseBoardGames.length));

for (let c = 0; c < copiesNeeded; c++) {
  baseTtrpgs.forEach((g, idx) => {
    const game = {
      ...g,
      game_id: `${g.game_id}_dup_${c}_${idx}`,
      title: `${g.title} Copy ${c}`,
      medium: 'ttrpg',
    };
    mockTtrpgs.push(game);
    if (g.governed_vectors) {
      g.governed_vectors.forEach((v) => allMockVectors.add(v));
    }
  });

  baseBoardGames.forEach((g, idx) => {
    const game = {
      ...g,
      game_id: `${g.game_id}_dup_${c}_${idx}`,
      title: `${g.title} Copy ${c}`,
      medium: 'board_game',
    };
    mockBoardGames.push(game);
    if (g.governed_vectors) {
      g.governed_vectors.forEach((v) => allMockVectors.add(v));
    }
  });
}

const largeMockData = {
  ttrpg: mockTtrpgs,
  board_game: mockBoardGames,
};

const allGamesList = [...mockTtrpgs, ...mockBoardGames];

// Mock fetch to return duplicated dataset
global.fetch = function (url) {
  if (url.includes('registry.json')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(largeMockData),
    });
  }
  return Promise.reject(new Error(`Unhandled URL in test fetch: ${url}`));
};

// Intercept worker message post
let workerOnMessageListener = null;
class MockWorker {
  constructor(url) {
    this.url = url;
    this._onmessage = null;
  }

  set onmessage(listener) {
    this._onmessage = listener;
    workerOnMessageListener = listener;

    // Simulate sending ready message
    setTimeout(() => {
      if (this._onmessage) {
        this._onmessage({
          data: {
            type: 'ready',
            action: 'init',
            success: true,
            stats: {
              totalGames: allGamesList.length,
              ttrpgCount: mockTtrpgs.length,
              boardGameCount: mockBoardGames.length,
              uniqueVectors: allMockVectors.size,
            },
          },
        });
      }
    }, 1);
  }

  get onmessage() {
    return this._onmessage;
  }

  postMessage(data) {
    // Process search/compare/autocomplete requests asynchronously
    setTimeout(() => {
      if (!this._onmessage) return;
      const type = data.type || data.action;

      if (type === 'search') {
        this._onmessage({
          data: {
            type: 'searchResults',
            action: 'search',
            results: allGamesList,
            totalCount: allGamesList.length,
          },
        });
      }
    }, 1);
  }
}
window.Worker = MockWorker;
global.Worker = MockWorker;

// Load app.js
require('../app.js');

// Function to run callbacks in requestAnimationFrame
function flushAnimationFrame() {
  const callbacks = [...rafCallbacks];
  rafCallbacks = [];
  let executedCount = 0;
  for (const cb of callbacks) {
    if (cb) {
      cb();
      executedCount++;
    }
  }
  return executedCount;
}

async function runTests() {
  try {
    // Initialize app
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 50)); // let async init complete

    console.log('✔ Application loaded');
    const gamesCount = document.getElementById('stat-total-games').textContent;
    const vectorsCount = document.getElementById('stat-total-vectors').textContent;
    console.log(`- Loaded Games Count (from DOM stats): ${gamesCount}`);
    console.log(`- Loaded Unique Vectors (from DOM stats): ${vectorsCount}`);

    // =========================================================================
    // CHALLENGE 1: Synchronous render limit bypass (length <= 100)
    // =========================================================================
    console.log('\n--- CHALLENGE 1: Synchronous Rendering Bypass (<= 100 elements) ---');
    // We want to trigger a search results message containing 100 games
    // Since visibleCount starts at 60, we call window.loadMoreGames() once to make visibleCount = 120.
    window.loadMoreGames(); // now visibleCount = 120

    const games100 = allGamesList.slice(0, 100);
    const grid = document.getElementById('games-grid');

    // Measure synchronous execution time of progressiveRender by posting searchResults directly
    const t0 = performance.now();
    workerOnMessageListener({
      data: {
        type: 'searchResults',
        results: games100,
        totalCount: games100.length,
      },
    });
    const t1 = performance.now();
    const renderTime100 = t1 - t0;

    console.log(`- Time to render 100 games (synchronous bypass): ${renderTime100.toFixed(2)} ms`);
    console.log(`- Grid DOM child count: ${grid.querySelectorAll('.game-card').length}`);

    const limitBypassViolation = renderTime100 > 8.0;
    if (limitBypassViolation) {
      console.log(
        `⚠ VIOLATION: Synchronous rendering of 100 games took ${renderTime100.toFixed(2)}ms, exceeding the 8ms layout/render frame budget!`
      );
    } else {
      console.log('✔ PASS: Synchronous bypass is under 8ms.');
    }

    // =========================================================================
    // CHALLENGE 2: Progressive rendering batch durations (> 100 elements)
    // =========================================================================
    console.log('\n--- CHALLENGE 2: Progressive Rendering Batch Durations (> 100 elements) ---');
    // Call loadMoreGames multiple times to increase visibleCount so we can test 500 games
    for (let i = 0; i < 8; i++) {
      window.loadMoreGames();
    }
    // Now visibleCount is 120 + 8 * 60 = 600

    const games500 = allGamesList; // 500 games

    // We override requestAnimationFrame to measure batch duration
    const batchTimes = [];
    const originalRAF = window.requestAnimationFrame;

    window.requestAnimationFrame = (cb) => {
      const wrappedCb = () => {
        const start = performance.now();
        cb();
        const duration = performance.now() - start;
        batchTimes.push(duration);
      };
      rafCallbacks.push(wrappedCb);
      return rafCallbacks.length;
    };
    global.requestAnimationFrame = window.requestAnimationFrame;

    workerOnMessageListener({
      data: {
        type: 'searchResults',
        results: games500,
        totalCount: games500.length,
      },
    });

    // Flush the batches sequentially
    let iterations = 0;
    while (rafCallbacks.length > 0 && iterations < 30) {
      flushAnimationFrame();
      iterations++;
    }

    console.log(`- Completed progressive render in ${batchTimes.length} batches.`);
    batchTimes.forEach((time, index) => {
      console.log(`  * Batch ${index + 1} JS execution time: ${time.toFixed(2)} ms`);
    });

    const maxBatchTime = Math.max(...batchTimes);
    const batchViolation = batchTimes.some((t) => t > 8.0);
    if (batchViolation) {
      console.log(
        `⚠ VIOLATION: At least one progressive rendering batch exceeded the 8ms frame budget! Max batch time: ${maxBatchTime.toFixed(2)}ms`
      );
    } else {
      console.log(
        `✔ PASS: All progressive rendering batches executed within ${maxBatchTime.toFixed(2)}ms (under 8ms limit).`
      );
    }

    // Restore original requestAnimationFrame wrapper
    window.requestAnimationFrame = originalRAF;

    // =========================================================================
    // CHALLENGE 3: Dictionary All Domains Render Block
    // =========================================================================
    console.log('\n--- CHALLENGE 3: Vector Dictionary Render Block (All Domains) ---');
    // In search-worker, 'all' returns all vectors. Let's create an array of all vectors with games mapping.
    const mockDictResults = Array.from(allMockVectors).map((vec) => ({
      vector: vec,
      games: allGamesList
        .filter((g) => g.governed_vectors && g.governed_vectors.includes(vec))
        .map((g) => ({
          game_id: g.game_id,
          title: g.title,
          medium: g.medium,
          year: g.year,
        })),
    }));

    const dictPayload = {
      type: 'dictionaryResults',
      action: 'dictionary',
      activeDomain: 'all',
      domain: 'all',
      results: mockDictResults,
      vectors: mockDictResults,
    };

    // Measure main thread blockage when handleWorkerDictionaryResults is executed
    const tStartDict = performance.now();
    workerOnMessageListener({ data: dictPayload });
    const dictDuration = performance.now() - tStartDict;

    console.log(
      `- Time to render all dictionary domains (${mockDictResults.length} vectors): ${dictDuration.toFixed(2)} ms`
    );
    const dictContainer = document.getElementById('dict-results-list');
    console.log(`- Dictionary card items count in DOM: ${dictContainer.querySelectorAll('.dict-item-card').length}`);

    if (dictDuration > 8.0) {
      console.log(
        `⚠ VIOLATION: Rendering the entire vector dictionary blocked the main UI thread for ${dictDuration.toFixed(2)}ms (budget: 8ms)!`
      );
    } else {
      console.log('✔ PASS: Vector Dictionary rendering is under 8ms.');
    }

    // =========================================================================
    // CHALLENGE 4: Autocomplete suggestions rendering blockage
    // =========================================================================
    console.log('\n--- CHALLENGE 4: Autocomplete Suggestions Rendering Block ---');
    const suggestions = Array.from(allMockVectors).slice(0, 10);
    const autocompletePayload = {
      type: 'autocompleteResults',
      action: 'autocomplete',
      suggestions: suggestions,
      results: [],
      latencyMs: 1,
    };

    // Set vector query input value
    document.getElementById('vector-query-input').value = 'combat';

    const tStartAuto = performance.now();
    workerOnMessageListener({ data: autocompletePayload });
    const autoDuration = performance.now() - tStartAuto;

    console.log(`- Time to render autocomplete suggestions overlay: ${autoDuration.toFixed(2)} ms`);
    if (autoDuration > 8.0) {
      console.log(
        `⚠ VIOLATION: Rendering autocomplete suggestions blocked the main UI thread for ${autoDuration.toFixed(2)}ms!`
      );
    } else {
      console.log('✔ PASS: Autocomplete suggestions rendering is under 8ms.');
    }

    // =========================================================================
    // CHALLENGE 5: Venn Comparison rendering blockage
    // =========================================================================
    console.log('\n--- CHALLENGE 5: Venn Comparison Rendering Block ---');
    const gameA = allGamesList[0];
    const gameB = allGamesList[1];
    const shared = Array.from(allMockVectors).slice(0, 50);
    const onlyA = Array.from(allMockVectors).slice(50, 150);
    const onlyB = Array.from(allMockVectors).slice(150, 250);

    const comparePayload = {
      type: 'compareResults',
      action: 'compare',
      gameA,
      gameB,
      shared,
      onlyA,
      onlyB,
      latencyMs: 1,
    };

    const tStartCompare = performance.now();
    workerOnMessageListener({ data: comparePayload });
    const compareDuration = performance.now() - tStartCompare;

    console.log(`- Time to render Venn comparison columns (300 vectors total): ${compareDuration.toFixed(2)} ms`);
    if (compareDuration > 8.0) {
      console.log(
        `⚠ VIOLATION: Rendering Venn comparison blocked the main UI thread for ${compareDuration.toFixed(2)}ms (budget: 8ms)!`
      );
    } else {
      console.log('✔ PASS: Venn Comparison rendering is under 8ms.');
    }

    // =========================================================================
    // CHALLENGE 6: High-Frequency Typing Stress Test (Debounce Verification)
    // =========================================================================
    console.log('\n--- CHALLENGE 6: High-Frequency Typing Stress Test (Debounce Verification) ---');
    const omniInput = document.getElementById('omni-search');
    let postMessageCount = 0;

    // Intercept searchWorker.postMessage via MockWorker prototype to count search requests
    const originalPost = MockWorker.prototype.postMessage;
    MockWorker.prototype.postMessage = function (data) {
      console.log('INTERCEPTED postMessage data:', JSON.stringify(data));
      if (data.type === 'search') {
        postMessageCount++;
      }
      originalPost.call(this, data);
    };

    // Wait for any initial database load searches to finish first
    await new Promise((resolve) => setTimeout(resolve, 50));
    postMessageCount = 0; // Reset count right before typing starts

    // Simulate 20 rapid keystrokes every 5ms
    for (let i = 0; i < 20; i++) {
      omniInput.value = `query_step_${i}`;
      omniInput.dispatchEvent(new window.Event('input', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    console.log(`- Finished typing 20 characters. Current postMessage count: ${postMessageCount}`);

    // Wait 250ms for debounce to fire
    await new Promise((resolve) => setTimeout(resolve, 250));
    console.log(`- After waiting for debounce. Final postMessage count: ${postMessageCount}`);

    if (postMessageCount > 2) {
      console.log(`⚠ VIOLATION: Debounce failed! Worker received ${postMessageCount} searches instead of <= 2.`);
    } else {
      console.log(
        `✔ PASS: Debounce successfully throttled high-frequency typing to ${postMessageCount} execution(s).`
      );
    }

    // =========================================================================
    // CHALLENGE 7: Progressive Render Cancellation Stress Test
    // =========================================================================
    console.log('\n--- CHALLENGE 7: Progressive Render Cancellation Stress Test ---');
    let cancelCount = 0;
    const originalCancel = global.cancelAnimationFrame;
    global.cancelAnimationFrame = (id) => {
      cancelCount++;
      originalCancel(id);
    };

    // Trigger first rendering (500 games)
    workerOnMessageListener({
      data: {
        type: 'searchResults',
        results: allGamesList,
        totalCount: allGamesList.length,
      },
    });

    // Immediately trigger second rendering (500 games)
    workerOnMessageListener({
      data: {
        type: 'searchResults',
        results: allGamesList,
        totalCount: allGamesList.length,
      },
    });

    console.log(`- Triggered two renders in immediate succession. Cancel count: ${cancelCount}`);

    if (cancelCount >= 1) {
      console.log('✔ PASS: Active progressive render job was successfully cancelled before next batch.');
    } else {
      console.log('⚠ VIOLATION: Active progressive render job was NOT cancelled!');
    }

    // Restore
    global.cancelAnimationFrame = originalCancel;
    MockWorker.prototype.postMessage = originalPost;

    console.log('\n====================================================');
    console.log('CHALLENGE RUN COMPLETED');
    console.log('====================================================');
  } catch (err) {
    console.error('Test execution crashed:', err);
  }
}

runTests();
