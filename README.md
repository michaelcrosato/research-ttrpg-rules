# TTRPG & Board Game Rules Registry (Systems Indexer)

A searchable master registry of **10,000+ Tabletop Roleplaying Games and Board Games**, built to answer one question precisely: *which rulesets have dedicated, explicit mechanics governing a specific type of gameplay?*

Every game is indexed against a **canonical mechanics taxonomy** (`data/taxonomy.json`) of **1,500+ defined vectors across 26 domains** — from `resolution.core_mechanic.pbta_2d6_tiers` to `actions.placement.worker_placement` to `mental.sanity.cthulhu_mythos_exposure` — each with a written definition of the mechanic it names.

## 🚀 Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Build TypeScript source → dist/
npm run build

# 3. Serve locally (opens http://localhost:3000)
npm start

# 4. Run the test suite
npm test

# 5. Type-check without emitting
npm run typecheck
```

> **Note:** The app uses `fetch()` to load `registry.json`, so you **must** serve it over HTTP. Opening `index.html` directly from the filesystem will not work.

---

## 🗃️ The Catalog

The database lives in `registry.json` as `{ "ttrpg": [...], "board_game": [...] }`. See [data/SCHEMA.md](data/SCHEMA.md) for the full record schema.

### Data provenance — read this before trusting an entry

Entries carry a `provenance` flag:

| Flag | Meaning |
|---|---|
| `curated` | Researched, fact-checked entry: real game, accurate designers/publisher/year, hand-written vector explanations describing the game's actual mechanics, plus rich metadata (`resolution_core`, `crunch`, `family`, `player_count`, `playtime_minutes`). |
| `generated` | Legacy synthetic entry. The title may be real (harvested from Wikipedia) or fabricated; its vectors were assigned by keyword heuristics and its explanations are templates. Useful as browsing filler — **not** as research data. |
| `imported` | Added through an in-app import connector (BGG, itch.io, DriveThruRPG, Wikipedia). |

The **curated core** — flagship TTRPGs (D&D editions, Pathfinder, Call of Cthulhu, Blades in the Dark, Burning Wheel, GURPS, Mörk Borg, …) and board games (Gloomhaven, Twilight Imperium 4, Spirit Island, Brass: Birmingham, Dominion, Twilight Struggle, …) — averages **20–30 vectors per game** with explanations that name the actual dice, tracks, phases, and currencies involved.

### 🏷️ Taxonomy v2

Vectors use a rigid `domain.subsystem.focus` notation. The canonical taxonomy is authored per-domain in `data/taxonomy/*.json` and bundled into `data/taxonomy.json`. The 26 domains:

- **TTRPG-leaning:** `resolution`, `character`, `magic`, `mental`, `combat`, `stealth`, `vehicles`, `exploration`, `downtime`, `equipment`, `narrative`, `campaign`, `meta`, `social`, `politics`, `simulation`, `logistics`
- **Board-game-leaning:** `economy`, `actions`, `cards`, `spatial`, `luck`, `deduction`, `scoring`, `turns`, `cooperation`

Every vector referenced by any game **must** exist in the taxonomy — enforced by the validator.

### 🔧 Data pipeline

```bash
npm run data:taxonomy   # bundle data/taxonomy/*.json → data/taxonomy.json (+ vector list)
npm run data:validate   # validate registry.json against schema v2 + taxonomy
npm run data:merge      # overlay data/curated/*.json onto registry.json (+ rebuild names index)
npm run data:stats      # catalog depth report (vectors/game, provenance, coverage)
```

Curated entries are authored in `data/curated/*.json` following [data/curated/AUTHORING.md](data/curated/AUTHORING.md) and validated strictly:

```bash
node scripts/validate_registry.js data/curated/<file>.json --strict
```

---

## 💻 Rules Explorer Web Application

A responsive, glassmorphic dark-mode search interface for high-fidelity querying of game rules.

### Source Files
- `index.html` — Semantic layout, dashboard, grid areas, modals, and form selectors
- `styles.css` — Glassmorphic panel designs, glow highlights, animations
- `src/app.ts` — Application logic (compiled to `dist/app.js`)
- `src/search-worker.ts` — Web Worker for non-blocking search
- `src/embeddings-worker.ts` — Web Worker for client-side semantic search
- `src/types.ts` — TypeScript interfaces for all data models and worker protocols

### Build Pipeline
TypeScript with `strict: true`. Source files in `src/` compile to `dist/` via `tsc`, then `strip-exports.js` removes module syntax for browser compatibility.

### 🌟 Key Features

1. **Dashboard Overview**: Total indexed games, TTRPGs, board games, unique governed vectors, and curated-entry count.
2. **Omni-Search Explorer Grid**: Filter by title, genre, subgenres, or vector tags; year-range sliders; click a card for a detail drawer. Curated entries carry a ✓ badge and show designers, publisher, core resolution engine, crunch rating, player count, and playtime.
3. **Vector Search Engine**: Search a specific gameplay vector with autocomplete; shows the canonical taxonomy definition plus every ruleset governing that mechanic with per-game implementation details.
4. **Vector Dictionary**: Browsable index of all vectors by domain, with canonical definitions.
5. **Venn Comparison Tool**: Set-intersection analysis of any two games' mechanics with an interactive SVG diagram.
6. **Database Editor + Import Hub**: Add games directly; import metadata from BGG, itch.io, DriveThruRPG, Wikipedia.
7. **OmniRuleset Sandbox** (AI): Synthesize selected vectors into a unified ruleset with conflict checking, an AI GM playtest chat, VTT battle map, and dice physics.
8. **Topology Graph, Diagnostics, OmniGit VCS, P2P lobbies, exporters** — see [PROJECT.md](PROJECT.md) for the full OmniRules v2.0 subsystem list.

---

## 🧪 Testing

```bash
npm test
```

20 suites covering smoke/E2E interactions, search worker units, adversarial coverage gaps, hierarchical UI, typings coverage, sandbox modules, PWA/IndexedDB caching, semantic search, VCS/homebrew, probability engine, and VTT multiplayer.

---

## 📁 Project Structure

```
├── index.html            # Application entry point
├── styles.css            # All CSS styles (glassmorphic theme)
├── registry.json         # Game database (10,000+ entries, provenance-flagged)
├── registry_names.json   # Flat metadata index (rebuilt by data:merge)
├── data/
│   ├── SCHEMA.md         # GameRecord schema v2 reference
│   ├── taxonomy.json     # Bundled canonical taxonomy (generated)
│   ├── taxonomy_vectors.txt  # Flat vector list (generated)
│   ├── taxonomy/         # Authored per-domain taxonomy files (+ legacy/ dumps)
│   └── curated/          # Curated entry batches + AUTHORING.md
├── scripts/
│   ├── build_taxonomy.js     # Bundle taxonomy
│   ├── validate_registry.js  # Schema + taxonomy validator (--strict for curated)
│   ├── merge_curated.js      # Overlay curated entries onto registry.json
│   ├── stats.js              # Catalog depth report
│   └── *_database.js         # Legacy Wikipedia harvest scripts
├── src/                  # TypeScript app + workers
├── tests/                # Jest suites
└── dist/                 # Compiled JS output (gitignored)
```
