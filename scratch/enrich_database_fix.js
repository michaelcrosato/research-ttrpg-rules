const fs = require('fs');
const path = require('path');

const registryPath = path.resolve(__dirname, '../registry.json');

// Exact copy of semanticEnrichment from enrich_database.js
function semanticEnrichment(title, medium, year, description, extract) {
  const combinedText = `${title} ${description || ''} ${extract || ''}`.toLowerCase();
  
  let primary_genre = medium === 'ttrpg' ? 'Adventure' : 'Strategy';
  let subgenres = [];
  let governed_vectors = [];
  let vector_explanations = {};
  
  const addVector = (key, desc) => {
    if (!governed_vectors.includes(key)) {
      governed_vectors.push(key);
      vector_explanations[key] = desc;
    }
  };

  // Determine Genres
  if (medium === 'ttrpg') {
    const isFantasy = /fantasy|magic|dungeon|dragon|sword|sorcery|myth|rune/i.test(combinedText);
    const isSciFi = /science fiction|sci-fi|space|galaxy|cyberpunk|mecha|lancer|futuristic|robot/i.test(combinedText);
    const isHorror = /horror|vampire|zombie|ghost|cthulhu|gothic|darkness|monster/i.test(combinedText);
    
    if (isFantasy) {
      primary_genre = 'Fantasy';
      subgenres.push('High Fantasy');
    } else if (isSciFi) {
      primary_genre = 'Sci-Fi';
      if (/cyberpunk/i.test(combinedText)) subgenres.push('Cyberpunk');
      else if (/space|galaxy/i.test(combinedText)) subgenres.push('Space Opera');
      else subgenres.push('Futuristic');
    } else if (isHorror) {
      primary_genre = 'Horror';
      subgenres.push('Supernatural');
    } else if (/comedy|humor|funny/i.test(combinedText)) {
      primary_genre = 'Comedy';
      subgenres.push('Narrative');
    } else {
      primary_genre = 'Adventure';
      subgenres.push('Narrative');
    }
  } else {
    // Board Games
    const isWargame = /war game|wargame|military|battle|historical battle|panzer|napoleon/i.test(combinedText);
    const isEconomic = /economic|property|trade|trading|business|market|stock|commerce|industrial/i.test(combinedText);
    const isCoop = /cooperative|co-operative|team|collaborative/i.test(combinedText);
    const isAbstract = /abstract strategy|abstract board|tile placement/i.test(combinedText);
    const isParty = /party game|trivia|social|party/i.test(combinedText);
    
    if (isWargame) {
      primary_genre = 'Wargame';
      subgenres.push('Historical');
    } else if (isEconomic) {
      primary_genre = 'Economic';
      subgenres.push('Resource Management');
    } else if (isCoop) {
      primary_genre = 'Cooperative';
      subgenres.push('Campaign');
    } else if (isAbstract) {
      primary_genre = 'Abstract Strategy';
      subgenres.push('Grid Movement');
    } else if (isParty) {
      primary_genre = 'Party';
      subgenres.push('Social');
    } else {
      primary_genre = 'Strategy';
      subgenres.push('Engine Building');
    }
  }

  // Detect Subgenres & Mechanics from keywords
  if (/deck-building|deckbuilding/i.test(combinedText)) subgenres.push('Deck-building');
  if (/worker placement|worker-placement/i.test(combinedText)) subgenres.push('Worker Placement');
  if (/tile placement|tile-placement/i.test(combinedText)) subgenres.push('Tile Placement');
  if (/drafting|card drafting/i.test(combinedText)) subgenres.push('Card Drafting');
  if (/cooperative|co-operative/i.test(combinedText)) subgenres.push('Cooperative');
  if (/dice/i.test(combinedText)) subgenres.push('Dice Rolling');
  if (/deduction|secret|hidden role|mystery/i.test(combinedText)) subgenres.push('Deduction');
  if (/negotiation|trade|barter/i.test(combinedText)) subgenres.push('Trading');
  if (/rules-light|narrative|rules light/i.test(combinedText)) subgenres.push('Rules-Light');
  if (/dungeon crawl|dungeoncrawl/i.test(combinedText)) subgenres.push('Dungeon Crawl');
  if (/campaign|legacy/i.test(combinedText)) subgenres.push('Campaign');
  if (/miniature/i.test(combinedText)) subgenres.push('Miniatures');
  if (/card/i.test(combinedText)) subgenres.push('Card Play');
  
  // Clean duplicates in subgenres
  subgenres = Array.from(new Set(subgenres));
  if (subgenres.length === 0) subgenres.push('General');

  // Vector Assignment based on Subgenres & Medium
  if (medium === 'ttrpg') {
    // Standard TTRPG vectors
    addVector('combat.initiative.dexterity_based', `Initiative order in ${title} is determined by Dexterity-based rolls or character agility stats to coordinate turns.`);
    addVector('combat.melee.tactical', `Features structured melee engagements in ${title} where characters manage weapon ranges and melee attack tests.`);
    addVector('combat.ranged.tactical', `Ranged engagements in ${title} govern projectile and firearm use, tracking weapon range bands and ammunition.`);
    addVector('character.character_creation.class_based', `Character creation in ${title} centers on choosing specific classes or archetypes that define skills and statistics.`);
    addVector('stealth.action.hide', `Includes explicit rules for characters in ${title} attempting to hide and move silently without detection.`);

    // Rules Light & Narrative vectors
    if (subgenres.includes('Rules-Light')) {
      addVector('character.character_creation.playbook_based', `${title} uses narrative character playbooks to establish archetype themes, bonds, and special tags.`);
      addVector('social.persuasion.leverage', `Social conflict in ${title} relies on narrative leverage and relationships rather than numeric skill checks.`);
    }

    // Horror / Sanity vectors
    if (primary_genre === 'Horror' || /stress|sanity|terror|fear/i.test(combinedText)) {
      addVector('character.progression.sanity_loss', `Includes dedicated rules in ${title} to track fear, psychological stress, and sanity deterioration.`);
      addVector('stealth.detection.passive_perception', `NPCs and monsters in ${title} have passive perception thresholds representing their awareness levels.`);
    }

    // Sci-Fi / Cyberpunk vectors
    if (primary_genre === 'Sci-Fi') {
      addVector('combat.damage.armor_ablation', `Armor in ${title} acts as an active shield or barrier, absorbing damage and ablating over time.`);
      addVector('stealth.vision.light_levels', `Governs how stealth interacts with modern sensors, night vision, and lighting levels in ${title}.`);
    }

    // Dungeon Crawling vectors
    if (subgenres.includes('Dungeon Crawl')) {
      addVector('combat.movement.grid_based', `Combat actions in ${title} assume tactical positioning mapped out on grids or hex maps.`);
      addVector('logistics.survival.rations', `Characters in ${title} must track consumable resources like food, water, and light sources.`);
    }
  } else {
    // Board Game vectors
    if (subgenres.includes('Dice Rolling')) {
      addVector('combat.melee.tactical', `${title} resolves battle outcomes using dice rolls, character abilities, and modifier cards.`);
    }
    
    if (primary_genre === 'Wargame' || subgenres.includes('Miniatures')) {
      addVector('combat.movement.grid_based', `Units in ${title} navigate a tactical board or map grid, determining facing, line of sight, and ranges.`);
      addVector('combat.ranged.tactical', `Features ranged units in ${title} that attack across grid coordinates based on firepower values and terrain cover.`);
      addVector('combat.damage.critical_wounds', `Losses in ${title} are recorded by step reductions or unit status tokens.`);
    }

    if (primary_genre === 'Economic' || subgenres.includes('Worker Placement') || subgenres.includes('Deck-building')) {
      addVector('economy.management.resource_allocation', `Players in ${title} allocate actions, workers, or cards to manage their income, builds, and boards.`);
      addVector('character.progression.victory_points', `Score tracking in ${title} is measured by accumulating victory points from cards, developments, and contracts.`);
    }

    if (subgenres.includes('Trading')) {
      addVector('economy.trading.barter', `Allows active negotiation, trade agreements, and direct resource bartering between players in ${title}.`);
    }

    if (subgenres.includes('Deduction')) {
      addVector('stealth.detection.passive_perception', `Secrets, hidden roles, or clues in ${title} must be uncovered using deduction loops and passive board triggers.`);
      addVector('social.deception.insight', `Features bluffing and deception loops in ${title} where players read others to spot hidden identifiers.`);
    }

    if (subgenres.includes('Cooperative')) {
      addVector('logistics.survival.rations', `Cooperative play in ${title} requires players to manage health, sanity, or resources against board events.`);
      addVector('combat.movement.grid_based', `Players coordinate team movement on the board grid in ${title} to prevent containment or outbreak states.`);
      addVector('character.progression.victory_points', `Measures cumulative team scoring or progress metrics before reaching game end triggers in ${title}.`);
    }

    if (primary_genre === 'Abstract Strategy') {
      addVector('combat.movement.grid_based', `Features deterministic, grid-based movements on the board in ${title} with zero luck factor.`);
      addVector('combat.melee.tactical', `Capture mechanics in ${title} are resolved when a piece moves onto opponent-occupied board positions.`);
    }

    // Default Board game vector
    addVector('economy.management.resource_allocation', `Players manage hand limits, token counts, and card action selections to build engines in ${title}.`);
    addVector('character.progression.victory_points', `The winner of ${title} is determined by scoring victory points from card combinations, tracks, and resources.`);
  }

  return { primary_genre, subgenres, governed_vectors, vector_explanations };
}

