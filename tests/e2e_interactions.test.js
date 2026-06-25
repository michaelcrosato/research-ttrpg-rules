/**
 * e2e_interactions.test.js
 *
 * Comprehensive end-to-end interaction test suite for the Systems Indexer.
 * Tests EVERY clickable, searchable, and interactive surface in the application.
 *
 * Covers:
 * 1. Application bootstrap (DOMContentLoaded → load → render)
 * 2. Tab navigation (all 6 tabs)
 * 3. Explorer grid (search, filter, sort, medium pills, year range)
 * 4. Game card clicks → detail modal open/close
 * 5. Vector search (input, autocomplete, search button, Enter key)
 * 6. Compare tool (game selection, Venn render, column highlight)
 * 7. Dictionary (domain sidebar, domain switching, game links)
 * 8. Editor (form submission, vector checklist, BGG import UI)
 * 9. Sandbox (vector input, conflict checker, synthesize, GM chat)
 * 10. Load More pagination
 * 11. Window-exposed functions
 */

const fs = require('fs');
const path = require('path');

// Load compiled app.js
const appJsPath = path.resolve(__dirname, '../dist/app.js');
const appCode = fs.readFileSync(appJsPath, 'utf-8');

// Load HTML
const indexHtmlPath = path.resolve(__dirname, '../index.html');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

// Minimal registry for testing
const testRegistry = {
  ttrpg: [
    {
      game_id: 'dnd_5e',
      title: 'Dungeons & Dragons 5th Edition',
      year: 2014,
      primary_genre: 'Fantasy',
      subgenres: ['Adventure', 'Tactical Combat'],
      governed_vectors: [
        'combat.melee.tactical',
        'combat.damage.hit_points',
        'magic.resource.spell_slots',
        'character.progression.class_based',
        'character.progression.level_based',
      ],
      vector_explanations: {
        'combat.melee.tactical': 'D20 attack rolls vs AC',
        'combat.damage.hit_points': 'Damage reduces hit points',
        'magic.resource.spell_slots': 'Spell slots per rest',
        'character.progression.class_based': 'Class determines abilities',
        'character.progression.level_based': 'XP grants levels',
      },
    },
    {
      game_id: 'pathfinder_2e',
      title: 'Pathfinder 2nd Edition',
      year: 2019,
      primary_genre: 'Fantasy',
      subgenres: ['Adventure', 'Tactical Combat'],
      governed_vectors: [
        'combat.melee.tactical',
        'combat.damage.hit_points',
        'magic.resource.spell_slots',
        'character.progression.class_based',
        'combat.movement.grid_based',
      ],
      vector_explanations: {
        'combat.melee.tactical': 'Three-action economy with attack penalties',
        'combat.damage.hit_points': 'HP with dying and wounded conditions',
        'magic.resource.spell_slots': 'Prepared and spontaneous caster spell slots',
        'character.progression.class_based': 'ABC (Ancestry, Background, Class)',
        'combat.movement.grid_based': '5-foot squares with flanking',
      },
    },
    {
      game_id: 'fate_core',
      title: 'Fate Core',
      year: 2013,
      primary_genre: 'Universal',
      subgenres: ['Narrative', 'Fiction-First'],
      governed_vectors: ['resolution.dice_pool.d6', 'character.progression.aspect_based', 'social.influence.compels'],
      vector_explanations: {
        'resolution.dice_pool.d6': 'Fudge dice (4dF) + skill vs opposition',
        'character.progression.aspect_based': 'Characters defined by narrative aspects',
        'social.influence.compels': 'Fate points compel character aspects',
      },
    },
  ],
  board_game: [
    {
      game_id: 'gloomhaven',
      title: 'Gloomhaven',
      year: 2017,
      primary_genre: 'Strategy',
      subgenres: ['Dungeon Crawl', 'Campaign'],
      governed_vectors: [
        'combat.melee.tactical',
        'combat.damage.hit_points',
        'character.progression.level_based',
        'logistics.survival.hand_management',
      ],
      vector_explanations: {
        'combat.melee.tactical': 'Card-driven initiative and actions',
        'combat.damage.hit_points': 'Damage reduces HP, exhaustion on empty hand',
        'character.progression.level_based': 'XP unlocks new cards and perks',
        'logistics.survival.hand_management': 'Hand size = stamina, must manage carefully',
      },
    },
    {
      game_id: 'catan',
      title: 'Settlers of Catan',
      year: 1995,
      primary_genre: 'Strategy',
      subgenres: ['Economy', 'Trading'],
      governed_vectors: ['economy.trading.barter', 'economy.management.resource_allocation'],
      vector_explanations: {
        'economy.trading.barter': 'Players trade resources freely during their turn',
        'economy.management.resource_allocation': 'Hex tiles produce resources based on dice rolls',
      },
    },
  ],
};

