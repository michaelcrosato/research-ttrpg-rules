# Tier 1 & Tier 2 E2E Test Cases Plan

This document outlines the detailed E2E test plan for the Systems Indexer rules registry application. The planned tests cover 6 core features across Tier 1 (Happy Path Feature Coverage) and Tier 2 (Boundary & Corner Cases).

The tests are designed to execute in a Jest + JSDOM environment, simulating user interactions via DOM events and asserting on DOM tree states.

---

## Standard Mock Registry Dataset
For the assertions in the test cases below, we assume the application is initialized with the following mock dataset:

### TTRPG Rulesets (`gamesData.ttrpg`):
1. **Game ID**: `dnd_5e`
   - **Title**: "Dungeons & Dragons 5e"
   - **Year**: 2014
   - **Primary Genre**: "Fantasy"
   - **Subgenres**: ["Adventure", "High Fantasy"]
   - **Governed Vectors**:
     - `combat.melee.dice_rolls`
     - `character.progression.campaign_based`
     - `simulation.magic.spell_slots`
   - **Vector Explanations**:
     - `combat.melee.dice_rolls`: "Uses d20 + modifiers to hit."
     - `character.progression.campaign_based`: "Character level increases via XP or milestones."
     - `simulation.magic.spell_slots`: "Vancian slots governing daily spells."

2. **Game ID**: `fate_core`
   - **Title**: "Fate Core"
   - **Year**: 2013
   - **Primary Genre**: "Universal"
   - **Subgenres**: ["Narrative", "Rules-Light"]
   - **Governed Vectors**:
     - `politics.factions.loyalty`
     - `combat.melee.dice_rolls`
   - **Vector Explanations**:
     - `politics.factions.loyalty`: "Factions track reputation and allegiance."
     - `combat.melee.dice_rolls`: "Uses four Fudge/Fate dice to resolve actions."

### Board Game Rulesets (`gamesData.board_game`):
3. **Game ID**: `scythe`
   - **Title**: "Scythe"
   - **Year**: 2016
   - **Primary Genre**: "Strategy"
   - **Subgenres**: ["Economic", "Steampunk"]
   - **Governed Vectors**:
     - `economy.market.worker_placement`
     - `combat.movement.hex_grid`
     - `politics.factions.area_influence`
   - **Vector Explanations**:
     - `economy.market.worker_placement`: "Place workers to produce resources."
     - `combat.movement.hex_grid`: "Units move on a hexagon-grid map."
     - `politics.factions.area_influence`: "Factions control territories for points."

4. **Game ID**: `agricola`
   - **Title**: "Agricola"
   - **Year**: 2007
   - **Primary Genre**: "Strategy"
   - **Subgenres**: ["Farming", "Economic"]
   - **Governed Vectors**:
     - `economy.market.worker_placement`
     - `logistics.survival.rations`
   - **Vector Explanations**:
     - `economy.market.worker_placement`: "Place workers to take actions and gather resources."
     - `logistics.survival.rations`: "Must feed family members each harvest."

---

## FEATURE 1: Omni-Search & Filtering Grid (F1)

### Tier 1: Happy Path Tests
#### F1-T1-01: Omni-Search Filter by Title Text
- **Description**: Verifies that typing a partial game title filters the grid cards accordingly.
- **Input Actions**:
  1. Set value of `input#omni-search` to `"dungeons"`.
  2. Dispatch `input` event on `input#omni-search`.
- **Expected DOM State**:
  - `div#games-grid` contains exactly **1** card.
  - The card displays the title "Dungeons & Dragons 5e".
  - The results count badge `#results-count-number` displays `1`.
- **Target Selectors**: `input#omni-search`, `div#games-grid .game-card`, `span#results-count-number`.

#### F1-T1-02: Filter by Medium (TTRPG vs Board Game)
- **Description**: Verifies that clicking the medium pills correctly filters games by format.
- **Input Actions**:
  1. Click button `#pill-medium-ttrpg`.
- **Expected DOM State**:
  - `#pill-medium-ttrpg` has class `active`.
  - `#pill-medium-all` does not have class `active`.
  - `div#games-grid` contains exactly **2** cards (both with class `.ttrpg`).
  - Titles rendered are "Dungeons & Dragons 5e" and "Fate Core".
  - `#results-count-number` displays `2`.
- **Target Selectors**: `button#pill-medium-ttrpg`, `div#games-grid .game-card.ttrpg`, `span#results-count-number`.

#### F1-T1-03: Filter by Genre Select Dropdown
- **Description**: Verifies that choosing a genre from the select dropdown filters the grid cards.
- **Input Actions**:
  1. Set value of `select#filter-genre` to `"Strategy"`.
  2. Dispatch `change` event on `select#filter-genre`.
- **Expected DOM State**:
  - `div#games-grid` contains exactly **2** cards (both with class `.board_game`).
  - The card primary genres display "Strategy".
  - `#results-count-number` displays `2`.
- **Target Selectors**: `select#filter-genre`, `div#games-grid .game-card`, `.primary-genre`.

#### F1-T1-04: Filter by Release Year Range
- **Description**: Verifies that adjusting the minimum and maximum publication year filters out older/newer rulesets.
- **Input Actions**:
  1. Set value of `input#filter-year-min` to `"2010"`.
  2. Dispatch `change` event.
  3. Set value of `input#filter-year-max` to `"2015"`.
  4. Dispatch `change` event.
- **Expected DOM State**:
  - `div#games-grid` contains exactly **2** cards (D&D 5e [2014] and Fate Core [2013]).
  - Years on cards are inside the [2010, 2015] range.
  - `#results-count-number` displays `2`.