// Check if manually curated
function isCurated(game) {
  if (!game.governed_vectors || game.governed_vectors.length === 0) {
    return false;
  }
  return game.governed_vectors.some(vec => {
    const exp = game.vector_explanations ? game.vector_explanations[vec] : null;
    return exp && 
           !exp.includes("resolves") && 
           !exp.includes("Initiative order") && 
           !exp.includes("Features structured") && 
           !exp.includes("governed by");
  });
}

// Fallback arrays
const ttrpgFallbacks = [
  'combat.melee.tactical',
  'combat.ranged.tactical',
  'character.character_creation.class_based',
  'combat.initiative.dexterity_based'
];

const boardGameFallbacks = [
  'economy.management.resource_allocation',
  'character.progression.victory_points',
  'combat.movement.grid_based',
  'economy.management.card_drafting'
];

// Helper explanations for fallbacks
const fallbackExplanations = {
  'combat.melee.tactical': (title) => `Engaging in close-quarters melee combat in ${title} requires managing reach, positioning, and tactical action choices.`,
  'combat.ranged.tactical': (title) => `Ranged combat encounters in ${title} govern projectile and firearm use, tracking range bands and ammunition.`,
  'character.character_creation.class_based': (title) => `Character creation in ${title} utilizes distinct classes or archetypes to determine starting skills and stats.`,
  'combat.initiative.dexterity_based': (title) => `Initiative order in ${title} is determined by agility checks or dexterity rolls at the start of combat.`,
  'economy.management.resource_allocation': (title) => `Players in ${title} must manage limited resource pools and actions to build an optimized engine.`,
  'character.progression.victory_points': (title) => `Progression and win conditions in ${title} are tracked through the accumulation of victory points.`,
  'combat.movement.grid_based': (title) => `Pieces and units in ${title} navigate a structured board grid using specific movement rules.`,
  'economy.management.card_drafting': (title) => `Features card drafting in ${title} where players select cards from passing hands to optimize their strategy.`
};

