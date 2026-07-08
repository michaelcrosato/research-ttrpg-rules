# Project: OmniRules v2.0 Upgrade

## Architecture Details

OmniRules v2.0 is a local-first, high-performance mechanical gaming research studio and tabletop rules engine. It is designed to run entirely client-side, using web worker offloading, local semantic search, hardware-accelerated force-directed visualization, and local-first version control.

### Major Subsystems

1. **Interactive Mechanics Topology Graph Analyzer**
   - Canvas/SVG zero-dependency graph, color namespaces, tooltips, filtering.
2. **Local Semantic Embedding Search Engine**
   - Client-side dense query retrieval using `transformers.js` (MiniLM-L6-v2) run via background worker.
3. **Offline-First PWA & IndexedDB Search Index Caching**
   - Service Worker caching of static assets and databases, caching pre-compiled FlexSearch and semantic indexes in IndexedDB (<200ms load).
4. **Local WebGPU Sandbox VTT & LLM Playtest GM**
   - VTT layout sandbox, WebGPU compute/render 3D dice physics, Ollama/WebLLM integration, GM chat, turn tracker, character inventory/stats tracking.
5. **OmniGit Mechanical Version Control System**
   - Git-like commit, branch, merge, visual diffs, conflicts UI, JSON patch exporter.
6. **Local Dependency Bundling & CDN Decoupling**
   - Complete removal of external CDNs for loading scripts (e.g. FlexSearch loaded locally).
7. **Database Fetch & Worker Optimization**
   - Registry loading optimizations: single fetch, cached index loads, streamed search result chunks of 200 items.
8. **Advanced Glassmorphic UI/UX Polish**
   - Responsive grids, smooth transitions, shimmer loaders to prevent CLS, and drawer overlay layouts.
9. **Gaming DSL & AST Execution Engine**
   - Integration of tokenizer, parser, VM runner, and dice roller (`src/dsl.ts`) for mechanical rules execution.
10. **Logical Consistency Solver**
    - Mechanical inconsistency pre-validation checks, highlights paradoxes or conflicts when merging.
11. **Memory & Performance Diagnostics Dashboard**
    - Telemetry dashboard tracking latency histograms, worker memory footprints, and frame rate counters (FPS).
12. **Monte Carlo Simulation Testing**
    - Headless, automated execution of combat/skill simulations to verify engine stability and rule logic.
13. **WebRTC Peer-to-Peer Playtest Lobbies**
    - Connection token generation, room sharing, real-time status/dice sync, and p2p state consensus.
14. **AI-Driven Game Balance Telemetry Engine**
    - Automated playtesting via AI personas with statistical charts mapping win rates and round durations.
15. **Isometric Canvas VTT Battle Map**
    - Isometric grids, drag-and-drop game tokens, line-of-sight calculations, and attack range validation.
16. **Multi-Platform Import Connectors**
    - Connectors for importing third-party data from itch.io, DriveThruRPG, and Wikipedia search integration.
17. **VTT & Document Exporters**
    - Rules export modules targeting FoundryVTT, Roll20, Tabletop Simulator deck configurations, plus PDF/Markdown generation.
18. **Homebrew Creator Workspace**
    - Sandbox interface for designing custom game mechanics, saving drafts to IndexedDB, and applying draft overlays to the active registry.
