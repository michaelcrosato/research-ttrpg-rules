const fs = require('fs');
const path = require('path');

const mockRegistryData = {
  ttrpg: [
    {
      game_id: 'dnd_5e',
      title: 'Dungeons & Dragons 5e',
      year: 2014,
      medium: 'ttrpg',
      primary_genre: 'Fantasy',
      subgenres: ['Adventure'],
      governed_vectors: [
        'combat.melee.dice_rolls',
        'character.progression.campaign_based',
        'combat.movement.grid_based',
      ],
      vector_explanations: {
        'combat.melee.dice_rolls': 'Uses d20 + modifiers to hit.',
        'character.progression.campaign_based': 'Character progression.',
        'combat.movement.grid_based': 'Grid based movement',
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
      subgenres: ['Economic'],
      governed_vectors: [
        'economy.market.worker_placement',
        'combat.movement.hex_grid',
        'politics.factions.area_influence',
        'logistics.survival.cooperative',
      ],
      vector_explanations: {
        'economy.market.worker_placement': 'Place workers.',
        'combat.movement.hex_grid': 'Hex grid.',
        'politics.factions.area_influence': 'Influence.',
        'logistics.survival.cooperative': 'Cooperative.',
      },
    },
  ],
};

const mockItchHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="My Awesome Itch Game by Developer">
  <meta property="og:description" content="A cooperative campaign game featuring dice mechanics.">
  <meta name="keywords" content="ttrpg, dice, campaign">
</head>
<body>
  <div class="formatted_description">A cooperative game.</div>
  <table>
    <tr>
      <td>Release date</td>
      <td>Jan 15, 2024</td>
    </tr>
  </table>
  <a href="https://itch.io/games/tag-cooperative">Cooperative</a>
</body>
</html>
`;

const mockDtrpgHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="My Fantasy DTRPG Game - DriveThruRPG.com">
  <meta name="description" content="A tactical d20 grid movement rules-light game.">
  <meta name="keywords" content="fantasy, cooperative">
</head>
<body>
  <div class="product-description">A tactical board game with rules-lite rules.</div>
  <div>Released: Oct 20, 2022</div>
  <a href="/browse/category/board-game">Board Game</a>
</body>
</html>
`;

const mockWikiPageJson = {
  query: {
    pages: {
      99999: {
        title: 'Scythe (board game)',
        extract: 'Scythe is an alternate history board game. Features area influence and worker placement.',
        categories: [{ title: 'Category:Board games introduced in 2016' }, { title: 'Category:Strategy board games' }],
      },
    },
  },
};

describe('Multi-Platform Import Connectors - Milestone 2 New Requirements', () => {
  beforeEach(async () => {
    // Reset DOM and reload script
    jest.resetModules();
    const htmlPath = path.resolve(__dirname, '../index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    document.documentElement.innerHTML = htmlContent;

    global.alert = jest.fn();

    // Default fetch mock for registry.json
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

    require('../dist/app.js');
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

    // Wait for the mock registry load to complete
    await global.waitFor(() => {
      const checkbox = document.getElementById('check-vec-combat.melee.dice_rolls');
      return checkbox !== null;
    });
  });

  describe('itch.io URL Fetch & Fallback', () => {
    test('Successful itch.io URL fetch parses HTML and populates form', async () => {
      global.fetch.mockImplementationOnce((url) => {
        if (url === 'https://developer.itch.io/my-awesome-game') {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: () => Promise.resolve(mockItchHtml),
          });
        }
        return Promise.reject(new Error('CORS block or network error'));
      });

      const queryInput = document.getElementById('itch-search-query');
      queryInput.value = 'https://developer.itch.io/my-awesome-game';

      window.searchItch();

      await global.waitFor(() => {
        return document.getElementById('new-game-title').value === 'My Awesome Itch Game';
      });

      expect(document.getElementById('new-game-year').value).toBe('2024');
      expect(document.getElementById('new-game-medium').value).toBe('ttrpg');
      expect(document.getElementById('new-game-genre').value).toBe('ttrpg');

      // Check mapped vectors: cooperative, dice, campaign
      const coopCb = document.getElementById('check-vec-logistics.survival.cooperative');
      expect(coopCb.checked).toBe(true);

      const diceCb = document.getElementById('check-vec-combat.melee.dice_rolls');
      expect(diceCb.checked).toBe(true);

      const campaignCb = document.getElementById('check-vec-character.progression.campaign_based');
      expect(campaignCb.checked).toBe(true);
    });

    test('Failed itch.io URL fetch shows copy-paste fallback and parsing works', async () => {
      global.fetch.mockImplementationOnce(() => {
        return Promise.reject(new Error('CORS block'));
      });

      const queryInput = document.getElementById('itch-search-query');
      queryInput.value = 'https://developer.itch.io/failed-fetch';

      window.searchItch();

      await global.waitFor(() => {
        return document.getElementById('itch-fallback-container').style.display === 'block';
      });

      expect(document.getElementById('itch-search-status').textContent).toContain('CORS block or offline');

      // Paste HTML and parse
      const fallbackTextarea = document.getElementById('itch-fallback-html');
      fallbackTextarea.value = mockItchHtml;

      window.parseItchHtmlFallback();

      expect(document.getElementById('new-game-title').value).toBe('My Awesome Itch Game');
      expect(document.getElementById('new-game-year').value).toBe('2024');
      expect(document.getElementById('new-game-medium').value).toBe('ttrpg');

      const coopCb = document.getElementById('check-vec-logistics.survival.cooperative');
      expect(coopCb.checked).toBe(true);
    });
  });

  describe('DriveThruRPG URL Fetch & Fallback', () => {
    test('Successful DriveThruRPG URL fetch parses HTML and populates form', async () => {
      global.fetch.mockImplementationOnce((url) => {
        if (url === 'https://www.drivethrurpg.com/product/12345/my-fantasy-game') {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: () => Promise.resolve(mockDtrpgHtml),
          });
        }
        return Promise.reject(new Error('Network error'));
      });

      const queryInput = document.getElementById('drivethru-search-query');
      queryInput.value = 'https://www.drivethrurpg.com/product/12345/my-fantasy-game';

      window.searchDriveThru();

      await global.waitFor(() => {
        return document.getElementById('new-game-title').value === 'My Fantasy DTRPG Game';
      });

      expect(document.getElementById('new-game-year').value).toBe('2022');
      expect(document.getElementById('new-game-medium').value).toBe('board_game'); // board game because category link exists

      // Check mapped vectors: d20 -> dice rolls, grid movement -> grid based
      const diceCb = document.getElementById('check-vec-combat.melee.dice_rolls');
      expect(diceCb.checked).toBe(true);

      const gridCb = document.getElementById('check-vec-combat.movement.grid_based');
      expect(gridCb.checked).toBe(true);
    });

    test('Failed DriveThruRPG URL fetch shows fallback and parsing works', async () => {
      global.fetch.mockImplementationOnce(() => {
        return Promise.reject(new Error('CORS block'));
      });

      const queryInput = document.getElementById('drivethru-search-query');
      queryInput.value = 'https://www.drivethrurpg.com/product/failed';

      window.searchDriveThru();

      await global.waitFor(() => {
        return document.getElementById('drivethru-fallback-container').style.display === 'block';
      });

      const fallbackTextarea = document.getElementById('drivethru-fallback-html');
      fallbackTextarea.value = mockDtrpgHtml;

      window.parseDtrpgHtmlFallback();

      expect(document.getElementById('new-game-title').value).toBe('My Fantasy DTRPG Game');
      expect(document.getElementById('new-game-year').value).toBe('2022');
    });
  });

  describe('Wikipedia Category & Page Parsing', () => {
    test('importWikipediaPage fetches extracts and categories, mapping vectors and year correctly', async () => {
      global.fetch.mockImplementationOnce((url) => {
        if (url.includes('en.wikipedia.org/w/api.php?action=query&prop=extracts')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockWikiPageJson),
          });
        }
        return Promise.reject(new Error('Offline'));
      });

      window.importWikipediaPage('99999');

      await global.waitFor(() => {
        return document.getElementById('new-game-title').value === 'Scythe (board game)';
      });

      expect(document.getElementById('new-game-year').value).toBe('2016');
      expect(document.getElementById('new-game-medium').value).toBe('board_game');

      // Checked vectors from wikiKeywordMapping: placement/worker -> worker_placement, area influence -> area_influence
      const workerCb = document.getElementById('check-vec-economy.market.worker_placement');
      expect(workerCb.checked).toBe(true);

      const influenceCb = document.getElementById('check-vec-politics.factions.area_influence');
      expect(influenceCb.checked).toBe(true);
    });
  });
});
