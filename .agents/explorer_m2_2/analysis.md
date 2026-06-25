# Codebase Analysis & TypeScript Type Recommendations

## Executive Summary
This report analyzes the core data structures, models, message formats, and function parameters of the Systems Indexer Rules Explorer codebase located in `src/`. The application runs a browser-based frontend (`src/app.js`) that delegates database operations, searching, autocompleting, and Venn comparison logic to a background Web Worker (`src/search-worker.js`), with a synchronous fallback class (`LocalSearchWorker`) for non-Web-Worker environments (e.g., test environments like Jest under JSDOM).

---

## 1. Core Data Models

### 1.1. `GameRuleset`
Represents the static structure of a game entry as parsed from and written to `registry.json` by database and enrichment scripts (`src/build_database.js`, `src/enrich_database.js`, `src/build_and_enrich.js`).

```typescript
export interface GameRuleset {
  /** Unique snake_case identifier appended with the publication year, e.g. "coriolis_empyrean_canticle_2e_edition_2026" */
  game_id: string;
  
  /** Curated and cleaned title of the game */
  title: string;
  
  /** Year of introduction/publication */
  year: number;
  
  /** Category of game, optional in raw JSON but typically present */
  medium?: 'ttrpg' | 'board_game';
  
  /** Primary category classification, e.g., "Fantasy", "Sci-Fi", "Horror", "Strategy" */
  primary_genre: string;
  
  /** Secondary genre tags or mechanic-based subgenre classifications */
  subgenres: string[];
  
  /** Array of hierarchical system vectors representing governed mechanics (e.g., "combat.melee.tactical") */
  governed_vectors: string[];
  
  /** Mapping of namespaced vectors to textual explanations of how the rules are applied in this game */
  vector_explanations: Record<string, string>;
  
  /** Curated or harvested description from Wikipedia (optional/nullable) */
  description?: string;
  
  /** Harvested Wikipedia lead text snippet (optional/nullable) */
  extract?: string;
}
```

### 1.2. `RegistryData`
Defines the schema of `registry.json` representing collections of TTRPG and Board Game systems.

```typescript
export interface RegistryData {
  /** List of tabletop role-playing games */
  ttrpg: GameRuleset[];
  
  /** List of board games */
  board_game: GameRuleset[];
}
```

### 1.3. `WorkerGame`
The runtime Web Worker representation of a game. When loading games, the search worker optimizes properties by freezing them (`Object.freeze`) and pre-calculating a `Set` for high-performance $O(1)$ Venn comparison set operations.

```typescript
export interface WorkerGame extends Readonly<Omit<GameRuleset, 'subgenres' | 'governed_vectors' | 'vector_explanations'>> {
  readonly year: number; // Coerced to Number in worker
  readonly medium: 'ttrpg' | 'board_game';
  readonly subgenres: readonly string[];
  readonly governed_vectors: readonly string[];
  readonly vector_explanations: Readonly<Record<string, string>>;
  
  /** Precalculated Set of governed vectors for quick intersection tests */
  readonly governed_vectors_set: ReadonlySet<string>;
}
```

---

## 2. Worker Communication Message Protocol

Communication between the main application thread (`src/app.js`) and the background worker (`src/search-worker.js`) relies on serializing and parsing structured message payloads. 

The background thread handles requests through `self.onmessage = async function(e)`. The interface supports inputs containing properties directly at the message root or encapsulated within a nested `payload` object.

### 2.1. Request Discriminators (`SearchWorkerRequest`)
Representing messages sent **to** the search worker.

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
  gameIdA: string;
  gameIdB: string;
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
  game: GameRuleset;
  payload?: {
    game?: GameRuleset;
  };
}

export interface AddVectorRequest {
  type: 'addVector';
  action?: 'addVector';
  vector: string;
}
```

### 2.2. Response Discriminators (`SearchWorkerResponse`)
Representing messages sent **from** the search worker back to the main thread.

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
  stats: {
    totalGames: number;
    totalTtrpgs: number;
    totalBoardgames: number;
    uniqueVectorsCount: number;
    ttrpgCount: number;
    boardGameCount: number;
    uniqueVectors: number;
  };
}

export interface SearchResultsResponse {
  type: 'searchResults';
  action: 'search';
  results: WorkerGame[];
  totalCount: number;
  total: number;
  latencyMs: number;
}

export interface AutocompleteResultsResponse {
  type: 'autocompleteResults';
  action: 'autocomplete';
  /** Present and populated when autocompleteType is 'vector' */
  suggestions: string[];
  /** Contains string[] (vector paths) OR { game_id, title }[] (games list) */
  results: string[] | AutocompleteGameResult[];
  latencyMs: number;
}

export interface CompareResultsResponse {
  type: 'compareResults';
  action: 'compare';
  gameA: WorkerGame;
  gameB: WorkerGame;
  shared: string[]; // List of vector paths (sorted)
  onlyA: string[];  // Exclusive to Game A (sorted)
  onlyB: string[];  // Exclusive to Game B (sorted)
  latencyMs: number;
}

export interface DictionaryResultsResponse {
  type: 'dictionaryResults';
  action: 'dictionary';
  vector?: string | null;
  domain?: string;
  activeDomain?: string;
  /** Depending on input, lists either games matching a vector, or vectors matching a domain */
  results: DictionaryDomainResult[] | DictionaryVectorMatch[];
  vectors: DictionaryDomainResult[] | DictionaryVectorMatch[];
}

export interface AddGameDoneResponse {
  type: 'addGameDone';
  action: 'addGame';
  success: true;
  game: WorkerGame;
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

## 3. Helper Structures and Support Types

### 3.1. `SearchFilters`
Stores query configuration states applied when retrieving lists of games.

```typescript
export interface SearchFilters {
  searchTerm?: string;
  medium?: 'all' | 'ttrpg' | 'board_game';
  genre?: string;
  minYear?: number;
  maxYear?: number;
  sort?: 'title-asc' | 'title-desc' | 'year-asc' | 'year-desc';
}
```

### 3.2. Autocomplete Results Helper
```typescript
export interface AutocompleteGameResult {
  game_id: string;
  title: string;
}
```

### 3.3. Dictionary Response Helpers
```typescript
export interface DictionaryGameRef {
  game_id: string;
  title: string;
  medium: 'ttrpg' | 'board_game';
  year: number;
}

