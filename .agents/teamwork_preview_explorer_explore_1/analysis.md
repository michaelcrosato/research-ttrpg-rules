# OmniRuleset Sandbox Subsystems Exploration & Architecture Design

This report outlines the exploration findings and structural recommendations for extending the TTRPG Rules Explorer with an **OmniRuleset Sandbox**. The sandbox will allow users to synthesize custom tabletop and board game rulesets (**R1**), evaluate structural rules conflicts (**R3**), and conduct automated playtests with virtual dice rolling and GM automation (**R2**).

---

## 1. Codebase Structure Analysis

The current codebase is a high-performance client-side application utilizing a decoupled application thread and Web Worker architecture:

### 1.1 Core Components & Entry Points
*   **`index.html`**: Defines the single-page application structure. The layout is built with semantic HTML containers, grid areas, modal drawer overlays, and a navigation bar (`.tab-container` with `.tab-btn` and `.tab-underline`). It loads `dist/app.js`.
*   **`styles.css`**: Governs dark glassmorphic styling, glow animations, card lists, layouts, and custom scrollbars. It relies heavily on CSS variables (e.g. `--bg-surface-glass`, `--border-glass`, `--shadow-glass`).
*   **`src/types.ts`**: Declares the system's TypeScript interfaces, including database shapes (`GameRuleset`, `RegistryData`), user search states (`SearchFilters`), worker telemetry (`WorkerStats`), and message payloads to/from the search worker (`SearchWorkerRequest`/`SearchWorkerResponse`).
*   **`src/app.ts`**: Coordinates the UI lifecycle, handles browser events, manages debounce operations for inputs, and facilitates communication with the background search worker. It features progressive render functions (`progressiveRender` and `progressiveRenderDict`) to chunk DOM operations into 3ms frame batches, maintaining a steady 60 FPS.
*   **`src/search-worker.ts`**: Loaded as a dedicated Web Worker (with `LocalSearchWorker` as a JSDOM/Jest fallback). It imports `FlexSearch` via CDN, indexes game content on initialization, runs searches, calculates O(1) dictionary lookups via an inverted index, and runs $O(1)$ set intersection checks for Venn diagrams.

### 1.2 Database Registry Vectors Structure
The database `registry.json` normalizes ruleset configurations in two arrays: `ttrpg` and `board_game`.
Individual games are structured as:
```json
{
  "game_id": "coriolis_empyrean_canticle_2e_edition_2026",
  "title": "Coriolis: Empyrean Canticle 2e Edition",
  "year": 2026,
  "medium": "ttrpg",
  "primary_genre": "Adventure",
  "subgenres": ["Action", "Narrative"],
  "governed_vectors": [
    "character.character_creation.playbook_based",
    "combat.initiative.dexterity_based"
  ],
  "vector_explanations": {
    "character.character_creation.playbook_based": "Features a playbook or template system...",
    "combat.initiative.dexterity_based": "Initiative order is checked at combat start..."
  }
}
```
*   **Taxonomy Notation**: Governed mechanics are mapped to namespaced strings using `domain.subsystem.focus` notation (e.g. `combat.melee.tactical`).
*   **Domains**: Core subsystems grouped by prefix namespace (e.g., `combat`, `character`, `stealth`, `logistics`, `economy`, `politics`, `simulation`).

---

## 2. Recommended Subsystem Design (OmniRuleset Engine)

To integrate rules synthesis (**R1**), conflict analysis (**R3**), and the playtest sandbox (**R2**), we propose introducing three subsystems grouped inside an **OmniRuleset Engine**:

```
+-----------------------------------------------------------------------------------+
|                              OMNIRULESET ENGINE                                   |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +---------------------------+   Vector Selections  +--------------------------+  |
|  |   Conflict Analyzer       | -------------------> |    Rules Synthesizer     |  |
|  |                           |                      |                          |  |
|  | - Direct collision detection                     | - Combines vector rule   |  |
|  | - Exclusivity checks      | <------------------- |   explanations           |  |
|  | - Resolution mismatches   |   Conflict Warnings  | - Overrides/custom rules |  |
|  +---------------------------+                      +--------------------------+  |
|                                                                   |               |
|                                                                   | Synthesized   |
|                                                                   v Ruleset       |
|                                                     +--------------------------+  |
|                                                     |     Playtest Sandbox     |  |
|                                                     |                          |  |
|                                                     | - Virtual Dice Roller    |  |
|                                                     | - GM Automation Loop     |  |
|                                                     | - Turn & State Machine   |  |
|                                                     +--------------------------+  |
+-----------------------------------------------------------------------------------+
```

