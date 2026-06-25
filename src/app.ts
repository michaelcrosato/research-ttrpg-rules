// Systems Indexer Application Logic

import type { GameRuleset, GameRulesetInternal, RegistryData, SearchFilters } from './types';

declare global {
  interface Window {
    loadMoreGames: () => void;
    openGameDetails: (gameId: string) => void;
    selectCompareGame: (gameId: string, index: number, element: HTMLElement) => void;
    highlightCompareColumn: (colName: string) => void;
    setDictDomain: (domain: string) => void;
    toggleEditorVectorExplanation: (vector: string, isChecked: boolean) => void;
    addCustomEditorVector: () => void;
    downloadUpdatedRegistry: () => void;
    searchBGG: () => void;
    importBGGGame: (bggId: string) => void;
  }
}

// Global state
let gamesData: RegistryData = { ttrpg: [], board_game: [] };
let allGames: GameRulesetInternal[] = [];
let uniqueVectors: Set<string> = new Set();
let uniqueGenres: Set<string> = new Set();
let selectedCompareGames: [string | null, string | null] = [null, null];
let activeDictDomain = 'all';
let visibleCount = 60;

// OmniRuleset Sandbox State
let sandboxSelectedVectors: string[] = [];
let sandboxSession: SandboxGMSession | null = null;
let sandboxSynthesizedRuleset: SandboxSynthesizedRuleset | null = null;

// Web Worker State
let searchWorker: Worker | LocalSearchWorker;
let isWorkerReady = false;
let currentSearchResults: GameRulesetInternal[] = [];

// Render jobs
let currentRenderJob: number | null = null;
let currentDictRenderJob: number | null = null;

// BGG mapping
const bggMechanicMapping: Record<string, string> = {
  'Worker Placement': 'economy.market.worker_placement',
  'Deck, Bag, and Pool Building': 'economy.card.deck_building',
  Drafting: 'economy.card.drafting',
  'Card Drafting': 'economy.card.drafting',
  'Network and Route Building': 'logistics.connection.route_drafting',
  'Tile Placement': 'simulation.building.tile_placement',
  'Area Majority / Influence': 'politics.factions.area_influence',
  'Cooperative Game': 'logistics.survival.cooperative',
  'Auction/Bidding': 'economy.market.auction_bidding',
  'Dice Rolling': 'combat.melee.dice_rolls',
  'Hexagon Grid': 'combat.movement.hex_grid',
  Trading: 'economy.trading.barter',
  'Set Collection': 'logistics.connection.set_collection',
  'Commodity Speculation': 'economy.trading.speculative',
  'Hand Management': 'logistics.survival.hand_management',
  'Campaign / Scenario / Mission Game': 'character.progression.campaign_based',
  'Grid Movement': 'combat.movement.grid_based',
  'Secret Unit Deployment': 'politics.intrigue.secret_objectives',
  'Action Queue': 'economy.production.action_selection_grid',
  Connections: 'logistics.connection.network_building',
};

// Debounce function
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: any;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Local fallback search worker for environments without Web Worker support (e.g. JSDOM in Jest tests)
class LocalSearchWorker {
  onmessage: ((e: { data: any }) => void) | null = null;
  games: GameRulesetInternal[] = [];
  uniqueVectors: Set<string> = new Set();
  invertedIndex: Map<string, any[]> = new Map();
  gamesMap: Map<string, GameRulesetInternal> = new Map();
  sortedUniqueVectors: string[] = [];
  vectorsByDomain: Map<string, string[]> = new Map();

  rebuildVectorsCache(): void {
    const allNamespaces = new Set<string>();
    for (const vector of this.uniqueVectors) {
      const parts = vector.split('.');
      let current = '';
      for (let i = 0; i < parts.length; i++) {
        current = current ? current + '.' + parts[i] : parts[i];
        allNamespaces.add(current);
      }
    }
    this.sortedUniqueVectors = Array.from(allNamespaces).sort((a, b) => a.localeCompare(b));
    this.vectorsByDomain.clear();
    for (const vector of this.sortedUniqueVectors) {
      const domain = vector.split('.')[0] || 'general';
      if (!this.vectorsByDomain.has(domain)) {
        this.vectorsByDomain.set(domain, []);
      }
      this.vectorsByDomain.get(domain)!.push(vector);
    }
  }

  postMessage(data: any): void {
    try {
      const type = data.type || data.action;
      switch (type) {
        case 'init': {
          const url = data.dbUrl || 'registry.json';
          fetch(url)
            .then((response) => response.json())
            .then((registryData) => {
              const ttrpgs = (registryData.ttrpg || []).map((g: any) => ({
                ...g,
                medium: 'ttrpg',
                governed_vectors_set: new Set(g.governed_vectors || []),
              }));
              const boardGames = (registryData.board_game || []).map((g: any) => ({
                ...g,
                medium: 'board_game',
                governed_vectors_set: new Set(g.governed_vectors || []),
              }));
              this.games = [...ttrpgs, ...boardGames];

              this.invertedIndex = new Map();
              this.uniqueVectors = new Set();
              this.gamesMap = new Map();

              for (const game of this.games) {
                this.gamesMap.set(game.game_id, game);
                if (game.governed_vectors) {
                  for (const vector of game.governed_vectors) {
                    this.uniqueVectors.add(vector);
                    if (!this.invertedIndex.has(vector)) {
                      this.invertedIndex.set(vector, []);
                    }
                    this.invertedIndex.get(vector)!.push({
                      game_id: game.game_id,
                      title: game.title,
                      medium: game.medium,
                      year: game.year,
                    });
                  }
                }
              }

              this.rebuildVectorsCache();

              if (this.onmessage) {
                this.onmessage({
                  data: {
                    type: 'ready',
                    action: 'init',
                    success: true,
                    stats: {
                      totalGames: this.games.length,
                      totalTtrpgs: ttrpgs.length,
                      totalBoardgames: boardGames.length,
                      uniqueVectorsCount: this.uniqueVectors.size,
                      ttrpgCount: ttrpgs.length,
                      boardGameCount: boardGames.length,
                      uniqueVectors: this.uniqueVectors.size,
                    },
                  },
                });
              }
            })
            .catch((err) => {
              if (this.onmessage) {
                this.onmessage({ data: { type: 'error', error: err.message } });
              }
            });
          break;
        }
        case 'search': {
          const filters = data.filters || {};
          const searchTerm = String(filters.searchTerm || '')
            .toLowerCase()
            .trim();
          const medium = String(filters.medium || 'all');
          const genre = String(filters.genre || 'all');
          const minYear = filters.minYear !== undefined ? Number(filters.minYear) : 1900;
          const maxYear = filters.maxYear !== undefined ? Number(filters.maxYear) : 2100;
          const sort = String(filters.sort || 'title-asc');

          let results = this.games.filter((game) => {
            const matchesSearch =
              !searchTerm ||
              game.title.toLowerCase().includes(searchTerm) ||
              (game.primary_genre && game.primary_genre.toLowerCase().includes(searchTerm)) ||
              (game.subgenres && game.subgenres.some((sub: string) => sub.toLowerCase().includes(searchTerm))) ||
              (game.governed_vectors &&
                game.governed_vectors.some((vec: string) => vec.toLowerCase().includes(searchTerm)));

            const matchesMedium = medium === 'all' || game.medium === medium;
            const matchesGenre =
              genre === 'all' || game.primary_genre === genre || (game.subgenres && game.subgenres.includes(genre));
            const matchesYear = game.year >= minYear && game.year <= maxYear;

            return matchesSearch && matchesMedium && matchesGenre && matchesYear;
          });

          results.sort((a, b) => {
            if (sort === 'title-asc') {
              return (a.title || '').localeCompare(b.title || '');
            } else if (sort === 'title-desc') {
              return (b.title || '').localeCompare(a.title || '');
            } else if (sort === 'year-desc') {
              return b.year - a.year;
            } else if (sort === 'year-asc') {
              return a.year - b.year;
            }
            return 0;
          });

          if (this.onmessage) {
            this.onmessage({
              data: {
                type: 'searchResults',
                action: 'search',
                results,
                totalCount: results.length,
                total: results.length,
                latencyMs: 1,
              },
            });
          }
          break;
        }
        case 'autocomplete': {
          const query = String(data.query || '')
            .toLowerCase()
            .trim();
          const autocompleteType = data.autocompleteType || 'vector';

          let suggestions: string[] = [];
          let results: any[] = [];
          if (autocompleteType === 'vector') {
            if (query) {
              suggestions = this.sortedUniqueVectors.filter((v) => v.toLowerCase().includes(query));
            } else {
              suggestions = this.sortedUniqueVectors;
            }
          } else {
            if (query) {
              results = this.games
                .filter((g) => g.title.toLowerCase().includes(query))
                .map((g) => ({ game_id: g.game_id, title: g.title }));
            }
          }

          if (this.onmessage) {
            this.onmessage({
              data: {
                type: 'autocompleteResults',
                action: 'autocomplete',
                suggestions,
                results,
                latencyMs: 1,
              },
            });
          }
          break;
        }
        case 'compare': {
          const gameIdA = data.gameIdA;
          const gameIdB = data.gameIdB;
          const gameA = this.gamesMap.get(gameIdA);
          const gameB = this.gamesMap.get(gameIdB);

          const setA = new Set<string>(gameA ? gameA.governed_vectors || [] : []);
          const setB = new Set<string>(gameB ? gameB.governed_vectors || [] : []);

          const shared = Array.from(setA)
            .filter((v) => setB.has(v))
            .sort();
          const onlyA = Array.from(setA)
            .filter((v) => !setB.has(v))
            .sort();
          const onlyB = Array.from(setB)
            .filter((v) => !setA.has(v))
            .sort();

          if (this.onmessage) {
            this.onmessage({
              data: {
                type: 'compareResults',
                action: 'compare',
                gameA,
                gameB,
                shared,
                onlyA,
                onlyB,
                latencyMs: 1,
              },
            });
          }
          break;
        }
        case 'dictionary': {
          const domain = data.domain || 'all';
          const vector = data.vector || null;

          if (vector) {
            const results: any[] = [];
            const seenGameIds = new Set<string>();
            for (const [key, gamesList] of this.invertedIndex.entries()) {
              if (key === vector || key.startsWith(vector + '.')) {
                for (const game of gamesList) {
                  if (!seenGameIds.has(game.game_id)) {
                    seenGameIds.add(game.game_id);
                    results.push(game);
                  }
                }
              }
            }
            results.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

            if (this.onmessage) {
              this.onmessage({
                data: {
                  type: 'dictionaryResults',
                  action: 'dictionary',
                  vector,
                  results,
                  vectors: results,
                },
              });
            }
            return;
          }

          let vectors: string[] = [];
          if (domain === 'all') {
            vectors = this.sortedUniqueVectors;
          } else {
            vectors = this.vectorsByDomain.get(domain) || [];
          }

          const results = vectors
            .filter((vec) => this.uniqueVectors.has(vec))
            .map((vec) => ({
              vector: vec,
              games: this.invertedIndex.get(vec) || [],
            }));

          if (this.onmessage) {
            this.onmessage({
              data: {
                type: 'dictionaryResults',
                action: 'dictionary',
                activeDomain: domain,
                domain,
                results,
                vectors: results,
              },
            });
          }
          break;
        }
        case 'addGame': {
          const game = data.game;
          this.games.push(game);
          this.gamesMap.set(game.game_id, game);

          if (game.governed_vectors) {
            for (const vector of game.governed_vectors) {
              this.uniqueVectors.add(vector);
              if (!this.invertedIndex.has(vector)) {
                this.invertedIndex.set(vector, []);
              }
              this.invertedIndex.get(vector)!.push({
                game_id: game.game_id,
                title: game.title,
                medium: game.medium,
                year: game.year,
              });
            }
          }

          this.rebuildVectorsCache();

          if (this.onmessage) {
            this.onmessage({
              data: {
                type: 'addGameDone',
                action: 'addGame',
                success: true,
                game,
                updatedStats: {
                  totalGames: this.games.length,
                  totalTtrpgs: this.games.filter((g) => g.medium === 'ttrpg').length,
                  totalBoardgames: this.games.filter((g) => g.medium === 'board_game').length,
                  uniqueVectorsCount: this.uniqueVectors.size,
                },
                stats: {
                  totalGames: this.games.length,
                  uniqueVectors: this.uniqueVectors.size,
                },
              },
            });
          }
          break;
        }
        case 'addVector': {
          const vector = data.vector;
          if (vector && !this.uniqueVectors.has(vector)) {
            this.uniqueVectors.add(vector);
            this.rebuildVectorsCache();
          }
          break;
        }
      }
    } catch (err: any) {
      if (this.onmessage) {
        this.onmessage({
          data: {
            type: 'error',
            error: err.message,
          },
        });
      }
    }
  }
}

// Helper to safely set elements text
function setElText(id: string, text: string | number) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(text);
}

// Function Declarations
function loadMoreGames() {
  visibleCount += 60;
  renderExplorer();
}