- **Target Selectors**: `input#filter-year-min`, `input#filter-year-max`, `div#games-grid .game-card`, `span#results-count-number`.

#### F1-T1-05: Sort Grid by Year (Newest First)
- **Description**: Verifies sorting order changes when selecting different sort options.
- **Input Actions**:
  1. Set value of `select#filter-sort` to `"year-desc"`.
  2. Dispatch `change` event.
- **Expected DOM State**:
  - Game cards in `div#games-grid` are ordered as: "Scythe" (2016) -> "Dungeons & Dragons 5e" (2014) -> "Fate Core" (2013) -> "Agricola" (2007).
  - The first card has year `2016`, second `2014`, third `2013`, fourth `2007`.
- **Target Selectors**: `select#filter-sort`, `div#games-grid .game-card`, `.year-badge`.

---

### Tier 2: Boundary & Corner Case Tests
#### F1-T2-01: Omni-Search Text - Non-matching String
- **Description**: Verifies UI state when search criteria match absolutely nothing in the registry.
- **Input Actions**:
  1. Set value of `input#omni-search` to `"xyz123abc"`.
  2. Dispatch `input` event.
- **Expected DOM State**:
  - `div#games-grid` has **0** game cards.
  - `#results-count-number` displays `0`.
  - An element with class `.no-results-state` is present inside `div#games-grid` containing the text: "No games in registry match your search filters.".
- **Target Selectors**: `input#omni-search`, `div#games-grid`, `.no-results-state`, `span#results-count-number`.

#### F1-T2-02: Release Year - Minimum Greater Than Maximum
- **Description**: Verifies how the grid behaves when an invalid logical range is inputted (Min > Max).
- **Input Actions**:
  1. Set `input#filter-year-min` to `"2020"`.
  2. Dispatch `change` event.
  3. Set `input#filter-year-max` to `"2010"`.
  4. Dispatch `change` event.
- **Expected DOM State**:
  - `div#games-grid` contains **0** game cards (no game can satisfy `>= 2020` and `<= 2010`).
  - `.no-results-state` element is displayed.
  - `#results-count-number` displays `0`.
- **Target Selectors**: `input#filter-year-min`, `input#filter-year-max`, `.no-results-state`, `span#results-count-number`.

#### F1-T2-03: Omni-Search Text - Trim and Whitespace Resiliency
- **Description**: Verifies that leading, trailing, and multiple spaces in search terms are correctly trimmed.
- **Input Actions**:
  1. Set value of `input#omni-search` to `"   Scythe   "`.
  2. Dispatch `input` event.
- **Expected DOM State**:
  - `div#games-grid` displays exactly **1** card ("Scythe").
  - `#results-count-number` displays `1`.
- **Target Selectors**: `input#omni-search`, `div#games-grid .game-card`, `span#results-count-number`.

#### F1-T2-04: Release Year - Exact Match Boundaries
- **Description**: Verifies that boundary matches (equal to min or max years) are inclusive.
- **Input Actions**:
  1. Set `input#filter-year-min` to `"2014"`.
  2. Dispatch `change` event.
  3. Set `input#filter-year-max` to `"2014"`.
  4. Dispatch `change` event.
- **Expected DOM State**:
  - `div#games-grid` contains exactly **1** card ("Dungeons & Dragons 5e" [2014]).
  - `#results-count-number` displays `1`.
- **Target Selectors**: `input#filter-year-min`, `input#filter-year-max`, `div#games-grid .game-card .year-badge`.

#### F1-T2-05: Multi-Criteria Intersection resulting in Zero Results
- **Description**: Verifies search reset behavior and empty state when several valid filters overlap into an empty set.
- **Input Actions**:
  1. Click `#pill-medium-ttrpg`.
  2. Set `select#filter-genre` to `"Strategy"`.
- **Expected DOM State**:
  - No cards match (as all "Strategy" games in our mock are board games, not TTRPGs).
  - `div#games-grid` displays `.no-results-state`.
  - `#results-count-number` displays `0`.
- **Target Selectors**: `button#pill-medium-ttrpg`, `select#filter-genre`, `div#games-grid`, `.no-results-state`.

---

## FEATURE 2: Vector Search Engine (F2)

### Tier 1: Happy Path Tests
#### F2-T1-01: Tab Navigation to Vector Search Panel
- **Description**: Verifies navigation switches view panel to Vector Search correctly.
- **Input Actions**:
  1. Click `button#tab-nav-vector-search`.
- **Expected DOM State**:
  - `button#tab-nav-vector-search` has class `active`.
  - `section#vector-search-view` has class `active` and is visible.
  - Other sections (like `section#explorer-view`) do not have class `active`.
- **Target Selectors**: `button#tab-nav-vector-search`, `section#vector-search-view.active`.

#### F2-T1-02: Show Autocomplete Suggestions on Typing Domain
- **Description**: Verifies typing a partial namespace shows autocomplete suggestions.
- **Input Actions**:
  1. Click `button#tab-nav-vector-search` to switch views.
  2. Set value of `input#vector-query-input` to `"combat"`.
  3. Dispatch `input` event on `input#vector-query-input`.
- **Expected DOM State**:
  - `div#vector-query-suggestions` has style `display: block` (or is visible).
  - `div#vector-query-suggestions` contains suggestion items (`.suggestion-item`).
  - Suggestions shown include: "combat.melee.dice_rolls" and "combat.movement.hex_grid".
- **Target Selectors**: `input#vector-query-input`, `div#vector-query-suggestions`, `.suggestion-item`.

