const fs = require('fs');
const path = require('path');

describe('OmniRuleset Sandbox Module', () => {
  let dbMockStore = {};

  beforeAll(() => {
    // Mock IndexedDB
    const mockIDBRequest = {
      result: {
        transaction: () => ({
          objectStore: () => ({
            get: (key) => ({
              set onsuccess(fn) {
                setTimeout(() => fn(), 0);
              },
              get result() {
                return dbMockStore[key] || null;
              },
            }),
            put: (data, key) => ({
              set onsuccess(fn) {
                dbMockStore[key] = data;
                setTimeout(() => fn(), 0);
              },
            }),
            getAll: () => ({
              set onsuccess(fn) {
                setTimeout(() => fn(), 0);
              },
              get result() {
                return Object.values(dbMockStore);
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

    if (typeof window !== 'undefined') {
      window.indexedDB = global.indexedDB;
    }

    // Mock Fetch
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('registry.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ttrpg: [], board_game: [] }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    // Populate innerHTML
    const htmlPath = path.resolve(__dirname, '../index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    document.documentElement.innerHTML = htmlContent;

    // Load app
    const appPath = path.resolve(__dirname, '../dist/app.js');
    delete require.cache[appPath];
    require('../dist/app.js');

    // Trigger DOMContentLoaded
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  });

  describe('Conflict Checker', () => {
    test('detects no conflicts when vectors are compatible', () => {
      const vectors = ['combat.melee.tactical', 'magic.resource.mana_pool', 'exploration.navigation'];
      const conflicts = window.sandboxAnalyzeConflicts(vectors);
      expect(conflicts).toHaveLength(0);
    });

    test('detects critical conflict between dice pool and single die', () => {
      const vectors = ['resolution.dice_pool', 'resolution.single_die', 'combat.melee'];
      const conflicts = window.sandboxAnalyzeConflicts(vectors);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].rule.id).toBe('dice-pool-vs-single-die');
      expect(conflicts[0].rule.severity).toBe('critical');
    });

    test('detects multiple conflicts when several incompatible pairs present', () => {
      const vectors = [
        'resolution.dice_pool',
        'resolution.single_die',
        'combat.damage.hit_points',
        'combat.damage.wound_levels',
      ];
      const conflicts = window.sandboxAnalyzeConflicts(vectors);
      expect(conflicts).toHaveLength(2);
      const categories = conflicts.map((c) => c.rule.category);
      expect(categories).toContain('Resolution Mechanic');
      expect(categories).toContain('Damage System');
    });

    test('correctly identifies triggering vectors', () => {
      const vectors = ['character.progression.class_based', 'character.progression.classless'];
      const conflicts = window.sandboxAnalyzeConflicts(vectors);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].triggeringVectors).toEqual(
        expect.arrayContaining(['character.progression.class_based', 'character.progression.classless'])
      );
    });

    test('matches child vectors via prefix', () => {
      const vectors = ['resolution.dice_pool.d10_system', 'resolution.single_die.d20'];
      const conflicts = window.sandboxAnalyzeConflicts(vectors);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].rule.id).toBe('dice-pool-vs-single-die');
    });

    test('does not trigger with only one side of a conflict pattern', () => {
      const vectors = ['resolution.dice_pool', 'combat.melee'];
      const conflicts = window.sandboxAnalyzeConflicts(vectors);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('Dice Rolling', () => {
    test('1d20 produces values between 1 and 20', () => {
      for (let i = 0; i < 100; i++) {
        const result = window.sandboxRollDice('1d20');
        expect(result.rolls).toHaveLength(1);
        expect(result.rolls[0]).toBeGreaterThanOrEqual(1);
        expect(result.rolls[0]).toBeLessThanOrEqual(20);
        expect(result.finalResult).toBe(result.total);
      }
    });

    test('2d6 produces values between 2 and 12', () => {
      for (let i = 0; i < 100; i++) {
        const result = window.sandboxRollDice('2d6');
        expect(result.rolls).toHaveLength(2);
        expect(result.total).toBeGreaterThanOrEqual(2);
        expect(result.total).toBeLessThanOrEqual(12);
      }
    });

    test('modifier is correctly applied', () => {
      const result = window.sandboxRollDice('1d6+3');
      expect(result.modifier).toBe(3);
      expect(result.finalResult).toBe(result.total + 3);
    });

    test('negative modifier works', () => {
      const result = window.sandboxRollDice('1d8-2');
      expect(result.modifier).toBe(-2);
      expect(result.finalResult).toBe(result.total - 2);
    });
  });

  describe('Action Classification', () => {
    test('classifies attack actions correctly', () => {
      expect(window.sandboxClassifyAction('I attack the goblin')).toBe('attack');
      expect(window.sandboxClassifyAction('Strike with my sword')).toBe('attack');
      expect(window.sandboxClassifyAction('Shoot an arrow at the target')).toBe('attack');
    });

    test('classifies defend actions correctly', () => {
      expect(window.sandboxClassifyAction('I dodge out of the way')).toBe('defend');
      expect(window.sandboxClassifyAction('Block with my shield')).toBe('defend');
      expect(window.sandboxClassifyAction('Parry the blade')).toBe('defend');
    });

    test('classifies cast actions correctly', () => {
      expect(window.sandboxClassifyAction('Cast fireball')).toBe('cast');
      expect(window.sandboxClassifyAction('I channel arcane magic')).toBe('cast');
      expect(window.sandboxClassifyAction('Summon a familiar')).toBe('cast');
    });

    test('classifies explore actions correctly', () => {
      expect(window.sandboxClassifyAction('Search the room')).toBe('explore');
      expect(window.sandboxClassifyAction('I look around carefully')).toBe('explore');
      expect(window.sandboxClassifyAction('Investigate the door')).toBe('explore');
    });

    test('classifies social actions correctly', () => {
      expect(window.sandboxClassifyAction('Talk to the merchant')).toBe('social');
      expect(window.sandboxClassifyAction('I try to persuade the guard')).toBe('social');
      expect(window.sandboxClassifyAction('Intimidate the bandit')).toBe('social');
    });

    test('classifies skill actions correctly', () => {
      expect(window.sandboxClassifyAction('Climb the wall')).toBe('skill');
      expect(window.sandboxClassifyAction('I sneak past the guards')).toBe('skill');
      expect(window.sandboxClassifyAction('Heal my wounds')).toBe('skill');
      expect(window.sandboxClassifyAction('I picklock the chest')).toBe('skill');
    });

    test('classifies rest actions correctly', () => {
      expect(window.sandboxClassifyAction('I rest by the campfire')).toBe('rest');
      expect(window.sandboxClassifyAction('Sleep for the night')).toBe('rest');
      expect(window.sandboxClassifyAction('Meditate to recover energy')).toBe('rest');
    });

    test('returns unknown for unrecognized actions', () => {
      expect(window.sandboxClassifyAction('I contemplate the meaning of life')).toBe('unknown');
    });
  });

  describe('Character Generation', () => {
    test('combat domain boosts STR and CON and adds combat gear', () => {
      const char = window.sandboxGenerateCharacter({ combat: ['combat.melee'] });
      expect(char.stats.STR).toBe(14);
      expect(char.stats.CON).toBe(12);
      expect(char.inventory).toContain('Short Sword');
      expect(char.skills).toContain('Athletics');
    });

    test('magic domain boosts INT and WIS and adds spells', () => {
      const char = window.sandboxGenerateCharacter({ magic: ['magic.arcane'] });
      expect(char.stats.INT).toBe(14);
      expect(char.abilities).toContain('Spell: Magic Missile');
    });

    test('no domains gives default character', () => {
      const char = window.sandboxGenerateCharacter({});
      expect(char.stats.STR).toBe(10);
      expect(char.skills).toEqual(['General Knowledge']);
      expect(char.abilities).toEqual(['Improvise']);
    });

    test('HP is correctly calculated from CON', () => {
      const char = window.sandboxGenerateCharacter({ combat: ['combat.melee'] });
      expect(char.maxHitPoints).toBe(8 + (12 - 10));
      expect(char.hitPoints).toBe(char.maxHitPoints);
    });
  });

  describe('Rules Synthesizer', () => {
    test('synthesizes ruleset sections and characters correctly', () => {
      const vectors = ['combat.melee', 'magic.arcane'];
      const conflicts = window.sandboxAnalyzeConflicts(vectors);
      const explanations = {
        'combat.melee': ['D&D 5e', 'Pathfinder'],
        'magic.arcane': ['Call of Cthulhu'],
      };

      const ruleset = window.sandboxSynthesizeRuleset(vectors, conflicts, explanations);
      expect(ruleset.title).toContain('Combat');
      expect(ruleset.title).toContain('Magic');
      expect(ruleset.sections).toBeDefined();
      expect(ruleset.sections.length).toBeGreaterThan(0);
      expect(ruleset.characterTemplate).toBeDefined();
      expect(ruleset.characterTemplate.stats.STR).toBe(14);
      expect(ruleset.characterTemplate.stats.INT).toBe(14);
    });

    test('vectorToLabel converts dots to arrows and underscores to spaces', () => {
      expect(window.vectorToLabel('combat.melee.tactical')).toBe('Combat → Melee → Tactical');
      expect(window.vectorToLabel('character.progression.class_based')).toBe('Character → Progression → Class based');
    });
  });

  describe('Sandbox Integration', () => {
    test('compiled app.js contains sandbox initialization function', () => {
      const appCode = fs.readFileSync(path.join(__dirname, '..', 'dist', 'app.js'), 'utf8');
      expect(appCode).toContain('initializeSandbox');
    });

    test('compiled app.js contains sandbox conflict rules', () => {
      const appCode = fs.readFileSync(path.join(__dirname, '..', 'dist', 'app.js'), 'utf8');
      expect(appCode).toContain('SANDBOX_CONFLICT_RULES');
      expect(appCode).toContain('dice-pool-vs-single-die');
    });

    test('compiled app.js contains GM engine scene templates', () => {
      const appCode = fs.readFileSync(path.join(__dirname, '..', 'dist', 'app.js'), 'utf8');
      expect(appCode).toContain('SANDBOX_OPENING_SCENES');
      expect(appCode).toContain('Giant Rat');
      expect(appCode).toContain('Cave Spider Queen');
    });

    test('compiled app.js contains character generation logic', () => {
      const appCode = fs.readFileSync(path.join(__dirname, '..', 'dist', 'app.js'), 'utf8');
      expect(appCode).toContain('sandboxGenerateCharacter');
      expect(appCode).toContain('Unnamed Adventurer');
    });

    test('compiled app.js registers sandbox tab in setupTabs', () => {
      const appCode = fs.readFileSync(path.join(__dirname, '..', 'dist', 'app.js'), 'utf8');
      expect(appCode).toContain('sandbox');
    });
  });
});