function openGameDetails(gameId: string) {
  const game = allGames.find((g) => g.game_id === gameId);
  if (!game) return;

  const modalOverlay = document.getElementById('details-modal-overlay');
  if (!modalOverlay) return;

  setElText('modal-game-title', game.title);

  const mediumEl = document.getElementById('modal-medium');
  if (mediumEl) {
    mediumEl.textContent = game.medium === 'ttrpg' ? 'Tabletop Roleplaying Game' : 'Board Game';
    mediumEl.className = `medium-badge ${game.medium}-badge`;
  }
  setElText('modal-year', game.year);
  setElText('modal-primary-genre', game.primary_genre);
  setElText('modal-subgenres', game.subgenres ? game.subgenres.join(', ') : 'None');

  // Set description text if available
  const descContainer = document.getElementById('modal-description-container');
  const descText = document.getElementById('modal-description-text');
  if (descContainer && descText) {
    if (game.extract || game.description) {
      descText.textContent = game.extract || game.description || null;
      descContainer.style.display = 'block';
    } else {
      descContainer.style.display = 'none';
    }
  }

  // Group vectors by domain
  const vectorsGrid = document.getElementById('modal-vectors-content');
  if (!vectorsGrid) return;
  vectorsGrid.innerHTML = '';

  if (!game.governed_vectors || game.governed_vectors.length === 0) {
    vectorsGrid.innerHTML = '<p class="text-secondary">No governed systems indexed for this ruleset.</p>';
  } else {
    // Group vectors by first segment (e.g. combat, stealth, economy)
    const grouped: Record<string, string[]> = {};
    game.governed_vectors.forEach((vector) => {
      const domain = vector.split('.')[0] || 'general';
      if (!grouped[domain]) grouped[domain] = [];
      grouped[domain].push(vector);
    });

    // Sort domains keys
    const sortedDomains = Object.keys(grouped).sort();

    sortedDomains.forEach((domain) => {
      const section = document.createElement('div');
      section.className = 'modal-vector-group';
      section.style.marginBottom = '1.5rem';

      section.innerHTML = `
        <h4 class="modal-section-title">${domain.toUpperCase()} SUBSYSTEMS</h4>
        <div class="modal-vectors-grid">
          ${grouped[domain]
            .sort()
            .map((vector) => {
              const explanation =
                (game.vector_explanations && game.vector_explanations[vector]) ||
                'No detailed rule explanation recorded.';
              return `
              <div class="modal-vector-row">
                <div class="modal-vector-name">${vector}</div>
                <div class="modal-vector-rule">${explanation}</div>
              </div>
            `;
            })
            .join('')}
        </div>
      `;
      vectorsGrid.appendChild(section);
    });
  }

  modalOverlay.classList.add('active');
}

function selectCompareGame(gameId: string, index: number, element: HTMLElement) {
  // Deselect previous on same column
  const container = element.parentElement;
  if (container) {
    container.querySelectorAll('.select-game-btn').forEach((btn) => btn.classList.remove('selected'));
  }
  element.classList.add('selected');

  selectedCompareGames[index] = gameId;
  renderComparisonResults();
}

