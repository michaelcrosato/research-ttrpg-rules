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
