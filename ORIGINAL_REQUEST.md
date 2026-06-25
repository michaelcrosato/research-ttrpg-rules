# Original User Request

## Initial Request — 2026-06-25T03:26:40Z

Build the OmniRuleset Engine: a forward-thinking simulation and synthesis platform that uses LLMs (mocked or integrated) to merge, reconcile, and generate a single unified ruleset from any combination of the 10,000+ indexed mechanical vectors, offering an AI-driven playtest sandbox shell in the UI.

Working directory: C:\dev\research-ttrpg-rules
Integrity mode: development

## Requirements

### R1. Dynamic Rules Synthesis Sandbox
Develop a rules synthesis sandbox interface in the explorer application. Users can select multiple rules vectors or games and click a "Synthesize Ruleset" button, which triggers an LLM generation pipeline to produce a unified, coherent, and conflict-resolved game rules sheet.

### R2. AI-Driven Playtest Sandbox & GM Automation
Create an interactive text-based Playtest Sandbox UI. Users can test the generated rules in a simulated game scenario where an automated AI Game Master processes user actions, enforces the combined ruleset mechanics, and rolls virtual dice.

### R3. Structural Conflict Analysis Module
Implement a pre-synthesis validator that detects mechanical inconsistencies among selected vectors (e.g., conflicting resolution dice pools or initiative rules) and highlights them in the UI before generation, allowing the model to focus on reconciliation.

### R4. System Integration & Code Quality
Incorporate the new features cleanly into the existing TypeScript codebase and index.html without breaking search worker speeds or database density. Maintain the integrity of all existing Jest tests.

## Acceptance Criteria

### Synthesis & Sandbox Interface
- [ ] A dedicated "OmniRuleset Sandbox" tab is added to the main navigation menu.
- [ ] The Rules Synthesizer allows selecting multiple vectors, runs pre-synthesis conflict checks, and renders a formatted rules sheet.
- [ ] The Playtest Sandbox features a chat interface where a simulated GM guides the session using the synthesized rules, updating an active character/party status sheet in real-time.

### Codebase and Architecture
- [ ] All new modules (synthesis engine, conflict checker, GM sandbox) are implemented in TypeScript under `src/` and transpiled to `dist/`.
- [ ] Explicit TypeScript interfaces are added to `src/types.ts` for all sandbox-related states and messages.

### Quality and Reliability
- [ ] The agent team designs and executes a custom unit and integration test suite to verify conflict checks, parser outputs, and playtest state transition checks.
- [ ] All existing Jest tests continue to pass successfully.

## Follow-up — 2026-06-25T03:30:59Z

Build the flagship Pro Mode OmniRuleset Sandbox, deploying a multi-level agent hierarchy (3 layers deep) to analyze, resolve, and synthesize the 10,000+ game mechanical vectors into a unified ruleset simulator and interactive GM playtest engine.

Working directory: C:\dev\research-ttrpg-rules
Integrity mode: development

## Requirements

### R1. Multi-Level Agent Hierarchy Organization
Deploy a 3-layer agent network hierarchy (Orchestrator -> Domain Specialists -> Task Workers) to split and execute codebase audits, schema validation, AI simulation modeling, UI layout, and test suite implementation.

### R2. Dynamic Rules Synthesis Sandbox
Provide an interactive rules synthesizer panel in the Explorer. Selecting multiple rules vectors evaluates potential design conflicts and prompts an LLM generator pipeline to produce a unified, coherent rules sheet.

### R3. AI-Driven Playtest Sandbox & GM Automation
Create an interactive chat sandbox interface where a simulated GM guides a playtest session using the synthesized ruleset, tracking user actions, performing virtual dice rolls, and updating a character/party status card in real-time.

### R4. Structural Conflict Analysis Module
Implement a rules conflict detector that highlights mechanical contradictions among selected vectors (e.g. dice systems, turn sequences) in the UI before ruleset generation is initiated.

### R5. Pipeline Integration & Parity
Transpile all newly added sandbox modules from TypeScript under `src/` to `dist/`. All search worker execution speeds, glassmorphic styles, and existing Jest tests must continue to function perfectly.

## Acceptance Criteria