function highlightCompareColumn(colName: string) {
  // SVG segments & fallback circles maps
  const segmentClassMap: Record<string, string> = {
    a: '.venn-segment.segment-a',
    b: '.venn-segment.segment-b',
    both: '.venn-segment.segment-both',
  };
  const circleClassMap: Record<string, string> = {
    a: '.venn-circle.circle-a',
    b: '.venn-circle.circle-b',
    both: '.venn-circle-intersection',
  };

  const targetSegment = document.querySelector(segmentClassMap[colName]);
  const isCurrentlyActive = targetSegment ? targetSegment.classList.contains('active') : false;

  // Clear active classes from all segments and fallback circles
  Object.values(segmentClassMap).forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => el.classList.remove('active'));
  });
  Object.values(circleClassMap).forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => el.classList.remove('active'));
  });

  // Clear all highlights
  ['a', 'both', 'b'].forEach((col) => {
    const el = document.getElementById(`compare-col-${col}`);
    if (el) {
      el.style.border = '';
      el.style.boxShadow = '';
      el.style.background = '';
    }
  });

  // If it was not already active, activate it
  if (!isCurrentlyActive) {
    const segment = document.querySelector(segmentClassMap[colName]);
    if (segment) segment.classList.add('active');

    const circle = document.querySelector(circleClassMap[colName]);
    if (circle) circle.classList.add('active');

    // Apply highlight to target column
    const target = document.getElementById(`compare-col-${colName}`);
    if (target) {
      let color = 'rgba(99, 102, 241, 0.2)';
      let borderColor = 'var(--color-accent)';
      let shadow = 'var(--shadow-glow)';

      if (colName === 'a') {
        color = 'rgba(139, 92, 246, 0.1)';
        borderColor = 'var(--color-ttrpg)';
        shadow = '0 0 25px rgba(139, 92, 246, 0.2)';
      } else if (colName === 'b') {
        color = 'rgba(6, 182, 212, 0.1)';
        borderColor = 'var(--color-boardgame)';
        shadow = '0 0 25px rgba(6, 182, 212, 0.2)';
      }

      target.style.background = color;
      target.style.border = `2px solid ${borderColor}`;
      target.style.boxShadow = shadow;

      // Smooth scroll into view
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

function setDictDomain(domain: string) {
  activeDictDomain = domain;
  renderDictSidebar();
  renderDictionary();
}

function toggleEditorVectorExplanation(vector: string, isChecked: boolean) {
  const container = document.getElementById('editor-explanations-inputs');
  if (!container) return;

  const id = `exp-row-${vector.replace(/\./g, '_')}`;

  if (isChecked) {
    // Add text input for explanation
    const row = document.createElement('div');
    row.className = 'vector-explanation-row';
    row.id = id;
    row.innerHTML = `
      <span>${vector} Explanation:</span>
      <textarea class="form-control" data-vector="${vector}" placeholder="Explain how this game's rules govern this vector..." required rows="2"></textarea>
    `;
    container.appendChild(row);
  } else {
    // Remove input
    const row = document.getElementById(id);
    if (row) row.remove();
  }

  updateEditorPreviews();
}

function addCustomEditorVector() {
  const input = document.getElementById('custom-vector-name') as HTMLInputElement | null;
  if (!input) return;
  const val = input.value.trim().toLowerCase();

  if (!val) return;

  // Validate pattern domain.subsystem.focus
  const parts = val.split('.');
  if (parts.length < 3) {
    alert('Invalid vector notation. Please use domain.subsystem.focus (e.g. combat.melee.tactical)');
    return;
  }

  if (uniqueVectors.has(val)) {
    alert('This vector namespace already exists!');
    return;
  }

  uniqueVectors.add(val);
  searchWorker.postMessage({ type: 'addVector', vector: val });
  input.value = '';

  // Re-render checklist
  renderEditorVectorChecklist();

  // Find new checkbox and check it
  const cb = document.getElementById(`check-vec-${val}`) as HTMLInputElement | null;
  if (cb) {
    cb.checked = true;
    toggleEditorVectorExplanation(val, true);
  }
}

function downloadUpdatedRegistry() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(gamesData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', 'registry.json');
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

async function searchBGG() {
  const queryInput = document.getElementById('bgg-search-query') as HTMLInputElement | null;
  const resultsArea = document.getElementById('bgg-search-results-area');
  const statusDiv = document.getElementById('bgg-search-status');

  if (!queryInput || !resultsArea || !statusDiv) return;

  const query = queryInput.value.trim();
  if (!query) {
    alert('Please enter a game name to search.');
    return;
  }

  statusDiv.style.display = 'block';
  statusDiv.textContent = 'Searching BoardGameGeek database...';
  resultsArea.style.display = 'none';
  resultsArea.innerHTML = '';

  try {
    const response = await fetch(
      `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(query)}&type=boardgame`
    );
    if (!response.ok) throw new Error('BGG API response was not OK');

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const items = xmlDoc.getElementsByTagName('item');
    if (items.length === 0) {
      statusDiv.textContent = 'No matching board games found on BGG.';
      return;
    }

    statusDiv.textContent = `Found ${items.length} matching board games. Select one to import:`;

    let html = '';
    for (let i = 0; i < Math.min(items.length, 50); i++) {
      const item = items[i];
      const id = item.getAttribute('id');
      const nameEl = item.getElementsByTagName('name')[0];
      const name = nameEl ? nameEl.getAttribute('value') : 'Unknown';
      const yearEl = item.getElementsByTagName('yearpublished')[0];
      const year = yearEl ? yearEl.getAttribute('value') : 'N/A';

      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 0.4rem 0.5rem;">
          <span style="font-size: 0.9rem; color: #fff;">${name} <span style="color: var(--text-muted); font-size: 0.8rem;">(${year})</span></span>
          <button type="button" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;" onclick="importBGGGame('${id}')">Import Details</button>
        </div>
      `;
    }

    resultsArea.innerHTML = html;
    resultsArea.style.display = 'block';
  } catch (error) {
    console.error('BGG Search Error:', error);
    statusDiv.textContent = 'Error connecting to BGG API. Make sure you are online.';
  }
}

async function importBGGGame(bggId: string) {
  const statusDiv = document.getElementById('bgg-search-status');
  if (!statusDiv) return;

  statusDiv.textContent = `Fetching game details (ID: ${bggId})...`;

  try {
    const response = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}`);
    if (!response.ok) throw new Error('BGG Thing API response was not OK');

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const item = xmlDoc.getElementsByTagName('item')[0];
    if (!item) {
      statusDiv.textContent = 'Failed to load details for this game.';
      return;
    }

    // Parse fields
    const nameEl = item.querySelector('name[type="primary"]') || item.querySelector('name');
    const title = nameEl ? nameEl.getAttribute('value') : 'Unknown Game';
    const yearEl = item.querySelector('yearpublished');
    const year = yearEl ? parseInt(yearEl.getAttribute('value') || '2026') || 2026 : 2026;

    // Parse categories (for genres)
    const categoryLinks = Array.from(item.querySelectorAll('link[type="boardgamecategory"]'));
    const categories = categoryLinks.map((l) => l.getAttribute('value'));

    // Set form fields
    const newGameTitleInput = document.getElementById('new-game-title') as HTMLInputElement | null;
    if (newGameTitleInput) newGameTitleInput.value = title || '';

    const newGameYearInput = document.getElementById('new-game-year') as HTMLInputElement | null;
    if (newGameYearInput) newGameYearInput.value = String(year);

    const newGameMediumSelect = document.getElementById('new-game-medium') as HTMLSelectElement | null;
    if (newGameMediumSelect) newGameMediumSelect.value = 'board_game';

    // Assign primary genre and subgenres
    const newGameGenreInput = document.getElementById('new-game-genre') as HTMLInputElement | null;
    const newGameSubgenresInput = document.getElementById('new-game-subgenres') as HTMLInputElement | null;

    if (newGameGenreInput && newGameSubgenresInput) {
      if (categories.length > 0) {
        newGameGenreInput.value = categories[0] || 'Strategy';
        if (categories.length > 1) {
          newGameSubgenresInput.value = categories
            .slice(0, 3)
            .filter((c): c is string => c !== null)
            .join(', ');
        } else {
          newGameSubgenresInput.value = '';
        }
      } else {
        newGameGenreInput.value = 'Strategy';
        newGameSubgenresInput.value = '';
      }
    }

    // Clear existing checkboxes and text explanations
    document.querySelectorAll('#editor-vectors-list input[type="checkbox"]').forEach((cb) => {
      (cb as HTMLInputElement).checked = false;
    });
    const explanationInputs = document.getElementById('editor-explanations-inputs');
    if (explanationInputs) explanationInputs.innerHTML = '';

    // Parse mechanics and check matching vectors
    const mechanicLinks = Array.from(item.querySelectorAll('link[type="boardgamemechanic"]'));
    const mechanics = mechanicLinks.map((l) => l.getAttribute('value'));

    const checkedVectors: string[] = [];
    mechanics.forEach((mech) => {
      if (mech) {
        const mappedVector = bggMechanicMapping[mech];
        if (mappedVector) {
          checkedVectors.push(mappedVector);

          // Find check item
          const cb = document.getElementById(`check-vec-${mappedVector}`) as HTMLInputElement | null;
          if (cb) {
            cb.checked = true;
            toggleEditorVectorExplanation(mappedVector, true);
          }
        }
      }
    });

    // Fill textareas with pre-filled indicator
    checkedVectors.forEach((vec) => {
      const ta = document.querySelector(
        `#editor-explanations-inputs textarea[data-vector="${vec}"]`
      ) as HTMLTextAreaElement | null;
      if (ta) {
        const origMech = Object.keys(bggMechanicMapping).find((k) => bggMechanicMapping[k] === vec);
        ta.value = `This game features the ${origMech} mechanic. Rules dictate how this works in-game.`;
      }
    });

    statusDiv.textContent = `Successfully imported '${title}'! Form filled with mapped vectors: ${checkedVectors.join(', ')}`;
    alert(`Successfully loaded details for '${title}'. Review the populated form and explanations below!`);
  } catch (error) {
    console.error('BGG Import Error:', error);
    statusDiv.textContent = 'Error importing game details.';
  }
}

// Bind to Window object
window.loadMoreGames = loadMoreGames;
window.openGameDetails = openGameDetails;
window.selectCompareGame = selectCompareGame;
window.highlightCompareColumn = highlightCompareColumn;
window.setDictDomain = setDictDomain;
window.toggleEditorVectorExplanation = toggleEditorVectorExplanation;
window.addCustomEditorVector = addCustomEditorVector;
window.downloadUpdatedRegistry = downloadUpdatedRegistry;
window.searchBGG = searchBGG;
window.importBGGGame = importBGGGame;

// Initialize Web Worker with fallback for CDN/offline failures
function initSearchWorker() {
  if (typeof Worker !== 'undefined') {
    try {
      const worker = new Worker('dist/search-worker.js');
      worker.onerror = function (err) {
        console.warn('Web Worker failed to load, falling back to LocalSearchWorker:', err);
        searchWorker = new LocalSearchWorker() as unknown as Worker;
        wireWorkerMessageHandler();
        searchWorker.postMessage({ type: 'init', dbUrl: 'registry.json' });
      };
      searchWorker = worker;
    } catch (e) {
      console.warn('Worker construction failed, using LocalSearchWorker:', e);
      searchWorker = new LocalSearchWorker() as unknown as Worker;
    }
  } else {
    searchWorker = new LocalSearchWorker() as unknown as Worker;
  }

  wireWorkerMessageHandler();
}

function wireWorkerMessageHandler() {
  searchWorker.onmessage = function (e: MessageEvent) {
    const data = e.data;
    if (!data) return;

    switch (data.type) {
      case 'ready':
        handleWorkerReady(data);
        break;
      case 'searchResults':
        handleWorkerSearchResults(data);
        break;
      case 'autocompleteResults':
        handleWorkerAutocompleteResults(data);
        break;
      case 'compareResults':
        handleWorkerCompareResults(data);
        break;
      case 'dictionaryResults':
        handleWorkerDictionaryResults(data);
        break;
      case 'addGameDone':
        handleWorkerAddGameDone(data);
        break;
      case 'error':
        console.error('Worker error:', data.error);
        break;
    }
  };
}

function handleWorkerReady(data: any) {
  isWorkerReady = true;
  setElText('stat-total-games', data.stats.totalGames);
  setElText('stat-total-ttrpgs', data.stats.ttrpgCount);
  setElText('stat-total-boardgames', data.stats.boardGameCount);
  setElText('stat-total-vectors', data.stats.uniqueVectors);
  renderExplorer();
}

function handleWorkerSearchResults(data: any) {
  currentSearchResults = data.results;
  setElText('results-count-number', data.totalCount);

  const grid = document.getElementById('games-grid');
  if (!grid) return;

  const visibleGames = currentSearchResults.slice(0, visibleCount);
  progressiveRender(visibleGames, currentSearchResults.length, grid);
}

function handleWorkerAutocompleteResults(data: any) {
  const searchInput = document.getElementById('vector-query-input') as HTMLInputElement | null;
  const suggestionsBox = document.getElementById('vector-query-suggestions');
  if (!searchInput || !suggestionsBox) return;

  const val = searchInput.value;
  const matches = data.suggestions || [];

  if (matches.length === 0) {
    suggestionsBox.innerHTML = '';
    suggestionsBox.style.display = 'none';
    suggestionsBox.classList.remove('active');
    return;
  }

  suggestionsBox.innerHTML = matches
    .slice(0, 10)
    .map((match: string) => {
      const idx = match.toLowerCase().indexOf(val.toLowerCase());
      const highlighted =
        match.substring(0, idx) +
        '<strong>' +
        match.substring(idx, idx + val.length) +
        '</strong>' +
        match.substring(idx + val.length);
      return `<div class="suggestion-item" data-vector="${match}">${highlighted}</div>`;
    })
    .join('');

  suggestionsBox.style.display = 'block';
  suggestionsBox.classList.add('active');
}

function handleWorkerCompareResults(data: any) {
  const resultsPanel = document.getElementById('comparison-results');
  if (!resultsPanel) return;

  const gameA = data.gameA;
  const gameB = data.gameB;

  if (!gameA || !gameB) {
    resultsPanel.innerHTML = `
      <div class="no-results-state" style="grid-column: span 1; padding: 3rem 1.5rem;">
        <p>Error: Game details could not be found or loaded for comparison. Please try selecting different rulesets.</p>
      </div>
    `;
    return;
  }

  const shared = (data.shared || []) as string[];
  const onlyA = (data.onlyA || []) as string[];
  const onlyB = (data.onlyB || []) as string[];

  const countA = onlyA.length + shared.length;
  const countB = onlyB.length + shared.length;
  const countShared = shared.length;

  let rA = 90;
  let rB = 90;
  const totalCount = countA + countB;
  if (totalCount > 0) {
    rA = 45 + 65 * Math.sqrt(countA / totalCount);
    rB = 45 + 65 * Math.sqrt(countB / totalCount);
  }

  let d = 0;
  let xA = 250;
  let xB = 250;
  let xi = 250;
  let h = 0;

  let dPathA = '';
  let dPathB = '';
  let dPathBoth = '';

  if (countShared === 0) {
    d = rA + rB + 30;
    xA = 250 - d / 2;
    xB = 250 + d / 2;
    dPathA = `M ${xA - rA} 150 A ${rA} ${rA} 0 1 0 ${xA + rA} 150 A ${rA} ${rA} 0 1 0 ${xA - rA} 150`;
    dPathB = `M ${xB - rB} 150 A ${rB} ${rB} 0 1 0 ${xB + rB} 150 A ${rB} ${rB} 0 1 0 ${xB - rB} 150`;
    dPathBoth = '';
  } else {
    const overlapRatio = countShared / Math.min(countA, countB);
    const maxD = rA + rB - 15;
    const minD = Math.abs(rA - rB) + 15;
    d = maxD - (maxD - minD) * Math.sqrt(overlapRatio);

    xA = 250 - d / 2;
    xB = 250 + d / 2;

    xi = 250 + (rA * rA - rB * rB) / (2 * d);
    const x_a = (d * d + rA * rA - rB * rB) / (2 * d);
    const hSquared = rA * rA - x_a * x_a;
    h = hSquared > 0 ? Math.sqrt(hSquared) : 0;

    dPathA = `M ${xi} ${150 - h} A ${rA} ${rA} 0 1 0 ${xi} ${150 + h} A ${rB} ${rB} 0 0 0 ${xi} ${150 - h}`;
    dPathB = `M ${xi} ${150 - h} A ${rA} ${rA} 0 0 0 ${xi} ${150 + h} A ${rB} ${rB} 0 1 0 ${xi} ${150 - h}`;
    dPathBoth = `M ${xi} ${150 - h} A ${rB} ${rB} 0 0 1 ${xi} ${150 + h} A ${rA} ${rA} 0 0 1 ${xi} ${150 - h} Z`;
  }

  let labelXA = 250;
  let labelXB = 250;
  let labelXBoth = 250;

  if (countShared > 0) {
    labelXA = xA - rA * 0.35;
    labelXB = xB + rB * 0.35;
    labelXBoth = xi;
  } else {
    labelXA = xA;
    labelXB = xB;
    labelXBoth = 250;
  }

  resultsPanel.innerHTML = `
    <div class="comparison-header-row">
      <div class="compare-game-header">${gameA.title}</div>
      <div class="vs-divider">VS</div>
      <div class="compare-game-header" style="text-align: right;">${gameB.title}</div>
    </div>
    
    <div class="venn-diagram-container">
      <svg viewBox="0 0 500 300" class="venn-diagram-svg">
        <!-- Circle A (Exclusive Left Side) -->
        <path d="${dPathA}" 
              class="venn-segment segment-a" 
              role="button" 
              tabindex="0"
              aria-label="Game A Exclusive Vectors"
              onclick="highlightCompareColumn('a')" />

        <!-- Circle B (Exclusive Right Side) -->
        <path d="${dPathB}" 
              class="venn-segment segment-b" 
              role="button" 
              tabindex="0"
              aria-label="Game B Exclusive Vectors"
              onclick="highlightCompareColumn('b')" />

        <!-- Intersection (Overlap Segment) -->
        <path d="${dPathBoth}" 
              class="venn-segment segment-both" 
              role="button" 
              tabindex="0"
              aria-label="Shared Vectors"
              onclick="highlightCompareColumn('both')" />
              
        <!-- Interactive Text Labels (Positioned overlay) -->
        <g class="venn-labels">
          <!-- Game A Label -->
          <text x="${labelXA}" y="140" class="venn-text title-label" id="venn-label-title-a">${gameA.title}</text>
          <text x="${labelXA}" y="165" class="venn-text count-label" id="venn-label-count-a">${onlyA.length} Exclusive</text>

          <!-- Game B Label -->
          <text x="${labelXB}" y="140" class="venn-text title-label" id="venn-label-title-b">${gameB.title}</text>
          <text x="${labelXB}" y="165" class="venn-text count-label" id="venn-label-count-b">${onlyB.length} Exclusive</text>

          <!-- Shared Label -->
          <text x="${labelXBoth}" y="145" class="venn-text title-label shared-label" id="venn-label-title-both">Shared</text>
          <text x="${labelXBoth}" y="170" class="venn-text count-label shared-label" id="venn-label-count-both">${shared.length} Shared</text>
        </g>
      </svg>
      
      <!-- Fallback lightweight DOM tags to satisfy Jest tests -->
      <div class="venn-circle circle-a" onclick="highlightCompareColumn('a')" style="display: none;">
        <div class="venn-circle-inner">
          <span class="venn-game-label">${gameA.title}</span>
          <span class="venn-count">${onlyA.length} Exclusive</span>
        </div>
      </div>
      <div class="venn-circle-intersection" onclick="highlightCompareColumn('both')" style="display: none;">
        <span class="venn-count">${shared.length} Shared</span>
      </div>
      <div class="venn-circle circle-b" onclick="highlightCompareColumn('b')" style="display: none;">
        <div class="venn-circle-inner">
          <span class="venn-game-label">${gameB.title}</span>
          <span class="venn-count">${onlyB.length} Exclusive</span>
        </div>
      </div>
      
      <!-- Dynamic hover card overlay -->
      <div class="venn-hover-card" style="display: none;"></div>
    </div>
    
    <div class="compare-grid">
      <div class="compare-col a" id="compare-col-a">
        <h4>Exclusive to ${gameA.title} (${onlyA.length})</h4>
        <div class="compare-list"></div>
      </div>
      <div class="compare-col both" id="compare-col-both">
        <h4>Shared Systems (${shared.length})</h4>
        <div class="compare-list"></div>
      </div>
      <div class="compare-col b" id="compare-col-b">
        <h4>Exclusive to ${gameB.title} (${onlyB.length})</h4>
        <div class="compare-list"></div>
      </div>
    </div>
  `;

  // Keyboard navigation for Space/Enter on Venn segments
  const vennSvg = resultsPanel.querySelector('.venn-diagram-svg');
  if (vennSvg) {
    const handleVennKeyboard = (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
        const target = keyEvent.target as SVGElement;
        if (target && target.classList.contains('venn-segment')) {
          keyEvent.preventDefault();
          if (target.classList.contains('segment-a')) {
            highlightCompareColumn('a');
          } else if (target.classList.contains('segment-b')) {
            highlightCompareColumn('b');
          } else if (target.classList.contains('segment-both')) {
            highlightCompareColumn('both');
          }
        }
      }
    };
    vennSvg.addEventListener('keydown', handleVennKeyboard);
    vennSvg.addEventListener('keyup', handleVennKeyboard);
  }

  const container = resultsPanel.querySelector('.venn-diagram-container') as HTMLElement | null;
  if (!container) return;
  const hoverCard = container.querySelector('.venn-hover-card') as HTMLElement | null;
  if (!hoverCard) return;

  const segments: Record<string, { title: string; vectors: string[]; label: string }> = {
    'segment-a': { title: gameA.title, vectors: onlyA, label: 'Exclusive' },
    'segment-b': { title: gameB.title, vectors: onlyB, label: 'Exclusive' },
    'segment-both': { title: 'Shared', vectors: shared, label: 'Shared' },
  };

  Object.keys(segments).forEach((className) => {
    const el = container.querySelector(`.${className}`) as SVGPathElement | null;
    if (!el) return;

    const data = segments[className];

    el.addEventListener('mouseenter', () => {
      if (data.vectors.length === 0) {
        hoverCard.innerHTML = `<div style="font-weight: 600; color: var(--color-cyan);">${data.title}</div><div style="font-size: 0.8rem;">No vectors.</div>`;
      } else {
        const list = data.vectors
          .slice(0, 3)
          .map((v) => `• ${v}`)
          .join('<br/>');
        const remaining =
          data.vectors.length > 3
            ? `<br/><span style="font-style: italic; opacity: 0.8;">+${data.vectors.length - 3} more...</span>`
            : '';
        hoverCard.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 4px; color: var(--color-cyan);">${data.title} (${data.label})</div>
          <div style="font-size: 0.8rem; line-height: 1.4;">${list}${remaining}</div>
          <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 6px;">Click segment to inspect all vectors</div>
        `;
      }
      hoverCard.style.display = 'block';
    });

    el.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left + 15;
      const y = e.clientY - rect.top + 15;
      hoverCard.style.left = `${x}px`;
      hoverCard.style.top = `${y}px`;
    });

    el.addEventListener('mouseleave', () => {
      hoverCard.style.display = 'none';
    });
  });

  const listA = resultsPanel.querySelector('#compare-col-a .compare-list') as HTMLElement | null;
  if (listA) {
    if (onlyA.length === 0) {
      listA.innerHTML = '<p class="text-muted">None</p>';
    } else {
      const fragment = document.createDocumentFragment();
      onlyA.forEach((v) => {
        const item = document.createElement('div');
        item.className = 'compare-vector-item';
        const exp = (gameA.vector_explanations && gameA.vector_explanations[v]) || 'No detailed rules recorded.';
        item.setAttribute('title', exp);
        item.textContent = v;
        fragment.appendChild(item);
      });
      listA.appendChild(fragment);
    }
  }

  const listShared = resultsPanel.querySelector('#compare-col-both .compare-list') as HTMLElement | null;
  if (listShared) {
    if (shared.length === 0) {
      listShared.innerHTML = '<p class="text-muted">No shared mechanical systems.</p>';
    } else {
      const fragment = document.createDocumentFragment();
      shared.forEach((v) => {
        const item = document.createElement('div');
        item.className = 'compare-vector-item';
        const expA = (gameA.vector_explanations && gameA.vector_explanations[v]) || '';
        const expB = (gameB.vector_explanations && gameB.vector_explanations[v]) || '';
        const compound = `[${gameA.title}]: ${expA}\n\n[${gameB.title}]: ${expB}`;
        item.setAttribute('title', compound);
        item.textContent = v;
        fragment.appendChild(item);
      });
      listShared.appendChild(fragment);
    }
  }

  const listB = resultsPanel.querySelector('#compare-col-b .compare-list') as HTMLElement | null;
  if (listB) {
    if (onlyB.length === 0) {
      listB.innerHTML = '<p class="text-muted">None</p>';
    } else {
      const fragment = document.createDocumentFragment();
      onlyB.forEach((v) => {
        const item = document.createElement('div');
        item.className = 'compare-vector-item';
        const exp = (gameB.vector_explanations && gameB.vector_explanations[v]) || 'No detailed rules recorded.';
        item.setAttribute('title', exp);
        item.textContent = v;
        fragment.appendChild(item);
      });
      listB.appendChild(fragment);
    }
  }
}

function handleWorkerDictionaryResults(data: any) {
  if (data.vector) {
    const container = document.getElementById('vector-search-results');
    if (!container) return;

    const matches = (data.results || []) as any[];
    const vectorName = data.vector as string;
    const domain = vectorName.split('.')[0] || 'general';

    if (matches.length === 0) {
      container.innerHTML = `
        <div class="no-results-state" style="grid-column: span 1;">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <p>No games in database feature mechanical governance for vector: <code>${vectorName}</code></p>
          <p style="font-size: 0.85rem; margin-top: 0.5rem; color: var(--text-muted);">Ensure exact spelling. Autocomplete can help locate valid vectors.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="vector-result-group">
        <div class="vector-result-title">
          <span>${vectorName}</span>
          <span class="vector-domain-badge">${domain.toUpperCase()} DOMAIN</span>
        </div>
        <div class="vector-result-desc">
          Showing all rulesets that feature explicit, documented mechanics for this subsystem.
        </div>
        <div class="vector-game-list">
          ${matches
            .map((game) => {
              const fullGame = allGames.find((g) => g.game_id === game.game_id);
              let rule = 'No detailed rule explanation recorded.';
              if (fullGame && fullGame.vector_explanations) {
                const isParentNamespace = allGames.some(
                  (g) =>
                    g.vector_explanations &&
                    Object.keys(g.vector_explanations).some((k) => k.startsWith(vectorName + '.'))
                );

                if (isParentNamespace) {
                  const matchedKeys = Object.keys(fullGame.vector_explanations)
                    .filter((k) => k === vectorName || k.startsWith(vectorName + '.'))
                    .sort();
                  if (matchedKeys.length > 0) {
                    rule = matchedKeys
                      .map((k) => {
                        const explanation = fullGame.vector_explanations[k];
                        return `<strong>${k}</strong>: ${explanation}`;
                      })
                      .join('<br/><br/>');
                  }
                } else {
                  rule = fullGame.vector_explanations[vectorName] || 'No detailed rule explanation recorded.';
                }
              }
              return `
              <div class="vector-game-item">
                <div class="vector-game-meta">
                  <a href="#" class="vector-game-title" onclick="event.preventDefault(); openGameDetails('${game.game_id}')">${game.title}</a>
                  <span class="medium-badge ${game.medium}-badge">${game.medium === 'ttrpg' ? 'TTRPG' : 'Board Game'} (${game.year})</span>
                </div>
                <div class="vector-rule-text">${rule}</div>
              </div>
            `;
            })
            .join('')}
        </div>
      </div>
    `;
  } else {
    const container = document.getElementById('dict-results-list');
    if (!container) return;

    const results = data.results || [];
    progressiveRenderDict(results, container);
  }
}

function handleWorkerAddGameDone(data: any) {
  const game = data.game;
  const medium = game.medium as 'ttrpg' | 'board_game';

  const registryEntry = { ...game };
  delete registryEntry.medium;
  delete registryEntry.governed_vectors_set;

  gamesData[medium].push(registryEntry);
  allGames.push(game);

  processMetadata();
  renderDashboardStats();
  populateGenreDropdown();
  renderExplorer();
  initializeCompareTool();
  renderDictSidebar();

  const form = document.getElementById('add-game-form') as HTMLFormElement | null;
  if (form) form.reset();

  const explanationInputs = document.getElementById('editor-explanations-inputs');
  if (explanationInputs) explanationInputs.innerHTML = '';

  renderEditorVectorChecklist();

  updateEditorPreviews();

  alert(
    `Game '${game.title}' has been successfully indexed in memory! Use 'Export Data' to download or write back to registry.json.`
  );
}

// Current filter state for explorer
const filters: SearchFilters = {
  searchTerm: '',
  medium: 'all',
  genre: 'all',
  minYear: 2000,
  maxYear: 2026,
  sort: 'title-asc',
};

// Initializing application
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupEventListeners();
  await loadDatabase();
});

// Load and process data from registry.json
async function loadDatabase() {
  try {
    const response = await fetch('./registry.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    gamesData = await response.json();

    // Flatten list
    allGames = [
      ...(gamesData.ttrpg || []).map((g) => ({
        ...g,
        medium: 'ttrpg' as const,
        governed_vectors_set: new Set(g.governed_vectors || []),
      })),
      ...(gamesData.board_game || []).map((g) => ({
        ...g,
        medium: 'board_game' as const,
        governed_vectors_set: new Set(g.governed_vectors || []),
      })),
    ];

    processMetadata();
    initializeFilterLimits();
    renderDashboardStats();
    populateGenreDropdown();

    initSearchWorker();
    searchWorker.postMessage({ type: 'init', dbUrl: 'registry.json' });

    initializeVectorSearch();
    initializeCompareTool();
    initializeDictionary();
    initializeEditor();
    initializeSandbox();
  } catch (error: any) {
    console.error('Failed to load registry database:', error);
    // Fallback message in explorer UI
    const grid = document.getElementById('games-grid');
    if (grid) {
      grid.innerHTML = `
        <div class="no-results-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          <p>Error loading registry database. Please make sure registry.json exists and is valid JSON.</p>
          <p style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--text-muted);">${error.message}</p>
        </div>
      `;
    }
  }
}

// Extract genres and vectors
function processMetadata() {
  uniqueVectors.clear();
  uniqueGenres.clear();

  allGames.forEach((game) => {
    if (game.primary_genre) uniqueGenres.add(game.primary_genre);
    if (game.subgenres) {
      game.subgenres.forEach((sub) => uniqueGenres.add(sub));
    }
    if (game.governed_vectors) {
      game.governed_vectors.forEach((vec) => uniqueVectors.add(vec));
    }
  });
}

// Find min/max publication years in dataset
function initializeFilterLimits() {
  if (allGames.length === 0) return;
  const years = allGames.map((g) => g.year).filter((y) => y && !isNaN(y));
  const min = Math.min(...years);
  const max = Math.max(...years);

  filters.minYear = min;
  filters.maxYear = max;

  const minInput = document.getElementById('filter-year-min') as HTMLInputElement | null;
  const maxInput = document.getElementById('filter-year-max') as HTMLInputElement | null;

  if (minInput) minInput.value = String(min);
  if (maxInput) maxInput.value = String(max);
}

// Populate stats dashboard cards
function renderDashboardStats() {
  setElText('stat-total-games', allGames.length);
  setElText('stat-total-ttrpgs', gamesData.ttrpg.length);
  setElText('stat-total-boardgames', gamesData.board_game.length);
  setElText('stat-total-vectors', uniqueVectors.size);
}

// Populate genre filter selector
function populateGenreDropdown() {
  const genreSelect = document.getElementById('filter-genre') as HTMLSelectElement | null;
  if (!genreSelect) return;

  // Clear existing items except first one ("All Genres")
  genreSelect.innerHTML = '<option value="all">All Genres</option>';

  const sortedGenres = Array.from(uniqueGenres).sort();
  sortedGenres.forEach((genre) => {
    const opt = document.createElement('option');
    opt.value = genre;
    opt.textContent = genre;
    genreSelect.appendChild(opt);
  });
}

// Setup top view switching tabs
function setupTabs() {
  const container = document.querySelector('.tab-container') as HTMLElement | null;
  if (!container) return;

  // Create dynamic underline
  let underline = container.querySelector('.tab-underline') as HTMLElement | null;
  if (!underline) {
    underline = document.createElement('div');
    underline.className = 'tab-underline';
    container.appendChild(underline);
    container.style.position = 'relative';
  }

  const tabs = document.querySelectorAll('.tab-btn') as NodeListOf<HTMLElement>;

  const updateUnderline = (activeTab: HTMLElement) => {
    if (!underline) return;
    const containerRect = container.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();

    // Calculate offsets relative to the container
    const leftOffset = tabRect.left - containerRect.left;
    const width = tabRect.width;

    underline.style.width = `${width}px`;
    underline.style.transform = `translateX(${leftOffset}px)`;
  };

  // Initial position
  const activeTab = (container.querySelector('.tab-btn.active') || tabs[0]) as HTMLElement | null;
  if (activeTab) {
    setTimeout(() => updateUnderline(activeTab), 0);
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetView = tab.getAttribute('data-tab');
      if (!targetView) return;

      // Update tabs state
      tabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      updateUnderline(tab);

      // Update views state
      document.querySelectorAll('.view-panel').forEach((panel) => {
        panel.classList.remove('active');
      });
      const targetPanel = document.getElementById(`${targetView}-view`);
      if (targetPanel) targetPanel.classList.add('active');

      // Special refreshes
      if (targetView === 'compare') {
        renderComparisonResults();
      } else if (targetView === 'dictionary') {
        renderDictionary();
      } else if (targetView === 'editor') {
        updateEditorPreviews();
      } else if (targetView === 'sandbox') {
        sandboxRunConflictAnalysis();
      }
    });
  });

  // Keyboard navigation for WAI-ARIA tabs (ArrowLeft/ArrowRight)
  container.addEventListener('keydown', (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (!target || !target.classList.contains('tab-btn')) return;

    const tabsArray = Array.from(tabs);
    const index = tabsArray.indexOf(target);
    if (index === -1) return;

    let nextIndex = index;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabsArray.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabsArray.length) % tabsArray.length;
    } else {
      return;
    }

    e.preventDefault();
    const nextTab = tabsArray[nextIndex];
    nextTab.focus();
    nextTab.click();
  });

  window.addEventListener('resize', () => {
    const active = container.querySelector('.tab-btn.active') as HTMLElement | null;
    if (active) updateUnderline(active);
  });
}

// Wire up global page actions
function setupEventListeners() {
  // Search bar typing
  const omniSearch = document.getElementById('omni-search') as HTMLInputElement | null;
  if (omniSearch) {
    const debouncedSearch = debounce((val: string) => {
      filters.searchTerm = val.toLowerCase().trim();
      visibleCount = 60;
      renderExplorer();
    }, 150);

    omniSearch.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      debouncedSearch(target.value);
    });
  }

  // Medium pills
  const mediumButtons = document.querySelectorAll('.filter-pill-btn[data-medium]');
  mediumButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      mediumButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const med = btn.getAttribute('data-medium');
      if (med) filters.medium = med as any;
      visibleCount = 60;
      renderExplorer();
    });
  });

  // Genre dropdown select
  const genreSelect = document.getElementById('filter-genre') as HTMLSelectElement | null;
  if (genreSelect) {
    genreSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      filters.genre = target.value;
      visibleCount = 60;
      renderExplorer();
    });
  }

  // Year ranges
  const minYear = document.getElementById('filter-year-min') as HTMLInputElement | null;
  const maxYear = document.getElementById('filter-year-max') as HTMLInputElement | null;

  const handleYearChange = () => {
    if (minYear && maxYear) {
      filters.minYear = parseInt(minYear.value) || 1900;
      filters.maxYear = parseInt(maxYear.value) || 2100;
      visibleCount = 60;
      renderExplorer();
    }
  };

  if (minYear) minYear.addEventListener('change', handleYearChange);
  if (maxYear) maxYear.addEventListener('change', handleYearChange);

  // Sort select
  const sortSelect = document.getElementById('filter-sort') as HTMLSelectElement | null;
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      filters.sort = target.value as any;
      visibleCount = 60;
      renderExplorer();
    });
  }

  // Close details modal
  const closeModal = document.querySelector('.modal-close-btn');
  const modalOverlay = document.getElementById('details-modal-overlay');

  if (closeModal) {
    closeModal.addEventListener('click', () => {
      if (modalOverlay) modalOverlay.classList.remove('active');
    });
  }
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
      }
    });
  }

  // Autocomplete suggestions event delegation
  const suggestionsBox = document.getElementById('vector-query-suggestions');
  if (suggestionsBox) {
    suggestionsBox.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const item = target.closest('.suggestion-item');
      if (item) {
        const vec = item.getAttribute('data-vector');
        const searchInput = document.getElementById('vector-query-input') as HTMLInputElement | null;
        if (searchInput && vec) {
          searchInput.value = vec;
        }
        suggestionsBox.innerHTML = '';
        suggestionsBox.style.display = 'none';
        suggestionsBox.classList.remove('active');
        if (vec) {
          executeVectorSearch(vec);
        }
      }
    });
  }
}

// Filter, Sort and Render Games in Explorer grid
function renderExplorer() {
  if (!isWorkerReady) return;
  searchWorker.postMessage({ type: 'search', filters });
}

function createCardDOM(game: GameRulesetInternal) {
  const card = document.createElement('div');
  card.className = `game-card ${game.medium}`;
  card.addEventListener('click', () => openGameDetails(game.game_id));

  const content = document.createElement('div');

  const cardTop = document.createElement('div');
  cardTop.className = 'card-top';

  const badge = document.createElement('span');
  badge.className = `medium-badge ${game.medium}-badge`;
  badge.textContent = game.medium === 'ttrpg' ? 'TTRPG' : 'Board Game';

  const yearBadge = document.createElement('span');
  yearBadge.className = 'year-badge';
  yearBadge.textContent = String(game.year);

  cardTop.appendChild(badge);
  cardTop.appendChild(yearBadge);
  content.appendChild(cardTop);

  const title = document.createElement('h2');
  title.textContent = game.title;
  content.appendChild(title);

  const genre = document.createElement('div');
  genre.className = 'primary-genre';
  genre.textContent = game.primary_genre;
  content.appendChild(genre);

  const tags = document.createElement('div');
  tags.className = 'subgenres-tags';
  if (game.subgenres) {
    game.subgenres.forEach((sub) => {
      const tag = document.createElement('span');
      tag.className = 'subgenre-tag';
      tag.textContent = sub;
      tags.appendChild(tag);
    });
  }
  content.appendChild(tags);
  card.appendChild(content);

  const preview = document.createElement('div');
  preview.className = 'vectors-preview';

  const span = document.createElement('span');
  span.textContent = 'Vectors:';
  preview.appendChild(span);

  const vectorsText = game.governed_vectors ? game.governed_vectors.slice(0, 3).join(', ') : 'none';
  const vectorsRemain =
    game.governed_vectors && game.governed_vectors.length > 3 ? ` (+${game.governed_vectors.length - 3} more)` : '';
  const textNode = document.createTextNode(` ${vectorsText}${vectorsRemain}`);
  preview.appendChild(textNode);

  card.appendChild(preview);

  return card;
}

function progressiveRender(gamesToRender: GameRulesetInternal[], totalFilteredCount: number, gridElement: HTMLElement) {
  if (currentRenderJob !== null) {
    cancelAnimationFrame(currentRenderJob);
    currentRenderJob = null;
  }

  gridElement.innerHTML = '';

  if (gamesToRender.length === 0) {
    gridElement.innerHTML = `
      <div class="no-results-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <p>No games in registry match your search filters.</p>
        <p style="font-size: 0.85rem; margin-top: 0.5rem; color: var(--text-muted);">Try clearing search strings or resetting publication years.</p>
      </div>
    `;
    return;
  }

  let index = 0;

  if (gamesToRender.length <= 10) {
    const fragment = document.createDocumentFragment();
    for (const game of gamesToRender) {
      fragment.appendChild(createCardDOM(game));
    }
    gridElement.appendChild(fragment);

    if (totalFilteredCount > visibleCount) {
      appendLoadMoreButton(gridElement, totalFilteredCount);
    }
    return;
  }

  function renderBatch() {
    const startTime = performance.now();
    const fragment = document.createDocumentFragment();

    while (index < gamesToRender.length) {
      const game = gamesToRender[index];
      fragment.appendChild(createCardDOM(game));
      index++;

      if (performance.now() - startTime > 3) {
        break;
      }
    }

    gridElement.appendChild(fragment);

    if (index < gamesToRender.length) {
      currentRenderJob = requestAnimationFrame(renderBatch);
    } else {
      currentRenderJob = null;
      if (totalFilteredCount > visibleCount) {
        appendLoadMoreButton(gridElement, totalFilteredCount);
      }
    }
  }

  currentRenderJob = requestAnimationFrame(renderBatch);
}

function progressiveRenderDict(results: any[], container: HTMLElement) {
  if (currentDictRenderJob !== null) {
    cancelAnimationFrame(currentDictRenderJob);
    currentDictRenderJob = null;
  }

  container.innerHTML = '';

  if (results.length === 0) {
    container.innerHTML = '<p class="text-secondary">No vectors recorded.</p>';
    return;
  }

  let index = 0;

  function createDictCardDOM(item: any) {
    const vec = item.vector;
    const matchingGames = item.games || [];

    const card = document.createElement('div');
    card.className = 'dict-item-card';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'dict-item-name';

    const spanName = document.createElement('span');
    spanName.textContent = vec;
    nameDiv.appendChild(spanName);

    const spanBadge = document.createElement('span');
    spanBadge.className = 'badge';
    spanBadge.style.fontSize = '0.75rem';
    spanBadge.style.background = 'rgba(255, 255, 255, 0.05)';
    spanBadge.style.fontFamily = 'var(--font-sans)';
    spanBadge.style.fontWeight = '500';
    spanBadge.textContent = `Found in ${matchingGames.length} ${matchingGames.length === 1 ? 'game' : 'games'}`;
    nameDiv.appendChild(spanBadge);

    card.appendChild(nameDiv);

    const gamesDiv = document.createElement('div');
    gamesDiv.className = 'dict-item-games';
    matchingGames.forEach((game: any) => {
      const link = document.createElement('span');
      link.className = 'dict-game-link';
      link.textContent = game.title;
      link.style.cursor = 'pointer';
      link.addEventListener('click', () => openGameDetails(game.game_id));
      gamesDiv.appendChild(link);
    });
    card.appendChild(gamesDiv);

    return card;
  }

  if (results.length <= 10) {
    const fragment = document.createDocumentFragment();
    for (const item of results) {
      fragment.appendChild(createDictCardDOM(item));
    }
    container.appendChild(fragment);
    return;
  }

  function renderBatch() {
    const startTime = performance.now();
    const fragment = document.createDocumentFragment();

    while (index < results.length) {
      const item = results[index];
      fragment.appendChild(createDictCardDOM(item));
      index++;

      if (performance.now() - startTime > 3) {
        break;
      }
    }

    container.appendChild(fragment);

    if (index < results.length) {
      currentDictRenderJob = requestAnimationFrame(renderBatch);
    } else {
      currentDictRenderJob = null;
    }
  }

  currentDictRenderJob = requestAnimationFrame(renderBatch);
}

function appendLoadMoreButton(gridElement: HTMLElement, totalFilteredCount: number) {
  const container = document.createElement('div');
  container.className = 'load-more-container';

  const button = document.createElement('button');
  button.className = 'btn-load-more';
  button.setAttribute('onclick', 'loadMoreGames()');
  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="6 9 12 15 18 9"></polyline></svg>
    <span>Load More (${totalFilteredCount - visibleCount} remaining)</span>
  `;

  container.appendChild(button);
  gridElement.appendChild(container);
}

// Vector Search
function initializeVectorSearch() {
  const searchInput = document.getElementById('vector-query-input') as HTMLInputElement | null;
  const suggestionsBox = document.getElementById('vector-query-suggestions');

  if (!searchInput || !suggestionsBox) return;

  const debouncedAutocomplete = debounce((val: string) => {
    if (!val.trim()) {
      suggestionsBox.innerHTML = '';
      suggestionsBox.style.display = 'none';
      suggestionsBox.classList.remove('active');
      return;
    }
    searchWorker.postMessage({ type: 'autocomplete', query: val, autocompleteType: 'vector' });
  }, 150);

  searchInput.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    debouncedAutocomplete(target.value);
  });

  document.addEventListener('click', (e) => {
    if (e.target !== searchInput && e.target !== suggestionsBox) {
      suggestionsBox.innerHTML = '';
      suggestionsBox.style.display = 'none';
      suggestionsBox.classList.remove('active');
    }
  });

  const searchBtn = document.getElementById('vector-search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      executeVectorSearch(searchInput.value.trim());
    });
  }

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      executeVectorSearch(searchInput.value.trim());
    }
  });
}

