const fs = require('fs');
const path = require('path');
const https = require('https');

const registryPath = path.join(__dirname, '..', 'registry.json');
const registryNamesPath = path.join(__dirname, '..', 'registry_names.json');

// Helper to make API requests with User-Agent
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'TTRPGRulesDatabaseEnricher/1.0 (contact: micha@example.com)' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${e.message}. Content length: ${data.length}`));
          }
        });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

// Clean Wikipedia titles
function cleanTitle(title) {
  if (!title) return '';
  return title
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(
      /\s*\((board game|role-playing game|game|boardgame|RPG|card game|play|designer game|wargame|miniatures game|1776 boardgame|dice game|tabletop game|franchise)\)$/i,
      ''
    )
    .trim();
}

// Sleep helper
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Subgenres extraction & rules enrichment engine
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
    addVector(
      'combat.initiative.dexterity_based',
      `Initiative order in ${title} is determined by Dexterity-based rolls or character agility stats to coordinate turns.`
    );
    addVector(
      'combat.melee.tactical',
      `Features structured melee engagements in ${title} where characters manage weapon ranges and melee attack tests.`
    );
    addVector(
      'combat.ranged.tactical',
      `Ranged engagements in ${title} govern projectile and firearm use, tracking weapon range bands and ammunition.`
    );
    addVector(
      'character.character_creation.class_based',
      `Character creation in ${title} centers on choosing specific classes or archetypes that define skills and statistics.`
    );
    addVector(
      'stealth.action.hide',
      `Includes explicit rules for characters in ${title} attempting to hide and move silently without detection.`
    );

    // Rules Light & Narrative vectors
    if (subgenres.includes('Rules-Light')) {
      addVector(
        'character.character_creation.playbook_based',
        `${title} uses narrative character playbooks to establish archetype themes, bonds, and special tags.`
      );
      addVector(
        'social.persuasion.leverage',
        `Social conflict in ${title} relies on narrative leverage and relationships rather than numeric skill checks.`
      );
    }

    // Horror / Sanity vectors
    if (primary_genre === 'Horror' || /stress|sanity|terror|fear/i.test(combinedText)) {
      addVector(
        'character.progression.sanity_loss',
        `Includes dedicated rules in ${title} to track fear, psychological stress, and sanity deterioration.`
      );
      addVector(
        'stealth.detection.passive_perception',
        `NPCs and monsters in ${title} have passive perception thresholds representing their awareness levels.`
      );
    }

    // Sci-Fi / Cyberpunk vectors
    if (primary_genre === 'Sci-Fi') {
      addVector(
        'combat.damage.armor_ablation',
        `Armor in ${title} acts as an active shield or barrier, absorbing damage and ablating over time.`
      );
      addVector(
        'stealth.vision.light_levels',
        `Governs how stealth interacts with modern sensors, night vision, and lighting levels in ${title}.`
      );
    }

    // Dungeon Crawling vectors
    if (subgenres.includes('Dungeon Crawl')) {
      addVector(
        'combat.movement.grid_based',
        `Combat actions in ${title} assume tactical positioning mapped out on grids or hex maps.`
      );
      addVector(
        'logistics.survival.rations',
        `Characters in ${title} must track consumable resources like food, water, and light sources.`
      );
    }
  } else {
    // Board Game vectors
    if (subgenres.includes('Dice Rolling')) {
      addVector(
        'combat.melee.tactical',
        `${title} resolves battle outcomes using dice rolls, character abilities, and modifier cards.`
      );
    }

    if (primary_genre === 'Wargame' || subgenres.includes('Miniatures')) {
      addVector(
        'combat.movement.grid_based',
        `Units in ${title} navigate a tactical board or map grid, determining facing, line of sight, and ranges.`
      );
      addVector(
        'combat.ranged.tactical',
        `Features ranged units in ${title} that attack across grid coordinates based on firepower values and terrain cover.`
      );
      addVector(
        'combat.damage.critical_wounds',
        `Losses in ${title} are recorded by step reductions or unit status tokens.`
      );
    }

    if (primary_genre === 'Economic' || subgenres.includes('Worker Placement') || subgenres.includes('Deck-building')) {
      addVector(
        'economy.management.resource_allocation',
        `Players in ${title} allocate actions, workers, or cards to manage their income, builds, and boards.`
      );
      addVector(
        'character.progression.victory_points',
        `Score tracking in ${title} is measured by accumulating victory points from cards, developments, and contracts.`
      );
    }

    if (subgenres.includes('Trading')) {
      addVector(
        'economy.trading.barter',
        `Allows active negotiation, trade agreements, and direct resource bartering between players in ${title}.`
      );
    }

    if (subgenres.includes('Deduction')) {
      addVector(
        'stealth.detection.passive_perception',
        `Secrets, hidden roles, or clues in ${title} must be uncovered using deduction loops and passive board triggers.`
      );
      addVector(
        'social.deception.insight',
        `Features bluffing and deception loops in ${title} where players read others to spot hidden identifiers.`
      );
    }

    if (subgenres.includes('Cooperative')) {
      addVector(
        'logistics.survival.rations',
        `Cooperative play in ${title} requires players to manage health, sanity, or resources against board events.`
      );
      addVector(
        'combat.movement.grid_based',
        `Players coordinate team movement on the board grid in ${title} to prevent containment or outbreak states.`
      );
      addVector(
        'character.progression.victory_points',
        `Measures cumulative team scoring or progress metrics before reaching game end triggers in ${title}.`
      );
    }

    if (primary_genre === 'Abstract Strategy') {
      addVector(
        'combat.movement.grid_based',
        `Features deterministic, grid-based movements on the board in ${title} with zero luck factor.`
      );
      addVector(
        'combat.melee.tactical',
        `Capture mechanics in ${title} are resolved when a piece moves onto opponent-occupied board positions.`
      );
    }

    // Default Board game vector
    addVector(
      'economy.management.resource_allocation',
      `Players manage hand limits, token counts, and card action selections to build engines in ${title}.`
    );
    addVector(
      'character.progression.victory_points',
      `The winner of ${title} is determined by scoring victory points from card combinations, tracks, and resources.`
    );
  }

  return { primary_genre, subgenres, governed_vectors, vector_explanations };
}

// Main processing
async function run() {
  console.log('=== SEMANTIC DATA ENRICHER STARTING ===');

  if (!fs.existsSync(registryPath)) {
    console.error('registry.json not found. Run builder first!');
    process.exit(1);
  }

  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const allTtrpgs = registry.ttrpg;
  const allBoardGames = registry.board_game;

  console.log(`Loaded registry.json: ${allTtrpgs.length} TTRPGs, ${allBoardGames.length} Board Games.`);

  // Combine all items to fetch details for
  const gamesList = [
    ...allTtrpgs.map((g) => ({ game: g, medium: 'ttrpg' })),
    ...allBoardGames.map((g) => ({ game: g, medium: 'board_game' })),
  ];

  console.log(`Starting batch metadata requests from Wikipedia API (50 at a time)...`);

  // Group into batches of 50
  const batchSize = 50;
  let successCount = 0;

  for (let i = 0; i < gamesList.length; i += batchSize) {
    const slice = gamesList.slice(i, i + batchSize);
    console.log(
      `Querying batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(gamesList.length / batchSize)} (indices ${i} to ${i + slice.length - 1})...`
    );

    // Wikipedia API works best with exact page names. Since some titles are modified, we query Wikipedia using their titles.
    // To handle disambiguation, we try using page names like "Game Title" and "Game Title (board game)" or "Game Title (role-playing game)"
    // For safety, we query the exact title stored in the DB (which corresponds to its Wikipedia page name before cleanTitle)
    // Wait! Let's lookup the actual Wikipedia page title. If it wasn't preserved, we construct it.
    const titles = slice.map((item) => {
      // Re-add standard qualifiers to hit Wikipedia exactly
      const t = item.game.title;
      if (item.medium === 'ttrpg') {
        // Most TTRPG pages have (role-playing game) or (roleplaying game) disambiguators if they overlap with something else.
        // We query the original title and secondary titles if needed, but querying the clean title works in most cases due to Wikipedia search redirection.
        return t;
      } else {
        return t;
      }
    });

    try {
      const titlesParam = encodeURIComponent(titles.join('|'));
      const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|description&exintro=1&explaintext=1&exchars=250&titles=${titlesParam}&format=json&redirects=1`;

      const res = await fetchJson(url);

      if (res.query && res.query.pages) {
        const pages = res.query.pages;

        // Build maps for matching redirects and normalized page titles
        const normalizedMap = new Map();
        if (res.query.normalized) {
          res.query.normalized.forEach((norm) => {
            normalizedMap.set(norm.to.toLowerCase(), norm.from.toLowerCase());
          });
        }

        const redirectMap = new Map();
        if (res.query.redirects) {
          res.query.redirects.forEach((red) => {
            redirectMap.set(red.to.toLowerCase(), red.from.toLowerCase());
          });
        }

        // Process each returned page
        for (const pageId in pages) {
          const page = pages[pageId];
          if (pageId === '-1' || !page.title) continue;

          const wikiTitle = page.title;
          const wikiTitleLower = wikiTitle.toLowerCase();

          // Trace back to original title in our batch
          let targetTitle = wikiTitleLower;
          if (redirectMap.has(targetTitle)) {
            targetTitle = redirectMap.get(targetTitle);
          }
          if (normalizedMap.has(targetTitle)) {
            targetTitle = normalizedMap.get(targetTitle);
          }

          // Match against games in the current slice
          const matchItem = slice.find((item) => {
            const cleanT = item.game.title.toLowerCase();
            return (
              cleanT === targetTitle || cleanT === cleanTitle(wikiTitle).toLowerCase() || cleanT === wikiTitleLower
            );
          });

          if (matchItem) {
            const game = matchItem.game;
            game.description = page.description || '';
            game.extract = page.extract || '';

            // Enrich with semantic heuristics
            // Skip games that are already heavily curated in registry.json (e.g. have manual descriptions that don't match placeholders)
            // Manual entries in registry.json typically have custom descriptions.
            // Let's check if the existing vector explanations contain placeholder keys.
            // If they are curated (e.g. they don't match the templates), we keep them but still add the wiki description and extract.
            const isCurated = game.governed_vectors.some((vec) => {
              const exp = game.vector_explanations[vec];
              // If explanation does not contain boilerplate templates, it's curated!
              return (
                exp &&
                !exp.includes('resolves') &&
                !exp.includes('Initiative order') &&
                !exp.includes('Features structured') &&
                !exp.includes('governed by')
              );
            });

            if (!isCurated) {
              const meta = semanticEnrichment(game.title, matchItem.medium, game.year, game.description, game.extract);
              game.primary_genre = meta.primary_genre;
              game.subgenres = meta.subgenres;
              game.governed_vectors = meta.governed_vectors;
              game.vector_explanations = meta.vector_explanations;
            }

            successCount++;
          }
        }
      }
    } catch (e) {
      console.warn(`  [Batch Error] Batch failed: ${e.message}`);
    }

    // Rate limit delay
    await sleep(250);
  }

  console.log(`Enrichment complete! Successfully enriched ${successCount} games with Wikipedia descriptions.`);

  // Sort and write registry.json back
  registry.ttrpg = allTtrpgs.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  registry.board_game = allBoardGames.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));

  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');

  // Update registry_names.json to match final genres
  const namesList = [];
  registry.ttrpg.forEach((g) => {
    namesList.push({ title: g.title, year: g.year, genre: g.primary_genre, medium: 'ttrpg' });
  });
  registry.board_game.forEach((g) => {
    namesList.push({ title: g.title, year: g.year, genre: g.primary_genre, medium: 'board_game' });
  });

  fs.writeFileSync(
    registryNamesPath,
    JSON.stringify(
      namesList.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title)),
      null,
      2
    ),
    'utf8'
  );

  console.log(`Enriched files saved successfully!`);
}

run().catch(console.error);