### 2.1 Subsystem 1: Conflict Analyzer (R3)
The Conflict Analyzer evaluates user-selected vector configurations and source rulesets before synthesis occurs. It prevents inconsistent mechanics from being compiled into the sandbox.
*   **Direct Collision (Overlapping Vectors)**: If multiple source games are selected and both define explanations for the same namespace (e.g., both defining `combat.initiative.dexterity_based`), the analyzer flags a direct collision. The user must decide which source game's explanation to keep, or write a custom synthesized override.
*   **Logical Exclusivity Clashes**: Certain vector combinations are mutually exclusive by design (e.g., character creation cannot be simultaneously strictly class-based `character.character_creation.class_based` and playbook-based `character.character_creation.playbook_based`). The analyzer relies on a pre-defined incompatibility dictionary to flag these errors.
*   **Resolution Mismatches**: Combining a ruleset resolving actions via d20 pool (e.g., D&D/Pathfinder) and another resolving actions via d6 dice pools (e.g., Shadowrun/FATE) will raise a warning. The user must declare a primary resolution mechanic.
*   **Dependency Gaps**: Selecting a ruleset that relies on a specific dependency (e.g., `simulation.magic.spell_slots`) without selecting resource recovery vectors (e.g., `logistics.survival.rations` or long rests) flags a warning.

### 2.2 Subsystem 2: Rules Synthesizer (R1)
The Rules Synthesizer merges rules from selected parent rulesets into a single unified JSON schema representing the "OmniRuleset":
*   **Composition**: Extracts selected vectors and rules explanations from target source games.
*   **Overriding**: Integrates user custom overrides to resolve conflicts identified by the analyzer.
*   **Export/Save**: Serializes the custom ruleset, generating an attestation signature that can be downloaded as a JSON file or loaded directly into the playtest sandbox.

### 2.3 Subsystem 3: Playtest Sandbox & GM Automation (R2)
The Playtest Sandbox runs a turn-based state machine containing simulated players, enemies, and an environment:
*   **Virtual Dice Roller**: Evaluates standard dice expressions (`1d20 + 5`, `3d6`, `1d100`, `2d8 + 4`) and handles TTRPG mechanics such as Advantage/Disadvantage. Returns detailed object breakdowns containing rolled dice arrays, modifiers, and totals.
*   **GM Automation Engine**: Automatically evaluates game actions (e.g., "Attack Goblin") based on active rules. It reads the synthesized ruleset vectors, rolls virtual dice, checks results against target stats (e.g. Armor Class, Difficulty Class), deducts health, and logs changes to the environment and characters.
*   **State Machine Transitions**:
    *   `SETUP`: Characters and NPCs are loaded; health, stats, and equipment are initialized.
    *   `ROLL_INITIATIVE`: The engine requests initiative rolls based on the ruleset's initiative vector, sorts participants, and opens the combat tracker.
    *   `COMBAT_TURN`: Sequentially activates characters. Automation evaluates actions, prompts the player/GM for inputs, and transitions to the next turn on `END_TURN`.
    *   `END_COMBAT`: Cleans up active states, removes temporal combat modifiers, and logs session results.

---

## 3. Recommended Interface Contracts

To enforce type safety across the application thread and worker thread, we propose adding these interface contracts to `src/types.ts`:

### 3.1 Conflict Analyzer Interfaces (R3)
```typescript
export interface ConflictDescriptor {
  id: string;
  severity: 'warning' | 'error';
  type: 'collision' | 'exclusivity' | 'dependency_gap' | 'resolution_mismatch';
  vector: string;
  description: string;
  source_rulesets: string[]; // Game IDs of the colliding rulesets
  proposed_resolutions: string[];
}

export interface ConflictAnalysisResult {
  hasErrors: boolean;
  conflicts: ConflictDescriptor[];
}
```

### 3.2 Rules Synthesizer Interfaces (R1)
```typescript
export interface SynthesizedRuleset {
  ruleset_id: string;
  title: string;
  base_game_ids: string[];
  governed_vectors: string[];
  vector_explanations: Record<string, string>; // Vector -> Final rule explanation text
  custom_overrides: Record<string, string>; // Vector -> User custom text
  resolution_type: 'd20' | 'd6_pool' | 'dice_less' | 'custom';
  created_at: number;
}
```

### 3.3 Playtest Sandbox & Dice Roller Interfaces (R2)
```typescript
export interface DiceRollResult {
  notation: string;
  rolls: number[];
  modifier: number;
  total: number;
  advantage_applied: 'none' | 'advantage' | 'disadvantage';
}

export interface PlaytestCharacter {
  id: string;
  name: string;
  type: 'pc' | 'npc';
  stats: {
    max_hp: number;
    current_hp: number;
    armor_class: number;
    initiative_mod: number;
  };
  resources: Record<string, number>; // e.g., spell_slots: 3
  conditions: string[]; // e.g., ["blinded", "stunned"]
}

export interface PlaytestSessionState {
  session_id: string;
  ruleset: SynthesizedRuleset;
  state: 'setup' | 'initiative' | 'combat' | 'ended';
  characters: PlaytestCharacter[];
  combat_tracker: {
    round: number;
    active_index: number;
    initiative_order: string[]; // Character IDs
  };
  narrative_log: string[];
}

export interface GMActionRequest {
  character_id: string;
  target_id: string;
  action_type: 'melee_attack' | 'cast_spell' | 'use_skill';
  vector: string; // The governing ruleset vector
}

export interface GMActionResponse {
  success: boolean;
  action_description: string;
  dice_roll?: DiceRollResult;
  damage_dealt?: number;
  state_changes: Partial<PlaytestSessionState>;
}
```