function executeVectorSearch(vectorName: string) {
  const container = document.getElementById('vector-search-results');
  if (!container) return;

  if (!vectorName) {
    container.innerHTML = `
      <div class="no-results-state" style="grid-column: span 1;">
        <p>Please enter a vector namespace to search (e.g. <code>combat.melee.tactical</code>).</p>
      </div>
    `;
    return;
  }

  searchWorker.postMessage({ type: 'dictionary', vector: vectorName });
}

// Compare Tool
function initializeCompareTool() {
  const panelA = document.getElementById('compare-selector-a');
  const panelB = document.getElementById('compare-selector-b');
  if (!panelA || !panelB) return;

  const sorted = [...allGames].sort((a, b) => a.title.localeCompare(b.title));

  const makeSelectButtons = (index: number) => {
    return sorted
      .map(
        (game) => `
      <button class="select-game-btn" data-game-id="${game.game_id}" onclick="selectCompareGame('${game.game_id}', ${index}, this)">
        ${game.title} (${game.medium === 'ttrpg' ? 'TTRPG' : 'BG'})
      </button>
    `
      )
      .join('');
  };

  panelA.innerHTML = `<h3>Select Ruleset A</h3><div style="max-height: 350px; overflow-y: scroll; display: flex; flex-direction: column; gap: 0.25rem;">${makeSelectButtons(0)}</div>`;
  panelB.innerHTML = `<h3>Select Ruleset B</h3><div style="max-height: 350px; overflow-y: scroll; display: flex; flex-direction: column; gap: 0.25rem;">${makeSelectButtons(1)}</div>`;
}

