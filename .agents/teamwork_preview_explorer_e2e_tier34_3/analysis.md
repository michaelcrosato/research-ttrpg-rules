# E2E Test Suite Design: Tier 3 & Tier 4 (TTRPG & Board Game Rules Registry)

## Executive Summary
This document provides a comprehensive analysis of the Systems Indexer frontend codebase (`index.html` and `app.js`) and specifies the testing architecture for **Tier 3 (Cross-Feature Combinations)** and **Tier 4 (Real-World Application Scenarios)**. The application is a client-side TTRPG and board game mechanical registry that maintains an in-memory database initialized from `registry.json`, providing search, detailed comparison, vector dictionaries, and data editing capabilities.

---

## Codebase Analysis & UI Map

### 1. Global Application State (`app.js`)
*   `gamesData`: The master JSON object holding raw arrays for `ttrpg` and `board_game`.
*   `allGames`: Flattened array of all games with an added `medium` property (`'ttrpg'` or `'board_game'`).
*   `uniqueVectors`: A `Set` containing all gameplay vectors discovered in the registry.
*   `uniqueGenres`: A `Set` containing all primary genres and subgenres.
*   `selectedCompareGames`: An array `[gameIdA, gameIdB]` containing active selections for comparison.
*   `activeDictDomain`: Domain filter for the dictionary panel (default: `'all'`).
*   `visibleCount`: Active pagination limit for the Explorer grid (default: `60`).

### 2. View Panels and Switchers
The application utilizes a single-page tabs structure. Activating a tab adds the `.active` class to both the navigation button and its corresponding panel:
*   **Explorer Grid**: `#tab-nav-explorer` triggers panel `#explorer-view`
*   **Vector Search Engine**: `#tab-nav-vector-search` triggers panel `#vector-search-view`
*   **Venn Comparison Tool**: `#tab-nav-compare` triggers panel `#compare-view`
*   **Vector Dictionary**: `#tab-nav-dictionary` triggers panel `#dictionary-view`
*   **Database Editor**: `#tab-nav-editor` triggers panel `#editor-view`

### 3. Selector and Action Mapping Reference

