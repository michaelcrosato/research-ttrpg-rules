## 2026-06-25T02:53:30Z
Enrich the registry database and fix static templates to meet all schema, density, and game-specificity requirements.
Specifically:
1. Examine `build_database.js` at line 82 (or where `stealth.action.hide` is defined) and fix the static template to include title interpolation: e.g. "Includes specific stealth actions to hide from hostiles in " + title + ", matched against perception thresholds." or similar.
2. Write a Node.js script `scratch/enrich_database_fix.js` to process `registry.json` and:
   - Identify manually curated games vs automatic ones (as done in `enrich_database.js`).
   - For all games that need reprocessing, run the classification logic.
   - Ensure that EVERY game has a non-empty `governed_vectors` array.
   - Ensure that at least 85% of all games have 4 or more unique governed vectors. For games that fall short (especially board games), apply fallback vectors with title-interpolated game-specific explanations:
     - TTRPG fallbacks: `combat.melee.tactical`, `combat.ranged.tactical`, `character.character_creation.class_based`, `combat.initiative.dexterity_based`.
     - Board game fallbacks: `economy.management.resource_allocation`, `character.progression.victory_points`, `combat.movement.grid_based`, `economy.management.card_drafting`.
   - Perform a correction pass over all explanations. If any explanation is static (does not contain the game title), replace it with a dynamic, game-specific explanation including the game title.
   - Ensure every explanation in `vector_explanations` is at least 30 characters long.
   - Save the updated database to `registry.json`.
3. Create a validation script `scratch/validate_registry.js` that:
   - Programmatically verifies all acceptance criteria for the database:
     a. Every entry in `registry.json` has a non-empty `governed_vectors` array and matching keys in `vector_explanations`.
     b. The global catalog has at least 300 unique hierarchical vectors.
     c. At least 85% of games map to 4 or more unique governed vectors.
     d. Each explanation string is at least 30 characters in length.
     e. Each explanation string contains the game title.
   - Exits with code 0 on success, or code 1 on failure with detailed printouts.
4. Run `node scratch/enrich_database_fix.js` to perform the migration, then run `node scratch/validate_registry.js` to verify integrity.
5. Run `npm test` to verify all existing Jest tests continue to pass.
6. Write a summary and test/verification results to your metadata folder at `C:\dev\research-ttrpg-rules\.agents\teamwork_preview_worker_m1\handoff.md`.