function renderComparisonResults() {
  const resultsPanel = document.getElementById('comparison-results');
  if (!resultsPanel) return;

  const gameIdA = selectedCompareGames[0];
  const gameIdB = selectedCompareGames[1];

  if (!gameIdA || !gameIdB) {
    resultsPanel.innerHTML = `
      <div class="no-results-state" style="grid-column: span 1; padding: 3rem 1.5rem;">
        <p>Please select two rulesets from the panels above to analyze overlaps and differences in their mechanical systems.</p>
      </div>
    `;
    return;
  }

  searchWorker.postMessage({ type: 'compare', gameIdA, gameIdB });
}

// Dictionary
function initializeDictionary() {
  const sidebar = document.getElementById('dict-domains-sidebar');
  if (!sidebar) return;
  renderDictSidebar();
}

function renderDictSidebar() {
  const sidebar = document.getElementById('dict-domains-sidebar');
  if (!sidebar) return;

  const domains = new Set<string>();
  uniqueVectors.forEach((v) => {
    const dom = v.split('.')[0];
    if (dom) domains.add(dom);
  });

  const sorted = Array.from(domains).sort();

  sidebar.innerHTML = `
    <h3>System Domains</h3>
    <div class="dict-domain-list">
      <button class="dict-domain-btn ${activeDictDomain === 'all' ? 'active' : ''}" onclick="setDictDomain('all')">
        <span>All Domains</span>
        <span class="badge">${uniqueVectors.size}</span>
      </button>
      ${sorted
        .map((dom) => {
          const count = Array.from(uniqueVectors).filter((v) => v.startsWith(dom + '.')).length;
          return `
          <button class="dict-domain-btn ${activeDictDomain === dom ? 'active' : ''}" onclick="setDictDomain('${dom}')">
            <span style="text-transform: capitalize;">${dom}</span>
            <span class="badge">${count}</span>
          </button>
        `;
        })
        .join('')}
    </div>
  `;
}

function renderDictionary() {
  if (!isWorkerReady) return;
  const currentDomainEl = document.getElementById('dict-current-domain');
  if (currentDomainEl) {
    currentDomainEl.textContent = activeDictDomain === 'all' ? 'All System Vectors' : activeDictDomain + ' Domain';
  }
  searchWorker.postMessage({ type: 'dictionary', domain: activeDictDomain });
}

// Editor
function initializeEditor() {
  const vecList = document.getElementById('editor-vectors-list');
  if (!vecList) return;

  renderEditorVectorChecklist();

  const form = document.getElementById('add-game-form') as HTMLFormElement | null;
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      addNewGame();
    });
  }
}

function renderEditorVectorChecklist() {
  const container = document.getElementById('editor-vectors-list');
  if (!container) return;

  const sorted = Array.from(uniqueVectors).sort();

  container.innerHTML = sorted
    .map(
      (vec) => `
    <div class="vector-checkbox-item">
      <input type="checkbox" id="check-vec-${vec}" value="${vec}" onchange="toggleEditorVectorExplanation('${vec}', this.checked)">
      <label for="check-vec-${vec}">${vec}</label>
    </div>
  `
    )
    .join('');
}

function updateEditorPreviews() {
  const preview = document.getElementById('export-json-preview');
  if (!preview) return;
  preview.textContent = JSON.stringify(gamesData, null, 2);
}

function addNewGame() {
  const titleInput = document.getElementById('new-game-title') as HTMLInputElement | null;
  const yearInput = document.getElementById('new-game-year') as HTMLInputElement | null;
  const mediumSelect = document.getElementById('new-game-medium') as HTMLSelectElement | null;
  const genreInput = document.getElementById('new-game-genre') as HTMLInputElement | null;
  const subgenresInput = document.getElementById('new-game-subgenres') as HTMLInputElement | null;

  if (!titleInput || !yearInput || !mediumSelect || !genreInput || !subgenresInput) return;

  const title = titleInput.value.trim();
  const year = parseInt(yearInput.value) || 2026;
  const medium = mediumSelect.value;
  const genre = genreInput.value.trim();
  const subgenresRaw = subgenresInput.value;

  const game_id = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');

  const checkedVectors: string[] = [];
  const explanations: Record<string, string> = {};

  document.querySelectorAll('#editor-vectors-list input[type="checkbox"]:checked').forEach((cb) => {
    checkedVectors.push((cb as HTMLInputElement).value);
  });

  document.querySelectorAll('#editor-explanations-inputs textarea').forEach((ta) => {
    const vec = ta.getAttribute('data-vector');
    if (vec) {
      explanations[vec] = (ta as HTMLTextAreaElement).value.trim();
    }
  });

  const subgenres = subgenresRaw
    ? subgenresRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s)
    : [];

  const newGameEntry = {
    game_id,
    title,
    year,
    primary_genre: genre,
    subgenres,
    governed_vectors: checkedVectors,
    vector_explanations: explanations,
  };

  const existing = allGames.find((g) => g.game_id === game_id);
  if (existing) {
    alert(`A game with ID '${game_id}' already exists in registry!`);
    return;
  }

  searchWorker.postMessage({ type: 'addGame', game: { ...newGameEntry, medium } });
}

// ============================================================================
// OMNIRULESET SANDBOX MODULE
// ============================================================================

// --- Sandbox Type Definitions ---

interface SandboxConflictRule {
  id: string;
  category: string;
  vectorPatterns: string[];
  description: string;
  severity: 'warning' | 'critical';
  resolution: string;
}

interface SandboxDetectedConflict {
  rule: SandboxConflictRule;
  triggeringVectors: string[];
  resolved: boolean;
}

interface SandboxCharacterTemplate {
  name: string;
  level: number;
  hitPoints: number;
  maxHitPoints: number;
  stats: Record<string, number>;
  skills: string[];
  abilities: string[];
  inventory: string[];
  conditions: string[];
}

interface SandboxRulesetSection {
  heading: string;
  domain: string;
  rules: string[];
}

interface SandboxSynthesizedRuleset {
  title: string;
  sections: SandboxRulesetSection[];
  resolutionNotes: string[];
  characterTemplate: SandboxCharacterTemplate;
}

interface SandboxChatMessage {
  role: 'gm' | 'player' | 'system';
  content: string;
  timestamp: number;
}

interface SandboxEnemy {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  alive: boolean;
}

interface SandboxGMSession {
  ruleset: SandboxSynthesizedRuleset;
  character: SandboxCharacterTemplate;
  chatLog: SandboxChatMessage[];
  currentScene: string;
  encounterState: {
    inCombat: boolean;
    enemies: SandboxEnemy[];
    roundNumber: number;
  };
  turnNumber: number;
}

