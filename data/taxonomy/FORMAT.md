# Taxonomy Domain File Format (v2)

Each file `data/taxonomy/<domain>.json` defines one vector domain. The bundler
(`scripts/build_taxonomy.js`) merges all domain files into `data/taxonomy.json`.

## File shape

```json
{
  "domain": "magic",
  "description": "Rules governing supernatural power: how it is acquired, cast, fueled, and what it costs.",
  "applies_to": ["ttrpg"],
  "subsystems": {
    "casting": {
      "description": "How spells or powers are activated during play.",
      "focuses": {
        "spell_slots": "Casters prepare or know spells and expend limited per-rest slots by level to cast them (D&D-style Vancian casting).",
        "mana_points": "Casting spends a numeric energy pool; bigger effects cost more points, and the pool recovers with rest or time."
      }
    }
  }
}
```

## Rules

1. **Vector identity** is `domain.subsystem.focus`. All three segments are
   lowercase `snake_case`. Never use dots inside a segment.
2. **Definitions** (focus values) are 1–2 full sentences, written generically —
   they describe the *mechanic*, not one specific game. Naming an archetypal
   example in parentheses is encouraged (e.g. "(as in Blades in the Dark)").
   Never leave a definition empty or write placeholder text.
3. **Legacy vectors**: if `data/taxonomy/legacy/<domain>.json` exists, every
   vector listed there MUST appear in the domain file, with a real definition.
   Legacy vectors keep their exact spelling even when awkward — game entries
   reference them. New vectors must not duplicate the meaning of an existing
   focus within the same subsystem; prefer widening coverage over synonyms.
4. **`applies_to`** is `["ttrpg"]`, `["board_game"]`, or both. It is advisory
   (search/filter hinting), not enforced against games.
5. **Subsystem descriptions** are one sentence.
6. Keep each domain file self-contained and valid JSON (UTF-8, no comments).
