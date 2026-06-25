# Analysis: TypeScript Definitions for OmniRuleset Engine

This report outlines the recommended TypeScript type definitions to add to `src/types.ts` in order to support the Conflict Analyzer (R3), Rules Synthesizer (R1), and Playtest Sandbox & GM Automation (R2) features.

---

## 1. Executive Summary
To support the OmniRuleset Engine, we must expand the existing types in `src/types.ts` to include:
- **Conflict Analyzer (R3) Types**: `ConflictType`, `ConflictSeverity`, `ConflictDescriptor`, `AnalyzeConflictsRequest`, and `ConflictAnalysisResultsResponse`.
- **Rules Synthesizer (R1) Types**: `CustomOverride`, `SynthesisResolutionType`, `SynthesizedRuleset`, `SynthesizeRulesetRequest`, and `SynthesizeRulesetResultsResponse`.
- **Playtest Sandbox & GM Automation (R2) Types**: `DiceRollResult`, `CharacterSheet`, `PlaytestSessionState`, `GMActionRequest`, and `GMActionResponse`.
- **Worker Unions Update**: Update the `SearchWorkerRequest` and `SearchWorkerResponse` union types to include the new request and response structures.

---

## 2. Recommended Precise TypeScript Definitions

Below are the recommended TypeScript code structures to append to `src/types.ts`.

### A. Updating the Worker Protocol Unions
Add the new requests and responses to the discriminated unions:

```typescript
// Modify SearchWorkerRequest in Section 3
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

// Modify SearchWorkerResponse in Section 4
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
```

### B. New Types (OmniRuleset Engine Section)
Append this section to `src/types.ts`:

```typescript
// ============================================================================
// 6. OmniRuleset Engine Models & Message Protocols
// ============================================================================

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
  gmLog: string[];
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

## 3. Rationale and Logic Chain

### R3: Conflict Analyzer Integration
- **Need**: Identify rules overlaps and discrepancies.
- **Design**: The worker gets a request with a set of game and vector IDs (`AnalyzeConflictsRequest`) and compares their vector descriptions. The response (`ConflictAnalysisResultsResponse`) contains `hasErrors` and lists of `ConflictDescriptor` items specifying the clashed files/games, vectors, and types (`ConflictType`) so the UI can draw red warning highlights.

### R1: Rules Synthesizer Integration
- **Need**: Compile multiple selected game rulesets into a single ruleset using automated and manual strategies.
- **Design**: `SynthesizeRulesetRequest` allows setting the game sources, vector targets, `CustomOverride` entries (manual fixes), and a conflict resolution strategy (`SynthesisResolutionType`). The result `SynthesizedRuleset` stores the compiled final code text mapped per vector, allowing the sandbox or character sheets to pull the active rule for combat/skills/etc.

### R2: Playtest Sandbox & GM Automation Integration
- **Need**: Run turn-based combat, execute dice rolls with advantage/disadvantage, and automate GM rules lookups.
- **Design**:
  - `DiceRollResult` captures dice roll parameters, outcomes, and raw arrays to properly report advantage.
  - `CharacterSheet` tracks game-specific attributes/skills/hitpoints so actions can access character-specific modifiers.
  - `PlaytestSessionState` ties the synthesized ruleset, character sheets, round index, and logs together.
  - `GMActionRequest` and `GMActionResponse` provide a structured contract for the UI or virtual sandbox to call `GMAutomation.resolveAction` (e.g. invoking an attack check against a character's Dexterity under the active ruleset), returning both text narrative and state updates.
