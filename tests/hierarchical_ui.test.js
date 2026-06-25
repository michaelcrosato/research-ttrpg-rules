const fs = require('fs');
const path = require('path');

const mockRegistryData = {
  ttrpg: [
    {
      game_id: 'game_a',
      title: 'Game A',
      year: 2020,
      medium: 'ttrpg',
      primary_genre: 'Fantasy',
      subgenres: ['Adventure'],
      governed_vectors: ['combat.melee.dice_rolls', 'combat.melee.tactical'],
      vector_explanations: {
        'combat.melee.dice_rolls': 'Rolls a d20.',
        'combat.melee.tactical': 'Uses hex grid movement.',
      },
    },
    {
      game_id: 'game_b',
      title: 'Game B',
      year: 2021,
      medium: 'ttrpg',
      primary_genre: 'Sci-Fi',
      subgenres: ['Space Opera'],
      governed_vectors: ['combat.ranged', 'economy.market.worker_placement'],
      vector_explanations: {
        'combat.ranged': 'Requires ammunition.',
        'economy.market.worker_placement': 'Place workers.',
      },
    },
  ],
  board_game: [
    {
      game_id: 'game_c',
      title: 'Game C',
      year: 2022,
      medium: 'board_game',
      primary_genre: 'Strategy',
      subgenres: [],
      governed_vectors: ['combat'],
      vector_explanations: {
        combat: 'General combat rules.',
      },
    },
  ],
};

describe('Systems Indexer - Hierarchical Sub-vector Explanations UI Tests', () => {
  let htmlContent;

  beforeAll(() => {
    const htmlPath = path.resolve(__dirname, '../index.html');
    htmlContent = fs.readFileSync(htmlPath, 'utf8');
  });

  beforeEach(async () => {
    jest.resetModules();
    document.documentElement.innerHTML = htmlContent;
    global.alert = jest.fn();

    // Default successful fetch mock for registry.json
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('registry.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(JSON.parse(JSON.stringify(mockRegistryData))),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    // Load application script
    require('../app.js');

    // Fire DOMContentLoaded
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

    // Wait for initial database load to populate dashboard stats (3 games)
    await waitFor(() => {
      const statsTotal = document.getElementById('stat-total-games');
      return statsTotal && statsTotal.textContent === '3';
    });
  });

  test('Should search parent namespace and display combined sub-vector explanations', async () => {
    // Navigate to Vector Search Panel
    document.getElementById('tab-nav-vector-search').click();

    // Simulate entering 'combat' into vector search input
    const input = document.getElementById('vector-query-input');
    input.value = 'combat';

    // Trigger autocomplete to verify it shows the combat related suggestions
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    const suggestions = document.getElementById('vector-query-suggestions');
    await waitFor(() => suggestions.style.display === 'block');
    const items = suggestions.querySelectorAll('.suggestion-item');
    const suggestionTexts = Array.from(items).map((item) => item.textContent);
    expect(suggestionTexts).toContain('combat.melee.dice_rolls');
    expect(suggestionTexts).toContain('combat.melee.tactical');
    expect(suggestionTexts).toContain('combat.ranged');
    expect(suggestionTexts).toContain('combat');

    // Execute Vector Search
    document.getElementById('vector-search-btn').click();

    // Wait for search results container to be populated
    await waitFor(() => {
      return document.querySelectorAll('#vector-search-results .vector-game-item').length === 3;
    });

    const gameItems = document.querySelectorAll('#vector-search-results .vector-game-item');

    // Verify titles of matched games (Game A, Game B, Game C)
    const titles = Array.from(gameItems).map((item) => item.querySelector('.vector-game-title').textContent);
    expect(titles).toContain('Game A');
    expect(titles).toContain('Game B');
    expect(titles).toContain('Game C');

    // Find each game's explanation HTML in the results list
    const gameAItem = Array.from(gameItems).find(
      (item) => item.querySelector('.vector-game-title').textContent === 'Game A'
    );
    const gameBItem = Array.from(gameItems).find(
      (item) => item.querySelector('.vector-game-title').textContent === 'Game B'
    );
    const gameCItem = Array.from(gameItems).find(
      (item) => item.querySelector('.vector-game-title').textContent === 'Game C'
    );

    // Game A has two sub-vectors matching 'combat' (combat.melee.dice_rolls, combat.melee.tactical)
    const gameARuleText = gameAItem.querySelector('.vector-rule-text').innerHTML;
    expect(gameARuleText).toContain('<strong>combat.melee.dice_rolls</strong>: Rolls a d20.');
    expect(gameARuleText).toContain('<strong>combat.melee.tactical</strong>: Uses hex grid movement.');
    expect(gameARuleText).toContain('<br>'); // Verify that some form of <br> tag is present

    // Game B has one sub-vector matching 'combat' (combat.ranged). economy.market.worker_placement is not matching.
    const gameBRuleText = gameBItem.querySelector('.vector-rule-text').innerHTML;
    expect(gameBRuleText).toContain('<strong>combat.ranged</strong>: Requires ammunition.');
    expect(gameBRuleText).not.toContain('economy.market.worker_placement');

    // Game C has exact parent namespace match 'combat'
    const gameCRuleText = gameCItem.querySelector('.vector-rule-text').innerHTML;
    expect(gameCRuleText).toContain('<strong>combat</strong>: General combat rules.');
  });

  test('Should fall back to single leaf vector without HTML strong prefix if query is not a parent namespace', async () => {
    document.getElementById('tab-nav-vector-search').click();
    const input = document.getElementById('vector-query-input');
    input.value = 'economy.market.worker_placement';

    document.getElementById('vector-search-btn').click();

    await waitFor(() => {
      return document.querySelectorAll('#vector-search-results .vector-game-item').length === 1;
    });

    const gameItems = document.querySelectorAll('#vector-search-results .vector-game-item');
    const gameBItem = Array.from(gameItems).find(
      (item) => item.querySelector('.vector-game-title').textContent === 'Game B'
    );
    const gameBRuleText = gameBItem.querySelector('.vector-rule-text').innerHTML;

    // It should render raw text without <strong> prefix because it is not a parent namespace
    expect(gameBRuleText).toBe('Place workers.');
  });
});