/** Returned when querying all vectors in a domain */
export interface DictionaryDomainResult {
  vector: string;
  games: DictionaryGameRef[];
}

/** Returned when querying a single vector */
export interface DictionaryVectorMatch {
  game_id: string;
  title: string;
  medium: 'ttrpg' | 'board_game';
  year: number;
}
```

### 3.4. Flat Name Index Helper (`registry_names.json`)
```typescript
export interface RegistryNameEntry {
  title: string;
  year: number;
  genre: string;
  medium: 'ttrpg' | 'board_game';
}
```

### 3.5. Harvester State Helper (`state.json`)
```typescript
export interface HarvestState {
  current_year: number;
}
```

---

## 4. Function Signatures & Class Interfaces

Below are function parameters and class interfaces observed in the execution pathways of `src/app.js` and `src/search-worker.js`.

### 4.1. Web Worker Interfaces

#### `cleanAndFreezeGame(game)`
Cleans input data structure, default-initializes fields, constructs `governed_vectors_set`, and deep freezes properties.
- **Parameters**: `game: GameRuleset`
- **Returns**: `WorkerGame`

#### `addToIndexAndDictionary(game)`
Tokenizes fields and appends elements to the FlexSearch index and the inverted mapping dictionary.
- **Parameters**: `game: WorkerGame`
- **Returns**: `void`

#### `rebuildVectorsCache()`
Rebuilds autocomplete hierarchy namespace paths and cache maps.
- **Parameters**: None
- **Returns**: `void`

#### `handleInit(data)`
Initializes indexes and retrieves registry JSON database.
- **Parameters**: `data: InitRequest`
- **Returns**: `Promise<void>`

#### `handleSearch(data)`
Performs FlexSearch lookup, filters values, sorts elements, caches queries, and returns responses.
- **Parameters**: `data: SearchRequest`
- **Returns**: `void`

#### `handleAutocomplete(data)`
Performs fast lookup on cached sorted vectors or matching games titles.
- **Parameters**: `data: AutocompleteRequest`
- **Returns**: `void`

#### `handleCompare(data)`
Performs Set difference operations to compute Venn overlap.
- **Parameters**: `data: CompareRequest`
- **Returns**: `void`

#### `handleDictionary(data)`
Retrieves matches from the precomputed inverted index.
- **Parameters**: `data: DictionaryRequest`
- **Returns**: `void`

#### `handleAddGame(data)`
Adds a custom ruleset to the indexes dynamically.
- **Parameters**: `data: AddGameRequest`
- **Returns**: `void`

#### `handleAddVector(data)`
Appends custom namespace vectors.
- **Parameters**: `data: AddVectorRequest`
- **Returns**: `void`

### 4.2. Local Fallback Thread Class Interface (`LocalSearchWorker`)
Implements the worker API client-side in non-worker runtimes (e.g. testing environments).

```typescript
export class LocalSearchWorker {
  onmessage: ((event: { data: SearchWorkerResponse }) => void) | null;
  games: WorkerGame[];
  uniqueVectors: Set<string>;
  invertedIndex: Map<string, DictionaryGameRef[]>;
  gamesMap: Map<string, WorkerGame>;
  sortedUniqueVectors: string[];
  vectorsByDomain: Map<string, string[]>;

  constructor();
  rebuildVectorsCache(): void;
  postMessage(data: SearchWorkerRequest): void;
}
```

---

## 5. Source Code Mapping Summary

The following table summarizes where the properties and types are processed:

| File Path | Purpose | Key Data Inputs / Outputs |
|---|---|---|
| `src/app.js` | Main Application Thread | Instantiates `LocalSearchWorker` or creates a Web Worker; parses/binds `SearchFilters` state; translates `SearchWorkerResponse` messages to UI layouts. |
| `src/search-worker.js` | Core Search Worker | Ingests `RegistryData` during `init`; processes and caches `WorkerGame` instances; processes and dispatches responses containing `AutocompleteResultsResponse`, `CompareResultsResponse`, `DictionaryResultsResponse`, and `SearchResultsResponse`. |
| `src/build_database.js` | Harvester database script | Reads Wikipedia API data; cleans title layouts; classifies games using primary/subgenre heuristics; outputs structured `RegistryData` inside `registry.json` and a flat list of `RegistryNameEntry[]` in `registry_names.json`. |
| `src/enrich_database.js` | Semantic database enricher | Processes `registry.json` and enriches entries with semantic vectors based on descriptions/extracts text keywords. |
| `src/process_year.js` | Year-by-year db compiler | Increments compile years, reads state inside `state.json`, compiles static database array `dbArchive`, and updates `registry_names.json`. |
