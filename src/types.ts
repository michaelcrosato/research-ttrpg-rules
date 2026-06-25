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
  | AddVectorRequest;

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
 * Individual request action/type aliases for compatibility.
 */
export type InitMessage = InitRequest;
export type SearchMessage = SearchRequest;
export type AutocompleteMessage = AutocompleteRequest;
export type CompareMessage = CompareRequest;
export type DictionaryMessage = DictionaryRequest;
export type AddGameMessage = AddGameRequest;
export type AddVectorMessage = AddVectorRequest;

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
  | ErrorResponse;

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
export type DictionaryResultsResponse = VectorDictionaryResultsResponse | DomainDictionaryResultsResponse;

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
// 6. OmniRuleset Sandbox Types
// ============================================================================

/**
 * A pattern-based conflict detection rule mapping incompatible vector pairs.
 */
export interface SandboxConflictRule {
  id: string;
  category: string;
  vectorPatterns: string[];
  description: string;
  severity: 'warning' | 'critical';
  resolution: string;
}

/**
 * A detected conflict instance with triggering vector details.
 */
export interface SandboxDetectedConflict {
  rule: SandboxConflictRule;
  triggeringVectors: string[];
  resolved: boolean;
}

/**
 * Character stat block generated from synthesized rulesets.
 */
export interface SandboxCharacterTemplate {
  name: string;
  level: number;
  hitPoints: number;
  maxHitPoints: number;
  stats: Record<string, number>;
  skills: string[];
  abilities: string[];
  inventory: string[];
  conditions: string[];
}

/**
 * A section of a synthesized unified ruleset.
 */
export interface SandboxRulesetSection {
  heading: string;
  domain: string;
  rules: string[];
}

/**
 * Complete synthesized ruleset output.
 */
export interface SandboxSynthesizedRuleset {
  title: string;
  sections: SandboxRulesetSection[];
  resolutionNotes: string[];
  characterTemplate: SandboxCharacterTemplate;
}

/**
 * A chat message in the GM playtest sandbox.
 */
export interface SandboxChatMessage {
  role: 'gm' | 'player' | 'system';
  content: string;
  timestamp: number;
}

/**
 * An enemy NPC in a sandbox combat encounter.
 */
export interface SandboxEnemy {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  alive: boolean;
}

/**
 * Active GM playtest session state.
 */
export interface SandboxGMSession {
  ruleset: SandboxSynthesizedRuleset;
  character: SandboxCharacterTemplate;
  chatLog: SandboxChatMessage[];
  currentScene: string;
  encounterState: {
    inCombat: boolean;
    enemies: SandboxEnemy[];
    roundNumber: number;
  };
  turnNumber: number;
}
