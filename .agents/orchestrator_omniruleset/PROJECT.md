# Project: OmniRuleset Engine

## Architecture
The OmniRuleset Engine is client-side, running in the browser and utilizing a multi-threaded architecture with a main UI application thread (`src/app.ts`) and a background search worker thread (`src/search-worker.ts`).

- **Conflict Analyzer (R3)**: Validates selected game rulesets and vectors, identifying mechanical conflicts (overlapping vectors, logical exclusivity clashes, resolution mismatches, dependency gaps) in the search worker to avoid blocking the main UI thread.
- **Rules Synthesizer (R1)**: Combines rule explanations from the selected vectors, resolves conflicts by applying user-defined overrides, and outputs a compiled JSON ruleset.
- **Playtest Sandbox & GM Automation (R2)**: Orchestrates turn-based playtest simulation with virtual dice rolling, player character and NPC stats management, combat turn tracker, and automatic narrative resolution based on the active rules.
- **UI Integration (R4)**: Adds an "OmniRuleset Sandbox" tab, featuring a layout with a rules composer/analyzer sidebar, a main synthesis board, and a playtest/GM log console, adhering to dark glassmorphic styling.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Interface Contracts & Types | Define type interfaces in `src/types.ts` for conflicts, rulesets, dice rolls, characters, and GM actions. | None | PLANNED |
| 2 | Conflict Analyzer (R3) | Implement conflict checking logic in search worker, returning lists of conflicts. | 1 | PLANNED |
| 3 | Rules Synthesizer (R1) | Implement ruleset synthesis logic in worker/app, allowing merging and overrides. | 2 | PLANNED |
| 4 | Playtest Sandbox & GM (R2) | Build virtual dice roller, character database, and turn-based GM playtest logic in `src/app.ts`. | 3 | PLANNED |
| 5 | UI Integration (R4) | Add "OmniRuleset Sandbox" navigation tab and layout inside `index.html` and `src/app.ts`. | 4 | PLANNED |
| 6 | E2E Testing & Verification | Run E2E tests, correct bugs, execute challenger testing, and perform Forensic Integrity Audit. | 5, TEST_READY | PLANNED |

## Interface Contracts
### App ↔ Search Worker Message Protocol (OmniRuleset extensions)
- Messages to worker (`SearchWorkerRequest`):
  - `'analyzeConflicts'`: Selected game IDs and vector IDs to check for rules overlaps.
  - `'synthesizeRuleset'`: Base game IDs, vector IDs, custom overrides, and resolution type to generate a unified ruleset.
- Messages from worker (`SearchWorkerResponse`):
  - `'conflictAnalysisResults'`: Boolean `hasErrors` and list of `ConflictDescriptor` items.
  - `'synthesizeRulesetResults'`: Compiled `SynthesizedRuleset` object.

### Playtest Sandbox API
- `DiceRoller.roll(notation: string, advantage?: 'none'|'advantage'|'disadvantage'): DiceRollResult`
- `GMAutomation.resolveAction(state: PlaytestSessionState, action: GMActionRequest): GMActionResponse`
