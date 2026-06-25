const fs = require('fs');
const path = require('path');
const https = require('https');

const registryPath = path.join(__dirname, 'registry.json');
const registryNamesPath = path.join(__dirname, 'registry_names.json');

// Helper to make API requests with User-Agent
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'TTRPGRulesDatabaseHarvester/1.0 (contact: micha@example.com)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}. Content was: ${data.substring(0, 100)}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Helper to clean game titles from Wikipedia page names
function cleanTitle(title) {
  if (!title) return '';
  return title
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s*\((board game|role-playing game|game|boardgame|RPG|card game|play|designer game|wargame|miniatures game|1776 boardgame|dice game|tabletop game|franchise)\)$/i, '')
    .trim();
}

// Generate unique ID for a game
function generateGameId(title, year) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') + '_' + year;
}

// Delay helper to prevent rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Heuristics engine
function classifyGame(title, medium, year) {
  const titleLower = title.toLowerCase();
  
  let primary_genre = 'Strategy';
  let subgenres = [];
  let governed_vectors = [];
  let vector_explanations = {};
  
  const addVector = (key, desc) => {
    governed_vectors.push(key);
    vector_explanations[key] = desc;
  };
  
  if (medium === 'ttrpg') {
    // TTRPG classification
    const isFantasy = /dungeon|dragon|fantasy|sword|sorcery|magic|elf|dwarf|rune|quest|myth|hero|lord|chronicle|legend/i.test(titleLower);
    const isSciFi = /star|space|galaxy|alien|sci-fi|cyberpunk|laser|robot|mech|lancer|tech|retro|ship/i.test(titleLower);
    const isHorror = /cthulhu|horror|dead|zombie|vampire|werewolf|shadow|dark|ghost|terror|monster|masquerade/i.test(titleLower);
    
    if (isFantasy) {
      primary_genre = 'Fantasy';
      subgenres = ['High Fantasy', 'Adventure', 'Dungeon Crawl'];
      addVector('character.character_creation.class_based', `Character creation in ${title} is class-based, defining starting abilities, health pools, and special skill tracks.`);
      addVector('combat.initiative.dexterity_based', `Initiative order in ${title} is rolled at combat start, modified by Dexterity or agility modifiers.`);
      addVector('combat.melee.tactical', `Engaging in melee combat in ${title} requires managing weapon reach, positioning, and close-quarters modifiers.`);
      addVector('combat.ranged.tactical', `Ranged attacks in ${title} require line-of-sight checks, range-band penalties, and ammunition tracking.`);
      addVector('combat.movement.grid_based', `Tactical movement during encounters in ${title} is tracked on a square or hex grid grid to govern positioning.`);
      addVector('simulation.magic.spell_slots', `Spellcasting in ${title} utilizes finite spell slots or mana pools that recharge after a rest.`);
      addVector('logistics.survival.rations', `Characters in ${title} must track rations and water, suffering penalties if they run out during travel.`);
      addVector('stealth.action.hide', `Includes specific stealth actions to hide from hostiles in ${title}, matched against perception thresholds.`);
    } else if (isSciFi) {
      primary_genre = 'Sci-Fi';
      subgenres = ['Space Opera', 'Cybernetics', 'Futuristic'];
      addVector('character.character_creation.tags_traits', `Characters in ${title} select specific traits, cyberware, or tech modules to define their gameplay style.`);
      addVector('combat.initiative.perception_based', `Combat start sequence in ${title} uses sensory or perception checks to determine action order.`);
      addVector('combat.ranged.tactical', `Ranged firefights in ${title} feature cover bonuses, distance scaling, and high-tech ammunition types.`);
      addVector('combat.damage.armor_ablation', `Armor in ${title} reduces incoming damage or gets depleted over time as combat progresses.`);
      addVector('logistics.survival.rations', `Logistical tracking in ${title} includes managing starship supplies, oxygen, or energy cells.`);
      addVector('stealth.vision.light_levels', `Governs how stealth interacts with sensor sweeps, night vision, and lighting conditions in ${title}.`);
    } else if (isHorror) {
      primary_genre = 'Horror';
      subgenres = ['Supernatural', 'Investigation', 'Mystery'];
      addVector('character.progression.sanity_loss', `Tracks fear, stress, or sanity deterioration in ${title} when characters face unnatural terrors.`);
      addVector('stealth.action.hide', `Stealth is a primary survival mechanic in ${title}, with rules for hiding from hostile entities.`);
      addVector('stealth.detection.passive_perception', `NPCs and monsters in ${title} have a detection threshold representing passive vigilance.`);
      addVector('character.character_creation.questionnaire', `Character background in ${title} is partially established via questions about past trauma and relationships.`);
    } else {
      primary_genre = 'Adventure';
      subgenres = ['Action', 'Narrative'];
      addVector('character.character_creation.playbook_based', `Features a playbook or template system in ${title} to streamline character creation and roleplay themes.`);
      addVector('combat.initiative.dexterity_based', `Initiative order in ${title} is checked at combat start to sequence player actions.`);
      addVector('combat.melee.tactical', `Resolves melee attacks in ${title} using character strength, weapon properties, and defense modifiers.`);
    }
  } else {
    // Board Game classification
    const isWargame = /war|battle|combat|panzer|tactical|squad|general|campaign|army|victory|napoleon|waterloo/i.test(titleLower);
    const isEconomic = /trade|economic|capital|business|monopoly|stock|market|rail|merchant|industry|brass|agricola/i.test(titleLower);
    const isCoop = /cooperative|coop|pandemic|arkham|gloomhaven|spirit|survival|island|escape/i.test(titleLower);
    const isAbstract = /chess|checkers|connect|abstract|go|shogi|backgammon/i.test(titleLower);
    
    if (isWargame) {
      primary_genre = 'Wargame';
      subgenres = ['Historical', 'Hex & Counter', 'Tactical Combat'];
      addVector('combat.movement.grid_based', `Forces move across a grid or hex-based map in ${title}, calculating tactical distances and line of sight.`);
      addVector('combat.ranged.tactical', `Units in ${title} engage in ranged combat using weapon ranges, accuracy tables, and cover values.`);
      addVector('combat.damage.critical_wounds', `Combat losses in ${title} are tracked through hit steps, retreats, or step reduction on unit counters.`);
      addVector('logistics.travel.marching_order', `Requires maintaining supply lines and lines of communication across the battlefield in ${title}.`);
    } else if (isEconomic) {
      primary_genre = 'Economic';
      subgenres = ['Resource Management', 'Trading', 'Engine Building'];
      addVector('economy.trading.barter', `Allows direct negotiation and bartering of resources or cards between players in ${title}.`);
      addVector('economy.management.resource_allocation', `Players in ${title} manage an economy of coins, materials, and production engines to maximize points.`);
      addVector('character.progression.victory_points', `The game is scored through victory points in ${title}, accumulated through economic building and card play.`);
    } else if (isCoop) {
      primary_genre = 'Cooperative';
      subgenres = ['Adventure', 'Campaign', 'Survival'];
      addVector('logistics.survival.rations', `Players in ${title} must consume food, maintain gear, or combat disease to survive the campaign boards.`);
      addVector('combat.movement.grid_based', `Features grid or board movements to coordinate player actions against the AI deck in ${title}.`);
      addVector('character.progression.victory_points', `Tracks team success or points accumulated before the defeat condition is triggered in ${title}.`);
    } else if (isAbstract) {
      primary_genre = 'Abstract Strategy';
      subgenres = ['Grid Movement', 'Perfect Information'];
      addVector('combat.movement.grid_based', `Pieces move on a rigid grid board in ${title} with deterministic rules and no random output.`);
      addVector('combat.melee.tactical', `Pieces capture others in ${title} by landing on their grid coordinates under specific movement constraints.`);
    } else {
      primary_genre = 'Strategy';
      subgenres = ['Tableau Building', 'Drafting'];
      addVector('economy.management.resource_allocation', `Requires balancing hand limits, resource spending, and card drafting in ${title}.`);
      addVector('character.progression.victory_points', `Endgame winner in ${title} is determined by aggregating victory points from cards, board position, and resources.`);
    }
  }
  
  return { primary_genre, subgenres, governed_vectors, vector_explanations };
}

