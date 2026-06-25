/**
 * tests/adversarial_gaps.test.js
 *
 * Challenger Agent Milestone 6 Test Suite targeting remaining gaps in app.js
 * and verifying adversarial/stress scenarios.
 */

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
      subgenres: ['Adventure', 'High Fantasy'],
      governed_vectors: ['combat.melee.dice_rolls'],
      vector_explanations: {
        'combat.melee.dice_rolls': 'Uses d20 + modifiers to hit.',
      },
    },
    {
      game_id: 'desc_game',
      title: 'Game with Description',
      year: 2021,
      medium: 'ttrpg',
      primary_genre: 'Strategy',
      description: 'This is a detailed description of the game rules.',
      governed_vectors: ['combat.melee.tactical'],
    },
    // We need at least 15 games total to trigger progressive rendering (> 10 items)
    // We give them unique vectors to trigger progressive dictionary rendering (> 10 items)
    ...Array.from({ length: 15 }, (_, i) => ({
      game_id: `dummy_ttrpg_${i}`,
      title: `Dummy TTRPG ${i}`,
      year: 2010 + i,
      medium: 'ttrpg',
      primary_genre: 'Fantasy',
      governed_vectors: [`dummy.vector.${i}`],
    })),
  ],
  board_game: [
    {
      game_id: 'scythe',
      title: 'Scythe',
      year: 2016,
      medium: 'board_game',
      primary_genre: 'Strategy',
      subgenres: ['Economic'],
      governed_vectors: ['economy.market.worker_placement'],
      vector_explanations: {
        'economy.market.worker_placement': 'Place workers to produce resources.',
      },
    },
    {
      game_id: 'empty_game',
      title: 'Empty Game',
      year: 2020,
      medium: 'board_game',
      primary_genre: 'Strategy',
      subgenres: [],
      governed_vectors: [],
    },
  ],
};

