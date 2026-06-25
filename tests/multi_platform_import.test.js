const fs = require('fs');
const path = require('path');

// Mock registry data
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
        'combat.movement.grid_based',
      ],
      vector_explanations: {
        'combat.melee.dice_rolls': 'Uses d20 + modifiers to hit.',
        'character.progression.campaign_based': 'Character level increases via XP or milestones.',
        'simulation.magic.spell_slots': 'Vancian slots governing daily spells.',
        'combat.movement.grid_based': 'Grid based movement',
      },
    },
    {
      game_id: 'fate_core',
      title: 'Fate Core',
      year: 2013,
      medium: 'ttrpg',
      primary_genre: 'Universal',
      subgenres: ['Narrative', 'Rules-Light'],
      governed_vectors: ['politics.factions.loyalty', 'combat.melee.dice_rolls', 'logistics.survival.cooperative'],
      vector_explanations: {
        'politics.factions.loyalty': 'Factions track reputation and allegiance.',
        'combat.melee.dice_rolls': 'Uses four Fudge/Fate dice to resolve actions.',
        'logistics.survival.cooperative': 'Cooperative play mechanics.',
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
  ],
};

// Mock data
const mockItchSearchJson = {
  games: [
    {
      id: 11111,
      title: 'Laser Kittens',
      published_at: '2021-10-15T12:00:00Z',
    },
  ],
};

const mockItchGameJson = {
  game: {
    id: 11111,
    title: 'Laser Kittens',
    published_at: '2021-10-15T12:00:00Z',
    classification: 'physical-game',
    tags: ['RPG', 'cooperative', 'narrative'],
    description: 'A game featuring cooperative play.',
  },
};

const mockDtrpgSearchJson = {
  products: [
    {
      id: '22222',
      title: 'Wanderhome',
      release_date: '2020-08-01',
    },
  ],
};

const mockDtrpgProductJson = {
  product: {
    id: '22222',
    title: 'Wanderhome',
    release_date: '2020-08-01',
    categories: ['Tabletop Roleplaying Games', 'Fantasy'],
    descriptors: ['cooperative', 'rules-light'],
    description: 'A pastoral fantasy game about cooperative animals.',
  },
};

const mockWikiSearchJson = {
  query: {
    search: [
      {
        pageid: 33333,
        title: 'Dungeons & Dragons',
      },
    ],
  },
};

const mockWikiPageJson = {
  query: {
    pages: {
      33333: {
        title: 'Dungeons & Dragons',
        extract: 'Dungeons & Dragons is a fantasy tabletop role-playing game published in 1974. Features dice rolling.',
      },
    },
  },
};

