/**
 * tests/pwa_cache.test.js
 *
 * Jest integration and unit tests for PWA caching, Service Worker registration,
 * IndexedDB caching lifecycle, offline fetches, and progressive search chunk rendering.
 */

const fs = require('fs');
const path = require('path');

const mockRegistryData = {
  ttrpg: [
    {
      game_id: 'mock_ttrpg_fantasy',
      title: 'Mock Fantasy RPG',
      year: 2024,
      medium: 'ttrpg',
      primary_genre: 'Fantasy',
      subgenres: ['Adventure'],
      governed_vectors: ['combat.melee.dice_rolls'],
      vector_explanations: {
        'combat.melee.dice_rolls': 'Uses d20.',
      },
    },
  ],
  board_game: [
    {
      game_id: 'mock_bg_euro',
      title: 'Mock Euro Game',
      year: 2020,
      medium: 'board_game',
      primary_genre: 'Strategy',
      subgenres: ['Economic'],
      governed_vectors: ['economy.market.worker_placement'],
      vector_explanations: {
        'economy.market.worker_placement': 'Place workers.',
      },
    },
  ],
};

describe('Milestone 2 - PWA Caching, SW, and Chunk Rendering Tests', () => {
  let htmlContent;
  let mockRegister;
  let originalIndexedDB;

  beforeAll(() => {
    // Save original indexedDB
    originalIndexedDB = global.indexedDB;

    // 1. Load HTML content
    const htmlPath = path.resolve(__dirname, '../index.html');
    htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // 2. Mock navigator.serviceWorker.register
    mockRegister = jest.fn().mockResolvedValue({ scope: '/' });
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: {
        register: mockRegister,
      },
      writable: true,
      configurable: true,
    });
  });

  beforeEach(() => {
    jest.resetModules();
    document.documentElement.innerHTML = htmlContent;
    global.alert = jest.fn();

    // Default successful fetch mock
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('registry.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(JSON.parse(JSON.stringify(mockRegistryData))),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  });

  afterEach(() => {
    global.indexedDB = originalIndexedDB;
    jest.clearAllMocks();
  });

  test('Service worker is registered on DOMContentLoaded', async () => {
    require('../dist/app.js');
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

    // Wait short time for promises to resolve
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockRegister).toHaveBeenCalledWith('./sw.js');
  });

  test('IndexedDB cache load: loads from IndexedDB if games store is populated', async () => {
    // Mock IndexedDB database with populated data
    const mockGames = [
      { game_id: 'cached_game', title: 'Cached Game Title', medium: 'ttrpg', year: 2025, governed_vectors: [] },
    ];

    // Mock global indexedDB object to return our cached games
    const mockIDBRequest = {
      result: {
        transaction: () => ({
          objectStore: () => ({
            getAll: () => ({
              set onsuccess(fn) {
                setTimeout(() => fn(), 0);
              },
              get result() {
                return mockGames;
              },
            }),
          }),
        }),
        objectStoreNames: {
          contains: () => true,
        },
      },
      set onsuccess(fn) {
        setTimeout(() => fn(), 0);
      },
    };

    global.indexedDB = {
      open: jest.fn().mockReturnValue(mockIDBRequest),
    };

    require('../dist/app.js');
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

    // Verify it doesn't call fetch for registry.json
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(global.fetch).not.toHaveBeenCalled();

    // Verify loading overlay gets hidden after worker is ready
    const statsTotal = document.getElementById('stat-total-games');
    await global.waitFor(() => statsTotal.textContent !== '0');
    expect(statsTotal.textContent).toBe('1');
  });

  test('IndexedDB cache load: fetches registry.json if IndexedDB store is empty and saves it', async () => {
    const mockSavedItems = [];
    const mockIDBRequest = {
      result: {
        transaction: () => ({
          objectStore: () => ({
            getAll: () => ({
              set onsuccess(fn) {
                setTimeout(() => fn(), 0);
              },
              get result() {
                return []; // Empty store
              },
            }),
            put: (data, key) => {
              mockSavedItems.push(data);
              return {
                set onsuccess(fn) {
                  setTimeout(() => fn(), 0);
                },
              };
            },
          }),
        }),
        objectStoreNames: {
          contains: () => true,
        },
      },
      set onsuccess(fn) {
        setTimeout(() => fn(), 0);
      },
    };

    global.indexedDB = {
      open: jest.fn().mockReturnValue(mockIDBRequest),
    };

    require('../dist/app.js');
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

    // Wait until it fetched and parsed
    const statsTotal = document.getElementById('stat-total-games');
    await global.waitFor(() => statsTotal.textContent !== '0');

    expect(global.fetch).toHaveBeenCalled();
    expect(mockSavedItems.length).toBeGreaterThan(0);
  });

  test('Progressive search chunk rendering displays chunks correctly', async () => {
    require('../dist/app.js');
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

    // Wait for worker ready
    await global.waitFor(() => document.getElementById('stat-total-games').textContent !== '0');

    // Simulate search worker chunked response
    const searchWorker = global.searchWorker;
    expect(searchWorker).toBeDefined();

    const mockSearchResults = Array.from({ length: 25 }, (_, i) => ({
      game_id: `g_${i}`,
      title: `Progressive Game ${i}`,
      year: 2022,
      medium: 'board_game',
      governed_vectors: [],
    }));

    // Send chunk 0
    searchWorker.onmessage({
      data: {
        type: 'searchResults',
        chunkIndex: 0,
        results: mockSearchResults.slice(0, 10),
        totalCount: 25,
        isComplete: false,
      },
    });

    const grid = document.getElementById('games-grid');
    // It should render immediately for chunk 0
    await global.waitFor(() => grid.querySelectorAll('.game-card').length > 0);
    expect(grid.querySelectorAll('.game-card').length).toBeLessThanOrEqual(10);

    // Send completion chunk
    searchWorker.onmessage({
      data: {
        type: 'searchResults',
        chunkIndex: 1,
        results: mockSearchResults.slice(10),
        totalCount: 25,
        isComplete: true,
      },
    });

    // Verify all rendered
    await global.waitFor(() => grid.querySelectorAll('.game-card').length === 25);
    expect(grid.querySelectorAll('.game-card').length).toBe(25);
  });
});

