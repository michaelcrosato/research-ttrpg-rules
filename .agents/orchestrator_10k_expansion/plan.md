# Project: Tabletop and Board Game Rules Registry 10k Expansion

## Architecture
- `registry.json`: JSON database containing `ttrpg` and `board_game` arrays of game objects.
- `registry_names.json`: Simplified flat list of titles, years, primary genres, and mediums.
- `app.ts` / `app.js` and `search-worker.ts` / `search-worker.js`: Frontend application and search worker thread that loads and indexes the registry.
- `tests/`: Jest test files including performance, correctness, and schema tests.
- `scratch/validate_registry.js`: Verifies registry integrity.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Explore current database & test suite | Run explorer to analyze existing registry size, structures, and tests. | None | PLANNED |
| 2 | Design and implement database expansion script | Develop script to programmatically expand the database to 10k+ entries with metadata and vector explanations, respecting the offline network constraint. | M1 | PLANNED |
| 3 | Execute database expansion | Run the expansion script to produce 10k+ unique games in registry.json and registry_names.json. | M2 | PLANNED |
| 4 | Schema and test verification | Run validate_registry.js and the Jest test suite to ensure compile-time and run-time correctness. | M3 | PLANNED |
| 5 | Performance & Memory validation | Measure query latency (<10ms), worker heap size (<20MB), and UI thread responsiveness. | M4 | PLANNED |

## Interface Contracts
- Game entry in `registry.json` must match:
  - `game_id`: string
  - `title`: string
  - `year`: number
  - `medium`: "ttrpg" | "board_game"
  - `primary_genre`: string
  - `subgenres`: string[]
  - `governed_vectors`: string[]
  - `vector_explanations`: Record<string, string>
  - `description`: string
  - `extract`: string
