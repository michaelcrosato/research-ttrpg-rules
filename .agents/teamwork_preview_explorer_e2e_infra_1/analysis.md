# E2E Testing Infrastructure Design Analysis

This document outlines the design and implementation blueprint for testing the Systems Indexer web application (composed of `index.html`, `app.js`, and `registry.json`) using Jest and JSDOM.

---

## 1. Loading and Parsing `index.html` and `app.js` in JSDOM

### JSDOM Setup and Script Execution
In a standard Jest environment configured for JSDOM (`jest-environment-jsdom`), Jest provides a simulated browser environment. However, when we read `index.html`, JSDOM does not automatically load or execute external scripts like `<script src="app.js"></script>` unless configured with `runScripts: "dangerously"` and resource loaders. 

To maintain clean test isolation and facilitate mocking, we recommend loading the HTML and script programmatically:
1. **Load HTML structure**: Read `index.html` via Node's `fs` module and set `document.documentElement.innerHTML`.
2. **Mock global dependencies**: Before loading `app.js`, we mock global APIs that do not exist natively in Node/JSDOM, most notably `window.fetch` (since `app.js` fetches `./registry.json` on load).
3. **Load `app.js`**: Require the application script (`require('../app.js')`). Jest executes the file in the context of the JSDOM `global` object.
4. **Trigger Initialization**: Manually dispatch the `DOMContentLoaded` event on `window` to run the application's startup lifecycle (`setupTabs`, `setupEventListeners`, `loadDatabase`).

### Module Closure vs Global Scope
`app.js` defines several internal state variables at the top level:
```javascript
let gamesData = { ttrpg: [], board_game: [] };
let allGames = [];
let uniqueVectors = new Set();
...
```
When `app.js` is imported via CommonJS `require()`, Node wraps it in a module wrapper. As a result, these variables are scoped to the module and are not directly exposed on the global `window` object. 

This is standard and safe, because:
- The UI interaction functions (e.g., `openGameDetails`, `searchBGG`, `setDictDomain`) are explicitly attached to the `window` object (e.g., `window.openGameDetails = function(...)`).
- JSDOM's event handling executes inline event handlers (like `onclick="openGameDetails(...)"`) by searching properties of `window`. Since these functions are on `window`, they resolve and execute successfully.
- For assertions, we inspect the resulting DOM tree rather than private state variables, adhering to black-box testing best practices.

---

## 2. Mocking `registry.json`

### The Fetch Mock
`app.js` calls `fetch('./registry.json')` inside `loadDatabase()`. In Jest, we mock this by overriding `global.fetch` prior to dispatching `DOMContentLoaded`.

### Full Database vs. Representative Subset
`registry.json` is currently **~5.26 MB** containing over 100,000 lines of JSON.
- **Why the full database is NOT recommended for testing**:
  1. **Performance**: Parsing a 5MB JSON string in every test run creates significant memory overhead and slows down test startup and execution in Jest.
  2. **Brittleness**: The main database is live and changes as games are added. If we assert specific dashboard counts or search results, any additions to the main database will break the tests.
  3. **Verification**: With a giant database, it is difficult to construct deterministic, edge-case assertions (e.g. verifying exact intersections in the Venn Comparison Tool).

- **Recommended Approach**: Use a **representative subset** in tests. The subset should have the exact structural schema as `registry.json` but contain only 2-3 TTRPGs and 2-3 Board Games.

### Mock Database Blueprint
```javascript
const mockRegistryData = {
  "ttrpg": [
    {
      "game_id": "mock_ttrpg_fantasy",
      "title": "Mock Fantasy RPG",
      "year": 2024,
      "medium": "ttrpg",
      "primary_genre": "Fantasy",
      "subgenres": ["Adventure", "Dungeon Crawl"],
      "governed_vectors": [
        "character.character_creation.class_based",
        "combat.melee.tactical",
        "simulation.magic.spell_slots"
      ],
      "vector_explanations": {
        "character.character_creation.class_based": "Uses classes to build characters.",
        "combat.melee.tactical": "Features grid-based tactical melee.",
        "simulation.magic.spell_slots": "Features Vancian magic slot limits."
      }
    }
  ],
  "board_game": [
    {
      "game_id": "mock_bg_euro",
      "title": "Mock Euro Game",
      "year": 2020,
      "medium": "board_game",
      "primary_genre": "Strategy",
      "subgenres": ["Economic"],
      "governed_vectors": [
        "economy.market.worker_placement",
        "combat.melee.tactical"
      ],
      "vector_explanations": {
        "economy.market.worker_placement": "Place workers to gather resources.",
        "combat.melee.tactical": "Simple skirmish resolution rules."
      }
    }
  ]
};
```
Using this mock data, we can verify exact counts:
- Total Rulesets: **2**
- TTRPG Rulesets: **1**
- Board Games: **1**
- Unique Vectors: **4** (`character.character_creation.class_based`, `combat.melee.tactical`, `simulation.magic.spell_slots`, `economy.market.worker_placement`)

