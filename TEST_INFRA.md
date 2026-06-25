# Test Infrastructure Strategy: OmniRules v2.0

This document details the client-side testing strategy, mocking architecture, and the 4-tier test suite design for all 19 subsystems across the 7 milestones of OmniRules v2.0.

---

## 1. Test Philosophy

Our testing framework is built upon three core pillars:
- **Opaque-Box Testing**: We test features via their public APIs, DOM interactions, and message protocols rather than validating private class states. If a user action changes the screen or triggers a message, our test asserts on that visible state change or message payload.
- **Requirement-Driven**: Every test case directly traces back to specific subsystem requirements. If a subsystem requires a visual highlight during a conflict, a test verifies that HTML class.
- **Mock-Driven Decoupling**: Because we run in a JSDOM environment within Jest, high-overhead physical resources (WebGPU, client-side ML pipelines, network fetch operations, P2P signaling, and external APIs) are isolated and replaced with deterministic, local mocks that run quickly and reliably.

---

## 2. Subsystems Testing Strategy

Each of the 19 subsystems defined in our project plan is verified through dedicated local execution or mock environments:

1. **Interactive Mechanics Topology Graph Analyzer**
   - *Testing Strategy*: Render tests within JSDOM. Canvas/SVG render calls are intercepted, and interactive hover/click behaviors are verified by dispatching PointerEvents and checking detail drawer states and tooltips.
   - *Execution*: Local JSDOM.

2. **Local Semantic Embedding Search Engine**
   - *Testing Strategy*: Verification of semantic query routing to background threads. The underlying embedding model is replaced with a static embedding resolver.
   - *Execution*: Local JSDOM & Web Worker mocking.

3. **Offline-First PWA & IndexedDB Search Index Caching**
   - *Testing Strategy*: Caching flow verified using an in-memory IndexedDB mock and service worker fetch event interception.
   - *Execution*: Local JSDOM with mock caching layer.

4. **Local WebGPU Sandbox VTT & LLM Playtest GM**
   - *Testing Strategy*: WebGPU initialization, dice physics calculation, LLM chat formatting, and turn tracking state validation.
   - *Execution*: Local JSDOM with mock WebGPU and LLM stream APIs.

5. **OmniGit Mechanical Version Control System**
   - *Testing Strategy*: Verification of Git-like operations (commit, checkout, branch, merge, diffs, conflicts) against an in-memory VcsState structure.
   - *Execution*: Local execution on Node.js/JSDOM.

6. **Local Dependency Bundling & CDN Decoupling**
   - *Testing Strategy*: Static analysis checks of output bundles and index.html to ensure 100% decoupling from online CDN providers.
   - *Execution*: Static path analyzer tool running in test suite.

7. **Database Fetch & Worker Optimization**
   - *Testing Strategy*: Verifying registry data load pipelines, indexing trigger timings, and progressive rendering limits.
   - *Execution*: Local JSDOM with fake timers.

8. **Advanced Glassmorphic UI/UX Polish**
   - *Testing Strategy*: Event transition state validations, shimmer loading card visual state checks, and responsive layout bounds testing.
   - *Execution*: Local JSDOM element class checking.

9. **Gaming DSL & AST Execution Engine**
   - *Testing Strategy*: Unit tests parsing mathematical expressions and AST structures. Rules syntax parses into trees and dice rolls calculate correctly.
   - *Execution*: Native Node.js execution.

10. **Logical Consistency Solver**
    - *Testing Strategy*: Submitting conflicting game mechanics rules and verifying the solver highlights paradoxes and returns correct error payloads.
    - *Execution*: Local execution.

11. **Memory & Performance Diagnostics Dashboard**
    - *Testing Strategy*: Performance telemetry tests monitoring FPS counters, memory allocation logs, and latency metrics aggregation.
    - *Execution*: Local JSDOM with mocked performance APIs.

12. **Monte Carlo Simulation Testing**
    - *Testing Strategy*: Automated combat/skill headless playtest simulation running 10,000 matches in-memory with deterministic pseudo-random seeds.
    - *Execution*: Headless local execution.

13. **WebRTC Peer-to-Peer Playtest Lobbies**
    - *Testing Strategy*: Peer connection handshake, chat, character sheets sync, and consensus validation.
    - *Execution*: Local JSDOM using a mock RTC channel.