#### F2-T1-03: Select Autocomplete Suggestion via Click
- **Description**: Verifies clicking on a suggestion fills the search box and triggers the search automatically.
- **Input Actions**:
  1. Click `button#tab-nav-vector-search`.
  2. Type `"combat"` into `input#vector-query-input` and dispatch `input`.
  3. Click `.suggestion-item` containing text `"combat.melee.dice_rolls"`.
- **Expected DOM State**:
  - `input#vector-query-input` value becomes `"combat.melee.dice_rolls"`.
  - `div#vector-query-suggestions` style becomes `display: none` (or suggestions are cleared).
  - `div#vector-search-results` contains results group `.vector-result-group`.
  - Result title `.vector-result-title` displays "combat.melee.dice_rolls".
- **Target Selectors**: `div#vector-query-suggestions .suggestion-item`, `input#vector-query-input`, `#vector-search-results .vector-result-title`.

#### F2-T1-04: Execute Search on Vector via Click Search Button
- **Description**: Verifies search execution when clicking the "Search Systems" button.
- **Input Actions**:
  1. Click `button#tab-nav-vector-search`.
  2. Set `input#vector-query-input` value to `"economy.market.worker_placement"`.
  3. Click `button#vector-search-btn`.
- **Expected DOM State**:
  - `div#vector-search-results` displays matching games.
  - The results list contains **2** games ("Scythe" and "Agricola").
  - The rules explanation texts displayed match the mock values for each game's `economy.market.worker_placement` vector.
- **Target Selectors**: `button#vector-search-btn`, `#vector-search-results .vector-game-item`, `.vector-rule-text`.

#### F2-T1-05: Click Game Title in Results List Opens Details Modal
- **Description**: Verifies that clicking a game link inside the vector search results launches the game details drawer.
- **Input Actions**:
  1. Run search for `"economy.market.worker_placement"`.
  2. Click the game title link `a.vector-game-title` for "Scythe".
- **Expected DOM State**:
  - `div#details-modal-overlay` has class `active` (making it visible).
  - Modal title `h2#modal-game-title` text is "Scythe".
  - Modal medium badge `span#modal-medium` text is "Board Game".
- **Target Selectors**: `a.vector-game-title`, `div#details-modal-overlay.active`, `h2#modal-game-title`.

---

### Tier 2: Boundary & Corner Case Tests
#### F2-T2-01: Empty Vector Query Search
- **Description**: Verifies behavior when the user submits an empty query.
- **Input Actions**:
  1. Click `button#tab-nav-vector-search`.
  2. Set `input#vector-query-input` value to `""` (empty).
  3. Click `button#vector-search-btn`.
- **Expected DOM State**:
  - `div#vector-search-results` displays `.no-results-state` element.
  - Text inside states: "Please enter a vector namespace to search (e.g. combat.melee.tactical).".
- **Target Selectors**: `button#vector-search-btn`, `#vector-search-results .no-results-state`.

#### F2-T2-02: Non-matching Vector Search Query
- **Description**: Verifies behavior when searching for an syntactically valid but non-indexed vector.
- **Input Actions**:
  1. Click `button#tab-nav-vector-search`.
  2. Set `input#vector-query-input` value to `"stealth.shadows.hiding"`.
  3. Click `button#vector-search-btn`.
- **Expected DOM State**:
  - `div#vector-search-results` displays `.no-results-state` element.
  - Text contains: "No games in database feature mechanical governance for vector: stealth.shadows.hiding".
- **Target Selectors**: `button#vector-search-btn`, `#vector-search-results .no-results-state`.

#### F2-T2-03: Close Suggestions Overlay on Click Outside
- **Description**: Verifies that the autocomplete suggestions dropdown is dismissed when the user clicks elsewhere.
- **Input Actions**:
  1. Click `button#tab-nav-vector-search`.
  2. Type `"combat"` into `input#vector-query-input` and dispatch `input`.
  3. Click on the main page header element (`header`).
- **Expected DOM State**:
  - `div#vector-query-suggestions` style is `display: none` (or suggestions are cleared).
- **Target Selectors**: `div#vector-query-suggestions`, `header`.

#### F2-T2-04: Autocomplete Match Insensitivity and Spaces
- **Description**: Verifies search suggestions resolve despite mixed case and surrounding whitespace.
- **Input Actions**:
  1. Click `button#tab-nav-vector-search`.
  2. Set `input#vector-query-input` to `"   cOmBaT   "`.
  3. Dispatch `input` event.
- **Expected DOM State**:
  - `div#vector-query-suggestions` displays suggestions containing `"combat.melee.dice_rolls"` and `"combat.movement.hex_grid"`.
- **Target Selectors**: `div#vector-query-suggestions`, `.suggestion-item`.

#### F2-T2-05: Enter Key Submits Search
- **Description**: Verifies keyboard accessibility for executing vector search.
- **Input Actions**:
  1. Click `button#tab-nav-vector-search`.
  2. Set `input#vector-query-input` value to `"simulation.magic.spell_slots"`.
  3. Dispatch a `keypress` event with key `"Enter"` (code `13`) on `input#vector-query-input`.
- **Expected DOM State**:
  - `div#vector-search-results` renders `.vector-result-group` for "simulation.magic.spell_slots".
  - The results list shows "Dungeons & Dragons 5e".
- **Target Selectors**: `input#vector-query-input`, `#vector-search-results .vector-result-title`.

---

## FEATURE 3: Venn Comparison Tool (F3)

### Tier 1: Happy Path Tests
#### F3-T1-01: Tab Navigation to Venn Comparison View
- **Description**: Verifies comparison panels and default states render upon entry.
- **Input Actions**:
  1. Click `button#tab-nav-compare`.
