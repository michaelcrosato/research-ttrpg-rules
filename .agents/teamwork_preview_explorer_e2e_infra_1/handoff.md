# E2E Test Infrastructure Design Handoff Report

## 1. Observation

During my code inspection of the `research-ttrpg-rules` workspace, I observed the following details:
* **Entry Point File (`index.html`)**:
  * Located at `C:\dev\research-ttrpg-rules\index.html`.
  * Features statistical elements to display counts:
    * `<div class="stat-value" id="stat-total-games">0</div>` (line 28)
    * `<div class="stat-value" id="stat-total-ttrpgs">0</div>` (line 33)
    * `<div class="stat-value" id="stat-total-boardgames">0</div>` (line 38)
    * `<div class="stat-value" id="stat-total-vectors">0</div>` (line 43)
  * Includes the main JS logic via: `<script src="app.js"></script>` (line 327).
  * Hooks into global window functions using inline HTML event attributes, e.g., `<button type="button" class="btn btn-cyan" onclick="searchBGG()">Search BGG</button>` (line 194).

* **Application Script (`app.js`)**:
  * Located at `C:\dev\research-ttrpg-rules\app.js`.
  * Initiates logic when DOM is ready:
    ```javascript
    document.addEventListener('DOMContentLoaded', async () => {
      setupTabs();
      setupEventListeners();
      await loadDatabase();
    });
    ``` (lines 22-26)
  * Requests the local database file: `const response = await fetch('./registry.json');` (line 31).
  * Attaches helper logic to the `window` object to make them globally accessible:
    * `window.loadMoreGames = function() { ... }` (line 327)
    * `window.openGameDetails = function(gameId) { ... }` (line 333)
    * `window.searchBGG = async function() { ... }` (line 975)
    * `window.importBGGGame = async function(bggId) { ... }` (line 1035)
  * Reaches out to the external BGG XML API:
    * `const response = await fetch(`https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(query)}&type=boardgame`);` (line 994)
    * `const response = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}`);` (line 1042)
  * Parses retrieved XML via DOMParser:
    * `const xmlDoc = parser.parseFromString(xmlText, 'text/xml');` (lines 999, 1047).

* **Registry Database (`registry.json`)**:
  * Located at `C:\dev\research-ttrpg-rules\registry.json`.
  * File size is **5,263,638 bytes** containing 109,750 lines of JSON.
  * Structure consists of two root-level arrays: `ttrpg` (line 2) and `board_game` (line 85, after collapsing elements).

---

## 2. Logic Chain

1. **DOM Loading & Script Lifecycle**:
   * *Observation*: `index.html` loads `app.js` which listens to `DOMContentLoaded` (lines 22-26, `app.js`).
   * *Inference*: To load the environment in JSDOM, we must construct the DOM first by writing `index.html`'s contents to `document.documentElement.innerHTML`, then mock the global `fetch` object, then `require('../app.js')` so it attaches its event listener, and finally dispatch the `DOMContentLoaded` event on `window` to trigger the application startup sequence.

2. **Scoping and Execution context**:
   * *Observation*: Top-level variables (e.g. `gamesData`, `allGames`) are defined in `app.js` using `let` (lines 3-4), but actions are bound to `window` (line 333, etc.).
   * *Inference*: Loading `app.js` as a module via CommonJS `require()` in Jest limits variable scoping to the module wrapper (making variables like `gamesData` private). However, since callbacks are attached to the `window` object, the JSDOM window handles click actions and callbacks correctly without needing internal scope leakage.

3. **Fetch Mocking & Database Scale**:
   * *Observation*: `registry.json` is a massive file of 5.26 MB containing over 100k lines of code, and `loadDatabase()` calls `fetch('./registry.json')`.
   * *Inference*: Parsing 5.26 MB on every test execution degrades Jest's CPU and memory efficiency. Also, testing dashboard count assertions on mutable production data is brittle. A small, representative mock registry object (2 elements, e.g. 1 TTRPG and 1 board game) should be returned by mock `fetch` to keep test execution immediate (milliseconds) and assertions deterministic.

4. **BGG API Mocking**:
   * *Observation*: External XML APIs are fetched for BGG search and thing details, and `DOMParser` parses them.
   * *Inference*: Since tests run in CODE_ONLY mode, we cannot access the internet. By intercepting `https://boardgamegeek.com/xmlapi2/` in our mock `fetch` wrapper and returning mock XML strings, we can test BGG search and import. JSDOM exposes a functional `DOMParser` on the window (which Jest links globally), resolving XML strings cleanly.

---

## 3. Caveats

* **CSS / Styling**: CSS rules listed in `styles.css` are not parsed or checked by JSDOM for layout rendering. If layout-specific visual changes are needed, visual regression tests (using Playwright or Puppeteer) are required.
* **Canvas Mocks**: Currently, the codebase has no canvas integrations. If any charting library is introduced in the future, the `canvas` package must be added to `package.json` or canvas methods mock-implemented in `tests/setup.js`.
* **State Cleanliness**: Because `app.js` runs stateful initializations (such as setting event listeners on document load), tests must call `jest.resetModules()` in `beforeEach` to reset modules cache and prevent duplicate listeners or polluted in-memory states.

---

## 4. Conclusion

We can successfully build a fast, offline Jest + JSDOM testing infrastructure for the Systems Indexer application.
* The test environment should run purely in `jsdom` using a custom `global.fetch` mock.
* A representative mock dataset should replace the massive 5.26 MB `registry.json` in test environments to achieve test runs under 100ms.
* The structure and code prototype detailed in `analysis.md` provide a ready-to-use blueprint for implementing this E2E test infra.

---

## 5. Verification Method

To verify the test setup and findings:
1. **Inspect Analysis**: View `C:\dev\research-ttrpg-rules\.agents\teamwork_preview_explorer_e2e_infra_1\analysis.md` to review the architectural choices and blueprint.
2. **Mock Invalidation**: If the production `registry.json` root keys change from `"ttrpg"` and `"board_game"`, the smoke tests must be updated to align with the new schema.
3. **Execution Verification**: Once `package.json`, `jest.config.js`, and the test files are written by the implementer, running `npm test` or `npx jest` should execute the smoke tests and pass successfully.
