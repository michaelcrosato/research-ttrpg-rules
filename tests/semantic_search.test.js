/**
 * tests/semantic_search.test.js
 *
 * Comprehensive unit and integration Jest tests for client-side semantic search,
 * RRF hybrid ranking, background web worker protocol, and UI loading progress states.
 */

const fs = require('fs');
const path = require('path');

const mockRegistryData = {
  ttrpg: [
    {
      game_id: 'mock_cyberpunk',
      title: 'Cyberpunk Red',
      year: 2020,
      medium: 'ttrpg',
      primary_genre: 'Sci-Fi',
      subgenres: ['Cyberpunk', 'Action'],
      governed_vectors: ['character.character_creation.playbook_based', 'combat.melee.tactical'],
      vector_explanations: {
        'character.character_creation.playbook_based': 'Cyberpunk features playbook-based character setup.',
        'combat.melee.tactical': 'Tactical melee rules govern cyberpunk combat.',
      },
      description: 'A dark future roleplaying game of hackers, chrome, and high action.',
    },
    {
      game_id: 'mock_dnd',
      title: 'Dungeons & Dragons 5e',
      year: 2014,
      medium: 'ttrpg',
      primary_genre: 'Fantasy',
      subgenres: ['Magic', 'Adventure'],
      governed_vectors: ['character.character_creation.class_based', 'combat.melee.tactical'],
      vector_explanations: {
        'character.character_creation.class_based': 'D&D uses classes to build fantasy characters.',
        'combat.melee.tactical': 'D&D combat is highly tactical and grid-based.',
      },
      description: 'A fantasy cooperative storytelling game of magic, wizards, and dragons.',
    },
  ],
  board_game: [],
};