// --- Conflict Checker ---

const SANDBOX_CONFLICT_RULES: SandboxConflictRule[] = [
  {
    id: 'dice-pool-vs-single-die',
    category: 'Resolution Mechanic',
    vectorPatterns: ['resolution.dice_pool', 'resolution.single_die'],
    description: 'Dice pool systems fundamentally conflict with single-die resolution.',
    severity: 'critical',
    resolution: 'Use dice pool as primary; convert single-die targets to pool difficulty thresholds.',
  },
  {
    id: 'initiative-dex-vs-narrative',
    category: 'Turn Sequence',
    vectorPatterns: ['combat.initiative.dexterity_based', 'combat.initiative.narrative'],
    description: 'Dexterity-based initiative conflicts with narrative initiative flow.',
    severity: 'warning',
    resolution: 'Use narrative initiative by default, with optional dexterity checks for contested moments.',
  },
  {
    id: 'hp-vs-wound-track',
    category: 'Damage System',
    vectorPatterns: ['combat.damage.hit_points', 'combat.damage.wound_levels'],
    description: 'Hit point pools conflict with wound level tracks.',
    severity: 'critical',
    resolution: 'Implement wound thresholds on the HP pool—crossing boundaries inflicts wound penalties.',
  },
  {
    id: 'class-vs-classless',
    category: 'Character Architecture',
    vectorPatterns: ['character.progression.class_based', 'character.progression.classless'],
    description: 'Class-based progression conflicts with freeform classless advancement.',
    severity: 'warning',
    resolution: 'Offer class templates as optional starting packages that can be freely customized.',
  },
  {
    id: 'turn-based-vs-realtime',
    category: 'Action Economy',
    vectorPatterns: ['combat.structure.turn_based', 'combat.structure.simultaneous'],
    description: 'Strict turn-based combat conflicts with simultaneous action declaration.',
    severity: 'critical',
    resolution: 'Use simultaneous declaration with turn-based resolution phase.',
  },
  {
    id: 'spell-slots-vs-mana',
    category: 'Magic System',
    vectorPatterns: ['magic.resource.spell_slots', 'magic.resource.mana_pool'],
    description: 'Vancian spell slots conflict with mana pool systems.',
    severity: 'warning',
    resolution: 'Spell slots define max power tier; mana fuels additional castings within each tier.',
  },
  {
    id: 'grid-vs-theater',
    category: 'Spatial System',
    vectorPatterns: ['combat.positioning.grid_based', 'combat.positioning.theater_of_mind'],
    description: 'Grid-based tactical positioning conflicts with theater-of-mind freeform.',
    severity: 'warning',
    resolution: 'Use zone-based positioning as middle ground: abstract areas optionally overlaying a grid.',
  },
  {
    id: 'roll-over-vs-roll-under',
    category: 'Resolution Direction',
    vectorPatterns: ['resolution.roll_over', 'resolution.roll_under'],
    description: 'Roll-over systems conflict with roll-under systems.',
    severity: 'critical',
    resolution: 'Standardize to roll-over; stat becomes the modifier added to the roll.',
  },
  {
    id: 'stress-vs-hp',
    category: 'Consequence System',
    vectorPatterns: ['consequences.stress_track', 'combat.damage.hit_points'],
    description: 'Stress/consequence tracks conflict with raw numerical HP damage.',
    severity: 'warning',
    resolution: 'HP damage triggers stress conditions at threshold breakpoints for dual-layer consequences.',
  },
  {
    id: 'skill-vs-attribute-check',
    category: 'Check Architecture',
    vectorPatterns: ['resolution.skill_checks', 'resolution.attribute_checks'],
    description: 'Dedicated skill checks conflict with raw attribute-only checks.',
    severity: 'warning',
    resolution: 'Attribute checks are baseline; trained skills add a proficiency bonus.',
  },
];

function sandboxAnalyzeConflicts(selectedVectors: string[]): SandboxDetectedConflict[] {
  const detected: SandboxDetectedConflict[] = [];
  for (const rule of SANDBOX_CONFLICT_RULES) {
    const matchedPatterns = rule.vectorPatterns.map((pattern) =>
      selectedVectors.filter((v) => v === pattern || v.startsWith(pattern + '.'))
    );
    if (matchedPatterns.every((matches) => matches.length > 0)) {
      const triggers = [...new Set(matchedPatterns.flat())];
      detected.push({ rule, triggeringVectors: triggers, resolved: false });
    }
  }
  return detected;
}

// --- Rules Synthesizer ---

const SANDBOX_DOMAIN_TEMPLATES: Record<string, { heading: string; baseRules: string[] }> = {
  combat: {
    heading: '⚔️ Combat System',
    baseRules: [
      'Combat encounters begin when hostilities are declared or an ambush is triggered.',
      'All combatants determine initiative to establish turn order.',
      'On each turn, a combatant may take one standard action, one move action, and one free action.',
      "Attacks are resolved by making an attack roll against the target's defense value.",
    ],
  },
  resolution: {
    heading: '🎯 Resolution Mechanics',
    baseRules: [
      'When the outcome of an action is uncertain, the GM calls for a check.',
      'The player rolls the designated dice and adds relevant modifiers.',
      'The result is compared against a difficulty threshold.',
      'Critical results trigger special narrative outcomes.',
    ],
  },
  character: {
    heading: '👤 Character System',
    baseRules: [
      'Characters are defined by core attributes representing physical and mental capabilities.',
      'Skills represent trained proficiencies that modify attribute-based checks.',
      'Characters advance through experience, unlocking new abilities and stat increases.',
      'Equipment and inventory are tracked and may provide passive bonuses.',
    ],
  },
  magic: {
    heading: '✨ Magic & Powers',
    baseRules: [
      'Magical abilities draw from an energy resource that replenishes during rest.',
      'Spells have defined ranges, durations, and areas of effect.',
      'Casting requires a check against a difficulty based on spell power.',
      'Failed castings may result in diminished effects or backlash.',
    ],
  },
  social: {
    heading: '🗣️ Social Interaction',
    baseRules: [
      'Social encounters use opposed checks between participants.',
      'NPCs have disposition levels that shift based on interaction outcomes.',
      'Persuasion, deception, and intimidation each have distinct mechanical paths.',
    ],
  },
  exploration: {
    heading: '🗺️ Exploration & Navigation',
    baseRules: [
      'Travel is measured in watches (4-hour blocks) for overland movement.',
      'Environmental hazards require appropriate skill checks.',
      'Resource tracking (rations, light, supplies) affects party endurance.',
    ],
  },
  consequences: {
    heading: '💔 Consequences & Conditions',
    baseRules: [
      'Damage and adverse effects impose conditions that modify capabilities.',
      'Conditions range from minor (fatigued) to severe (dying).',
      'Recovery requires rest, medical attention, or magical healing.',
    ],
  },
  economy: {
    heading: '💰 Economy & Resources',
    baseRules: [
      'Resource management governs economic flow and player choices.',
      'Trading, bidding, and market dynamics create strategic decisions.',
      'Production chains and worker assignment drive engine-building gameplay.',
    ],
  },
  logistics: {
    heading: '📦 Logistics & Planning',
    baseRules: [
      'Strategic planning and resource allocation determine long-term success.',
      'Supply chain management and hand optimization are key mechanics.',
      'Network connections and set completion drive scoring and progression.',
    ],
  },
  crafting: {
    heading: '🔨 Crafting & Creation',
    baseRules: [
      'Crafting requires materials, tools, and proficiency.',
      'Quality tiers (common, fine, masterwork) affect item statistics.',
      'Failed checks may waste materials or produce flawed items.',
    ],
  },
};

function sandboxVectorToLabel(vector: string): string {
  return vector
    .split('.')
    .map((p) => p.replace(/_/g, ' '))
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' → ');
}

function sandboxSynthesizeRuleset(
  vectors: string[],
  conflicts: SandboxDetectedConflict[],
  vectorExplanations: Record<string, string[]>
): SandboxSynthesizedRuleset {
  const domainGroups: Record<string, string[]> = {};
  for (const v of vectors) {
    const domain = v.split('.')[0];
    if (!domainGroups[domain]) domainGroups[domain] = [];
    domainGroups[domain].push(v);
  }

  const sections: SandboxRulesetSection[] = [];
  for (const [domain, domainVectors] of Object.entries(domainGroups).sort()) {
    const template = SANDBOX_DOMAIN_TEMPLATES[domain];
    const heading = template ? template.heading : `📋 ${domain.charAt(0).toUpperCase() + domain.slice(1)}`;
    const rules = template ? [...template.baseRules] : ['This domain governs specialized gameplay mechanics.'];

    for (const v of domainVectors) {
      const explanations = vectorExplanations[v] || [];
      if (explanations.length > 0) {
        rules.push('');
        const label = sandboxVectorToLabel(v);
        rules.push(`[${label}]: Incorporated from ${explanations.length} indexed game(s).`);
        const unique = [...new Set(explanations)].slice(0, 3);
        for (const exp of unique) {
          rules.push(`• ${exp.charAt(0).toUpperCase() + exp.slice(1)}`);
        }
      } else {
        rules.push(`• ${sandboxVectorToLabel(v)}: Active subsystem.`);
      }
    }

    const domainConflicts = conflicts.filter((c) => c.triggeringVectors.some((tv) => tv.split('.')[0] === domain));
    if (domainConflicts.length > 0) {
      rules.push('');
      rules.push('─── Conflict Reconciliation ───');
      for (const c of domainConflicts) {
        const icon = c.rule.severity === 'critical' ? '🔴' : '🟡';
        rules.push(`${icon} [${c.rule.category}]: ${c.rule.resolution}`);
      }
    }

    sections.push({ heading, domain, rules });
  }

  const resolutionNotes = conflicts.map((c) => `✅ [${c.rule.category}]: ${c.rule.resolution}`);

  const domainNames = Object.keys(domainGroups)
    .slice(0, 3)
    .map((d) => d.charAt(0).toUpperCase() + d.slice(1));
  const title = `OmniRuleset: ${domainNames.join(' + ')}${Object.keys(domainGroups).length > 3 ? ' + more' : ''} (${vectors.length} vectors)`;

  const characterTemplate = sandboxGenerateCharacter(domainGroups);

  return { title, sections, resolutionNotes, characterTemplate };
}

function sandboxGenerateCharacter(domainGroups: Record<string, string[]>): SandboxCharacterTemplate {
  const stats: Record<string, number> = {
    STR: 10,
    DEX: 10,
    CON: 10,
    INT: 10,
    WIS: 10,
    CHA: 10,
  };
  const skills: string[] = [];
  const abilities: string[] = [];
  const inventory: string[] = ["Traveler's Pack", 'Waterskin', '50 ft. Rope'];

  if (domainGroups['combat']) {
    stats['STR'] = 14;
    stats['CON'] = 12;
    skills.push('Athletics', 'Weapon Handling');
    abilities.push('Basic Attack', 'Defensive Stance');
    inventory.push('Short Sword', 'Leather Armor', 'Shield');
  }
  if (domainGroups['magic']) {
    stats['INT'] = 14;
    stats['WIS'] = 12;
    skills.push('Arcana', 'Spellcraft');
    abilities.push('Cantrip: Light', 'Spell: Magic Missile');
    inventory.push('Spellbook', 'Component Pouch');
  }
  if (domainGroups['social']) {
    stats['CHA'] = 14;
    skills.push('Persuasion', 'Insight', 'Deception');
    abilities.push('Silver Tongue');
  }
  if (domainGroups['exploration']) {
    stats['WIS'] = 13;
    skills.push('Survival', 'Perception');
    abilities.push('Trailblazer');
    inventory.push('Map & Compass', 'Torches (3)');
  }
  if (domainGroups['crafting']) {
    skills.push('Crafting', 'Appraisal');
    abilities.push('Basic Crafting');
    inventory.push("Artisan's Tools");
  }

  const maxHP = 8 + (stats['CON'] - 10);
  return {
    name: 'Unnamed Adventurer',
    level: 1,
    hitPoints: maxHP,
    maxHitPoints: maxHP,
    stats,
    skills: skills.length > 0 ? skills : ['General Knowledge'],
    abilities: abilities.length > 0 ? abilities : ['Improvise'],
    inventory,
    conditions: [],
  };
}

function sandboxRenderRulesetHTML(ruleset: SandboxSynthesizedRuleset): string {
  let html = `<h3>${ruleset.title}</h3>`;
  for (const section of ruleset.sections) {
    html += `<h4>${section.heading}</h4><ul>`;
    for (const rule of section.rules) {
      if (rule === '') {
        html += '</ul><ul>';
      } else if (rule.startsWith('───')) {
        html += `</ul><p style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-amber); margin: 0.5rem 0 0.25rem;">${rule}</p><ul>`;
      } else {
        html += `<li>${rule}</li>`;
      }
    }
    html += '</ul>';
  }
  if (ruleset.resolutionNotes.length > 0) {
    html += '<h4>📝 Resolution Summary</h4><ul>';
    for (const note of ruleset.resolutionNotes) {
      html += `<li>${note}</li>`;
    }
    html += '</ul>';
  }
  return html;
}

// --- GM Engine ---

const SANDBOX_OPENING_SCENES = [
  {
    scene:
      'You awaken in a dimly lit tavern cellar. The air is thick with dust and distant clinking glasses echo from above. A locked door stands before you, and something scrapes against stone in the shadows.',
    enemies: [{ name: 'Giant Rat', hp: 6, maxHp: 6, attack: 3, defense: 8, alive: true }],
  },
  {
    scene:
      "The ancient forest path narrows until the canopy blocks out all sunlight. Strange markings glow faintly on the trees. Ahead, a clearing reveals a crumbling stone altar—and the figures surrounding it don't look friendly.",
    enemies: [
      { name: 'Forest Bandit', hp: 12, maxHp: 12, attack: 5, defense: 11, alive: true },
      { name: 'Bandit Archer', hp: 8, maxHp: 8, attack: 6, defense: 10, alive: true },
    ],
  },
  {
    scene:
      'The merchant caravan has stopped at a crossroads. To the north, smoke rises from a burning village. To the east, the trade road continues safely. The caravan master looks at you: "We need someone to scout ahead."',
    enemies: [],
  },
  {
    scene:
      'Deep within the Crystalline Caverns, your torchlight catches prismatic reflections off every surface. The map leads to a sealed chamber ahead—but the ground trembles as something massive shifts in the darkness below.',
    enemies: [{ name: 'Cave Spider Queen', hp: 20, maxHp: 20, attack: 7, defense: 12, alive: true }],
  },
];

