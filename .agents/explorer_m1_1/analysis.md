# Analysis Report: TypeScript Type Definitions for OmniRuleset Engine

## 1. Executive Summary
This analysis details the precise TypeScript type definitions required in `src/types.ts` to support the OmniRuleset Engine extension (Milestone 1). The target modules are the Rules Synthesizer (R1), Playtest Sandbox & GM Automation (R2), and Conflict Analyzer (R3). By implementing these contract interfaces, we establish a type-safe protocol for the worker and application threads to communicate ruleset metadata, synthesis parameters, dice roller outcomes, sandbox states, and GM actions.

The full proposed version of `src/types.ts` has been saved in the explorer's working directory as `C:\dev\research-ttrpg-rules\.agents\explorer_m1_1\proposed_types.ts` for easy replacement.

---

## 2. Investigation and Design Decisions

### 2.1 Conflict Analyzer (R3) Model & Communication Protocol
- **Requirements**: Supports checking overlaps, exclusivity clashes, and resolution mismatches across selected games and vectors.
- **Design Decisions**:
  - We define a union type `ConflictType` capturing `exclusivity`, `resolution`, `overlap`, and `mismatch`.
  - We define a `ConflictDescriptor` representing the conflict severity, affected vector path, list of conflicting games, and a detailed description.
  - We integrate `analyzeConflicts` requests into the worker request union `SearchWorkerRequest`, allowing the main thread to offload heavy calculations.
  - We specify a corresponding `ConflictAnalysisResultsResponse` to return the conflicts lists back to the main thread.

### 2.2 Rules Synthesizer (R1) Model & Communication Protocol
- **Requirements**: Supports custom overrides on a per-vector basis and compiling a unified ruleset from base games.
- **Design Decisions**:
  - We define `CustomRuleOverride` capturing the vector path and custom text.
  - We define `SynthesizedRule` tracking the text, source (specific game_id, custom override, or merged), contributors list, and override flag.
  - We define `SynthesizedRuleset` containing the rules dictionary (mapped by vector), base game IDs, a synthesis timestamp, and any warnings.
  - We add `SynthesizeRulesetRequest` and `SynthesizeRulesetResultsResponse` to support worker-based ruleset compile jobs.

### 2.3 Playtest Sandbox & GM Automation (R2) Models
- **Requirements**: Virtual dice roller, character sheet database, sandbox session state, and automated GM actions.
- **Design Decisions**:
  - `DiceRollResult`: Encapsulates notation, individual rolls, flat modifiers, final totals, advantage states, and raw/discarded rolls for auditability.
  - `CharacterSheet`: A general schema representing name, stats, skills, HP (current/max), equipment list, archetype, and notes, accommodating most TTRPG systems.
  - `PlaytestSessionState`: Keeps track of the session ID, governing `SynthesizedRuleset`, characters list, active character turn tracker, narration logs, and dynamic metadata.
  - `GMActionRequest`: Captures action classification (combat, skill check, narrative, etc.), target vector, dice roller specifications, and arbitrary parameters.
  - `GMActionResponse`: Returns success status, dice roll outcomes, GM narrative text, updated session state, immediate consequences, and warnings.

---

## 3. Recommended TypeScript Definitions

Below are the exact TypeScript interfaces and modifications proposed:

### 3.1 Worker Requests Extension (`src/types.ts` Section 3)
```typescript
/**
 * Discriminated union of all messages/requests sent from the main application thread to the Web Worker.
 */
export type SearchWorkerRequest =
  | InitRequest
  | SearchRequest
  | AutocompleteRequest
  | CompareRequest
  | DictionaryRequest
  | AddGameRequest
  | AddVectorRequest
  | AnalyzeConflictsRequest      // Added for R3
  | SynthesizeRulesetRequest;     // Added for R1

/**
 * Request to check rules overlaps and conflicts between games.
 */
export interface AnalyzeConflictsRequest {
  type: 'analyzeConflicts';
  action?: 'analyzeConflicts';
  gameIds: string[];
  vectorIds: string[];
  payload?: {
    gameIds?: string[];
    vectorIds?: string[];
  };
}

/**
 * Request to synthesize multiple rulesets into a single compiled ruleset.
 */
export interface SynthesizeRulesetRequest {
  type: 'synthesizeRuleset';
  action?: 'synthesizeRuleset';
  baseGameIds: string[];
  vectorIds: string[];
  overrides: CustomRuleOverride[];
  resolutionStrategy?: 'manual' | 'prefer-a' | 'prefer-b' | 'merge-all' | string;
  payload?: {
    baseGameIds?: string[];
    vectorIds?: string[];
    overrides?: CustomRuleOverride[];
    resolutionStrategy?: string;
  };
}

export type AnalyzeConflictsMessage = AnalyzeConflictsRequest;
export type SynthesizeRulesetMessage = SynthesizeRulesetRequest;
```