### Team Hierarchy & Architecture
- [ ] The orchestrator manages task workers and records project milestones transparently in coordination logs.
- [ ] All new components are strictly typed in TypeScript with clean modular boundaries.

### Sandbox & UI Interactions
- [ ] A dedicated "OmniRuleset Sandbox" tab is active in the main navigation layout.
- [ ] Selecting vectors runs a pre-synthesis conflict checker and displays compatibility highlights in the UI.
- [ ] The Playtest Sandbox features a functional GM chat and real-time character status updating.

### Quality, Verification, & Performance
- [ ] The subagent team designs and executes a custom unit and integration test suite to verify conflict checks, parser outputs, and playtest state transition checks.
- [ ] All existing Jest tests continue to pass successfully.

## Follow-up — 2026-06-25T06:20:48Z

Build the flagship OmniRules v2.0 Upgrade: a local-first, high-performance mechanical gaming research studio featuring interactive mechanics topology mapping, client-side semantic vector search, WebGPU playtest sandbox GM simulation, and Git-like rules version control.

Working directory: C:\dev\research-ttrpg-rules
Integrity mode: development

## Requirements

### R1. Interactive Mechanics Topology Graph Analyzer
- Implement an interactive, fluid, force-directed graph (Canvas or SVG-based, client-side, zero-dependency) visualizing the mechanical relationships and clustering patterns of the 10,000+ games.
- Group and color-code graph nodes by domain namespaces (e.g. combat, stealth, logistics).
- Support dynamic filtering, search-focusing of nodes, and tooltips showing game similarity scores and implementation details.

### R2. Local Semantic Embedding Search Engine
- Integrate a local-first sentence embedding pipeline utilizing a lightweight model (e.g. `Xenova/all-MiniLM-L6-v2`) via `transformers.js` running completely client-side.
- Allow users to query the database using natural language (e.g. "games with realistic survival inventory systems") and return matched game cards sorted by semantic match relevance.

### R3. Offline-First PWA & IndexedDB Search Index Caching
- Convert the application into a Progressive Web App (PWA) with a custom Service Worker for full offline availability.
- Cache pre-built FlexSearch and Semantic Search indexes in IndexedDB, reducing application bootstrap and database initialization times from 15MB parsing down to under 200ms on secondary loads.
- Implement progressive chunk streaming from the Web Worker to the main thread to ensure 60 FPS scrolling and zero-lag searching.

### R4. Local WebGPU Sandbox VTT & LLM Playtest GM
- Upgrade the Sandbox tab to a full Virtual Tabletop (VTT) with custom character sheet layouts that dynamically adjust stats and slots based on selected mechanical vectors.
- Integrate WebLLM (running models like Llama-3 client-side via WebGPU) or fall back to local Ollama endpoints and cloud APIs (OpenAI/Anthropic/Gemini) to drive a fully interactive AI GM.
- Support real-time chat, dice logs, character inventory updating, and turn-based combat tracking within the synthesized rules sandbox.

### R5. OmniGit Mechanical Version Control System
- Build a client-side Git-like mechanical versioning system enabling users to create branches of the game registry, track modifications, and commit database edits.
- Support visual rules diffing (comparing rulesets, vectors, and explanations across commits) and a visual conflict resolution UI for merging branches.
- Support exporting branch edits as standardized JSON Diff patches that can be downloaded.

## Acceptance Criteria

### Technical & Architecture
- All new components must be implemented in strictly typed TypeScript under `src/` and compiled to browser-compatible scripts in `dist/`.
- Maintain single-thread UI fluidness (60 FPS) during graph rendering and search indexing.
- 100% of existing 203 Jest tests must continue to pass successfully.
- Write new Jest unit and integration tests covering the version control branching/merging operations, semantic index creation, and IndexedDB caching lifecycle.

### User Interface & Interactions
- **Topology Tab**: Displays a full-screen, zoomable force-directed graph. Hovering over a node displays a glassmorphic tooltip with detail cards. Clicking focuses the node and updates the details drawer.
- **Semantic Search Input**: Accessible from the Explorer or Vector Search panels, displaying a loading progress bar during model initialization, and displaying ranked matches immediately.
- **VTT Sandbox GM Chat**: A chat layout with speaker badges (GM vs. Player), inline roll visualizers, and a sidebar character sheet showing live stat modifications.
- **Version Control Panel**: Added to the Database Editor tab, allowing users to "Branch", view "Staged Changes" with red/green line-level diffs, and perform "Merge" actions with automatic conflict highlights.

