const fs = require('fs');
const path = require('path');

// Standard Mock Dataset
const mockRegistryData = {
  ttrpg: [
    {
      game_id: 'dnd_5e',
      title: 'Dungeons & Dragons 5e',
      year: 2014,
      medium: 'ttrpg',
      primary_genre: 'Fantasy',
      subgenres: ['Adventure', 'High Fantasy'],
      governed_vectors: [
        'combat.melee.dice_rolls',
        'character.progression.campaign_based',
        'simulation.magic.spell_slots',
      ],
      vector_explanations: {
        'combat.melee.dice_rolls': 'Uses d20 + modifiers to hit.',
        'character.progression.campaign_based': 'Character level increases via XP or milestones.',
        'simulation.magic.spell_slots': 'Vancian slots governing daily spells.',
      },
    },
    {
      game_id: 'fate_core',
      title: 'Fate Core',
      year: 2013,
      medium: 'ttrpg',
      primary_genre: 'Universal',
      subgenres: ['Narrative', 'Rules-Light'],
      governed_vectors: ['politics.factions.loyalty', 'combat.melee.dice_rolls'],
      vector_explanations: {
        'politics.factions.loyalty': 'Factions track reputation and allegiance.',
        'combat.melee.dice_rolls': 'Uses four Fudge/Fate dice to resolve actions.',
      },
    },
  ],
  board_game: [
    {
      game_id: 'scythe',
      title: 'Scythe',
      year: 2016,
      medium: 'board_game',
      primary_genre: 'Strategy',
      subgenres: ['Economic', 'Steampunk'],
      governed_vectors: [
        'economy.market.worker_placement',
        'combat.movement.hex_grid',
        'politics.factions.area_influence',
      ],
      vector_explanations: {
        'economy.market.worker_placement': 'Place workers to produce resources.',
        'combat.movement.hex_grid': 'Units move on a hexagon-grid map.',
        'politics.factions.area_influence': 'Factions control territories for points.',
      },
    },
    {
      game_id: 'agricola',
      title: 'Agricola',
      year: 2007,
      medium: 'board_game',
      primary_genre: 'Strategy',
      subgenres: ['Farming', 'Economic'],
      governed_vectors: ['economy.market.worker_placement', 'logistics.survival.rations'],
      vector_explanations: {
        'economy.market.worker_placement': 'Place workers to take actions and gather resources.',
        'logistics.survival.rations': 'Must feed family members each harvest.',
      },
    },
  ],
};

// Mock BGG search XML
const mockBggSearchXml = `
<items total="1">
  <item id="99999" type="boardgame">
    <name value="Mock BGG Game"/>
    <yearpublished value="2022"/>
  </item>
</items>
`;

// Mock BGG Thing XML
const mockBggThingXml = `
<items>
  <item id="99999" type="boardgame">
    <name type="primary" value="Mock BGG Game"/>
    <yearpublished value="2022"/>
    <link type="boardgamecategory" id="1010" value="Fantasy"/>
    <link type="boardgamemechanic" id="2008" value="Worker Placement"/>
  </item>
</items>
`;