// Master execution function
async function run() {
  console.log("=== AUTONOMOUS DATABASE HARVESTER STARTING ===");
  
  // Load existing registry
  let existingRegistry = { ttrpg: [], board_game: [] };
  if (fs.existsSync(registryPath)) {
    try {
      existingRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      console.log(`Loaded existing registry.json: ${existingRegistry.ttrpg.length} TTRPGs, ${existingRegistry.board_game.length} Board Games.`);
    } catch (e) {
      console.error("Error reading registry.json. Starting fresh.", e.message);
    }
  }
  
  // Keep existing curated entries intact in a lookup Map by cleaned title
  const existingLookup = new Map();
  const keepCurated = (list, medium) => {
    list.forEach(game => {
      const key = `${medium}:${cleanTitle(game.title).toLowerCase()}`;
      existingLookup.set(key, game);
    });
  };
  keepCurated(existingRegistry.ttrpg, 'ttrpg');
  keepCurated(existingRegistry.board_game, 'board_game');
  
  // Load registry_names.json names
  let nameEntries = [];
  if (fs.existsSync(registryNamesPath)) {
    try {
      nameEntries = JSON.parse(fs.readFileSync(registryNamesPath, 'utf8'));
      console.log(`Loaded existing registry_names.json: ${nameEntries.length} entries.`);
    } catch (e) {
      console.error("Error reading registry_names.json.", e.message);
    }
  }
  
  // Set up harvested collections
  const ttrpgMap = new Map(); // key: cleaned title -> game object
  const boardGameMap = new Map(); // key: cleaned title -> game object
  
  // Pre-populate with existing nameEntries to preserve database structure
  nameEntries.forEach(entry => {
    const cleaned = cleanTitle(entry.title);
    if (!cleaned) return;
    const targetMap = entry.medium === 'ttrpg' ? ttrpgMap : boardGameMap;
    targetMap.set(cleaned.toLowerCase(), {
      title: cleaned,
      year: entry.year,
      genre: entry.genre,
      medium: entry.medium
    });
  });
  
  console.log("Starting Wikipedia harvesting loop (1974 to 2026)...");
  
  for (let year = 1974; year <= 2026; year++) {
    console.log(`Processing Year ${year}...`);
    
    // Harvest TTRPGs for this year
    try {
      const rpgUrl = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Role-playing_games_introduced_in_${year}&cmlimit=500&format=json`;
      const res = await fetchJson(rpgUrl);
      if (res.query && res.query.categorymembers) {
        let addedCount = 0;
        res.query.categorymembers.forEach(member => {
          if (member.ns === 0) { // Main space articles only
            const title = cleanTitle(member.title);
            const key = title.toLowerCase();
            if (!ttrpgMap.has(key)) {
              ttrpgMap.set(key, { title, year, medium: 'ttrpg' });
              addedCount++;
            }
          }
        });
        if (addedCount > 0) {
          console.log(`  [Wikipedia] Added ${addedCount} TTRPGs for year ${year}`);
        }
      }
    } catch (e) {
      console.warn(`  [Wikipedia Warning] Failed to fetch TTRPGs for ${year}: ${e.message}`);
    }
    
    // Harvest Board Games for this year
    try {
      const bgUrl = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Board_games_introduced_in_${year}&cmlimit=500&format=json`;
      const res = await fetchJson(bgUrl);
      if (res.query && res.query.categorymembers) {
        let addedCount = 0;
        res.query.categorymembers.forEach(member => {
          if (member.ns === 0) { // Main space articles only
            const title = cleanTitle(member.title);
            const key = title.toLowerCase();
            if (!boardGameMap.has(key)) {
              boardGameMap.set(key, { title, year, medium: 'board_game' });
              addedCount++;
            }
          }
        });
        if (addedCount > 0) {
          console.log(`  [Wikipedia] Added ${addedCount} Board Games for year ${year}`);
        }
      }
    } catch (e) {
      console.warn(`  [Wikipedia Warning] Failed to fetch Board Games for ${year}: ${e.message}`);
    }
    
    // Respectful API delay
    await sleep(200);
  }
  
  console.log(`Harvesting complete! Deduped lists contain:`);
  console.log(`  TTRPGs: ${ttrpgMap.size} titles`);
  console.log(`  Board Games: ${boardGameMap.size} titles`);
  
  // Now Compile details and merge with existing curated data
  const finalTtrpgs = [];
  const finalBoardGames = [];
  const finalNamesList = [];
  
  const compileList = (sourceMap, destinationList, medium) => {
    sourceMap.forEach((game, cleanedKey) => {
      const lookupKey = `${medium}:${cleanedKey}`;
      
      // If we already have a curated detailed entry, keep it
      if (existingLookup.has(lookupKey)) {
        const existing = existingLookup.get(lookupKey);
        destinationList.push(existing);
        finalNamesList.push({
          title: existing.title,
          year: existing.year,
          genre: existing.primary_genre,
          medium: medium
        });
        return;
      }
      
      // Otherwise, run heuristics to compile it
      const meta = classifyGame(game.title, medium, game.year);
      const compiled = {
        game_id: generateGameId(game.title, game.year),
        title: game.title,
        year: game.year,
        medium: medium,
        primary_genre: meta.primary_genre,
        subgenres: meta.subgenres,
        governed_vectors: meta.governed_vectors,
        vector_explanations: meta.vector_explanations
      };
      
      destinationList.push(compiled);
      finalNamesList.push({
        title: game.title,
        year: game.year,
        genre: meta.primary_genre,
        medium: medium
      });
    });
  };
  
  compileList(ttrpgMap, finalTtrpgs, 'ttrpg');
  compileList(boardGameMap, finalBoardGames, 'board_game');
  
  // Write Registry files
  const outputRegistry = {
    ttrpg: finalTtrpgs.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title)),
    board_game: finalBoardGames.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title))
  };
  
  fs.writeFileSync(registryPath, JSON.stringify(outputRegistry, null, 2), 'utf8');
  fs.writeFileSync(registryNamesPath, JSON.stringify(finalNamesList.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title)), null, 2), 'utf8');
  
  console.log("=== AUTONOMOUS DATABASE HARVESTER COMPLETED ===");
  console.log(`Saved registry.json: ${outputRegistry.ttrpg.length} TTRPGs, ${outputRegistry.board_game.length} Board Games.`);
  console.log(`Saved registry_names.json: ${finalNamesList.length} flat index entries.`);
  console.log("Registry Database is fully expanded and ready!");
}

run().catch(console.error);
