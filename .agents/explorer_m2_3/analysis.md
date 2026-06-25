# Codebase Analysis: Core Data Structures, Models, and Message Formats

This report presents a thorough analysis of the data structures, models, API/Worker message formats, and function signatures in the TTRPG Rules Indexer codebase (`src/app.js`, `src/search-worker.js`, and database generation/enrichment scripts).

---

## 1. Core Model Definitions

### GameRuleset
This model represents a single tabletop roleplaying game or board game entry.
In `registry.json`, games are organized into separate `ttrpg` and `board_game` arrays.
In the application memory, they are consolidated and decorated with a `medium` field.

```typescript
export interface GameRuleset {
  /** A unique slug identifier for the game, typically lowercase title with underscores plus year */
  game_id: string;
  
  /** The clean, user-friendly name of the game */
  title: string;
  
  /** The publication year */
  year: number;
  
  /** The medium category of the ruleset */
  medium?: 'ttrpg' | 'board_game';
  
  /** The primary genre (e.g. "Fantasy", "Sci-Fi", "Strategy", "Wargame") */
  primary_genre: string;
  
  /** List of subgenres/tags associated with the game */
  subgenres: string[];
  
  /** Array of namespaces representing mechanical rules vectors (e.g. "combat.melee.tactical") */
  governed_vectors: string[];
  
  /** Explanations mapping each governed vector to rules text specific to the game */
  vector_explanations: Record<string, string>;
  
  /** Brief Wikipedia description of the game */
  description?: string;
  
  /** Wikipedia lead intro extract text */
  extract?: string;
}

/** In-memory representation used inside the search worker for performance optimizations */
export interface InMemoryGameRuleset extends Required<GameRuleset> {
  /** Pre-calculated Set for O(1) lookups during Venn comparisons */
  governed_vectors_set: Set<string>;
}
```

### RegistryData
The shape of the curated `registry.json` database.

```typescript
export interface RegistryData {
  /** Collection of Tabletop Roleplaying Games */
  ttrpg: GameRuleset[];
  
  /** Collection of Board Games */
  board_game: GameRuleset[];
}
```

### RegistryNamesData
The structure of `registry_names.json`, which acts as a flat search index index.

```typescript
export interface RegistryNameEntry {
  title: string;
  year: number;
  genre: string;
  medium: 'ttrpg' | 'board_game';
}

export type RegistryNamesData = RegistryNameEntry[];
```

---

## 2. Web Worker Communication Channels

Communication between the main thread (`app.js`) and the Web Worker thread (`search-worker.js`) is message-driven.

### Message Protocol (Request / To Worker)

Requests sent from `app.js` via `searchWorker.postMessage(message)`. The worker accepts `type` or `action` as a command identifier.

```typescript
export type SearchWorkerRequest =
  | InitRequest
  | SearchRequest
  | AutocompleteRequest
  | CompareRequest
  | DictionaryRequest
  | AddGameRequest
  | AddVectorRequest;

export interface InitRequest {
  type: 'init';
  /** Optional URL/path of the registry database. Defaults to 'registry.json' */
  dbUrl?: string;
  /** Legacy payload structure support */
  payload?: {
    dbUrl?: string;
    url?: string;
  };
}

export interface SearchRequest {
  type: 'search';
  /** Search parameters and active filters */
  filters: SearchFilters;
  /** Legacy payload structure support */
  payload?: SearchFilters;
}

export interface AutocompleteRequest {
  type: 'autocomplete';
  /** The text prefix to complete */
  query: string;
  /** Whether searching for vector namespaces or game titles */
  autocompleteType?: 'vector' | 'game';
  /** Legacy payload structure support */
  payload?: {
    query?: string;
    type?: 'vector' | 'game';
  };
}

export interface CompareRequest {
  type: 'compare';
  gameIdA: string;
  gameIdB: string;
  /** Legacy payload structure support */
  payload?: {
    gameIdA?: string;
    gameIdB?: string;
  };
}

export interface DictionaryRequest {
  type: 'dictionary';
  /** Filter domain (first segment of namespace e.g. "combat") */
  domain?: string;
  /** Exact vector to fetch games for, overrides domain filter if provided */
  vector?: string | null;
  /** Legacy payload structure support */
  payload?: {
    domain?: string;
    vector?: string | null;
  };
}

export interface AddGameRequest {
  type: 'addGame';
  /** The game object to write to worker memory database */
  game: GameRuleset & { medium: 'ttrpg' | 'board_game' };
  /** Legacy payload structure support */
  payload?: {
    game: GameRuleset & { medium: 'ttrpg' | 'board_game' };
  };
}

export interface AddVectorRequest {
  type: 'addVector';
  /** The new custom vector string to add to the unique list */
  vector: string;
}
```

### Message Protocol (Response / From Worker)

Responses sent from `search-worker.js` via `self.postMessage(response)`. The main thread listens to these in `searchWorker.onmessage`.

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
  stats: DatabaseStats;
}

export interface SearchResultsResponse {
  type: 'searchResults';
  action: 'search';
  results: GameRuleset[];
  totalCount: number;
  total: number;
  latencyMs: number;
}

export interface AutocompleteResultsResponse {
  type: 'autocompleteResults';
  action: 'autocomplete';
  /** Completed vector strings (populated when query type was 'vector') */
  suggestions: string[];
  /** Game matching objects (populated when query type was 'game') */
  results: CompactGameSuggestion[];
  latencyMs: number;
}