| DOM Element ID / Selector | Element Type | Interaction | Purpose / Callback |
|---|---|---|---|
| `#tab-nav-explorer` | Button | Click | Switches view to Explorer, updates count |
| `#tab-nav-vector-search` | Button | Click | Switches view to Vector Search |
| `#tab-nav-compare` | Button | Click | Switches view to Comparison, executes comparison |
| `#tab-nav-dictionary` | Button | Click | Switches view to Dictionary, renders domains list |
| `#tab-nav-editor` | Button | Click | Switches view to Editor, refreshes JSON preview |
| `#omni-search` | Input (Text) | Input (Type) | Re-filters explorer view dynamically |
| `#pill-medium-all` | Button | Click | Sets explorer filter `medium` to `'all'` |
| `#pill-medium-ttrpg` | Button | Click | Sets explorer filter `medium` to `'ttrpg'` |
| `#pill-medium-board-game`| Button | Click | Sets explorer filter `medium` to `'board_game'`|
| `#filter-genre` | Select | Change | Sets explorer filter `genre` to selected |
| `#filter-year-min` | Input (Number)| Change | Sets explorer minimum publication year limit |
| `#filter-year-max` | Input (Number)| Change | Sets explorer maximum publication year limit |
| `#filter-sort` | Select | Change | Sorts explorer grid (A-Z, Z-A, Year Asc/Desc) |
| `#games-grid` | Container Div | Dynamic | Houses generated `.game-card` child cards |
| `.game-card` | Div (Card) | Click | Triggers `openGameDetails(gameId)` |
| `button.btn-load-more` | Button | Click | Increases page size limit by 60 items |
| `#details-modal-overlay` | Div (Modal) | Click (Overlay)| Closes detail modal when clicking background |
| `button.modal-close-btn` | Button | Click | Closes detail modal |
| `#vector-query-input` | Input (Text) | Input/Keypress| Triggers autocompletion, submits on Enter |
| `#vector-query-suggestions`| Container Div | Click Item | Selects vector suggestion, triggers search |
| `#vector-search-btn` | Button | Click | Triggers `executeVectorSearch(query)` |
| `#vector-search-results` | Container Div | Dynamic | Displays matching vector detail listings |
| `#compare-selector-a` | Container Card| Click Item | Populates selector game list, sets Game A ID |
| `#compare-selector-b` | Container Card| Click Item | Populates selector game list, sets Game B ID |
| `.select-game-btn` | Button | Click | Selects ruleset A or B for Venn analysis |
| `.venn-circle-intersection`| Div (Venn Area) | Click | Triggers column highlight for shared vectors |
| `#compare-col-both` | Column Div | Hover Item | Shows compound comparison text as hover title |
| `#dict-domains-sidebar` | Container Div | Click Item | Selects active domain filter for dictionary |
| `.dict-domain-btn` | Button | Click | Triggers `setDictDomain(domain)` |
| `.dict-game-link` | Span Link | Click | Triggers `openGameDetails(gameId)` |
| `#bgg-search-query` | Input (Text) | Type | Input query for BoardGameGeek BoardGame search|
| `button[onclick="searchBGG()"]`| Button | Click | Triggers `searchBGG()` XML API request |
| `#bgg-search-status` | Div (Status) | Text content | Displays loading state and query count results |
| `#bgg-search-results-area`| Container Div | Click Item | Displays matched BGG games with Import buttons |
| `button[onclick^="importBGGGame"]`| Button | Click | Triggers BGG metadata fetch & form auto-fill |
| `#add-game-form` | Form | Submit | Triggers `addNewGame()` local insert |
| `#new-game-title` | Input (Text) | Type | Game title form field |
| `#new-game-year` | Input (Number)| Type | Publication year form field |
| `#new-game-medium` | Select | Change | Medium selection ('ttrpg' or 'board_game') |
| `#new-game-genre` | Input (Text) | Type | Primary genre form field |
| `#new-game-subgenres` | Input (Text) | Type | Comma-separated subgenres form field |
| `#editor-vectors-list` | Container Div | Change Item | Lists checkboxes for all system vectors |
| `#custom-vector-name` | Input (Text) | Type | Input namespaced code for custom vector |
| `button[onclick="addCustomEditorVector()"]`| Button | Click | Checks domain notation, appends custom vector |
| `#editor-explanations-inputs`| Container Div | Dynamic | Appends textareas for active vectors |
| `#export-json-preview` | Pre Block | Output | Renders real-time formatted db JSON preview |
| `button[onclick="downloadUpdatedRegistry()"]`| Button| Click | Packages and downloads `registry.json` |

---

## Tier 3: Cross-Feature Combinations

These test cases verify integration points where action sequences traverse multiple tabs, panels, and modal dialogs.

### TEST-301: Vector Search Result -> Detail Drawer -> Vector Dictionary Verification
*   **Cross-Feature Scope**: Vector Search Engine (F2) $\rightarrow$ Detail Modal Overlay $\rightarrow$ Vector Dictionary (F4).
*   **Input Actions**:
    1.  Click `#tab-nav-vector-search`.
    2.  Type `combat.melee.tactical` in `input#vector-query-input`.
    3.  Click `button#vector-search-btn`.
    4.  Verify result cards populate in `#vector-search-results`. Click the link `a.vector-game-title` for the game `"Coriolis: Empyrean Canticle 2e Edition"`.
    5.  Assert detail drawer `#details-modal-overlay` opens and exhibits class `.active`.
    6.  Inspect that `#modal-game-title` displays `"Coriolis: Empyrean Canticle 2e Edition"`.
    7.  Click `button.modal-close-btn` to close the modal.
    8.  Click `#tab-nav-dictionary`.
    9.  In the sidebar container `#dict-domains-sidebar`, click the button `.dict-domain-btn` containing `combat`.
    10. Assert that under the `combat.melee.tactical` namespace, the game link `.dict-game-link` for `"Coriolis: Empyrean Canticle 2e Edition"` is present.
*   **Expected DOM Elements & State Changes**:
    *   `#vector-search-view.view-panel.active` (step 1)
    *   `#vector-search-results .vector-game-item` populated (step 3)
    *   `#details-modal-overlay.active` contains matching content (step 5)
    *   `#dictionary-view.view-panel.active` (step 8)
    *   `#dict-results-list` lists Coriolis link under the correct namespace headers (step 10).