### 3.2 Worker Responses Extension (`src/types.ts` Section 4)
```typescript
/**
 * Discriminated union of all messages/responses sent by the Web Worker back to the main thread.
 */
export type SearchWorkerResponse =
  | ReadyResponse
  | SearchResultsResponse
  | AutocompleteResultsResponse
  | CompareResultsResponse
  | DictionaryResultsResponse
  | AddGameDoneResponse
  | ErrorResponse
  | ConflictAnalysisResultsResponse    // Added for R3
  | SynthesizeRulesetResultsResponse;   // Added for R1

/**
 * Response carrying the results of rules conflict analysis.
 */
export interface ConflictAnalysisResultsResponse {
  type: 'conflictAnalysisResults';
  action?: 'analyzeConflicts';
  hasErrors: boolean;
  conflicts: ConflictDescriptor[];
  latencyMs?: number;
}

/**
 * Response carrying the synthesized ruleset.
 */
export interface SynthesizeRulesetResultsResponse {
  type: 'synthesizeRulesetResults';
  action?: 'synthesizeRuleset';
  ruleset: SynthesizedRuleset;
  latencyMs?: number;
}

export type ConflictAnalysisResults = ConflictAnalysisResultsResponse;
export type SynthesizeRulesetResults = SynthesizeRulesetResultsResponse;
```

### 3.3 Conflict & Synthesis Models (`src/types.ts` Section 6)
```typescript
// ============================================================================
// 6. Conflict & Synthesis Models (R1 & R3)
// ============================================================================

/**
 * Types of conflicts identified by the Conflict Analyzer.
 */
export type ConflictType = 'exclusivity' | 'resolution' | 'overlap' | 'mismatch';

/**
 * Descriptor containing detailed metadata about a rules conflict.
 */
export interface ConflictDescriptor {
  /** The classification of the conflict (exclusivity clash, resolution mismatch, general overlap, etc.). */
  type: ConflictType;

  /** The hierarchical vector path where the conflict was detected (e.g., "combat.melee.dice_rolls"). */
  vector: string;

  /** The list of game IDs that are involved in this conflict. */
  gameIds: string[];

  /** A descriptive message explaining the nature of the conflict. */
  description: string;

  /** Severity: 'error' indicates blocker conflict, 'warning' indicates potential friction. */
  severity: 'error' | 'warning';
}

/**
 * Model for defining user custom overrides on a vector basis during ruleset synthesis.
 */
export interface CustomRuleOverride {
  /** The vector identifier to override (e.g. "combat.melee.tactical"). */
  vector: string;

  /** The user-specified rule text override. */
  text: string;
}

/**
 * Model representing a single synthesized rule in a compiled ruleset.
 */
export interface SynthesizedRule {
  /** The vector governed by this rule. */
  vector: string;

  /** The final synthesized rule text. */
  text: string;

  /** The source of the rule (game_id, 'custom_override', or 'merged'). */
  source: string;

  /** Contributors (game_ids) that supplied rule text for this vector. */
  contributors?: string[];

  /** True if this rule was generated via user custom override. */
  isOverridden: boolean;
}

/**
 * Model representing a fully compiled ruleset generated from multiple base games.
 */
export interface SynthesizedRuleset {
  /** Dictionary of vector path to synthesized rule details. */
  rules: Record<string, SynthesizedRule>;

  /** The list of game IDs that served as bases for this synthesis. */
  baseGameIds: string[];

  /** ISO 8601 timestamp string representing when the ruleset was synthesized. */
  synthesizedAt: string;

  /** Warnings generated during synthesis (e.g. conflicts resolved automatically). */
  warnings: string[];
}
```

