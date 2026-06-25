# Analysis: TypeScript Definitions for OmniRuleset Engine

This report details the recommended TypeScript types to support the Conflict Analyzer (R3), Rules Synthesizer (R1), and Playtest Sandbox & GM Automation (R2) features of the OmniRuleset Engine.

---

## 1. Executive Summary
To support the OmniRuleset Engine, we must expand `src/types.ts` to include:
1. **Conflict Analyzer (R3)**: Discriminated request/response message types (`AnalyzeConflictsRequest`, `ConflictAnalysisResultsResponse`) and domain models (`ConflictDescriptor`, `ConflictType`, `ConflictSeverity`) to identify rules overlaps.
2. **Rules Synthesizer (R1)**: Discriminated request/response message types (`SynthesizeRulesetRequest`, `SynthesizeRulesetResultsResponse`) and models (`SynthesizedRuleset`, `CustomOverride`, `SynthesisResolutionType`) to support merging and custom overrides.
3. **Playtest Sandbox & GM Automation (R2)**: Models for interactive sandbox play (`DiceRollResult`, `CharacterSheet`, `PlaytestSessionState`, `GMActionRequest`, `GMActionResponse`, `GMJournalEntry`) to drive rules validation and GM logging.

---

## 2. Codebase Context and Integration Strategy

We reviewed the current `src/types.ts` structure and the App-Worker messaging architecture.
- **CamelCase for Message Protocols**: The existing Web Worker request/response types (e.g., `SearchFilters`, `WorkerStats`, `AutocompleteRequest`, `SearchResultsResponse`) use camelCase for properties. The recommended OmniRuleset types follow this style to maintain consistency.
- **Discriminated Unions**: Web Worker requests/responses in `src/types.ts` are grouped under the `SearchWorkerRequest` and `SearchWorkerResponse` unions (lines 208 and 308 respectively). The new requests and responses must be integrated into these unions.
- **Zero Dependencies**: The types leverage native TypeScript data structures, record maps (`Record<string, ...>`), and primitives, ensuring zero new third-party dependencies are introduced.

---

## 3. Recommended Precise TypeScript Definitions

Below are the exact code modifications recommended for `src/types.ts`.

### A. Updating the Web Worker Message Unions

#### 1. In Section 3: Web Worker Request/Message Protocol (To Worker)
Add `AnalyzeConflictsRequest` and `SynthesizeRulesetRequest` to `SearchWorkerRequest` (around lines 208-215). Also define their type aliases.

```typescript
// Replace lines 208-215:
export type SearchWorkerRequest =
  | InitRequest
  | SearchRequest
  | AutocompleteRequest
  | CompareRequest
  | DictionaryRequest
  | AddGameRequest
  | AddVectorRequest;
```

**Proposed Replacement:**
```typescript
export type SearchWorkerRequest =
  | InitRequest
  | SearchRequest
  | AutocompleteRequest
  | CompareRequest
  | DictionaryRequest
  | AddGameRequest
  | AddVectorRequest
  | AnalyzeConflictsRequest
  | SynthesizeRulesetRequest;

// Aliases for convenience
export type AnalyzeConflictsMessage = AnalyzeConflictsRequest;
export type SynthesizeRulesetMessage = SynthesizeRulesetRequest;
```

#### 2. In Section 4: Web Worker Response Protocol (From Worker)
Add `ConflictAnalysisResultsResponse` and `SynthesizeRulesetResultsResponse` to `SearchWorkerResponse` (around lines 308-315). Also define their type aliases.

```typescript
// Replace lines 308-315:
export type SearchWorkerResponse =
  | ReadyResponse
  | SearchResultsResponse
  | AutocompleteResultsResponse
  | CompareResultsResponse
  | DictionaryResultsResponse
  | AddGameDoneResponse
  | ErrorResponse;
```

**Proposed Replacement:**
```typescript
export type SearchWorkerResponse =
  | ReadyResponse
  | SearchResultsResponse
  | AutocompleteResultsResponse
  | CompareResultsResponse
  | DictionaryResultsResponse
  | AddGameDoneResponse
  | ErrorResponse
  | ConflictAnalysisResultsResponse
  | SynthesizeRulesetResultsResponse;

// Aliases for convenience
export type ConflictAnalysisResults = ConflictAnalysisResultsResponse;
export type SynthesizeRulesetResults = SynthesizeRulesetResultsResponse;
```

---

### B. Section 6: OmniRuleset Engine Types
Append the following type definitions to the end of `src/types.ts` (directly after Section 5):