- **Expected DOM State**:
  - `section#compare-view` has class `active`.
  - Left selector panel `aside#compare-selector-a` displays ruleset list.
  - Right selector panel `aside#compare-selector-b` displays ruleset list.
  - Results container `#comparison-results` shows `.no-results-state` message: "Please select two rulesets from the panels above to analyze overlaps and differences in their mechanical systems.".
- **Target Selectors**: `button#tab-nav-compare`, `section#compare-view.active`, `aside#compare-selector-a`, `aside#compare-selector-b`, `#comparison-results .no-results-state`.

#### F3-T1-02: Select Game A (Verify Single Selection State)
- **Description**: Verifies that selecting Game A highlights the selection but waits for Game B before comparing.
- **Input Actions**:
  1. Click `button#tab-nav-compare`.
  2. Click button `.select-game-btn` for "Dungeons & Dragons 5e" in `aside#compare-selector-a`.
- **Expected DOM State**:
  - The clicked button in Selector A has class `selected`.
  - Other buttons in Selector A do not have class `selected`.
  - `#comparison-results` still displays the `.no-results-state` placeholder.
- **Target Selectors**: `aside#compare-selector-a button.select-game-btn.selected`, `#comparison-results .no-results-state`.

#### F3-T1-03: Select Game A & B to Render Venn Diagram
- **Description**: Verifies that selecting two different games compiles the comparison Venn and counts.
- **Input Actions**:
  1. Click `button#tab-nav-compare`.
  2. Click `.select-game-btn` for "Dungeons & Dragons 5e" in `aside#compare-selector-a`.
  3. Click `.select-game-btn` for "Fate Core" in `aside#compare-selector-b`.
- **Expected DOM State**:
  - Both buttons show `.selected` class in their respective panels.
  - `.venn-diagram-container` is present in the DOM.
  - Circle labels show "Dungeons & Dragons 5e" and "Fate Core".
  - Venn diagram counts show: 2 exclusive for A (class_based, spell_slots), 1 shared (combat.melee.dice_rolls), 1 exclusive for B (loyalty).
- **Target Selectors**: `aside#compare-selector-a button.selected`, `aside#compare-selector-b button.selected`, `.venn-diagram-container`, `.circle-a .venn-count`, `.venn-circle-intersection .venn-count`, `.circle-b .venn-count`.

#### F3-T1-04: Click Venn Segments to Highlight Comparison Columns
- **Description**: Verifies clicking parts of the Venn diagram applies visual focus highlights to corresponding lists.
- **Input Actions**:
  1. Compare "Dungeons & Dragons 5e" and "Fate Core".
  2. Click `.venn-circle.circle-a`.
- **Expected DOM State**:
  - Column element `div#compare-col-a` has highlight styling (custom border and background colors, and box-shadow).
  - Columns `div#compare-col-both` and `div#compare-col-b` do not have highlight styles.
- **Target Selectors**: `.venn-circle.circle-a`, `div#compare-col-a`, `div#compare-col-both`, `div#compare-col-b`.

#### F3-T1-05: Rules Explanations Tooltips in Columns
- **Description**: Verifies that hovered vector items in comparison lists display the mechanical rules text in their `title` attribute.
- **Input Actions**:
  1. Compare "Dungeons & Dragons 5e" and "Fate Core".
- **Expected DOM State**:
  - The element `.compare-vector-item` for `simulation.magic.spell_slots` in `div#compare-col-a` has the `title` attribute: "Vancian slots governing daily spells.".
  - The shared element `.compare-vector-item` for `combat.melee.dice_rolls` in `div#compare-col-both` has the compound `title` attribute: `[Dungeons & Dragons 5e]: Uses d20 + modifiers to hit.\n\n[Fate Core]: Uses four Fudge/Fate dice to resolve actions.`.
- **Target Selectors**: `div#compare-col-a .compare-vector-item`, `div#compare-col-both .compare-vector-item`.

---

### Tier 2: Boundary & Corner Case Tests
#### F3-T2-01: Select Same Game in Both Panels
- **Description**: Verifies set math when a user compares a game against itself (100% overlap).
- **Input Actions**:
  1. Click `button#tab-nav-compare`.
  2. Click `.select-game-btn` for "Scythe" in `aside#compare-selector-a`.
  3. Click `.select-game-btn` for "Scythe" in `aside#compare-selector-b`.
- **Expected DOM State**:
  - The Venn intersection shows all 3 vectors as shared (`3 Shared`).
  - Both circle-a and circle-b show `0 Exclusive`.
  - `div#compare-col-both` lists all three vectors (`economy.market.worker_placement`, `combat.movement.hex_grid`, `politics.factions.area_influence`).
  - Columns `div#compare-col-a` and `div#compare-col-b` list no vectors and display the `<p class="text-muted">None</p>` placeholder.
- **Target Selectors**: `div#compare-col-both .compare-vector-item`, `div#compare-col-a p.text-muted`.

#### F3-T2-02: Change Selector Selection Updates Venn
- **Description**: Verifies that changing Game A updates the result panels instantly while keeping Game B locked.
- **Input Actions**:
  1. Compare "Dungeons & Dragons 5e" and "Fate Core".
  2. Click `.select-game-btn` for "Scythe" in `aside#compare-selector-a`.
- **Expected DOM State**:
  - In Selector A, the button for "Dungeons & Dragons 5e" loses class `selected`, and "Scythe" gains it.
  - The Venn header updates comparison title labels to compare "Scythe" vs "Fate Core".
  - Overlaps are recalculated: Scythe and Fate Core have 0 shared vectors.