export interface CompareResultsResponse {
  type: 'compareResults';
  action: 'compare';
  gameA: GameRuleset;
  gameB: GameRuleset;
  /** Vector namespaces active in BOTH games, sorted alphabetically */
  shared: string[];
  /** Vector namespaces active ONLY in game A, sorted alphabetically */
  onlyA: string[];
  /** Vector namespaces active ONLY in game B, sorted alphabetically */
  onlyB: string[];
  latencyMs: number;
}

export type DictionaryResultsResponse = 
  | VectorDictionaryResults
  | DomainDictionaryResults;

export interface VectorDictionaryResults {
  type: 'dictionaryResults';
  action: 'dictionary';
  vector: string;
  results: CompactGameReference[];
  vectors: CompactGameReference[]; // Duplicated alias in worker message payload
}

export interface DomainDictionaryResults {
  type: 'dictionaryResults';
  action: 'dictionary';
  domain: string;
  activeDomain?: string; // Additional field set in worker
  results: DomainVectorGroup[];
  vectors: DomainVectorGroup[]; // Duplicated alias in worker message payload
}

export interface AddGameDoneResponse {
  type: 'addGameDone';
  action: 'addGame';
  success: true;
  game: GameRuleset;
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
```

---

## 3. Helper Structures and Types

### SearchFilters
Controls constraints for standard query operations.

```typescript
export interface SearchFilters {
  /** Cleaned, lowercase, trimmed string for name/genre/vector matching */
  searchTerm: string;
  
  /** Filter target medium */
  medium: 'all' | 'ttrpg' | 'board_game';
  
  /** Target genre or 'all' */
  genre: string;
  
  /** Minimum publication year boundary */
  minYear: number;
  
  /** Maximum publication year boundary */
  maxYear: number;
  
  /** Sorting criteria */
  sort: 'title-asc' | 'title-desc' | 'year-asc' | 'year-desc';
}
```

### CompactGameSuggestion
Returned during autocomplete searches targeting game titles.
```typescript
export interface CompactGameSuggestion {
  game_id: string;
  title: string;
}
```

### CompactGameReference
Returned within the inverted index dictionary.
```typescript
export interface CompactGameReference {
  game_id: string;
  title: string;
  medium: 'ttrpg' | 'board_game';
  year: number;
}
```

### DomainVectorGroup
Represents a group of games that support a specific vector.
```typescript
export interface DomainVectorGroup {
  vector: string;
  games: CompactGameReference[];
}
```

### DatabaseStats
Diagnostic counters sent to main thread upon worker setup.
```typescript
export interface DatabaseStats {
  totalGames: number;
  totalTtrpgs: number;
  totalBoardgames: number;
  uniqueVectorsCount: number;
  ttrpgCount: number;
  boardGameCount: number;
  uniqueVectors: number;
}
```

### BGG API Elements
Types associated with the BoardGameGeek API parsing helper logic.

```typescript
export interface BGGSearchItem {
  id: string;
  name: string;
  year: string;
}

export interface BggMechanicMapping {
  [bggMechanicName: string]: string; // Maps BGG mechanic names to registry vector namespaces
}
```

---

## 4. Key Functions and Parameter Specifications

### Core Engine in `search-worker.js`
*   `cleanAndFreezeGame(game: Object): InMemoryGameRuleset`
    Cleans incoming JSON structures, generates a Set for vectors, and freezes child nodes.
*   `addToIndexAndDictionary(game: InMemoryGameRuleset): void`
    Adds text payload (title, genre, subgenres, vectors) to the FlexSearch index and appends references to `invertedIndex`.
*   `rebuildVectorsCache(): void`
    Reconstructs `sortedUniqueVectors` and groups them into `vectorsByDomain` Map by split namespace parent.
*   `handleInit(data: InitRequest): Promise<void>`
    Fetches the JSON database, loops, and initializes structures.
*   `handleSearch(data: SearchRequest): void`
    Leverages FlexSearch for matches, applies filters and sorting logic, then fires results message.
*   `handleAutocomplete(data: AutocompleteRequest): void`
    Filters sorted namespaces list or queries games by string prefix.
*   `handleCompare(data: CompareRequest): void`
    Computes shared/exclusive vectors using Set intersection/difference logic.
*   `handleDictionary(data: DictionaryRequest): void`
    Performs vector lookups or collects vectors within a domain.
*   `handleAddGame(data: AddGameRequest): void`
    Validates, processes, indexes, and appends a new game runtime entry.

### Main App Thread in `app.js`
*   `debounce(func: Function, wait: number): Function`
    Debounces user UI input.
*   `progressiveRender(gamesToRender: GameRuleset[], totalFilteredCount: number, gridElement: HTMLElement): void`
    Uses `requestAnimationFrame` to render game cards in batches, avoiding main thread blocking.
*   `progressiveRenderDict(results: DomainVectorGroup[], container: HTMLElement): void`
    Uses `requestAnimationFrame` to batch-render dictionary list entries.
*   `openGameDetails(gameId: string): void`
    Populates and displays the modal popup panel with full game information and categorized vector rule details.
*   `executeVectorSearch(vectorName: string): void`
    Dispatches a worker request to look up games featuring the target vector.
*   `toggleEditorVectorExplanation(vector: string, isChecked: boolean): void`
    Builds or deletes a textarea editor control depending on the state of a vector checkbox.
*   `importBGGGame(bggId: string): Promise<void>`
    Fetches BoardGameGeek details, parses categories and mechanics, maps vectors, and populates the editor form.
