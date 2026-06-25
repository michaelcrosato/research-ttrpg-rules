# Project Context: Rules Explorer Search Optimization

## Scope & Objective
The Rules Explorer Web Application currently loads and searches `registry.json` entirely on the main UI thread. For a database of ~5MB, this causes UI stuttering and frame drops during search input. The goal is to move search index building, query lookup, filtering, and Venn comparison set computations to a Web Worker, utilizing a fast indexing library (FlexSearch), to ensure 60 FPS UI performance and meet sub-millisecond to sub-5ms latency requirements.

## Current Technical Stack
- Vanilla HTML5 / CSS3 / JavaScript (ES6+).
- In-memory dataset loaded from `./registry.json` (~5.2MB).
- No Node.js build pipeline for the web application (client-side only).
- BGG API integration (client-side DOM parser).

## Technical Requirements
1. **FlexSearch/Lunr**: FlexSearch is preferred due to superior performance and support for prefix/fuzzy matching. Since we are in client-side HTML, we need to load FlexSearch in the Web Worker.
2. **Web Worker**: A worker script `search-worker.js` (or similar) will load/fetch `registry.json`, build the search index, compute filters, handle autocomplete suggestions, and perform Venn comparison logic.
3. **Optimized Venn Comparison**: Use native `Set` objects for set intersection and differences.
4. **Performance Goals**:
   - Omni-search lookup: < 5ms
   - Autocomplete suggestions: < 2ms
   - Venn comparison: < 1ms
   - UI responsiveness: No blocking tasks > 16ms per frame.

## Hard Constraints
- No direct source code changes by Project Orchestrator.
- Independent E2E Testing and Implementation tracks.
- Forensic Auditor audit before milestone completion.
