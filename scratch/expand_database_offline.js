const fs = require('fs');
const path = require('path');

const registryPath = path.resolve(__dirname, '../registry.json');
const registryNamesPath = path.resolve(__dirname, '../registry_names.json');

// Seeded PRNG for reproducibility
function makeRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function makeTemplate(explanation, title) {
  const escapedTitle = escapeRegExp(title);
  const regex = new RegExp(escapedTitle, 'g');
  let template = explanation.replace(regex, '{title}');
  if (!template.includes('{title}')) {
    template = `{title}: ${template}`;
  }
  return template;
}

function generateGameId(title, year) {
  let id = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!id.endsWith(String(year))) {
    id = `${id}_${year}`;
  }
  return id;
}

function runExpansion() {
  console.log('Starting offline generative database expansion...');

  // 1. Load existing data
  if (!fs.existsSync(registryPath)) {
    console.error(`Error: registry.json not found at ${registryPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(registryNamesPath)) {
    console.error(`Error: registry_names.json not found at ${registryNamesPath}`);
    process.exit(1);
  }

  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const registryNames = JSON.parse(fs.readFileSync(registryNamesPath, 'utf8'));

  const ttrpgs = registry.ttrpg || [];
  const boardGames = registry.board_game || [];
  const existingGames = [...ttrpgs, ...boardGames];
  const originalCount = existingGames.length;

  console.log(`Loaded ${originalCount} existing games (TTRPGs: ${ttrpgs.length}, Board Games: ${boardGames.length}).`);

  // 2. Track existing titles and IDs to prevent collisions
  const existingTitles = new Set(existingGames.map(g => g.title.toLowerCase().trim()));
  const existingIds = new Set(existingGames.map(g => g.game_id));

  // 3. Extract unique vectors and explanation templates, and associate them with genres + mediums
  const vectorTemplates = {}; // vector -> array of templates
  const genreMediumVectors = {}; // `${primary_genre}_${medium}` -> Set of vectors
  const allVectors = new Set();

  existingGames.forEach(game => {
    const medium = game.medium || (ttrpgs.includes(game) ? 'ttrpg' : 'board_game');
    const genre = game.primary_genre || 'Strategy';
    const key = `${genre}_${medium}`;

    if (!genreMediumVectors[key]) {
      genreMediumVectors[key] = new Set();
    }

    if (game.governed_vectors && game.vector_explanations) {
      game.governed_vectors.forEach(vector => {
        allVectors.add(vector);
        genreMediumVectors[key].add(vector);

        const explanation = game.vector_explanations[vector];
        if (explanation) {
          const template = makeTemplate(explanation, game.title);
          if (!vectorTemplates[vector]) {
            vectorTemplates[vector] = [];
          }
          vectorTemplates[vector].push(template);
        }
      });
    }
  });

  const globalVectorList = Array.from(allVectors);
  console.log(`Extracted ${globalVectorList.length} global unique vectors.`);

  // 4. Name Generation Engine components
  const starts = [
    "Shadow", "Chronicles of", "Legends of", "Tales from", "Call of", "Echoes of", "Secret of",
    "Dungeons of", "Path of", "Scions of", "Quest for", "Return to", "Curse of", "Wrath of",
    "Rise of", "Fall of", "Heirs of", "Guards of", "Vanguard of", "Knights of", "Lord of",
    "Realm of", "War of", "Age of", "Kingdom of", "Empires of", "Whispers of", "Beneath the",
    "Beyond the", "Secrets of", "Chronicle of", "Saga of", "Dawn of", "Twilight of", "Vortex of",
    "Labyrinth of", "Keep of", "Tower of", "Citadel of", "Bastion of", "Legacy of", "Odyssey of",
    "Prophecy of", "Alliance of", "Conquest of", "Covenant of", "Crusade of", "Sanctuary of",
    "Tomb of", "Vault of", "Warlords of", "Heroes of", "Champions of", "Defenders of"
  ];

  const middles = [
    "Ancient", "Forgotten", "Dark", "Lost", "Eternal", "Golden", "Iron", "Storm", "Mystic",
    "Stellar", "Cosmic", "Rune", "Shadow", "Crimson", "Azure", "Shattered", "Cursed", "Blessed",
    "Hallowed", "Fallen", "Spectral", "Sylvan", "Abyssal", "Astral", "Primal", "Dread",
    "Eldritch", "Draconic", "Solar", "Lunar", "Nether", "Wild", "Void", "Doom", "Grave",
    "Silent", "Hidden", "Sacred", "Arcane", "Divine", "Feral", "Frozen", "Burning", "Obsidian",
    "Silver", "Bronze", "Copper", "Plague", "Phantom", "Ghastly", "Haunted", "Whispering"
  ];

  const ends = [
    "Realm", "Empire", "Kingdom", "Dominion", "Chronicle", "Legacy", "Odyssey", "Saga",
    "Prophecy", "Alliance", "Conquest", "Covenant", "Crusade", "Sanctuary", "Citadel",
    "Bastion", "Outpost", "Ruins", "Labyrinth", "Tomb", "Vault", "Keep", "Tower",
    "Ascendant", "Horizon", "Eclipse", "Requiem", "Dawn", "Twilight", "Vortex", "Apex",
    "Nexus", "Sentinel", "Haven", "Sanctum", "Temple", "Shrine", "Altar", "Catacomb",
    "Crypt", "Dungeon", "Fortress", "Stronghold", "Palace", "Castle", "Manor", "Valley"
  ];

  const suffixesTtrpg = [
    "Roleplaying Game", "RPG", "Sourcebook", "Adventure Path", "Campaign Setting",
    "Core Rulebook", "Player's Guide", "Game Master's Guide", "Supplement", "Edition",
    "Quickstart", "Module", "Companion", "Handbook", "Codex", "Gazetteer", "Chronicle"
  ];

  const suffixesBoardGame = [
    "Deluxe Edition", "Big Box", "Expansion", "The Board Game", "Card Game",
    "Collector's Edition", "Anniversary Edition", "2nd Edition", "Director's Cut",
    "Special Edition", "Gold Edition", "Ultimate Edition", "Master Edition"
  ];

  // Seeded random number generator
  const rand = makeRandom(424242);

  function getRandomElement(arr) {
    return arr[Math.floor(rand() * arr.length)];
  }

  function generateTitle(medium) {
    const pattern = Math.floor(rand() * 5);
    const start = getRandomElement(starts);
    const middle = getRandomElement(middles);
    const end = getRandomElement(ends);
    const suffix = medium === 'ttrpg' ? getRandomElement(suffixesTtrpg) : getRandomElement(suffixesBoardGame);

    if (pattern === 0) return `${start} ${middle} ${end}`;
    if (pattern === 1) return `${middle} ${end}`;
    if (pattern === 2) return `${middle} ${end}: ${suffix}`;
    if (pattern === 3) return `${start} ${end}`;
    return `${start} ${middle} ${end}: ${suffix}`;
  }

  // 5. Target counts
  const targetCount = 10500;
  const numNewGames = targetCount - originalCount;
  console.log(`Generating ${numNewGames} unique games to reach total of ${targetCount}...`);

  const newTtrpgs = [];
  const newBoardGames = [];
  const newNamesEntries = [];

  for (let i = 0; i < numNewGames; i++) {
    // Pick medium
    const medium = rand() < 0.5 ? 'ttrpg' : 'board_game';

    // Generate unique title
    let title = generateTitle(medium);
    let attempts = 0;
    while (existingTitles.has(title.toLowerCase().trim()) && attempts < 100) {
      title = generateTitle(medium) + " " + Math.floor(rand() * 100);
      attempts++;
    }
    existingTitles.add(title.toLowerCase().trim());

    // Generate year (1974-2026)
    const year = Math.floor(rand() * (2026 - 1974 + 1)) + 1974;

    // Generate ID
    let gameId = generateGameId(title, year);
    let idAttempts = 0;
    while (existingIds.has(gameId) && idAttempts < 100) {
      title = title + " II";
      gameId = generateGameId(title, year);
      idAttempts++;
    }
    existingIds.add(gameId);

    // Pick an existing game to copy primary_genre and subgenres from (for realistic combos)
    const templateGame = getRandomElement(existingGames);
    const primaryGenre = templateGame.primary_genre || 'Strategy';
    const subgenres = templateGame.subgenres || [];

    // Lookup genre/medium pool of vectors
    const key = `${primaryGenre}_${medium}`;
    let poolSet = genreMediumVectors[key];
    if (!poolSet || poolSet.size < 4) {
      // Fallback: use a generic category or all vectors
      poolSet = genreMediumVectors[`Strategy_board_game`] || allVectors;
    }
    const pool = Array.from(poolSet);

    // Pick exactly 4-5 vectors
    const numVectors = rand() < 0.5 ? 4 : 5;
    const selectedVectors = [];
    const tempPool = [...pool];
    
    // Safety check if tempPool has fewer vectors than needed
    while (tempPool.length < numVectors) {
      tempPool.push(getRandomElement(globalVectorList));
    }

    for (let v = 0; v < numVectors; v++) {
      const idx = Math.floor(rand() * tempPool.length);
      const chosen = tempPool.splice(idx, 1)[0];
      if (!selectedVectors.includes(chosen)) {
        selectedVectors.push(chosen);
      }
    }

    // Build vector explanations
    const vectorExplanations = {};
    selectedVectors.forEach(vector => {
      const templates = vectorTemplates[vector];
      let template = templates && templates.length > 0 ? getRandomElement(templates) : null;
      if (!template) {
        template = `Rules governing ${vector} are defined in detail in {title}.`;
      }

      // Replace {title} with case-sensitive game title
      let explanation = template.replace(/{title}/g, title);

      // Pad if shorter than 30 characters
      if (explanation.length < 30) {
        explanation += `. In the context of ${title}, this ruleset defines core gameplay mechanics.`;
      }

      vectorExplanations[vector] = explanation;
    });

    // Interpolated description & extract fields
    const description = `Explore the unique rules and tactical gameplay of ${title}, a ${primaryGenre} ${medium} released in ${year}.`;
    const extract = `Explore the unique rules and tactical gameplay of ${title}, a ${primaryGenre} ${medium} released in ${year}.`;

    const newGame = {
      game_id: gameId,
      title: title,
      year: year,
      medium: medium,
      primary_genre: primaryGenre,
      subgenres: subgenres,
      governed_vectors: selectedVectors,
      vector_explanations: vectorExplanations,
      description: description,
      extract: extract
    };

    if (medium === 'ttrpg') {
      newTtrpgs.push(newGame);
    } else {
      newBoardGames.push(newGame);
    }

    // Names entry
    newNamesEntries.push({
      title: title,
      year: year,
      genre: primaryGenre,
      medium: medium
    });
  }

  // 6. Save expanded datasets
  const finalTtrpgs = [...ttrpgs, ...newTtrpgs];
  const finalBoardGames = [...boardGames, ...newBoardGames];
  const finalRegistry = {
    ttrpg: finalTtrpgs,
    board_game: finalBoardGames
  };

  const finalNames = [...registryNames, ...newNamesEntries];

  fs.writeFileSync(registryPath, JSON.stringify(finalRegistry, null, 2), 'utf8');
  fs.writeFileSync(registryNamesPath, JSON.stringify(finalNames, null, 2), 'utf8');

  console.log('Database expanded successfully!');
  console.log(`New TTRPGs: ${newTtrpgs.length}, New Board Games: ${newBoardGames.length}`);
  console.log(`Total games in expanded registry.json: ${finalTtrpgs.length + finalBoardGames.length}`);
  console.log(`Total games in expanded registry_names.json: ${finalNames.length}`);
}

runExpansion();