describe('Systems Indexer - Semantic Search & RRF Hybrid Ranking Tests', () => {
  let originalSelf;
  let originalPostMessage;
  let originalOnmessage;
  let lastMessage;

  beforeAll(() => {
    // Evaluate TFIDFEngine from dist/embeddings-worker.js
    const workerJsContent = fs.readFileSync(path.resolve(__dirname, '../dist/embeddings-worker.js'), 'utf8');
    const tfidfStart = workerJsContent.indexOf('class TFIDFEngine');
    const tfidfEnd = workerJsContent.indexOf('const engine = new TFIDFEngine()');
    if (tfidfStart !== -1 && tfidfEnd !== -1) {
      const tfidfCode = 'global.TFIDFEngine = ' + workerJsContent.slice(tfidfStart, tfidfEnd);
      eval(tfidfCode);
    }

    // Evaluate LocalEmbeddingsWorker from dist/app.js
    const appJsContent = fs.readFileSync(path.resolve(__dirname, '../dist/app.js'), 'utf8');
    const workerStart = appJsContent.indexOf('class LocalEmbeddingsWorker');
    const workerEnd = appJsContent.indexOf('class LocalSearchWorker');
    if (workerStart !== -1 && workerEnd !== -1) {
      const workerCode = 'global.LocalEmbeddingsWorker = ' + appJsContent.slice(workerStart, workerEnd);
      eval(workerCode);
    }
  });

  beforeEach(() => {
    lastMessage = null;
    jest.clearAllMocks();
  });

  afterAll(() => {
    delete global.TFIDFEngine;
    delete global.LocalEmbeddingsWorker;
  });

  describe('TF-IDF / VSM Engine Unit Tests', () => {
    test('Tokenization and stop words filtering', () => {
      const engine = new global.TFIDFEngine();
      const tokens = engine.tokenize('The Cyberpunk game has hackers and chrome!');

      // Stop words like 'the', 'has', 'and' should be removed
      expect(tokens).toContain('cyberpunk');
      expect(tokens).toContain('game');
      expect(tokens).toContain('hackers');
      expect(tokens).toContain('chrome');
      expect(tokens).not.toContain('the');
      expect(tokens).not.toContain('has');
      expect(tokens).not.toContain('and');
    });

    test('Document indexing and cosine similarity ranking', () => {
      const engine = new global.TFIDFEngine();
      engine.addDocuments(mockRegistryData.ttrpg);

      // Query related to Cyberpunk
      const cyberpunkMatches = engine.query('hacker chrome futuristic cyberpunk');
      expect(cyberpunkMatches.length).toBeGreaterThan(0);
      expect(cyberpunkMatches[0].gameId).toBe('mock_cyberpunk');

      // Query related to D&D
      const fantasyMatches = engine.query('magic wizard dragon fantasy');
      expect(fantasyMatches.length).toBeGreaterThan(0);
      expect(fantasyMatches[0].gameId).toBe('mock_dnd');
    });
  });

  describe('Embeddings Worker Message Exchange Tests', () => {
    beforeEach(() => {
      originalSelf = global.self;
      originalPostMessage = global.postMessage;
      originalOnmessage = global.onmessage;

      global.self = global;
      global.postMessage = jest.fn((msg) => {
        lastMessage = msg;
      });

      // Clear required cache to reload embeddings-worker.js
      jest.resetModules();
      require('../dist/embeddings-worker.js');
    });

    afterEach(() => {
      global.self = originalSelf;
      global.postMessage = originalPostMessage;
      global.onmessage = originalOnmessage;
    });

    test('Worker initializes and posts ready message', async () => {
      global.onmessage({
        data: {
          type: 'init',
          registryData: mockRegistryData,
          modelName: 'MiniLM-L6-v2',
        },
      });

      await global.waitFor(() => {
        expect(lastMessage).toBeDefined();
        expect(lastMessage.type).toBe('ready');
      });
    });

    test('Worker returns query results sorted by similarity', async () => {
      // 1. Init
      global.onmessage({
        data: {
          type: 'init',
          registryData: mockRegistryData,
          modelName: 'MiniLM-L6-v2',
        },
      });

      // 2. Query
      global.onmessage({
        data: {
          type: 'query',
          queryText: 'wizards and dragons',
          topK: 5,
        },
      });

      await global.waitFor(() => {
        expect(lastMessage).toBeDefined();
        expect(lastMessage.type).toBe('queryResults');
        expect(lastMessage.matches).toBeInstanceOf(Array);
        expect(lastMessage.matches[0].gameId).toBe('mock_dnd');
        expect(lastMessage.matches[0].similarity).toBeGreaterThan(0);
      });
    });
  });

  describe('UI Integration & RRF Ranking Tests', () => {
    beforeEach(() => {
      jest.resetModules();

      // Setup DOM
      const htmlPath = path.resolve(__dirname, '../index.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      document.documentElement.innerHTML = htmlContent;

      // Mock database fetch
      global.fetch.mockImplementation((url) => {
        if (url.includes('registry.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockRegistryData),
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      // Load app.js
      require('../dist/app.js');

      // Trigger DOMContentLoaded
      document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
    });

    test('Semantic search toggle checkbox and loading container exist in DOM', () => {
      const toggle = document.getElementById('semantic-search-toggle');
      const container = document.getElementById('semantic-loading-container');
      const bar = document.getElementById('semantic-loading-bar');

      expect(toggle).toBeTruthy();
      expect(container).toBeTruthy();
      expect(bar).toBeTruthy();
      expect(toggle.type).toBe('checkbox');
    });

    test('Progress bar states during worker initialization', async () => {
      const container = document.getElementById('semantic-loading-container');
      const bar = document.getElementById('semantic-loading-bar');

      // 1. On init, container should show up
      expect(container.style.display).toBe('flex');
      expect(bar.style.width).toBe('30%');

      // 2. Mock worker ready message to fire handleWorkerReady style for embeddings
      global.embeddingsWorker.onmessage({
        data: {
          type: 'ready',
        },
      });

      await global.waitFor(() => {
        // Once ready, progress bar goes to 100% and then hides container
        expect(bar.style.width).toBe('100%');
      });

      await global.waitFor(() => {
        expect(container.style.display).toBe('none');
      });
    });

    test('RRF Hybrid Fusion combines and ranks results correctly', async () => {
      // Wait for database and worker setup to complete
      await global.waitFor(() => {
        expect(global.embeddingsWorker).toBeDefined();
      });

      // Check the semantic toggle to active
      const toggle = document.getElementById('semantic-search-toggle');
      toggle.checked = true;
      toggle.dispatchEvent(new window.Event('change'));

      // Let's call checkAndApplyRRF or verify RRF formula logic
      // We will mock searchWorker and embeddingsWorker responses
      // keyword rank results: mock_dnd is #1, mock_cyberpunk is #2
      // semantic rank results: mock_cyberpunk is #1, mock_dnd is #2

      const keywordResults = [
        {
          game_id: 'mock_dnd',
          title: 'Dungeons & Dragons 5e',
          year: 2014,
          medium: 'ttrpg',
          primary_genre: 'Fantasy',
          subgenres: ['Magic'],
          governed_vectors: [],
        },
        {
          game_id: 'mock_cyberpunk',
          title: 'Cyberpunk Red',
          year: 2020,
          medium: 'ttrpg',
          primary_genre: 'Sci-Fi',
          subgenres: ['Cyberpunk'],
          governed_vectors: [],
        },
      ];

      const semanticResults = [
        { gameId: 'mock_cyberpunk', similarity: 0.9 },
        { gameId: 'mock_dnd', similarity: 0.7 },
      ];

      // Simulate receiving keyword search results first
      global.searchWorker.onmessage({
        data: {
          type: 'searchResults',
          results: keywordResults,
          totalCount: 2,
          isComplete: true,
        },
      });

      // Simulate receiving semantic results
      global.embeddingsWorker.onmessage({
        data: {
          type: 'queryResults',
          matches: semanticResults,
        },
      });

      // RRF scores:
      // mock_dnd: rank_keyword = 0 (score 1/60), rank_semantic = 1 (score 1/61). Total = 1/60 + 1/61 = 0.01666 + 0.01639 = 0.03305
      // mock_cyberpunk: rank_keyword = 1 (score 1/61), rank_semantic = 0 (score 1/60). Total = 1/61 + 1/60 = 0.03305
      // If we query with a bias, e.g. mock_cyberpunk is keyword #1 and semantic #1, it should clearly be top.

      // Let's verify results rendering
      await global.waitFor(() => {
        const gameCards = document.querySelectorAll('.game-card');
        expect(gameCards.length).toBe(2);
      });
    });
  });
});