*   **Target Selectors**:
    *   `#tab-nav-vector-search`, `#vector-query-input`, `#vector-search-btn`
    *   `#vector-search-results .vector-game-item a.vector-game-title`
    *   `#details-modal-overlay`, `#modal-game-title`, `button.modal-close-btn`
    *   `#tab-nav-dictionary`, `#dict-domains-sidebar .dict-domain-btn`
    *   `#dict-results-list .dict-item-card`

### TEST-302: Database Editor Form Entry -> Omni-Search Grid & Stats Dashboard Propagation
*   **Cross-Feature Scope**: Database Editor (F5) $\rightarrow$ Statistics Dashboard $\rightarrow$ Omni-Search Grid (F1) $\rightarrow$ Detail Modal.
*   **Input Actions**:
    1.  Click `#tab-nav-editor`.
    2.  Fill in `#add-game-form` inputs:
        *   `#new-game-title`: `"Shadows over Windows"`
        *   `#new-game-year`: `2026`
        *   `#new-game-medium`: Select `ttrpg`
        *   `#new-game-genre`: `"Horror"`
        *   `#new-game-subgenres`: `"Survival, Gothic"`
    3.  In `#editor-vectors-list`, click the checkbox for `combat.melee.tactical` (ID `#check-vec-combat.melee.tactical`).
    4.  Verify that a textarea is appended in `#editor-explanations-inputs`. Find the textarea `textarea[data-vector="combat.melee.tactical"]` and type: `"Tactical survival checks dictate combat outcomes in dark rooms."`
    5.  Submit form by clicking `button[type="submit"]`.
    6.  Dismiss the browser alert confirmation.
    7.  Observe stats bar: verify `#stat-total-games` has incremented by 1, and `#stat-total-ttrpgs` has incremented by 1.
    8.  Click `#tab-nav-explorer`.
    9.  In `#omni-search`, type `"Windows"`.
    10. Verify that the grid `#games-grid` displays exactly 1 `.game-card` containing `<h2>Shadows over Windows</h2>`.
    11. Click the game card.
    12. Verify detail modal opens, shows `#modal-primary-genre` as `"Horror"`, and lists the custom vector explanation text in the structured vectors area.
*   **Expected DOM Elements & State Changes**:
    *   Form resets, and checkbox explanations disappear from `#editor-explanations-inputs` (step 5).
    *   `#stat-total-games` updates instantly in the header dashboard (step 7).
    *   `#results-count-number` matches filter matches count (step 10).
    *   `#details-modal-overlay.active` contains the newly entered data (step 12).
*   **Target Selectors**:
    *   `#new-game-title`, `#new-game-year`, `#new-game-medium`, `#new-game-genre`
    *   `#editor-vectors-list input[value="combat.melee.tactical"]`
    *   `#editor-explanations-inputs textarea[data-vector="combat.melee.tactical"]`
    *   `#stat-total-games`, `#stat-total-ttrpgs`
    *   `#omni-search`, `#games-grid .game-card`, `#details-modal-overlay`

### TEST-303: BGG XML API Import -> Form Mapping -> Venn Comparison Registration
*   **Cross-Feature Scope**: BGG Import (F6) $\rightarrow$ Editor Autofill Form $\rightarrow$ Local Memory Commit $\rightarrow$ Venn Tool Selection.
*   **Input Actions**:
    1.  Click `#tab-nav-editor`.
    2.  In the BGG search box `#bgg-search-query`, type `"Scythe"`.
    3.  Click search button (`onclick="searchBGG()"`).
    4.  Wait for results list `#bgg-search-results-area` to show items.
    5.  Identify the row for Scythe and click its "Import Details" button.
    6.  Dismiss the load alert.
    7.  Confirm form inputs are prefilled:
        *   `#new-game-title` value matches `"Scythe"` (or version name from BGG).
        *   `#new-game-medium` value is `"board_game"`.
        *   Checkboxes for mapped mechanics (e.g. `economy.market.worker_placement`) are checked, and placeholder texts exist in explanations inputs.
    8.  Append to title input: type `" - Custom Testing"` at the end of `#new-game-title`.
    9.  Submit form to register game. Dismiss registration alert.
    10. Click `#tab-nav-compare`.
    11. In Selector Column A (`#compare-selector-a`), find the button for the newly registered game `"Scythe - Custom Testing"` and click it.
    12. In Selector Column B (`#compare-selector-b`), click the button for another game (e.g., `"Cyberpunk Red: 2045 Chronicle Book"`).
    13. Verify the Venn diagram visualizes the overlap. Hover over any shared item in `#compare-col-both` and verify the compound tooltip has descriptions.
