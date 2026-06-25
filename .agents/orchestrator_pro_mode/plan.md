# Plan: Pro Mode OmniRuleset Sandbox Implementation

## Multi-Level Agent Hierarchy (3 Layers)
1. **Level 1: Project Orchestrator (This Agent)**
   - Manages top-level milestone planning, status, and task coordination.
   - Coordinates the dual tracks (Implementation vs E2E Testing).
   - Validates milestone gates and runs final integration checks.
2. **Level 2: Domain Specialists (Sub-orchestrators)**
   - `sub_orch_impl`: Sub-orchestrator for the Implementation Track (Rules Synthesizer, Conflict Checker, GM Playtest UI/UX, and TS compilation).
   - `sub_orch_e2e`: Sub-orchestrator for the E2E Testing Track (Creating mock infrastructure, testing harness, writing Tier 1-4 tests, and publishing `TEST_READY.md`).
3. **Level 3: Task Workers (Spawned fresh for each specific execution step)**
   - `Explorer`: Investigates current codebase, files, and design strategies.
   - `Worker`: Implements TypeScript code and HTML/CSS changes, runs builds and tests.
   - `Reviewer`: Inspects code quality, correctness, and interface conformance.
   - `Challenger`: Tests edge cases and validates capabilities.
   - `Forensic Auditor`: Audits implementation authenticity to enforce zero cheating.

---

## Milestones and Status

| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Global Setup & Plan Verification | Establish project-wide plan, verify existing codebase builds/tests via Explorer. | None | IN_PROGRESS |
| 2 | E2E Test Suite Creation | Design test infrastructure and implement E2E Jest test cases (Tiers 1-4). Publish `TEST_READY.md`. | 1 | PLANNED |
| 3 | Rules Synthesizer & Conflict Checker | Implement TypeScript modules for rules conflict analysis and ruleset synthesis with type safety. | 1 | PLANNED |
| 4 | GM Playtest Chat & UI Sandbox | Implement playtest chat engine, simulated GM, dice rolls, character status updates, UI tabs, styles. | 3 | PLANNED |
| 5 | Integration & Validation | Transpile code, pass 100% tests, run adversarial testing (Tier 5), perform Forensic Integrity Audit. | 2, 4 | PLANNED |

---

## Architectural Blueprint & Interface Contracts
### 1. File Structure
All new modules must reside under `src/` and be transpiled to `dist/`.
- `src/sandbox/conflict-checker.ts`: Evaluates design conflicts (dice systems, turns, etc.) between selected vectors.
- `src/sandbox/synthesizer.ts`: Integrates vector metadata/explanations into a cohesive rules sheet using local template rules generation or simulated LLM synthesis.
- `src/sandbox/playtest-gm.ts`: Runs chat state, parses actions, handles virtual dice, and manages character status updates.
- `src/types.ts`: Extend to include types for Sandbox state, GM messages, characters, and conflicts.

### 2. Sandbox Types (`src/types.ts`)
```typescript
export interface RulesConflict {
  vectorA: string;
  vectorB: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface SynthesizedRuleset {
  id: string;
  title: string;
  vectors: string[];
  rulesContent: string;
  resolvedConflicts: RulesConflict[];
  generatedAt: string;
}

export interface CharacterSheet {
  name: string;
  attributes: Record<string, number>;
  inventory: string[];
  statusEffects: string[];
  health: { current: number; max: number };
}

export interface GMPlaytestMessage {
  sender: 'gm' | 'user';
  text: string;
  timestamp: string;
  diceRoll?: { notation: string; result: number; breakdown: string };
}
```

---

## Execution Verification Criteria
- All tests (existing + new E2E tests) pass.
- search-worker search speed maintains <10ms and Venn comparison <100μs.
- Glassmorphic CSS styling is fully responsive and integrates correctly.
- Forensic Auditor verdict is clean.