function enrichDatabase() {
  console.log('Loading database from:', registryPath);
  if (!fs.existsSync(registryPath)) {
    console.error('registry.json not found!');
    process.exit(1);
  }

  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const ttrpgs = registry.ttrpg || [];
  const boardGames = registry.board_game || [];
  
  console.log(`Loaded ${ttrpgs.length} TTRPGs and ${boardGames.length} Board Games.`);

  const processGame = (game, medium) => {
    const title = game.title;
    
    // 1. Reprocess if not curated
    const curated = isCurated(game);
    if (!curated) {
      console.log(`Reprocessing automatic game: ${title}`);
      const meta = semanticEnrichment(title, medium, game.year, game.description, game.extract);
      game.primary_genre = meta.primary_genre;
      game.subgenres = meta.subgenres;
      game.governed_vectors = meta.governed_vectors;
      game.vector_explanations = meta.vector_explanations;
    }

    // 2. Ensure governed_vectors is non-empty
    if (!game.governed_vectors) {
      game.governed_vectors = [];
    }
    if (!game.vector_explanations) {
      game.vector_explanations = {};
    }

    // 3. Fallbacks if less than 4 unique vectors
    const fallbacks = medium === 'ttrpg' ? ttrpgFallbacks : boardGameFallbacks;
    let fallbackIdx = 0;
    
    while (game.governed_vectors.length < 4 && fallbackIdx < fallbacks.length) {
      const vec = fallbacks[fallbackIdx];
      if (!game.governed_vectors.includes(vec)) {
        game.governed_vectors.push(vec);
        game.vector_explanations[vec] = fallbackExplanations[vec](title);
      }
      fallbackIdx++;
    }

    // 4. Correction pass over all explanations
    game.governed_vectors.forEach(vec => {
      let exp = game.vector_explanations[vec] || '';
      
      // Check if explanation does not contain the game title or is too short
      const lacksTitle = !exp.includes(title);
      const isShort = exp.length < 30;

      if (lacksTitle || isShort) {
        if (lacksTitle) {
          // Prepend title in a natural grammatical way
          const prefix = `In ${title}, `;
          let firstChar = exp.charAt(0);
          let rest = exp.slice(1);
          if (firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) {
            firstChar = firstChar.toLowerCase();
          }
          exp = prefix + firstChar + rest;
        }
        
        // Ensure minimum length of 30 characters
        if (exp.length < 30) {
          exp = `${exp} This mechanic is a key part of the rules system of ${title}.`;
        }

        game.vector_explanations[vec] = exp;
      }
    });
  };

  ttrpgs.forEach(g => processGame(g, 'ttrpg'));
  boardGames.forEach(g => processGame(g, 'board_game'));

  // Save the updated database to registry.json
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
  console.log('Database enriched and saved to registry.json successfully.');
}

enrichDatabase();
