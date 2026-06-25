# Type Definition Design & Codebase Analysis Report

## 1. Introduction & Data Flow Overview

This report provides a comprehensive analysis of the core data structures, models, message formats, and function parameters in the Systems Indexer application (`src/app.js`, `src/search-worker.js`, and database creation/enrichment scripts). It establishes a detailed blueprint of explicit TypeScript interface definitions to support a robust migration of the codebase to TypeScript.

The data flow within the application operates as follows:
1. **Harvesting & Enrichment (`src/build_database.js`, `src/enrich_database.js`)**: Flat game lists are parsed and seeded, querying the Wikipedia API to retrieve textual descriptions and extracts. Rule heuristics are then executed to generate subgenres, governed vectors, and vector explanations. This compiles the static databases: `registry.json` (hierarchical collections grouped by medium) and `registry_names.json` (flat metadata list of titles/genres).
2. **Initialization (`src/app.js` & `src/search-worker.js`)**: On startup, `app.js` fetches `registry.json` and initializes the search worker (either standard browser Web Worker or `LocalSearchWorker` fallback). It posts an `init` message with the registry's URL. The worker fetches the registry, runs data cleaning/freezing, updates cache structures, and populates the FlexSearch index and inverted lookup index.
3. **Interactive Search & Queries**: Users interact with tabs in `app.js` (Explorer, Compare, Vector Search, Dictionary, Editor). User actions trigger message dispatches (`search`, `autocomplete`, `compare`, `dictionary`, `addGame`, `addVector`) to the worker, which processes them in the background (using fast native Set operations, cached namespaces, and FlexSearch queries) and posts structured result messages back for rendering in the DOM.

---

## 2. Core Models and Data Structures

### GameRuleset
Represents a game entry as stored in `registry.json`.

```typescript
/**
 * Represents a game ruleset entry in the registry database.
 */
export interface GameRuleset {
  /**
   * Unique snake_case identifier for the game, typically suffixed with the year.
   * E.g., "cyberpunk_red_2045_chronicle_book_2026"
   */
  game_id: string;

  /**
   * The clean, displayable title of the game.
   */
  title: string;

  /**
   * The year the game was published or introduced.
   */
  year: number;

  /**
   * The design medium of the game.
   */
  medium: 'ttrpg' | 'board_game';

  /**
   * The primary genre classification (e.g., "Fantasy", "Sci-Fi", "Wargame").
   */
  primary_genre: string;

  /**
   * Subgenres and mechanical descriptors associated with the ruleset.
   */
  subgenres: string[];

  /**
   * The list of hierarchical vector keys governed by this ruleset.
   * E.g., ["combat.initiative.dexterity_based", "combat.movement.grid_based"]
   */
  governed_vectors: string[];

  /**
   * A mapping of governed vector keys to their textual rule explanations.
   */
  vector_explanations: Record<string, string>;

  /**
   * Optional short summary description of the game.
   */
  description?: string;

  /**
   * Optional introductory text extract fetched from Wikipedia.
   */
  extract?: string;
}

/**
 * Internal representation of a GameRuleset within the worker and application runtime,
 * augmented with pre-calculated lookups to optimize performance.
 */
export interface GameRulesetInternal extends GameRuleset {
  /**
   * Pre-compiled Set of governed vectors to support O(1) lookups during Venn comparisons.
   */
  governed_vectors_set: Set<string>;
}
```

### RegistryData
Represents the top-level schema of `registry.json`.

```typescript
/**
 * Structure of the registry.json database.
 */
export interface RegistryData {
  /**
   * Collection of tabletop role-playing games.
   */
  ttrpg: GameRuleset[];

  /**
   * Collection of board games.
   */
  board_game: GameRuleset[];
}
```

---

## 3. Web Worker Communication Types

### Input Messages (`SearchWorkerMessage`)
A discriminated union defining all message schemas sent from the main application thread to the Web Worker.