### Objective Verification
- Offline functionality is validated by running a test script or loading the app with network access disabled in Jest/JSDOM mock service worker tests.
- Database reload latency must be programmatically monitored and verified to be < 200ms after the initial index generation cache hit.
- Version control merging logic must be tested with adversarial cases where conflicting vector modifications are resolved correctly.

## Follow-up — 2026-06-25T06:22:07Z

Make the existing Tabletop Systems Registry application better: decouple it from external CDN dependencies, optimize database parsing and messaging overhead, polish glassmorphic transitions/UX feedback, and expand the automated testing suite to verify performance and offline capability.

Working directory: C:\dev\research-ttrpg-rules
Integrity mode: development

## Requirements

### R1. Local Dependency Bundling & CDN Decoupling
- Download and store the FlexSearch library locally in the workspace (removing the external cdnjs dependency in `search-worker.ts`).
- Ensure all other scripts, stylesheets, and fonts load locally without making third-party external network requests during application bootstrap.

### R2. Database Fetch & Worker Optimization
- Eliminate redundant database fetches. The 15MB `registry.json` database must be fetched exactly once, rather than twice (once in the app and once in the worker).
- Cache the parsed data structures or FlexSearch index, and stream search results to the main thread incrementally to avoid large memory payload transfers.
- Keep the main UI thread entirely non-blocking (aim for 60 FPS under rapid typing).

### R3. Advanced Glassmorphic UI/UX Polish
- Refine the styling to implement smooth CSS transitions for tab switches, detail drawer overlays, and grid card loading skeletons.
- Add clear UI loading states (spinners or shimmer effects) during initial database fetch and autocomplete index build times.
- Ensure the layout is fully responsive and does not cause visual shifts (CLS) when loading cards.

### R4. Offline PWA Integration
- Build a service worker that caches all static assets (`index.html`, `styles.css`, `dist/app.js`, `dist/search-worker.js`, local FlexSearch library, and database registry).
- Allow the registry to be fully functional, searchable, and editable while the host system is completely offline.

### R5. Test Suite Expansion & Stress Testing
- Write new Jest unit and integration tests verifying offline capability (mocking fetch failures), worker communication speed, and local index caching stability.
- All existing 203 Jest tests must continue to pass successfully.

## Acceptance Criteria

### Technical & Architecture
- FlexSearch is loaded from a local relative path in `dist/` or `src/` with zero CDN references.
- `registry.json` is loaded over HTTP once, parsed, and cached efficiently in memory.
- All TypeScript files transpile cleanly without errors under `strict: true`.
- All Jest tests pass successfully without any skips or failures.

### User Interface & Experience
- Tab navigation transitions smoothly with fade-in and slide-down animations.
- Searching via the omni-search input does not freeze the cursor or lock the main thread.
- Card grid displays skeleton loading cards if database load or search is in progress.
- detail drawer closes instantly and handles clicks outside the modal overlay to dismiss.

### Objective Verification
- Programmatic inspection shows zero external script loads or CDN fetch calls in the build output.
- Running the Jest suite confirms that the application can initialize and perform lookups even when mocked network fetches fail (falling back to cached service worker/local storage state).


## Follow-up — 2026-06-25T06:24:01Z

Make the TTRPG Systems Indexer deeper: design and implement a mechanical gaming Domain-Specific Language (DSL) with an AST parser and runtime simulator, integrate a logical consistency checker to verify rulesets, build a developer profiling dashboard tracking memory and rendering performance, and establish Monte Carlo simulation test suites.

Working directory: C:\dev\research-ttrpg-rules
Integrity mode: development

## Requirements

### R1. Gaming DSL & AST Execution Engine
- Design a formal Domain-Specific Language (DSL) syntax (text-based or structured JSON) to represent tabletop rulesets, dice rolls, character attributes, and action resolution steps.
- Write a client-side tokenizer and AST (Abstract Syntax Tree) parser in TypeScript to compile ruleset strings.
- Implement a lightweight virtual machine (VM) runner that executes DSL instructions to simulate test rounds (e.g. parsing `resolve(2d6 + STR >= 10)` and producing detailed logs).