*   **Expected DOM Elements & State Changes**:
    *   BGG search outputs generated in `#bgg-search-results-area` (step 4).
    *   Form values updated dynamically via BGG mapping dictionary (step 7).
    *   Venn columns `#compare-col-a`, `#compare-col-both`, and `#compare-col-b` update with correct game names and list items (step 13).
*   **Target Selectors**:
    *   `#bgg-search-query`, `#bgg-search-results-area button`
    *   `#new-game-title`, `#new-game-medium`
    *   `#compare-selector-a .select-game-btn`, `#compare-selector-b .select-game-btn`
    *   `#comparison-results`, `#compare-col-both`

### TEST-304: Custom Vector Creation -> Checklist Addition -> Dictionary Domain Audit
*   **Cross-Feature Scope**: Database Editor (F5) $\rightarrow$ Dynamic Checklist $\rightarrow$ Dictionary Sidebar (F4) $\rightarrow$ Dictionary Domain Lists.
*   **Input Actions**:
    1.  Click `#tab-nav-editor`.
    2.  Locate custom vector input `#custom-vector-name`. Type `simulation.weather.blizzard`.
    3.  Click "Add" button (`onclick="addCustomEditorVector()"`).
    4.  Verify that a checklist checkbox element `#check-vec-simulation_weather_blizzard` has been appended to `#editor-vectors-list` and is marked checked.
    5.  Verify a textarea under `#editor-explanations-inputs` is active. Enter explanation: `"Failing survival checks in extreme blizzards freezes movement speed."`
    6.  Complete the rest of the form: Game Title = `"Frostpunk RPG"`, Medium = `"ttrpg"`, Genre = `"Survival"`, Year = `2026`.
    7.  Submit form and accept alert.
    8.  Click `#tab-nav-dictionary`.
    9.  Locate the domain sidebar `#dict-domains-sidebar`. Verify that the domain button for `simulation` has its badge number updated.
    10. Click the `simulation` button in the sidebar.
    11. Verify that `simulation.weather.blizzard` is listed under system vectors, showing the link to `"Frostpunk RPG"`.
*   **Expected DOM Elements & State Changes**:
    *   A new element with ID `#check-vec-simulation\.weather\.blizzard` is created dynamically (step 4).
    *   The `uniqueVectors` set increases in size, which causes `renderDictSidebar` to recalculate badges (step 9).
    *   `#dict-results-list` renders the card for `simulation.weather.blizzard` with `"Frostpunk RPG"` inside (step 11).
*   **Target Selectors**:
    *   `#custom-vector-name`, `button[onclick="addCustomEditorVector()"]`
    *   `#editor-vectors-list input[id="check-vec-simulation.weather.blizzard"]`
    *   `#dict-domains-sidebar button.dict-domain-btn`
    *   `#dict-results-list .dict-item-card`

### TEST-305: Dictionary Navigation -> Details Modal -> Multi-Tab State Persistence
*   **Cross-Feature Scope**: Dictionary (F4) $\rightarrow$ Details Drawer $\rightarrow$ View Navigation $\rightarrow$ Drawer Status Retention.
*   **Input Actions**:
    1.  Click `#tab-nav-dictionary`.
    2.  Click the domain filter pill for `character` in `#dict-domains-sidebar`.
    3.  Click the link `.dict-game-link` for game `"Cyberpunk Red: 2045 Chronicle Book"`.
    4.  Verify details modal `#details-modal-overlay` transitions to active.
    5.  Without closing the modal, click the background tab `#tab-nav-vector-search`.
    6.  Verify that the Vector Search tab shows active.
    7.  Click the Explorer Grid tab `#tab-nav-explorer`.
    8.  Check that the Details modal is still active or closed (depending on requirements: the backdrop remains modal; E2E tests should assert whether tab transitions automatically close the modal, or whether the overlay blocks tab clicks).
    *Note: Looking at index.html, `.modal-overlay` has absolute positioning and wraps the card. If active, it overlay blocks interactions with background tabs, meaning clicking tabs is impossible unless the overlay is dismissed.*
    9.  Attempt to click the close button `button.modal-close-btn` and verify the modal overlays deactivate.