- **Target Selectors**: `aside#compare-selector-a button.selected`, `.circle-a .venn-game-label`.

#### F3-T2-03: Zero Overlap Comparison State
- **Description**: Verifies the UI display when two compared rulesets share absolutely no vectors.
- **Input Actions**:
  1. Compare "Fate Core" and "Agricola".
- **Expected DOM State**:
  - Intersection count is `0`.
  - Column `div#compare-col-both` displays placeholder `<p class="text-muted">No shared mechanical systems.</p>`.
  - Exclusive columns contain their respective vectors.
- **Target Selectors**: `.venn-circle-intersection .venn-count`, `div#compare-col-both p.text-muted`.

#### F3-T2-04: Venn Highlights Toggle Styles
- **Description**: Verifies that highlighting one column removes highlights from previous choices.
- **Input Actions**:
  1. Compare "Dungeons & Dragons 5e" and "Fate Core".
  2. Click `.venn-circle.circle-a`.
  3. Click `.venn-circle.circle-b`.
- **Expected DOM State**:
  - Highlight styles (background, border, box-shadow) are cleared from `div#compare-col-a`.
  - Highlight styles are now applied to `div#compare-col-b`.
- **Target Selectors**: `.venn-circle.circle-b`, `div#compare-col-a`, `div#compare-col-b`.

#### F3-T2-05: Extreme Asymmetry (All Vectors Subset)
- **Description**: Verifies behavior when Game B's vectors are a subset of Game A's vectors.
- **Input Actions**:
  1. Compare "Agricola" (worker_placement, rations) and "Scythe" (worker_placement, hex_grid, area_influence).
- **Expected DOM State**:
  - Intersection shows `1 Shared` (`economy.market.worker_placement`).
  - Circle B (Scythe) shows `2 Exclusive` (`combat.movement.hex_grid`, `politics.factions.area_influence`).
  - Circle A (Agricola) shows `1 Exclusive` (`logistics.survival.rations`).
- **Target Selectors**: `.venn-circle-intersection .venn-count`, `div#compare-col-both .compare-vector-item`.

---

## FEATURE 4: Vector Dictionary (F4)

### Tier 1: Happy Path Tests
#### F4-T1-01: Tab Navigation to Dictionary View
- **Description**: Verifies dictionary sidebar and details load correctly on tab switch.
- **Input Actions**:
  1. Click `button#tab-nav-dictionary`.
- **Expected DOM State**:
  - `section#dictionary-view` has class `active`.
  - Sidebar `aside#dict-domains-sidebar` lists system domains, with "All Domains" highlighted active.
  - The badge count on "All Domains" equals the number of unique vectors in the dataset (**6**).
- **Target Selectors**: `button#tab-nav-dictionary`, `section#dictionary-view.active`, `button.dict-domain-btn.active`.

#### F4-T1-02: Dictionary Card Content Structure
- **Description**: Verifies cards represent the vectors correctly, detailing implementation game links.
- **Input Actions**:
  1. Click `button#tab-nav-dictionary`.
- **Expected DOM State**:
  - `div#dict-results-list` contains vector cards (class `.dict-item-card`).
  - In card for `combat.melee.dice_rolls`, the name is displayed alongside a badge: "Found in 2 games".
  - The card displays game links `span.dict-game-link` for "Dungeons & Dragons 5e" and "Fate Core".
- **Target Selectors**: `.dict-item-card`, `.dict-item-name`, `.dict-item-games span.dict-game-link`.

#### F4-T1-03: Filter Dictionary List by Sidebar Domain
- **Description**: Verifies clicking a domain button filters list cards.
- **Input Actions**:
  1. Click `button#tab-nav-dictionary`.
  2. Click the domain button `.dict-domain-btn` containing text "combat".
- **Expected DOM State**:
  - The "combat" domain button receives class `active`.
  - `h2#dict-current-domain` text updates to "combat Domain".
  - `div#dict-results-list` renders exactly **2** cards (`combat.melee.dice_rolls` and `combat.movement.hex_grid`).
- **Target Selectors**: `button.dict-domain-btn.active`, `h2#dict-current-domain`, `.dict-item-card`.

#### F4-T1-04: Click Game Link Inside Dictionary Card Opens Modal
- **Description**: Verifies game details drawer is triggered from dictionary links.
- **Input Actions**:
  1. Click `button#tab-nav-dictionary`.
  2. Click `span.dict-game-link` for "Fate Core" in the `combat.melee.dice_rolls` card.
- **Expected DOM State**:
  - `div#details-modal-overlay` gets class `active`.
  - Modal title `h2#modal-game-title` displays "Fate Core".
- **Target Selectors**: `span.dict-game-link`, `div#details-modal-overlay.active`, `h2#modal-game-title`.

#### F4-T1-05: Reset Dictionary Filter to All Domains
- **Description**: Verifies reset functionality via "All Domains" button.
- **Input Actions**:
  1. Select the "combat" domain button.
  2. Click the "All Domains" button `.dict-domain-btn`.
- **Expected DOM State**:
  - "All Domains" button becomes active.
  - `h2#dict-current-domain` displays "All System Vectors".
  - `div#dict-results-list` displays all **6** vectors.
- **Target Selectors**: `button.dict-domain-btn.active`, `h2#dict-current-domain`, `.dict-item-card`.

---

### Tier 2: Boundary & Corner Case Tests
#### F4-T2-01: Empty Domain Rendering Fallback
- **Description**: Verifies system stability when a non-existent or empty domain is loaded.
- **Input Actions**:
  1. Execute global dictionary function `window.setDictDomain('nonexistent')` via mock environment.