```typescript
// ============================================================================
// 6. OmniRuleset Engine Models & Message Protocols
// ============================================================================

// ----------------------------------------------------------------------------
// 6.1 Conflict Analyzer (R3) Models & Messages
// ----------------------------------------------------------------------------

/**
 * Types of conflicts that can occur between game rulesets.
 */
export type ConflictType =
  | 'exclusivity_clash'       // Multiple games claim exclusive rule definitions for a vector
  | 'resolution_mismatch'     // Different rulesets resolve a mechanic in fundamentally incompatible ways
  | 'overlapping_mechanic'    // Redundant or overlapping mechanics that require resolution
  | 'structural_mismatch';    // The vector hierarchy itself is incompatible between rulesets

/**
 * Severity of a rules conflict.
 */
export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Detailed description of a conflict found during rules analysis.
 */
export interface ConflictDescriptor {
  /** Unique identifier for the conflict. */
  id: string;
  /** The type of conflict. */
  type: ConflictType;
  /** The specific governed vector where the conflict resides. */
  vector: string;
  /** Severity level indicating the impact on playability. */
  severity: ConflictSeverity;
  /** Human-readable explanation of why the rules conflict. */
  description: string;
  /** IDs of the games involved in this conflict. */
  affectedGames: string[];
  /** Verbatim rule explanations from the conflicting games for context. */
  conflictingRules: Record<string, string>;
  /** Suggested path or option for resolving the conflict. */
  suggestedResolution?: string;
}

/**
 * Request sent to worker to analyze rules conflicts.
 */
export interface AnalyzeConflictsRequest {
  type: 'analyzeConflicts';
  action?: 'analyzeConflicts';
  /** List of game IDs to analyze for overlaps/conflicts. */
  gameIds: string[];
  /** Optional subset of vectors to limit analysis to. If omitted, checks all governed vectors. */
  vectorIds?: string[];
  payload?: {
    gameIds: string[];
    vectorIds?: string[];
  };
}

/**
 * Response returned by worker containing conflict analysis results.
 */
export interface ConflictAnalysisResultsResponse {
  type: 'conflictAnalysisResults';
  action?: 'analyzeConflicts';
  /** True if there is at least one critical or high conflict. */
  hasErrors: boolean;
  /** The list of conflicts identified during analysis. */
  conflicts: ConflictDescriptor[];
  /** Execution time in milliseconds. */
  latencyMs?: number;
}

// ----------------------------------------------------------------------------
// 6.2 Rules Synthesizer (R1) Models & Messages
// ----------------------------------------------------------------------------

/**
 * User-provided override for a specific vector during ruleset synthesis.
 */
export interface CustomOverride {
  /** The vector ID being overridden. */
  vector: string;
  /** The custom rules text to use instead of base rules. */
  overrideText: string;
  /** Optional ID of a source game this override is based on. */
  sourceGameId?: string;
}

/**
 * Method or strategy used to resolve rule conflicts during synthesis.
 */
export type SynthesisResolutionType =
  | 'prefer_first' // Prefer rules from the first listed game in case of conflict
  | 'prefer_last'  // Prefer rules from the last listed game in case of conflict
  | 'merge_all'    // Combine rules text with delimiters
  | 'manual';      // Depend purely on custom overrides for conflicts

/**
 * A compiled, synthesized ruleset combining multiple game rules.
 */
export interface SynthesizedRuleset {
  /** Unique identifier for the synthesized ruleset. */
  rulesetId: string;
  /** Display title for this synthesized ruleset. */
  title: string;
  /** Base game IDs from which rules are synthesized. */
  baseGameIds: string[];
  /** The list of vectors included in this ruleset. */
  vectorIds: string[];
  /** Map of vector IDs to their compiled final rule text. */
  compiledRules: Record<string, string>;
  /** Records which game (or override) won the resolution for each vector. */
  resolvedSources: Record<string, { source: 'override' | string; ruleText: string }>;
  /** Count of conflicts resolved during synthesis. */
  resolvedConflictsCount: number;
  /** ISO timestamp of when this ruleset was synthesized. */
  createdAt: string;
}

/**
 * Request sent to worker to synthesize a unified ruleset.
 */
export interface SynthesizeRulesetRequest {
  type: 'synthesizeRuleset';
  action?: 'synthesizeRuleset';
  /** Base games to draw rules from. */
  baseGameIds: string[];
  /** Vectors to include in the output. */
  vectorIds: string[];
  /** Overrides to apply to specific vectors. */
  customOverrides: CustomOverride[];
  /** Strategy for resolving conflicts automatically. */
  resolutionType: SynthesisResolutionType;
  payload?: {
    baseGameIds: string[];
    vectorIds: string[];
    customOverrides: CustomOverride[];
    resolutionType: SynthesisResolutionType;
  };
}

/**
 * Response returned by worker containing synthesis results.
 */
export interface SynthesizeRulesetResultsResponse {
  type: 'synthesizeRulesetResults';
  action?: 'synthesizeRuleset';
  /** The compiled synthesized ruleset. */
  ruleset: SynthesizedRuleset;
  /** Execution time in milliseconds. */
  latencyMs?: number;
}

// ----------------------------------------------------------------------------
// 6.3 Playtest Sandbox & GM Automation (R2) Models
// ----------------------------------------------------------------------------

/**
 * Dice roll configuration/notation outcome.
 */
export interface DiceRollResult {
  /** The original dice notation input (e.g. "1d20+5", "2d6"). */
  notation: string;
  /** Advantage state used during roll. */
  advantage: 'none' | 'advantage' | 'disadvantage';
  /** Individual results of the active dice rolls that count towards the total. */
  rolls: number[];
  /** The modifier applied to the rolls. */
  modifier: number;
  /** The final total result (sum of rolls + modifier). */
  total: number;
  /** All raw rolls rolled including those discarded (e.g. lower of two d20s). */
  rawRolls: number[];
  /** Displayable text showing the calculation breakdown (e.g. "[18, (12)] + 5 = 23"). */
  text: string;
}

/**
 * Character sheet containing core attributes, stats, inventory and status.
 */
export interface CharacterSheet {
  /** Unique ID of the character. */
  characterId: string;
  /** Name of the character. */
  name: string;
  /** Game ruleset template ID this character is based on. */
  gameId?: string;
  /** Key-value store of core attributes (e.g., strength, dexterity). */
  stats: Record<string, number>;
  /** Key-value store of skills (e.g., athletics, perception). */
  skills: Record<string, number>;
  /** Extra dynamic characteristics (e.g. class, race, background). */
  attributes: Record<string, any>;
  /** Current hit points / health value, if applicable. */
  currentHp?: number;
  /** Maximum hit points / health value, if applicable. */
  maxHp?: number;
  /** List of current status effects / conditions. */
  statusEffects?: string[];
  /** List of inventory items or equipment. */
  inventory?: string[];
}

/**
 * A log/journal entry recorded in the playtest session.
 */
export interface GMJournalEntry {
  /** Timestamp of the log entry. */
  timestamp: string;
  /** The type of event (e.g., "roll", "damage", "status", "narrative", "state_change"). */
  eventType: 'roll' | 'damage' | 'status' | 'narrative' | 'state_change' | string;
  /** The text narrative or log message. */
  message: string;
  /** Detailed metadata relating to the event (e.g., dice roll result, character ID). */
  metadata?: Record<string, any>;
}

/**
 * Playtest sandbox session state containing all operational context.
 */
export interface PlaytestSessionState {
  /** Unique session ID. */
  sessionId: string;
  /** The ruleset ID currently being playtested. */
  activeRulesetId?: string;
  /** The full ruleset object active in this session. */
  activeRuleset?: SynthesizedRuleset;
  /** List of characters present in the playtest session. */
  characters: CharacterSheet[];
  /** Turn order list containing characterIds. */
  turnOrder: string[];
  /** Currently active character's ID. */
  activeCharacterId?: string;
  /** Current combat or play round index. */
  currentRound: number;
  /** Console output / log of events in this session. */
  gmLog: GMJournalEntry[];
  /** Additional custom states or session flags. */
  metadata?: Record<string, any>;
}

/**
 * Request for the GM Automation agent to resolve a player or system action.
 */
export interface GMActionRequest {
  /** Unique request ID. */
  actionId: string;
  /** Type of action (e.g., skill check, combat attack, hazard, rules lookup). */
  type: 'skill_check' | 'combat_attack' | 'environmental_hazard' | 'rules_lookup' | string;
  /** The character initiating the action, if applicable. */
  characterId?: string;
  /** Target character or entity ID, if applicable. */
  targetId?: string;
  /** Arbitrary parameters for the action (e.g., difficulty class, attack modifier, vector). */
  parameters: Record<string, any>;
}

/**
 * Response containing details of the GM Automation action resolution.
 */
export interface GMActionResponse {
  /** Matches the request actionId. */
  actionId: string;
  /** Whether the action was successfully resolved by GM automation. */
  success: boolean;
  /** Text description/narrative of the action's result. */
  narrativeText: string;
  /** The dice roll result generated during resolution, if any. */
  rollResult?: DiceRollResult;
  /** Suggested updates to apply to the playtest session state. */
  stateUpdates?: Partial<PlaytestSessionState>;
  /** The specific rules/vectors referenced during resolution. */
  appliedRules: { vector: string; text: string }[];
}
```