*   **Expected DOM Elements & State Changes**:
    *   `.modal-overlay.active` matches target styles and blocks content (step 4).
    *   Verify click blockers function correctly. Closing modal sets `#details-modal-overlay` class back to `.modal-overlay`.
*   **Target Selectors**:
    *   `#dict-domains-sidebar`, `.dict-game-link`
    *   `#details-modal-overlay.active`, `button.modal-close-btn`

### TEST-306: Explorer Filters & Sort -> JSON Code Export Consistency
*   **Cross-Feature Scope**: Explorer Grid Filters (F1) $\rightarrow$ Sort State $\rightarrow$ Database Editor (F5) $\rightarrow$ Export Serialization.
*   **Input Actions**:
    1.  Click `#tab-nav-explorer`.
    2.  Select `"ttrpg"` by clicking `#pill-medium-ttrpg`.
    3.  Select Genre `"Fantasy"` in `#filter-genre` dropdown.
    4.  Set year bounds: `#filter-year-min` = `2026`, `#filter-year-max` = `2026`.
    5.  Set sort: `#filter-sort` = `"title-desc"`.
    6.  Inspect cards in `#games-grid` and assert they match rules.
    7.  Click `#tab-nav-editor`.
    8.  Locate pre-formatted text box `#export-json-preview`.
    9.  Extract text content from `#export-json-preview` and parse it via JSON.parse inside the test framework.
    10. Verify that all elements in the exported JSON are structurally intact and that the filter actions on the explorer page did NOT mutate or truncate the master database inside the export field.
*   **Expected DOM Elements & State Changes**:
    *   Grid items render correctly per sorted sequence (step 6).
    *   JSON text content in `#export-json-preview` matches the full raw database, not just the filtered subset (step 10).
*   **Target Selectors**:
    *   `#pill-medium-ttrpg`, `#filter-genre`, `#filter-year-min`, `#filter-year-max`, `#filter-sort`
    *   `#games-grid`, `#export-json-preview`

---

## Tier 4: Real-World Application Scenarios

These E2E scenarios represent unified, multi-step workflows representing realistic usage profiles (e.g., developers, publishers, registry librarians).

```
[User Journey Workflow Map]

  (SCENARIO 401: Game Designer)
  Compare Games A & B  ==> Identify Overlaps ==> Inspect Specific Vector in Detail Modal
  
  (SCENARIO 402: Board Game Hobbyist)
  Define Custom Vector ==> Fill Out Editor Form ==> Search Local Index ==> Export registry.json
  
  (SCENARIO 403: Publisher Market Research)
  Filter by Medium/Genre ==> Sort by Release Year ==> Audit Systems in Dictionary Domain
  
  (SCENARIO 404: BoardGameGeek Integration)
  Query BGG API ==> Import Metadata & Maps ==> Modify Genre ==> Save to Local Database
  
  (SCENARIO 405: App Registry Administrator)
  Create Registry Entry ==> Verify Local JSON Compilation ==> Download File ==> Integrity Check
```

### SCENARIO-401: TTRPG Designer System Mechanic Overlap Audit
*   **Objective**: A game designer wants to investigate mechanical overlaps between `"Coriolis: Empyrean Canticle 2e Edition"` and `"Cyberpunk Red: 2045 Chronicle Book"` to avoid duplicate rules design.
*   **Step-by-Step E2E User Journey**:
    1.  User enters the index page and clicks the Venn Comparison Tool tab (`#tab-nav-compare`).
    2.  User locates selector panel A (`#compare-selector-a`). They click the game button with text content `"Coriolis: Empyrean Canticle 2e Edition"`.
    3.  User locates selector panel B (`#compare-selector-b`). They click the game button with text content `"Cyberpunk Red: 2045 Chronicle Book"`.
    4.  The page generates the Venn Diagram. User observes that the intersection element `.venn-circle-intersection` displays `"2 Shared"`.
    5.  User clicks the `.venn-circle-intersection` element. This action executes the `highlightCompareColumn('both')` function.
    6.  The shared systems column (`#compare-col-both`) highlights (applies indigo border styling and soft box shadow).
    7.  User hovers over the vector element `.compare-vector-item` containing `combat.melee.tactical` in the middle column.
    8.  User verifies that the `title` attribute of the hover tooltip contains rules strings starting with both `[Coriolis: Empyrean Canticle 2e Edition]:` and `[Cyberpunk Red: 2045 Chronicle Book]:`.
    9.  To audit other systems, user clicks `#tab-nav-explorer`.
    10. User clicks `#pill-medium-ttrpg`.
    11. User enters `"playbook"` in `#omni-search` to find Coriolis, clicks the game card, and reviews the playbook rules in the detail drawer `#modal-vectors-content`.
