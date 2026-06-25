# Handoff Report — E2E Test Suite Design (Tiers 3 & 4)

## 1. Observation
The Systems Indexer codebase comprises a single-page user interface defined in `index.html` and interactive state handling in `app.js`. Key codebase features and interfaces were observed directly:
*   **Tab System**: `index.html` (Lines 49-65) declares button IDs `tab-nav-explorer`, `tab-nav-vector-search`, `tab-nav-compare`, `tab-nav-dictionary`, and `tab-nav-editor`. `app.js` (Lines 125-151) sets click event listeners that toggle the `.active` class to show/hide sections:
    ```javascript
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetView = tab.getAttribute('data-tab');
        ...
        document.getElementById(`${targetView}-view`).classList.add('active');
    ```
*   **Database Mutator Flow**: Adding a game via the Database Editor form (`#add-game-form`) triggers `addNewGame()` in `app.js` (Line 871), which updates the in-memory array `gamesData[medium]` and performs UI propagation:
    ```javascript
    gamesData[medium].push(newGameEntry);
    allGames.push({ ...newGameEntry, medium });
    processMetadata();
    renderDashboardStats();
    populateGenreDropdown();
    renderExplorer();
    initializeCompareTool();
    renderDictSidebar();
    ```
*   **BGG Integration Mapping**: `app.js` (Lines 952-973) outlines the XML API mapper dictionary `bggMechanicMapping` (e.g., mapping `"Worker Placement"` to `"economy.market.worker_placement"`).
*   **Dynamic UI Controls**: `index.html` contains:
    *   Omni Search: `<input type="text" id="omni-search" class="search-input"...>` (Line 75)
    *   Venn Compare panels: `<aside class="compare-selector-card" id="compare-selector-a"></aside>` (Line 154) and `id="compare-selector-b"` (Line 155).
    *   JSON export preview: `<pre class="export-preview" id="export-json-preview"></pre>` (Line 268)

---

## 2. Logic Chain
1.  **Tab Switching Logic**: Since all view panel wrappers (e.g., `#explorer-view`, `#vector-search-view`) toggle visibility via the `.active` class triggered by tab clicks (`.tab-btn`), any cross-feature integration test (Tier 3 or 4) traversing views must click a tab selector to bring the target inputs into the active viewport.
2.  **State Consistency Logic**: Because `addNewGame()` triggers immediate execution of `processMetadata()`, `renderDashboardStats()`, `renderExplorer()`, and `renderDictSidebar()`, adding a game in the Database Editor must instantly update elements on other tabs. Therefore, we can assert state persistence by performing checks on the Explorer grid (`#games-grid`), Stats indicators (`#stat-total-games`), and the Dictionary sidebar (`#dict-domains-sidebar`) right after form submission.
3.  **Venn Tool Highlight Mechanics**: The Venn intersection (`.venn-circle-intersection`) fires `highlightCompareColumn()`, modifying the inline borders of `#compare-col-a`, `#compare-col-both`, and `#compare-col-b` based on column parameter. E2E tests can assert Venn correctness by clicking the intersection and checking elements for border colors and shadows.
4.  **BGG XML API Fetch Flow**: The function `searchBGG()` parses the raw XML response from BoardGameGeek and displays matches in `#bgg-search-results-area`. Clicking "Import Details" invokes `importBGGGame()`, which fills forms and maps mechanisms. Therefore, tests must wait for async DOM changes in `#bgg-search-results-area` before verifying form field autofill.

---

## 3. Caveats
*   **BGG API Network Dependence**: The BoardGameGeek API relies on live external HTTP requests (`https://boardgamegeek.com/xmlapi2/...`). In an isolated E2E testing environment or network-restricted environments, these requests must be mocked or intercepted (e.g., using MSW or Cypress interceptors) to prevent test failures due to BGG server downtime or rate limiting.
*   **Details Modal Blockage**: The details drawer `#details-modal-overlay` acts as an absolute-positioned overlay. When active, it captures or overlays pointer events, which prevents clicking other tabs. Automated tests must click `button.modal-close-btn` or dispatch overlay click events before navigating back to other views.

---

## 4. Conclusion
The client-side interface contains rich interactive capabilities suitable for high-density end-to-end coverage. The provided E2E test plan (`analysis.md`) outlines 6 Tier 3 integration scenarios and 5 Tier 4 user journeys. These tests are fully mapped to exact DOM selectors and ID chains, validating data propagation, XML API bindings, and custom vector rendering without modifying source files.

---

## 5. Verification Method
To verify the validity of the planned E2E tests:
1.  **File Inspections**: Review the design details, selectors, and user paths listed in `C:\dev\research-ttrpg-rules\.agents\teamwork_preview_explorer_e2e_tier34_3\analysis.md`.
2.  **Manual UI Walkthrough**:
    *   Open `index.html` in a web browser.
    *   Open Developer Tools (`F12`) and select the Element Inspector.
    *   Manually execute the step-by-step actions for **TEST-302** (Database Form Entry) and confirm that the stats cards (`#stat-total-games`) increment and that searching the new game in `#omni-search` dynamically generates card UI in `#games-grid`.
    *   Verify that all CSS selectors targeted in the test plan exist exactly as described in `index.html` and are manipulated as scripted in `app.js`.