---

## 4. Logic and Design Choices

### Conflict Analyzer (R3) Design Rationale
- **`ConflictType`**: Granular classifications of conflict types (`exclusivity_clash`, `resolution_mismatch`, `overlapping_mechanic`, `structural_mismatch`) allow the UI to tailor color codes, tooltip recommendations, or warning logs.
- **`ConflictDescriptor`**: Includes verbatim `conflictingRules` text for the affected games, enabling side-by-side comparative views directly within the analyzer dashboard.

### Rules Synthesizer (R1) Design Rationale
- **`SynthesisResolutionType`**: Automates common resolution strategies (`prefer_first`, `prefer_last`, `merge_all`), but falls back to `manual` when explicit `CustomOverride` overrides are supplied.
- **`SynthesizedRuleset`**: Serves as a single source of truth for compiled rules, recording exactly which rule won (`resolvedSources`), when it was built, and the resulting unified text map.

### Playtest Sandbox & GM Automation (R2) Design Rationale
- **`DiceRollResult`**: Specifically keeps a separate list of active `rolls` versus total discarded rolls (`rawRolls`) to correctly represent d20 advantage/disadvantage dice logs.
- **`GMJournalEntry`**: Formats the `gmLog` into structured event nodes rather than plain strings, making filtering/searching history by character or roll type feasible for the GM console.
