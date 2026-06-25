/**
 * tests/worker.test.js
 *
 * Jest-based test suite for search-worker.js.
 * Verifies correctness, edge cases, interface contracts, and relevance sorting order.
 */

const fs = require('fs');
const path = require('path');

describe('Systems Indexer - search-worker.js Web Worker Tests', () => {
  let originalSelf;
  let originalImportScripts;
  let originalPostMessage;
  let originalFlexSearch;
  let originalOnmessage;
  let lastMessage;

  beforeAll(() => {
    originalSelf = global.self;
    originalImportScripts = global.importScripts;
    originalPostMessage = global.postMessage;
    originalFlexSearch = global.FlexSearch;
    originalOnmessage = global.onmessage;

    // 1. Setup mock environment representing the Web Worker global scope
    global.self = global;
    global.importScripts = jest.fn();
    global.postMessage = jest.fn((msg) => {
      lastMessage = msg;
    });

    // Polyfill performance.now if needed
    if (!global.performance) {
      global.performance = require('perf_hooks').performance;
    }

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
          // Mock index return order for autocomplete test
          if (query === 'cyberpunk coriolis') {
            return ['cyberpunk_red_2045_chronicle_book_2026', 'coriolis_empyrean_canticle_2e_edition_2026'];
          }
          const limit = (options && options.limit) || 100;
          const results = [];
          const qParts = query.toLowerCase().split(/[\s.]+/);
          for (const [id, text] of this.docs.entries()) {
            if (qParts.every((part) => text.toLowerCase().includes(part))) {
              results.push(id);
              if (results.length >= limit) break;
            }
          }
          return results;
        }
      },
    };

    // Load and evaluate search-worker.js
    require('../dist/search-worker.js');

    // Extract and evaluate LocalSearchWorker from app.js to test it
    const appJsContent = fs.readFileSync(path.resolve(__dirname, '../dist/app.js'), 'utf8');
    const startIdx = appJsContent.indexOf('class LocalSearchWorker');
    const endIdx = appJsContent.indexOf('// Initialize Web Worker');
    const classCode = 'global.LocalSearchWorker = ' + appJsContent.slice(startIdx, endIdx);
    eval(classCode);
  });

  beforeEach(() => {
    lastMessage = null;
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (originalSelf === undefined) {
      delete global.self;
    } else {
      global.self = originalSelf;
    }
    if (originalImportScripts === undefined) {
      delete global.importScripts;
    } else {
      global.importScripts = originalImportScripts;
    }
    if (originalPostMessage === undefined) {
      delete global.postMessage;
    } else {
      global.postMessage = originalPostMessage;
    }
    if (originalFlexSearch === undefined) {
      delete global.FlexSearch;
    } else {
      global.FlexSearch = originalFlexSearch;
    }
    if (originalOnmessage === undefined) {
      delete global.onmessage;
    } else {
      global.onmessage = originalOnmessage;
    }
    delete global.LocalSearchWorker;
  });

  test('Worker requires initialization before actions', async () => {
    global.onmessage({ data: { type: 'search', filters: { searchTerm: 'tactical' } } });

    // Polling wait helper replacing raw setTimeout
    await global.waitFor(() => {
      expect(lastMessage).toBeDefined();
      expect(lastMessage.error).toBe('Worker is not initialized. Please run init action first.');
    });
  });

  test('Worker actions reject before initialization', async () => {
    // 1. autocomplete pre-init rejection
    global.onmessage({ data: { type: 'autocomplete', query: 'combat', autocompleteType: 'vector' } });
    await global.waitFor(() => {
      expect(lastMessage).toBeDefined();
      expect(lastMessage.type).toBe('error');
      expect(lastMessage.error).toBe('Worker is not initialized. Please run init action first.');
    });

    // 2. compare pre-init rejection
    global.onmessage({ data: { type: 'compare', gameIdA: 'g1', gameIdB: 'g2' } });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('error');
      expect(lastMessage.error).toBe('Worker is not initialized. Please run init action first.');
    });

    // 3. dictionary pre-init rejection
    global.onmessage({ data: { type: 'dictionary', vector: 'combat' } });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('error');
      expect(lastMessage.error).toBe('Worker is not initialized. Please run init action first.');
    });

    // 4. addGame pre-init rejection
    global.onmessage({ data: { type: 'addGame', game: { game_id: 'g1', title: 'g1' } } });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('error');
      expect(lastMessage.error).toBe('Worker is not initialized. Please run init action first.');
    });
  });

  test('init action fails when fetch response is not ok', async () => {
    global.fetch = jest.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });
    });

    global.onmessage({ data: { type: 'init', dbUrl: 'missing.json' } });

    await global.waitFor(() => {
      expect(lastMessage).toBeDefined();
      expect(lastMessage.type).toBe('error');
      expect(lastMessage.error).toContain('Failed to fetch registry');
    });
  });

  test('init action succeeds and indexes registry data', async () => {
    // Mock global fetch
    global.fetch = jest.fn().mockImplementation(() => {
      const registryPath = path.resolve(__dirname, '../registry.json');
      const content = fs.readFileSync(registryPath, 'utf8');
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(JSON.parse(content)),
      });
    });

    global.onmessage({ data: { type: 'init', dbUrl: 'registry.json' } });

    // Polling wait helper replacing raw setTimeout
    await global.waitFor(() => {
      expect(lastMessage).toBeDefined();
      expect(lastMessage.type).toBe('ready');
      expect(lastMessage.success).toBe(true);
      expect(lastMessage.stats.totalGames).toBeGreaterThan(0);
      expect(lastMessage.stats.uniqueVectorsCount).toBeGreaterThan(0);
    });
  });

  test('search action filters and sorts results', () => {
    global.onmessage({
      data: { type: 'search', filters: { searchTerm: 'tactical', medium: 'ttrpg', sort: 'year-desc' } },
    });

    expect(lastMessage.type).toBe('searchResults');
    expect(lastMessage.results.length).toBeGreaterThan(0);
    expect(lastMessage.latencyMs).toBeLessThanOrEqual(50); // Latency goals check

    // Verify sorting (descending order of year)
    const results = lastMessage.results;
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].year).toBeGreaterThanOrEqual(results[i + 1].year);
    }
  });

  test('Venn comparison returns correct sets', () => {
    global.onmessage({
      data: {
        type: 'compare',
        gameIdA: 'coriolis_empyrean_canticle_2e_edition_2026',
        gameIdB: 'cyberpunk_red_2045_chronicle_book_2026',
      },
    });

    expect(lastMessage.type).toBe('compareResults');
    expect(lastMessage.shared).toContain('combat.melee.tactical');
    expect(lastMessage.onlyA).toContain('character.character_creation.playbook_based');
    expect(lastMessage.onlyB).toContain('combat.movement.grid_based');
    expect(lastMessage.latencyMs).toBeLessThanOrEqual(10); // Venn comparison latency check
  });

  test('dictionary action O(1) vector lookup returns games', () => {
    global.onmessage({ data: { type: 'dictionary', vector: 'combat.melee.tactical' } });

    expect(lastMessage.type).toBe('dictionaryResults');
    expect(lastMessage.vector).toBe('combat.melee.tactical');
    expect(lastMessage.results.length).toBeGreaterThan(0);
    expect(lastMessage.results[0]).toHaveProperty('game_id');
    expect(lastMessage.results[0]).toHaveProperty('title');
  });

  test('addGame action dynamically appends to search index and dictionary', () => {
    const newGame = {
      game_id: 'jest_test_game',
      title: 'Jest Test Game',
      year: 2026,
      medium: 'board_game',
      primary_genre: 'Strategy',
      governed_vectors: ['custom.system.jest_vector'],
      vector_explanations: { 'custom.system.jest_vector': 'Test rules' },
    };

    global.onmessage({ data: { type: 'addGame', game: newGame } });
    expect(lastMessage.type).toBe('addGameDone');
    expect(lastMessage.success).toBe(true);
    expect(lastMessage.updatedStats).toBeDefined();
    expect(lastMessage.updatedStats.totalGames).toBeGreaterThan(0);
    expect(lastMessage.updatedStats.uniqueVectorsCount).toBeGreaterThan(0);

    // Verify it is searchable
    global.onmessage({ data: { type: 'search', filters: { searchTerm: 'jest_vector' } } });
    expect(lastMessage.results.some((g) => g.game_id === 'jest_test_game')).toBe(true);

    // Verify dictionary is updated
    global.onmessage({ data: { type: 'dictionary', vector: 'custom.system.jest_vector' } });
    expect(lastMessage.results.length).toBe(1);
    expect(lastMessage.results[0].game_id).toBe('jest_test_game');
  });

  test('autocomplete type vector returns sorted vectors', () => {
    global.onmessage({ data: { type: 'autocomplete', query: 'combat', autocompleteType: 'vector' } });

    expect(lastMessage.type).toBe('autocompleteResults');
    const results = lastMessage.suggestions;
    expect(results.length).toBeGreaterThan(0);
    expect(lastMessage.latencyMs).toBeLessThanOrEqual(10); // Autocomplete latency check

    // Check sorted alphabetically
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].localeCompare(results[i + 1])).toBeLessThanOrEqual(0);
    }
  });

  test('autocomplete type game preserves relevance search sorting order', () => {
    // FlexSearch search query returns: ['cyberpunk_red_2045_chronicle_book_2026', 'coriolis_empyrean_canticle_2e_edition_2026']
    global.onmessage({ data: { type: 'autocomplete', query: 'cyberpunk coriolis', autocompleteType: 'game' } });

    expect(lastMessage.type).toBe('autocompleteResults');
    const results = lastMessage.results.map((g) => g.game_id);

    // RELEVANCE EXPECTED: ['cyberpunk_red_2045_chronicle_book_2026', 'coriolis_empyrean_canticle_2e_edition_2026']
    // Now that the sorting bug is fixed, we assert the correct relevance order.
    expect(results).toEqual(['cyberpunk_red_2045_chronicle_book_2026', 'coriolis_empyrean_canticle_2e_edition_2026']);
  });

  test('Worker returns error on unknown message type', async () => {
    global.onmessage({ data: { type: 'unknown_action' } });
    await global.waitFor(() => {
      expect(lastMessage).toBeDefined();
      expect(lastMessage.type).toBe('error');
      expect(lastMessage.error).toBe('Unknown type: unknown_action');
    });
  });

  test('search action uses cache and evicts cache on addGame', async () => {
    // First search: populate cache
    global.onmessage({ data: { type: 'search', filters: { searchTerm: 'tactical', medium: 'ttrpg' } } });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('searchResults');
    });
    const firstResults = lastMessage.results;

    // Second search: retrieve from cache
    lastMessage = null;
    global.onmessage({ data: { type: 'search', filters: { searchTerm: 'tactical', medium: 'ttrpg' } } });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('searchResults');
      expect(lastMessage.results).toEqual(firstResults);
    });

    // Add game should evict cache
    const newGame = {
      game_id: 'jest_cache_evict_game',
      title: 'Jest Cache Evict Game',
      year: 2026,
      medium: 'ttrpg',
      primary_genre: 'Strategy',
      governed_vectors: ['combat.melee.tactical'],
      vector_explanations: {},
    };
    global.onmessage({ data: { type: 'addGame', game: newGame } });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('addGameDone');
    });

    // Subsequent search after addGame: cache should be cleared/evicted (results should contain the new game now!)
    global.onmessage({ data: { type: 'search', filters: { searchTerm: 'tactical', medium: 'ttrpg' } } });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('searchResults');
      expect(lastMessage.results.some((g) => g.game_id === 'jest_cache_evict_game')).toBe(true);
    });
  });

  test('search action returns all games when query is empty/whitespace', async () => {
    global.onmessage({ data: { type: 'search', filters: { searchTerm: '   ' } } });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('searchResults');
      expect(lastMessage.results.length).toBeGreaterThan(0);
    });
  });

  test('search action filters by genre and year boundaries', async () => {
    // 1. Genre filter: primary genre match
    global.onmessage({ data: { type: 'search', filters: { genre: 'rules-lite' } } });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('searchResults');
      lastMessage.results.forEach((g) => {
        const matchesPrimary = g.primary_genre && g.primary_genre.toLowerCase() === 'rules-lite';
        const matchesSub = g.subgenres && g.subgenres.some((sub) => sub.toLowerCase() === 'rules-lite');
        expect(matchesPrimary || matchesSub).toBe(true);
      });
    });

    // 2. Genre filter: non-matching genre
    global.onmessage({ data: { type: 'search', filters: { genre: 'non_existent_genre' } } });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('searchResults');
      expect(lastMessage.results.length).toBe(0);
    });

    // 3. Year filters: out of range
    global.onmessage({ data: { type: 'search', filters: { minYear: 3000, maxYear: 4000 } } });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('searchResults');
      expect(lastMessage.results.length).toBe(0);
    });
  });

  test('search action supports title and year ascending/descending sorting', async () => {
    // 1. title-asc
    global.onmessage({ data: { type: 'search', filters: { sort: 'title-asc' } } });
    await global.waitFor(() => {
      const results = lastMessage.results;
      for (let i = 0; i < results.length - 1; i++) {
        const ta = results[i].title || '';
        const tb = results[i + 1].title || '';
        expect(ta <= tb).toBe(true);
      }
    });

    // 2. title-desc
    global.onmessage({ data: { type: 'search', filters: { sort: 'title-desc' } } });
    await global.waitFor(() => {
      const results = lastMessage.results;
      for (let i = 0; i < results.length - 1; i++) {
        const ta = results[i].title || '';
        const tb = results[i + 1].title || '';
        expect(ta >= tb).toBe(true);
      }
    });

    // 3. year-asc
    global.onmessage({ data: { type: 'search', filters: { sort: 'year-asc' } } });
    await global.waitFor(() => {
      const results = lastMessage.results;
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].year || 0).toBeLessThanOrEqual(results[i + 1].year || 0);
      }
    });

    // 4. default sort (relevance or insertion order)
    global.onmessage({ data: { type: 'search', filters: { sort: 'invalid-sort-fallback' } } });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('searchResults');
    });
  });

  test('autocomplete type vector returns all sorted vectors when query is empty', async () => {
    global.onmessage({ data: { type: 'autocomplete', query: '', autocompleteType: 'vector' } });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('autocompleteResults');
      expect(lastMessage.suggestions.length).toBeGreaterThan(0);
    });
  });

  test('compare action throws error when game A or game B is not found', async () => {
    // Game A not found
    global.onmessage({
      data: { type: 'compare', gameIdA: 'invalid_game_a', gameIdB: 'cyberpunk_red_2045_chronicle_book_2026' },
    });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('error');
      expect(lastMessage.error).toContain('Game A not found');
    });

    // Game B not found
    global.onmessage({
      data: { type: 'compare', gameIdA: 'cyberpunk_red_2045_chronicle_book_2026', gameIdB: 'invalid_game_b' },
    });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('error');
      expect(lastMessage.error).toContain('Game B not found');
    });
  });

  test('dictionary action handles domain all and specific domain lookups', async () => {
    // 1. domain: 'all'
    global.onmessage({ data: { type: 'dictionary', domain: 'all' } });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('dictionaryResults');
      expect(lastMessage.results.length).toBeGreaterThan(0);
      expect(lastMessage.results[0]).toHaveProperty('vector');
      expect(lastMessage.results[0]).toHaveProperty('games');
    });

    // 2. domain: specific (e.g. combat)
    global.onmessage({ data: { type: 'dictionary', domain: 'combat' } });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('dictionaryResults');
      expect(lastMessage.results.length).toBeGreaterThan(0);
      lastMessage.results.forEach((item) => {
        expect(item.vector.startsWith('combat.')).toBe(true);
      });
    });
  });

  test('addGame action throws error on invalid game data or duplicate ID', async () => {
    // Invalid game data
    global.onmessage({ data: { type: 'addGame', game: { game_id: 'bad_game' } } });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('error');
      expect(lastMessage.error).toBe('Invalid game data provided for addGame action.');
    });

    // Duplicate game ID
    global.onmessage({
      data: {
        type: 'addGame',
        game: { game_id: 'cyberpunk_red_2045_chronicle_book_2026', title: 'Duplicate Cyberpunk' },
      },
    });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('error');
      expect(lastMessage.error).toContain('already exists');
    });
  });

  test('addVector action dynamically registers new custom vectors', async () => {
    const newVector = 'custom.melee.cybernetic';

    // Add custom vector
    global.onmessage({ data: { type: 'addVector', vector: newVector } });

    // Wait for internal cache to rebuild - autocomplete can verify it
    global.onmessage({ data: { type: 'autocomplete', query: 'cybernetic', autocompleteType: 'vector' } });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('autocompleteResults');
      expect(lastMessage.suggestions).toContain(newVector);
    });
  });

  test('coverage gaps for fallback payloads and missing fields', async () => {
    // Helper to mock default fetch
    const mockDefaultFetch = () => {
      global.fetch = jest.fn().mockImplementation(() => {
        const registryPath = path.resolve(__dirname, '../registry.json');
        const content = fs.readFileSync(registryPath, 'utf8');
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(JSON.parse(content)),
        });
      });
    };

    // Mock global fetch for initialization fallbacks
    mockDefaultFetch();

    // 1. data = e.data || {}; data.type || data.action; (data/action fallback)
    global.onmessage({});
    expect(lastMessage.error).toBe('Unknown type: undefined');

    global.onmessage({ data: null });
    expect(lastMessage.error).toBe('Unknown type: undefined');

    // action fallback with search
    global.onmessage({ data: { action: 'search', payload: { searchTerm: 'tactical', medium: 'ttrpg' } } });
    expect(lastMessage.type).toBe('searchResults');

    // 2. domain split fallback (vector.split('.')[0] || 'general')
    global.onmessage({ data: { type: 'addVector', vector: '.subsystem' } });

    // 3. cleanAndFreezeGame with missing/undefined properties (subgenres, governed_vectors, vector_explanations, year, medium)
    const partialGame = {
      game_id: 'partial_game_id',
      title: 'Partial Game Title',
      // year, medium, subgenres, governed_vectors, vector_explanations are missing
    };
    global.onmessage({ data: { type: 'addGame', game: partialGame } });
    expect(lastMessage.type).toBe('addGameDone');

    // Verify search matches empty/undefined values fallback
    global.onmessage({ data: { type: 'search', filters: {} } });
    expect(lastMessage.type).toBe('searchResults');

    // 4. dbUrl payload fallbacks (data.payload.dbUrl, data.payload.url, and default 'registry.json')
    // test data.payload.dbUrl
    mockDefaultFetch();
    lastMessage = null;
    global.onmessage({ data: { type: 'init', payload: { dbUrl: 'registry.json' } } });
    await global.waitFor(() => {
      expect(lastMessage).toBeDefined();
      expect(lastMessage.type).toBe('ready');
    });

    // test data.payload.url
    mockDefaultFetch();
    lastMessage = null;
    global.onmessage({ data: { type: 'init', payload: { url: 'registry.json' } } });
    await global.waitFor(() => {
      expect(lastMessage).toBeDefined();
      expect(lastMessage.type).toBe('ready');
    });

    // test default 'registry.json'
    mockDefaultFetch();
    lastMessage = null;
    global.onmessage({ data: { type: 'init' } });
    await global.waitFor(() => {
      expect(lastMessage).toBeDefined();
      expect(lastMessage.type).toBe('ready');
    });

    // 5. registryData missing ttrpg/board_game (registryData.ttrpg || [], registryData.board_game || [])
    // and containing incomplete games to test fallbacks
    const incompleteRegistry = {
      ttrpg: [
        {
          game_id: 'incomplete_ttrpg_1',
          // title, primary_genre, subgenres, governed_vectors, year missing
        },
        {
          game_id: 'incomplete_ttrpg_2',
          title: 'Incomplete TTRPG 2',
          year: 2020,
          governed_vectors: ['combat.melee.tactical'],
        },
      ],
    };
    global.fetch = jest.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(incompleteRegistry),
      });
    });
    lastMessage = null;
    global.onmessage({ data: { type: 'init' } });
    await global.waitFor(() => {
      expect(lastMessage).toBeDefined();
      expect(lastMessage.type).toBe('ready');
      expect(lastMessage.stats.totalGames).toBe(2);
    });

    // Trigger title-asc and year-asc sorting which should fall back to '' or 0
    global.onmessage({ data: { type: 'search', filters: { sort: 'title-asc' } } });
    expect(lastMessage.type).toBe('searchResults');
    global.onmessage({ data: { type: 'search', filters: { sort: 'title-desc' } } });
    expect(lastMessage.type).toBe('searchResults');
    global.onmessage({ data: { type: 'search', filters: { sort: 'year-asc' } } });
    expect(lastMessage.type).toBe('searchResults');
    global.onmessage({ data: { type: 'search', filters: { sort: 'year-desc' } } });
    expect(lastMessage.type).toBe('searchResults');

    // Init with board_game but no ttrpg to cover line 161 (registryData.ttrpg || [])
    const incompleteRegistry2 = {
      board_game: [
        {
          game_id: 'incomplete_bg_1',
          // title, primary_genre, subgenres, governed_vectors, year missing
        },
      ],
    };
    global.fetch = jest.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(incompleteRegistry2),
      });
    });
    lastMessage = null;
    global.onmessage({ data: { type: 'init' } });
    await global.waitFor(() => {
      expect(lastMessage).toBeDefined();
      expect(lastMessage.type).toBe('ready');
      expect(lastMessage.stats.totalGames).toBe(1);
    });

    // Re-initialize registry for subsequent tests
    mockDefaultFetch();
    lastMessage = null;
    global.onmessage({ data: { type: 'init' } });
    await global.waitFor(() => {
      expect(lastMessage).toBeDefined();
      expect(lastMessage.type).toBe('ready');
    });

    // 6. addGame with missing year and medium to trigger fallbacks
    const gameMissingYearMedium = {
      game_id: 'no_year_medium',
      title: 'No Year Medium Game',
      // year and medium are missing
    };
    global.onmessage({ data: { type: 'addGame', game: gameMissingYearMedium } });
    expect(lastMessage.type).toBe('addGameDone');

    // Trigger search with no filters/payload to cover line 223 fallback (filters = data.filters || data.payload || {})
    global.onmessage({ data: { type: 'search' } });
    expect(lastMessage.type).toBe('searchResults');

    // Trigger search to cover the missing medium fallback branch
    global.onmessage({ data: { type: 'search', filters: { searchTerm: 'no_year_medium', medium: 'all' } } });
    expect(lastMessage.type).toBe('searchResults');

    // 7. autocomplete query and type from payload, and type fallback
    global.onmessage({ data: { type: 'autocomplete', payload: { query: 'combat', type: 'vector' } } });
    expect(lastMessage.type).toBe('autocompleteResults');

    global.onmessage({ data: { type: 'autocomplete', query: 'combat' } }); // falls back to vector type
    expect(lastMessage.type).toBe('autocompleteResults');

    global.onmessage({ data: { type: 'autocomplete', payload: { query: '', type: 'game' } } });
    expect(lastMessage.type).toBe('autocompleteResults');

    // 8. compare gameIdA / gameIdB from payload
    global.onmessage({
      data: {
        type: 'compare',
        payload: {
          gameIdA: 'coriolis_empyrean_canticle_2e_edition_2026',
          gameIdB: 'cyberpunk_red_2045_chronicle_book_2026',
        },
      },
    });
    expect(lastMessage.type).toBe('compareResults');

    // 9. dictionary domain / vector from payload
    global.onmessage({ data: { type: 'dictionary', payload: { domain: 'combat' } } });
    expect(lastMessage.type).toBe('dictionaryResults');
    global.onmessage({ data: { type: 'dictionary', payload: { vector: 'combat.melee.tactical' } } });
    expect(lastMessage.type).toBe('dictionaryResults');

    // 10. dictionary vector that does not exist in invertedIndex
    global.onmessage({ data: { type: 'dictionary', vector: 'nonexistent.vector.domain' } });
    expect(lastMessage.type).toBe('dictionaryResults');
    expect(lastMessage.results).toEqual([]);

    // 11. dictionary domain not in vectorsByDomain
    global.onmessage({ data: { type: 'dictionary', domain: 'nonexistent_domain' } });
    expect(lastMessage.type).toBe('dictionaryResults');
    expect(lastMessage.results).toEqual([]);

    // 12. addGame from payload
    const gamePayload = {
      game_id: 'payload_game_id',
      title: 'Payload Game Title',
    };
    global.onmessage({ data: { type: 'addGame', payload: { game: gamePayload } } });
    expect(lastMessage.type).toBe('addGameDone');

    // 13. addVector when vector is empty or already in uniqueVectors
    global.onmessage({ data: { type: 'addVector', vector: '' } });
    global.onmessage({ data: { type: 'addVector', vector: 'combat.melee.tactical' } });
  });

  test('hierarchical vector querying and autocomplete of parent namespaces', async () => {
    // 1. Verify autocomplete suggestions contain parent/intermediate namespaces
    global.onmessage({ data: { type: 'autocomplete', query: 'combat', autocompleteType: 'vector' } });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('autocompleteResults');
      expect(lastMessage.suggestions).toContain('combat');
      expect(lastMessage.suggestions).toContain('combat.melee');
      expect(lastMessage.suggestions).toContain('combat.melee.tactical');
    });

    // 2. Verify dictionary lookup with hierarchical vector query merges child games correctly
    global.onmessage({ data: { type: 'dictionary', vector: 'combat.melee' } });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('dictionaryResults');
      expect(lastMessage.vector).toBe('combat.melee');
      const results = lastMessage.results;
      expect(results.length).toBeGreaterThan(0);

      // Check that it merged games for 'combat.melee.tactical' and any other sub-vector
      // Verify games are unique by game_id
      const gameIds = results.map((g) => g.game_id);
      const uniqueGameIds = new Set(gameIds);
      expect(gameIds.length).toBe(uniqueGameIds.size);

      // Verify results are sorted by title
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].title.localeCompare(results[i + 1].title)).toBeLessThanOrEqual(0);
      }
    });

    // 3. Verify exact match for parent namespace
    global.onmessage({ data: { type: 'dictionary', vector: 'combat' } });
    await global.waitFor(() => {
      expect(lastMessage.type).toBe('dictionaryResults');
      expect(lastMessage.vector).toBe('combat');
      const results = lastMessage.results;
      expect(results.length).toBeGreaterThan(0);
    });
  });

  test('LocalSearchWorker hierarchical behavior matches search-worker.js', async () => {
    // Mock fetch to read registry.json
    global.fetch = jest.fn().mockImplementation(() => {
      const registryPath = path.resolve(__dirname, '../registry.json');
      const content = fs.readFileSync(registryPath, 'utf8');
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(JSON.parse(content)),
      });
    });

    const localWorker = new LocalSearchWorker();

    // Initialize local worker with same registry
    let localReady = false;
    localWorker.onmessage = (e) => {
      if (e.data.type === 'ready') {
        localReady = true;
      }
    };
    localWorker.postMessage({ type: 'init', dbUrl: 'registry.json' });

    await global.waitFor(() => {
      expect(localReady).toBe(true);
    });

    // Test autocomplete of parent namespaces on local worker
    let autocompleteMsg = null;
    localWorker.onmessage = (e) => {
      if (e.data.type === 'autocompleteResults') {
        autocompleteMsg = e.data;
      }
    };
    localWorker.postMessage({ type: 'autocomplete', query: 'combat', autocompleteType: 'vector' });
    await global.waitFor(() => {
      expect(autocompleteMsg).not.toBeNull();
      expect(autocompleteMsg.suggestions).toContain('combat');
      expect(autocompleteMsg.suggestions).toContain('combat.melee');
      expect(autocompleteMsg.suggestions).toContain('combat.melee.tactical');
    });

    // Test hierarchical dictionary search on local worker
    let dictMsg = null;
    localWorker.onmessage = (e) => {
      if (e.data.type === 'dictionaryResults') {
        dictMsg = e.data;
      }
    };
    localWorker.postMessage({ type: 'dictionary', vector: 'combat.melee' });
    await global.waitFor(() => {
      expect(dictMsg).not.toBeNull();
      expect(dictMsg.vector).toBe('combat.melee');
      const results = dictMsg.results;
      expect(results.length).toBeGreaterThan(0);

      // Verify unique and sorted by title
      const gameIds = results.map((g) => g.game_id);
      const uniqueGameIds = new Set(gameIds);
      expect(gameIds.length).toBe(uniqueGameIds.size);

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].title.localeCompare(results[i + 1].title)).toBeLessThanOrEqual(0);
      }
    });
  });
});