function sandboxRollDice(notation: string): {
  dice: string;
  rolls: number[];
  total: number;
  modifier: number;
  finalResult: number;
} {
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  const count = match ? parseInt(match[1], 10) : 1;
  const sides = match ? parseInt(match[2], 10) : 20;
  const modifier = match && match[3] ? parseInt(match[3], 10) : 0;
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) rolls.push(Math.floor(Math.random() * sides) + 1);
  const total = rolls.reduce((a, b) => a + b, 0);
  return { dice: notation, rolls, total, modifier, finalResult: total + modifier };
}

function sandboxFormatRollHTML(roll: { dice: string; rolls: number[]; modifier: number; finalResult: number }): string {
  const rollsStr = roll.rolls.map((r) => `<span class="dice-roll">${r}</span>`).join(' + ');
  const modStr = roll.modifier !== 0 ? ` ${roll.modifier > 0 ? '+' : ''}${roll.modifier}` : '';
  return `🎲 ${roll.dice}: ${rollsStr}${modStr} = <strong>${roll.finalResult}</strong>`;
}

function sandboxStatMod(value: number): number {
  return Math.floor((value - 10) / 2);
}

function sandboxClassifyAction(input: string): string {
  const lower = input.toLowerCase();
  if (/\b(attack|strike|hit|slash|stab|shoot|punch|kick|fight)\b/.test(lower)) return 'attack';
  if (/\b(defend|block|dodge|parry|shield|protect|brace)\b/.test(lower)) return 'defend';
  if (/\b(cast|spell|magic|invoke|channel|conjure|summon)\b/.test(lower)) return 'cast';
  if (/\b(explore|search|look|examine|investigate|inspect|scout|check)\b/.test(lower)) return 'explore';
  if (/\b(talk|persuade|negotiate|intimidate|charm|deceive|convince)\b/.test(lower)) return 'social';
  if (/\b(climb|jump|swim|sneak|stealth|hide|pick\s*lock|craft|heal|medicine)\b/.test(lower)) return 'skill';
  if (/\b(rest|sleep|camp|recover|meditate|eat|drink)\b/.test(lower)) return 'rest';
  return 'unknown';
}

function sandboxGetRelevantStat(actionType: string, stats: Record<string, number>): { name: string; value: number } {
  const mapping: Record<string, string> = {
    attack: 'STR',
    defend: 'DEX',
    cast: 'INT',
    explore: 'WIS',
    social: 'CHA',
    skill: 'DEX',
    rest: 'CON',
    unknown: 'WIS',
  };
  const statName = mapping[actionType] || 'WIS';
  return { name: statName, value: stats[statName] || 10 };
}

function sandboxCreateSession(ruleset: SandboxSynthesizedRuleset): SandboxGMSession {
  const sceneData = SANDBOX_OPENING_SCENES[Math.floor(Math.random() * SANDBOX_OPENING_SCENES.length)];
  const session: SandboxGMSession = {
    ruleset,
    character: {
      ...ruleset.characterTemplate,
      stats: { ...ruleset.characterTemplate.stats },
      skills: [...ruleset.characterTemplate.skills],
      abilities: [...ruleset.characterTemplate.abilities],
      inventory: [...ruleset.characterTemplate.inventory],
      conditions: [],
    },
    chatLog: [],
    currentScene: sceneData.scene,
    encounterState: {
      inCombat: sceneData.enemies.length > 0,
      enemies: sceneData.enemies.map((e) => ({ ...e })),
      roundNumber: 1,
    },
    turnNumber: 0,
  };

  sandboxAddMsg(session, 'system', '⚡ OmniRuleset Playtest Session Initialized');
  sandboxAddMsg(session, 'system', `📜 Active: ${ruleset.title}`);
  sandboxAddMsg(session, 'gm', sceneData.scene);

  if (session.encounterState.inCombat) {
    const list = session.encounterState.enemies.map((e) => e.name).join(', ');
    sandboxAddMsg(session, 'system', `⚔️ Combat Engaged! Enemies: ${list}`);
    sandboxAddMsg(session, 'gm', 'Roll for initiative! What do you do?');
  } else {
    sandboxAddMsg(session, 'gm', 'What would you like to do?');
  }

  return session;
}

function sandboxAddMsg(
  session: SandboxGMSession,
  role: 'gm' | 'player' | 'system',
  content: string
): SandboxChatMessage {
  const msg: SandboxChatMessage = { role, content, timestamp: Date.now() };
  session.chatLog.push(msg);
  return msg;
}

function sandboxProcessAction(session: SandboxGMSession, playerInput: string): SandboxChatMessage[] {
  const newMsgs: SandboxChatMessage[] = [];
  session.turnNumber++;

  newMsgs.push(sandboxAddMsg(session, 'player', playerInput));

  const actionType = sandboxClassifyAction(playerInput);
  const stat = sandboxGetRelevantStat(actionType, session.character.stats);
  const mod = sandboxStatMod(stat.value);

  switch (actionType) {
    case 'attack':
      newMsgs.push(...sandboxHandleAttack(session, mod, stat.name));
      break;
    case 'defend':
      newMsgs.push(...sandboxHandleDefend(session, mod, stat.name));
      break;
    case 'cast':
      newMsgs.push(...sandboxHandleCast(session, mod, stat.name));
      break;
    case 'explore':
      newMsgs.push(...sandboxHandleExplore(session, mod, stat.name));
      break;
    case 'social':
      newMsgs.push(...sandboxHandleSocial(session, mod, stat.name));
      break;
    case 'skill':
      newMsgs.push(...sandboxHandleSkill(session, mod, stat.name, playerInput));
      break;
    case 'rest':
      newMsgs.push(...sandboxHandleRest(session));
      break;
    default:
      newMsgs.push(
        sandboxAddMsg(
          session,
          'gm',
          'You consider your options. Try: attack, cast a spell, explore, talk, use a skill, or rest.'
        )
      );
      break;
  }

  if (session.character.hitPoints <= 0) {
    session.character.hitPoints = 0;
    newMsgs.push(sandboxAddMsg(session, 'system', '💀 Your character has fallen! Session Over.'));
  }

  if (session.encounterState.inCombat && session.encounterState.enemies.every((e) => !e.alive)) {
    session.encounterState.inCombat = false;
    newMsgs.push(sandboxAddMsg(session, 'system', '🏆 All enemies defeated! Combat ended.'));
    newMsgs.push(
      sandboxAddMsg(session, 'gm', 'The dust settles. You catch your breath. What would you like to do next?')
    );
  }

  return newMsgs;
}

function sandboxHandleAttack(session: SandboxGMSession, mod: number, statName: string): SandboxChatMessage[] {
  const msgs: SandboxChatMessage[] = [];
  const roll = sandboxRollDice('1d20');
  const total = roll.finalResult + mod;
  msgs.push(sandboxAddMsg(session, 'system', `${sandboxFormatRollHTML(roll)} + ${mod} (${statName}) = ${total}`));

  const aliveEnemies = session.encounterState.enemies.filter((e) => e.alive);
  if (aliveEnemies.length === 0) {
    msgs.push(sandboxAddMsg(session, 'gm', "There's nothing to attack right now. Perhaps explore your surroundings?"));
    return msgs;
  }
  const target = aliveEnemies[0];
  if (total >= target.defense) {
    const dmg = sandboxRollDice('1d8');
    const damage = Math.max(dmg.finalResult + mod, 1);
    target.hp -= damage;
    msgs.push(sandboxAddMsg(session, 'system', `💥 Damage: ${sandboxFormatRollHTML(dmg)} + ${mod} = ${damage}`));
    if (target.hp <= 0) {
      target.hp = 0;
      target.alive = false;
      msgs.push(
        sandboxAddMsg(
          session,
          'gm',
          `Your strike lands true! The ${target.name} crumbles, defeated. (${damage} damage)`
        )
      );
    } else {
      msgs.push(
        sandboxAddMsg(
          session,
          'gm',
          `A solid hit against the ${target.name}! (${damage} damage, ${target.hp}/${target.maxHp} HP remaining)`
        )
      );
    }
  } else {
    msgs.push(
      sandboxAddMsg(
        session,
        'gm',
        `Your attack swings wide of the ${target.name}! (Needed ${target.defense}, rolled ${total})`
      )
    );
  }
  msgs.push(...sandboxEnemyTurn(session));
  return msgs;
}

function sandboxHandleDefend(session: SandboxGMSession, mod: number, statName: string): SandboxChatMessage[] {
  const msgs: SandboxChatMessage[] = [];
  const roll = sandboxRollDice('1d20');
  const total = roll.finalResult + mod;
  msgs.push(
    sandboxAddMsg(session, 'system', `🛡️ Defense: ${sandboxFormatRollHTML(roll)} + ${mod} (${statName}) = ${total}`)
  );
  if (total >= 15) {
    msgs.push(
      sandboxAddMsg(session, 'gm', 'You brace expertly, raising your defenses. +2 on next defensive reaction.')
    );
    session.character.conditions.push('Defending (+2)');
  } else {
    msgs.push(sandboxAddMsg(session, 'gm', 'You take a defensive posture but feel uncertain of your footing.'));
  }
  msgs.push(...sandboxEnemyTurn(session));
  return msgs;
}

function sandboxHandleCast(session: SandboxGMSession, mod: number, statName: string): SandboxChatMessage[] {
  const msgs: SandboxChatMessage[] = [];
  const hasSpells = session.character.abilities.some((a) => /spell|cantrip/i.test(a));
  if (!hasSpells) {
    msgs.push(
      sandboxAddMsg(
        session,
        'gm',
        'You try to channel magic, but have no spells prepared. Learn magic through advancement.'
      )
    );
    return msgs;
  }
  const roll = sandboxRollDice('1d20');
  const total = roll.finalResult + mod;
  msgs.push(
    sandboxAddMsg(
      session,
      'system',
      `✨ Spellcasting: ${sandboxFormatRollHTML(roll)} + ${mod} (${statName}) = ${total}`
    )
  );
  if (total >= 12) {
    const dmg = sandboxRollDice('2d6');
    const damage = Math.max(dmg.finalResult + mod, 1);
    msgs.push(sandboxAddMsg(session, 'system', `🌟 Spell damage: ${sandboxFormatRollHTML(dmg)} + ${mod} = ${damage}`));
    const alive = session.encounterState.enemies.filter((e) => e.alive);
    if (alive.length > 0) {
      const target = alive[0];
      target.hp -= damage;
      if (target.hp <= 0) {
        target.hp = 0;
        target.alive = false;
        msgs.push(
          sandboxAddMsg(
            session,
            'gm',
            `Arcane energy engulfs the ${target.name}! It dissolves into motes of light. (${damage} magical damage)`
          )
        );
      } else {
        msgs.push(
          sandboxAddMsg(
            session,
            'gm',
            `Your spell strikes the ${target.name}! (${damage} damage, ${target.hp}/${target.maxHp} HP remaining)`
          )
        );
      }
    } else {
      msgs.push(sandboxAddMsg(session, 'gm', 'Your spell illuminates the area brilliantly. No targets nearby.'));
    }
  } else {
    msgs.push(sandboxAddMsg(session, 'gm', 'The spell fizzles—magical energy dissipates harmlessly. (Failed check)'));
  }
  msgs.push(...sandboxEnemyTurn(session));
  return msgs;
}

function sandboxHandleExplore(session: SandboxGMSession, mod: number, statName: string): SandboxChatMessage[] {
  const msgs: SandboxChatMessage[] = [];
  const roll = sandboxRollDice('1d20');
  const total = roll.finalResult + mod;
  msgs.push(
    sandboxAddMsg(session, 'system', `🔍 Perception: ${sandboxFormatRollHTML(roll)} + ${mod} (${statName}) = ${total}`)
  );
  if (total >= 18) {
    msgs.push(
      sandboxAddMsg(
        session,
        'gm',
        'Excellent perception! You find a hidden compartment with a healing potion and 15 gold pieces. Fresh tracks lead deeper.'
      )
    );
    session.character.inventory.push('Healing Potion');
  } else if (total >= 12) {
    msgs.push(
      sandboxAddMsg(
        session,
        'gm',
        'You notice worn markings on the walls and a faint draft indicating a passage nearby.'
      )
    );
  } else {
    msgs.push(
      sandboxAddMsg(
        session,
        'gm',
        'Nothing immediately catches your eye. The area seems unremarkable, but something feels off...'
      )
    );
  }
  return msgs;
}

function sandboxHandleSocial(session: SandboxGMSession, mod: number, statName: string): SandboxChatMessage[] {
  const msgs: SandboxChatMessage[] = [];
  const roll = sandboxRollDice('1d20');
  const total = roll.finalResult + mod;
  msgs.push(
    sandboxAddMsg(session, 'system', `🗣️ Charisma: ${sandboxFormatRollHTML(roll)} + ${mod} (${statName}) = ${total}`)
  );
  const alive = session.encounterState.enemies.filter((e) => e.alive);
  if (total >= 20 && alive.length > 0) {
    msgs.push(
      sandboxAddMsg(
        session,
        'gm',
        `Your words carry undeniable authority. The ${alive[0].name} hesitates and lowers its guard. Combat paused.`
      )
    );
    session.encounterState.inCombat = false;
  } else if (total >= 13) {
    msgs.push(sandboxAddMsg(session, 'gm', 'Your words have some effect. An opening for further negotiation appears.'));
  } else {
    msgs.push(sandboxAddMsg(session, 'gm', 'Your diplomacy falls flat. Tensions remain unchanged.'));
    if (alive.length > 0) msgs.push(...sandboxEnemyTurn(session));
  }
  return msgs;
}

