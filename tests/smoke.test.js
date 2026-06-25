const fs = require('fs');
const path = require('path');

// Mock Data
const mockRegistryData = {
  ttrpg: [
    {
      game_id: 'mock_ttrpg_fantasy',
      title: 'Mock Fantasy RPG',
      year: 2024,
      medium: 'ttrpg',
      primary_genre: 'Fantasy',
      subgenres: ['Adventure'],
      governed_vectors: ['character.character_creation.class_based', 'combat.melee.tactical'],
      vector_explanations: {
        'character.character_creation.class_based': 'Uses classes to build characters.',
        'combat.melee.tactical': 'Features grid-based tactical melee.',
      },
    },
  ],
  board_game: [
    {
      game_id: 'mock_bg_euro',
      title: 'Mock Euro Game',
      year: 2020,
      medium: 'board_game',
      primary_genre: 'Strategy',
      subgenres: ['Economic'],
      governed_vectors: ['economy.market.worker_placement', 'combat.melee.tactical'],
      vector_explanations: {
        'economy.market.worker_placement': 'Place workers to gather resources.',
        'combat.melee.tactical': 'Simple skirmish resolution rules.',
      },
    },
  ],
};

describe('Systems Indexer - E2E Smoke Tests', () => {
  beforeEach(() => {
    // 1. Reset modules cache to re-execute app.js per test run
    jest.resetModules();

    // 2. Load index.html DOM into JSDOM document
    const htmlPath = path.resolve(__dirname, '../index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    document.documentElement.innerHTML = htmlContent;

    // 3. Mock the fetch call for './registry.json'
    global.fetch.mockImplementation((url) => {
      if (url.includes('registry.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockRegistryData),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    // 4. Load app.js code
    require('../dist/app.js');

    // 5. Fire DOMContentLoaded to execute the app logic
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  });

  test('DOM initializes successfully', () => {
    // Verify structural layout headers and containers are present
    const headerTitle = document.querySelector('header h1');
    expect(headerTitle).toBeTruthy();
    expect(headerTitle.textContent).toBe('SYSTEMS INDEXER');

    const explorerGrid = document.getElementById('games-grid');
    expect(explorerGrid).toBeTruthy();
  });

  test('Registry database loads successfully and renders game cards', async () => {
    // Polling wait helper replacing raw setTimeout
    await global.waitFor(() => {
      const gameCards = document.querySelectorAll('.game-card');
      expect(gameCards.length).toBe(2);
    });

    const gameCards = document.querySelectorAll('.game-card');
    // Verify titles on cards
    const cardTitles = Array.from(gameCards).map((card) => card.querySelector('h2').textContent);
    expect(cardTitles).toContain('Mock Fantasy RPG');
    expect(cardTitles).toContain('Mock Euro Game');
  });

  test('Dashboard counts are rendered correctly', async () => {
    // Polling wait helper replacing raw setTimeout
    await global.waitFor(() => {
      const totalGames = document.getElementById('stat-total-games').textContent;
      expect(totalGames).toBe('2');
    });

    // Assert dashboard elements contain correct counts
    const totalGames = document.getElementById('stat-total-games').textContent;
    const totalTTRPGs = document.getElementById('stat-total-ttrpgs').textContent;
    const totalBoardGames = document.getElementById('stat-total-boardgames').textContent;
    const totalVectors = document.getElementById('stat-total-vectors').textContent;

    // 2 games total
    expect(totalGames).toBe('2');
    // 1 TTRPG
    expect(totalTTRPGs).toBe('1');
    // 1 Board Game
    expect(totalBoardGames).toBe('1');
    // 3 unique vectors (combat.melee.tactical is shared)
    expect(totalVectors).toBe('3');
  });
});