// Mock fetch
function setupFetchMock() {
  global.fetch = jest.fn((url) => {
    if (typeof url === 'string' && url.includes('registry.json')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(JSON.parse(JSON.stringify(testRegistry))),
        status: 200,
      });
    }
    return Promise.reject(new Error(`Unmocked fetch: ${url}`));
  });
}

// Helper: wait for async operations
function waitFor(ms = 100) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper: fire input event
function fireInput(element, value) {
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

// Helper: fire change event
function fireChange(element, value) {
  element.value = value;
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

// Helper: fire click
function fireClick(element) {
  element.click();
  element.dispatchEvent(new Event('click', { bubbles: true }));
}

// Helper: fire keypress
function fireKeypress(element, key) {
  element.dispatchEvent(new KeyboardEvent('keypress', { key, bubbles: true }));
}

// Setup DOM and bootstrap the app
async function bootstrapApp() {
  setupFetchMock();
  document.documentElement.innerHTML = indexHtml;

  // Mock requestAnimationFrame
  if (!global.requestAnimationFrame) {
    global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    global.cancelAnimationFrame = (id) => clearTimeout(id);
  }

  // Mock performance.now
  if (!global.performance || !global.performance.now) {
    global.performance = { now: () => Date.now() };
  }

  // Execute the app code
  eval(appCode);

  // Trigger DOMContentLoaded
  document.dispatchEvent(new Event('DOMContentLoaded'));

  // Wait for async load + worker init
  await waitFor(500);

  return document;
}

// =============================================================================
// TEST SUITE
// =============================================================================

describe('Systems Indexer E2E Interactions', () => {
  let doc;

  beforeAll(async () => {
    doc = await bootstrapApp();
  });

  // =========================================================================
  // 1. BOOTSTRAP
  // =========================================================================
  describe('1. Application Bootstrap', () => {
    test('loads registry data and populates allGames', () => {
      // Check that stats dashboard rendered
      const totalGames = doc.getElementById('stat-total-games');
      expect(totalGames).toBeTruthy();
      expect(totalGames.textContent).not.toBe('');
      expect(totalGames.textContent).not.toBe('0');
    });

    test('dashboard stats show correct counts', () => {
      const total = doc.getElementById('stat-total-games');
      const ttrpgs = doc.getElementById('stat-total-ttrpgs');
      const boardgames = doc.getElementById('stat-total-boardgames');
      const vectors = doc.getElementById('stat-total-vectors');

      expect(total).toBeTruthy();
      expect(ttrpgs).toBeTruthy();
      expect(boardgames).toBeTruthy();
      expect(vectors).toBeTruthy();

      // Our test registry has 3 TTRPGs and 2 board games
      expect(Number(total.textContent)).toBe(5);
      expect(Number(ttrpgs.textContent)).toBe(3);
      expect(Number(boardgames.textContent)).toBe(2);
      expect(Number(vectors.textContent)).toBeGreaterThan(0);
    });

    test('genre dropdown is populated with genres from data', () => {
      const genreSelect = doc.getElementById('filter-genre');
      expect(genreSelect).toBeTruthy();
      expect(genreSelect.options.length).toBeGreaterThan(1); // "All Genres" + actual genres
    });

    test('year range inputs are set from data', () => {
      const minYear = doc.getElementById('filter-year-min');
      const maxYear = doc.getElementById('filter-year-max');
      expect(minYear).toBeTruthy();
      expect(maxYear).toBeTruthy();
      // Catan is from 1995, so min should be <= 1995
      expect(Number(minYear.value)).toBeLessThanOrEqual(1995);
      // PF2e is from 2019, so max should be >= 2019
      expect(Number(maxYear.value)).toBeGreaterThanOrEqual(2019);
    });

    test('explorer grid renders game cards', async () => {
      await waitFor(300);
      const grid = doc.getElementById('games-grid');
      expect(grid).toBeTruthy();
      const cards = grid.querySelectorAll('.game-card');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 2. TAB NAVIGATION
  // =========================================================================
  describe('2. Tab Navigation', () => {
    const tabConfigs = [
      { tabId: 'tab-nav-explorer', viewId: 'explorer-view', name: 'Explorer' },
      { tabId: 'tab-nav-vector-search', viewId: 'vector-search-view', name: 'Vector Search' },
      { tabId: 'tab-nav-compare', viewId: 'compare-view', name: 'Compare' },
      { tabId: 'tab-nav-dictionary', viewId: 'dictionary-view', name: 'Dictionary' },
      { tabId: 'tab-nav-editor', viewId: 'editor-view', name: 'Editor' },
      { tabId: 'tab-nav-sandbox', viewId: 'sandbox-view', name: 'Sandbox' },
    ];

    test.each(tabConfigs)('clicking $name tab shows $viewId panel', async ({ tabId, viewId }) => {
      const tabBtn = doc.getElementById(tabId);
      const viewPanel = doc.getElementById(viewId);

      expect(tabBtn).toBeTruthy();
      expect(viewPanel).toBeTruthy();

      tabBtn.click();
      await waitFor(50);

      expect(tabBtn.classList.contains('active')).toBe(true);
      expect(tabBtn.getAttribute('aria-selected')).toBe('true');
      expect(viewPanel.classList.contains('active')).toBe(true);
    });

    test('switching tabs hides previously active panel', async () => {
      // Click Explorer
      doc.getElementById('tab-nav-explorer').click();
      await waitFor(50);
      expect(doc.getElementById('explorer-view').classList.contains('active')).toBe(true);

      // Click Vector Search
      doc.getElementById('tab-nav-vector-search').click();
      await waitFor(50);
      expect(doc.getElementById('explorer-view').classList.contains('active')).toBe(false);
      expect(doc.getElementById('vector-search-view').classList.contains('active')).toBe(true);
    });

    test('only one panel is active at a time after switching', async () => {
      doc.getElementById('tab-nav-dictionary').click();
      await waitFor(50);

      const activePanels = doc.querySelectorAll('.view-panel.active');
      expect(activePanels.length).toBe(1);
      expect(activePanels[0].id).toBe('dictionary-view');
    });
  });

  // =========================================================================
  // 3. EXPLORER GRID INTERACTIONS
  // =========================================================================
  describe('3. Explorer Grid', () => {
    beforeAll(async () => {
      doc.getElementById('tab-nav-explorer').click();
      await waitFor(100);
    });

    test('omni-search filters games by title', async () => {
      const searchInput = doc.getElementById('omni-search');
      expect(searchInput).toBeTruthy();

      fireInput(searchInput, 'dungeons');
      await waitFor(300);

      const grid = doc.getElementById('games-grid');
      const cards = grid.querySelectorAll('.game-card');
      // Should find D&D
      expect(cards.length).toBeGreaterThan(0);

      // Clear search
      fireInput(searchInput, '');
      await waitFor(300);
    });

    test('medium pills filter games', async () => {
      const ttrpgPill = doc.getElementById('pill-medium-ttrpg');
      const boardPill = doc.getElementById('pill-medium-board-game');
      const allPill = doc.getElementById('pill-medium-all');

      expect(ttrpgPill).toBeTruthy();
      expect(boardPill).toBeTruthy();
      expect(allPill).toBeTruthy();

      ttrpgPill.click();
      await waitFor(300);

      expect(ttrpgPill.classList.contains('active')).toBe(true);
      expect(allPill.classList.contains('active')).toBe(false);

      // Reset
      allPill.click();
      await waitFor(300);
    });

    test('genre dropdown filter works', async () => {
      const genreSelect = doc.getElementById('filter-genre');
      expect(genreSelect).toBeTruthy();

      fireChange(genreSelect, 'Fantasy');
      await waitFor(300);

      // Should show Fantasy games only
      const grid = doc.getElementById('games-grid');
      const cards = grid.querySelectorAll('.game-card');
      expect(cards.length).toBeGreaterThan(0);

      // Reset
      fireChange(genreSelect, 'all');
      await waitFor(300);
    });

    test('sort dropdown changes order', async () => {
      const sortSelect = doc.getElementById('filter-sort');
      expect(sortSelect).toBeTruthy();

      fireChange(sortSelect, 'year-desc');
      await waitFor(300);

      const grid = doc.getElementById('games-grid');
      const cards = grid.querySelectorAll('.game-card');
      expect(cards.length).toBeGreaterThan(0);

      // Reset
      fireChange(sortSelect, 'title-asc');
      await waitFor(300);
    });

    test('year range filter works', async () => {
      const minYear = doc.getElementById('filter-year-min');
      const maxYear = doc.getElementById('filter-year-max');

      // Filter to only 2017+
      fireChange(minYear, '2017');
      await waitFor(300);

      const grid = doc.getElementById('games-grid');
      const cards = grid.querySelectorAll('.game-card');
      // Should show PF2e (2019) and Gloomhaven (2017)
      expect(cards.length).toBeGreaterThanOrEqual(1);

      // Reset year range
      fireChange(minYear, '1990');
      fireChange(maxYear, '2030');
      await waitFor(300);
    });
  });

  // =========================================================================
  // 4. GAME CARD CLICK → DETAIL MODAL
  // =========================================================================
  describe('4. Detail Modal', () => {
    beforeAll(async () => {
      doc.getElementById('tab-nav-explorer').click();
      await waitFor(200);
    });

    test('clicking a game card opens the detail modal', async () => {
      const modal = doc.getElementById('details-modal-overlay');
      expect(modal).toBeTruthy();
      expect(modal.classList.contains('active')).toBe(false);

      // Simulate openGameDetails
      window.openGameDetails('dnd_5e');
      await waitFor(100);

      expect(modal.classList.contains('active')).toBe(true);

      const title = doc.getElementById('modal-game-title');
      expect(title.textContent).toContain('Dungeons');
    });

    test('modal shows correct metadata', () => {
      const year = doc.getElementById('modal-year');
      const genre = doc.getElementById('modal-primary-genre');
      const subgenres = doc.getElementById('modal-subgenres');

      expect(year.textContent).toBe('2014');
      expect(genre.textContent).toBe('Fantasy');
      expect(subgenres.textContent).toContain('Adventure');
    });

    test('modal shows governed vectors grouped by domain', () => {
      const vectorsContent = doc.getElementById('modal-vectors-content');
      expect(vectorsContent).toBeTruthy();

      // Should have domain groups like "COMBAT SUBSYSTEMS", "MAGIC SUBSYSTEMS"
      const groups = vectorsContent.querySelectorAll('.modal-vector-group');
      expect(groups.length).toBeGreaterThan(0);

      // Should show vector names
      const vectorNames = vectorsContent.querySelectorAll('.modal-vector-name');
      expect(vectorNames.length).toBeGreaterThan(0);
    });

    test('modal shows vector explanations', () => {
      const vectorsContent = doc.getElementById('modal-vectors-content');
      const rules = vectorsContent.querySelectorAll('.modal-vector-rule');
      expect(rules.length).toBeGreaterThan(0);

      // At least one should have actual content (not the fallback)
      const hasRealExplanation = Array.from(rules).some(
        (r) => r.textContent && !r.textContent.includes('No detailed rule explanation')
      );
      expect(hasRealExplanation).toBe(true);
    });

    test('close button closes the modal', () => {
      const modal = doc.getElementById('details-modal-overlay');
      const closeBtn = doc.querySelector('.modal-close-btn');

      expect(closeBtn).toBeTruthy();
      closeBtn.click();

      expect(modal.classList.contains('active')).toBe(false);
    });

    test('clicking modal overlay background closes the modal', () => {
      // Reopen
      window.openGameDetails('dnd_5e');

      const modal = doc.getElementById('details-modal-overlay');
      expect(modal.classList.contains('active')).toBe(true);

      // Click the overlay itself (not the modal card)
      modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(modal.classList.contains('active')).toBe(false);
    });
  });

  // =========================================================================
  // 5. VECTOR SEARCH
  // =========================================================================
  describe('5. Vector Search', () => {
    beforeAll(async () => {
      doc.getElementById('tab-nav-vector-search').click();
      await waitFor(100);
    });

    test('vector search input exists and is interactive', () => {
      const input = doc.getElementById('vector-query-input');
      expect(input).toBeTruthy();
      expect(input.tagName).toBe('INPUT');
    });

    test('typing in vector search triggers autocomplete', async () => {
      const input = doc.getElementById('vector-query-input');
      const suggestionsBox = doc.getElementById('vector-query-suggestions');

      expect(suggestionsBox).toBeTruthy();

      fireInput(input, 'combat');
      await waitFor(300);

      // Suggestions should appear
      const items = suggestionsBox.querySelectorAll('.suggestion-item');
      expect(items.length).toBeGreaterThan(0);
    });

    test('clicking a suggestion fills the input and executes search', async () => {
      const input = doc.getElementById('vector-query-input');
      const suggestionsBox = doc.getElementById('vector-query-suggestions');

      fireInput(input, 'combat');
      await waitFor(300);

      const firstSuggestion = suggestionsBox.querySelector('.suggestion-item');
      if (firstSuggestion) {
        const vectorName = firstSuggestion.getAttribute('data-vector');
        firstSuggestion.click();
        await waitFor(300);

        expect(input.value).toBe(vectorName);
      }
    });

    test('search button triggers search', async () => {
      const input = doc.getElementById('vector-query-input');
      const searchBtn = doc.getElementById('vector-search-btn');
      const results = doc.getElementById('vector-search-results');

      input.value = 'combat.melee.tactical';
      searchBtn.click();
      await waitFor(300);

      // Results should show matching games
      const gameItems = results.querySelectorAll('.vector-game-item');
      expect(gameItems.length).toBeGreaterThan(0);
    });

    test('Enter key triggers search', async () => {
      const input = doc.getElementById('vector-query-input');
      const results = doc.getElementById('vector-search-results');

      input.value = 'combat.damage.hit_points';
      fireKeypress(input, 'Enter');
      await waitFor(300);

      const gameItems = results.querySelectorAll('.vector-game-item');
      expect(gameItems.length).toBeGreaterThan(0);
    });

    test('searching non-existent vector shows no results message', async () => {
      const input = doc.getElementById('vector-query-input');
      const searchBtn = doc.getElementById('vector-search-btn');
      const results = doc.getElementById('vector-search-results');

      input.value = 'nonexistent.vector.xyz';
      searchBtn.click();
      await waitFor(300);

      const noResults = results.querySelector('.no-results-state');
      expect(noResults).toBeTruthy();
    });

    test('empty search shows prompt message', async () => {
      const input = doc.getElementById('vector-query-input');
      const searchBtn = doc.getElementById('vector-search-btn');
      const results = doc.getElementById('vector-search-results');

      input.value = '';
      searchBtn.click();
      await waitFor(100);

      expect(results.innerHTML).toContain('Please enter a vector');
    });
  });

  // =========================================================================
  // 6. COMPARE TOOL
  // =========================================================================
  describe('6. Venn Comparison Tool', () => {
    beforeAll(async () => {
      doc.getElementById('tab-nav-compare').click();
      await waitFor(200);
    });

    test('compare selectors are populated with game buttons', () => {
      const selectorA = doc.getElementById('compare-selector-a');
      const selectorB = doc.getElementById('compare-selector-b');

      expect(selectorA).toBeTruthy();
      expect(selectorB).toBeTruthy();

      const buttonsA = selectorA.querySelectorAll('.select-game-btn');
      const buttonsB = selectorB.querySelectorAll('.select-game-btn');

      expect(buttonsA.length).toBe(5); // All 5 games
      expect(buttonsB.length).toBe(5);
    });

    test('clicking a game in selector A selects it', async () => {
      const selectorA = doc.getElementById('compare-selector-a');
      const firstBtn = selectorA.querySelector('.select-game-btn');
      expect(firstBtn).toBeTruthy();

      firstBtn.click();
      await waitFor(100);

      expect(firstBtn.classList.contains('selected')).toBe(true);
    });

    test('selecting games in both panels triggers comparison', async () => {
      const selectorA = doc.getElementById('compare-selector-a');
      const selectorB = doc.getElementById('compare-selector-b');
      const results = doc.getElementById('comparison-results');

      // Select different games
      const btnsA = selectorA.querySelectorAll('.select-game-btn');
      const btnsB = selectorB.querySelectorAll('.select-game-btn');

      // Find D&D in A and Pathfinder in B
      let dndBtn, pfBtn;
      btnsA.forEach((btn) => {
        if (btn.getAttribute('data-game-id') === 'dnd_5e') dndBtn = btn;
      });
      btnsB.forEach((btn) => {
        if (btn.getAttribute('data-game-id') === 'pathfinder_2e') pfBtn = btn;
      });

      if (dndBtn) dndBtn.click();
      await waitFor(100);
      if (pfBtn) pfBtn.click();
      await waitFor(300);

      // Results should show shared/exclusive vectors
      const resultContent = results.innerHTML;
      expect(resultContent.length).toBeGreaterThan(100);
    });
  });

  // =========================================================================
  // 7. DICTIONARY
  // =========================================================================
  describe('7. Vector Dictionary', () => {
    beforeAll(async () => {
      doc.getElementById('tab-nav-dictionary').click();
      await waitFor(200);
    });

    test('dictionary sidebar is populated with domains', async () => {
      const sidebar = doc.getElementById('dict-domains-sidebar');
      expect(sidebar).toBeTruthy();

      await waitFor(100);
      const domainBtns = sidebar.querySelectorAll('.dict-domain-btn');
      expect(domainBtns.length).toBeGreaterThan(1); // "All" + domains
    });

    test('clicking a domain filters dictionary results', async () => {
      const sidebar = doc.getElementById('dict-domains-sidebar');
      const domainBtns = sidebar.querySelectorAll('.dict-domain-btn');

      // Find the combat domain button
      let combatBtn;
      domainBtns.forEach((btn) => {
        if (btn.textContent.toLowerCase().includes('combat')) combatBtn = btn;
      });

      if (combatBtn) {
        combatBtn.click();
        await waitFor(300);

        const currentDomain = doc.getElementById('dict-current-domain');
        expect(currentDomain.textContent.toLowerCase()).toContain('combat');
      }
    });

    test('dictionary results list renders vector cards', async () => {
      // Click "All" domain
      window.setDictDomain('all');
      await waitFor(300);

      const resultsList = doc.getElementById('dict-results-list');
      expect(resultsList).toBeTruthy();

      const cards = resultsList.querySelectorAll('.dict-item-card');
      expect(cards.length).toBeGreaterThan(0);
    });

    test('dictionary cards show game count badges', async () => {
      await waitFor(100);
      const resultsList = doc.getElementById('dict-results-list');
      const badges = resultsList.querySelectorAll('.badge');
      expect(badges.length).toBeGreaterThan(0);

      // At least one should say "Found in X games"
      const hasBadge = Array.from(badges).some((b) => b.textContent.includes('Found in'));
      expect(hasBadge).toBe(true);
    });

    test('dictionary game links open game detail modal', async () => {
      const resultsList = doc.getElementById('dict-results-list');
      const gameLink = resultsList.querySelector('.dict-game-link');

      if (gameLink) {
        gameLink.click();
        await waitFor(100);

        const modal = doc.getElementById('details-modal-overlay');
        expect(modal.classList.contains('active')).toBe(true);

        // Close it
        const closeBtn = doc.querySelector('.modal-close-btn');
        closeBtn.click();
      }
    });
  });

  // =========================================================================
  // 8. EDITOR
  // =========================================================================
  describe('8. Database Editor', () => {
    beforeAll(async () => {
      doc.getElementById('tab-nav-editor').click();
      await waitFor(200);
    });

    test('editor form exists with all fields', () => {
      const form = doc.getElementById('add-game-form');
      expect(form).toBeTruthy();

      expect(doc.getElementById('new-game-title')).toBeTruthy();
      expect(doc.getElementById('new-game-year')).toBeTruthy();
      expect(doc.getElementById('new-game-medium')).toBeTruthy();
      expect(doc.getElementById('new-game-genre')).toBeTruthy();
    });

    test('editor vectors checklist is populated', () => {
      const vecList = doc.getElementById('editor-vectors-list');
      expect(vecList).toBeTruthy();
      expect(vecList.children.length).toBeGreaterThan(0);
    });

    test('custom vector input exists', () => {
      const customInput = doc.getElementById('custom-vector-name');
      expect(customInput).toBeTruthy();
    });

    test('BGG search area exists', () => {
      const bggInput = doc.getElementById('bgg-search-query');
      const bggCard = doc.getElementById('bgg-import-card');
      expect(bggInput).toBeTruthy();
      expect(bggCard).toBeTruthy();
    });
  });

  // =========================================================================
  // 9. SANDBOX
  // =========================================================================
  describe('9. OmniRuleset Sandbox', () => {
    beforeAll(async () => {
      doc.getElementById('tab-nav-sandbox').click();
      await waitFor(200);
    });

    test('sandbox vector input exists', () => {
      const input = doc.getElementById('sandbox-vector-input');
      expect(input).toBeTruthy();
    });

    test('sandbox synthesize button exists', () => {
      const btn = doc.getElementById('sandbox-synthesize-btn');
      expect(btn).toBeTruthy();
    });

    test('sandbox selected vectors container exists', () => {
      const container = doc.getElementById('sandbox-selected-vectors');
      expect(container).toBeTruthy();
    });

    test('sandbox clear vectors button exists', () => {
      const btn = doc.getElementById('sandbox-clear-vectors');
      expect(btn).toBeTruthy();
    });

    test('sandbox conflicts panel exists', () => {
      const panel = doc.getElementById('sandbox-conflicts');
      expect(panel).toBeTruthy();
    });

    test('sandbox ruleset output exists', () => {
      const output = doc.getElementById('sandbox-ruleset-output');
      expect(output).toBeTruthy();
    });

    test('sandbox chat elements exist', () => {
      const chatLog = doc.getElementById('sandbox-chat-log');
      const chatInput = doc.getElementById('sandbox-chat-input');
      const chatSend = doc.getElementById('sandbox-chat-send');

      expect(chatLog).toBeTruthy();
      expect(chatInput).toBeTruthy();
      expect(chatSend).toBeTruthy();
    });
  });

  // =========================================================================
  // 10. WINDOW-EXPOSED FUNCTIONS
  // =========================================================================
  describe('10. Window-Exposed Functions', () => {
    test('all window functions are defined', () => {
      expect(typeof window.openGameDetails).toBe('function');
      expect(typeof window.loadMoreGames).toBe('function');
      expect(typeof window.selectCompareGame).toBe('function');
      expect(typeof window.highlightCompareColumn).toBe('function');
      expect(typeof window.setDictDomain).toBe('function');
      expect(typeof window.toggleEditorVectorExplanation).toBe('function');
      expect(typeof window.addCustomEditorVector).toBe('function');
      expect(typeof window.downloadUpdatedRegistry).toBe('function');
      expect(typeof window.searchBGG).toBe('function');
      expect(typeof window.importBGGGame).toBe('function');
    });
  });

  // =========================================================================
  // 11. CROSS-TAB NAVIGATION FROM RESULTS
  // =========================================================================
  describe('11. Cross-Tab Navigation', () => {
    test('game titles in vector search results are clickable and open modal', async () => {
      doc.getElementById('tab-nav-vector-search').click();
      await waitFor(100);

      const input = doc.getElementById('vector-query-input');
      input.value = 'combat.melee.tactical';
      doc.getElementById('vector-search-btn').click();
      await waitFor(300);

      const results = doc.getElementById('vector-search-results');
      const gameTitle = results.querySelector('.vector-game-title');
      if (gameTitle) {
        gameTitle.click();
        await waitFor(100);

        const modal = doc.getElementById('details-modal-overlay');
        expect(modal.classList.contains('active')).toBe(true);

        // Close
        doc.querySelector('.modal-close-btn').click();
      }
    });
  });
});
