/**
 * src/types.ts
 * 
 * TypeScript type definitions for the Systems Indexer / Rules Explorer project.
 * This includes serialized models, in-memory structures, communication protocols for Web Workers,
 * BGG mapping entities, and global type declarations for the third-party FlexSearch library.
 */

// ============================================================================
// 1. Core Data Models
// ============================================================================

/**
 * Represents the serialized representation of a game ruleset entry in the database (registry.json).
 */
export interface GameRuleset {
  /** Unique snake_case identifier for the game, typically suffixed with the year. */
  game_id: string;

  /** Clean, displayable title of the game. */
  title: string;

  /** The publication/release year of the game. */
  year: number;

  /** The design medium category of the ruleset. */
  medium?: 'ttrpg' | 'board_game';

  /** The primary genre classification (e.g. "Fantasy", "Sci-Fi", "Adventure", "Strategy"). */
  primary_genre: string;

  /** List of subgenres or mechanic-based sub-genre classifications. */
  subgenres: string[];

  /** Array of hierarchical system vectors representing governed mechanics (e.g., "combat.melee.tactical"). */
  governed_vectors: string[];

  /** Mapping of namespaced vectors to textual explanations of how they apply to this game. */
  vector_explanations: Record<string, string>;

  /** Short summary description of the game. */
  description?: string;

  /** Introductory extract text fetched for the game. */
  extract?: string;
}

/**
 * In-memory representation used inside the search worker for performance optimizations.
 * Extends the serialized GameRuleset with pre-calculated lookups for set operations.
 */
export interface GameRulesetInternal extends GameRuleset {
  /** Pre-calculated Set of governed vectors to support O(1) lookups during Venn comparisons. */
  governed_vectors_set: Set<string>;
}

/**
 * Alternate names/aliases for in-memory game representation to maintain test suite and caller flexibility.
 */
export type WorkerGame = GameRulesetInternal;
export type InMemoryGameRuleset = GameRulesetInternal;

/**
 * Structure of the curated registry.json database.
 */
export interface RegistryData {
  /** Tabletop roleplaying game ruleset entries. */
  ttrpg: GameRuleset[];

  /** Board game ruleset entries. */
  board_game: GameRuleset[];
}

/**
 * Entry structure inside registry_names.json flat metadata lists.
 */
export interface RegistryNameEntry {
  title: string;
  year: number;
  genre: string;
  medium: 'ttrpg' | 'board_game';
}

/**
 * Flat metadata collection type for registry_names.json.
 */
export type RegistryNamesData = RegistryNameEntry[];

// ============================================================================
// 2. Helper Structures & Types
// ============================================================================

/**
 * Filtering and sorting criteria for ruleset search queries.
 */
export interface SearchFilters {
  /** Trimmed, lowercase search phrase to match title, genre, subgenres, and vectors. */
  searchTerm?: string;

  /** Target design medium filter. */
  medium?: 'all' | 'ttrpg' | 'board_game';

  /** Target genre (primary or subgenre) filter. */
  genre?: string;

  /** Minimum publication year boundary. */
  minYear?: number;

  /** Maximum publication year boundary. */
  maxYear?: number;

  /** Ordering criteria for results grid. */
  sort?: 'title-asc' | 'title-desc' | 'year-asc' | 'year-desc';
}

/**
 * Diagnostic database counters sent upon worker setup.
 */
export interface WorkerStats {
  totalGames: number;
  totalTtrpgs: number;
  totalBoardgames: number;
  uniqueVectorsCount: number;
  ttrpgCount: number;
  boardGameCount: number;
  uniqueVectors: number;
}

/**
 * Alternate alias for worker statistics to match legacy/explorer terminology.
 */
export type DatabaseStats = WorkerStats;

/**
 * Minimalist game entry reference used for autocomplete and vector listings.
 */
export interface DictionaryGameEntry {
  game_id: string;
  title: string;
  medium: 'ttrpg' | 'board_game';
  year: number;
}

/**
 * Type aliases for minimalist game entries to satisfy different explorer terminologies.
 */
export type CompactGameReference = DictionaryGameEntry;
export type DictionaryGameRef = DictionaryGameEntry;
export type DictionaryVectorMatch = DictionaryGameEntry;

/**
 * Autocomplete suggestion output format for game searches.
 */
export interface AutocompleteGameResult {
  game_id: string;
  title: string;
}

/**
 * Type alias for autocomplete game suggestion format.
 */
export type CompactGameSuggestion = AutocompleteGameResult;

/**
 * Grouped listing representing a single vector and its matching games.
 */
export interface DictionaryVectorEntry {
  vector: string;
  games: DictionaryGameEntry[];
}

/**
 * Type aliases for vector listing grouping formats.
 */
export type DomainVectorGroup = DictionaryVectorEntry;
export type DictionaryDomainResult = DictionaryVectorEntry;

/**
 * BoardGameGeek (BGG) search item returned by BGG search queries.
 */
export interface BGGSearchItem {
  id: string;
  name: string;
  year: string;
}

/**
 * Dynamic mapping configuration to match BGG mechanic names to local vector paths.
 */
export interface BggMechanicMapping {
  [bggMechanicName: string]: string;
}

/**
 * Local persistent state schema for database compilation.
 */
export interface HarvestState {
  current_year: number;
}

// ============================================================================
// 3. Web Worker Request/Message Protocol (To Worker)
// ============================================================================

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
  | AnalyzeConflictsRequest
  | SynthesizeRulesetRequest;

/**
 * Alternate name/alias for requests sent to the worker to ensure flexible referencing.
 */
export type SearchWorkerMessage = SearchWorkerRequest;

export interface InitRequest {
  type: 'init';
  action?: 'init';
  dbUrl?: string;
  payload?: {
    dbUrl?: string;
    url?: string;
  };
}

