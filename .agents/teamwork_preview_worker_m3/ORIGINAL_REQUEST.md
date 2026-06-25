## 2026-06-25T02:58:00Z
Update app.js and write tests to support combined sub-vector explanations in the dictionary query view.
Specifically:
1. In `app.js` (inside `handleWorkerDictionaryResults` around line 560):
   - Modify the logic that retrieves the explanation `rule` for each game in the `vector-game-list`. If `vectorName` is a parent namespace, look through the game's `vector_explanations` object keys. Find any key `k` that is exactly equal to `vectorName` or starts with `vectorName + '.'`. Combine their explanations by formatting them as `<strong>${k}</strong>: ${explanation}` and joining them with double line breaks (`<br/><br/>`). If no explanations match, fall back to "No detailed rule explanation recorded.".
2. Write unit/integration tests (either inside a new file `tests/hierarchical_ui.test.js` or by appending to `tests/tier12.test.js`) that:
   - Simulate a dictionary/vector query lookup on a parent namespace (e.g. `combat`).
   - Verify that games containing sub-vectors (e.g. `combat.melee.tactical`) are matched and displayed.
   - Verify that the rendered HTML contains the sub-vector key and its specific game-specific explanation text.
3. Run `npm test` to ensure that all Jest tests (including your new tests) pass.
4. Write a summary and test/verification outcomes to your metadata folder at `C:\dev\research-ttrpg-rules\.agents\teamwork_preview_worker_m3\handoff.md`.