- **Expected DOM State**:
  - `h2#dict-current-domain` displays "nonexistent Domain".
  - `div#dict-results-list` displays `<p class="text-secondary">No vectors recorded.</p>`.
- **Target Selectors**: `h2#dict-current-domain`, `div#dict-results-list p.text-secondary`.

#### F4-T2-02: Grammar Agreement in Vector Found Counts (Plural vs Singular)
- **Description**: Verifies text logic handles singular ("game") vs plural ("games") depending on counts.
- **Input Actions**:
  1. Navigate to dictionary view.
- **Expected DOM State**:
  - The badge for `combat.melee.dice_rolls` (2 matches) contains text "Found in 2 games".
  - The badge for `simulation.magic.spell_slots` (1 match) contains text "Found in 1 game".
- **Target Selectors**: `.dict-item-name .badge`.

#### F4-T2-03: Sidebar Badge Count Matches Rendered Card Volume
- **Description**: Verifies synchronization of numbers in sidebar filters and results.
- **Input Actions**:
  1. Click the "economy" domain button.
- **Expected DOM State**:
  - The badge on the "economy" domain button displays `1` (which maps to economy domain).
  - The list container `div#dict-results-list` has exactly **1** card matching `economy.market.worker_placement`.
- **Target Selectors**: `button.dict-domain-btn.active .badge`, `div#dict-results-list .dict-item-card`.

#### F4-T2-04: Grid Resilience with Long Vector Strings
- **Description**: Verifies CSS layout resilience if a long custom vector name is introduced.
- **Input Actions**:
  1. Programmatically mock addition of vector `"simulation.environment.weather.temperature.heat_levels"`.
  2. Click `button#tab-nav-dictionary`.
- **Expected DOM State**:
  - The card name element displays the full namespace string, wrapping correctly within bounds of `.dict-item-card`.
- **Target Selectors**: `.dict-item-card`, `.dict-item-name`.

#### F4-T2-05: Modal Close Restores Dictionary State
- **Description**: Verifies that closing a detailed modal triggered from the dictionary preserves the active filters.
- **Input Actions**:
  1. Select "politics" domain button (renders `politics.factions.loyalty` and `politics.factions.area_influence`).
  2. Click game link "Fate Core".
  3. Click close button `.modal-close-btn` on modal.
- **Expected DOM State**:
  - Modal overlay loses `active` class.
  - "politics" domain button remains active and highlighted.
  - `div#dict-results-list` still displays filtered results.
- **Target Selectors**: `div#details-modal-overlay`, `button.dict-domain-btn.active`, `.modal-close-btn`.

---

## FEATURE 5: Database Editor (F5)

### Tier 1: Happy Path Tests
#### F5-T1-01: Tab Navigation to Editor View
- **Description**: Verifies editor forms and default settings load on tab navigation.
- **Input Actions**:
  1. Click `button#tab-nav-editor`.
- **Expected DOM State**:
  - `section#editor-view` has class `active`.
  - Form `form#add-game-form` is visible.
  - The checkable vectors list `div#editor-vectors-list` contains all **6** vectors.
  - Serialization panel `pre#export-json-preview` contains valid database JSON representing original registry.
- **Target Selectors**: `button#tab-nav-editor`, `section#editor-view.active`, `div#editor-vectors-list`, `pre#export-json-preview`.

#### F5-T1-02: Check Vector Reveals Explanation Field
- **Description**: Verifies checking a vector dynamically generates its explanation input field.
- **Input Actions**:
  1. Click `button#tab-nav-editor`.
  2. Click checkbox `input#check-vec-combat_melee_dice_rolls`.
- **Expected DOM State**:
  - `input#check-vec-combat_melee_dice_rolls` is checked.
  - `div#editor-explanations-inputs` contains a `.vector-explanation-row` with ID `exp-row-combat_melee_dice_rolls`.
  - The row contains a required `textarea` with matching `data-vector="combat.melee.dice_rolls"`.
- **Target Selectors**: `input#check-vec-combat_melee_dice_rolls`, `div#editor-explanations-inputs .vector-explanation-row textarea`.

#### F5-T1-03: Add Custom Vector to Checklist
- **Description**: Verifies adding a custom namespace adds it to the select lists and creates an explanation input.
- **Input Actions**:
  1. Click `button#tab-nav-editor`.
  2. Set value of `input#custom-vector-name` to `"stealth.detection.light_level"`.
  3. Click button next to it (calling `addCustomEditorVector()`).
- **Expected DOM State**:
  - `div#editor-vectors-list` has a new item for `stealth.detection.light_level`.
  - Its checkbox `input#check-vec-stealth_detection_light_level` is checked.
  - `div#editor-explanations-inputs` automatically has `textarea[data-vector="stealth.detection.light_level"]` appended.
  - `input#custom-vector-name` value is reset to empty.
- **Target Selectors**: `input#custom-vector-name`, `input#check-vec-stealth_detection_light_level`, `div#editor-explanations-inputs textarea`.

#### F5-T1-04: Add Game Success Lifecycle
- **Description**: Verifies that submitting the filled form inserts the game into local memory, resets the form, and updates the explorer.
- **Input Actions**:
  1. Click `button#tab-nav-editor`.
  2. Fill Title: `"Gloomhaven"`, Year: `"2017"`, Medium: `"board_game"`, Genre: `"Fantasy"`, Subgenres: `"Cooperative, Campaign"`.
  3. Check checkbox `input#check-vec-combat_melee_dice_rolls`.
  4. Fill the text explanation: `"Uses card modifier deck instead of dice rolls."`.
  5. Mock window alert to prevent blocking.
  6. Submit `form#add-game-form`.
