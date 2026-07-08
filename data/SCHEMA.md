# Game Record Schema v2

`registry.json` holds `{ "ttrpg": GameRecord[], "board_game": GameRecord[] }`.
Curated overlay files in `data/curated/*.json` hold a bare `GameRecord[]` (or
`{ "games": GameRecord[] }`) and are merged with `npm run data:merge`.

## Required fields (v1, unchanged)

| Field | Type | Notes |
|---|---|---|
| `game_id` | string | unique, lowercase snake_case, usually `<title>_<year>` |
| `title` | string | official full name |
| `year` | integer | original publication year (1800–2027) |
| `medium` | `"ttrpg"` \| `"board_game"` | |
| `primary_genre` | string | overarching thematic classification |
| `subgenres` | string[] | auxiliary subgenres |
| `governed_vectors` | string[] | `domain.subsystem.focus` keys; every one MUST exist in `data/taxonomy.json` |
| `vector_explanations` | Record<vector, string> | one entry per governed vector describing how THIS game implements it |

## Optional fields (v2)

| Field | Type | Notes |
|---|---|---|
| `provenance` | `"curated"` \| `"generated"` \| `"imported"` | `curated` = human/AI-researched, fact-checked entry. `generated` = legacy synthetic data — treat mechanics info as unverified. |
| `designers` | string[] | lead designer(s) |
| `publisher` | string | original/current publisher |
| `resolution_core` | string | one-line summary of the core resolution engine, e.g. `"d20 + modifiers vs. Difficulty Class"` |
| `crunch` | integer 1–5 | rules weight: 1 = ultralight, 5 = very heavy |
| `family` | string | design lineage, e.g. `"pbta"`, `"d20"`, `"forged_in_the_dark"`, `"year_zero"`, `"brp"`, `"osr"` |
| `player_count` | `{min, max}` | recommended player count including GM |
| `playtime_minutes` | `{min, max}` | typical session length |

## Curated entry quality bar (`--strict` validation)

- `provenance: "curated"`, ≥ 12 governed vectors, explanations ≥ 60 chars.
- `designers`, `publisher`, `resolution_core` required.
- Explanations must be **specific to the game** — name the actual mechanic
  (dice, tracks, phases, currencies) rather than restating the vector name.

## Workflow

```bash
npm run data:taxonomy                     # bundle data/taxonomy/*.json -> data/taxonomy.json
node scripts/validate_registry.js data/curated/foo.json --strict
npm run data:merge                        # overlay curated entries onto registry.json
npm run data:validate                     # validate the merged registry
npm run data:stats                        # depth report
```