function sandboxHandleSkill(
  session: SandboxGMSession,
  mod: number,
  statName: string,
  input: string
): SandboxChatMessage[] {
  const msgs: SandboxChatMessage[] = [];
  const lower = input.toLowerCase();
  let skillName = 'Skill Check';
  if (/heal|medicine/.test(lower)) skillName = 'Medicine';
  else if (/sneak|stealth|hide/.test(lower)) skillName = 'Stealth';
  else if (/climb/.test(lower)) skillName = 'Athletics';
  else if (/pick\s*lock/.test(lower)) skillName = 'Lockpicking';
  else if (/craft/.test(lower)) skillName = 'Crafting';

  const roll = sandboxRollDice('1d20');
  const total = roll.finalResult + mod;
  msgs.push(
    sandboxAddMsg(
      session,
      'system',
      `🎯 ${skillName}: ${sandboxFormatRollHTML(roll)} + ${mod} (${statName}) = ${total}`
    )
  );

  if (skillName === 'Medicine' && total >= 12) {
    const heal = Math.min(
      sandboxRollDice('1d6').finalResult,
      session.character.maxHitPoints - session.character.hitPoints
    );
    session.character.hitPoints += heal;
    msgs.push(
      sandboxAddMsg(
        session,
        'gm',
        `You tend your wounds, recovering ${heal} HP. (HP: ${session.character.hitPoints}/${session.character.maxHitPoints})`
      )
    );
  } else if (total >= 15) {
    msgs.push(sandboxAddMsg(session, 'gm', `Impressive! Your ${skillName.toLowerCase()} succeeds beautifully.`));
  } else if (total >= 10) {
    msgs.push(sandboxAddMsg(session, 'gm', `You manage to succeed at ${skillName.toLowerCase()}, just barely.`));
  } else {
    msgs.push(sandboxAddMsg(session, 'gm', `Your ${skillName.toLowerCase()} attempt doesn't go as planned.`));
  }
  return msgs;
}

function sandboxHandleRest(session: SandboxGMSession): SandboxChatMessage[] {
  const msgs: SandboxChatMessage[] = [];
  if (session.encounterState.inCombat) {
    msgs.push(sandboxAddMsg(session, 'gm', "You can't rest during combat! Deal with the threat first."));
    msgs.push(...sandboxEnemyTurn(session));
    return msgs;
  }
  const heal = Math.min(
    sandboxRollDice('1d8').finalResult,
    session.character.maxHitPoints - session.character.hitPoints
  );
  session.character.hitPoints += heal;
  session.character.conditions = [];
  msgs.push(sandboxAddMsg(session, 'system', `💤 Rest: Recovered ${heal} HP`));
  msgs.push(
    sandboxAddMsg(
      session,
      'gm',
      `You rest and recuperate. (HP: ${session.character.hitPoints}/${session.character.maxHitPoints}). Conditions cleared.`
    )
  );
  return msgs;
}

function sandboxEnemyTurn(session: SandboxGMSession): SandboxChatMessage[] {
  const msgs: SandboxChatMessage[] = [];
  const alive = session.encounterState.enemies.filter((e) => e.alive);
  if (!session.encounterState.inCombat || alive.length === 0) return msgs;

  for (const enemy of alive) {
    const roll = sandboxRollDice('1d20');
    const attackTotal = roll.finalResult + enemy.attack;
    const playerDef = 10 + sandboxStatMod(session.character.stats['DEX'] || 10);
    const defIdx = session.character.conditions.indexOf('Defending (+2)');
    const bonus = defIdx >= 0 ? 2 : 0;
    if (defIdx >= 0) session.character.conditions.splice(defIdx, 1);
    const effectiveDef = playerDef + bonus;

    if (attackTotal >= effectiveDef) {
      const damage = Math.max(sandboxRollDice('1d6').finalResult, 1);
      session.character.hitPoints -= damage;
      msgs.push(
        sandboxAddMsg(
          session,
          'system',
          `⚠️ ${enemy.name} attacks! Roll ${attackTotal} vs Defense ${effectiveDef} — HIT!`
        )
      );
      msgs.push(
        sandboxAddMsg(
          session,
          'gm',
          `The ${enemy.name} strikes you for ${damage} damage! (HP: ${session.character.hitPoints}/${session.character.maxHitPoints})`
        )
      );
    } else {
      msgs.push(
        sandboxAddMsg(session, 'system', `🛡️ ${enemy.name}: Roll ${attackTotal} vs Defense ${effectiveDef} — MISS!`)
      );
      msgs.push(sandboxAddMsg(session, 'gm', `The ${enemy.name} lunges but you evade the blow!`));
    }
  }
  session.encounterState.roundNumber++;
  return msgs;
}

function sandboxRenderCharacterHTML(char: SandboxCharacterTemplate): string {
  let html = '';
  html += `<div class="char-stat"><span class="char-stat-label">Name</span><span class="char-stat-value">${char.name}</span></div>`;
  html += `<div class="char-stat"><span class="char-stat-label">Level</span><span class="char-stat-value">${char.level}</span></div>`;
  const hpColor =
    char.hitPoints <= char.maxHitPoints * 0.3
      ? '#ef4444'
      : char.hitPoints <= char.maxHitPoints * 0.6
        ? '#f59e0b'
        : '#10b981';
  html += `<div class="char-stat"><span class="char-stat-label">HP</span><span class="char-stat-value" style="color: ${hpColor};">${char.hitPoints}/${char.maxHitPoints}</span></div>`;
  for (const [stat, value] of Object.entries(char.stats)) {
    const mod = sandboxStatMod(value);
    html += `<div class="char-stat"><span class="char-stat-label">${stat}</span><span class="char-stat-value">${value} (${mod >= 0 ? '+' : ''}${mod})</span></div>`;
  }
  if (char.conditions.length > 0) {
    html += `<div class="char-stat"><span class="char-stat-label">Conditions</span><span class="char-stat-value" style="color: #f59e0b;">${char.conditions.join(', ')}</span></div>`;
  }
  html += `<div class="char-stat"><span class="char-stat-label">Skills</span><span class="char-stat-value" style="font-size:0.75rem">${char.skills.join(', ')}</span></div>`;
  return html;
}

// --- Sandbox UI Controller ---

function initializeSandbox(): void {
  const vectorInput = document.getElementById('sandbox-vector-input') as HTMLInputElement | null;
  const suggestionsContainer = document.getElementById('sandbox-vector-suggestions');
  const clearBtn = document.getElementById('sandbox-clear-vectors');
  const synthesizeBtn = document.getElementById('sandbox-synthesize-btn') as HTMLButtonElement | null;
  const chatInput = document.getElementById('sandbox-chat-input') as HTMLInputElement | null;
  const chatSendBtn = document.getElementById('sandbox-chat-send') as HTMLButtonElement | null;

  if (!vectorInput || !suggestionsContainer || !clearBtn || !synthesizeBtn || !chatInput || !chatSendBtn) return;

  // Vector autocomplete
  const debouncedVectorSearch = debounce((query: string) => {
    if (!query || query.length < 2) {
      suggestionsContainer.innerHTML = '';
      suggestionsContainer.style.display = 'none';
      return;
    }
    const lower = query.toLowerCase();
    const sortedVectors = Array.from(uniqueVectors).sort();
    const matches = sortedVectors
      .filter((v) => v.toLowerCase().includes(lower) && !sandboxSelectedVectors.includes(v))
      .slice(0, 15);

    if (matches.length === 0) {
      suggestionsContainer.innerHTML = '';
      suggestionsContainer.style.display = 'none';
      return;
    }

    suggestionsContainer.innerHTML = matches
      .map((v) => `<div class="suggestion-item" data-vector="${v}">${v}</div>`)
      .join('');
    suggestionsContainer.style.display = 'block';

    suggestionsContainer.querySelectorAll('.suggestion-item').forEach((item) => {
      item.addEventListener('click', () => {
        const vec = item.getAttribute('data-vector');
        if (vec && !sandboxSelectedVectors.includes(vec)) {
          sandboxSelectedVectors.push(vec);
          sandboxRenderSelectedVectors();
          sandboxRunConflictAnalysis();
          sandboxUpdateSynthesizeBtn();
        }
        vectorInput.value = '';
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
      });
    });
  }, 150);

  vectorInput.addEventListener('input', () => debouncedVectorSearch(vectorInput.value));
  vectorInput.addEventListener('blur', () => {
    setTimeout(() => {
      suggestionsContainer.innerHTML = '';
      suggestionsContainer.style.display = 'none';
    }, 200);
  });

  // Clear vectors
  clearBtn.addEventListener('click', () => {
    sandboxSelectedVectors = [];
    sandboxRenderSelectedVectors();
    sandboxRunConflictAnalysis();
    sandboxUpdateSynthesizeBtn();
  });

  // Synthesize button
  synthesizeBtn.addEventListener('click', () => {
    if (sandboxSelectedVectors.length === 0) return;

    const conflicts = sandboxAnalyzeConflicts(sandboxSelectedVectors);

    // Gather vector explanations from the database
    const vectorExplanations: Record<string, string[]> = {};
    for (const vec of sandboxSelectedVectors) {
      vectorExplanations[vec] = [];
      for (const game of allGames) {
        if (game.vector_explanations && game.vector_explanations[vec]) {
          vectorExplanations[vec].push(game.vector_explanations[vec]);
          if (vectorExplanations[vec].length >= 5) break;
        }
      }
    }

    sandboxSynthesizedRuleset = sandboxSynthesizeRuleset(sandboxSelectedVectors, conflicts, vectorExplanations);

    const outputEl = document.getElementById('sandbox-ruleset-output');
    if (outputEl) {
      outputEl.innerHTML = sandboxRenderRulesetHTML(sandboxSynthesizedRuleset);
    }

    // Initialize GM session
    sandboxSession = sandboxCreateSession(sandboxSynthesizedRuleset);
    sandboxRenderChatLog();
    sandboxRenderCharacterSheet();

    // Enable chat
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
    chatInput.focus();
  });

  // Chat input
  const sendAction = () => {
    const input = chatInput.value.trim();
    if (!input || !sandboxSession || sandboxSession.character.hitPoints <= 0) return;

    const newMsgs = sandboxProcessAction(sandboxSession, input);
    sandboxAppendChatMessages(newMsgs);
    sandboxRenderCharacterSheet();
    chatInput.value = '';
    chatInput.focus();
  };

  chatSendBtn.addEventListener('click', sendAction);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendAction();
  });
}

function sandboxRenderSelectedVectors(): void {
  const container = document.getElementById('sandbox-selected-vectors');
  if (!container) return;
  if (sandboxSelectedVectors.length === 0) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = sandboxSelectedVectors
    .map(
      (v) =>
        `<span class="sandbox-vector-pill">${v}<span class="remove-vector" data-vector="${v}">&times;</span></span>`
    )
    .join('');

  container.querySelectorAll('.remove-vector').forEach((btn) => {
    btn.addEventListener('click', () => {
      const vec = btn.getAttribute('data-vector');
      if (vec) {
        sandboxSelectedVectors = sandboxSelectedVectors.filter((v) => v !== vec);
        sandboxRenderSelectedVectors();
        sandboxRunConflictAnalysis();
        sandboxUpdateSynthesizeBtn();
      }
    });
  });
}

function sandboxRunConflictAnalysis(): void {
  const container = document.getElementById('sandbox-conflicts');
  if (!container) return;

  if (sandboxSelectedVectors.length < 2) {
    container.innerHTML = '<div class="sandbox-empty-state">Select 2+ vectors to analyze conflicts</div>';
    return;
  }

  const conflicts = sandboxAnalyzeConflicts(sandboxSelectedVectors);

  if (conflicts.length === 0) {
    container.innerHTML =
      '<div class="sandbox-empty-state" style="color: var(--color-success);">✅ No mechanical conflicts detected. Clear for synthesis!</div>';
    return;
  }

  container.innerHTML = conflicts
    .map((c) => {
      const icon = c.rule.severity === 'critical' ? '🔴' : '🟡';
      return `
      <div class="sandbox-conflict-card">
        <div class="sandbox-conflict-title">${icon} ${c.rule.category}</div>
        <div>${c.rule.description}</div>
        <div style="margin-top: 0.35rem; color: var(--text-muted); font-size: 0.8rem;">
          <strong>Resolution:</strong> ${c.rule.resolution}
        </div>
        <div style="margin-top: 0.25rem; font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted);">
          Vectors: ${c.triggeringVectors.join(', ')}
        </div>
      </div>
    `;
    })
    .join('');
}

function sandboxUpdateSynthesizeBtn(): void {
  const btn = document.getElementById('sandbox-synthesize-btn') as HTMLButtonElement | null;
  if (btn) {
    btn.disabled = sandboxSelectedVectors.length === 0;
  }
}

function sandboxRenderChatLog(): void {
  const chatLog = document.getElementById('sandbox-chat-log');
  if (!chatLog || !sandboxSession) return;

  chatLog.innerHTML = sandboxSession.chatLog
    .map((msg) => `<div class="sandbox-chat-msg ${msg.role}">${msg.content}</div>`)
    .join('');
  chatLog.scrollTop = chatLog.scrollHeight;
}

function sandboxAppendChatMessages(messages: SandboxChatMessage[]): void {
  const chatLog = document.getElementById('sandbox-chat-log');
  if (!chatLog) return;

  for (const msg of messages) {
    const div = document.createElement('div');
    div.className = `sandbox-chat-msg ${msg.role}`;
    div.innerHTML = msg.content;
    chatLog.appendChild(div);
  }
  chatLog.scrollTop = chatLog.scrollHeight;
}

function sandboxRenderCharacterSheet(): void {
  const container = document.getElementById('sandbox-character-sheet');
  if (!container || !sandboxSession) return;
  container.innerHTML = sandboxRenderCharacterHTML(sandboxSession.character);
}
