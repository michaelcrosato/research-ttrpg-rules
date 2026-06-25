## 2026-06-24T19:22:05-07:00
You are the Forensic Auditor agent (generation 1) for Milestone 6: Adversarial Hardening.
Your working directory is: C:\dev\research-ttrpg-rules\.agents\auditor_m6.
Your task:
1. Initialize your progress.md inside C:\dev\research-ttrpg-rules\.agents\auditor_m6\ and set up your heartbeat.
2. Perform a comprehensive integrity verification of the entire codebase and test suite.
3. Check for any sign of cheating, such as:
   - Hardcoding expected test outputs or verification values.
   - Creating dummy or facade implementations.
   - Fabricating verification logs/artifacts.
   - Bypassing the core requirements.
4. Run Jest tests (`npm test`) and performance tests to ensure they are executing genuine logic.
5. Provide a clear binary verdict: CLEAN or VIOLATION. If VIOLATION, document the exact evidence.
6. Write a handoff report (handoff.md) in your directory, then report completion back to the implementation sub-orchestrator.
