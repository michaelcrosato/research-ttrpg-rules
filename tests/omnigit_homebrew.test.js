const fs = require('fs');
const path = require('path');

const mockRegistryData = {
  ttrpg: [
    {
      game_id: 'mock_ttrpg_fantasy',
      title: 'Mock Fantasy RPG',
      year: 2024,
      medium: 'ttrpg',
      primary_genre: 'Fantasy',
      subgenres: ['Adventure'],
      governed_vectors: ['combat.melee.dice_rolls'],
      vector_explanations: {
        'combat.melee.dice_rolls': 'Uses d20.',
      },
    },
  ],
  board_game: [],
};

describe('OmniGit VCS & Homebrew Creator Workspace tests', () => {
  let dbMockStore = {};

  beforeEach(() => {
    jest.resetModules();
    dbMockStore = {};

    // Mock IndexedDB
    const mockIDBRequest = {
      result: {
        transaction: () => ({
          objectStore: () => ({
            get: (key) => ({
              set onsuccess(fn) {
                setTimeout(() => fn(), 0);
              },
              get result() {
                return dbMockStore[key] || null;
              },
            }),
            put: (data, key) => {
              const k = key || data.game_id || 'current_draft';
              dbMockStore[k] = data;
              return {
                set onsuccess(fn) {
                  setTimeout(() => fn(), 0);
                },
              };
            },
            getAll: () => ({
              set onsuccess(fn) {
                setTimeout(() => fn(), 0);
              },
              get result() {
                return Object.values(dbMockStore);
              },
            }),
          }),
        }),
        objectStoreNames: {
          contains: () => true,
        },
      },
      set onsuccess(fn) {
        setTimeout(() => fn(), 0);
      },
    };

    global.indexedDB = {
      open: jest.fn().mockReturnValue(mockIDBRequest),
    };

    const htmlPath = path.resolve(__dirname, '../index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    document.documentElement.innerHTML = htmlContent;

    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('registry.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockRegistryData),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    require('../dist/app.js');
    document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  });

  test('VCS: branches, checkout, stage, commit and history lifecycle', async () => {
    // Wait for DB boot
    await global.waitFor(() => {
      const statsTotal = document.getElementById('stat-total-games');
      return statsTotal && statsTotal.textContent !== '0';
    });

    const vcs = window.omniGitVCS;
    expect(vcs.getActiveBranch()).toBe('main');

    // Create branch
    vcs.createBranch('feature-dev');
    vcs.checkoutBranch('feature-dev');
    expect(vcs.getActiveBranch()).toBe('feature-dev');

    // Stage change
    const newGame = {
      game_id: 'test_game',
      title: 'Test Game',
      year: 2026,
      medium: 'ttrpg',
      primary_genre: 'Adventure',
      subgenres: [],
      governed_vectors: [],
      vector_explanations: {},
    };

    vcs.stageChange({
      gameId: 'test_game',
      action: 'add',
      field: 'game',
      oldValue: null,
      newValue: newGame,
    });

    // Commit staged changes
    vcs.commitStaged('Add new game');

    // Verify commit history
    const history = vcs.getCommitHistory();
    expect(history.length).toBe(1);
    expect(history[0].message).toBe('Add new game');

    // Verify diff patch
    const diff = JSON.parse(vcs.exportJSONDiff());
    expect(diff.added.length).toBe(1);
    expect(diff.added[0].game_id).toBe('test_game');
  });

  test('VCS: branch merge and conflict resolution', async () => {
    // Wait for DB boot
    await global.waitFor(() => {
      const statsTotal = document.getElementById('stat-total-games');
      return statsTotal && statsTotal.textContent !== '0';
    });

    const vcs = window.omniGitVCS;
    vcs.createBranch('branch-a');
    vcs.createBranch('branch-b');

    // Stage and commit change on branch-a
    vcs.checkoutBranch('branch-a');
    vcs.stageChange({
      gameId: 'mock_ttrpg_fantasy',
      action: 'modify',
      field: 'title',
      oldValue: 'Mock Fantasy RPG',
      newValue: 'Mock Fantasy RPG v1',
    });
    vcs.commitStaged('Update title on a');

    // Stage and commit conflicting change on branch-b
    vcs.checkoutBranch('branch-b');
    vcs.stageChange({
      gameId: 'mock_ttrpg_fantasy',
      action: 'modify',
      field: 'title',
      oldValue: 'Mock Fantasy RPG',
      newValue: 'Mock Fantasy RPG v2',
    });
    vcs.commitStaged('Update title on b');

    // Try to merge branch-b into branch-a (expect conflict)
    vcs.checkoutBranch('branch-a');
    const mergeResult = vcs.mergeBranch('branch-b', 'branch-a');
    expect(mergeResult.success).toBe(false);
    expect(mergeResult.conflicts.length).toBe(1);
    expect(mergeResult.conflicts[0].field).toBe('title');

    // Resolve conflict (select source value)
    window.resolveConflictSingle('mock_ttrpg_fantasy', 'title', 'source');
    window.completeConflictResolution();

    await global.waitFor(() => {
      const hist = vcs.getCommitHistory();
      return hist[0] && hist[0].message.includes('resolved conflicts');
    });

    const history = vcs.getCommitHistory();
    expect(history[0].message).toContain('resolved conflicts');
  });

  test('Homebrew: autosave drafts, publish, registry overlay', async () => {
    // Wait for DB boot
    await global.waitFor(() => {
      const statsTotal = document.getElementById('stat-total-games');
      return statsTotal && statsTotal.textContent !== '0';
    });

    // Fill form
    document.getElementById('homebrew-title').value = 'My Homebrew Subsystem';
    document.getElementById('homebrew-vectors').value = 'combat.melee.tactical';
    document.getElementById('homebrew-description').value = 'Custom tactical melee subsystem rules.';
    document.getElementById('homebrew-publish-toggle').checked = true;

    // Trigger autosave
    window.autoSaveHomebrewDraft();

    // Verify draft store write (wait for async IndexedDB write)
    await global.waitFor(() => dbMockStore['current_draft'] !== undefined);
    const draft = dbMockStore['current_draft'];
    expect(draft).toBeTruthy();
    expect(draft.title).toBe('My Homebrew Subsystem');

    // Clear form and verify reload draft
    window.clearHomebrewForm();
    expect(document.getElementById('homebrew-title').value).toBe('');
    await window.loadHomebrewDraft();
    expect(document.getElementById('homebrew-title').value).toBe('My Homebrew Subsystem');

    // Publish homebrew
    await window.publishHomebrew();

    // Verify in database overlay
    const statsTotal = document.getElementById('stat-total-games');
    expect(statsTotal.textContent).toBe('2');
  });

  test('Consistency Solver: analyze conflicts and synthesizer outlines', async () => {
    // Wait for DB boot
    await global.waitFor(() => {
      const statsTotal = document.getElementById('stat-total-games');
      return statsTotal && statsTotal.textContent !== '0';
    });

    expect(window.analyzeLogicalConflicts).toBeTruthy();

    // Mutually exclusive roll-over vs roll-under
    const conflicts = window.analyzeLogicalConflicts(['resolution.roll_over', 'resolution.roll_under']);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].rule.id).toBe('roll-over-vs-roll-under');

    // Infinite loop cycle detection
    const loopConflicts = window.analyzeLogicalConflicts(['combat.melee.rage', 'combat.damage.feedback']);
    expect(loopConflicts.length).toBe(1);
    expect(loopConflicts[0].rule.id).toContain('infinite-loop');

    // Synthesizer outlines highlighting
    const ruleset = {
      title: 'Synthesized Ruleset',
      sections: [
        {
          heading: 'Combat Section',
          domain: 'combat',
          rules: ['Rule 1', '🔴 [Resolution Mechanic]: Conflict detail'],
        },
      ],
      resolutionNotes: ['Reconciled conflict.'],
      characterTemplate: {},
    };

    const renderedHtml = window.sandboxRenderRulesetHTML ? window.sandboxRenderRulesetHTML(ruleset) : '';
    expect(renderedHtml).toContain('border: 2px solid var(--color-danger)');
    expect(renderedHtml).toContain('class="synthesizer-conflict-highlight"');
  });
});