describe('Systems Indexer - Tier 1 & Tier 2 E2E Tests', () => {
  beforeEach(async () => {
    // 1. Reset modules cache
    jest.resetModules();

    // 2. Load index.html DOM
    const htmlPath = path.resolve(__dirname, '../index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    document.documentElement.innerHTML = htmlContent;

    // 3. Mock window.alert to prevent blocking
    global.alert = jest.fn();

    // 4. Default fetch mock for registry.json
    global.fetch.mockImplementation((url) => {
      if (url.includes('registry.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(JSON.parse(JSON.stringify(mockRegistryData))),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    // 5. Load application script
    require('../app.js');

    // 6. Fire DOMContentLoaded
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

    // 7. Wait for initial database load to populate the explorer grid (4 cards expected)
    await waitFor(() => {
      const gameCards = document.querySelectorAll('.game-card');
      return gameCards.length === 4;
    });
  });

  // ==========================================
  // FEATURE 1: Omni-Search & Filtering Grid
  // ==========================================
  describe('FEATURE 1: Omni-Search & Filtering Grid (F1)', () => {
    test('F1-T1-01: Omni-Search Filter by Title Text', async () => {
      const omniSearch = document.getElementById('omni-search');
      omniSearch.value = 'dungeons';
      omniSearch.dispatchEvent(new window.Event('input', { bubbles: true }));

      await waitFor(() => {
        const cards = document.querySelectorAll('.game-card');
        return cards.length === 1;
      });

      const cards = document.querySelectorAll('.game-card');
      expect(cards[0].querySelector('h2').textContent).toBe('Dungeons & Dragons 5e');
      expect(document.getElementById('results-count-number').textContent).toBe('1');
    });

    test('F1-T1-02: Filter by Medium (TTRPG vs Board Game)', async () => {
      const ttrpgPill = document.getElementById('pill-medium-ttrpg');
      ttrpgPill.click();

      expect(ttrpgPill.classList.contains('active')).toBe(true);
      expect(document.getElementById('pill-medium-all').classList.contains('active')).toBe(false);

      await waitFor(() => {
        const cards = document.querySelectorAll('.game-card');
        return cards.length === 2;
      });

      const cards = document.querySelectorAll('.game-card');
      const titles = Array.from(cards).map((c) => c.querySelector('h2').textContent);
      expect(titles).toContain('Dungeons & Dragons 5e');
      expect(titles).toContain('Fate Core');
      expect(document.getElementById('results-count-number').textContent).toBe('2');
    });

    test('F1-T1-03: Filter by Genre Select Dropdown', async () => {
      const genreSelect = document.getElementById('filter-genre');
      genreSelect.value = 'Strategy';
      genreSelect.dispatchEvent(new window.Event('change', { bubbles: true }));

      await waitFor(() => {
        const cards = document.querySelectorAll('.game-card');
        return cards.length === 2;
      });

      const cards = document.querySelectorAll('.game-card');
      expect(cards[0].querySelector('.primary-genre').textContent).toBe('Strategy');
      expect(cards[1].querySelector('.primary-genre').textContent).toBe('Strategy');
      expect(document.getElementById('results-count-number').textContent).toBe('2');
    });

    test('F1-T1-04: Filter by Release Year Range', async () => {
      const minYear = document.getElementById('filter-year-min');
      const maxYear = document.getElementById('filter-year-max');

      minYear.value = '2010';
      minYear.dispatchEvent(new window.Event('change', { bubbles: true }));
      maxYear.value = '2015';
      maxYear.dispatchEvent(new window.Event('change', { bubbles: true }));

      await waitFor(() => {
        const cards = document.querySelectorAll('.game-card');
        return cards.length === 2;
      });

      const cards = document.querySelectorAll('.game-card');
      const titles = Array.from(cards).map((c) => c.querySelector('h2').textContent);
      expect(titles).toContain('Dungeons & Dragons 5e');
      expect(titles).toContain('Fate Core');
      expect(document.getElementById('results-count-number').textContent).toBe('2');
    });

    test('F1-T1-05: Sort Grid by Year (Newest First)', async () => {
      const sortSelect = document.getElementById('filter-sort');
      sortSelect.value = 'year-desc';
      sortSelect.dispatchEvent(new window.Event('change', { bubbles: true }));

      await waitFor(() => {
        const cards = document.querySelectorAll('.game-card');
        return cards.length === 4;
      });

      const cards = document.querySelectorAll('.game-card');
      const titles = Array.from(cards).map((c) => c.querySelector('h2').textContent);
      expect(titles[0]).toBe('Scythe'); // 2016
      expect(titles[1]).toBe('Dungeons & Dragons 5e'); // 2014
      expect(titles[2]).toBe('Fate Core'); // 2013
      expect(titles[3]).toBe('Agricola'); // 2007
    });

    test('F1-T2-01: Omni-Search Text - Non-matching String', async () => {
      const omniSearch = document.getElementById('omni-search');
      omniSearch.value = 'xyz123abc';
      omniSearch.dispatchEvent(new window.Event('input', { bubbles: true }));

      await waitFor(() => {
        const cards = document.querySelectorAll('.game-card');
        return cards.length === 0;
      });

      expect(document.getElementById('results-count-number').textContent).toBe('0');
      const noResults = document.querySelector('.no-results-state');
      expect(noResults).toBeTruthy();
      expect(noResults.textContent).toContain('No games in registry match your search filters.');
    });

    test('F1-T2-02: Release Year - Minimum Greater Than Maximum', async () => {
      const minYear = document.getElementById('filter-year-min');
      const maxYear = document.getElementById('filter-year-max');

      minYear.value = '2020';
      minYear.dispatchEvent(new window.Event('change', { bubbles: true }));
      maxYear.value = '2010';
      maxYear.dispatchEvent(new window.Event('change', { bubbles: true }));

      await waitFor(() => {
        const cards = document.querySelectorAll('.game-card');
        return cards.length === 0;
      });

      expect(document.querySelector('.no-results-state')).toBeTruthy();
      expect(document.getElementById('results-count-number').textContent).toBe('0');
    });

    test('F1-T2-03: Omni-Search Text - Trim and Whitespace Resiliency', async () => {
      const omniSearch = document.getElementById('omni-search');
      omniSearch.value = '   Scythe   ';
      omniSearch.dispatchEvent(new window.Event('input', { bubbles: true }));

      await waitFor(() => {
        const cards = document.querySelectorAll('.game-card');
        return cards.length === 1;
      });

      expect(document.querySelectorAll('.game-card h2')[0].textContent).toBe('Scythe');
      expect(document.getElementById('results-count-number').textContent).toBe('1');
    });

    test('F1-T2-04: Release Year - Exact Match Boundaries', async () => {
      const minYear = document.getElementById('filter-year-min');
      const maxYear = document.getElementById('filter-year-max');

      minYear.value = '2014';
      minYear.dispatchEvent(new window.Event('change', { bubbles: true }));
      maxYear.value = '2014';
      maxYear.dispatchEvent(new window.Event('change', { bubbles: true }));

      await waitFor(() => {
        const cards = document.querySelectorAll('.game-card');
        return cards.length === 1;
      });

      expect(document.querySelectorAll('.game-card h2')[0].textContent).toBe('Dungeons & Dragons 5e');
      expect(document.getElementById('results-count-number').textContent).toBe('1');
    });

    test('F1-T2-05: Multi-Criteria Intersection resulting in Zero Results', async () => {
      const ttrpgPill = document.getElementById('pill-medium-ttrpg');
      ttrpgPill.click();

      const genreSelect = document.getElementById('filter-genre');
      genreSelect.value = 'Strategy';
      genreSelect.dispatchEvent(new window.Event('change', { bubbles: true }));

      await waitFor(() => {
        const cards = document.querySelectorAll('.game-card');
        return cards.length === 0;
      });

      expect(document.querySelector('.no-results-state')).toBeTruthy();
      expect(document.getElementById('results-count-number').textContent).toBe('0');
    });
  });

  // ==========================================
  // FEATURE 2: Vector Search Engine
  // ==========================================
  describe('FEATURE 2: Vector Search Engine (F2)', () => {
    test('F2-T1-01: Tab Navigation to Vector Search Panel', () => {
      const vectorSearchTab = document.getElementById('tab-nav-vector-search');
      vectorSearchTab.click();

      expect(vectorSearchTab.classList.contains('active')).toBe(true);
      expect(document.getElementById('vector-search-view').classList.contains('active')).toBe(true);
      expect(document.getElementById('explorer-view').classList.contains('active')).toBe(false);
    });

    test('F2-T1-02: Show Autocomplete Suggestions on Typing Domain', async () => {
      document.getElementById('tab-nav-vector-search').click();
      const input = document.getElementById('vector-query-input');
      input.value = 'combat';
      input.dispatchEvent(new window.Event('input', { bubbles: true }));

      const suggestions = document.getElementById('vector-query-suggestions');
      await waitFor(() => {
        return suggestions.style.display === 'block';
      });

      const items = suggestions.querySelectorAll('.suggestion-item');
      expect(items.length).toBeGreaterThan(0);
      const texts = Array.from(items).map((item) => item.textContent);
      expect(texts).toContain('combat.melee.dice_rolls');
      expect(texts).toContain('combat.movement.hex_grid');
    });

    test('F2-T1-03: Select Autocomplete Suggestion via Click', async () => {
      document.getElementById('tab-nav-vector-search').click();
      const input = document.getElementById('vector-query-input');
      input.value = 'combat';
      input.dispatchEvent(new window.Event('input', { bubbles: true }));

      const suggestions = document.getElementById('vector-query-suggestions');
      await waitFor(() => suggestions.style.display === 'block');

      const diceRollsItem = Array.from(suggestions.querySelectorAll('.suggestion-item')).find(
        (item) => item.textContent === 'combat.melee.dice_rolls'
      );
      expect(diceRollsItem).toBeTruthy();
      diceRollsItem.click();

      expect(input.value).toBe('combat.melee.dice_rolls');
      expect(suggestions.style.display).toBe('none');

      await waitFor(() => {
        return document.querySelector('#vector-search-results .vector-result-title') !== null;
      });

      const title = document.querySelector('#vector-search-results .vector-result-title span');
      expect(title.textContent).toBe('combat.melee.dice_rolls');
    });

    test('F2-T1-04: Execute Search on Vector via Click Search Button', async () => {
      document.getElementById('tab-nav-vector-search').click();
      const input = document.getElementById('vector-query-input');
      input.value = 'economy.market.worker_placement';

      document.getElementById('vector-search-btn').click();

      await waitFor(() => {
        return document.querySelectorAll('#vector-search-results .vector-game-item').length === 2;
      });

      const gameItems = document.querySelectorAll('#vector-search-results .vector-game-item');
      const titles = Array.from(gameItems).map((item) => item.querySelector('.vector-game-title').textContent);
      expect(titles).toContain('Scythe');
      expect(titles).toContain('Agricola');

      const explanations = Array.from(gameItems).map((item) => item.querySelector('.vector-rule-text').textContent);
      expect(explanations).toContain('Place workers to produce resources.');
      expect(explanations).toContain('Place workers to take actions and gather resources.');
    });

    test('F2-T1-05: Click Game Title in Results List Opens Details Modal', async () => {
      document.getElementById('tab-nav-vector-search').click();
      const input = document.getElementById('vector-query-input');
      input.value = 'economy.market.worker_placement';
      document.getElementById('vector-search-btn').click();

      await waitFor(() => document.querySelectorAll('#vector-search-results .vector-game-item').length === 2);

      const scytheLink = Array.from(document.querySelectorAll('#vector-search-results .vector-game-item'))
        .find((item) => item.querySelector('.vector-game-title').textContent === 'Scythe')
        .querySelector('.vector-game-title');

      scytheLink.click();

      const modal = document.getElementById('details-modal-overlay');
      expect(modal.classList.contains('active')).toBe(true);
      expect(document.getElementById('modal-game-title').textContent).toBe('Scythe');
      expect(document.getElementById('modal-medium').textContent).toBe('Board Game');
    });

    test('F2-T2-01: Empty Vector Query Search', async () => {
      document.getElementById('tab-nav-vector-search').click();
      const input = document.getElementById('vector-query-input');
      input.value = '';
      document.getElementById('vector-search-btn').click();

      await waitFor(() => {
        return document.querySelector('#vector-search-results .no-results-state') !== null;
      });

      const noResults = document.querySelector('#vector-search-results .no-results-state');
      expect(noResults.textContent).toContain(
        'Please enter a vector namespace to search (e.g. combat.melee.tactical).'
      );
    });

    test('F2-T2-02: Non-matching Vector Search Query', async () => {
      document.getElementById('tab-nav-vector-search').click();
      const input = document.getElementById('vector-query-input');
      input.value = 'stealth.shadows.hiding';
      document.getElementById('vector-search-btn').click();

      await waitFor(() => {
        return document.querySelector('#vector-search-results .no-results-state') !== null;
      });

      const noResults = document.querySelector('#vector-search-results .no-results-state');
      expect(noResults.textContent).toContain(
        'No games in database feature mechanical governance for vector: stealth.shadows.hiding'
      );
    });

    test('F2-T2-03: Close Suggestions Overlay on Click Outside', async () => {
      document.getElementById('tab-nav-vector-search').click();
      const input = document.getElementById('vector-query-input');
      input.value = 'combat';
      input.dispatchEvent(new window.Event('input', { bubbles: true }));

      const suggestions = document.getElementById('vector-query-suggestions');
      await waitFor(() => suggestions.style.display === 'block');

      document.querySelector('header').click();
      expect(suggestions.style.display).toBe('none');
    });

    test('F2-T2-04: Autocomplete Match Insensitivity and Spaces', async () => {
      document.getElementById('tab-nav-vector-search').click();
      const input = document.getElementById('vector-query-input');
      input.value = '   cOmBaT   ';
      input.dispatchEvent(new window.Event('input', { bubbles: true }));

      const suggestions = document.getElementById('vector-query-suggestions');
      await waitFor(() => suggestions.style.display === 'block');

      const items = suggestions.querySelectorAll('.suggestion-item');
      expect(items.length).toBeGreaterThan(0);
      const texts = Array.from(items).map((item) => item.textContent);
      expect(texts).toContain('combat.melee.dice_rolls');
    });

    test('F2-T2-05: Enter Key Submits Search', async () => {
      document.getElementById('tab-nav-vector-search').click();
      const input = document.getElementById('vector-query-input');
      input.value = 'simulation.magic.spell_slots';
      input.dispatchEvent(new window.KeyboardEvent('keypress', { key: 'Enter', keyCode: 13 }));

      await waitFor(() => {
        return document.querySelector('#vector-search-results .vector-result-title') !== null;
      });

      const title = document.querySelector('#vector-search-results .vector-result-title span');
      expect(title.textContent).toBe('simulation.magic.spell_slots');
      const games = document.querySelectorAll('#vector-search-results .vector-game-item');
      expect(games.length).toBe(1);
      expect(games[0].querySelector('.vector-game-title').textContent).toBe('Dungeons & Dragons 5e');
    });
  });

  // ==========================================
  // FEATURE 3: Venn Comparison Tool
  // ==========================================
  describe('FEATURE 3: Venn Comparison Tool (F3)', () => {
    test('F3-T1-01: Tab Navigation to Venn Comparison View', () => {
      const compareTab = document.getElementById('tab-nav-compare');
      compareTab.click();

      expect(document.getElementById('compare-view').classList.contains('active')).toBe(true);
      expect(document.getElementById('compare-selector-a')).toBeTruthy();
      expect(document.getElementById('compare-selector-b')).toBeTruthy();
      expect(document.querySelector('#comparison-results .no-results-state').textContent).toContain(
        'Please select two rulesets from the panels above to analyze overlaps and differences in their mechanical systems.'
      );
    });

    test('F3-T1-02: Select Game A (Verify Single Selection State)', () => {
      document.getElementById('tab-nav-compare').click();
      const btnA = document.querySelector('#compare-selector-a button[data-game-id="dnd_5e"]');
      btnA.click();

      expect(btnA.classList.contains('selected')).toBe(true);
      expect(document.querySelector('#comparison-results .no-results-state')).toBeTruthy();
    });

    test('F3-T1-03: Select Game A & B to Render Venn Diagram', async () => {
      document.getElementById('tab-nav-compare').click();
      document.querySelector('#compare-selector-a button[data-game-id="dnd_5e"]').click();
      document.querySelector('#compare-selector-b button[data-game-id="fate_core"]').click();

      await waitFor(() => {
        return document.querySelector('.venn-diagram-container') !== null;
      });

      const labels = Array.from(document.querySelectorAll('.venn-game-label')).map((el) => el.textContent);
      expect(labels).toContain('Dungeons & Dragons 5e');
      expect(labels).toContain('Fate Core');

      const countA = document.querySelector('.circle-a .venn-count').textContent;
      const countB = document.querySelector('.circle-b .venn-count').textContent;
      const countShared = document.querySelector('.venn-circle-intersection .venn-count').textContent;

      expect(countA).toBe('2 Exclusive');
      expect(countShared).toBe('1 Shared');
      expect(countB).toBe('1 Exclusive');
    });

    test('F3-T1-04: Click Venn Segments to Highlight Comparison Columns', async () => {
      document.getElementById('tab-nav-compare').click();
      document.querySelector('#compare-selector-a button[data-game-id="dnd_5e"]').click();
      document.querySelector('#compare-selector-b button[data-game-id="fate_core"]').click();

      await waitFor(() => document.querySelector('.venn-diagram-container') !== null);

      document.querySelector('.venn-circle.circle-a').click();
      const colA = document.getElementById('compare-col-a');
      expect(colA.style.background).not.toBe('');
      expect(colA.style.boxShadow).not.toBe('');

      expect(document.getElementById('compare-col-both').style.background).toBe('');
      expect(document.getElementById('compare-col-b').style.background).toBe('');
    });

    test('F3-T1-05: Rules Explanations Tooltips in Columns', async () => {
      document.getElementById('tab-nav-compare').click();
      document.querySelector('#compare-selector-a button[data-game-id="dnd_5e"]').click();
      document.querySelector('#compare-selector-b button[data-game-id="fate_core"]').click();

      await waitFor(() => document.querySelector('.venn-diagram-container') !== null);

      const spellSlotsItem = Array.from(document.querySelectorAll('#compare-col-a .compare-vector-item')).find(
        (item) => item.textContent === 'simulation.magic.spell_slots'
      );
      expect(spellSlotsItem.getAttribute('title')).toBe('Vancian slots governing daily spells.');

      const sharedItem = Array.from(document.querySelectorAll('#compare-col-both .compare-vector-item')).find(
        (item) => item.textContent === 'combat.melee.dice_rolls'
      );
      expect(sharedItem.getAttribute('title')).toContain('[Dungeons & Dragons 5e]: Uses d20 + modifiers to hit.');
      expect(sharedItem.getAttribute('title')).toContain('[Fate Core]: Uses four Fudge/Fate dice to resolve actions.');
    });

    test('F3-T2-01: Select Same Game in Both Panels', async () => {
      document.getElementById('tab-nav-compare').click();
      document.querySelector('#compare-selector-a button[data-game-id="scythe"]').click();
      document.querySelector('#compare-selector-b button[data-game-id="scythe"]').click();

      await waitFor(() => document.querySelector('.venn-diagram-container') !== null);

      expect(document.querySelector('.venn-circle-intersection .venn-count').textContent).toBe('3 Shared');
      expect(document.querySelector('.circle-a .venn-count').textContent).toBe('0 Exclusive');
      expect(document.querySelector('.circle-b .venn-count').textContent).toBe('0 Exclusive');

      const sharedItems = document.querySelectorAll('#compare-col-both .compare-vector-item');
      expect(sharedItems.length).toBe(3);
      expect(document.querySelector('#compare-col-a p.text-muted').textContent).toBe('None');
      expect(document.querySelector('#compare-col-b p.text-muted').textContent).toBe('None');
    });

    test('F3-T2-02: Change Selector Selection Updates Venn', async () => {
      document.getElementById('tab-nav-compare').click();
      document.querySelector('#compare-selector-a button[data-game-id="dnd_5e"]').click();
      document.querySelector('#compare-selector-b button[data-game-id="fate_core"]').click();

      await waitFor(() => document.querySelector('.venn-diagram-container') !== null);

      document.querySelector('#compare-selector-a button[data-game-id="scythe"]').click();

      await waitFor(() => {
        return document.querySelector('.circle-a .venn-game-label').textContent === 'Scythe';
      });

      expect(document.querySelector('.venn-circle-intersection .venn-count').textContent).toBe('0 Shared');
    });

    test('F3-T2-03: Zero Overlap Comparison State', async () => {
      document.getElementById('tab-nav-compare').click();
      document.querySelector('#compare-selector-a button[data-game-id="fate_core"]').click();
      document.querySelector('#compare-selector-b button[data-game-id="agricola"]').click();

      await waitFor(() => document.querySelector('.venn-diagram-container') !== null);

      expect(document.querySelector('.venn-circle-intersection .venn-count').textContent).toBe('0 Shared');
      expect(document.querySelector('#compare-col-both p.text-muted').textContent).toBe(
        'No shared mechanical systems.'
      );
    });

    test('F3-T2-04: Venn Highlights Toggle Styles', async () => {
      document.getElementById('tab-nav-compare').click();
      document.querySelector('#compare-selector-a button[data-game-id="dnd_5e"]').click();
      document.querySelector('#compare-selector-b button[data-game-id="fate_core"]').click();

      await waitFor(() => document.querySelector('.venn-diagram-container') !== null);

      document.querySelector('.venn-circle.circle-a').click();
      expect(document.getElementById('compare-col-a').style.background).not.toBe('');

      document.querySelector('.venn-circle.circle-b').click();
      expect(document.getElementById('compare-col-a').style.background).toBe('');
      expect(document.getElementById('compare-col-b').style.background).not.toBe('');
    });

    test('F3-T2-05: Extreme Asymmetry (All Vectors Subset)', async () => {
      document.getElementById('tab-nav-compare').click();
      document.querySelector('#compare-selector-a button[data-game-id="agricola"]').click();
      document.querySelector('#compare-selector-b button[data-game-id="scythe"]').click();

      await waitFor(() => document.querySelector('.venn-diagram-container') !== null);

      expect(document.querySelector('.venn-circle-intersection .venn-count').textContent).toBe('1 Shared');
      expect(document.querySelector('.circle-a .venn-count').textContent).toBe('1 Exclusive'); // rations
      expect(document.querySelector('.circle-b .venn-count').textContent).toBe('2 Exclusive'); // hex_grid, area_influence
    });
  });

  // ==========================================
  // FEATURE 4: Vector Dictionary
  // ==========================================
  describe('FEATURE 4: Vector Dictionary (F4)', () => {
    test('F4-T1-01: Tab Navigation to Dictionary View', () => {
      const dictTab = document.getElementById('tab-nav-dictionary');
      dictTab.click();

      expect(document.getElementById('dictionary-view').classList.contains('active')).toBe(true);
      expect(document.getElementById('dict-domains-sidebar')).toBeTruthy();
      const activeBtn = document.querySelector('.dict-domain-btn.active');
      expect(activeBtn.textContent).toContain('All Domains');
      expect(activeBtn.querySelector('.badge').textContent).toBe('8');
    });

    test('F4-T1-02: Dictionary Card Content Structure', () => {
      document.getElementById('tab-nav-dictionary').click();

      const cards = document.querySelectorAll('#dict-results-list .dict-item-card');
      expect(cards.length).toBe(8);

      const diceRollsCard = Array.from(cards).find(
        (c) => c.querySelector('.dict-item-name span').textContent === 'combat.melee.dice_rolls'
      );
      expect(diceRollsCard).toBeTruthy();
      expect(diceRollsCard.querySelector('.dict-item-name .badge').textContent.trim()).toBe('Found in 2 games');

      const links = Array.from(diceRollsCard.querySelectorAll('.dict-game-link')).map((l) => l.textContent);
      expect(links).toContain('Dungeons & Dragons 5e');
      expect(links).toContain('Fate Core');
    });

    test('F4-T1-03: Filter Dictionary List by Sidebar Domain', async () => {
      document.getElementById('tab-nav-dictionary').click();

      const combatBtn = Array.from(document.querySelectorAll('.dict-domain-btn')).find((btn) =>
        btn.textContent.includes('combat')
      );
      combatBtn.click();

      const activeBtn = document.querySelector('.dict-domain-btn.active');
      expect(activeBtn).toBeTruthy();
      expect(activeBtn.textContent).toContain('combat');
      expect(document.getElementById('dict-current-domain').textContent).toBe('combat Domain');

      await waitFor(() => {
        return document.querySelectorAll('#dict-results-list .dict-item-card').length === 2;
      });

      const cards = document.querySelectorAll('#dict-results-list .dict-item-card');
      const names = Array.from(cards).map((c) => c.querySelector('.dict-item-name span').textContent);
      expect(names).toContain('combat.melee.dice_rolls');
      expect(names).toContain('combat.movement.hex_grid');
    });

    test('F4-T1-04: Click Game Link Inside Dictionary Card Opens Modal', async () => {
      document.getElementById('tab-nav-dictionary').click();

      const diceRollsCard = Array.from(document.querySelectorAll('#dict-results-list .dict-item-card')).find(
        (c) => c.querySelector('.dict-item-name span').textContent === 'combat.melee.dice_rolls'
      );
      const fateLink = Array.from(diceRollsCard.querySelectorAll('.dict-game-link')).find(
        (l) => l.textContent === 'Fate Core'
      );
      fateLink.click();

      const modal = document.getElementById('details-modal-overlay');
      expect(modal.classList.contains('active')).toBe(true);
      expect(document.getElementById('modal-game-title').textContent).toBe('Fate Core');
    });

    test('F4-T1-05: Reset Dictionary Filter to All Domains', async () => {
      document.getElementById('tab-nav-dictionary').click();

      const combatBtn = Array.from(document.querySelectorAll('.dict-domain-btn')).find((btn) =>
        btn.textContent.includes('combat')
      );
      combatBtn.click();

      const allBtn = Array.from(document.querySelectorAll('.dict-domain-btn')).find((btn) =>
        btn.textContent.includes('All Domains')
      );
      allBtn.click();

      const activeBtn = document.querySelector('.dict-domain-btn.active');
      expect(activeBtn).toBeTruthy();
      expect(activeBtn.textContent).toContain('All Domains');
      expect(document.getElementById('dict-current-domain').textContent).toBe('All System Vectors');
      expect(document.querySelectorAll('#dict-results-list .dict-item-card').length).toBe(8);
    });

    test('F4-T2-01: Empty Domain Rendering Fallback', () => {
      document.getElementById('tab-nav-dictionary').click();
      window.setDictDomain('nonexistent');

      expect(document.getElementById('dict-current-domain').textContent).toBe('nonexistent Domain');
      const fallback = document.querySelector('#dict-results-list p.text-secondary');
      expect(fallback.textContent).toBe('No vectors recorded.');
    });

    test('F4-T2-02: Grammar Agreement in Vector Found Counts (Plural vs Singular)', () => {
      document.getElementById('tab-nav-dictionary').click();

      const diceRollsCard = Array.from(document.querySelectorAll('#dict-results-list .dict-item-card')).find(
        (c) => c.querySelector('.dict-item-name span').textContent === 'combat.melee.dice_rolls'
      );
      expect(diceRollsCard.querySelector('.dict-item-name .badge').textContent.trim()).toBe('Found in 2 games');

      const spellSlotsCard = Array.from(document.querySelectorAll('#dict-results-list .dict-item-card')).find(
        (c) => c.querySelector('.dict-item-name span').textContent === 'simulation.magic.spell_slots'
      );
      expect(spellSlotsCard.querySelector('.dict-item-name .badge').textContent.trim()).toBe('Found in 1 game');
    });

    test('F4-T2-03: Sidebar Badge Count Matches Rendered Card Volume', async () => {
      document.getElementById('tab-nav-dictionary').click();

      const economyBtn = Array.from(document.querySelectorAll('.dict-domain-btn')).find((btn) =>
        btn.textContent.includes('economy')
      );
      economyBtn.click();

      const badgeVal = economyBtn.querySelector('.badge').textContent;
      expect(badgeVal).toBe('1');

      await waitFor(() => {
        return document.querySelectorAll('#dict-results-list .dict-item-card').length === 1;
      });
      expect(document.querySelector('#dict-results-list .dict-item-card .dict-item-name span').textContent).toBe(
        'economy.market.worker_placement'
      );
    });

    test('F4-T2-04: Grid Resilience with Long Vector Strings', async () => {
      // Programmatically add custom vector via editor
      document.getElementById('tab-nav-editor').click();
      const input = document.getElementById('custom-vector-name');
      input.value = 'simulation.environment.weather.temperature.heat_levels';
      window.addCustomEditorVector();

      document.getElementById('tab-nav-dictionary').click();

      const card = Array.from(document.querySelectorAll('#dict-results-list .dict-item-card')).find(
        (c) =>
          c.querySelector('.dict-item-name span').textContent ===
          'simulation.environment.weather.temperature.heat_levels'
      );
      expect(card).toBeTruthy();
    });

    test('F4-T2-05: Modal Close Restores Dictionary State', async () => {
      document.getElementById('tab-nav-dictionary').click();

      const politicsBtn = Array.from(document.querySelectorAll('.dict-domain-btn')).find((btn) =>
        btn.textContent.includes('politics')
      );
      politicsBtn.click();

      const card = Array.from(document.querySelectorAll('#dict-results-list .dict-item-card')).find(
        (c) => c.querySelector('.dict-item-name span').textContent === 'politics.factions.loyalty'
      );
      card.querySelector('.dict-game-link').click(); // Fate Core

      const modal = document.getElementById('details-modal-overlay');
      expect(modal.classList.contains('active')).toBe(true);

      document.querySelector('.modal-close-btn').click();
      expect(modal.classList.contains('active')).toBe(false);

      expect(document.querySelector('.dict-domain-btn.active').textContent).toContain('politics');
      expect(document.querySelectorAll('#dict-results-list .dict-item-card').length).toBe(2);
    });
  });

  // ==========================================
  // FEATURE 5: Database Editor
  // ==========================================
  describe('FEATURE 5: Database Editor (F5)', () => {
    test('F5-T1-01: Tab Navigation to Editor View', () => {
      const editorTab = document.getElementById('tab-nav-editor');
      editorTab.click();

      expect(document.getElementById('editor-view').classList.contains('active')).toBe(true);
      expect(document.getElementById('add-game-form')).toBeTruthy();
      expect(document.querySelectorAll('#editor-vectors-list input[type="checkbox"]').length).toBe(8);
      expect(document.getElementById('export-json-preview').textContent).not.toBe('');
    });

    test('F5-T1-02: Check Vector Reveals Explanation Field', () => {
      document.getElementById('tab-nav-editor').click();
      const cb = document.getElementById('check-vec-combat.melee.dice_rolls');
      cb.checked = true;
      cb.dispatchEvent(new window.Event('change', { bubbles: true }));

      const textarea = document.querySelector(
        '#editor-explanations-inputs textarea[data-vector="combat.melee.dice_rolls"]'
      );
      expect(textarea).toBeTruthy();
      expect(textarea.required).toBe(true);
    });

    test('F5-T1-03: Add Custom Vector to Checklist', () => {
      document.getElementById('tab-nav-editor').click();
      const input = document.getElementById('custom-vector-name');
      input.value = 'stealth.detection.light_level';
      window.addCustomEditorVector();

      const cb = document.getElementById('check-vec-stealth.detection.light_level');
      expect(cb).toBeTruthy();
      expect(cb.checked).toBe(true);

      const textarea = document.querySelector(
        '#editor-explanations-inputs textarea[data-vector="stealth.detection.light_level"]'
      );
      expect(textarea).toBeTruthy();
      expect(input.value).toBe('');
    });

    test('F5-T1-04: Add Game Success Lifecycle', async () => {
      document.getElementById('tab-nav-editor').click();

      document.getElementById('new-game-title').value = 'Gloomhaven';
      document.getElementById('new-game-year').value = '2017';
      document.getElementById('new-game-medium').value = 'board_game';
      document.getElementById('new-game-genre').value = 'Fantasy';
      document.getElementById('new-game-subgenres').value = 'Cooperative, Campaign';

      const cb = document.getElementById('check-vec-combat.melee.dice_rolls');
      cb.checked = true;
      cb.dispatchEvent(new window.Event('change', { bubbles: true }));

      const textarea = document.querySelector(
        '#editor-explanations-inputs textarea[data-vector="combat.melee.dice_rolls"]'
      );
      textarea.value = 'Uses card modifier deck instead of dice rolls.';

      // Submit Form
      document.getElementById('add-game-form').dispatchEvent(new window.Event('submit', { bubbles: true }));

      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining("Game 'Gloomhaven' has been successfully indexed")
      );

      // Verify reset
      expect(document.getElementById('new-game-title').value).toBe('');
      expect(document.getElementById('editor-explanations-inputs').innerHTML).toBe('');

      // Verify counts
      expect(document.getElementById('stat-total-games').textContent).toBe('5');
      expect(document.getElementById('stat-total-boardgames').textContent).toBe('3');

      // Verify preview updated
      const previewText = document.getElementById('export-json-preview').textContent;
      expect(previewText).toContain('Gloomhaven');

      // Verify in explorer grid
      document.getElementById('tab-nav-explorer').click();
      const maxYearInput = document.getElementById('filter-year-max');
      maxYearInput.value = '2026';
      maxYearInput.dispatchEvent(new window.Event('change', { bubbles: true }));

      document.getElementById('omni-search').value = 'Gloomhaven';
      document.getElementById('omni-search').dispatchEvent(new window.Event('input', { bubbles: true }));

      await waitFor(() => {
        return document.querySelectorAll('.game-card').length === 1;
      });
      expect(document.querySelector('.game-card h2').textContent).toBe('Gloomhaven');
    });

    test('F5-T1-05: Download registry.json Trigger', () => {
      document.getElementById('tab-nav-editor').click();
      const mockClick = jest.fn();
      const mockAppend = jest.spyOn(document.body, 'appendChild').mockImplementation((el) => {
        el.click = mockClick;
        return el;
      });

      window.downloadUpdatedRegistry();

      expect(mockAppend).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      mockAppend.mockRestore();
    });

    test('F5-T2-01: Form Submission Blocked on Missing Required Fields', () => {
      document.getElementById('tab-nav-editor').click();

      document.getElementById('new-game-title').value = 'Broken Game';
      document.getElementById('new-game-year').value = '';
      document.getElementById('new-game-genre').value = '';

      const form = document.getElementById('add-game-form');
      expect(form.checkValidity()).toBe(false);

      expect(document.getElementById('stat-total-games').textContent).toBe('4');
    });

    test('F5-T2-02: Prevent Duplicate Game ID Registrations', () => {
      document.getElementById('tab-nav-editor').click();

      document.getElementById('new-game-title').value = 'Dnd 5e';
      document.getElementById('new-game-year').value = '2014';
      document.getElementById('new-game-genre').value = 'Fantasy';

      document.getElementById('add-game-form').dispatchEvent(new window.Event('submit', { bubbles: true }));

      expect(global.alert).toHaveBeenCalledWith("A game with ID 'dnd_5e' already exists in registry!");
      expect(document.getElementById('stat-total-games').textContent).toBe('4');
      expect(document.getElementById('new-game-title').value).toBe('Dnd 5e');
    });

    test('F5-T2-03: Invalid Custom Vector Format Rejected', () => {
      document.getElementById('tab-nav-editor').click();
      const input = document.getElementById('custom-vector-name');
      input.value = 'invalid_notation';

      window.addCustomEditorVector();

      expect(global.alert).toHaveBeenCalledWith(
        'Invalid vector notation. Please use domain.subsystem.focus (e.g. combat.melee.tactical)'
      );
      expect(document.getElementById('check-vec-invalid_notation')).toBeFalsy();
    });

    test('F5-T2-04: Duplicate Custom Vector Addition Blocked', () => {
      document.getElementById('tab-nav-editor').click();
      const input = document.getElementById('custom-vector-name');
      input.value = 'combat.melee.dice_rolls';

      window.addCustomEditorVector();

      expect(global.alert).toHaveBeenCalledWith('This vector namespace already exists!');
    });

    test('F5-T2-05: Uncheck Vector Removes Explanation Textarea', () => {
      document.getElementById('tab-nav-editor').click();
      const cb = document.getElementById('check-vec-combat.melee.dice_rolls');
      cb.checked = true;
      cb.dispatchEvent(new window.Event('change', { bubbles: true }));

      expect(document.getElementById('exp-row-combat_melee_dice_rolls')).toBeTruthy();

      cb.checked = false;
      cb.dispatchEvent(new window.Event('change', { bubbles: true }));

      expect(document.getElementById('exp-row-combat_melee_dice_rolls')).toBeNull();
    });
  });

  // ==========================================
  // FEATURE 6: BoardGameGeek Import
  // ==========================================
  describe('FEATURE 6: BoardGameGeek Import (F6)', () => {
    test('F6-T1-01: Search Board Game on BGG', async () => {
      document.getElementById('tab-nav-editor').click();

      global.fetch.mockImplementationOnce((url) => {
        if (url.includes('boardgamegeek.com/xmlapi2/search')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: () => Promise.resolve(mockBggSearchXml),
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      document.getElementById('bgg-search-query').value = 'Scythe';
      const searchBtn = Array.from(document.querySelectorAll('#bgg-import-card button')).find(
        (btn) => btn.textContent === 'Search BGG'
      );
      searchBtn.click();

      const statusDiv = document.getElementById('bgg-search-status');
      await waitFor(() => {
        return statusDiv.textContent.includes('Found 1 matching board games.');
      });

      const resultsArea = document.getElementById('bgg-search-results-area');
      expect(resultsArea.style.display).toBe('block');
      expect(resultsArea.textContent).toContain('Mock BGG Game');
      expect(resultsArea.querySelector('button')).toBeTruthy();
    });

    test('F6-T1-02: Import Game Details and Pre-fill Form', async () => {
      document.getElementById('tab-nav-editor').click();

      // Trigger search first to populate results area
      global.fetch.mockImplementationOnce((url) => {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(mockBggSearchXml),
        });
      });
      document.getElementById('bgg-search-query').value = 'Scythe';
      Array.from(document.querySelectorAll('#bgg-import-card button'))
        .find((btn) => btn.textContent === 'Search BGG')
        .click();
      await waitFor(() => document.getElementById('bgg-search-results-area').style.display === 'block');

      // Mock details call
      global.fetch.mockImplementationOnce((url) => {
        if (url.includes('boardgamegeek.com/xmlapi2/thing')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: () => Promise.resolve(mockBggThingXml),
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      document.querySelector('#bgg-search-results-area button').click(); // click Import Details

      await waitFor(() => {
        return document.getElementById('new-game-title').value === 'Mock BGG Game';
      });

      expect(document.getElementById('new-game-year').value).toBe('2022');
      expect(document.getElementById('new-game-medium').value).toBe('board_game');
      expect(document.getElementById('new-game-genre').value).toBe('Fantasy');
      expect(document.getElementById('bgg-search-status').textContent).toContain(
        "Successfully imported 'Mock BGG Game'!"
      );
    });

    test('F6-T1-03: BGG Mechanic Maps to Vector Checkbox', async () => {
      document.getElementById('tab-nav-editor').click();

      // Mock search & details call directly by calling window.importBGGGame
      global.fetch.mockImplementationOnce((url) => {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(mockBggThingXml),
        });
      });

      window.importBGGGame('99999');

      await waitFor(() => {
        return document.getElementById('new-game-title').value === 'Mock BGG Game';
      });

      const cb = document.getElementById('check-vec-economy.market.worker_placement');
      expect(cb.checked).toBe(true);
    });

    test('F6-T1-04: Autofill Vector Rules Explanations', async () => {
      document.getElementById('tab-nav-editor').click();

      global.fetch.mockImplementationOnce((url) => {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(mockBggThingXml),
        });
      });

      window.importBGGGame('99999');

      await waitFor(() => {
        return document.querySelector('#editor-explanations-inputs textarea') !== null;
      });

      const ta = document.querySelector(
        '#editor-explanations-inputs textarea[data-vector="economy.market.worker_placement"]'
      );
      expect(ta.value).toBe('This game features the Worker Placement mechanic. Rules dictate how this works in-game.');
    });

    test('F6-T1-05: Complete Lifecycle: Import, Edit and Index', async () => {
      document.getElementById('tab-nav-editor').click();

      global.fetch.mockImplementationOnce((url) => {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(mockBggThingXml),
        });
      });

      window.importBGGGame('99999');

      await waitFor(() => {
        return document.getElementById('new-game-title').value === 'Mock BGG Game';
      });

      document.getElementById('new-game-title').value = 'Mock BGG Game (Revised Edition)';
      const ta = document.querySelector(
        '#editor-explanations-inputs textarea[data-vector="economy.market.worker_placement"]'
      );
      ta.value = 'Custom revised worker placement explanation.';

      document.getElementById('add-game-form').dispatchEvent(new window.Event('submit', { bubbles: true }));

      expect(document.getElementById('stat-total-games').textContent).toBe('5');

      // Verify in explorer search
      document.getElementById('tab-nav-explorer').click();
      const maxYearInput = document.getElementById('filter-year-max');
      maxYearInput.value = '2026';
      maxYearInput.dispatchEvent(new window.Event('change', { bubbles: true }));

      document.getElementById('omni-search').value = 'Revised Edition';
      document.getElementById('omni-search').dispatchEvent(new window.Event('input', { bubbles: true }));

      await waitFor(() => {
        return document.querySelectorAll('.game-card').length === 1;
      });
      expect(document.querySelector('.game-card h2').textContent).toBe('Mock BGG Game (Revised Edition)');
    });

    test('F6-T2-01: Empty Search Input Blocked', () => {
      document.getElementById('tab-nav-editor').click();
      document.getElementById('bgg-search-query').value = '';

      const searchBtn = Array.from(document.querySelectorAll('#bgg-import-card button')).find(
        (btn) => btn.textContent === 'Search BGG'
      );
      searchBtn.click();

      expect(global.alert).toHaveBeenCalledWith('Please enter a game name to search.');
      expect(document.getElementById('bgg-search-status').style.display).toBe('none');
    });

    test('F6-T2-02: BGG Search Returns Zero Matches', async () => {
      document.getElementById('tab-nav-editor').click();

      global.fetch.mockImplementationOnce((url) => {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve('<items total="0"></items>'),
        });
      });

      document.getElementById('bgg-search-query').value = 'unknowngame123';
      Array.from(document.querySelectorAll('#bgg-import-card button'))
        .find((btn) => btn.textContent === 'Search BGG')
        .click();

      const statusDiv = document.getElementById('bgg-search-status');
      await waitFor(() => {
        return statusDiv.textContent.includes('No matching board games found on BGG.');
      });

      expect(document.getElementById('bgg-search-results-area').style.display).toBe('none');
    });

    test('F6-T2-03: BGG API Error Handling (Offline / Timeout)', async () => {
      document.getElementById('tab-nav-editor').click();

      global.fetch.mockImplementationOnce((url) => {
        return Promise.reject(new Error('Network error'));
      });

      document.getElementById('bgg-search-query').value = 'Scythe';
      Array.from(document.querySelectorAll('#bgg-import-card button'))
        .find((btn) => btn.textContent === 'Search BGG')
        .click();

      const statusDiv = document.getElementById('bgg-search-status');
      await waitFor(() => {
        return statusDiv.textContent.includes('Error connecting to BGG API.');
      });
      expect(document.getElementById('bgg-search-results-area').style.display).toBe('none');
    });

    test('F6-T2-04: Import Game Lacking Year and Category Metadata', async () => {
      document.getElementById('tab-nav-editor').click();

      const mockNoMetaXml = `
      <items>
        <item id="99999" type="boardgame">
          <name type="primary" value="Mock BGG Game"/>
        </item>
      </items>
      `;

      global.fetch.mockImplementationOnce((url) => {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(mockNoMetaXml),
        });
      });

      window.importBGGGame('99999');

      await waitFor(() => {
        return document.getElementById('new-game-title').value === 'Mock BGG Game';
      });

      expect(document.getElementById('new-game-year').value).toBe('2026');
      expect(document.getElementById('new-game-genre').value).toBe('Strategy');
      expect(document.getElementById('new-game-subgenres').value).toBe('');
    });

    test('F6-T2-05: Import Game with Unmapped Mechanics', async () => {
      document.getElementById('tab-nav-editor').click();

      const mockUnmappedXml = `
      <items>
        <item id="99999" type="boardgame">
          <name type="primary" value="Mock BGG Game"/>
          <yearpublished value="2022"/>
          <link type="boardgamemechanic" id="9999" value="Roll / Spin and Move"/>
        </item>
      </items>
      `;

      global.fetch.mockImplementationOnce((url) => {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(mockUnmappedXml),
        });
      });

      window.importBGGGame('99999');

      await waitFor(() => {
        return document.getElementById('new-game-title').value === 'Mock BGG Game';
      });

      expect(document.querySelectorAll('#editor-explanations-inputs textarea').length).toBe(0);
      expect(document.querySelectorAll('#editor-vectors-list input:checked').length).toBe(0);
    });
  });
});