```typescript
export type SearchWorkerMessage =
  | InitMessage
  | SearchMessage
  | AutocompleteMessage
  | CompareMessage
  | DictionaryMessage
  | AddGameMessage
  | AddVectorMessage;

export interface InitMessage {
  type: 'init';
  /**
   * The path or URL of the registry data file to fetch. Defaults to 'registry.json'.
   */
  dbUrl?: string;
  /**
   * Legacy wrapper payload for compatibility with older initialization formats.
   */
  payload?: {
    dbUrl?: string;
    url?: string;
  };
}

export interface SearchMessage {
  type: 'search';
  /**
   * Filters to apply to the FlexSearch results.
   */
  filters?: SearchFilters;
  /**
   * Legacy wrapper payload for compatibility.
   */
  payload?: SearchFilters;
}

export interface AutocompleteMessage {
  type: 'autocomplete';
  /**
   * The partial search string to autocomplete.
   */
  query?: string;
  /**
   * The type of entity to autocomplete.
   */
  autocompleteType?: 'vector' | 'game';
  /**
   * Legacy wrapper payload for compatibility.
   */
  payload?: {
    query?: string;
    type?: 'vector' | 'game';
  };
}

export interface CompareMessage {
  type: 'compare';
  gameIdA?: string;
  gameIdB?: string;
  /**
   * Legacy wrapper payload for compatibility.
   */
  payload?: {
    gameIdA?: string;
    gameIdB?: string;
  };
}

export interface DictionaryMessage {
  type: 'dictionary';
  /**
   * Domain namespace filter (e.g., 'combat', 'character', 'all').
   */
  domain?: string;
  /**
   * Specific vector key to query directly.
   */
  vector?: string;
  /**
   * Legacy wrapper payload for compatibility.
   */
  payload?: {
    domain?: string;
    vector?: string;
  };
}

export interface AddGameMessage {
  type: 'addGame';
  /**
   * The ruleset structure of the new game to index.
   */
  game?: GameRuleset;
  /**
   * Legacy wrapper payload for compatibility.
   */
  payload?: {
    game?: GameRuleset;
  };
}

export interface AddVectorMessage {
  type: 'addVector';
  /**
   * The vector key string to add to the unique vectors directory.
   */
  vector: string;
}
```

### Output Messages (`SearchWorkerResponse`)
A discriminated union defining all message schemas posted by the Web Worker back to the main thread.

```typescript
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
  action: 'init';
  success: true;
  stats: WorkerStats;
}

export interface SearchResultsResponse {
  type: 'searchResults';
  action: 'search';
  /**
   * Matched, filtered, and sorted list of games.
   */
  results: GameRulesetInternal[];
  /**
   * Total count of matched games after filters are applied.
   */
  totalCount: number;
  /**
   * Duplicated total count to match UI rendering requirements.
   */
  total: number;
  /**
   * Execution latency in milliseconds.
   */
  latencyMs: number;
}

export interface AutocompleteResultsResponse {
  type: 'autocompleteResults';
  action: 'autocomplete';
  /**
   * Autocompleted vector suggestions (only populated for 'vector' type).
   */
  suggestions: string[];
  /**
   * Autocompleted list of game objects or vector names.
   */
  results: string[] | DictionaryGameEntry[];
  latencyMs: number;
}

export interface CompareResultsResponse {
  type: 'compareResults';
  action: 'compare';
  gameA: GameRulesetInternal;
  gameB: GameRulesetInternal;
  /**
   * Ordered list of vector keys governed by both rulesets.
   */
  shared: string[];
  /**
   * Ordered list of vector keys governed only by Game A.
   */
  onlyA: string[];
  /**
   * Ordered list of vector keys governed only by Game B.
   */
  onlyB: string[];
  latencyMs: number;
}

export interface DictionaryResultsResponse {
  type: 'dictionaryResults';
  action: 'dictionary';
  
  // Conditionally populated based on dictionary query inputs:
  vector?: string;
  activeDomain?: string;
  domain?: string;
  
  /**
   * If a specific vector was queried, contains a list of games matching that vector.
   * If a domain was queried, contains a list of vectors grouped with their associated games.
   */
  results: DictionaryGameEntry[] | DictionaryVectorEntry[];
  vectors: DictionaryGameEntry[] | DictionaryVectorEntry[];
}

export interface AddGameDoneResponse {
  type: 'addGameDone';
  action: 'addGame';
  success: true;
  game: GameRulesetInternal;
  /**
   * Detailed dataset statistics post-insertion.
   */
  updatedStats: {
    totalGames: number;
    totalTtrpgs: number;
    totalBoardgames: number;
    uniqueVectorsCount: number;
  };
  /**
   * Flat dashboard statistics.
   */
  stats: {
    totalGames: number;
    uniqueVectors: number;
  };
}

export interface ErrorResponse {
  type: 'error';
  /**
   * Action type that triggered the error.
   */
  action?: string;
  /**
   * Descriptive error message.
   */
  error: string;
}
```

---

## 4. Helper Structures and Types