describe('Multi-Platform Import Connectors Tests', () => {
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

    require('../app.js');
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
    // Wait for the mock registry load to complete and build vectors list
    await waitFor(() => {
      const checkbox = document.getElementById('check-vec-combat.melee.dice_rolls');
      return checkbox !== null;
    });
  });

  describe('Tab Switching', () => {
    test('Switch to different platforms show/hides panes', () => {
      window.switchImportPlatform('itch');
      expect(document.getElementById('import-pane-itch').style.display).toBe('block');
      expect(document.getElementById('import-pane-bgg').style.display).toBe('none');
      expect(document.getElementById('btn-import-itch').classList.contains('active')).toBe(true);
      expect(document.getElementById('btn-import-bgg').classList.contains('active')).toBe(false);

      window.switchImportPlatform('drivethru');
      expect(document.getElementById('import-pane-drivethru').style.display).toBe('block');
      expect(document.getElementById('import-pane-itch').style.display).toBe('none');

      window.switchImportPlatform('wikipedia');
      expect(document.getElementById('import-pane-wikipedia').style.display).toBe('block');
      expect(document.getElementById('import-pane-drivethru').style.display).toBe('none');
    });
  });

  describe('itch.io Connector', () => {
    test('searchItch success and renders results', async () => {
      global.fetch.mockImplementationOnce((url) => {
        if (url.includes('api.itch.io/search/games')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockItchSearchJson),
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      document.getElementById('itch-search-query').value = 'Laser Kittens';
      window.searchItch();

      await waitFor(() => {
        return document.getElementById('itch-search-status').textContent.includes('Found 1 matching games.');
      });

      const results = document.getElementById('itch-search-results-area');
      expect(results.style.display).toBe('block');
      expect(results.textContent).toContain('Laser Kittens');
      expect(results.querySelector('button')).toBeTruthy();
    });

    test('searchItch returns empty results', async () => {
      global.fetch.mockImplementationOnce((url) => {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ games: [] }),
        });
      });

      document.getElementById('itch-search-query').value = 'Laser Kittens';
      window.searchItch();

      await waitFor(() => {
        return document
          .getElementById('itch-search-status')
          .textContent.includes('No matching games found on itch.io.');
      });
      expect(document.getElementById('itch-search-results-area').style.display).toBe('none');
    });

    test('searchItch error path', async () => {
      global.fetch.mockImplementationOnce((url) => {
        return Promise.reject(new Error('Network error'));
      });

      document.getElementById('itch-search-query').value = 'Laser Kittens';
      window.searchItch();

      await waitFor(() => {
        return document.getElementById('itch-search-status').textContent.includes('Error connecting to itch.io API.');
      });
    });

    test('importItchGame success path maps fields and vectors', async () => {
      global.fetch.mockImplementationOnce((url) => {
        if (url.includes('api.itch.io/games/11111')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockItchGameJson),
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      window.importItchGame('11111');

      await waitFor(() => {
        return document.getElementById('new-game-title').value === 'Laser Kittens';
      });

      expect(document.getElementById('new-game-year').value).toBe('2021');
      expect(document.getElementById('new-game-medium').value).toBe('ttrpg');
      expect(document.getElementById('new-game-genre').value).toBe('RPG');
      expect(document.getElementById('new-game-subgenres').value).toBe('cooperative, narrative');

      const coopCb = document.getElementById('check-vec-logistics.survival.cooperative');
      expect(coopCb.checked).toBe(true);

      const campaignCb = document.getElementById('check-vec-character.progression.campaign_based');
      expect(campaignCb.checked).toBe(true);

      const expText = document.querySelector('textarea[data-vector="logistics.survival.cooperative"]');
      expect(expText).toBeTruthy();
      expect(expText.value).toContain('This game features the tag-mapped logistics.survival.cooperative mechanic.');
    });

    test('importItchGame handles API error', async () => {
      global.fetch.mockImplementationOnce((url) => {
        return Promise.resolve({
          ok: false,
          status: 500,
        });
      });

      window.importItchGame('11111');

      await waitFor(() => {
        return document.getElementById('itch-search-status').textContent === 'Error importing game details.';
      });
    });
  });

  describe('DriveThruRPG Connector', () => {
    test('searchDriveThru success and renders results', async () => {
      global.fetch.mockImplementationOnce((url) => {
        if (url.includes('api.drivethrurpg.com/v1/search')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockDtrpgSearchJson),
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      document.getElementById('drivethru-search-query').value = 'Wanderhome';
      window.searchDriveThru();

      await waitFor(() => {
        return document.getElementById('drivethru-search-status').textContent.includes('Found 1 matching products.');
      });

      const results = document.getElementById('drivethru-search-results-area');
      expect(results.style.display).toBe('block');
      expect(results.textContent).toContain('Wanderhome');
    });

    test('importDriveThruGame success maps categories, descriptors, and publisher to vectors', async () => {
      global.fetch.mockImplementationOnce((url) => {
        if (url.includes('api.drivethrurpg.com/v1/products/22222')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockDtrpgProductJson),
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      window.importDriveThruGame('22222');

      await waitFor(() => {
        return document.getElementById('new-game-title').value === 'Wanderhome';
      });

      expect(document.getElementById('new-game-year').value).toBe('2020');
      expect(document.getElementById('new-game-medium').value).toBe('ttrpg');
      expect(document.getElementById('new-game-genre').value).toBe('Fantasy');

      const coopCb = document.getElementById('check-vec-logistics.survival.cooperative');
      expect(coopCb.checked).toBe(true);
    });

    test('importDriveThruGame handles API error', async () => {
      global.fetch.mockImplementationOnce((url) => {
        return Promise.reject(new Error('DriveThruRPG API failed'));
      });

      window.importDriveThruGame('22222');

      await waitFor(() => {
        return document.getElementById('drivethru-search-status').textContent === 'Error importing game details.';
      });
    });
  });

  describe('Wikipedia Connector', () => {
    test('searchWikipedia success and renders results', async () => {
      global.fetch.mockImplementationOnce((url) => {
        if (url.includes('en.wikipedia.org/w/api.php?action=query&list=search')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockWikiSearchJson),
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      document.getElementById('wikipedia-search-query').value = 'Dungeons & Dragons';
      window.searchWikipedia();

      await waitFor(() => {
        return document.getElementById('wikipedia-search-status').textContent.includes('Found 1 matching pages.');
      });

      const results = document.getElementById('wikipedia-search-results-area');
      expect(results.style.display).toBe('block');
      expect(results.textContent).toContain('Dungeons & Dragons');
    });

    test('importWikipediaGame parses extracts, years and medium formats correctly', async () => {
      global.fetch.mockImplementationOnce((url) => {
        if (url.includes('en.wikipedia.org/w/api.php?action=query&prop=extracts')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockWikiPageJson),
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      window.importWikipediaGame('33333');

      await waitFor(() => {
        return document.getElementById('new-game-title').value === 'Dungeons & Dragons';
      });

      expect(document.getElementById('new-game-year').value).toBe('1974');
      expect(document.getElementById('new-game-medium').value).toBe('ttrpg');

      const diceCb = document.getElementById('check-vec-combat.melee.dice_rolls');
      expect(diceCb.checked).toBe(true);
    });

    test('importWikipediaGame handles API error', async () => {
      global.fetch.mockImplementationOnce((url) => {
        return Promise.reject(new Error('Wikipedia API offline'));
      });

      window.importWikipediaGame('33333');

      await waitFor(() => {
        return document.getElementById('wikipedia-search-status').textContent === 'Error importing game details.';
      });
    });
  });
});