---

## 3. Mocking External APIs (BoardGameGeek API)

The database editor supports importing metadata from the BGG XML API. Specifically, it calls:
1. Search query: `https://boardgamegeek.com/xmlapi2/search?query=...&type=boardgame`
2. Game details: `https://boardgamegeek.com/xmlapi2/thing?id=...`

These APIs return XML, which `app.js` parses using `DOMParser`. 

### Mocking Strategy
We intercept calls starting with `boardgamegeek.com/xmlapi2/` in our custom `global.fetch` mock and return simulated XML string responses. Because JSDOM provides `window.DOMParser` (which maps to Jest's `global.DOMParser`), the application's XML-parsing code will work seamlessly.

#### BGG Search API Mock Response (XML)
```javascript
const mockBggSearchXml = `
<items total="1">
  <item id="99999" type="boardgame">
    <name value="Mock BGG Game"/>
    <yearpublished value="2022"/>
  </item>
</items>
`;
```

#### BGG Thing API Mock Response (XML)
```javascript
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
```

---

## 4. Dependencies and Configuration

### Target `package.json`
We require Jest and the JSDOM environment. Since there is no canvas usage in `app.js` or `index.html`, **`canvas` is not required**. This avoids complex native build issues on Windows systems.

```json
{
  "name": "research-ttrpg-rules-tests",
  "version": "1.0.0",
  "description": "E2E Testing Infrastructure for Systems Indexer",
  "scripts": {
    "test": "jest"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0"
  }
}
```

### Jest Configuration (`jest.config.js`)
We configure Jest to use the `jsdom` environment and load a custom setup script before executing tests.
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  verbose: true,
  // Executed before every test suite
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  // Prevent styling imports from throwing errors (optional, since styles are linked in index.html and not imported via JS modules)
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/__mocks__/styleMock.js'
  }
};
```

### Setup File (`tests/setup.js`)
We use the setup file to mock `global.fetch` and initialize other global overrides.
```javascript
// Mock Fetch and XML DOM Parser if needed
global.fetch = jest.fn();

// Add helper to mock clean responses
global.setFetchMockResponse = (urlMatcher, data, isXml = false) => {
  global.fetch.mockImplementation((url) => {
    if (url.includes(urlMatcher)) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => isXml ? Promise.reject() : Promise.resolve(data),
        text: () => isXml ? Promise.resolve(data) : Promise.resolve(JSON.stringify(data))
      });
    }
    return Promise.reject(new Error(`Unhandled mock fetch for URL: ${url}`));
  });
};

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
```

---

## 5. Test Blueprint (`tests/smoke.test.js`)

Below is the prototype smoke test code designed to run in Jest:

```javascript
const fs = require('fs');
const path = require('path');

// Mock Data
const mockRegistryData = {
  "ttrpg": [
    {
      "game_id": "mock_ttrpg_fantasy",
      "title": "Mock Fantasy RPG",
      "year": 2024,
      "medium": "ttrpg",
      "primary_genre": "Fantasy",
      "subgenres": ["Adventure"],
      "governed_vectors": [
        "character.character_creation.class_based",
        "combat.melee.tactical"
      ],
      "vector_explanations": {
        "character.character_creation.class_based": "Uses classes to build characters.",
        "combat.melee.tactical": "Features grid-based tactical melee."
      }
    }
  ],
  "board_game": [
    {
      "game_id": "mock_bg_euro",
      "title": "Mock Euro Game",
      "year": 2020,
      "medium": "board_game",
      "primary_genre": "Strategy",
      "subgenres": ["Economic"],
      "governed_vectors": [
        "economy.market.worker_placement",
        "combat.melee.tactical"
      ],
      "vector_explanations": {
        "economy.market.worker_placement": "Place workers to gather resources.",
        "combat.melee.tactical": "Simple skirmish resolution rules."
      }
    }
  ]
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
      if (url === './registry.json') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockRegistryData)
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    // 4. Load app.js code
    require('../app.js');

    // 5. Fire DOMContentLoaded to execute the app logic
    window.dispatchEvent(new window.Event('DOMContentLoaded'));
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
    // Flush microtasks queue to allow async fetch of database to complete
    await new Promise(process.nextTick);

    // Verify game cards are loaded in the DOM grid
    const gameCards = document.querySelectorAll('.game-card');
    expect(gameCards.length).toBe(2);

    // Verify titles on cards
    const cardTitles = Array.from(gameCards).map(card => card.querySelector('h2').textContent);
    expect(cardTitles).toContain('Mock Fantasy RPG');
    expect(cardTitles).toContain('Mock Euro Game');
  });

  test('Dashboard counts are rendered correctly', async () => {
    // Flush microtasks queue
    await new Promise(process.nextTick);

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
```