14. **AI-Driven Game Balance Telemetry Engine**
    - *Testing Strategy*: Simulation testing that compares win rates, round durations, and choice options to generate playtest telemetry reports.
    - *Execution*: Local execution.

15. **Isometric Canvas VTT Battle Map**
    - *Testing Strategy*: Click coordinate translations, distance checks, line-of-sight calculations, and attack ranges validation.
    - *Execution*: Canvas context rendering instructions tracking.

16. **Multi-Platform Import Connectors**
    - *Testing Strategy*: Mocking third-party endpoints (itch.io, DriveThruRPG, Wikipedia) to ensure incoming formats map correctly to our internal database schema.
    - *Execution*: Mock fetch interceptors.

17. **VTT & Document Exporters**
    - *Testing Strategy*: Validating JSON and PDF exports against target schemas (FoundryVTT, Roll20, Tabletop Simulator, PDF layout builders).
    - *Execution*: Schema validator checks.

18. **Homebrew Creator Workspace**
    - *Testing Strategy*: Checking that drafts are correctly saved to IndexedDB and overlaid atop the base registry in search/VTT.
    - *Execution*: Local execution using fake-indexeddb.

19. **Math Probability Curves Analyzer**
    - *Testing Strategy*: Verifying step/exploding dice pool calculation mathematics, ensuring correct PDF/CDF coordinate curves.
    - *Execution*: Unit tests checking calculated coordinate arrays.

---

## 3. Test Architecture & Mocks

To execute tests successfully in a JSDOM environment, we implement specific architectural mocks:

- **JSDOM WebGPU Mock**: Mocks `navigator.gpu` to simulate adapters, devices, shader modules, and render pipelines. The dice physics model falls back to a 2D coordinate translator.
- **Transformers.js Mock**: Replaces the Xenova model loader. Maps input strings to pre-calculated embedding float vectors.
- **IndexedDB Mock**: Uses `fake-indexeddb` to run an in-memory IndexedDB database, checking key-value storage, indexes, and schema upgrades.
- **WebRTC Channel Mock**: Replaces `RTCPeerConnection` with a local loopback connector that transfers messages directly between two simulated clients.
- **Fetch Interceptor / MSW**: Catches API requests to external platforms (itch.io, DriveThruRPG, Wikipedia) and returns mock JSON data.
- **Canvas 2D Context Mock**: Stubs drawing commands (`lineTo`, `arc`, `stroke`) and simulates mouse coordinates translation.

---

## 4. Tier 1: Feature Coverage (>= 25 Tests)

### Requirement R1: Topology Graph
1. **F1-01: Graph Rendering Container**: Verify that the topology SVG/Canvas element is injected into the DOM upon tab activation.
2. **F1-02: Domain Color Coding**: Assert that nodes belonging to `combat.*` have a distinct accent color CSS class compared to `economy.*` nodes.
3. **F1-03: Search-Focus Zoom**: Validate that searching for a vector triggers a focus zoom function, centering the graph view on the target node.
4. **F1-04: Tooltip Visibility**: Check that dispatching a hover event on a node shows a glassmorphic tooltip with similarity score data.
5. **F1-05: Detail Drawer Update**: Verify that clicking a node element updates the sidebar details drawer with the node's full mechanical explanation.

### Requirement R2: Semantic Search
6. **F2-01: Embeddings Worker Launch**: Confirm that the main thread successfully initializes `embeddings-worker.ts` when semantic search is requested.
7. **F2-02: Progress Indicator rendering**: Verify that a loader progress bar is visible in the DOM while the model weights are loading.
8. **F2-03: Natural Language Querying**: Assert that submitting "survival crafting" triggers an embeddings query request to the worker.
9. **F2-04: Cosine Similarity Sorting**: Verify that search result cards are sorted in descending order of similarity score.
10. **F2-05: Autocomplete Suggestion List**: Assert that semantic autocomplete returns matching vector suggestions in the UI.

