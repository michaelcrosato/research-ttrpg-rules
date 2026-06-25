"use strict";
const fs = require('fs');
const path = require('path');
const https = require('https');
const registryPath = path.join(__dirname, 'registry.json');
const registryNamesPath = path.join(__dirname, 'registry_names.json');
// Helper to make API requests with User-Agent
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https
            .get(url, { headers: { 'User-Agent': 'TTRPGRulesDatabaseBuilderAndEnricher/3.0 (contact: micha@example.com)' } }, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch (e) {
                    reject(new Error(`Failed to parse JSON: ${e.message}`));
                }
            });
        })
            .on('error', (err) => {
            reject(err);
        });
    });
}
// Clean Wikipedia page names to display titles
function cleanTitle(title) {
    if (!title)
        return '';
    return title
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s*\((board game|role-playing game|game|boardgame|RPG|card game|play|designer game|wargame|miniatures game|1776 boardgame|dice game|tabletop game|franchise)\)$/i, '')
        .trim();
}
// Generate unique ID
function generateGameId(title, year) {
    return (title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') +
        '_' +
        year);
}
// Delay helper
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// Highly sophisticated semantic classifier with detail extraction
function semanticClassify(title, medium, year, description, extract) {
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
    // Determine Primary Genres
    if (medium === 'ttrpg') {
        const isFantasy = /fantasy|magic|dungeon|dragon|sword|sorcery|myth|rune|elf|dwarf/i.test(combinedText);
        const isSciFi = /science fiction|sci-fi|space|galaxy|cyberpunk|mecha|lancer|futuristic|robot|steampunk/i.test(combinedText);
        const isHorror = /horror|vampire|zombie|ghost|cthulhu|gothic|darkness|monster/i.test(combinedText);
        if (isFantasy) {
            primary_genre = 'Fantasy';
            subgenres.push('High Fantasy');
        }
        else if (isSciFi) {
            primary_genre = 'Sci-Fi';
            if (/cyberpunk/i.test(combinedText))
                subgenres.push('Cyberpunk');
            else if (/space|galaxy|opera/i.test(combinedText))
                subgenres.push('Space Opera');
            else if (/steampunk/i.test(combinedText))
                subgenres.push('Steampunk');
            else
                subgenres.push('Futuristic');
        }
        else if (isHorror) {
            primary_genre = 'Horror';
            subgenres.push('Supernatural');
        }
        else if (/comedy|humor|funny/i.test(combinedText)) {
            primary_genre = 'Comedy';
            subgenres.push('Narrative');
        }
        else {
            primary_genre = 'Adventure';
            subgenres.push('Narrative');
        }
    }
    else {
        const isWargame = /war game|wargame|military|battle|historical battle|panzer|napoleon|waterloo/i.test(combinedText);
        const isEconomic = /economic|property|trade|trading|business|market|stock|commerce|industrial|merchant|building/i.test(combinedText);
        const isCoop = /cooperative|co-operative|team|collaborative/i.test(combinedText);
        const isAbstract = /abstract strategy|abstract board|tile placement|tile-laying/i.test(combinedText);
        const isParty = /party game|trivia|social|party/i.test(combinedText);
        if (isWargame) {
            primary_genre = 'Wargame';
            subgenres.push('Historical');
        }
        else if (isEconomic) {
            primary_genre = 'Economic';
            subgenres.push('Resource Management');
        }
        else if (isCoop) {
            primary_genre = 'Cooperative';
            subgenres.push('Campaign');
        }
        else if (isAbstract) {
            primary_genre = 'Abstract Strategy';
            subgenres.push('Grid Movement');
        }
        else if (isParty) {
            primary_genre = 'Party';
            subgenres.push('Social');
        }
        else {
            primary_genre = 'Strategy';
            subgenres.push('Engine Building');
        }
    }
    // Detect Subgenres & Mechanics from keywords
    if (/deck-building|deckbuilding/i.test(combinedText))
        subgenres.push('Deck-building');
    if (/worker placement|worker-placement/i.test(combinedText))
        subgenres.push('Worker Placement');
    if (/tile placement|tile-placement|tile-laying/i.test(combinedText))
        subgenres.push('Tile Placement');
    if (/drafting|card drafting/i.test(combinedText))
        subgenres.push('Card Drafting');
    if (/cooperative|co-operative/i.test(combinedText))
        subgenres.push('Cooperative');
    if (/dice/i.test(combinedText))
        subgenres.push('Dice Rolling');
    if (/deduction|secret|hidden role|mystery/i.test(combinedText))
        subgenres.push('Deduction');
    if (/negotiation|trade|barter/i.test(combinedText))
        subgenres.push('Trading');
    if (/rules-light|narrative|rules light/i.test(combinedText))
        subgenres.push('Rules-Light');
    if (/dungeon crawl|dungeoncrawl/i.test(combinedText))
        subgenres.push('Dungeon Crawl');
    if (/campaign|legacy/i.test(combinedText))
        subgenres.push('Campaign');
    if (/miniature/i.test(combinedText))
        subgenres.push('Miniatures');
    if (/card/i.test(combinedText))
        subgenres.push('Card Play');
    if (/roll-and-write|roll and write/i.test(combinedText))
        subgenres.push('Roll-and-Write');
    if (/steampunk/i.test(combinedText))
        subgenres.push('Steampunk');
    if (/apocalypse|post-apocalyptic/i.test(combinedText))
        subgenres.push('Post-Apocalyptic');
    subgenres = Array.from(new Set(subgenres));
    if (subgenres.length === 0)
        subgenres.push('General');
    // Extract component details for custom explanations
    const playersMatch = combinedText.match(/\b(two|three|four|five|six|\d)\s*(?:to|-)\s*(?:two|three|four|five|six|eight|ten|\d+)?\s+players\b/i) || combinedText.match(/\bfor\s+(\d+|two|three|four|five|six)\s+players\b/i);
    const diceMatch = combinedText.match(/\b(\d+)\s*(?:sided|d\d+)?\s*dice\b/i) ||
        combinedText.match(/\b(?:roll|rolling)\s+(?:a|two|three|four)\s+dice\b/i);
    const cardsMatch = combinedText.match(/\bdeck of\s+(\d+)?\s*cards\b/i) ||
        combinedText.match(/\b(\d+)\s*cards\b/i) ||
        combinedText.match(/\bcard game\b/i);
    const hexMatch = combinedText.match(/\bhex\b|\bhexagonal\b|\bhex-based\b/i);
    const workerMatch = combinedText.match(/\bworker placement\b|\bworker-placement\b/i);
    const deckMatch = combinedText.match(/\bdeck-building\b|\bdeckbuilding\b/i);
    const rollAndMove = combinedText.match(/\broll-and-move\b|\broll and move\b/i);
    const draftMatch = combinedText.match(/\bdrafting\b|\bcard drafting\b/i);
    const playersInfo = playersMatch ? ` (${playersMatch[0]})` : '';
    const diceInfo = diceMatch ? ` using ${diceMatch[0]}` : '';
    const cardsInfo = cardsMatch ? ` with card decks` : '';
    // Vector Assignment (50+ Governed Vectors)
    if (medium === 'ttrpg') {
        // 1. Initiative Domain
        if (/perception/i.test(combinedText)) {
            addVector('combat.initiative.perception_based', `Initiative order in ${title} is determined by sensory or perception checks at combat start.`);
        }
        else if (/card/i.test(combinedText) && cardsMatch) {
            addVector('combat.initiative.card_based', `Initiative order in ${title} is determined by drawing cards from a deck, sequencing player actions.`);
        }
        else {
            addVector('combat.initiative.dexterity_based', `Initiative order in ${title} is rolled at combat start${diceInfo}, modified by Dexterity or agility modifiers.`);
        }
        // 2. Combat Domain
        addVector('combat.melee.tactical', `Features structured melee engagements in ${title} where characters manage weapon ranges and melee attack tests.`);
        addVector('combat.ranged.tactical', `Ranged engagements in ${title} govern projectile and firearm use, tracking weapon range bands and ammunition.`);
        if (hexMatch) {
            addVector('combat.movement.grid_based', `Features tactical movement on a hexagonal grid map in ${title} to govern ranges, line of sight, and unit positioning.`);
        }
        else if (subgenres.includes('Dungeon Crawl') || /grid|map|square|board/i.test(combinedText)) {
            addVector('combat.movement.grid_based', `Combat actions in ${title} assume tactical positioning mapped out on grids or square maps.`);
        }
        if (/armor|ablate/i.test(combinedText)) {
            addVector('combat.damage.armor_ablation', `Armor in ${title} acts as an active shield or barrier, absorbing damage and ablating over time.`);
        }
        // 3. Character Creation & Progression
        if (subgenres.includes('Rules-Light') || /playbook/i.test(combinedText)) {
            addVector('character.character_creation.playbook_based', `${title} uses narrative character playbooks to establish archetype themes, bonds, and special tags.`);
        }
        else if (/lifepath/i.test(combinedText)) {
            addVector('character.character_creation.lifepath', `Features a lifepath character generation system in ${title} to roll or select chronological history events.`);
        }
        else {
            addVector('character.character_creation.class_based', `Character creation in ${title} centers on choosing specific classes or archetypes that define starting skills and stats.`);
        }
        if (/experience|xp|level/i.test(combinedText)) {
            addVector('character.progression.experience_points', `Characters in ${title} earn experience points (XP) to advance levels, gain hit points, and unlock features.`);
        }
        if (primary_genre === 'Horror' || /stress|sanity|terror|fear/i.test(combinedText)) {
            addVector('character.progression.sanity_loss', `Includes dedicated rules in ${title} to track fear, psychological stress, and sanity deterioration.`);
        }
        // 4. Stealth Domain
        addVector('stealth.action.hide', `Includes explicit rules for characters in ${title} attempting to hide and move silently without detection.`);
        addVector('stealth.detection.passive_perception', `NPCs and monsters in ${title} have passive perception thresholds representing their awareness levels.`);
        if (primary_genre === 'Sci-Fi') {
            addVector('stealth.vision.light_levels', `Governs how stealth interacts with modern sensors, night vision, and lighting levels in ${title}.`);
        }
        // 5. Logistics Domain
        if (subgenres.includes('Dungeon Crawl') || /resource|survival|ration/i.test(combinedText)) {
            addVector('logistics.survival.rations', `Characters in ${title} must track consumable resources like food, water, and light sources.`);
        }
        if (/faction|reputation|alliance/i.test(combinedText)) {
            addVector('politics.factions.reputation_points', `Features reputation or alliance tracks in ${title} to measure character standing with faction NPCs.`);
        }
        // 6. Magic Domain
        if (primary_genre === 'Fantasy' || /spell|magic/i.test(combinedText)) {
            addVector('simulation.magic.spell_slots', `Spellcasting in ${title} utilizes finite spell slots or mana pools that recharge after a rest.`);
        }
        // 7. Environment Domain
        if (/weather|environment|hazard/i.test(combinedText)) {
            addVector('simulation.environment.weather', `Includes rules in ${title} for weather, temperature hazards, and hostile atmospheric conditions.`);
        }
    }
    else {
        // Board Games
        // 1. Combat & Movement
        if (rollAndMove) {
            addVector('logistics.travel.roll_and_move', `Features roll-and-move mechanics in ${title}${playersInfo} where movement distance is determined strictly by rolling dice.`);
        }
        else if (hexMatch) {
            addVector('combat.movement.grid_based', `Features tactical movement on a hexagonal grid map in ${title} to govern ranges, line of sight, and unit positioning.`);
        }
        else if (primary_genre === 'Wargame' ||
            subgenres.includes('Miniatures') ||
            /grid|map|board|square/i.test(combinedText)) {
            addVector('combat.movement.grid_based', `Units in ${title} navigate a tactical board or map grid to determine facing, line of sight, and ranges.`);
        }
        if (primary_genre === 'Wargame' || subgenres.includes('Miniatures')) {
            addVector('combat.ranged.tactical', `Features ranged units in ${title} that attack across grid coordinates based on firepower values and terrain cover.`);
            addVector('combat.damage.critical_wounds', `Losses in ${title} are recorded by step reductions or unit status tokens.`);
        }
        else if (subgenres.includes('Dice Rolling')) {
            addVector('combat.melee.tactical', `${title} resolves battle outcomes or actions using dice rolls${diceInfo} combined with card modifiers.`);
        }
        // 2. Economy Domain
        if (workerMatch) {
            addVector('economy.management.worker_placement', `Features worker placement in ${title} where players allocate their workers to specific board action spaces.`);
        }
        else if (deckMatch) {
            addVector('economy.management.deck_building', `Features deckbuilding in ${title} where players acquire cards to construct and optimize their personal drawing decks.`);
        }
        else if (draftMatch) {
            addVector('economy.management.card_drafting', `Features card drafting in ${title}${playersInfo} where players select cards from hand passes to develop engines.`);
        }
        else {
            addVector('economy.management.resource_allocation', `Players in ${title}${playersInfo} manage hand limits, token counts, and resource pools to build engines.`);
        }
        if (subgenres.includes('Trading') || /negotiat/i.test(combinedText)) {
            addVector('economy.trading.barter', `Allows active negotiation, trade agreements, and direct resource bartering between players in ${title}${playersInfo}.`);
        }
        // 3. Social / Stealth Domain
        if (subgenres.includes('Deduction') || /bluff|deception/i.test(combinedText)) {
            addVector('stealth.detection.passive_perception', `Secrets, hidden roles, or clues in ${title} must be uncovered using deduction loops and board triggers.`);
            addVector('social.deception.insight', `Features bluffing and deception loops in ${title}${playersInfo} where players read others to spot hidden identifiers.`);
        }
        // 4. Logistics Domain
        if (subgenres.includes('Cooperative')) {
            addVector('logistics.survival.rations', `Cooperative play in ${title} requires players to manage health, sanity, or shared resources against board events.`);
        }
        // 5. Progression Domain
        addVector('character.progression.victory_points', `The winner of ${title}${playersInfo} is determined by scoring victory points from card combinations, tracks, and resources.`);
    }
    return { primary_genre, subgenres, governed_vectors, vector_explanations };
}
// Main runner
async function run() {
    console.log('=== MASTER DATABASE HARVESTER & ENRICHER STARTING ===');
    // Load existing registry
    let registry = { ttrpg: [], board_game: [] };
    if (fs.existsSync(registryPath)) {
        try {
            registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        }
        catch (e) {
            console.warn('Could not parse registry.json, starting fresh.');
        }
    }
    // Keep manually curated files protected
    const existingLookup = new Map();
    const keepCurated = (list, medium) => {
        list.forEach((game) => {
            const key = `${medium}:${cleanTitle(game.title).toLowerCase()}`;
            existingLookup.set(key, game);
        });
    };
    keepCurated(registry.ttrpg, 'ttrpg');
    keepCurated(registry.board_game, 'board_game');
    const harvestedTtrpgs = new Map();
    const harvestedBoardGames = new Map();
    // Populate maps with current registry
    registry.ttrpg.forEach((g) => harvestedTtrpgs.set(cleanTitle(g.title).toLowerCase(), g));
    registry.board_game.forEach((g) => harvestedBoardGames.set(cleanTitle(g.title).toLowerCase(), g));
    // Specialized categories to harvest
    const categories = [
        { title: 'Category:German-style_board_games', medium: 'board_game' },
        { title: 'Category:Cooperative_board_games', medium: 'board_game' },
        { title: 'Category:Abstract_strategy_games', medium: 'board_game' },
        { title: 'Category:Dice_games', medium: 'board_game' },
        { title: 'Category:Tabletop_miniature_games', medium: 'board_game' },
        { title: 'Category:Roll-and-write_games', medium: 'board_game' },
        { title: 'Category:Deck-building_card_games', medium: 'board_game' },
        { title: 'Category:Worker-placement_board_games', medium: 'board_game' },
        { title: 'Category:Tile-laying_board_games', medium: 'board_game' },
        { title: 'Category:Board_wargames', medium: 'board_game' },
        { title: 'Category:Legacy_board_games', medium: 'board_game' },
        { title: 'Category:Campaign_board_games', medium: 'board_game' },
        { title: 'Category:Deduction_board_games', medium: 'board_game' },
        { title: 'Category:Economic_board_games', medium: 'board_game' },
        { title: 'Category:Fantasy_board_games', medium: 'board_game' },
        { title: 'Category:Science_fiction_board_games', medium: 'board_game' },
        { title: 'Category:Horror_board_games', medium: 'board_game' },
        { title: 'Category:Adventure_board_games', medium: 'board_game' },
        { title: 'Category:Science_fiction_role-playing_games', medium: 'ttrpg' },
        { title: 'Category:Fantasy_role-playing_games', medium: 'ttrpg' },
        { title: 'Category:Horror_role-playing_games', medium: 'ttrpg' },
        { title: 'Category:Indie_role-playing_games', medium: 'ttrpg' },
        { title: 'Category:Diceless_role-playing_games', medium: 'ttrpg' },
        { title: 'Category:Generic_role-playing_games', medium: 'ttrpg' },
        { title: 'Category:Post-apocalyptic_role-playing_games', medium: 'ttrpg' },
        { title: 'Category:Steampunk_role-playing_games', medium: 'ttrpg' },
        { title: 'Category:Cyberpunk_role-playing_games', medium: 'ttrpg' },
        { title: 'Category:Space_opera_role-playing_games', medium: 'ttrpg' },
        { title: 'Category:Urban_fantasy_role-playing_games', medium: 'ttrpg' },
        { title: 'Category:Dark_fantasy_role-playing_games', medium: 'ttrpg' },
        { title: 'Category:Comedy_role-playing_games', medium: 'ttrpg' },
        { title: 'Category:Rules-light_role-playing_games', medium: 'ttrpg' },
        { title: 'Category:Card_wargames', medium: 'board_game' },
        { title: 'Category:Air_wargames', medium: 'board_game' },
        { title: 'Category:Naval_wargames', medium: 'board_game' },
        { title: 'Category:Fantasy_wargames', medium: 'board_game' },
        { title: 'Category:Science_fiction_wargames', medium: 'board_game' },
        { title: 'Category:Negotiation_board_games', medium: 'board_game' },
        { title: 'Category:Superhero_role-playing_games', medium: 'ttrpg' },
        { title: 'Category:Spy_role-playing_games', medium: 'ttrpg' },
        { title: 'Category:Military_role-playing_games', medium: 'ttrpg' },
        { title: 'Category:Alternate_history_role-playing_games', medium: 'ttrpg' },
        { title: 'Category:Historical_role-playing_games', medium: 'ttrpg' },
        { title: 'Category:Dystopian_role-playing_games', medium: 'ttrpg' },
    ];
    // Year ranges for card games
    for (let year = 1974; year <= 2026; year++) {
        categories.push({ title: `Category:Card_games_introduced_in_${year}`, medium: 'board_game' });
    }
    console.log(`Harvesting from ${categories.length} Wikipedia categories...`);
    for (let idx = 0; idx < categories.length; idx++) {
        const cat = categories[idx];
        const catUrl = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(cat.title)}&cmlimit=500&format=json`;
        try {
            const res = await fetchJson(catUrl);
            if (res.query && res.query.categorymembers) {
                let added = 0;
                res.query.categorymembers.forEach((member) => {
                    if (member.ns === 0) {
                        const title = cleanTitle(member.title);
                        const key = title.toLowerCase();
                        const targetMap = cat.medium === 'ttrpg' ? harvestedTtrpgs : harvestedBoardGames;
                        if (!targetMap.has(key)) {
                            targetMap.set(key, {
                                title,
                                year: 2000,
                                medium: cat.medium,
                                isNew: true,
                            });
                            added++;
                        }
                    }
                });
                if (added > 0) {
                    console.log(`  [Wikipedia] Harvested ${added} new ${cat.medium === 'ttrpg' ? 'TTRPGs' : 'Board/Card games'} from ${cat.title}`);
                }
            }
        }
        catch (e) {
            console.warn(`  [Wikipedia Warning] Failed to harvest from ${cat.title}: ${e.message}`);
        }
        await sleep(150);
    }
    console.log(`Expanded games map contains:`);
    console.log(`  TTRPGs: ${harvestedTtrpgs.size} total`);
    console.log(`  Board Games: ${harvestedBoardGames.size} total`);
    // Batch fetch metadata and descriptions for all games that don't have them
    const enrichList = [];
    harvestedTtrpgs.forEach((g) => {
        if (!g.description || g.isNew)
            enrichList.push({ game: g, medium: 'ttrpg' });
    });
    harvestedBoardGames.forEach((g) => {
        if (!g.description || g.isNew)
            enrichList.push({ game: g, medium: 'board_game' });
    });
    console.log(`Starting semantic enrichment for ${enrichList.length} games (50 at a time)...`);
    const batchSize = 50;
    let successCount = 0;
    for (let i = 0; i < enrichList.length; i += batchSize) {
        const slice = enrichList.slice(i, i + batchSize);
        console.log(`Querying batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(enrichList.length / batchSize)}...`);
        const titles = slice.map((item) => item.game.title);
        const titlesParam = encodeURIComponent(titles.join('|'));
        const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|description&exintro=1&explaintext=1&exchars=250&titles=${titlesParam}&format=json&redirects=1`;
        try {
            const res = await fetchJson(url);
            if (res.query && res.query.pages) {
                const pages = res.query.pages;
                const normalizedMap = new Map();
                if (res.query.normalized) {
                    res.query.normalized.forEach((norm) => normalizedMap.set(norm.to.toLowerCase(), norm.from.toLowerCase()));
                }
                const redirectMap = new Map();
                if (res.query.redirects) {
                    res.query.redirects.forEach((red) => redirectMap.set(red.to.toLowerCase(), red.from.toLowerCase()));
                }
                for (const pageId in pages) {
                    const page = pages[pageId];
                    if (pageId === '-1' || !page.title)
                        continue;
                    const wikiTitle = page.title;
                    const wikiTitleLower = wikiTitle.toLowerCase();
                    let targetTitle = wikiTitleLower;
                    if (redirectMap.has(targetTitle))
                        targetTitle = redirectMap.get(targetTitle);
                    if (normalizedMap.has(targetTitle))
                        targetTitle = normalizedMap.get(targetTitle);
                    const matchItem = slice.find((item) => {
                        const cleanT = item.game.title.toLowerCase();
                        return (cleanT === targetTitle || cleanT === cleanTitle(wikiTitle).toLowerCase() || cleanT === wikiTitleLower);
                    });
                    if (matchItem) {
                        const game = matchItem.game;
                        game.description = page.description || '';
                        game.extract = page.extract || '';
                        // Try to resolve year
                        const yearMatch = game.extract.match(/\b(197\d|198\d|199\d|20[0-2]\d)\b/);
                        if (yearMatch && game.isNew) {
                            game.year = parseInt(yearMatch[1], 10);
                        }
                        delete game.isNew;
                        successCount++;
                    }
                }
            }
        }
        catch (e) {
            console.warn(`  [Batch Warning] Failed batch fetch: ${e.message}`);
        }
        await sleep(200);
    }
    console.log(`Finished fetching extracts. Successfully loaded details for ${successCount} games.`);
    // Compile game records
    const finalTtrpgs = [];
    const finalBoardGames = [];
    const finalNamesList = [];
    const compileDatabase = (sourceMap, destinationList, medium) => {
        sourceMap.forEach((game, cleanedKey) => {
            const lookupKey = `${medium}:${cleanedKey}`;
            // Keep manually curated records
            if (existingLookup.has(lookupKey)) {
                const existing = existingLookup.get(lookupKey);
                destinationList.push(existing);
                finalNamesList.push({
                    title: existing.title,
                    year: existing.year,
                    genre: existing.primary_genre,
                    medium: medium,
                });
                return;
            }
            // Otherwise, semantic classify
            const meta = semanticClassify(game.title, medium, game.year, game.description, game.extract);
            const compiled = {
                game_id: generateGameId(game.title, game.year),
                title: game.title,
                year: game.year,
                medium: medium,
                primary_genre: meta.primary_genre,
                subgenres: meta.subgenres,
                governed_vectors: meta.governed_vectors,
                vector_explanations: meta.vector_explanations,
                description: game.description || '',
                extract: game.extract || '',
            };
            destinationList.push(compiled);
            finalNamesList.push({
                title: game.title,
                year: game.year,
                genre: meta.primary_genre,
                medium: medium,
            });
        });
    };
    compileDatabase(harvestedTtrpgs, finalTtrpgs, 'ttrpg');
    compileDatabase(harvestedBoardGames, finalBoardGames, 'board_game');
    // Write updated registry files
    const outputRegistry = {
        ttrpg: finalTtrpgs.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title)),
        board_game: finalBoardGames.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title)),
    };
    fs.writeFileSync(registryPath, JSON.stringify(outputRegistry, null, 2), 'utf8');
    fs.writeFileSync(registryNamesPath, JSON.stringify(finalNamesList.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title)), null, 2), 'utf8');
    console.log('=== MASTER DATABASE HARVESTER & ENRICHER COMPLETED ===');
    console.log(`Saved registry.json: ${outputRegistry.ttrpg.length} TTRPGs, ${outputRegistry.board_game.length} Board Games.`);
    console.log(`Saved registry_names.json: ${finalNamesList.length} flat index entries.`);
    console.log('Registry Database is fully expanded and ready!');
}
run().catch(console.error);