*   **Expected DOM State & Target Selectors**:
    *   `#tab-nav-compare` -> active view.
    *   Selector buttons active state: `#compare-selector-a button[data-game-id="coriolis_empyrean_canticle_2e_edition_2026"].selected` and `#compare-selector-b button[data-game-id="cyberpunk_red_2045_chronicle_book_2026"].selected`.
    *   `.venn-circle-intersection` text contains `"2 Shared"`.
    *   `#compare-col-both` style attributes include `border: 2px solid var(--color-accent)` and `boxShadow` after click.
    *   `#compare-col-both .compare-vector-item` list elements exist for `combat.melee.tactical` and `combat.initiative.dexterity_based`.

### SCENARIO-402: Hobbyist Adding Custom Mechanics and Verifying Registry Placement
*   **Objective**: A hobbyist game master wants to catalog a homebrew board game ("Monopoly: Stocks Expansion") featuring a new custom mechanical vector (`economy.market.stock_trading`) not present in the current database.
*   **Step-by-Step E2E User Journey**:
    1.  User navigates to the Database Editor (`#tab-nav-editor`).
    2.  User inputs `"Monopoly: Stocks Expansion"` into `#new-game-title`.
    3.  User inputs `"2025"` into `#new-game-year`.
    4.  User selects format `"board_game"` in `#new-game-medium`.
    5.  User inputs `"Economic"` in `#new-game-genre` and `"Trading, Auction"` in `#new-game-subgenres`.
    6.  User scrolls to "Define Custom Vector", inputs `economy.market.stock_trading` in `#custom-vector-name`, and clicks "Add".
    7.  User confirms the alert is dismissed. They check the checklist under `#editor-vectors-list` and verify a checkbox for `economy.market.stock_trading` is checked.
    8.  User scrolls to the dynamic rules explanation area `#editor-explanations-inputs` and locates the newly added textarea for the custom vector. They type: `"Players can buy and sell stock shares of properties to earn dividends."`
    9.  User clicks the "Add to Local Index" submit button and dismisses the success alert.
    10. User clicks Vector Search Engine (`#tab-nav-vector-search`).
    11. User enters `economy.market.stock_trading` in `#vector-query-input` and clicks `button#vector-search-btn`.
    12. User verifies that `"Monopoly: Stocks Expansion"` appears as the sole matching ruleset in `#vector-search-results` with their custom rule text.
    13. User returns to the Editor (`#tab-nav-editor`) and clicks `"Download registry.json"` to download the updated database.
*   **Expected DOM State & Target Selectors**:
    *   `#editor-vectors-list input[id="check-vec-economy.market.stock_trading"]` exists and is checked.
    *   Textarea `textarea[data-vector="economy.market.stock_trading"]` contains explanation.
    *   `#vector-search-results .vector-result-group` contains the search query header and lists the game with class `.vector-game-item`.
    *   An download anchor is dynamically clicked, outputting `registry.json`.

### SCENARIO-403: Publisher Market Research (TTRPG Character System Auditing)
*   **Objective**: A game publisher is researching TTRPG rulesets released from 2020 to 2026 to analyze the prevalence of playbook-based vs. class-based character creation designs.
*   **Step-by-Step E2E User Journey**:
    1.  User loads the application and clicks `#pill-medium-ttrpg` on the Explorer page.
    2.  User inputs `2020` into `#filter-year-min` and `2026` into `#filter-year-max`.
    3.  User changes the sorting option `#filter-sort` to `"year-desc"`.
    4.  User records the total filtered rulesets shown in `#results-count-number`.
    5.  User clicks `#tab-nav-dictionary` to perform a domain-level investigation.
    6.  User clicks the `character` button in `#dict-domains-sidebar`.
    7.  User inspects `#dict-results-list` and locates the card for `character.character_creation.playbook_based`.
    8.  User verifies the badge displays the count of games (e.g., `"Found in 2 games"`).
    9.  User identifies the game links listed inside the playbook card (e.g. `"Coriolis: Empyrean Canticle 2e Edition"` and `"Delta Green: Final Apocalypse"`).
    10. User clicks on `"Delta Green: Final Apocalypse"` to open its Details Modal.
    11. User reviews the specific playbook mechanics explanation and closes the modal.