describe('Service Worker (sw.js) Stale-While-Revalidate', () => {
  let swListeners = {};
  let mockCache;
  let mockCaches;
  let originalSelf;

  let originalResponse;

  beforeAll(() => {
    originalSelf = global.self;
    global.self = global;
    originalResponse = global.Response;
    global.Response = class Response {
      constructor(body, init) {
        this.body = body;
        this.status = init ? init.status : 200;
      }
      async text() {
        return this.body;
      }
    };

    // Mock caches
    mockCache = {
      addAll: jest.fn().mockResolvedValue(undefined),
      match: jest.fn(),
      put: jest.fn().mockResolvedValue(undefined),
    };
    mockCaches = {
      open: jest.fn().mockResolvedValue(mockCache),
      keys: jest.fn().mockResolvedValue(['old-cache']),
      delete: jest.fn().mockResolvedValue(true),
    };
    global.caches = mockCaches;

    // Capture addEventListener
    global.addEventListener = jest.fn((event, callback) => {
      swListeners[event] = callback;
    });
    global.skipWaiting = jest.fn();
    global.clients = {
      claim: jest.fn(),
    };

    // Load sw.js code
    const swPath = path.resolve(__dirname, '../sw.js');
    const swContent = fs.readFileSync(swPath, 'utf8');
    eval(swContent);
  });

  afterAll(() => {
    global.self = originalSelf;
    if (originalResponse === undefined) {
      delete global.Response;
    } else {
      global.Response = originalResponse;
    }
    delete global.caches;
    delete global.addEventListener;
    delete global.skipWaiting;
    delete global.clients;
  });

  test('SW registers install, activate, and fetch listeners', () => {
    expect(swListeners['install']).toBeDefined();
    expect(swListeners['activate']).toBeDefined();
    expect(swListeners['fetch']).toBeDefined();
  });

  test('SW install event caches all assets', async () => {
    const mockEvent = {
      waitUntil: jest.fn(),
    };
    swListeners['install'](mockEvent);
    expect(mockEvent.waitUntil).toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockCaches.open).toHaveBeenCalledWith('systems-registry-v1');
    expect(mockCache.addAll).toHaveBeenCalled();
  });

  test('SW activate event deletes old caches', async () => {
    const mockEvent = {
      waitUntil: jest.fn(),
    };
    swListeners['activate'](mockEvent);
    expect(mockEvent.waitUntil).toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockCaches.keys).toHaveBeenCalled();
    expect(mockCaches.delete).toHaveBeenCalledWith('old-cache');
  });

  test('SW fetch event stale-while-revalidate', async () => {
    const mockRequest = {
      url: 'http://localhost/index.html',
    };
    const mockCachedResponse = { clone: () => 'cached-response' };
    const mockNetworkResponse = { status: 200, clone: () => 'network-response' };

    mockCache.match.mockResolvedValue(mockCachedResponse);
    global.fetch = jest.fn().mockResolvedValue(mockNetworkResponse);

    let respondWithPromise;
    const mockEvent = {
      request: mockRequest,
      respondWith: jest.fn((promise) => {
        respondWithPromise = promise;
      }),
    };

    swListeners['fetch'](mockEvent);
    expect(mockEvent.respondWith).toHaveBeenCalled();

    const response = await respondWithPromise;
    expect(response).toBe(mockCachedResponse);

    expect(global.fetch).toHaveBeenCalledWith(mockRequest);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockCache.put).toHaveBeenCalledWith(mockRequest, 'network-response');
  });

  test('SW fetch event ignores non-GET requests and passes them through directly', async () => {
    const mockRequest = {
      url: 'http://localhost/api/submit',
      method: 'POST',
    };
    global.fetch = jest.fn().mockResolvedValue('direct-response');

    let respondWithPromise;
    const mockEvent = {
      request: mockRequest,
      respondWith: jest.fn((promise) => {
        respondWithPromise = promise;
      }),
    };

    swListeners['fetch'](mockEvent);
    expect(mockEvent.respondWith).toHaveBeenCalled();
    const response = await respondWithPromise;
    expect(response).toBe('direct-response');
    expect(global.fetch).toHaveBeenCalledWith(mockRequest);
  });

  test('SW fetch event returns 503 fallback when not in cache and network fails', async () => {
    const mockRequest = {
      url: 'http://localhost/index.html',
      method: 'GET',
    };
    mockCache.match.mockResolvedValue(undefined);
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    let respondWithPromise;
    const mockEvent = {
      request: mockRequest,
      respondWith: jest.fn((promise) => {
        respondWithPromise = promise;
      }),
    };

    swListeners['fetch'](mockEvent);
    expect(mockEvent.respondWith).toHaveBeenCalled();

    const response = await respondWithPromise;
    expect(response).toBeDefined();
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).toBe('Offline fallback');
  });
});