### R2. Logical Consistency Solver
- Build a logical ruleset verification solver that analyzes selected game vectors and checks for conflicts or logical contradictions (e.g., multiple overlapping resolution mechanics, infinite loop modifier loops, or mutually exclusive state systems).
- Flag logical design paradoxes visually in the rules synthesizer interface.

### R3. Memory & Performance Diagnostics Dashboard
- Create a developer diagnostics panel displaying real-time metrics: search execution latency histograms, Web Worker memory usage, database indexing sizes, and rendering frames (FPS) during progressive card draws.
- Alert the user to potential layout thrashing or unreleased listener leaks.

### R4. Monte Carlo Simulation Testing
- Implement an automated testing module that runs Monte Carlo simulations (simulating thousands of consecutive game rounds through the DSL VM) to verify rules stability, action completion, and balance boundaries.
- Add strict type verification tests and ensure the existing Jest test suites are not regressed.

## Acceptance Criteria

### Technical & AST Architecture
- The AST parser converts DSL scripts into clean JSON nodes representing actions, conditions, and rolls.
- The execution VM resolves all mathematical roll functions and modifiers without using `eval()`.
- Static analysis checks and Jest tests cover all parser edge cases.
- All new code compiles successfully via `npm run build` under strict type checks.

### User Interface & Experience
- **Developer Console/Diagnostics**: Accessable via a toggle key or layout tab, showing graphs/gauges of worker footprint, search lookup latencies, and FPS indicators.
- **Rules Solver Panel**: Integrates with the rules synthesizer, highlighting logic contradictions with amber/red outline warnings and explaining why they fail verification.
- **Simulation Log View**: Sandbox results can be run in batch mode, displaying charts/logs of action outcomes, dice distributions, and rule execution sequences.

### Objective Verification
- Simulation test scripts are executed via `npm test` and assert that the VM achieves 100% execution completion without infinite loops or uncaught parsing exceptions.
- The consistency solver correctly flags known logical contradictions injected via tests.
- All 203 existing Jest tests continue to pass without error.

## Follow-up — 2026-06-25T06:25:17Z

Upgrade the Tabletop Systems Registry with P2P multiplayer and balance analytics: implement a WebRTC peer-to-peer collaborative playtest lobby sync protocol, build an automated AI game balance telemetry engine with imbalance reporting, and construct an isometric Canvas battle map for visual encounter resolution.

Working directory: C:\dev\research-ttrpg-rules
Integrity mode: development

## Requirements

### R1. WebRTC Peer-to-Peer Playtest Lobbies
- Implement a client-side WebRTC connection interface (supporting public STUN servers and custom signal endpoints) to link Sandbox playtest rooms.
- Let users host a session to generate connection tokens, and allow peers to join to share a unified sandbox environment.
- Sync playtest GM chat history, character status sheets, dice results, and action logs across all player screens in real-time.

### R2. AI-Driven Game Balance Telemetry Engine
- Implement an automated simulator that spawns AI personas to play thousands of combat and skill resolution encounters using the sandbox ruleset.
- Collect mechanical telemetry: win rates, round execution length, action frequency, and damage/healing curves.
- Render visual charts and metrics showing game system fairness, identifying overpowered vector combinations or design bottlenecks.

### R3. Isometric Canvas VTT Battle Map
- Design a lightweight, zero-dependency HTML5 Canvas view rendering a clean isometric grid inside the Sandbox panel.
- Support importing or custom coloring of character/enemy tokens, map tile types, and obstacle tiles.
- Allow dragging and dropping tokens, computing movement ranges, and drawing line-of-sight highlights that trigger rule checks (e.g. proximity-based stealth detection or melee attack ranges).

### R4. Distributed Integrity Verification
- Write a distributed state validation protocol where all peers confirm the mathematical validity of roll results, character actions, and stat changes to prevent state desyncs.
- Write Jest integration tests to verify WebRTC message packet parsers and simulation telemetry logic.
- Ensure all 203 existing Jest tests pass successfully.

