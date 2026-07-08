# Curated Entry Authoring Guide

Curated entries are the fact-checked core of the registry. Every claim in a
curated entry must be true of the real, published game.

## Hard rules

1. **Real games only.** Verify title, original publication year, designers,
   and publisher are correct. If unsure of a fact, use the most widely cited
   value; never invent editions.
2. **Schema**: see `data/SCHEMA.md`. Files are a bare JSON array of
   GameRecords. Required v2 fields for curated entries: `provenance:
   "curated"`, `designers`, `publisher`, `resolution_core`, `crunch`,
   `player_count`, `playtime_minutes`; add `family` when the game belongs to a
   recognized lineage (`pbta`, `forged_in_the_dark`, `d20`, `osr`, `brp`,
   `year_zero`, `gumshoe`, `fate`, `storyteller`, `2d20`, `deckbuilder`, ...).
3. **Vectors** (15–40 per game): pick ONLY from `data/taxonomy_vectors.txt`
   (grep it — never invent a vector). Select vectors the game has *explicit,
   dedicated rules* for — not things it merely permits. A crunchy game
   typically governs 25–40 vectors; an ultralight one 15–20.
4. **Explanations**: 1–3 sentences per vector, ≥60 chars, describing how THIS
   game implements the mechanic. Name the actual dice, tracks, currencies,
   phases, moves, or tables ("position/effect", "stress boxes", "usage die
   d6→d4", "6 workers on 30 action spaces"). If you catch yourself writing a
   sentence that would be true of any game, delete it and be specific.
5. **`resolution_core`** is one line, e.g. `"2d6 + stat; 10+ hit, 7-9 partial
   (PbtA)"`, `"d100 roll-under skill (BRP)"`, `"open-outcry auction + tile
   placement"`.
6. **`crunch`**: 1 ultralight (Lasers & Feelings), 2 light (Blades), 3 medium
   (D&D 5e), 4 heavy (Pathfinder 2e), 5 very heavy (GURPS w/ options,
   Aftermath).
7. **Genres**: prefer the existing vocabulary — Adventure, Fantasy, Sci-Fi,
   Horror, Narrative, Steampunk, Urban Fantasy, Modern Fantasy,
   Science-Fantasy, Cyberpunk, Post-Apocalyptic, Modern, Strategy, Wargame,
   Abstract Strategy, Economic, Party, Cooperative. New genres (Historical,
   Superhero, Mystery, Western) are allowed when clearly better.
8. **game_id**: lowercase snake_case `<title>_<year>` of the edition covered.

## Validation loop (mandatory)

```bash
node scripts/validate_registry.js data/curated/<your-file>.json --strict
```

Fix every error until it reports `0 errors`. Do not finish with a failing file.