### Requirement R3: Offline PWA & IndexedDB
11. **F3-01: Service Worker Register**: Assert that the main script attempts service worker registration on startup.
12. **F3-02: Service Worker Cache Match**: Mock a network-offline condition and verify that fetch requests return cached local assets.
13. **F3-03: IndexedDB Index Store**: Verify that initializing the search database writes the FlexSearch index cache into IndexedDB.
14. **F3-04: IndexedDB Fast Bootstrap**: Confirm that secondary page loads retrieve cached indices from IndexedDB and bootstrap in under 200ms.
15. **F3-05: Progressive Rendering FPS**: Validate that chunk rendering limits individual DOM injection jobs to 16ms slices to preserve 60 FPS fluidity.

### Requirement R4: WebGPU Sandbox & LLM GM
16. **F4-01: VTT Container Layout**: Verify that the VTT Sandbox tab contains the GM Chat, Character Sheet, and Dice Log panels.
17. **F4-02: Dynamic Attribute Calculation**: Confirm that selecting the `combat.melee` vector dynamically updates the strength and max HP modifier on the VTT sheet.
18. **F4-03: GM Chat Stream**: Verify that user chat submissions append to the log and trigger a mock GM response.
19. **F4-04: Dice Formula Parser**: Assert that inputs like `2d6 + 3` are successfully parsed and resolved to values between 5 and 15.
20. **F4-05: Combat Turn Progression**: Verify that clicking "Next Turn" increments the active combatant index in the turn tracker.

### Requirement R5: OmniGit VCS
21. **F5-01: Branch Creation**: Verify that the VCS creates a new branch state with a copy of the parent branch commits.
22. **F5-02: Edit Staging**: Confirm that editing a game record rules description adds it to the staged changes index.
23. **F5-03: Commit Creation**: Assert that committing staged changes clears the staging index and appends a commit block to history.
24. **F5-04: Conflict Detection**: Verify that merging two branches that modified the same field on the same game fails and flags a merge conflict.
25. **F5-05: Patch Export**: Assert that calling `exportJSONDiff` generates a valid JSON diff file available for client-side download.

---

## 5. Tier 2: Boundary & Corner Cases (>= 25 Tests)

### Requirement R1: Topology Graph
1. **B1-01: Zero Nodes Layout**: Assert that an empty database triggers a placeholder "No Nodes Found" message without crashing the canvas renderer.
2. **B1-02: Unclassified Domain namespaces**: Verify that nodes with unknown domains default to a generic fallback neutral theme color.
3. **B1-03: Extreme Zoom Boundary**: Check that zoom operations are clamped between minimum (0.1x) and maximum (10x) limits.
4. **B1-04: Out-of-Bounds Coordinates**: Verify that panning limits prevent the user from dragging the graph completely off-screen.
5. **B1-05: Rapid Click Race Condition**: Confirm that rapidly clicking multiple nodes in succession correctly cancels previous detail load jobs and renders only the last clicked node.

### Requirement R2: Semantic Search
6. **B2-01: Empty Query Input**: Assert that submitting a semantic search query consisting only of whitespace fails validation and returns the full database.
7. **B2-02: Massive Query Size**: Verify that queries longer than 2048 characters are truncated before processing to prevent memory spikes.
8. **B2-03: Special Characters Handling**: Ensure that inputs containing mathematical characters or HTML tags are sanitized and don't break the worker parser.
9. **B2-04: Out-of-Vocabulary Terms**: Verify that queries containing completely random gibberish resolve to similarity scores close to zero rather than throwing errors.
10. **B2-05: Worker Crash Recovery**: Assert that if the semantic worker terminates unexpectedly, the main thread displays a fallback status and allows standard search.

### Requirement R3: Offline PWA & IndexedDB
11. **B3-01: Corrupted IndexedDB Schema**: Confirm that if the IndexedDB cache version is outdated or corrupted, the system deletes it, recreates it, and fetches raw data.
12. **B3-02: Storage Quota Exceeded**: Verify that the application falls back gracefully without breaking if the browser rejects IndexedDB write operations due to space limits.
13. **B3-03: Network Flakiness**: Ensure that the service worker handles transitions between online, intermittent offline, and offline states without double-fetching assets.
14. **B3-04: Service Worker Activation Failure**: Confirm that if the service worker registration fails, the application continues to load via normal network routes.
15. **B3-05: Progressive Rendering Interruption**: Check that switching tabs during a progressive rendering chunk schedule instantly cancels all pending frame jobs.