---

## 4. UI/UX & Glassmorphic Styling Conventions

The new sandbox tab must look integrated with the existing styling conventions in `styles.css`.

### 4.1 UI Layout Structure
The "OmniRuleset Sandbox" view panel (`#omniruleset-view`) should feature a three-column dashboard:
1.  **Sidebar (Left)**: Ruleset Composer. Allows choosing source games and selecting vector check items. Includes an "Analyze Conflicts" button.
2.  **Main Panel (Center)**: Synthesis Board & Conflict Panel.
    *   Displays active conflicts inside glass cards. Errors have a soft crimson glow (`box-shadow: 0 0 15px rgba(239, 68, 68, 0.25); border-color: rgba(239, 68, 68, 0.45);`).
    *   Lists selected vectors and enables typing custom rules text for overrides.
    *   Includes a "Generate OmniRuleset" compile button.
3.  **Sandbox Panel (Right)**: GM Interactive Board (activated once a ruleset compiles).
    *   Displays virtual characters list and initiative sequence.
    *   Includes a Virtual Dice Roller widget.
    *   Contains the Automated GM Log console showing simulated resolution feeds.

### 4.2 Styling Implementations (Glassmorphic)
To follow styling guidelines, cards and containers must extend the translucent borders and blur filters of `styles.css`:
```css
.sandbox-card {
  background: var(--bg-surface-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-glass);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sandbox-card:hover {
  border-color: var(--border-glass-hover);
  background: var(--bg-surface-glass-hover);
}

/* Neon glow for active state */
.sandbox-active {
  box-shadow: 0 0 25px rgba(192, 132, 252, 0.15); /* Soft purple */
  border-color: rgba(192, 132, 252, 0.45);
}
```

---

## 5. Specific Files to Be Modified

To build this feature, the following changes are required:

1.  **`index.html`**:
    *   Add a tab button inside `.tab-container` for the "OmniRuleset Sandbox".
    *   Add a corresponding section `#omniruleset-view` with markup for the three panels (Composer, Conflict/Synthesis, Playtest Sandbox).
2.  **`src/types.ts`**:
    *   Append all new interfaces listed in Section 3 (`ConflictDescriptor`, `SynthesizedRuleset`, `DiceRollResult`, `PlaytestCharacter`, `PlaytestSessionState`, `GMActionResponse`, etc.).
    *   Add new worker request actions: `'analyzeConflicts'`, `'synthesizeRuleset'`, and `'runPlaytestRound'`.
3.  **`src/search-worker.ts`**:
    *   Incorporate conflict detection loops. The worker will handle the heavy lifting of conflict checks, mapping vector trees, and detecting overlaps to keep the main UI thread lag-free.
    *   Expose actions to compute set operations on rules rulesets.
4.  **`src/app.ts`**:
    *   Update `setupTabs()` to initialize the sandbox panels and handle sub-views.
    *   Wire UI event listeners to bind character inputs, target selections, and custom text inputs.
    *   Inject the virtual dice parser and the playtest state machine into the application logic.
    *   Create progressive rendering pipelines to output playtest events and logs.

---

## 6. Specific Test Targets and Strategies

To ensure the new subsystems are stable and performant, we recommend writing automated Jest tests targeting both the worker and main thread logic:

### 6.1 Unit Tests (search-worker.ts - Conflict Analysis)
*   **Target**: Direct Collision Detection. Verify that selecting *D&D 5e* and *Pathfinder 2e* for `combat.melee.tactical` returns a conflict error containing both game IDs.
*   **Target**: Exclusivity Logic. Verify that selecting both `class_based` and `playbook_based` vectors throws a mutual exclusion warning.
*   **Target**: Performance. Benchmark checking 10 games with 50 vectors; analysis must resolve in under 10ms.

### 6.2 Unit Tests (app.ts - Dice Roller Engine)
*   **Target**: Notation Parser. Assert that expressions like `1d20+5`, `2d8-2`, and `3d6` are correctly parsed into objects containing list rolls, modifiers, and correct total calculations.
*   **Target**: Advantage Evaluator. Ensure that advantage rolls select the maximum value and disadvantage rolls select the minimum value from two rolls.

### 6.3 E2E Integration Tests (Playtest State Transitions)
*   **Target**: Turn Sequencer. Mock a combat setup with 1 PC and 1 NPC. Assert that rolling initiative correctly sequences the entities, and triggers combat state transitions (`setup` -> `initiative` -> `combat`).
*   **Target**: GM Automation. Verify that a melee attack triggers dice rolling, resolves against the target's AC, deducts health from target character state, and appends a structured log entry.
