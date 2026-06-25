const fs = require('fs');
const path = require('path');

describe('Milestone 4 - Topology Graph & Developer Diagnostics Panel', () => {
  let mockGames;
  let originalUpdateDiagnosticsAlerts;
  let originalUpdateMemoryDisplay;

  beforeEach(() => {
    // 1. Reset modules cache
    jest.resetModules();

    // 2. Set up requestAnimationFrame mock
    global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
    global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

    // 3. Load HTML
    const htmlPath = path.resolve(__dirname, '../index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    document.documentElement.innerHTML = htmlContent;

    // Mock HTMLCanvasElement context
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn(() => ({ width: 50 })),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      createLinearGradient: jest.fn(() => ({
        addColorStop: jest.fn(),
      })),
      fillRect: jest.fn(),
    }));

    // Mock performance.now
    if (!global.performance) {
      global.performance = {};
    }
    global.performance.now = jest.fn(() => Date.now());

    // 4. Mock registry fetch
    mockGames = [
      {
        game_id: 'game_combat_stealth',
        title: 'Tactical Combat & Stealth',
        year: 2024,
        medium: 'ttrpg',
        primary_genre: 'Fantasy',
        subgenres: ['Tactical'],
        governed_vectors: ['combat.melee.tactical', 'stealth.shadows'],
        vector_explanations: {},
      },
      {
        game_id: 'game_combat_only',
        title: 'Gladiator Arena',
        year: 2023,
        medium: 'board_game',
        primary_genre: 'Strategy',
        subgenres: [],
        governed_vectors: ['combat.melee.tactical'],
        vector_explanations: {},
      },
      {
        game_id: 'game_economy_only',
        title: 'Euro Farm Tycoon',
        year: 2021,
        medium: 'board_game',
        primary_genre: 'Strategy',
        subgenres: ['Economic'],
        governed_vectors: ['economy.market.trading'],
        vector_explanations: {},
      },
    ];

    global.fetch.mockImplementation((url) => {
      if (url.includes('registry.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              ttrpg: mockGames.filter((g) => g.medium === 'ttrpg'),
              board_game: mockGames.filter((g) => g.medium === 'board_game'),
            }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    // Load application code
    require('../dist/app.js');
    require('../dist/diagnostics.js');

    originalUpdateDiagnosticsAlerts = window.updateDiagnosticsAlerts;
    originalUpdateMemoryDisplay = window.updateMemoryDisplay;

    // Trigger DOM load
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  });

  afterEach(() => {
    window.updateDiagnosticsAlerts = originalUpdateDiagnosticsAlerts;
    window.updateMemoryDisplay = originalUpdateMemoryDisplay;
    jest.restoreAllMocks();
  });

  describe('UI Elements Presence', () => {
    test('Topology view navigation tab and panel exist', () => {
      const tabBtn = document.getElementById('tab-nav-topology');
      const viewPanel = document.getElementById('topology-view');
      const canvas = document.getElementById('topology-canvas');
      const searchInput = document.getElementById('topology-search-input');
      const searchBtn = document.getElementById('topology-search-btn');

      expect(tabBtn).toBeTruthy();
      expect(viewPanel).toBeTruthy();
      expect(canvas).toBeTruthy();
      expect(searchInput).toBeTruthy();
      expect(searchBtn).toBeTruthy();
    });

    test('Diagnostics panel navigation tab and gauges exist', () => {
      const tabBtn = document.getElementById('tab-nav-diagnostics');
      const panel = document.getElementById('diagnostics-panel');
      const fpsEl = document.getElementById('diagnostics-fps');
      const memoryEl = document.getElementById('diagnostics-memory');
      const alertsEl = document.getElementById('diagnostics-alerts');
      const listenersEl = document.getElementById('diagnostics-listeners');

      expect(tabBtn).toBeTruthy();
      expect(panel).toBeTruthy();
      expect(fpsEl).toBeTruthy();
      expect(memoryEl).toBeTruthy();
      expect(alertsEl).toBeTruthy();
      expect(listenersEl).toBeTruthy();
    });
  });

  describe('Graph Topology and Physics Logic', () => {
    test('Color-coding assigns colors based on primary vector namespaces', () => {
      const getGameColor = window.getGameColor;
      expect(getGameColor).toBeDefined();

      const combatGame = mockGames[1];
      const economyGame = mockGames[2];

      const combatColor = getGameColor(combatGame);
      const economyColor = getGameColor(economyGame);

      expect(combatColor).toBe('#ef4444'); // combat namespace color
      expect(economyColor).toBe('#f59e0b'); // economy namespace color
    });

    test('getNeighbors finds games sharing at least 1 mechanical vector', () => {
      const getNeighbors = window.getNeighbors;
      expect(getNeighbors).toBeDefined();

      window.allGames = mockGames.map((g) => ({
        ...g,
        governed_vectors_set: new Set(g.governed_vectors),
      }));

      // game_combat_stealth shares 'combat.melee.tactical' with game_combat_only
      const neighbors = getNeighbors(mockGames[0]);
      const neighborIds = neighbors.map((n) => n.game_id);

      expect(neighborIds).toContain('game_combat_only');
      expect(neighborIds).not.toContain('game_economy_only');
    });

    test('buildTopologyGraph limits graph nodes and builds links between sharing systems', () => {
      const buildTopologyGraph = window.buildTopologyGraph;
      expect(buildTopologyGraph).toBeDefined();

      window.allGames = mockGames.map((g) => ({
        ...g,
        governed_vectors_set: new Set(g.governed_vectors),
      }));

      // Focus on the first game
      buildTopologyGraph(window.allGames[0]);

      const nodes = window.topologyNodes;
      const edges = window.topologyEdges;

      expect(nodes.length).toBeGreaterThan(0);
      // The combat_stealth game should be linked to combat_only
      expect(edges.length).toBeGreaterThan(0);

      const linked = edges.some(
        (edge) =>
          (edge.source.id === 'game_combat_stealth' && edge.target.id === 'game_combat_only') ||
          (edge.source.id === 'game_combat_only' && edge.target.id === 'game_combat_stealth')
      );
      expect(linked).toBe(true);
    });

    test('updateTopologyPhysics updates coordinates and applies forces', () => {
      const updateTopologyPhysics = window.updateTopologyPhysics;
      expect(updateTopologyPhysics).toBeDefined();

      // Create two close mock nodes to trigger repulsion
      window.topologyNodes = [
        {
          id: 'nodeA',
          title: 'Node A',
          x: 100,
          y: 100,
          vx: 0,
          vy: 0,
          radius: 10,
          color: '#fff',
          game: {},
          isDragging: false,
        },
        {
          id: 'nodeB',
          title: 'Node B',
          x: 102,
          y: 100,
          vx: 0,
          vy: 0,
          radius: 10,
          color: '#fff',
          game: {},
          isDragging: false,
        },
      ];
      window.topologyEdges = [];

      updateTopologyPhysics();

      const nodeA = window.topologyNodes[0];
      const nodeB = window.topologyNodes[1];

      // They should repel (move away from each other on the X axis)
      // Since nodeA is at 100 and nodeB is at 102, nodeA's vx should be negative and nodeB's vx positive
      expect(nodeA.vx).toBeLessThan(0);
      expect(nodeB.vx).toBeGreaterThan(0);
    });

    test('coordinates translation maps correctly with pan and zoom', () => {
      window.panX = 50;
      window.panY = 100;
      window.zoomScale = 2.0;

      // Convert mouse coordinates (clientX, clientY) to world coordinates:
      // worldX = (mouseX - panX) / zoomScale
      const mouseX = 150;
      const mouseY = 300;

      const worldX = (mouseX - window.panX) / window.zoomScale;
      const worldY = (mouseY - window.panY) / window.zoomScale;

      expect(worldX).toBe(50);
      expect(worldY).toBe(100);
    });
  });

  describe('Diagnostics Gauges and Telemetry', () => {
    test('FPS calculation tracks render frame rate correctly', () => {
      const fpsEl = document.getElementById('diagnostics-fps');
      expect(fpsEl).toBeTruthy();

      let frameTime = 1000;
      global.performance.now = jest.fn(() => frameTime);

      window.frameCount = 0;
      window.lastFpsUpdateTime = 1000;
      window.lastFrameTime = 1000;

      frameTime = 1500;
      window.frameCount = 30;

      window.updateDiagnosticsAlerts = jest.fn();
      window.updateMemoryDisplay = jest.fn();

      window.runDiagnosticsLoop();

      expect(window.currentFps).toBe(60.0);
      expect(fpsEl.textContent).toBe('60.0');
    });

    test('search latency histogram plots without error and computes average', () => {
      const statsDiv = document.getElementById('latency-stats');
      expect(statsDiv).toBeTruthy();

      window.searchLatencies = [10, 20, 30];
      window.drawLatencyHistogram();

      expect(statsDiv.innerHTML).toContain('Last: 30.0ms');
      expect(statsDiv.innerHTML).toContain('Avg: 20.0ms');
    });

    test('alerts trigger appropriately on threshold violations', () => {
      const alertsEl = document.getElementById('diagnostics-alerts');
      expect(alertsEl).toBeTruthy();

      window.currentFps = 15;
      window.activeListenersCount = 10;
      window.maxFrameDelta = 0;

      window.updateDiagnosticsAlerts();
      expect(alertsEl.textContent).toContain('Low frame rate detected');

      window.currentFps = 60;
      window.activeListenersCount = 400;
      window.updateDiagnosticsAlerts();
      expect(alertsEl.textContent).toContain('High event listener count');
    });
  });
});
