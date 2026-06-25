# Handoff Report - Tier 1 & 2 Test Case Planning (Explorer 2)

## 1. Observation
We observed the following exact structures and selectors in the codebase:
*   **Search Filters UI (`index.html`)**:
    *   Omni-Search Input: `<input type="text" id="omni-search" class="search-input" ...>` (line 75)
    *   Medium Pill Buttons: `<button class="filter-pill-btn active" data-medium="all" id="pill-medium-all">` (line 82)
    *   Genre Selector: `<select id="filter-genre" class="form-control">` (line 90)
    *   Release Year Sliders: `<input type="number" id="filter-year-min" ...>` (line 98) and `<input type="number" id="filter-year-max" ...>` (line 100)
    *   Sort Select: `<select id="filter-sort" ...>` (line 106)
*   **Vector Search & Autocomplete UI (`index.html`)**:
    *   Vector Input: `<input type="text" id="vector-query-input" ...>` (line 135)
    *   Suggestions: `<div class="autocomplete-suggestions" id="vector-query-suggestions" ...>` (line 136)
    *   Search Button: `<button class="btn" id="vector-search-btn">` (line 138)
    *   Results: `<div class="vector-results" id="vector-search-results">` (line 142)
*   **Venn Comparison UI (`index.html` & `app.js`)**:
    *   Game Selectors: `<aside class="compare-selector-card" id="compare-selector-a">` (line 154)
    *   Shared/Exclusive Columns: `div#compare-col-a`, `div#compare-col-both`, `div#compare-col-b` (lines 619-641 in `app.js`)
    *   Highlight Click Events: `onclick="highlightCompareColumn('a')"` (line 600 in `app.js`)
*   **Vector Dictionary UI (`index.html` & `app.js`)**:
    *   Domains Sidebar: `<aside class="dict-sidebar" id="dict-domains-sidebar">` (line 170)
    *   Dictionary Results List: `<div id="dict-results-list">` (line 175)
*   **Database Editor UI (`index.html` & `app.js`)**:
    *   Game Form: `<form id="add-game-form">` (line 205)
    *   JSON Export: `<pre class="export-preview" id="export-json-preview">` (line 268)
*   **BoardGameGeek Import UI (`index.html` & `app.js`)**:
    *   BGG Search: `<input type="text" id="bgg-search-query" ...>` (line 193)
    *   BGG Search Status: `<div id="bgg-search-status" ...>` (line 196)
    *   Results Area: `<div id="bgg-search-results-area" ...>` (line 197)

From `teamwork_preview_explorer_e2e_infra_1/analysis.md`, the E2E infrastructure uses `jest` and `jest-environment-jsdom`, loading `index.html` programmatically, mocking `global.fetch` for `./registry.json` and BGG API calls, and requiring `app.js` to dispatch `DOMContentLoaded`.

## 2. Logic Chain
1. Using the Jest/JSDOM testing setup specified by Explorer 1, we can run full Black-Box E2E tests by interacting with DOM input elements and observing DOM node structural/text changes.
2. By tracing the event listeners and DOM manipulation procedures in `app.js` and `index.html`, we mapped specific user inputs (such as typing characters, dispatching `change`/`input` events, or triggering button clicks) to expected target outcomes in the DOM.
3. We designed a standard mock registry dataset consisting of 2 TTRPGs and 2 Board Games to make all assertions deterministic and independent of future live registry data updates.
4. For all 6 core features (F1: Explorer Grid, F2: Vector Search, F3: Venn Compare, F4: Dictionary, F5: Database Editor, F6: BGG Import), we designed exactly 5 Tier 1 (happy path) and 5 Tier 2 (boundary/corner case) test cases (60 cases in total).
5. Each test case details: a unique Test ID and Name, concrete Input Actions (simulating DOM events), Expected DOM elements and state changes, and specific DOM IDs/CSS Selectors to target.

## 3. Caveats
*   This is a plan and analysis document. No implementation scripts or changes were performed (read-only instruction).
*   Mocking XML parsing (`DOMParser`) relies on standard JSDOM compliance. In Node/Jest environments, a mock XML payload must be returned on intercepted BGG queries.
*   Assumes clean Jest module resets (`jest.resetModules()`) between tests to prevent side effects in `app.js` internal state arrays (`allGames`, etc.).

## 4. Conclusion
We have generated a high-fidelity, complete E2E test plan containing exactly 60 test cases spanning Tier 1 and Tier 2 for features F1 to F6, fully mapped to the DOM selectors of the Systems Indexer application. The findings are documented in detail at `C:\dev\research-ttrpg-rules\.agents\teamwork_preview_explorer_e2e_tier12_2\analysis.md`.

## 5. Verification Method
*   Inspect `C:\dev\research-ttrpg-rules\.agents\teamwork_preview_explorer_e2e_tier12_2\analysis.md` to verify the structure and presence of all 60 cases.
*   Once the implementer builds the test runner, verify the tests can be executed via:
    ```powershell
    npm test
    ```