## Acceptance Criteria

### Technical & Networking
- Peer connections establish and exchange state packets successfully via WebRTC channels.
- State conflicts (e.g. dual actions) are resolved using a simple client consensus or host-authoritative rule.
- Telemetry runs headlessly in Jest testing environments to verify balance analyzer outputs.
- All files compile without error under `strict: true`.

### User Interface & Experience
- **Lobby Controls**: A sidebar panel allowing host code generation, connection status indicator lights, and a player roster.
- **Isometric Battle Map**: Fluidly renders grid lines, supports mouse zooming/panning, displays movement path indicators, and plays animations for rolls and attacks.
- **Fairness Chart drawer**: Renders bar charts or radar charts summarizing rules balance, outlining mechanical synergies or dead-ends.

### Objective Verification
- Local test suites verify peer message protocol formats and state deserialization.
- The balance engine outputs data reports matching simulated scenarios (e.g., confirming STR-focused rules favor STR-boosted characters).
- 100% of existing Jest tests continue to pass.

## Follow-up — 2026-06-24T23:26:55-07:00

Expand the TTRPG Systems Registry feature set: build API connectors for itch.io, DriveThruRPG, and Wikipedia search; implement ruleset and character schema exporters for virtual tabletops (FoundryVTT, Roll20, Tabletop Simulator); design a client-side Homebrew Creator panel; and construct an interactive dice pool probability curves calculator.

Working directory: C:\dev\research-ttrpg-rules
Integrity mode: development

## Requirements

### R1. Multi-Platform Import Connectors
- Implement API query clients for itch.io (indie tag search), DriveThruRPG (metadata classification), and Wikipedia (search extraction) alongside the existing BoardGameGeek crawler.
- Map the fetched results directly into the Database Editor fields to streamline adding game mechanics.
- Support importing game icons, classifications, and system descriptors.

### R2. Virtual Tabletop (VTT) & Document Exporters
- Create a modular export system compiling rules and characters to:
  - **FoundryVTT**: A `.json` manifest representing custom items and rule packs.
  - **Roll20**: A `.json` state mapping character sheet attributes.
  - **Tabletop Simulator**: A configuration payload for custom token decks.
  - **PDF & Markdown**: High-fidelity, print-styled gaming documents.

### R3. Client-side Homebrew Creator Workspace
- Design a visual homebrew drafting workspace where users can author custom mechanics, create new vector namespaces, and document rules implementation details.
- Save custom creations in browser storage (IndexedDB), with options to overlay them dynamically onto the core database registry.

### R4. Math Probability Curves Analyzer
- Build a dice probability engine capable of resolving complex tabletop resolution mechanics: exploding dice, step dice pools, roll-and-keep, success thresholds, and standard arithmetic formulas (e.g. `3d6 + 2`, `pool(4d10 >= 8)`).
- Render interactive Canvas graphs depicting the probability density function (PDF) and cumulative distribution function (CDF) for success thresholds.

## Acceptance Criteria

### Technical & Compilation
- All import queries use non-blocking HTTP fetch requests with proper error catches and offline fallbacks.
- Probability curves are calculated using optimized float arrays and rendered onto an HTML5 Canvas context.
- Export outputs match the schema formats expected by FoundryVTT and Roll20.
- All new files transpile successfully under TS strict mode.
- 100% of existing Jest tests continue to pass.

### User Interface & Experience
- **Import Hub**: Added to the Editor tab, showing buttons to switch between BGG, DTRPG, itch.io, and Wikipedia search bars with autocomplete results.
- **Export Toolbar**: Visible on modal drawers and synthesized rule panels, letting users click to download files.
- **Homebrew Workspace**: A document-like editor with sections for vectors, title, descriptions, and a toggle to "Publish to Local Registry."
- **Probability Dashboard**: A mathematical sandbox rendering grid line charts with hovers showing exact percentage chances of success.

### Objective Verification
- Unit tests verify the dice VM resolves step and exploding dice probability equations mathematically.
- The exporter output formats are validated against static templates mimicking the Roll20 and Foundry schema.
- All 203 existing Jest tests pass successfully.