```typescript
/**
 * Filtering and sorting criteria for ruleset search queries.
 */
export interface SearchFilters {
  /**
   * Free-text search term matching title, genre, subgenres, and vectors.
   */
  searchTerm?: string;
  /**
   * Restricts search by medium, or allows all.
   */
  medium?: 'all' | 'ttrpg' | 'board_game';
  /**
   * Restricts search by a primary genre or subgenre.
   */
  genre?: string;
  /**
   * Minimum publication year.
   */
  minYear?: number;
  /**
   * Maximum publication year.
   */
  maxYear?: number;
  /**
   * Sort criteria.
   */
  sort?: 'title-asc' | 'title-desc' | 'year-asc' | 'year-desc';
}

/**
 * Registry metadata index format representing registry_names.json entries.
 */
export interface RegistryNameEntry {
  title: string;
  year: number;
  genre: string;
  medium: 'ttrpg' | 'board_game';
}

/**
 * Summary database statistics.
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
 * Minimalist game descriptor used in dictionary listings and autocompletes.
 */
export interface DictionaryGameEntry {
  game_id: string;
  title: string;
  medium: 'ttrpg' | 'board_game';
  year: number;
}

/**
 * Grouped dictionary listing for a single vector.
 */
export interface DictionaryVectorEntry {
  vector: string;
  games: DictionaryGameEntry[];
}
```

---

## 5. Function Signatures & Parameter Types

### Web Worker Internal Functions (`src/search-worker.js`)
- `rebuildVectorsCache(): void`
  - Recomputes sorted vector directories and namespaces.
- `cleanAndFreezeGame(game: any): GameRulesetInternal`
  - Validates and parses game attributes, pre-calculates the internal vector lookup `Set`, and deep-freezes nested objects.
- `addToIndexAndDictionary(game: GameRulesetInternal): void`
  - Indexing logic integrating FlexSearch and inverted indexes.
- `handleInit(data: InitMessage): Promise<void>`
  - Async fetch and boot loader.
- `handleSearch(data: SearchMessage): void`
  - Retrieves matched identifiers, applies criteria, sorts, and posts results.
- `handleAutocomplete(data: AutocompleteMessage): void`
  - Returns suggestions.
- `handleCompare(data: CompareMessage): void`
  - Set-difference logic comparing two games.
- `handleDictionary(data: DictionaryMessage): void`
  - Direct O(1) lookup.
- `handleAddGame(data: AddGameMessage): void`
  - Appends new entry, invalidates search cache, and rebuilds indices.
- `handleAddVector(data: AddVectorMessage): void`
  - Registers custom vectors.

### Application Logic Functions (`src/app.js`)
- `debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void`
  - Standard debounce logic.
- `initSearchWorker(): void`
  - Spawns standard web worker or initiates a local simulation fallback.
- `handleWorkerReady(data: ReadyResponse): void`
- `handleWorkerSearchResults(data: SearchResultsResponse): void`
- `handleWorkerAutocompleteResults(data: AutocompleteResultsResponse): void`
- `handleWorkerCompareResults(data: CompareResultsResponse): void`
- `handleWorkerDictionaryResults(data: DictionaryResultsResponse): void`
- `handleWorkerAddGameDone(data: AddGameDoneResponse): void`
- `loadDatabase(): Promise<void>`
  - Performs initial network fetch and configuration.
- `processMetadata(): void`
  - Seed unique values based on full memory copies.
- `initializeFilterLimits(): void`
  - Configures year UI inputs based on dataset limits.
- `renderDashboardStats(): void`
  - Updates counters.
- `populateGenreDropdown(): void`
  - Syncs genre picker options.
- `progressiveRender(items: GameRulesetInternal[], total: number, container: HTMLElement): void`
  - Renders chunked pages of rulesets.
- `openGameDetails(gameId: string): void`
  - Displays modal dialogue showing detailed rules and extracts.
- `highlightCompareColumn(type: 'a' | 'b' | 'both'): void`
  - Highlights column filters.

### Harvester / Enrichment Functions (`src/build_database.js`, `src/enrich_database.js`)
- `cleanTitle(title: string): string`
  - Strips Wikipedia suffixes (e.g., `(role-playing game)`) and entities.
- `generateGameId(title: string, year: number): string`
  - Formats unique snake_case game IDs.
- `classifyGame(title: string, medium: string, year: number): Partial<GameRuleset>`
  - Basic rule classifier.
- `semanticEnrichment(title: string, medium: string, year: number, description: string, extract: string): Partial<GameRuleset>`
  - Regex NLP rules classifier.

---

## 6. TypeScript Migration Recommendations

1. **Adopt Module Structure**: Define these interfaces in a shared type module (e.g., `src/types.ts`) so both the worker file and the main application code can import the matching schemas.
2. **Convert Worker wrapper**: Type the global Web Worker interface (e.g. `self` as `DedicatedWorkerGlobalScope`) within `src/search-worker.js` to ensure the compilation targets understand worker globals.
3. **Extract Local Worker interface**: Create an abstract `ISearchWorker` class or interface that both standard `Worker` and `LocalSearchWorker` implement. This guarantees that test scripts in Jest and actual browser logic remain fully synchronized.
4. **Coerce User Input safely**: Since the worker relies heavily on inputs like `minYear`, `maxYear`, and `searchTerm`, apply default fallbacks (`?? 1900` or `""`) during payload construction in `app.js` using TypeScript's strict null checks.
