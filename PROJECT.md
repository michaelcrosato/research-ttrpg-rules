# Project: Rules Explorer Flagship Upgrade

## Architecture
The Rules Explorer / Systems Indexer is a client-side web application designed to handle high-performance omni-search, filtering, and Venn comparison queries across TTRPG and board game rulesets.

### Major Subsystems
1. **Core Database Registry (`registry.json`)**: Contains 10,000+ real games, mapped to deep hierarchical vector taxonomy (e.g. `combat.melee.tactical`) with detailed rules explanations.
2. **Search Worker (`src/search-worker.ts` -> compiled to `dist/search-worker.js`)**: A dedicated Web Worker performing in-memory FlexSearch indexing, query lookups, autocomplete recommendations, and optimized Venn comparison computations.
3. **Application Thread (`src/app.ts` -> compiled to `dist/app.js`)**: Manages the UI lifecycle, user input handling with debouncing, progressive chunk rendering for large datasets to maintain a 60 FPS main thread, and interactions with the search worker.
4. **Venn Visualization SVG**: An interactive SVG-based representation of overlapping mechanical regions, dynamically adjusting based on selections with tooltips and clickable segments.
5. **Glassmorphic Dark Styling (`styles.css`)**: Premium dark theme with glassmorphic cards, typography (Outfit/Inter), neon/accent colors, and micro-animations.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Global Setup & Plan Verification | Establish Project-wide plan and verify existing codebase state and test outcomes. | None | PLANNED |
| 2 | TypeScript Migration | Convert `search-worker.js` and `app.js` to strictly typed TypeScript (`strict: true`), compiling to `dist/`. | 1 | PLANNED |
| 3 | UI/UX Overhaul & SVG Venn | Implement dark glassmorphic design, custom fonts, transitions, and SVG Venn comparison tool with interactive tooltip hover cards. | 1 | PLANNED |
| 4 | Verification & Audit | Validate performance latencies (search < 10ms, Venn < 100μs), 60 FPS fluidity, 10k database verification, Jest tests, and run Forensic Integrity Audit. | 2, 3 | PLANNED |

## Interface Contracts
### App ↔ Search Worker Message Protocol
- Messages to worker (`SearchWorkerRequest`):
  - `'init'`: Setup databases and load FlexSearch index.
  - `'search'`: Search with filter criteria.
  - `'autocomplete'`: Suggest gameplay vectors or game titles.
  - `'compare'`: Compute set intersection and differences between two games.
  - `'dictionary'`: Get vector lists for a domain or specific vector.
  - `'addGame'`: Insert new game ruleset.
- Messages from worker (`SearchWorkerResponse`):
  - `'ready'`: Worker initialized with database stats.
  - `'searchResults'`: Matching games and search latency.
  - `'autocompleteResults'`: Suggestions list.
  - `'compareResults'`: Shared vectors, unique vectors A, and unique vectors B.
  - `'dictionaryResults'`: Vector registry metadata.
  - `'addGameDone'`: Attestation of successful insertion.
  - `'error'`: Diagnostic details on failure.

## Code Layout
- `src/app.ts`: Frontend application script (UI controller).
- `src/search-worker.ts`: Web Worker script (In-memory search engine).
- `src/types.ts`: Core type interfaces and message contracts.
- `dist/app.js`: Compiled application script loaded by index.html.
- `dist/search-worker.js`: Compiled worker script.
- `tsconfig.json`: TypeScript configuration.
- `registry.json`: Master database.
- `styles.css`: Stylesheet.
