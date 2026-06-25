/**
 * tests/worker_stress.js
 *
 * Stress and verification harness for search-worker.js.
 * Empirically tests performance, correctness, edge cases, and sorting logic.
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

console.log('====================================================');
console.log('STARTING EMPIRICAL CHALLENGER STRESS HARNESS');
console.log('====================================================');

// 1. Mock the Web Worker Environment
global.self = global;
global.importScripts = function (url) {
  // Mocked importScripts - we log and define a genuine index mock locally
  // to avoid internet access in CODE_ONLY mode
};

// Precise FlexSearch mock to replicate real index queries and sorting order
global.FlexSearch = {
  Index: class {
    constructor(options) {
      this.options = options;
      this.docs = new Map();
    }

    add(id, text) {
      this.docs.set(id, text);
    }

    search(query, options) {
      const limit = (options && options.limit) || 100;
      const results = [];
      const qParts = query.toLowerCase().split(/[\s.]+/);

      // We score matches based on token overlaps and length similarity to simulate relevance ranking
      const candidates = [];
      for (const [id, text] of this.docs.entries()) {
        const lowerText = text.toLowerCase();
        if (qParts.every((part) => lowerText.includes(part))) {
          // Score = number of characters matching / length of document
          let score = 0;
          qParts.forEach((part) => {
            score += part.length;
          });
          score = score / text.length;
          candidates.push({ id, score });
        }
      }

      // Sort candidates by score descending (higher score first)
      candidates.sort((a, b) => b.score - a.score);

      return candidates.slice(0, limit).map((c) => c.id);
    }
  },
};

// Mock fetch to load registry.json locally
global.fetch = function (url) {
  try {
    const filePath = path.resolve(__dirname, '../', url);
    const content = fs.readFileSync(filePath, 'utf8');
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(JSON.parse(content)),
    });
  } catch (err) {
    return Promise.reject(new Error(`Failed to read file: ${err.message}`));
  }
};

// Setup message interceptor
let messageResolver = null;
let lastMessage = null;

global.postMessage = function (msg) {
  lastMessage = msg;
  if (messageResolver) {
    const resolve = messageResolver;
    messageResolver = null;
    resolve(msg);
  }
};

function sendWorkerMessage(action, payload) {
  return new Promise((resolve, reject) => {
    messageResolver = resolve;
    try {
      global.onmessage({ data: { action, payload } });
    } catch (err) {
      messageResolver = null;
      reject(err);
    }
  });
}

// Load and evaluate worker script
const workerCodePath = path.resolve(__dirname, '../dist/search-worker.js');
const workerCode = fs.readFileSync(workerCodePath, 'utf8');
eval(workerCode.replace(/export\s*\{\s*\}\s*;?/g, ''));

// Helpers for stats
function runBenchmark(fn, iterations = 100) {
  const times = [];
  let result = null;
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    result = fn();
    const end = performance.now();
    times.push(end - start);
  }

  times.sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);
  const avg = sum / iterations;
  const min = times[0];
  const max = times[iterations - 1];
  const median = times[Math.floor(iterations / 2)];
  const p95 = times[Math.floor(iterations * 0.95)];

  return { avg, min, max, median, p95, result };
}

async function startTestSuite() {
  try {
    // ----------------------------------------------------
    // PRE-INIT ERROR HANDLING
    // ----------------------------------------------------
    console.log('\n[Edge Case] Testing actions before worker initialization:');
    const preInitRes = await sendWorkerMessage('search', { searchTerm: 'tactical' });
    if (preInitRes.error) {
      console.log(`✔ Safe rejection: "${preInitRes.error}"`);
    } else {
      throw new Error('Worker allowed search before init action!');
    }

    // ----------------------------------------------------
    // PERFORMANCE: Indexing (init)
    // ----------------------------------------------------
    console.log('\n[Performance] Initializing database (fetch & parse registry.json & build index):');
    const initStart = performance.now();
    const initRes = await sendWorkerMessage('init');
    const initTime = performance.now() - initStart;

    console.log(`- Status: ${initRes.success ? 'Success' : 'Failure'}`);
    console.log(`- Games Indexed: ${initRes.stats.totalGames}`);
    console.log(`- Unique Vectors: ${initRes.stats.uniqueVectors}`);
    console.log(`- Database Load & Index Time: ${initTime.toFixed(2)} ms`);

    if (!initRes.success) throw new Error('Worker initialization failed!');

    // ----------------------------------------------------
    // PERFORMANCE: Search Queries (100 Iterations each)
    // ----------------------------------------------------
    console.log('\n[Performance] Benchmarking omni-search queries (100 runs each):');

    const queries = ['tactical', 'combat', 'fantasy', 'dungeon', 'dice rolling', 'cyberpunk', 'not-a-real-game-name'];

    for (const q of queries) {
      const stats = runBenchmark(() => {
        // Synchronous handler inside worker call
        handleSearch({ searchTerm: q });
        return lastMessage;
      }, 100);

      console.log(`- Query: "${q}" (matches: ${stats.result.total})`);
      console.log(
        `  Avg: ${stats.avg.toFixed(3)}ms | Median: ${stats.median.toFixed(3)}ms | P95: ${stats.p95.toFixed(3)}ms | Min: ${stats.min.toFixed(3)}ms | Max: ${stats.max.toFixed(3)}ms`
      );
    }

    // ----------------------------------------------------
    // PERFORMANCE: Dictionary Lookups Complexity Analysis
    // ----------------------------------------------------
    console.log('\n[Performance] Benchmarking Dictionary Domain vs Vector Lookups (100 runs):');

    // Vector lookup (O(1) Map retrieval)
    const vecStats = runBenchmark(() => {
      handleDictionary({ vector: 'combat.melee.tactical' });
      return lastMessage;
    }, 100);
    console.log(`- Vector Lookup ('combat.melee.tactical' matches: ${vecStats.result.results.length}):`);
    console.log(
      `  Avg: ${vecStats.avg.toFixed(3)}ms | Median: ${vecStats.median.toFixed(3)}ms | P95: ${vecStats.p95.toFixed(3)}ms`
    );

    // Domain lookup (O(V log V + D) sorting and filtering)
    const domStats = runBenchmark(() => {
      handleDictionary({ domain: 'combat' });
      return lastMessage;
    }, 100);
    console.log(`- Domain Lookup ('combat' domains count: ${domStats.result.results.length}):`);
    console.log(
      `  Avg: ${domStats.avg.toFixed(3)}ms | Median: ${domStats.median.toFixed(3)}ms | P95: ${domStats.p95.toFixed(3)}ms`
    );

    // All domains lookup
    const allDomStats = runBenchmark(() => {
      handleDictionary({ domain: 'all' });
      return lastMessage;
    }, 100);
    console.log(`- All Domains Lookup ('all' count: ${allDomStats.result.results.length}):`);
    console.log(
      `  Avg: ${allDomStats.avg.toFixed(3)}ms | Median: ${allDomStats.median.toFixed(3)}ms | P95: ${allDomStats.p95.toFixed(3)}ms`
    );

    // ----------------------------------------------------
    // CORRECTNESS & SORTING: Autocomplete Sorting Verification
    // ----------------------------------------------------
    console.log('\n[Correctness] Verifying Autocomplete sorting:');

    // A. Vector autocomplete sorting (should be alphabetical)
    const autoVec = await sendWorkerMessage('autocomplete', { query: 'combat', type: 'vector' });
    let vectorSorted = true;
    for (let i = 0; i < autoVec.results.length - 1; i++) {
      if (autoVec.results[i].localeCompare(autoVec.results[i + 1]) > 0) {
        vectorSorted = false;
        break;
      }
    }
    console.log(`- Vector autocomplete sorted alphabetically: ${vectorSorted ? '✔ YES' : '❌ NO'}`);

    // B. Game autocomplete relevance sorting bug verification
    // We search for something where the best match is returned later in the database (e.g. Cyberpunk is near the end, Coriolis is earlier)
    // Construct search index such that FlexSearch returns [cyberpunk, coriolis] in relevance order
    // But games array filter keeps them in database order [coriolis, cyberpunk]
    const matchedRelevanceOrder = [
      'cyberpunk_red_2045_chronicle_book_2026',
      'coriolis_empyrean_canticle_2e_edition_2026',
    ];

    // Let's mock FlexSearch search return order to explicitly be ['cyberpunk_red_2045_chronicle_book_2026', 'coriolis_empyrean_canticle_2e_edition_2026']
    const originalSearch = global.FlexSearch.Index.prototype.search;
    global.FlexSearch.Index.prototype.search = function (q, options) {
      return matchedRelevanceOrder;
    };

    const autoGames = await sendWorkerMessage('autocomplete', { query: 'cyberpunk coriolis', type: 'game' });
    const returnedIds = autoGames.results.map((g) => g.game_id);

    console.log('- Expected relevance order from FlexSearch Index:', matchedRelevanceOrder);
    console.log('- Actual returned order from Worker Autocomplete:', returnedIds);

    const sortingDeviation = JSON.stringify(matchedRelevanceOrder) !== JSON.stringify(returnedIds);
    if (sortingDeviation) {
      console.log(
        '⚠ SORTING DEVIATION CONFIRMED: Games autocomplete returned database insertion order instead of search relevance order.'
      );
      console.log(
        '  Reason: games.filter() filters the raw dataset array sequentially, ignoring the order in the matchedIds array.'
      );
    } else {
      console.log('✔ Autocomplete preserves index relevance order.');
    }

    // Restore original search mock
    global.FlexSearch.Index.prototype.search = originalSearch;

    // ----------------------------------------------------
    // CORRECTNESS: Venn Comparison Set Operations
    // ----------------------------------------------------
    console.log('\n[Correctness] Verifying Venn Comparison logic:');
    const compareRes = await sendWorkerMessage('compare', {
      gameIdA: 'coriolis_empyrean_canticle_2e_edition_2026',
      gameIdB: 'cyberpunk_red_2045_chronicle_book_2026',
    });

    const setA = new Set(compareRes.gameA.governed_vectors || []);
    const setB = new Set(compareRes.gameB.governed_vectors || []);

    // Verify Set calculations
    const sharedCorrect = compareRes.shared.every((v) => setA.has(v) && setB.has(v));
    const onlyACorrect = compareRes.onlyA.every((v) => setA.has(v) && !setB.has(v));
    const onlyBCorrect = compareRes.onlyB.every((v) => setB.has(v) && !setA.has(v));

    console.log(`- Shared Set logic correct: ${sharedCorrect ? '✔ YES' : '❌ NO'}`);
    console.log(`- Exclusive A Set logic correct: ${onlyACorrect ? '✔ YES' : '❌ NO'}`);
    console.log(`- Exclusive B Set logic correct: ${onlyBCorrect ? '✔ YES' : '❌ NO'}`);

    // ----------------------------------------------------
    // EDGE CASES & INPUT VALIDATION
    // ----------------------------------------------------
    console.log('\n[Edge Cases] Testing robust input validation and error boundaries:');

    // Search with empty values
    const searchEmpty = await sendWorkerMessage('search', { searchTerm: '   ' });
    console.log(`- Search with only whitespace returned: ${searchEmpty.results.length} matches (All filtered games)`);

    // Search with regex characters
    const searchRegex = await sendWorkerMessage('search', { searchTerm: '.*+?^${}()|[]\\' });
    console.log(`- Search with regex operators returned: ${searchRegex.results.length} matches (No crash)`);

    // Search with invalid type (number)
    const searchNum = await sendWorkerMessage('search', { searchTerm: 12345 });
    if (searchNum.error) {
      console.log(`- Search with number searchTerm safely handled: "${searchNum.error}"`);
    } else {
      console.log(`- Search with number searchTerm returned: ${searchNum.results.length} matches`);
    }

    // Compare non-existent IDs
    const compareBad = await sendWorkerMessage('compare', { gameIdA: 'missing_game_1', gameIdB: 'missing_game_2' });
    console.log(`- Compare non-existent games returned error: "${compareBad.error}"`);

    // Add game with invalid payload
    const addBad = await sendWorkerMessage('addGame', { game: { game_id: 'bad_game' } });
    console.log(`- Add game with missing title returned error: "${addBad.error}"`);

    // Add duplicate game
    const addDuplicate = await sendWorkerMessage('addGame', {
      game: {
        game_id: 'coriolis_empyrean_canticle_2e_edition_2026',
        title: 'Coriolis Duplicate',
      },
    });
    console.log(`- Add duplicate game ID returned error: "${addDuplicate.error}"`);

    console.log('\n====================================================');
    console.log('STRESS TESTS COMPLETE');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Stress harness crashed:', err);
    process.exit(1);
  }
}

startTestSuite();
