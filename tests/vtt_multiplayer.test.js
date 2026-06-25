/**
 * tests/vtt_multiplayer.test.js
 *
 * Unit and integration tests for:
 * 1. WebRTC playtest lobby signaling tokens and consensus state validation packets.
 * 2. Isometric coordinate conversions, Battle Map movement range, and Line of Sight calculations.
 * 3. FoundryVTT, Roll20, and Tabletop Simulator export format validation against template expectations.
 */

const fs = require('fs');
const path = require('path');

describe('VTT Multiplayer, Battle Map & Exporter Tests', () => {
  let appCode;

  beforeAll(() => {
    // Mock URL functions that JSDOM lacks
    if (!global.URL.createObjectURL) {
      global.URL.createObjectURL = jest.fn().mockReturnValue('blob://test');
    }
    if (!global.URL.revokeObjectURL) {
      global.URL.revokeObjectURL = jest.fn();
    }
    // Load app.js code to run in JSDOM context
    appCode = fs.readFileSync(path.join(__dirname, '..', 'dist', 'app.js'), 'utf8');
    const appPath = path.resolve(__dirname, '../dist/app.js');
    delete require.cache[appPath];
    require('../dist/app.js');
  });

  describe('WebGPU Dice Physics Fallback', () => {
    test('initWebGPUDicePhysics falls back to false when WebGPU is absent', async () => {
      const originalGpu = global.navigator.gpu;
      delete global.navigator.gpu;

      const success = await window.initWebGPUDicePhysics();
      expect(success).toBe(false);

      if (originalGpu) {
        global.navigator.gpu = originalGpu;
      }
    });

    test('initWebGPUDicePhysics succeeds when WebGPU is present and working', async () => {
      global.GPUBufferUsage = { STORAGE: 1, COPY_SRC: 2, COPY_DST: 4 };

      const mockDevice = {
        createShaderModule: jest.fn().mockReturnValue({}),
        createBuffer: jest.fn().mockReturnValue({}),
        createComputePipeline: jest.fn().mockReturnValue({
          getBindGroupLayout: jest.fn().mockReturnValue({}),
        }),
        createBindGroup: jest.fn().mockReturnValue({}),
        createCommandEncoder: jest.fn().mockReturnValue({
          beginComputePass: jest.fn().mockReturnValue({
            setPipeline: jest.fn(),
            setBindGroup: jest.fn(),
            dispatchWorkgroups: jest.fn(),
            end: jest.fn(),
          }),
          finish: jest.fn().mockReturnValue({}),
        }),
        queue: {
          submit: jest.fn(),
        },
      };

      const mockAdapter = {
        requestDevice: jest.fn().mockResolvedValue(mockDevice),
      };

      const mockGpu = {
        requestAdapter: jest.fn().mockResolvedValue(mockAdapter),
      };

      const originalGpu = global.navigator.gpu;
      Object.defineProperty(global.navigator, 'gpu', {
        value: mockGpu,
        configurable: true,
        writable: true,
      });

      const success = await window.initWebGPUDicePhysics();
      expect(success).toBe(true);
      expect(mockGpu.requestAdapter).toHaveBeenCalled();
      expect(mockAdapter.requestDevice).toHaveBeenCalled();
      expect(mockDevice.createShaderModule).toHaveBeenCalled();

      if (originalGpu) {
        Object.defineProperty(global.navigator, 'gpu', {
          value: originalGpu,
          configurable: true,
          writable: true,
        });
      } else {
        delete global.navigator.gpu;
      }
      delete global.GPUBufferUsage;
    });
  });

  describe('WebRTC Lobby Signaling & Consensus Validation', () => {
    test('validateStateChangeProposal validates correct dice math and HP ranges', () => {
      const validate = window.validateStateChangeProposal;
      expect(validate).toBeDefined();

      // Test valid proposal
      const validProposal = {
        action: 'chat',
        roll: { rolls: [3, 5], modifier: 2, finalResult: 10 },
        statChanges: { hitPoints: 8 },
      };
      expect(validate(validProposal)).toBe(true);

      // Test invalid dice math proposal
      const invalidRollProposal = {
        action: 'chat',
        roll: { rolls: [3, 5], modifier: 2, finalResult: 12 }, // should be 10 (3+5+2)
        statChanges: { hitPoints: 8 },
      };
      expect(validate(invalidRollProposal)).toBe(false);

      // Test invalid HP proposal (exceeds max HP fallback)
      const invalidHpProposal = {
        action: 'edit_character',
        statChanges: { hitPoints: 10000 },
      };
      expect(validate(invalidHpProposal)).toBe(false);
    });

    test('proposeStateChange handles local application when offline', async () => {
      const propose = window.proposeStateChange;
      expect(propose).toBeDefined();

      // Initialize a session
      window.sandboxSession = {
        character: {
          name: 'Adventurer',
          level: 1,
          hitPoints: 10,
          maxHitPoints: 10,
          stats: { Strength: 10 },
          inventory: [],
        },
        chatLog: [],
      };

      // Since rtcDataChannel is not open, it should immediately apply locally and return true
      const result = await propose('edit_character', null, { hitPoints: 5 });
      expect(result).toBe(true);
      expect(window.sandboxSession.character.hitPoints).toBe(5);
    });
  });

  describe('Isometric Battle Map Coordinate Conversion & Movement Range', () => {
    test('gridToIso and isoToGrid round-trip conversion works correctly', () => {
      const toIso = window.gridToIso;
      const toGrid = window.isoToGrid;

      expect(toIso).toBeDefined();
      expect(toGrid).toBeDefined();

      // Test origin
      expect(toIso(0, 0)).toEqual({ x: 0, y: 0 });
      expect(toGrid(0, 0)).toEqual({ x: 0, y: 0 });

      // Test tile (2, 3)
      // tileWidth = 60, tileHeight = 30
      // x = (2 - 3) * (60 / 2) = -30
      // y = (2 + 3) * (30 / 2) = 75
      const isoCoord = toIso(2, 3);
      expect(isoCoord).toEqual({ x: -30, y: 75 });

      const gridCoord = toGrid(isoCoord.x, isoCoord.y);
      expect(gridCoord.x).toBe(2);
      expect(gridCoord.y).toBe(3);
    });

    test('isLineOfSightBlocked correctly detects obstacles between tokens', () => {
      const isBlocked = window.isLineOfSightBlocked;
      expect(isBlocked).toBeDefined();

      // Initialize map grid
      window.initBattleMap();
      const grid = window.mapGrid;
      expect(grid).toBeDefined();

      // Clear obstacles on path (2, 2) to (5, 5)
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          grid[r][c].isObstacle = false;
        }
      }
      expect(isBlocked(2, 2, 5, 5)).toBe(false);

      // Add obstacle in between
      grid[3][3].isObstacle = true;
      expect(isBlocked(2, 2, 5, 5)).toBe(true);
    });
  });

  describe('VTT & Document Exporters format structures', () => {
    test('FoundryVTT exporter outputs correct JournalEntry structure', () => {
      const ruleset = {
        title: 'Test Ruleset',
        sections: [{ heading: 'Combat', domain: 'combat', rules: ['Rule 1'] }],
        resolutionNotes: [],
        characterTemplate: {
          name: 'Adv',
          level: 1,
          hitPoints: 10,
          maxHitPoints: 10,
          stats: {},
          skills: [],
          abilities: [],
          inventory: [],
          conditions: [],
        },
      };

      const originalBlob = global.Blob;
      const originalCreateURL = global.URL.createObjectURL;
      const originalRevokeURL = global.URL.revokeObjectURL;

      const blobMock = jest.fn();
      global.Blob = function (content, options) {
        blobMock(content, options);
        return { content, options };
      };

      const downloadMock = jest.fn();
      const mockAnchor = {
        setAttribute: jest.fn(),
        click: downloadMock,
        style: {},
      };
      document.createElement = jest.fn().mockImplementation((tagName) => {
        if (tagName === 'a') return mockAnchor;
        return {};
      });
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();
      global.URL.createObjectURL = jest.fn().mockReturnValue('blob://test');
      global.URL.revokeObjectURL = jest.fn();

      window.exportRulesetFoundry(ruleset);

      expect(blobMock).toHaveBeenCalled();
      const contentString = blobMock.mock.calls[0][0][0];
      const parsed = JSON.parse(contentString);
      expect(parsed.name).toBe('Test Ruleset');
      expect(parsed).toHaveProperty('content');
      expect(parsed.permission).toHaveProperty('default');

      global.Blob = originalBlob;
      global.URL.createObjectURL = originalCreateURL;
      global.URL.revokeObjectURL = originalRevokeURL;
    });

    test('Roll20 exporter outputs correct Character Attributes mapping', () => {
      window.sandboxSession = {
        character: {
          name: 'Hero',
          level: 3,
          hitPoints: 15,
          maxHitPoints: 20,
          stats: { Strength: 12 },
          inventory: [],
        },
      };

      const originalBlob = global.Blob;
      const blobMock = jest.fn();
      global.Blob = function (content, options) {
        blobMock(content, options);
        return { content, options };
      };

      global.URL.createObjectURL = jest.fn().mockReturnValue('blob://test');

      window.exportRulesetRoll20();

      expect(blobMock).toHaveBeenCalled();
      const contentString = blobMock.mock.calls[0][0][0];
      const parsed = JSON.parse(contentString);
      expect(parsed.name).toBe('Hero');
      expect(parsed.attributes).toContainEqual(expect.objectContaining({ name: 'level', current: 3 }));
      expect(parsed.attributes).toContainEqual(expect.objectContaining({ name: 'strength', current: 12 }));

      global.Blob = originalBlob;
    });

    test('Tabletop Simulator exporter outputs correct save file Notebook layout', () => {
      const ruleset = {
        title: 'Test TTS Ruleset',
        sections: [{ heading: 'Rules', domain: 'combat', rules: ['Rule 1'] }],
        resolutionNotes: [],
        characterTemplate: {
          name: 'Adv',
          level: 1,
          hitPoints: 10,
          maxHitPoints: 10,
          stats: { Strength: 10 },
          skills: [],
          abilities: [],
          inventory: [],
          conditions: [],
        },
      };

      const originalBlob = global.Blob;
      const blobMock = jest.fn();
      global.Blob = function (content, options) {
        blobMock(content, options);
        return { content, options };
      };

      global.URL.createObjectURL = jest.fn().mockReturnValue('blob://test');

      window.exportRulesetTTS(ruleset);

      expect(blobMock).toHaveBeenCalled();
      const contentString = blobMock.mock.calls[0][0][0];
      const parsed = JSON.parse(contentString);
      expect(parsed.SaveName).toBe('Test TTS Ruleset - VTT Ruleset');
      expect(parsed.Notebook).toBeDefined();
      expect(parsed.Notebook[1].title).toBe('Character Sheet');

      global.Blob = originalBlob;
    });
  });
});