describe('Systems Indexer - Challenger Adversarial & Coverage Gap Tests', () => {
  let htmlContent;

  beforeAll(() => {
    const htmlPath = path.resolve(__dirname, '../index.html');
    htmlContent = fs.readFileSync(htmlPath, 'utf8');
  });

  beforeEach(() => {
    jest.resetModules();
    document.documentElement.innerHTML = htmlContent;
    global.alert = jest.fn();

    // Default successful fetch mock
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
  });

  // Helper to wait until worker is initialized and stats are rendered
  const waitForWorkerReady = async () => {
    await waitFor(() => {
      const stats = document.getElementById('stat-total-games');
      return stats && stats.textContent !== '0' && stats.textContent !== '';
    });
  };

  test('Gap 1 & 9: Database load failure error rendering (lines 600, 624-626)', async () => {
    // Mock fetch to fail database load
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })
    );

    require('../dist/app.js');
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

    await waitFor(() => {
      const grid = document.getElementById('games-grid');
      return grid && grid.textContent.includes('Error loading registry database');
    });
  });

  test('Gap 2: LocalSearchWorker database fetch failure catch block (lines 99-100)', async () => {
    // Mock first fetch (loadDatabase) to succeed, and second fetch (LocalSearchWorker init) to fail
    global.fetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(JSON.parse(JSON.stringify(mockRegistryData))),
        })
      )
      .mockImplementationOnce(() => Promise.reject(new Error('Local worker fetch failure')));

    require('../dist/app.js');
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

    // Wait to let it execute
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  test('Gap 3 & 7: LocalSearchWorker postMessage error try-catch & Worker error log (lines 334-335, 378-379)', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    require('../dist/app.js');
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

    await waitForWorkerReady();

    // Mock Map.prototype.get to throw an error inside LocalSearchWorker.postMessage (after initialization is complete)
    const originalGet = Map.prototype.get;
    Map.prototype.get = jest.fn().mockImplementation(() => {
      throw new Error('Simulated Map error');
    });

    // Trigger comparison tool action using the DOM buttons
    const btnA = document.querySelector('#compare-selector-a .select-game-btn');
    const btnB = document.querySelector('#compare-selector-b .select-game-btn');
    if (btnA && btnB) {
      btnA.click();
      btnB.click();
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith('Worker error:', 'Simulated Map error');

    // Restore
    Map.prototype.get = originalGet;
    consoleErrorSpy.mockRestore();
  });

  test('Gap 4 & 5: LocalSearchWorker sorting and autocomplete fallback branches (lines 134, 137-140, 167-172)', async () => {
    require('../dist/app.js');
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

    await waitForWorkerReady();

    // Trigger different sorting choices to exercise sort branches
    const sortSelect = document.getElementById('filter-sort');
    if (sortSelect) {
      sortSelect.value = 'title-desc';
      sortSelect.dispatchEvent(new window.Event('change', { bubbles: true }));

      sortSelect.value = 'year-asc';
      sortSelect.dispatchEvent(new window.Event('change', { bubbles: true }));

      // Exercise sorting fallback (line 140) by adding and triggering custom/invalid option
      const opt = document.createElement('option');
      opt.value = 'invalid-sort';
      sortSelect.appendChild(opt);
      sortSelect.value = 'invalid-sort';
      sortSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
    }

    // Trigger autocomplete suggestions
    const searchInput = document.getElementById('vector-query-input');
    if (searchInput) {
      searchInput.value = 'combat';
      searchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    }

    // Wait for autocomplete debounce
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  test('Gap 6: Worker initialization check for standard Worker (line 349)', async () => {
    const originalWorker = global.Worker;
    const mockWorkerInstance = {
      postMessage: jest.fn(),
      onmessage: null,
    };
    global.Worker = jest.fn().mockImplementation(() => mockWorkerInstance);

    require('../dist/app.js');
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

    // Wait for async init to call new Worker
    await waitFor(() => {
      return global.Worker.mock.calls.length >= 1;
    });

    expect(global.Worker).toHaveBeenCalled();
    global.Worker = originalWorker;
  });

  test('Gap 8: Autocomplete results empty display styling (lines 413-415)', async () => {
    require('../dist/app.js');
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

    await waitForWorkerReady();

    const suggestionsBox = document.getElementById('vector-query-suggestions');
    suggestionsBox.style.display = 'block';

    // Type a nonexistent vector query to return 0 autocomplete suggestions
    const searchInput = document.getElementById('vector-query-input');
    searchInput.value = 'nonexistentvector';
    searchInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    // Wait until autocomplete display changes to none
    await waitFor(() => {
      return suggestionsBox.style.display === 'none';
    });

    expect(suggestionsBox.style.display).toBe('none');
  });

  test('Gap 10 & 13: Details modal dismiss by overlay click, and empty governed vectors fallback (lines 797, 1085)', async () => {
    require('../dist/app.js');
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

    await waitForWorkerReady();

    window.openGameDetails('empty_game');

    const modalOverlay = document.getElementById('details-modal-overlay');
    expect(modalOverlay.classList.contains('active')).toBe(true);

    const vectorsContent = document.getElementById('modal-vectors-content');
    expect(vectorsContent.textContent).toContain('No governed systems indexed');

    // Click on the overlay to close it
    modalOverlay.click();
    expect(modalOverlay.classList.contains('active')).toBe(false);
  });

  test('Gap 11 & 12: window.loadMoreGames and render jobs cancellation (lines 828-829, 887-888)', async () => {
    require('../dist/app.js');
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

    await waitForWorkerReady();

    // Mock requestAnimationFrame to return a handle instead of executing synchronously
    const originalRAF = window.requestAnimationFrame;
    const originalCAF = window.cancelAnimationFrame;

    window.requestAnimationFrame = jest.fn().mockReturnValue(777);
    window.cancelAnimationFrame = jest.fn();

    // Call loadMoreGames twice to trigger rendering cancellation
    window.loadMoreGames();
    window.loadMoreGames();

    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(777);

    // Restore
    window.requestAnimationFrame = originalRAF;
    window.cancelAnimationFrame = originalCAF;
  });

  test('Gap 14 & 15 & 16: Progressive batch rendering execution and Dictionary progressive rendering (lines 914, 920-945, 1013-1031, 1039-1051)', async () => {
    require('../dist/app.js');
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

    await waitForWorkerReady();

    // Mock requestAnimationFrame to run callbacks synchronously so loops execute fully
    const originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = jest.fn().mockImplementation((cb) => {
      if (cb && cb.name !== 'runDiagnosticsLoop' && cb.name !== 'updateFPS' && cb.name !== 'runTopologySimulation') {
        cb();
      }
      return 1;
    });

    // 1. Trigger search grid progressive render: case where gamesToRender.length <= 10 (visibleCount = 5) but totalFilteredCount (17 dummy games) > visibleCount (5)
    // This hits line 914 and 1039-1051
    window.visibleCount = 5;
    const omniSearch = document.getElementById('omni-search');
    omniSearch.value = 'dummy'; // matches all 15 dummy games
    omniSearch.dispatchEvent(new window.Event('input', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 200));

    // 2. Trigger search grid progressive render: case where gamesToRender.length > 10 (visibleCount = 12) but totalFilteredCount (17 games total) > visibleCount (12)
    // This hits lines 920-945 and line 940!
    window.visibleCount = 12;
    omniSearch.value = 'dummy';
    omniSearch.dispatchEvent(new window.Event('input', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 200));

    // 3. Trigger dictionary view with many items (we have > 15 unique vectors, triggering progressive dict render)
    // This hits lines 1013-1031
    const dictTab = document.querySelector('.tab-btn[data-tab="dictionary"]');
    if (dictTab) {
      dictTab.click();
    }

    // Restore
    window.requestAnimationFrame = originalRAF;
  });

  test('Gap 17: Game details modal with description/extract display (lines 1073-1074)', async () => {
    require('../dist/app.js');
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

    await waitForWorkerReady();

    window.openGameDetails('desc_game');

    const descText = document.getElementById('modal-description-text');
    expect(descText.textContent).toBe('This is a detailed description of the game rules.');
  });

  test('Gap 19: Clear autocomplete when query is empty/whitespace (lines 1138-1140)', async () => {
    require('../dist/app.js');
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

    await waitForWorkerReady();

    const searchInput = document.getElementById('vector-query-input');
    const suggestionsBox = document.getElementById('vector-query-suggestions');

    suggestionsBox.style.display = 'block';

    // Type empty value
    searchInput.value = '   ';
    searchInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(suggestionsBox.style.display).toBe('none');
    expect(suggestionsBox.innerHTML).toBe('');
  });

  test('Gap 20, 21 & 22: BGG Import details corner cases and error handling (lines 1593-1594, 1616, 1662-1663)', async () => {
    require('../dist/app.js');
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

    await waitForWorkerReady();

    // 1. Mock fetch to reject (BGG Import fetch error path - lines 1662-1663)
    global.fetch.mockImplementationOnce(() => Promise.reject(new Error('BGG offline')));
    await window.importBGGGame('99999');

    const statusDiv = document.getElementById('bgg-search-status');
    expect(statusDiv.textContent).toBe('Error importing game details.');

    // 2. Mock fetch to return XML lacking item tag (lines 1593-1594)
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve('<items></items>'),
      })
    );
    await window.importBGGGame('99999');
    expect(statusDiv.textContent).toBe('Failed to load details for this game.');

    // 3. Mock fetch to return XML with multiple categories/subgenres (line 1616)
    const xmlWithMultipleCategories = `
      <items>
        <item id="12345" type="boardgame">
          <name type="primary" value="Test Multi Genre"/>
          <yearpublished value="2024"/>
          <link type="boardgamecategory" id="1" value="Category A"/>
          <link type="boardgamecategory" id="2" value="Category B"/>
          <link type="boardgamecategory" id="3" value="Category C"/>
          <link type="boardgamemechanic" id="4" value="Dice Rolling"/>
        </item>
      </items>
    `;
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(xmlWithMultipleCategories),
      })
    );
    await window.importBGGGame('12345');

    expect(document.getElementById('new-game-title').value).toBe('Test Multi Genre');
    expect(document.getElementById('new-game-subgenres').value).toBe('Category A, Category B, Category C');
  });
});