- **Expected DOM State**:
  - Form inputs reset, explanations list is cleared, vector checkboxes are unchecked.
  - Total rulesets count dashboard `#stat-total-games` updates from 4 to **5**.
  - Board Game rulesets count `#stat-total-boardgames` updates from 2 to **3**.
  - `pre#export-json-preview` compiles updated JSON containing `"Gloomhaven"` object.
  - Navigating to Explorer tab, search `"Gloomhaven"` successfully displays card.
- **Target Selectors**: `form#add-game-form`, `span#stat-total-games`, `pre#export-json-preview`.

#### F5-T1-05: Download registry.json Trigger
- **Description**: Verifies that the download button triggers file download anchor logic.
- **Input Actions**:
  1. Click `button#tab-nav-editor`.
  2. Click button "Download registry.json" (`button[onclick="downloadUpdatedRegistry()"]`).
- **Expected DOM State**:
  - Anchor element `a` with download attribute `"registry.json"` is briefly created and clicked (intercepted or verified in mock environment).
- **Target Selectors**: `button[onclick="downloadUpdatedRegistry()"]`.

---

### Tier 2: Boundary & Corner Case Tests
#### F5-T2-01: Form Submission Blocked on Missing Required Fields
- **Description**: Verifies that browser form validation blocks submission if mandatory text is missing.
- **Input Actions**:
  1. Click `button#tab-nav-editor`.
  2. Fill Title: `"Broken Game"`, leave Year and Genre empty.
  3. Submit `form#add-game-form`.
- **Expected DOM State**:
  - Form validation blocks submit (assert `checkValidity()` on form returns `false`).
  - Database count `#stat-total-games` remains `4`.
  - JSON preview remains unchanged.
- **Target Selectors**: `form#add-game-form`, `span#stat-total-games`.

#### F5-T2-02: Prevent Duplicate Game ID Registrations
- **Description**: Verifies that adding a game that results in an existing `game_id` is blocked with alert.
- **Input Actions**:
  1. Click `button#tab-nav-editor`.
  2. Fill Title: `"Dungeons & Dragons 5e"` (which compiles to existing key `dungeons_dragons_5e`), Year: `"2014"`, Genre: `"Fantasy"`.
  3. Submit `form#add-game-form`.
- **Expected DOM State**:
  - `window.alert` is called with message: "A game with ID 'dungeons_dragons_5e' already exists in registry!".
  - The game is NOT added to memory; database counts remain unchanged.
  - Form inputs are NOT cleared, allowing the user to correct the title.
- **Target Selectors**: `form#add-game-form`, `span#stat-total-games`.

#### F5-T2-03: Invalid Custom Vector Format Rejected
- **Description**: Verifies validation regex/logic on custom vector notation.
- **Input Actions**:
  1. Click `button#tab-nav-editor`.
  2. Fill `input#custom-vector-name` with `"invalid_notation"` (needs 3 dot-segments).
  3. Click "Add" button.
- **Expected DOM State**:
  - `window.alert` is called with message: "Invalid vector notation. Please use domain.subsystem.focus (e.g. combat.melee.tactical)".
  - The vector is not added to checklist `div#editor-vectors-list`.
- **Target Selectors**: `input#custom-vector-name`, `div#editor-vectors-list`.

#### F5-T2-04: Duplicate Custom Vector Addition Blocked
- **Description**: Verifies adding a custom vector that already exists in the unique list is rejected.
- **Input Actions**:
  1. Click `button#tab-nav-editor`.
  2. Fill `input#custom-vector-name` with `"combat.melee.dice_rolls"` (existing vector).
  3. Click "Add" button.
- **Expected DOM State**:
  - `window.alert` is called with message: "This vector namespace already exists!".
  - The checklist is not modified and duplicates are avoided.
- **Target Selectors**: `input#custom-vector-name`.

#### F5-T2-05: Uncheck Vector Removes Explanation Textarea
- **Description**: Verifies that unchecking a checkbox correctly cleans up the corresponding text input field.
- **Input Actions**:
  1. Click `button#tab-nav-editor`.
  2. Check checkbox `input#check-vec-combat_melee_dice_rolls` (generates textarea).
  3. Uncheck checkbox `input#check-vec-combat_melee_dice_rolls`.
- **Expected DOM State**:
  - Textarea container row `div#exp-row-combat_melee_dice_rolls` is completely removed from the DOM.
- **Target Selectors**: `div#editor-explanations-inputs`, `#exp-row-combat_melee_dice_rolls`.

---

## FEATURE 6: BoardGameGeek Import (F6)

### Tier 1: Happy Path Tests
#### F6-T1-01: Search Board Game on BGG
- **Description**: Verifies search query hits mock BGG search API and lists matches.
- **Input Actions**:
  1. Click `button#tab-nav-editor`.
  2. Fill `input#bgg-search-query` with `"Scythe"`.
  3. Click button "Search BGG" (`button[onclick="searchBGG()"]`).
  4. Resolve fetch with search XML data (`mockBggSearchXml`).
  5. Flush microtasks.
- **Expected DOM State**:
  - `#bgg-search-status` displays text: "Found 1 matching board games. Select one to import:".
  - `#bgg-search-results-area` is visible (`display: block`).
  - Results area lists "Scythe (2016)" and displays an "Import Details" button.
- **Target Selectors**: `input#bgg-search-query`, `div#bgg-search-status`, `div#bgg-search-results-area`, `button[onclick^="importBGGGame"]`.