*   **Expected DOM State & Target Selectors**:
    *   `#results-count-number` displays the filtered count (e.g., `4`).
    *   `#dict-domains-sidebar button.dict-domain-btn` for `character` is highlighted (`.active`).
    *   `#dict-results-list .dict-item-card` lists `character.character_creation.playbook_based` with internal game links.
    *   `#details-modal-overlay.active` opens with Delta Green text.

### SCENARIO-404: Metadata Import & Refinement via BoardGameGeek API
*   **Objective**: An administrator wants to index a complex game ("Scythe") using BoardGameGeek, override its default metadata, manually assign additional rule systems, and review the final output.
*   **Step-by-Step E2E User Journey**:
    1.  User clicks the Database Editor tab (`#tab-nav-editor`).
    2.  In the BGG search input `#bgg-search-query`, user types `"Scythe"`.
    3.  User clicks the "Search BGG" button.
    4.  Upon retrieval, the search status `#bgg-search-status` changes. User selects "Scythe (2016)" and clicks "Import Details".
    5.  User confirms the browser alert. They check the input form and see that the title `#new-game-title` is pre-filled, year is `2016`, format is `board_game`, and primary genre is loaded.
    6.  User overrides the primary genre: selects `#new-game-genre` and types `"Dieselpunk Strategy"`.
    7.  User reviews the pre-checked vectors: `economy.market.worker_placement` is checked, and its explanation has default placeholder text.
    8.  User checks another box in the checklist for `economy.trading.barter`.
    9.  In the explanations textarea for `economy.trading.barter`, the user enters: `"Players can spend resource tokens to trade for currency or popularity."`
    10. User submits the form.
    11. User switches to Venn Comparison (`#tab-nav-compare`).
    12. User selects `"Scythe"` in selector A and another board game in selector B to inspect vector overlap.
*   **Expected DOM State & Target Selectors**:
    *   `#new-game-title` value = `"Scythe"`.
    *   `#new-game-genre` value = `"Dieselpunk Strategy"`.
    *   Checkbox `#check-vec-economy\.trading\.barter` is checked.
    *   Explanations textareas generated for all selected mechanics.
    *   Venn select buttons updated.

### SCENARIO-405: System Crash Recovery & Registry Restoration
*   **Objective**: A registry librarian needs to ensure that when adding a sequence of custom entries, the compiled JSON database output matches standard validation rules, can be downloaded safely, and retains data integrity upon reload.
*   **Step-by-Step E2E User Journey**:
    1.  User navigates to the Database Editor (`#tab-nav-editor`).
    2.  User enters a game: Title = `"Audit Test Game"`, Year = `2026`, Format = `board_game`, Genre = `"Logic"`.
    3.  User checks a system vector (e.g., `combat.movement.grid_based`), and enters explanation: `"Movement tracked on coordinate systems."`
    4.  User clicks "Add to Local Index" and accepts the alert.
    5.  User scrolls to the "Export Database Registry" panel and focuses on `#export-json-preview`.
    6.  User copies the JSON string contents of `#export-json-preview`.
    7.  User runs the copied text through a JSON validator (asserting standard parseability, object structures, and presence of `"Audit Test Game"`).
    8.  User clicks the "Download registry.json" button.
    9.  The browser initiates a download of `registry.json`.
    10. User simulates a database reload: in E2E tests, the download payload is parsed to check that the `"board_game"` array contains the object containing `"game_id": "audit_test_game"`.
*   **Expected DOM State & Target Selectors**:
    *   `#export-json-preview` text content is valid JSON matching `gamesData`.
    *   The exported JSON file contains the new record under the `"board_game"` property array.
    *   All core keys (`game_id`, `title`, `year`, `primary_genre`, `governed_vectors`, `vector_explanations`) exist inside the exported object.
