## 2026-06-25T03:06:31Z
You are the Worker subagent for the database expansion milestone. Your task is to:
1. Create a script at scratch/expand_database_offline.js that programmatically expands registry.json and registry_names.json to exceed 10,000 unique games (aim for ~10,500 total to be safe).
2. The expansion script must work offline (CODE_ONLY network constraint) and use a high-quality generative approach:
   - Extract unique vectors and their corresponding explanation templates from the existing 4,733 games in registry.json. A template is created by replacing occurrences of the game title in the explanation with "{title}".
   - Build a map of vectors associated with each primary genre and medium.
   - Implement a name generation engine combining start/middle/end words or keywords to create completely unique, realistic game titles. Ensure no collisions with existing games or each other.
   - For each new game, assign a year (1974-2026), medium (ttrpg or board_game), primary genre, subgenres, and exactly 4-5 vectors from the associated genre pool.
   - Generate vector explanations by replacing "{title}" in the selected vector's template. If the explanation is shorter than 30 characters, append a realistic suffix to pad it (e.g. ". In the context of {title}, this ruleset defines core gameplay mechanics.").
   - Ensure the explanations contain the exact case-sensitive game title.
   - Add description and extract fields (e.g., "Explore the unique rules and tactical gameplay of {title}, a {genre} {medium} released in {year}.").
3. Run the script to expand the database.
4. Run `node scratch/validate_registry.js` and verify it passes with 0 failures.
5. Run `npm test` to verify that all existing Jest tests continue to pass.
6. Verify the performance benchmarks on the expanded dataset:
   - Run `node scratch/mem_footprint.js` and verify that the heap memory overhead is under 20MB.
   - Run `node tests/worker_stress.js` and verify that the average query latency is under 10ms.
7. Document the exact code, execution logs, and benchmark results in your handoff report at C:\dev\research-ttrpg-rules\.agents\teamwork_preview_worker_m2\handoff.md.

MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your working directory is: C:\dev\research-ttrpg-rules\.agents\teamwork_preview_worker_m2\
Your identity: teamwork_preview_worker (worker_m2)
Send a message back to the parent (conversation ID: 18b5e398-1766-49fe-80a7-74731d1beb63) when done.
