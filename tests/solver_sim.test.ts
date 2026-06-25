/**
 * tests/solver_sim.test.ts
 *
 * Jest unit and integration tests for:
 * 1. The Logical Consistency Solver (src/solver.ts)
 * 2. The Monte Carlo Simulation Runner (src/app.ts + src/dsl.ts VM)
 */

import { analyzeLogicalConflicts } from '../src/solver';
import { runDSL } from '../src/dsl';

describe('TTRPG Upgrade - Solver & Simulation Integration Tests', () => {
  describe('Logical Consistency Solver Unit Tests', () => {
    test('Flags overlapping mechanics (warnings)', () => {
      // Overlapping damage systems
      const damageConflicts = analyzeLogicalConflicts(['combat.damage.hit_points', 'combat.damage.wound_levels']);
      expect(damageConflicts.length).toBeGreaterThan(0);
      expect(damageConflicts[0].rule.severity).toBe('warning');
      expect(damageConflicts[0].rule.id).toBe('hp-vs-wound-track');
      expect(damageConflicts[0].triggeringVectors).toContain('combat.damage.hit_points');
      expect(damageConflicts[0].triggeringVectors).toContain('combat.damage.wound_levels');

      // Overlapping initiative systems
      const initConflicts = analyzeLogicalConflicts([
        'combat.initiative.dexterity_based',
        'combat.initiative.narrative',
      ]);
      expect(initConflicts.length).toBeGreaterThan(0);
      expect(initConflicts[0].rule.severity).toBe('warning');
      expect(initConflicts[0].rule.id).toBe('initiative-dex-vs-narrative');
    });

    test('Flags mutually exclusive resolution systems (critical conflicts)', () => {
      const exclusiveConflicts = analyzeLogicalConflicts(['resolution.roll_over', 'resolution.roll_under']);
      expect(exclusiveConflicts.length).toBe(1);
      expect(exclusiveConflicts[0].rule.severity).toBe('critical');
      expect(exclusiveConflicts[0].rule.id).toBe('roll-over-vs-roll-under');
      expect(exclusiveConflicts[0].triggeringVectors).toContain('resolution.roll_over');
      expect(exclusiveConflicts[0].triggeringVectors).toContain('resolution.roll_under');
    });

    test('Detects directed graph cycles for infinite loop modifiers (critical conflicts)', () => {
      // Case 1: STR -> damage -> STR cycle via combat.melee.rage and combat.damage.feedback
      const cycle1 = analyzeLogicalConflicts(['combat.melee.rage', 'combat.damage.feedback']);
      expect(cycle1.length).toBe(1);
      expect(cycle1[0].rule.severity).toBe('critical');
      expect(cycle1[0].rule.category).toBe('Infinite Loop Modifier');
      expect(cycle1[0].rule.description).toContain('Circular dependency');
      expect(cycle1[0].triggeringVectors).toContain('combat.melee.rage');
      expect(cycle1[0].triggeringVectors).toContain('combat.damage.feedback');

      // Case 2: mana -> health -> mana cycle via magic.resource.mana_burn and magic.resource.feedback_loop
      const cycle2 = analyzeLogicalConflicts(['magic.resource.mana_burn', 'magic.resource.feedback_loop']);
      expect(cycle2.length).toBe(1);
      expect(cycle2[0].rule.severity).toBe('critical');
      expect(cycle2[0].rule.category).toBe('Infinite Loop Modifier');
      expect(cycle2[0].triggeringVectors).toContain('magic.resource.mana_burn');
      expect(cycle2[0].triggeringVectors).toContain('magic.resource.feedback_loop');
    });

    test('No conflicts flagged for compatible sets', () => {
      const conflicts = analyzeLogicalConflicts([
        'combat.melee.tactical',
        'resolution.roll_over',
        'character.progression.class_based',
      ]);
      expect(conflicts.length).toBe(0);
    });
  });

  describe('Monte Carlo Simulation Integration Tests', () => {
    beforeAll(() => {
      // Expose runDSL globally since app.ts references it on window
      (global as any).window = global;
      (window as any).runDSL = runDSL;

      // Load app.js (the compiled output gets loaded dynamically)
      require('../dist/app.js');
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    test('Simulation runner compiles, runs and updates JSDOM elements correctly', () => {
      jest.useFakeTimers();

      // Create target DOM structure
      document.body.innerHTML = `
        <select id="sim-round-count">
          <option value="10" selected>10 Rounds</option>
        </select>
        <button id="sim-run-btn" disabled>Run Simulation</button>
        <div id="sim-log"></div>
        <div id="sim-success-rate">--%</div>
        <div id="sim-avg-modifier">--</div>
        <div id="sim-total-actions">0</div>
        <div id="sim-roll-chart"></div>
      `;

      // Set active sandbox session
      (window as any).sandboxSession = {
        character: {
          stats: {
            STR: 14, // Modifier should be +2
            DEX: 10,
            CON: 10,
            INT: 10,
            WIS: 10,
            CHA: 10,
          },
        },
      };

      const runBtn = document.getElementById('sim-run-btn') as HTMLButtonElement;
      expect(runBtn).toBeDefined();

      const runSandboxSimulation = (window as any).runSandboxSimulation;
      expect(runSandboxSimulation).toBeDefined();

      // Trigger the simulation
      runSandboxSimulation();

      // Advance timers to complete asynchronous batches
      jest.runAllTimers();

      // Verify stats summary update
      const successRateText = document.getElementById('sim-success-rate')?.textContent;
      const avgModText = document.getElementById('sim-avg-modifier')?.textContent;
      const totalActionsText = document.getElementById('sim-total-actions')?.textContent;
      const rollChartHtml = document.getElementById('sim-roll-chart')?.innerHTML;
      const logText = document.getElementById('sim-log')?.innerHTML;

      expect(successRateText).toContain('%');
      expect(parseFloat(successRateText || '0')).toBeGreaterThan(0);
      expect(avgModText).toBe('2.0'); // (14-10)/2 = 2
      expect(totalActionsText).toBe('10');

      // Verify chart contains rendered SVG bars
      expect(rollChartHtml).toContain('<svg');
      expect(rollChartHtml).toContain('rect');

      // Verify log content
      expect(logText).toContain('Round 1:');
      expect(logText).toContain('vs DC 12');
    });
  });
});
