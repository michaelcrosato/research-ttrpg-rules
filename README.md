# TTRPG & Board Game Rules Registry (Systems Indexer)

An exhaustive, highly searchable master registry of **10,000+ Tabletop Roleplaying Games (TTRPGs) and Board Games**, designed to let users instantly query which rulesets feature dedicated, explicit mechanics governing specific types of gameplay.

## 🚀 Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Build TypeScript source → dist/
npm run build

# 3. Serve locally (opens http://localhost:3000)
npm start

# 4. Run the test suite (151 tests, 8 suites)
npm test

# 5. Type-check without emitting
npm run typecheck
```

> **Note:** The app uses `fetch()` to load `registry.json`, so you **must** serve it over HTTP. Opening `index.html` directly from the filesystem will not work.

---

## 🗃️ Database Registry Structure

The database resides in `registry.json`. The registry normalizes game mechanics using a strict key-value serialization schema containing:
1. `game_id`: A unique, lowercase snake_case identifier (e.g., `dnd_5e`, `twilight_imperium_4e`).
2. `title`: The official full name of the ruleset.
3. `year`: Original publication year.
4. `medium`: Format category (`ttrpg` or `board_game`).
5. `primary_genre`: The overarching thematic classification.
6. `subgenres`: An array of auxiliary subgenres.
7. `governed_vectors`: An array of namespaced strings identifying every distinct gameplay element that has explicit mechanical governance.
8. `vector_explanations`: A mapping of each vector to its explicit implementation rules within that game.

### 🏷️ Taxonomy Notation
Vectors use a rigid `domain.subsystem.focus` notation. For example:
- `combat.melee.tactical`
- `stealth.detection.noise_radius`
- `economy.trading.barter`
- `simulation.environment.weather`
- `logistics.survival.rations`
- `politics.factions.loyalty`

---

## 💻 Rules Explorer Web Application

A premium, responsive, glassmorphic dark-mode search interface for high-fidelity querying of game rules.

### Source Files
- `index.html` — Semantic layout, dashboard, grid areas, modals, and form selectors
- `styles.css` — Glassmorphic panel designs, glow highlights, animations
- `src/app.ts` — Application logic (compiled to `dist/app.js`)
- `src/search-worker.ts` — Web Worker for non-blocking search (compiled to `dist/search-worker.js`)
- `src/types.ts` — TypeScript interfaces for all data models and worker protocols

### Build Pipeline
The project uses TypeScript with `strict: true`. Source files in `src/` are compiled to `dist/` via `tsc`, then a post-build script (`strip-exports.js`) removes module syntax for browser compatibility.

### 🌟 Key Features

1. **Dashboard Overview**: Tracks total indexed games, TTRPGs, board games, and unique governed vectors.
2. **Omni-Search Explorer Grid**: Filters the database by title, genre, subgenres, or vector tags. Year range sliders narrow publication eras. Click a card to open a detailed drawer.
3. **Vector Search Engine**: Search for a specific gameplay vector with autocomplete. Lists every ruleset governing that mechanic with implementation details.
4. **Venn Comparison Tool**: Choose any two games to run a set-intersection analysis with an interactive SVG Venn diagram showing shared/exclusive mechanics.
5. **Vector Dictionary**: Browsable index of all vectors categorized by domain (combat, stealth, logistics, etc.). Click an entry to see which games implement it.
6. **Database Editor**: Add new games directly into the registry. Select vectors, write explanations, compile JSON, and download the updated `registry.json`.
7. **OmniRuleset Sandbox** (AI): Select mechanical vectors to synthesize into a unified ruleset. A conflict checker detects incompatible mechanics, and an AI Game Master runs playtest sessions with dice rolling, combat, exploration, and social encounters.

---

## 🧪 Testing

```bash
npm test
```

Runs 8 test suites (151+ tests) covering:
- Smoke tests and E2E interaction scenarios
- Search worker unit tests
- Adversarial coverage gap tests
- Hierarchical UI tests
- TypeScript typings coverage verification
- OmniRuleset Sandbox module tests (conflict checker, dice rolling, action classification, character generation)

---

## 📁 Project Structure

```
├── index.html           # Application entry point
├── styles.css           # All CSS styles (glassmorphic theme)
├── registry.json        # Game database (10,000+ entries)
├── registry_names.json  # Flat metadata index
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript config (strict: true)
├── jest.config.js       # Jest test configuration
├── strip-exports.js     # Post-build script for browser compat
├── src/
│   ├── app.ts           # Main application logic
│   ├── search-worker.ts # Web Worker for search operations
│   └── types.ts         # TypeScript type definitions
├── tests/
│   ├── setup.js         # Test environment setup
│   ├── smoke.test.js    # Core smoke tests
│   ├── tier12.test.js   # Tier 1-2 integration tests
│   ├── tier34.test.js   # Tier 3-4 E2E and performance tests
│   ├── worker.test.js   # Search worker unit tests
│   ├── sandbox.test.js  # OmniRuleset Sandbox tests
│   └── ...
└── dist/                # Compiled JS output (gitignored)
```