19. **Math Probability Curves Analyzer**
    - Exploding and step dice pool probability curve calculator VM, generating Canvas-based PDF/CDF graphs.

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Baseline Setup & Verification | Establish planning docs, verify baseline of 203 passing Jest tests. | None | COMPLETED |
| 2 | Core Optimization, PWA & Caching | Local relative scripts loading, single registry fetch, streamed chunks of 200, Service Worker sw.js caching, IndexedDB caching, glassmorphic UI polish. (Subsystems 3, 6, 7, 8) | 1 | COMPLETED |
| 3 | Semantic Search & Import Connectors | transformers.js embeddings search worker, RRF hybrid ranking, itch.io/DriveThruRPG/Wikipedia import connectors. (Subsystems 2, 16) | 2 | COMPLETED |
| 4 | Topology Graph & Performance Diagnostics | Canvas/SVG force-directed graph with tooltips/filters, diagnostics panel with latency histograms, memory, and FPS counter. (Subsystems 1, 11) | 2 | COMPLETED |
| 5 | OmniGit VCS & Homebrew Workspace | Git-like branching, commit, merge, conflict diffs, homebrew drafts workspace in IndexedDB, logical consistency solver rules. (Subsystems 5, 10, 18) | 2 | COMPLETED |
| 6 | WebGPU VTT, Battle Map, Exporters & P2P | WebGPU 3D dice physics, WebRTC lobby peer sync, isometric canvas battle map with range/LOS checks, Foundry/Roll20/TTS/PDF/Markdown exporters. (Subsystems 4, 13, 15, 17) | 2, 5 | COMPLETED |
| 7 | AI GM, DSL, Telemetry & Playtests | AI GM Llama-3/Ollama, gaming DSL & AST parser VM, probability curves VM with Canvas graphs, Monte Carlo playtest simulations, balance charts, 4-tier Jest tests & Forensic Audit. (Subsystems 9, 12, 14, 19) | 3, 4, 5, 6 | COMPLETED |

---

## Code Layout

- **Source Code (TypeScript)**
  - `src/app.ts`: Main frontend application controller, UI event loop, and VTT supervisor.
  - `src/search-worker.ts`: Web Worker for keyword matching, FlexSearch, and Venn calculations.
  - `src/embeddings-worker.ts`: Web Worker for client-side semantic sentence embeddings.
  - `src/types.ts`: TypeScript type definitions, state contracts, and worker message protocols.
- **Compiled Output (JavaScript)**
  - `dist/app.js`: Compiled and compiled frontend application bundle.
  - `dist/search-worker.js`: Transpiled and optimized search web worker.
  - `dist/embeddings-worker.js`: Transpiled semantic search worker.
- **Static Assets & Data**
  - `index.html`: Shell layout, glassmorphic UI container structure.
  - `styles.css`: Dark mode glassmorphic UI rules, animations, and typography.
  - `registry.json`: Master database file containing TTRPG rulesets and mechanical vectors.
  - `sw.js`: Service worker for offline asset caching.
- **Testing**
  - `tests/`: Directory containing comprehensive unit, integration, and E2E Jest test files.

---

## Interface Contracts

### 1. Search Worker Message Protocol

- **Requests (`SearchWorkerRequest`)**:
  ```typescript
  type SearchWorkerRequest =
    | { type: 'init'; data: any }
    | { type: 'search'; query: string; filters: SearchFilters; sort: SortOption }
    | { type: 'autocomplete'; query: string; autocompleteType: 'vector' | 'game' }
    | { type: 'compare'; gameIdA: string; gameIdB: string }
    | { type: 'dictionary'; domain: string }
    | { type: 'addGame'; game: GameRecord }
    | { type: 'addVector'; vector: string; explanation: string };
  ```
- **Responses (`SearchWorkerResponse`)**:
  ```typescript
  type SearchWorkerResponse =
    | { type: 'ready'; stats: DatabaseStats }
    | { type: 'searchResults'; results: GameRecord[]; latencyMs: number }
    | { type: 'autocompleteResults'; suggestions: string[] }
    | { type: 'compareResults'; intersection: string[]; uniqueA: string[]; uniqueB: string[] }
    | { type: 'dictionaryResults'; vectors: VectorRecord[] }
    | { type: 'addGameDone'; success: boolean }
    | { type: 'error'; error: string };
  ```

### 2. Embeddings Worker Protocol

- **Requests (`EmbeddingsWorkerRequest`)**:
  ```typescript
  type EmbeddingsWorkerRequest =
    | { type: 'init'; modelName: string }
    | { type: 'query'; queryText: string; topK?: number };
  ```
- **Responses (`EmbeddingsWorkerResponse`)**:
  ```typescript
  type EmbeddingsWorkerResponse =
    | { type: 'ready' }
    | { type: 'queryResults'; matches: Array<{ gameId: string; similarity: number }> }
    | { type: 'error'; message: string };
  ```