### 3.4 Playtest Sandbox & GM Automation Models (`src/types.ts` Section 7)
```typescript
// ============================================================================
// 7. Playtest Sandbox & GM Automation Models (R2)
// ============================================================================

/**
 * Structured result of a virtual dice roll.
 */
export interface DiceRollResult {
  /** The standard dice notation rolled (e.g., "2d6+3", "d20"). */
  notation: string;

  /** Individual dice results (e.g., [4, 5] for 2d6). */
  rolls: number[];

  /** The flat numeric modifier added to the rolls. */
  modifier: number;

  /** The final combined numeric total after applying modifiers and advantage. */
  total: number;

  /** The advantage state applied to the roll. */
  advantage: 'none' | 'advantage' | 'disadvantage';

  /** Optional raw rolls before applying advantage/disadvantage filters. */
  rawRolls?: number[];

  /** Optional rolls that were discarded during advantage/disadvantage calculation. */
  discardedRolls?: number[];
}

/**
 * Model for character sheets in the virtual playtest sandbox.
 */
export interface CharacterSheet {
  /** Unique identifier for the character. */
  id: string;

  /** Display name of the character. */
  name: string;

  /** Optional playbook or archetype classification. */
  archetype?: string;

  /** Level of progression. */
  level: number;

  /** Key attributes or statistics (e.g., { strength: 12, dexterity: 15, reflex: 14 }). */
  stats: Record<string, number>;

  /** Key skill bonuses (e.g., { stealth: 3, melee: 5 }). */
  skills: Record<string, number>;

  /** Current and maximum hit points. */
  hitPoints: {
    current: number;
    max: number;
  };

  /** Items or gear in the character's possession. */
  equipment: string[];

  /** Narrative notes or other system-specific attributes. */
  notes?: string;
}

/**
 * Current persistent state of an active playtest sandbox session.
 */
export interface PlaytestSessionState {
  /** Unique session identifier. */
  sessionId: string;

  /** The synthesized ruleset currently governing the session. */
  ruleset: SynthesizedRuleset;

  /** The characters currently in the session. */
  characters: CharacterSheet[];

  /** The character currently taking their turn, if applicable. */
  activeCharacterId?: string;

  /** Current turn counter. */
  turn: number;

  /** Log of historical actions, rolls, and GM narration. */
  log: string[];

  /** Arbitrary key-value store for session-specific state variables. */
  metadata?: Record<string, any>;
}

/**
 * Request details submitted to the GM Automation engine to resolve a sandbox action.
 */
export interface GMActionRequest {
  /** The ID of the character attempting the action. */
  characterId: string;

  /** Classification of the action. */
  actionType: 'check' | 'combat' | 'narrative' | 'custom';

  /** The governed rule vector that dictates how this action is resolved. */
  vector: string;

  /** Description of what the character is trying to perform. */
  description: string;

  /** Optional parameters for executing a virtual dice roll. */
  diceRoll?: {
    notation: string;
    advantage?: 'none' | 'advantage' | 'disadvantage';
  };

  /** Arbitrary action-specific options (e.g., target difficulty, combat modifiers). */
  parameters?: Record<string, any>;
}

/**
 * Response returned by the GM Automation engine after action resolution.
 */
export interface GMActionResponse {
  /** Whether the action was successful according to the ruleset and dice roll. */
  success: boolean;

  /** The result of any dice roll performed during the action resolution. */
  diceRollResult?: DiceRollResult;

  /** Narration text generated by the GM explaining the action result. */
  narration: string;

  /** The updated playtest session state after the consequences are applied. */
  updatedState: PlaytestSessionState;

  /** List of immediate mechanical consequences applied (e.g. status changes, damage). */
  consequences?: string[];

  /** Non-blocking warnings encountered during automation (e.g. missing rules, fallback logic). */
  warnings?: string[];
}
```

---

## 4. Verification and Implementation Guide
To apply these types:
1. Replace `src/types.ts` with the contents of `C:\dev\research-ttrpg-rules\.agents\explorer_m1_1\proposed_types.ts`.
2. Run `npm run build` to verify compiling (TypeScript compilation uses these interfaces inside `src/app.ts` and `src/search-worker.ts`).
3. Run `npx jest tests/typings_coverage.test.ts` to assert that all new requests and responses are fully mapped and assignment checks pass.