### Requirement B4: WebGPU Sandbox & LLM GM
16. **B4-01: Extreme Dice Quantities**: Confirm that attempting to roll `10000d6` triggers a limit validation warning, capping rolls to 100 max dice.
17. **B4-02: Zero-Sided Dice**: Assert that formulas like `1d0` or `1d-1` are rejected by the parser and throw user-friendly error logs.
18. **B4-03: WebGPU Hardware Absence**: Ensure that if WebGPU initialization fails (e.g. unsupported browser), the dice roller falls back to CSS-based 2D rolling.
19. **B4-04: LLM API Timeout**: Verify that if the GM response times out, the chat log appends an error message and updates the retry button.
20. **B4-05: Out-of-Bounds Stats**: Verify that character attribute changes are clamped between minimum 0 and maximum 30 to prevent breaking sheet layouts.

### Requirement R5: OmniGit VCS
21. **B5-01: Duplicate Branch Names**: Verify that attempting to create a branch with a name that already exists is blocked.
22. **B5-02: Invalid Branch Characters**: Assert that special characters like `\`, `?`, or spaces are rejected in branch names.
23. **B5-03: Merging Identical Branches**: Verify that merging a branch with no changes relative to the target is completed immediately as a no-op.
24. **B5-04: Empty Commit Block**: Assert that committing when no modifications are staged returns an error and does not write a commit.
25. **B5-05: Checkout Staged Changes**: Verify that checking out a new branch with unstaged modifications warns the user and prompts them to stage or discard.

---

## 6. Tier 3: Cross-Feature Combinations (>= 5 Tests)

1. **C-01: Semantic Search Focuses Graph**: Verify that executing a natural language search focusing on a specific mechanics category centers and zooms the Topology Graph on the matching node cluster.
2. **C-02: VCS Commit Updates Cache**: Assert that committing an edit to a game record in the Version Control panel triggers an eviction of the IndexedDB cache and schedules search worker re-indexing.
3. **C-03: Offline Semantic Search**: Verify that under service worker offline mock conditions, semantic search successfully executes by reading the model weights and embedding maps stored in IndexedDB.
4. **C-04: VTT Reads Active Branch**: Confirm that the LLM GM sandbox reads rulesets directly from the currently active OmniGit VCS branch state, ensuring branch-level edits are simulated in VTT chat playtests.
5. **C-05: Graph Deletion Stages VCS Change**: Verify that deleting a mechanical vector node inside the Topology Graph interface automatically stages a deletion record in the OmniGit VCS workspace.

---

## 7. Tier 4: Real-world Application Scenarios (>= 5 Tests)

1. **S-01: Campaign Ruleset Authoring & Playtest**:
   - A game designer creates a custom ruleset combining `combat.melee.dice_rolls` and `economy.market.worker_placement`.
   - The system checks for compatibility conflicts.
   - The designer initializes the VTT playtest sandbox.
   - The LLM GM moderates a combat turn, processes a virtual d20 roll, and deducts HP from the character sheet.
2. **S-02: Sci-Fi System Branching & Export**:
   - A researcher creates a branch named `sci-fi-adaptation` from the master rules database.
   - They modify 5 existing fantasy vector descriptions to match sci-fi tropes.
   - They visually inspect the new domain clustering layout in the Topology Graph.
   - They export the changes as a JSON Diff Patch, verifying that the exported file contains only the 5 modified records.
3. **S-03: Complete Offline Play Session**:
   - A user opens the PWA with network access completely disabled.
   - The service worker loads the page and assets.
   - The user executes natural language semantic queries, finding similar games.
   - The user launches a dice-rolling playtest session in the sandbox VTT, running offline-first calculations.
4. **S-04: Collaborative Branch Merging & Conflict Resolution**:
   - Developer A branches from master to add "Tactical Combat" rules.
   - Developer B branches from master to add "Rules-Light Combat" rules.
   - The coordinator attempts to merge both branches into master.
   - The VCS UI displays the conflict resolution panel showing overlapping line diffs.
   - The coordinator selects Developer A's ruleset, successfully updates the master repository, and checks the new VTT layout.
5. **S-05: Diagnostics Profiling & Rendering Stress**:
   - The diagnostic dashboard is activated.
   - The search engine executes rapid semantic queries while the user is zooming the 10,000-node Topology Graph.
   - The test validates that rendering frame budgets remain under 16.6ms (60 FPS) and memory footprints do not leak listeners.
