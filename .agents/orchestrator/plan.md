# Optimization Plan: Rules Explorer Search Interface (Updated)

This document outlines the step-by-step plan for optimizing the search, autocomplete, and Venn comparison interfaces using a Web Worker and a high-performance indexing library (like FlexSearch).

## Milestone 1: Test Suite & Infrastructure (E2E Track)
- Define and setup testing runner (Node/JSDOM based) that can measure query execution time, autocomplete loading time, Venn comparison calculations, worker heap memory usage, and main thread frame blockages.
- Implement test cases covering the 4 Tiers:
  - **Tier 1 (Feature Coverage)**: Search with spelling errors (fuzzy edit distance up to 2), medium/genre/year filters, autocomplete suggestions, Venn comparison, database editor, BGG API import.
  - **Tier 2 (Boundary & Corner Cases)**: Extreme year values, empty search inputs, complex/invalid query inputs, empty comparison pairs.
  - **Tier 3 (Cross-Feature Combinations)**: Combinations of fuzzy searches with year/medium/genre filters.
  - **Tier 4 (Real-World Application Scenarios)**: Workflow benchmarks verifying:
    - Omni-search lookup latency under **1ms** on the 4,700-game dataset.
    - Autocomplete suggestions latency under **500μs**.
    - Venn comparison latency under **100μs**.
    - Main UI thread blockage is **0ms** (60 FPS during typing).
    - Worker heap memory overhead < **10MB**.
- Publish `TEST_READY.md`.

## Milestone 2: Search Engine Offloading (Implementation Track)
- Create `search-worker.js` with memory optimizations to remain under 10MB of heap.
- Configure FlexSearch inside worker for prefix matching and fuzzy search (edit distance up to 2).
- Optimize in-memory indexes (e.g. indexing fields selectively, compressing data structure if needed, or loading only required search fields in FlexSearch).
- Offload omni-search, autocomplete lookup, and Venn comparison set operations to the worker.
- Refactor `app.js` to communicate asynchronously via Web Worker.

## Milestone 3: Progressive Rendering & Main Thread Fluidity
- Refactor UI card rendering in `app.js` to use progressive chunk rendering (via `requestAnimationFrame` or a virtual document fragment queue) for results/suggestions > 100 entries.
- Ensure the browser main thread remains completely free of blocking tasks (> 8ms per frame) during active search typing.

## Milestone 4: Venn Comparison Optimization (Implementation Track)
- Compute mechanical set intersections and differences using highly optimized Set operations in under **100 microseconds**.

## Milestone 5: E2E Verification & Audit
- Run E2E test suite to verify all performance and correctness benchmarks.
- White-box adversarial testing (Tier 5) for code coverage.
- Forensic Integrity Audit.