#### F6-T1-02: Import Game Details and Pre-fill Form
- **Description**: Verifies details API xml is parsed and pre-fills text input fields.
- **Input Actions**:
  1. Perform BGG search.
  2. Click "Import Details" button for game ID `"99999"`.
  3. Resolve fetch with thing XML data (`mockBggThingXml`).
  4. Flush microtasks.
- **Expected DOM State**:
  - `input#new-game-title` value becomes "Mock BGG Game".
  - `input#new-game-year` value becomes `2022`.
  - `select#new-game-medium` value is set to `"board_game"`.
  - Primary genre `input#new-game-genre` is prefilled with `"Fantasy"`.
  - Status `#bgg-search-status` displays: "Successfully imported 'Mock BGG Game'! Form filled with mapped vectors: economy.market.worker_placement".
- **Target Selectors**: `input#new-game-title`, `input#new-game-year`, `input#new-game-genre`, `div#bgg-search-status`.

#### F6-T1-03: BGG Mechanic Maps to Vector Checkbox
- **Description**: Verifies BGG mechanics correctly trigger corresponding namespaced vector checkbox.
- **Input Actions**:
  1. Import game details for mock game having mechanic `"Worker Placement"`.
- **Expected DOM State**:
  - Vector checkbox `input#check-vec-economy_market_worker_placement` in the editor checklist is checked automatically.
- **Target Selectors**: `input#check-vec-economy_market_worker_placement`.

#### F6-T1-04: Autofill Vector Rules Explanations
- **Description**: Verifies explanations textareas are generated and pre-populated with standard reference text.
- **Input Actions**:
  1. Import game details with mechanic `"Worker Placement"`.
- **Expected DOM State**:
  - Textarea `textarea[data-vector="economy.market.worker_placement"]` is created inside `#editor-explanations-inputs`.
  - Textarea value is filled with: "This game features the Worker Placement mechanic. Rules dictate how this works in-game.".
- **Target Selectors**: `div#editor-explanations-inputs textarea[data-vector="economy.market.worker_placement"]`.

#### F6-T1-05: Complete Lifecycle: Import, Edit and Index
- **Description**: Verifies imported form can be successfully added to index after small edits.
- **Input Actions**:
  1. Import BGG game details.
  2. Edit `input#new-game-title` to `"Mock BGG Game (Revised Edition)"`.
  3. Edit text in worker placement explanation textarea.
  4. Submit `form#add-game-form`.
- **Expected DOM State**:
  - Game is successfully added to memory.
  - `#stat-total-games` count increments to `5`.
  - Search in Explorer grid shows `"Mock BGG Game (Revised Edition)"`.
- **Target Selectors**: `form#add-game-form`, `#stat-total-games`, `#games-grid`.

---

### Tier 2: Boundary & Corner Case Tests
#### F6-T2-01: Empty Search Input Blocked
- **Description**: Verifies searching with empty string is rejected before API trigger.
- **Input Actions**:
  1. Click `button#tab-nav-editor`.
  2. Set `input#bgg-search-query` value to `""` (empty).
  3. Click "Search BGG" button.
- **Expected DOM State**:
  - `window.alert` is triggered with message: "Please enter a game name to search.".
  - Search status `#bgg-search-status` remains hidden and no API fetch is initiated.
- **Target Selectors**: `input#bgg-search-query`, `div#bgg-search-status`.

#### F6-T2-02: BGG Search Returns Zero Matches
- **Description**: Verifies UI state when search response contains no matches.
- **Input Actions**:
  1. Search BGG with query `"unknowngame123"`.
  2. Resolve fetch response with `<items total="0"></items>`.
  3. Flush microtasks.
- **Expected DOM State**:
  - `#bgg-search-status` displays text: "No matching board games found on BGG.".
  - `#bgg-search-results-area` remains hidden or empty.
- **Target Selectors**: `div#bgg-search-status`, `div#bgg-search-results-area`.

#### F6-T2-03: BGG API Error Handling (Offline / Timeout)
- **Description**: Verifies stability and error message when BGG fetch fails or times out.
- **Input Actions**:
  1. Search BGG with query `"Scythe"`.
  2. Reject the fetch promise with a network error.
  3. Flush microtasks.
- **Expected DOM State**:
  - `#bgg-search-status` displays text: "Error connecting to BGG API. Make sure you are online.".
  - `#bgg-search-results-area` remains hidden.
- **Target Selectors**: `div#bgg-search-status`, `div#bgg-search-results-area`.

#### F6-T2-04: Import Game Lacking Year and Category Metadata
- **Description**: Verifies import logic fallbacks when game details lack basic metadata.
- **Input Actions**:
  1. Import game details with XML that has no `<yearpublished>` or `<link type="boardgamecategory">` nodes.
- **Expected DOM State**:
  - `input#new-game-year` value defaults safely to `2026`.
  - `input#new-game-genre` value defaults safely to `"Strategy"`.
  - Form does not crash and remains editable.
- **Target Selectors**: `input#new-game-year`, `input#new-game-genre`.

#### F6-T2-05: Import Game with Unmapped Mechanics
- **Description**: Verifies that BGG mechanics not present in our registry mapping are ignored gracefully.
- **Input Actions**:
  1. Import game details with XML that lists mechanics like `"Roll / Spin and Move"` (not mapped in `bggMechanicMapping`).
- **Expected DOM State**:
  - Form basic fields are filled.
  - No checkboxes are checked in `div#editor-vectors-list`.
  - `#editor-explanations-inputs` contains no elements.
- **Target Selectors**: `div#editor-explanations-inputs`, `#editor-vectors-list input:checked`.