export interface SearchRequest {
  type: 'search';
  action?: 'search';
  filters?: SearchFilters;
  payload?: SearchFilters;
}

export interface AutocompleteRequest {
  type: 'autocomplete';
  action?: 'autocomplete';
  query?: string;
  autocompleteType?: 'vector' | 'game';
  payload?: {
    query?: string;
    type?: 'vector' | 'game';
  };
}

export interface CompareRequest {
  type: 'compare';
  action?: 'compare';
  gameIdA?: string;
  gameIdB?: string;
  payload?: {
    gameIdA?: string;
    gameIdB?: string;
  };
}

export interface DictionaryRequest {
  type: 'dictionary';
  action?: 'dictionary';
  domain?: string;
  vector?: string | null;
  payload?: {
    domain?: string;
    vector?: string | null;
  };
}

export interface AddGameRequest {
  type: 'addGame';
  action?: 'addGame';
  game?: GameRuleset;
  payload?: {
    game?: GameRuleset;
  };
}

export interface AddVectorRequest {
  type: 'addVector';
  action?: 'addVector';
  vector?: string;
  payload?: {
    vector?: string;
  };
}

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

/**
 * Individual request action/type aliases for compatibility.
 */
export type InitMessage = InitRequest;
export type SearchMessage = SearchRequest;
export type AutocompleteMessage = AutocompleteRequest;
export type CompareMessage = CompareRequest;
export type DictionaryMessage = DictionaryRequest;
export type AddGameMessage = AddGameRequest;
export type AddVectorMessage = AddVectorRequest;
export type AnalyzeConflictsMessage = AnalyzeConflictsRequest;
export type SynthesizeRulesetMessage = SynthesizeRulesetRequest;

// ============================================================================
// 4. Web Worker Response Protocol (From Worker)
// ============================================================================

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
  | ConflictAnalysisResultsResponse
  | SynthesizeRulesetResultsResponse;

export interface ReadyResponse {
  type: 'ready';
  action?: 'init';
  success: true;
  stats: WorkerStats;
}

export interface SearchResultsResponse {
  type: 'searchResults';
  action?: 'search';
  results: GameRulesetInternal[];
  totalCount: number;
  total: number;
  latencyMs: number;
}

export interface AutocompleteResultsResponse {
  type: 'autocompleteResults';
  action?: 'autocomplete';
  suggestions: string[];
  results: string[] | AutocompleteGameResult[];
  latencyMs: number;
}

export interface CompareResultsResponse {
  type: 'compareResults';
  action?: 'compare';
  gameA?: GameRulesetInternal;
  gameB?: GameRulesetInternal;
  shared: string[];
  onlyA: string[];
  onlyB: string[];
  latencyMs: number;
}

/**
 * Grouped dictionary response, which can be either a vector-specific lookup or a domain-specific lookup.
 */
export type DictionaryResultsResponse =
  | VectorDictionaryResultsResponse
  | DomainDictionaryResultsResponse;

export interface VectorDictionaryResultsResponse {
  type: 'dictionaryResults';
  action?: 'dictionary';
  vector: string;
  results: DictionaryGameEntry[];
  vectors: DictionaryGameEntry[];
}

export interface DomainDictionaryResultsResponse {
  type: 'dictionaryResults';
  action?: 'dictionary';
  domain: string;
  activeDomain?: string;
  results: DictionaryVectorEntry[];
  vectors: DictionaryVectorEntry[];
}

/**
 * Legacy dictionary response interfaces to support alternative names in the codebases.
 */
export type VectorDictionaryResults = VectorDictionaryResultsResponse;
export type DomainDictionaryResults = DomainDictionaryResultsResponse;

export interface AddGameDoneResponse {
  type: 'addGameDone';
  action?: 'addGame';
  success: true;
  game: GameRulesetInternal;
  updatedStats: {
    totalGames: number;
    totalTtrpgs: number;
    totalBoardgames: number;
    uniqueVectorsCount: number;
  };
  stats: {
    totalGames: number;
    uniqueVectors: number;
  };
}

export interface ErrorResponse {
  type: 'error';
  action?: string;
  error: string;
}

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

/**
 * Legacy/alternate aliases for worker response types.
 */
export type ConflictAnalysisResults = ConflictAnalysisResultsResponse;
export type SynthesizeRulesetResults = SynthesizeRulesetResultsResponse;

// ============================================================================
// 5. FlexSearch Third-Party Declarations (Global Namespace)
// ============================================================================

declare global {
  namespace FlexSearch {
    interface IndexOptions {
      tokenize?: 'strict' | 'forward' | 'reverse' | 'full' | string;
      split?: RegExp | string;
      suggest?: boolean;
      // IndexOptions allows arbitrary custom configurations depending on the FlexSearch version.
      // We explicitly permit string indices and arbitrary options to support integration requirements.
      [key: string]: any; // Justification: FlexSearch options are dynamic configuration objects.
    }

    class Index {
      constructor(options?: IndexOptions);
      add(id: string | number, text: string): void;
      search(query: string, limit?: number): (string | number)[];
      search(query: string, options?: { limit?: number; suggest?: boolean; [key: string]: any }): (string | number)[];
    }
  }

  // Bind FlexSearch to DedicatedWorkerGlobalScope (for worker thread environment)
  interface DedicatedWorkerGlobalScope {
    FlexSearch: typeof FlexSearch;
    onmessage: ((this: DedicatedWorkerGlobalScope, ev: MessageEvent<any>) => any) | null;
    postMessage(message: any, transfer?: Transferable[]): void;
  }

  // Bind FlexSearch to Window (for browser main thread environment)
  interface Window {
    FlexSearch: typeof FlexSearch;
  }
}

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