### 3. Git Versioning Interface (OmniGit VCS)

- **VCS Lifecycle & Branching API**:
  ```typescript
  interface OmniGitVCS {
    createBranch(branchName: string): void;
    checkoutBranch(branchName: string): void;
    getActiveBranch(): string;
    stageChange(change: DatabaseChange): void;
    commitStaged(message: string): void;
    getCommitHistory(): CommitRecord[];
    mergeBranch(sourceBranch: string, targetBranch: string): MergeResult;
    exportJSONDiff(): string; // JSON Diff Patch
  }
  
  interface DatabaseChange {
    gameId: string;
    action: 'add' | 'modify' | 'delete';
    field: string;
    oldValue: any;
    newValue: any;
  }
  
  interface MergeResult {
    success: boolean;
    conflicts: Array<{ gameId: string; field: string; sourceVal: any; targetVal: any }>;
  }
  ```

### 4. Virtual Tabletop (VTT) State

- **VTT Engine & LLM Session State**:
  ```typescript
  interface VttSessionState {
    sessionId: string;
    activeRulesetId: string;
    partyCharacterSheets: Record<string, CharacterSheet>;
    turnTracker: {
      activeTurnIndex: number;
      combatantsOrder: string[];
    };
    gameLogs: GameLogEntry[];
  }

  interface CharacterSheet {
    name: string;
    class: string;
    level: number;
    attributes: {
      strength: number;
      dexterity: number;
      constitution: number;
      intelligence: number;
      wisdom: number;
      charisma: number;
    };
    derivedStats: {
      maxHp: number;
      currentHp: number;
      initiative: number;
    };
    skills: Record<string, number>;
    governedVectors: string[];
    inventory: string[];
  }

  interface GameLogEntry {
    timestamp: string;
    sender: 'system' | 'gm' | 'player';
    messageText: string;
    rollResult?: {
      formula: string;
      individualDice: number[];
      modifier: number;
      total: number;
    };
  }
  ```

---

# Project: Catalog Depth Overhaul (v3)

## Problem

The original registry was wide but shallow: ~10,500 entries with a median of
4 vectors per game, only 476 ad-hoc vectors, and 100% of vector explanations
generated from mail-merge templates by keyword heuristics
(`scripts/enrich_database.js`). A significant share of titles were
procedurally fabricated. The data could not support the project's stated
goal — querying which rulesets have explicit mechanics for a given subsystem.

## Architecture

1. **Canonical Taxonomy v2** — `data/taxonomy/<domain>.json` (26 domains,
   150+ subsystems, 1,500+ vectors, every vector carrying a written
   definition; see `data/taxonomy/FORMAT.md`). Bundled by
   `scripts/build_taxonomy.js` into `data/taxonomy.json`, which the app loads
   lazily to show canonical definitions in the Vector Dictionary and Vector
   Search panels. All 476 legacy vector names are preserved verbatim.
2. **Schema v2** — backward-compatible optional fields on GameRecord:
   `provenance` (curated | generated | imported), `designers`, `publisher`,
   `resolution_core`, `crunch` (1–5), `family`, `player_count`,
   `playtime_minutes`. See `data/SCHEMA.md`.
3. **Curated overlay pipeline** — fact-checked entries authored in
   `data/curated/*.json` (per `data/curated/AUTHORING.md`), validated by
   `scripts/validate_registry.js --strict` (≥12 vectors, ≥60-char
   game-specific explanations, required metadata), merged onto
   `registry.json` by `scripts/merge_curated.js` (id → title → append
   matching; rebuilds `registry_names.json`; stamps `provenance: generated`
   on legacy entries).
4. **UI surfacing** — curated ✓ badge on cards, provenance-aware metadata
   strip in the details modal, curated-count dashboard stat, canonical
   definitions in dictionary/vector views.

## Invariants

- Every `governed_vectors` entry in `registry.json` exists in
  `data/taxonomy.json` (`npm run data:validate` must exit 0).
- Legacy vector spellings are never renamed.
- `generated` entries are treated as unverified filler; research-grade
  claims come only from `curated` entries.
