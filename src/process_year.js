const fs = require('fs');
const path = require('path');

const statePath = path.join(__dirname, 'state.json');
const registryPath = path.join(__dirname, 'registry_names.json');

// Dataset definition for years 1982 to 2026
const dbArchive = {
  1982: {
    ttrpg: [
      { "title": "Star Frontiers", "genre": "Sci-Fi" },
      { "title": "Daredevils", "genre": "Pulp Action" },
      { "title": "Fringeworthy", "genre": "Sci-Fi" },
      { "title": "Swordbearer", "genre": "Fantasy" },
      { "title": "Gangbusters", "genre": "Crime" },
      { "title": "Behind Enemy Lines", "genre": "Military" },
      { "title": "Ysgarth", "genre": "Fantasy" },
      { "title": "Star Patrol", "genre": "Sci-Fi" },
      { "title": "Pathfinder (Old OGL)", "genre": "Fantasy" },
      { "title": "Mercenaries, Spies and Private Eyes", "genre": "Espionage" },
      { "title": "Man, Myth & Magic", "genre": "Fantasy" },
      { "title": "Lands of Adventure", "genre": "Fantasy" },
      { "title": "Chivalry & Sorcery 2nd Edition", "genre": "Fantasy" }
    ],
    board_game: [
      { "title": "Survive: Escape from Atlantis!", "genre": "Survival" },
      { "title": "Sherwood Forest", "genre": "Adventure" },
      { "title": "G.I. Joe (Milton Bradley)", "genre": "Action" },
      { "title": "Broadsides and Boarding Parties", "genre": "Tactical" },
      { "title": "En Garde!", "genre": "Combat" },
      { "title": "Illuminati (Original Edition)", "genre": "Satire" },
      { "title": "Car Wars Expansion Set #1", "genre": "Sci-Fi" },
      { "title": "Stuka", "genre": "Wargame" },
      { "title": "Advanced Squad Leader Scenario Pack A", "genre": "Wargame" },
      { "title": "Starcourt", "genre": "Sci-Fi" },
      { "title": "Battles of Waterloo", "genre": "Wargame" },
      { "title": "Arnhem", "genre": "Wargame" },
      { "title": "Pacific War", "genre": "Wargame" }
    ]
  },
  1983: {
    ttrpg: [
      { "title": "Rolemaster 2nd Edition", "genre": "Fantasy" },
      { "title": "Palladium Fantasy Role-Playing Game", "genre": "Fantasy" },
      { "title": "Superworld (Standalone)", "genre": "Superhero" },
      { "title": "James Bond 007: Role-Playing In Her Majesty's Secret Service", "genre": "Espionage" },
      { "title": "Spacemaster (1st Edition)", "genre": "Sci-Fi" },
      { "title": "Dungeons & Dragons Companion Rules", "genre": "Fantasy" },
      { "title": "Valley of the Pharaohs", "genre": "Historical" },
      { "title": "Espionage!", "genre": "Espionage" },
      { "title": "Witch Hunt", "genre": "Fantasy" },
      { "title": "Fantasy Wargaming", "genre": "Fantasy" },
      { "title": "Golden Heroes", "genre": "Superhero" },
      { "title": "Tricolour", "genre": "Wargame" },
      { "title": "Cthulhu Companion", "genre": "Horror" }
    ],
    board_game: [
      { "title": "Trivial Pursuit (Genus Edition)", "genre": "Trivia" },
      { "title": "Scotland Yard", "genre": "Deduction" },
      { "title": "Talismans (1st Edition)", "genre": "Adventure" },
      { "title": "Civilization: Advanced", "genre": "Civilization" },
      { "title": "Up Front", "genre": "Wargame" },
      { "title": "Filet", "genre": "Abstract" },
      { "title": "Axis & Allies (Classic MB Edition)", "genre": "Wargame" },
      { "title": "Squad Leader Expansion: GI Anvil of Victory", "genre": "Wargame" },
      { "title": "Nuclear War (Expansion)", "genre": "Satire" },
      { "title": "Guerilla", "genre": "Wargame" },
      { "title": "Air War", "genre": "Wargame" },
      { "title": "Bull Run", "genre": "Wargame" },
      { "title": "Seelowe Expansion", "genre": "Wargame" }
    ]
  },
  1984: {
    ttrpg: [
      { "title": "Paranoia (1st Edition)", "genre": "Sci-Fi" },
      { "title": "Twilight: 2000 (1st Edition)", "genre": "Post-Apocalyptic" },
      { "title": "Marvel Super Heroes (TSR)", "genre": "Superhero" },
      { "title": "RuneQuest 3rd Edition (Avalon Hill)", "genre": "Fantasy" },
      { "title": "Chill (1st Edition)", "genre": "Horror" },
      { "title": "Toon: The Cartoon Roleplaying Game", "genre": "Comedy" },
      { "title": "Maelstrom", "genre": "Historical" },
      { "title": "Flashing Blades", "genre": "Swashbuckler" },
      { "title": "Ringworld", "genre": "Sci-Fi" },
      { "title": "Middle-earth Role Playing (MERP 1e)", "genre": "Fantasy" },
      { "title": "Heroes Wear Red", "genre": "Superhero" },
      { "title": "Fantasy Hero", "genre": "Fantasy" },
      { "title": "Space Opera 2nd Edition", "genre": "Sci-Fi" }
    ],
    board_game: [
      { "title": "The Castles of Burgundy (Proto)", "genre": "Strategy" },
      { "title": "The Golden Victory", "genre": "Historical" },
      { "title": "Supremacy: The Game of the Superpowers", "genre": "Economic" },
      { "title": "B-17 Queen of the Skies", "genre": "Wargame" },
      { "title": "Sniper! Expansion", "genre": "Wargame" },
      { "title": "NATO", "genre": "Wargame" },
      { "title": "Third Reich 3rd Edition", "genre": "Wargame" },
      { "title": "Ambush!", "genre": "Wargame" },
      { "title": "Central Front Scenario Pack", "genre": "Wargame" },
      { "title": "Golan", "genre": "Wargame" },
      { "title": "The Korean War", "genre": "Wargame" },
      { "title": "Drive on Metz", "genre": "Wargame" },
      { "title": "Arnhem Bridge", "genre": "Wargame" }
    ]
  },
  1985: {
    ttrpg: [
      { "title": "DC Heroes (1st Edition)", "genre": "Superhero" },
      { "title": "Pendragon (1st Edition)", "genre": "Fantasy" },
      { "title": "Teenage Mutant Ninja Turtles & Other Strangeness", "genre": "Superhero" },
      { "title": "MechWarrior (1st Edition)", "genre": "Sci-Fi" },
      { "title": "Doctor Who RPG (FASA)", "genre": "Sci-Fi" },
      { "title": "Judge Dredd: The Role-Playing Game", "genre": "Sci-Fi" },
      { "title": "Fantasy Imperial", "genre": "Fantasy" },
      { "title": "GURPS (Man-to-Man Proto)", "genre": "Generic" },
      { "title": "Conan Role-Playing Game (TSR)", "genre": "Fantasy" },
      { "title": "Bureau 13: Stalking the Night Fantastic", "genre": "Urban Fantasy" },
      { "title": "Space Quest", "genre": "Sci-Fi" },
      { "title": "Rogue", "genre": "Fantasy" },
      { "title": "Cyberworld", "genre": "Cyberpunk" }
    ],
    board_game: [
      { "title": "Advanced Squad Leader (ASL Base)", "genre": "Wargame" },
      { "title": "World in Flames", "genre": "Wargame" },
      { "title": "Shogun (MB Gamemaster Series)", "genre": "Strategy" },
      { "title": "Temptation", "genre": "Abstract" },
      { "title": "Pax Britannica", "genre": "Wargame" },
      { "title": "Panzer War", "genre": "Wargame" },
      { "title": "The Last Victory", "genre": "Wargame" },
      { "title": "Gettysburg (Avalon Hill)", "genre": "Wargame" },
      { "title": "Code 727", "genre": "Deduction" },
      { "title": "Air Force Expansion Set", "genre": "Wargame" },
      { "title": "Sixth Fleet", "genre": "Wargame" },
      { "title": "Chickamauga", "genre": "Wargame" },
      { "title": "Bulge '85", "genre": "Wargame" }
    ]
  },
  1986: {
    ttrpg: [
      { "title": "GURPS Basic Set (1st Edition)", "genre": "Generic" },
      { "title": "Warhammer Fantasy Roleplay (1st Edition)", "genre": "Fantasy" },
      { "title": "Ghostbusters (West End Games)", "genre": "Comedy" },
      { "title": "Robotech (Palladium)", "genre": "Sci-Fi" },
      { "title": "Cyberspace", "genre": "Cyberpunk" },
      { "title": "HarnMaster (1st Edition)", "genre": "Fantasy" },
      { "title": "Price of Freedom", "genre": "Modern Thriller" },
      { "title": "Dream Park", "genre": "Sci-Fi" },
      { "title": "Delta Horizon", "genre": "Sci-Fi" },
      { "title": "Lace & Steel", "genre": "Swashbuckler" },
      { "title": "Time Lord", "genre": "Sci-Fi" },
      { "title": "Warp World", "genre": "Post-Apocalyptic" },
      { "title": "Star Warriors", "genre": "Sci-Fi" }
    ],
    board_game: [
      { "title": "Dark Tower (Classic Edition)", "genre": "Fantasy" },
      { "title": "Britannia", "genre": "Strategy" },
      { "title": "Fortress America", "genre": "Wargame" },
      { "title": "Kingmaker Expansion Set", "genre": "Wargame" },
      { "title": "CityTech", "genre": "Sci-Fi" },
      { "title": "Battletech (2nd Edition)", "genre": "Sci-Fi" },
      { "title": "ASL Module 1: Beyond Valor", "genre": "Wargame" },
      { "title": "Central Front: Fifth Corps", "genre": "Wargame" },
      { "title": "Pacific Fleet", "genre": "Wargame" },
      { "title": "Operation Shoestring", "genre": "Wargame" },
      { "title": "Nijmegen Bridge", "genre": "Wargame" },
      { "title": "Roads to Gettysburg", "genre": "Wargame" },
      { "title": "The Bulge (SPI)", "genre": "Wargame" }
    ]
  },
  1987: {
    ttrpg: [
      { "title": "Star Wars: The Roleplaying Game (d6 System)", "genre": "Sci-Fi" },
      { "title": "Ars Magica (1st Edition)", "genre": "Fantasy" },
      { "title": "Talislanta (1st Edition)", "genre": "Fantasy" },
      { "title": "Cthulhu Now", "genre": "Horror" },
      { "title": "Mercenaries, Spies & Private Eyes 2e", "genre": "Espionage" },
      { "title": "Top Secret/S.I.", "genre": "Espionage" },
      { "title": "Living Steel", "genre": "Sci-Fi" },
      { "title": "Space 1889", "genre": "Steampunk" },
      { "title": "Dungeon Raiders", "genre": "Fantasy" },
      { "title": "Phoenix Command", "genre": "Tactical Shooting" },
      { "title": "High Fantasy", "genre": "Fantasy" },
      { "title": "MegaTraveller", "genre": "Sci-Fi" },
      { "title": "Advanced Dungeons & Dragons Monster Manual II (1e)", "genre": "Fantasy" }
    ],
    board_game: [
      { "title": "Arkham Horror (1st Edition)", "genre": "Horror" },
      { "title": "Blockade (Economic)", "genre": "Strategy" },
      { "title": "ASL Module 2: Paratrooper", "genre": "Wargame" },
      { "title": "Illuminati Deluxe Edition", "genre": "Satire" },
      { "title": "The Russian Campaign (Avalon Hill)", "genre": "Wargame" },
      { "title": "G.I. Joe Combat Game", "genre": "Action" },
      { "title": "Merchant of Venus", "genre": "Sci-Fi" },
      { "title": "Star Fleet Battles Commander's Rules", "genre": "Sci-Fi" },
      { "title": "AeroTech", "genre": "Sci-Fi" },
      { "title": "Second Fleet", "genre": "Wargame" },
      { "title": "Desert Steel", "genre": "Wargame" },
      { "title": "Objective: Moscow", "genre": "Wargame" },
      { "title": "Team Yankee", "genre": "Wargame" }
    ]
  },
  1988: {
    ttrpg: [
      { "title": "Cyberpunk 2013 (1st Edition Box Set)", "genre": "Cyberpunk" },
      { "title": "GURPS Basic Set (3rd Edition)", "genre": "Generic" },
      { "title": "Palladium Robotech RPG Book II", "genre": "Sci-Fi" },
      { "title": "Macho Women with Guns", "genre": "Parody" },
      { "title": "Space 1889 (GDW standalone)", "genre": "Steampunk" },
      { "title": "Mutants & Masterminds (Proto)", "genre": "Superhero" },
      { "title": "Teenagers from Outer Space", "genre": "Comedy" },
      { "title": "Rifts (Proto concepts)", "genre": "Post-Apocalyptic" },
      { "title": "RuneQuest 3rd Edition Standard", "genre": "Fantasy" },
      { "title": "Wasteland RPG", "genre": "Post-Apocalyptic" },
      { "title": "HarnMaster Core", "genre": "Fantasy" },
      { "title": "Call of Cthulhu 4th Edition", "genre": "Horror" },
      { "title": "Advanced Dungeons & Dragons Greyhawk Adventures", "genre": "Fantasy" }
    ],
    board_game: [
      { "title": "Merchant of Venus (Classic)", "genre": "Sci-Fi" },
      { "title": "Kremlin", "genre": "Political" },
      { "title": "ASL Module 3: Yanks", "genre": "Wargame" },
      { "title": "ASL Module 4: Partisan!", "genre": "Wargame" },
      { "title": "Battletech Compendium", "genre": "Sci-Fi" },
      { "title": "The Civil War (Victory Games)", "genre": "Wargame" },
      { "title": "Red Storm Rising", "genre": "Wargame" },
      { "title": "Fleets of the Frontier", "genre": "Sci-Fi" },
      { "title": "Gulf Strike 2nd Edition", "genre": "Wargame" },
      { "title": "Air Supremacy", "genre": "Wargame" },
      { "title": "Operation Cannae", "genre": "Wargame" },
      { "title": "The Alamo", "genre": "Wargame" },
      { "title": "Seven, Three, Seven", "genre": "Abstract" }
    ]
  },
  1989: {
    ttrpg: [
      { "title": "Advanced Dungeons & Dragons 2nd Edition Players Handbook", "genre": "Fantasy" },
      { "title": "Shadowrun (1st Edition)", "genre": "Cyberpunk" },
      { "title": "Prince Valiant: The Storytelling Game", "genre": "Historical" },
      { "title": "HeroQuest (TTRPG Version)", "genre": "Fantasy" },
      { "title": "Blue Planet", "genre": "Sci-Fi" },
      { "title": "Cyberpunk 2020", "genre": "Cyberpunk" },
      { "title": "Delta Force: Tactical Role-Playing Game", "genre": "Military" },
      { "title": "Stormbringer 3rd Edition", "genre": "Fantasy" },
      { "title": "Space 1889 Sci-Fi", "genre": "Steampunk" },
      { "title": "Ninjas & Superspies 2e", "genre": "Martial Arts" },
      { "title": "Ars Magica 2nd Edition", "genre": "Fantasy" },
      { "title": "Star Wars RPG 1.5 Edition", "genre": "Sci-Fi" },
      { "title": "Rifts (Standalone playtest)", "genre": "Post-Apocalyptic" }
    ],
    board_game: [
      { "title": "HeroQuest (Milton Bradley/Games Workshop)", "genre": "Dungeon Crawl" },
      { "title": "Space Hulk", "genre": "Tactical Sci-Fi" },
      { "title": "Aline (Strategic)", "genre": "Wargame" },
      { "title": "ASL Module 5: West of Alamein", "genre": "Wargame" },
      { "title": "Omega Virus (Proto)", "genre": "Sci-Fi" },
      { "title": "Illuminati: Brainwash", "genre": "Satire" },
      { "title": "Siege of Jerusalem", "genre": "Wargame" },
      { "title": "Main Battle Tank", "genre": "Wargame" },
      { "title": "The Korean War (GMT)", "genre": "Wargame" },
      { "title": "Pacific Fleet 2nd Edition", "genre": "Wargame" },
      { "title": "Red Star / White Eagle", "genre": "Wargame" },
      { "title": "The Battles of Bull Run", "genre": "Wargame" },
      { "title": "Turning Point: Stalingrad", "genre": "Wargame" }
    ]
  },
  1990: {
    ttrpg: [
      { "title": "Rifts (Official standalone Release)", "genre": "Post-Apocalyptic" },
      { "title": "Vampire: The Masquerade (1st Edition)", "genre": "Gothic Punk" },
      { "title": "Twilight: 2000 2nd Edition", "genre": "Post-Apocalyptic" },
      { "title": "Deathwatch (OG Prototype)", "genre": "Sci-Fi" },
      { "title": "Pendragon 3rd Edition", "genre": "Fantasy" },
      { "title": "Gurps Cyberpunk", "genre": "Cyberpunk" },
      { "title": "Nightlife", "genre": "Urban Fantasy" },
      { "title": "Amber Diceless Roleplaying", "genre": "Fantasy" },
      { "title": "DC Heroes 2nd Edition", "genre": "Superhero" },
      { "title": "Al-Qadim: Golden Voyages", "genre": "Fantasy" },
      { "title": "Call of Cthulhu 5th Edition", "genre": "Horror" },
      { "title": "Torg: Roleplaying the Reality Storm", "genre": "Multiverse" },
      { "title": "Advanced Dungeons & Dragons 2nd Edition Dungeon Master Guide", "genre": "Fantasy" }
    ],
    board_game: [
      { "title": "Space Hulk Expansion: Deathwing", "genre": "Tactical Sci-Fi" },
      { "title": "Car Wars Deluxe Edition", "genre": "Sci-Fi" },
      { "title": "Advanced Civilization", "genre": "Civilization" },
      { "title": "ASL Module 6: The Last Hurrah", "genre": "Wargame" },
      { "title": "ASL Module 7: Hollow Legions", "genre": "Wargame" },
      { "title": "Central Front: Baltic Gap", "genre": "Wargame" },
      { "title": "Air Force: Dauntless", "genre": "Wargame" },
      { "title": "Carrier", "genre": "Wargame" },
      { "title": "The Battle of Austerlitz", "genre": "Wargame" },
      { "title": "Second Front", "genre": "Wargame" },
      { "title": "The Hunt for Red October", "genre": "Wargame" },
      { "title": "Pacific Fleet 3rd Edition", "genre": "Wargame" },
      { "title": "Silver Star", "genre": "Wargame" }
    ]
  },
  1991: {
    ttrpg: [
      { "title": "Amber Diceless Roleplaying System", "genre": "Fantasy" },
      { "title": "Shadowrun 2nd Edition", "genre": "Cyberpunk" },
      { "title": "Nephilim (French 1st Edition)", "genre": "Occult" },
      { "title": "Conspiracy X", "genre": "Conspiracy Thriller" },
      { "title": "Dark Sun Campaign Setting", "genre": "Fantasy" },
      { "title": "Vampire: The Masquerade 2nd Edition", "genre": "Gothic Punk" },
      { "title": "Beyond the Supernatural 2e", "genre": "Horror" },
      { "title": "Over the Edge", "genre": "Surrealist" },
      { "title": "Delta Green (Playtest drafts)", "genre": "Conspiracy" },
      { "title": "High Colonies", "genre": "Sci-Fi" },
      { "title": "Dangerous Journeys", "genre": "Fantasy" },
      { "title": "Legend of the Five Rings (Proto)", "genre": "Samurai" },
      { "title": "Advanced Dungeons & Dragons Rules Cyclopedia", "genre": "Fantasy" }
    ],
    board_game: [
      { "title": "Modern Art", "genre": "Auction" },
      { "title": "History of the World", "genre": "Strategy" },
      { "title": "Omega Virus", "genre": "Sci-Fi" },
      { "title": "ASL Module 8: Code of Bushido", "genre": "Wargame" },
      { "title": "Blood Bowl (3rd Edition)", "genre": "Fantasy Sports" },
      { "title": "Pax Britannica (Victory Games)", "genre": "Wargame" },
      { "title": "Air Supremacy Expansion", "genre": "Wargame" },
      { "title": "Barbarossa: The Kiev Salient", "genre": "Wargame" },
      { "title": "Desert Shield", "genre": "Wargame" },
      { "title": "Operations!", "genre": "Wargame" },
      { "title": "The East Is Red", "genre": "Wargame" },
      { "title": "Victory in the West", "genre": "Wargame" },
      { "title": "Seventh Fleet", "genre": "Wargame" }
    ]
  },
  1992: {
    ttrpg: [
      { "title": "Over the Edge (1st Edition Release)", "genre": "Surrealist" },
      { "title": "Werewolf: The Apocalypse (1st Edition)", "genre": "Gothic Punk" },
      { "title": "Mutant Chronicles (1st Edition)", "genre": "Sci-Fi" },
      { "title": "Aria: Canticle of the Monomyth", "genre": "Fantasy" },
      { "title": "Dangerous Journeys: Mythus", "genre": "Fantasy" },
      { "title": "Star Wars RPG 2nd Edition", "genre": "Sci-Fi" },
      { "title": "Underground", "genre": "Superhero Dystopian" },
      { "title": "Spectre RPG", "genre": "Sci-Fi" },
      { "title": "Night Horrors", "genre": "Horror" },
      { "title": "Mage: The Ascension (Proto drafts)", "genre": "Occult" },
      { "title": "Ars Magica 3rd Edition", "genre": "Fantasy" },
      { "title": "Kult (1st English Edition)", "genre": "Occult Horror" },
      { "title": "SLA Industries", "genre": "Sci-Fi Noir" }
    ],
    board_game: [
      { "title": "Acquire (Avalon Hill)", "genre": "Economic" },
      { "title": "Illuminati Deluxe Edition 2nd Print", "genre": "Satire" },
      { "title": "ASL Module 9: Gung Ho!", "genre": "Wargame" },
      { "title": "RoboRally", "genre": "Programming" },
      { "title": "Timbuktu", "genre": "Deduction" },
      { "title": "Grand Prix (Racing)", "genre": "Racing" },
      { "title": "The Battle of Shiloh", "genre": "Wargame" },
      { "title": "Operation Crusader (GMT)", "genre": "Wargame" },
      { "title": "Tanks!", "genre": "Wargame" },
      { "title": "Wargamers Pack 1", "genre": "Wargame" },
      { "title": "Red Storm Rising Expansion", "genre": "Wargame" },
      { "title": "Battle of Leipzig", "genre": "Wargame" },
      { "title": "Afrika Korps (Classic AH)", "genre": "Wargame" }
    ]
  },
  1993: {
    ttrpg: [
      { "title": "Mage: The Ascension (1st Edition)", "genre": "Occult" },
      { "title": "Kult (English Edition release)", "genre": "Occult Horror" },
      { "title": "Earthdawn (1st Edition)", "genre": "Fantasy" },
      { "title": "Cybergeneration (Shadowrun spinoff)", "genre": "Cyberpunk" },
      { "title": "Castles & Crusades (Proto)", "genre": "Fantasy" },
      { "title": "RuneQuest 4th Edition (Drafts)", "genre": "Fantasy" },
      { "title": "Street Fighter: The Storytelling Game", "genre": "Martial Arts" },
      { "title": "Fading Suns (Playtest)", "genre": "Sci-Fi" },
      { "title": "Nephilim (French 2nd Edition)", "genre": "Occult" },
      { "title": "Sengoku (Samurai RPG)", "genre": "Historical" },
      { "title": "Nexus: The Infinite City", "genre": "Multiverse" },
      { "title": "Classic Traveller 4e (Drafts)", "genre": "Sci-Fi" },
      { "title": "Unknown Armies (Early notes)", "genre": "Occult Horror" }
    ],
    board_game: [
      { "title": "Magic: The Gathering (Card Base)", "genre": "TCG" },
      { "title": "We the People", "genre": "Wargame" },
      { "title": "ASL Module 10: Croix de Guerre", "genre": "Wargame" },
      { "title": "Space Hulk 2nd Edition", "genre": "Tactical Sci-Fi" },
      { "title": "Blood Bowl (4th Edition)", "genre": "Fantasy Sports" },
      { "title": "Empire of the Air", "genre": "Wargame" },
      { "title": "T-34", "genre": "Wargame" },
      { "title": "Operation Typhoon", "genre": "Wargame" },
      { "title": "Victory at Sea", "genre": "Wargame" },
      { "title": "The Battle of Lodi", "genre": "Wargame" },
      { "title": "Fields of Glory", "genre": "Wargame" },
      { "title": "Eighth Fleet", "genre": "Wargame" },
      { "title": "Panzer Fleet", "genre": "Wargame" }
    ]
  },
  1994: {
    ttrpg: [
      { "title": "Planescape Campaign Setting", "genre": "Fantasy" },
      { "title": "Wraith: The Oblivion (1st Edition)", "genre": "Gothic Punk" },
      { "title": "Castle Falkenstein", "genre": "Steampunk" },
      { "title": "Nephilim (English Edition)", "genre": "Occult" },
      { "title": "Werewolf: The Apocalypse 2nd Edition", "genre": "Gothic Punk" },
      { "title": "GURPS Traveller", "genre": "Sci-Fi" },
      { "title": "Conspiracy X 1st Edition", "genre": "Conspiracy" },
      { "title": "The Whispering Vault", "genre": "Horror" },
      { "title": "Deadlands (Initial design)", "genre": "Weird West" },
      { "title": "Everway", "genre": "Fantasy" },
      { "title": "Lost Souls", "genre": "Fantasy" },
      { "title": "Pendragon 4th Edition", "genre": "Fantasy" },
      { "title": "Shatterzone", "genre": "Sci-Fi" }
    ],
    board_game: [
      { "title": "RoboRally (Classic Edition)", "genre": "Programming" },
      { "title": "Goldland", "genre": "Strategy" },
      { "title": "ASL Module 11: Doomed Battalions", "genre": "Wargame" },
      { "title": "Manhattan", "genre": "Economic" },
      { "title": "Aline 2nd Edition", "genre": "Wargame" },
      { "title": "Roads to Gettysburg 2e", "genre": "Wargame" },
      { "title": "Second Fleet 2e", "genre": "Wargame" },
      { "title": "The Ardennes Offensive", "genre": "Wargame" },
      { "title": "Blood Bowl Card Game", "genre": "Fantasy Sports" },
      { "title": "Victory in the Pacific 2e", "genre": "Wargame" },
      { "title": "Main Battle Tank 2nd Edition", "genre": "Wargame" },
      { "title": "First Team", "genre": "Wargame" },
      { "title": "The Battle of Rivoli", "genre": "Wargame" }
    ]
  },
  1995: {
    ttrpg: [
      { "title": "Mage: The Ascension 2nd Edition", "genre": "Occult" },
      { "title": "Changeling: The Dreaming (1st Edition)", "genre": "Gothic Punk" },
      { "title": "Fudge (Free, Universal, Diceless)", "genre": "Generic" },
      { "title": "Legend of the Five Rings (1st Edition)", "genre": "Samurai" },
      { "title": "Nightbane (originally Nightspawn)", "genre": "Urban Fantasy" },
      { "title": "Heavy Gear (1st Edition)", "genre": "Mecha" },
      { "title": "Cyberpunk 3rd Edition (Early notes)", "genre": "Cyberpunk" },
      { "title": "Ironclaw (1st Edition)", "genre": "Anthropomorphic" },
      { "title": "Witchcraft", "genre": "Urban Fantasy" },
      { "title": "Feng Shui (1st Edition)", "genre": "Action Movie" },
      { "title": "Traveller: The New Era", "genre": "Sci-Fi" },
      { "title": "Deadlands (Playtest stage)", "genre": "Weird West" },
      { "title": "AD&D 2nd Edition revised core books", "genre": "Fantasy" }
    ],
    board_game: [
      { "title": "Catan (Settlers of Catan)", "genre": "Strategy" },
      { "title": "El Grande", "genre": "Area Control" },
      { "title": "Medici", "genre": "Auction" },
      { "title": "High Society", "genre": "Auction" },
      { "title": "ASL Module 12: Armies of the Oblivion (Proto)", "genre": "Wargame" },
      { "title": "ASL Historical Module: Red Barricades", "genre": "Wargame" },
      { "title": "Space Hulk: Under Empire", "genre": "Tactical Sci-Fi" },
      { "title": "Hannibal: Rome vs. Carthage", "genre": "Wargame" },
      { "title": "Pacific Fleet 4th Edition", "genre": "Wargame" },
      { "title": "Operation Typhoon (GMT)", "genre": "Wargame" },
      { "title": "Battle of Marengo", "genre": "Wargame" },
      { "title": "War in the West 2nd Edition", "genre": "Wargame" },
      { "title": "Tanks! Expansion", "genre": "Wargame" }
    ]
  },
  1996: {
    ttrpg: [
      { "title": "Deadlands Classic (1st Edition)", "genre": "Weird West" },
      { "title": "Fading Suns (1st Edition)", "genre": "Sci-Fi Space Fantasy" },
      { "title": "Werewolf: The Apocalypse 3rd Edition", "genre": "Gothic Punk" },
      { "title": "Unknown Armies (1st Edition Release)", "genre": "Occult Horror" },
      { "title": "Wraith: The Oblivion 2nd Edition", "genre": "Gothic Punk" },
      { "title": "Delta Green (1e Sourcebook release)", "genre": "Conspiracy Horror" },
      { "title": "Conspiracy X 2.0 (Classic)", "genre": "Conspiracy" },
      { "title": "Alternity (Initial playtest)", "genre": "Sci-Fi" },
      { "title": "Shadowrun 3rd Edition (Notes)", "genre": "Cyberpunk" },
      { "title": "Sengoku Samurai Action", "genre": "Historical" },
      { "title": "Blue Planet 1st Edition", "genre": "Sci-Fi" },
      { "title": "Ars Magica 4th Edition", "genre": "Fantasy" },
      { "title": "Savage Worlds (Proto rules)", "genre": "Generic" }
    ],
    board_game: [
      { "title": "El Grande: Grand Inquisitor", "genre": "Area Control" },
      { "title": "Netrunner (Original CCG)", "genre": "Cyberpunk" },
      { "title": "Car Wars Arena Book 1", "genre": "Sci-Fi" },
      { "title": "ASL Module 10: Croix de Guerre (Revised)", "genre": "Wargame" },
      { "title": "RoboRally: Grand Prix", "genre": "Programming" },
      { "title": "Age of Renaissance", "genre": "Civilization" },
      { "title": "Stuka 2nd Edition", "genre": "Wargame" },
      { "title": "Air Supremacy: Phantom", "genre": "Wargame" },
      { "title": "The Battle of Castiglione", "genre": "Wargame" },
      { "title": "Hannibal: Carthage War", "genre": "Wargame" },
      { "title": "Drive on Moscow", "genre": "Wargame" },
      { "title": "Operational Combat Series: Enemy at the Gates", "genre": "Wargame" },
      { "title": "Victory at Sea (Revised)", "genre": "Wargame" }
    ]
  },
  1997: {
    ttrpg: [
      { "title": "Delta Green (D20/BRP standalone Sourcebook)", "genre": "Conspiracy Horror" },
      { "title": "Legend of the Five Rings 2nd Edition", "genre": "Samurai" },
      { "title": "Trinity (originally Aeon)", "genre": "Sci-Fi" },
      { "title": "Blue Planet (Vance Edition)", "genre": "Sci-Fi" },
      { "title": "Earthdawn 2nd Edition", "genre": "Fantasy" },
      { "title": "GURPS Lite", "genre": "Generic" },
      { "title": "Multiverser", "genre": "Multiverse" },
      { "title": "In Nomine", "genre": "Urban Fantasy" },
      { "title": "Mage: The Sorcerers Crusade", "genre": "Historical Fantasy" },
      { "title": "Spacemaster 2nd Edition", "genre": "Sci-Fi" },
      { "title": "Changeling: The Dreaming 2nd Edition", "genre": "Gothic Punk" },
      { "title": "Star Wars RPG 2nd Edition revised", "genre": "Sci-Fi" },
      { "title": "Alternity (D&D Sci-Fi proto)", "genre": "Sci-Fi" }
    ],
    board_game: [
      { "title": "Tigris & Euphrates", "genre": "Tile Placement" },
      { "title": "Bohnanza", "genre": "Trading" },
      { "title": "Showmanager", "genre": "Card Drafting" },
      { "title": "ASL Historical Module: Kampfgruppe Scherer", "genre": "Wargame" },
      { "title": "Successors (1st Edition)", "genre": "Wargame" },
      { "title": "Space Hulk: Tactical Strike", "genre": "Tactical Sci-Fi" },
      { "title": "We the People 2nd Edition", "genre": "Wargame" },
      { "title": "The Great War in Europe", "genre": "Wargame" },
      { "title": "Roads to Gettysburg 3e", "genre": "Wargame" },
      { "title": "Operation Typhoon 3rd Edition", "genre": "Wargame" },
      { "title": "The Battle of Arcole", "genre": "Wargame" },
      { "title": "Operation Crusader 3e", "genre": "Wargame" },
      { "title": "Tanks! Ironclads Edition", "genre": "Wargame" }
    ]
  },
  1998: {
    ttrpg: [
      { "title": "Vampire: The Masquerade Revised Edition (3e)", "genre": "Gothic Punk" },
      { "title": "Shadowrun 3rd Edition", "genre": "Cyberpunk" },
      { "title": "Alternity Science Fiction Roleplaying Game", "genre": "Sci-Fi" },
      { "title": "Unknown Armies (Atlas Games official release)", "genre": "Occult Horror" },
      { "title": "Star Trek Roleplaying Game (Last Unicorn Games)", "genre": "Sci-Fi" },
      { "title": "Deadlands: Hell on Earth", "genre": "Post-Apocalyptic" },
      { "title": "All Flesh Must Be Eaten (Playtest)", "genre": "Zombie Horror" },
      { "title": "Heavy Gear 2nd Edition", "genre": "Mecha" },
      { "title": "In Nomine: Superiors", "genre": "Urban Fantasy" },
      { "title": "Mage: The Ascension Revised", "genre": "Occult" },
      { "title": "Werewolf: The Apocalypse Revised", "genre": "Gothic Punk" },
      { "title": "Delta Green: Conspiracy Campaign", "genre": "Conspiracy" },
      { "title": "Lancer (Proto design concepts)", "genre": "Mecha" }
    ],
    board_game: [
      { "title": "Samurai", "genre": "Tile Placement" },
      { "title": "Through the Desert", "genre": "Abstract" },
      { "title": "Guillotine", "genre": "Card Game" },
      { "title": "ASL Module 12: Armies of Oblivion", "genre": "Wargame" },
      { "title": "Civilization: Empire", "genre": "Civilization" },
      { "title": "Merchant of Venus 2nd Print", "genre": "Sci-Fi" },
      { "title": "Second Fleet 3e", "genre": "Wargame" },
      { "title": "Successors (GMT)", "genre": "Wargame" },
      { "title": "Operational Combat Series: Guderian's Blitzkrieg", "genre": "Wargame" },
      { "title": "The Ardennes Offensive 2nd Edition", "genre": "Wargame" },
      { "title": "Air Supremacy: Phantom II", "genre": "Wargame" },
      { "title": "The Battle of Rivoli (Revised)", "genre": "Wargame" },
      { "title": "Gulf Strike 3rd Edition", "genre": "Wargame" }
    ]
  },
  1999: {
    ttrpg: [
      { "title": "All Flesh Must Be Eaten (1st Edition Release)", "genre": "Zombie Horror" },
      { "title": "7th Sea (1st Edition)", "genre": "Swashbuckler" },
      { "title": "Hunter: The Reckoning (1st Edition)", "genre": "Gothic Punk" },
      { "title": "Aberrant", "genre": "Superhero" },
      { "title": "Feng Shui: Action Movie Roleplaying (Atlas Edition)", "genre": "Action Movie" },
      { "title": "Savage Worlds (Drafts)", "genre": "Generic" },
      { "title": "Delta Green: Countdown", "genre": "Conspiracy Horror" },
      { "title": "Blue Planet 2nd Edition (Synergy System)", "genre": "Sci-Fi" },
      { "title": "Metamorphosis Alpha 4e", "genre": "Sci-Fi" },
      { "title": "Lort", "genre": "Fantasy" },
      { "title": "Fading Suns 2nd Edition", "genre": "Sci-Fi" },
      { "title": "Pendragon 4.5 Edition", "genre": "Fantasy" },
      { "title": "Dungeons & Dragons 3rd Edition (Beta Playtest)", "genre": "Fantasy" }
    ],
    board_game: [
      { "title": "Ra", "genre": "Auction" },
      { "title": "Lost Cities", "genre": "Card Game" },
      { "title": "Chinatown", "genre": "Trading" },
      { "title": "Apples to Apples", "genre": "Party" },
      { "title": "Tigris & Euphrates (Classic Edition)", "genre": "Tile Placement" },
      { "title": "Paths of Glory", "genre": "Wargame" },
      { "title": "ASL Module 3: Yanks (Revised)", "genre": "Wargame" },
      { "title": "ASL Historical Module: Blood Reef Tarawa", "genre": "Wargame" },
      { "title": "Space Hulk: Deathwing 2e", "genre": "Tactical Sci-Fi" },
      { "title": "Hannibal: Rome Carthage (GMT)", "genre": "Wargame" },
      { "title": "The Great War in Europe (Revised)", "genre": "Wargame" },
      { "title": "Operational Combat Series: Sicily", "genre": "Wargame" },
      { "title": "Roads to Gettysburg 4e", "genre": "Wargame" }
    ]
  },
  2000: {
    ttrpg: [
      { "title": "Dungeons & Dragons 3rd Edition Players Handbook", "genre": "Fantasy" },
      { "title": "Mage: The Ascension Revised Edition (3e)", "genre": "Occult" },
      { "title": "Unknown Armies 2nd Edition", "genre": "Occult Horror" },
      { "title": "D20 Modern (Proto concepts)", "genre": "Modern Adventure" },
      { "title": "Feng Shui: Action Movie Roleplay revised", "genre": "Action Movie" },
      { "title": "Orkworld", "genre": "Fantasy" },
      { "title": "Exalted (Beta playtest)", "genre": "Epic Fantasy" },
      { "title": "Dungeons & Dragons 3rd Edition Dungeon Master Guide", "genre": "Fantasy" },
      { "title": "Heavy Gear 3rd Edition", "genre": "Mecha" },
      { "title": "Cyberpunk v3 (Drafts)", "genre": "Cyberpunk" },
      { "title": "Fudge Expanded Edition", "genre": "Generic" },
      { "title": "All Flesh Must Be Eaten Revised", "genre": "Zombie" },
      { "title": "Star Wars Roleplaying Game (d20 Edition)", "genre": "Sci-Fi" }
    ],
    board_game: [
      { "title": "Carcassonne", "genre": "Tile Placement" },
      { "title": "Battle Line", "genre": "Card Game" },
      { "title": "Princes of Florence", "genre": "Auction" },
      { "title": "Taj Mahal", "genre": "Area Control" },
      { "title": "Vinci", "genre": "Area Control" },
      { "title": "The Great War in the East", "genre": "Wargame" },
      { "title": "Paths of Glory (Revised)", "genre": "Wargame" },
      { "title": "Tigris & Euphrates (German Edition)", "genre": "Tile Placement" },
      { "title": "ASL Historical Module: Kampfgruppe Scherer (Revised)", "genre": "Wargame" },
      { "title": "Space Hulk: Mission Files", "genre": "Tactical Sci-Fi" },
      { "title": "B-17 Queen of the Skies (GMT)", "genre": "Wargame" },
      { "title": "Second Team (Wargame)", "genre": "Wargame" },
      { "title": "The Battle of Marengo (Revised)", "genre": "Wargame" }
    ]
  },
  2001: {
    ttrpg: [
      { "title": "Exalted (1st Edition Release)", "genre": "Epic Fantasy" },
      { "title": "Call of Cthulhu d20 Edition", "genre": "Horror" },
      { "title": "HackMaster (4th Edition)", "genre": "Fantasy Satire" },
      { "title": "Adventure! (Storypath System)", "genre": "Pulp Action" },
      { "title": "Little Fears", "genre": "Horror" },
      { "title": "Godlike: Superhero Roleplaying in a World on Fire", "genre": "Superhero WWII" },
      { "title": "De Profundis", "genre": "Epistolary Horror" },
      { "title": "Nobilis (2nd Edition)", "genre": "Epic Narrative" },
      { "title": "Savage Worlds (Playtest release)", "genre": "Generic" },
      { "title": "Donjon", "genre": "Dungeon Crawl" },
      { "title": "Delta Green: Eyes Only", "genre": "Conspiracy" },
      { "title": "Sorcerer (Forge indie release)", "genre": "Indie Fantasy" },
      { "title": "Dungeons & Dragons 3rd Edition Monster Manual", "genre": "Fantasy" }
    ],
    board_game: [
      { "title": "San Marco", "genre": "Area Control" },
      { "title": "Medina", "genre": "Construction" },
      { "title": "Zertz", "genre": "Abstract" },
      { "title": "Starfarers of Catan", "genre": "Sci-Fi Strategy" },
      { "title": "Axis & Allies Pacific", "genre": "Wargame" },
      { "title": "The Great War in Europe 2e", "genre": "Wargame" },
      { "title": "Civilization: Advanced (Revised)", "genre": "Civilization" },
      { "title": "Illuminati: Crime Lords", "genre": "Satire" },
      { "title": "Operational Combat Series: Korea", "genre": "Wargame" },
      { "title": "Ambush! Expansion 3", "genre": "Wargame" },
      { "title": "Gordian Knot (GMT)", "genre": "Wargame" },
      { "title": "The Battle of Lodi (Revised)", "genre": "Wargame" },
      { "title": "Tanks! Desert Edition", "genre": "Wargame" }
    ]
  },
  2002: {
    ttrpg: [
      { "title": "The Burning Wheel", "genre": "Fantasy" },
      { "title": "D20 Modern Roleplaying Game", "genre": "Modern Adventure" },
      { "title": "Unknown Armies 2nd Edition (Atlas Core)", "genre": "Occult Horror" },
      { "title": "Mutants & Masterminds (1st Edition)", "genre": "Superhero" },
      { "title": "Riddle of Steel", "genre": "Fantasy Combat" },
      { "title": "HeroQuest: Roleplaying in Glorantha", "genre": "Fantasy" },
      { "title": "Nobilis (Great White Book 2e)", "genre": "Epic Narrative" },
      { "title": "Star Trek RPG (Decipher)", "genre": "Sci-Fi" },
      { "title": "Buffy the Vampire Slayer RPG", "genre": "Urban Fantasy" },
      { "title": "Children of the Sun", "genre": "Dieselpunk" },
      { "title": "Fudge 10th Anniversary", "genre": "Generic" },
      { "title": "Cyberpunk 2020 v3 (Revised notes)", "genre": "Cyberpunk" },
      { "title": "Star Wars RPG d20 Revised Core", "genre": "Sci-Fi" }
    ],
    board_game: [
      { "title": "Puerto Rico", "genre": "Role Selection" },
      { "title": "Age of Steam", "genre": "Network Building" },
      { "title": "Carcassonne: Hunters and Gatherers", "genre": "Tile Placement" },
      { "title": "Wallenstein", "genre": "Area Control" },
      { "title": "Axis & Allies Europe", "genre": "Wargame" },
      { "title": "Paths of Glory 3rd Edition", "genre": "Wargame" },
      { "title": "Trivial Pursuit 20th Anniversary", "genre": "Trivia" },
      { "title": "ASL Module 9: Gung Ho! (Revised)", "genre": "Wargame" },
      { "title": "Space Hulk: Deathwing 3e", "genre": "Tactical Sci-Fi" },
      { "title": "Successors 2e (GMT)", "genre": "Wargame" },
      { "title": "Operational Combat Series: D-Day", "genre": "Wargame" },
      { "title": "The Battle of Castiglione (Revised)", "genre": "Wargame" },
      { "title": "T-34 (GMT)", "genre": "Wargame" }
    ]
  },
  2003: {
    ttrpg: [
      { "title": "Dungeons & Dragons 3.5 Edition Players Handbook", "genre": "Fantasy" },
      { "title": "Savage Worlds (1st Edition Release)", "genre": "Generic Pulp" },
      { "title": "My Life with Master", "genre": "Psychological Indie" },
      { "title": "Dungeons & Dragons 3.5 Edition Dungeon Master Guide", "genre": "Fantasy" },
      { "title": "Conan: The Roleplaying Game (Mongoose)", "genre": "Fantasy" },
      { "title": "Exalted: The Sidereals", "genre": "Epic Fantasy" },
      { "title": "Dungeons & Dragons 3.5 Edition Monster Manual", "genre": "Fantasy" },
      { "title": "Spycraft (1.5 Edition)", "genre": "Espionage" },
      { "title": "Mutants & Masterminds Deluxe", "genre": "Superhero" },
      { "title": "All Flesh Must Be Eaten D20", "genre": "Zombie" },
      { "title": "Shadowrun 3rd Edition Revised", "genre": "Cyberpunk" },
      { "title": "Heavy Gear SilCORE Edition", "genre": "Mecha" },
      { "title": "Babylon 5 RPG (Mongoose d20)", "genre": "Sci-Fi" }
    ],
    board_game: [
      { "title": "Amun-Re", "genre": "Auction" },
      { "title": "Yinsh", "genre": "Abstract" },
      { "title": "Attika", "genre": "Tile Placement" },
      { "title": "A Game of Thrones (1st Edition)", "genre": "Negotiation" },
      { "title": "Axis & Allies D-Day", "genre": "Wargame" },
      { "title": "Paths of Glory 4th Edition", "genre": "Wargame" },
      { "title": "ASL Historical Module: A Bridge Too Far", "genre": "Wargame" },
      { "title": "The Civil War (Revised)", "genre": "Wargame" },
      { "title": "Successors 3e (GMT)", "genre": "Wargame" },
      { "title": "The Ardennes Offensive 3rd Edition", "genre": "Wargame" },
      { "title": "Operational Combat Series: Case Blue", "genre": "Wargame" },
      { "title": "The Battle of Leipzig (Revised)", "genre": "Wargame" },
      { "title": "Tanks! Kursk Edition", "genre": "Wargame" }
    ]
  },
  2004: {
    ttrpg: [
      { "title": "GURPS 4th Edition Basic Set (Characters & Campaigns)", "genre": "Generic" },
      { "title": "Dogs in the Vineyard", "genre": "Indie Western" },
      { "title": "Ars Magica 5th Edition", "genre": "Fantasy" },
      { "title": "Vampire: The Requiem (1st Edition)", "genre": "Urban Fantasy" },
      { "title": "Monsters and Other Childish Things (Playtest)", "genre": "Horror Comedy" },
      { "title": "Castles & Crusades Players Handbook", "genre": "Fantasy OSR" },
      { "title": "Warhammer Fantasy Roleplay 2nd Edition (Beta)", "genre": "Fantasy" },
      { "title": "Babylon 5 RPG 2nd Edition", "genre": "Sci-Fi" },
      { "title": "Blue Rose (1st Edition)", "genre": "Romantic Fantasy" },
      { "title": "Spycraft 2.0 (Design phase)", "genre": "Espionage" },
      { "title": "Heavy Gear 3e core", "genre": "Mecha" },
      { "title": "HeroQuest: Glorantha core", "genre": "Fantasy" },
      { "title": "Shadowrun 4th Edition (Playtest drafts)", "genre": "Cyberpunk" }
    ],
    board_game: [
      { "title": "Ticket to Ride", "genre": "Route Building" },
      { "title": "Power Grid", "genre": "Economic" },
      { "title": "War of the Ring (1st Edition)", "genre": "Wargame" },
      { "title": "Memoir '44", "genre": "Wargame" },
      { "title": "Axis & Allies Battle of the Bulge", "genre": "Wargame" },
      { "title": "ASL Module 10: Croix de Guerre 2e", "genre": "Wargame" },
      { "title": "ASL Historical Module: Valor at Kharkov", "genre": "Wargame" },
      { "title": "Hannibal: Rome Carthage 3e", "genre": "Wargame" },
      { "title": "Red Storm Rising Deluxe", "genre": "Wargame" },
      { "title": "Strategic Conquest", "genre": "Wargame" },
      { "title": "Operational Combat Series: Sicily 2e", "genre": "Wargame" },
      { "title": "The Battles of Bull Run (Revised)", "genre": "Wargame" },
      { "title": "Victory at Sea (GMT)", "genre": "Wargame" }
    ]
  },
  2005: {
    ttrpg: [
      { "title": "Warhammer Fantasy Roleplay 2nd Edition", "genre": "Fantasy" },
      { "title": "Shadowrun 4th Edition", "genre": "Cyberpunk" },
      { "title": "Polaris (Tragic Chivalric Game)", "genre": "Narrative" },
      { "title": "Dread (1st Edition Jenga Resolution)", "genre": "Horror" },
      { "title": "Mage: The Awakening (1st Edition)", "genre": "Urban Fantasy" },
      { "title": "Tunnels & Trolls 30th Anniversary", "genre": "Fantasy" },
      { "title": "Iron Heroes (d20 System)", "genre": "Tactical Fantasy" },
      { "title": "Pendragon 5th Edition (Artisan Edition)", "genre": "Fantasy" },
      { "title": "Serenity Role Playing Game", "genre": "Sci-Fi" },
      { "title": "Fudge System Reference Document", "genre": "Generic" },
      { "title": "Mutants & Masterminds 2nd Edition", "genre": "Superhero" },
      { "title": "Spycraft 2.0 (Official Release)", "genre": "Espionage" },
      { "title": "Castles & Crusades Monsters & Treasure", "genre": "Fantasy OSR" }
    ],
    board_game: [
      { "title": "Twilight Struggle", "genre": "Wargame" },
      { "title": "Caylus", "genre": "Worker Placement" },
      { "title": "Ticket to Ride: Europe", "genre": "Route Building" },
      { "title": "Shadows over Camelot", "genre": "Cooperative" },
      { "title": "Axis & Allies 50th Anniversary (Proto)", "genre": "Wargame" },
      { "title": "Tigris & Euphrates (Fantasy Flight Edition)", "genre": "Tile Placement" },
      { "title": "Paths of Glory Deluxe", "genre": "Wargame" },
      { "title": "ASL Module 11: Doomed Battalions (Revised)", "genre": "Wargame" },
      { "title": "Space Hulk: Mission Files 2e", "genre": "Tactical Sci-Fi" },
      { "title": "Successors 3e Deluxe", "genre": "Wargame" },
      { "title": "Operational Combat Series: Burma", "genre": "Wargame" },
      { "title": "The Battle of Marengo (Victory Games)", "genre": "Wargame" },
      { "title": "Panzer Fleet (GMT)", "genre": "Wargame" }
    ]
  },
  2006: {
    ttrpg: [
      { "title": "Agon (1st Edition)", "genre": "Fantasy Heroic" },
      { "title": "Burning Sands (Burning Wheel spinoff)", "genre": "Fantasy" },
      { "title": "Spirit of the Century (FATE System)", "genre": "Pulp Action" },
      { "title": "Scion: Hero", "genre": "Mythic Action" },
      { "title": "Cthulhutech (Beta)", "genre": "Sci-Fi Horror" },
      { "title": "Esoterrorists (1st GUMSHOE Game)", "genre": "Modern Investigative" },
      { "title": "Mouse Guard RPG (Design stage)", "genre": "Fantasy" },
      { "title": "Serenity: Out in the Black", "genre": "Sci-Fi" },
      { "title": "Castles & Crusades Castle Keepers Guide", "genre": "Fantasy OSR" },
      { "title": "RuneQuest Mongoose 1st Edition", "genre": "Fantasy" },
      { "title": "Exalted 2nd Edition Core Rulebook", "genre": "Epic Fantasy" },
      { "title": "Burning Wheel Gold (Early draft)", "genre": "Fantasy" },
      { "title": "Dungeons & Dragons 3.5 Tome of Battle", "genre": "Tactical Fantasy" }
    ],
    board_game: [
      { "title": "Shogun (Queen Games)", "genre": "Area Control" },
      { "title": "Through the Ages: A Story of Civilization", "genre": "Civilization" },
      { "title": "Imperial", "genre": "Economic" },
      { "title": "Combat Commander: Europe", "genre": "Wargame" },
      { "title": "ASL Module 12: Armies of Oblivion (Official)", "genre": "Wargame" },
      { "title": "Trivial Pursuit (Genus V)", "genre": "Trivia" },
      { "title": "Paths of Glory 5th Edition", "genre": "Wargame" },
      { "title": "Ambush! Expansion 4", "genre": "Wargame" },
      { "title": "B-17 Queen of the Skies 3e", "genre": "Wargame" },
      { "title": "Successors 3e Revised", "genre": "Wargame" },
      { "title": "The Battles of Bull Run (GMT)", "genre": "Wargame" },
      { "title": "Operation Typhoon 4e", "genre": "Wargame" },
      { "title": "Victory at Sea (Revised GMT)", "genre": "Wargame" }
    ]
  },
  2007: {
    ttrpg: [
      { "title": "Don't Rest Your Head", "genre": "Horror" },
      { "title": "Scion: Demigod", "genre": "Mythic Action" },
      { "title": "Trail of Cthulhu (Playtest phase)", "genre": "Horror Investigative" },
      { "title": "Dirty World (Film Noir RPG)", "genre": "Noir Drama" },
      { "title": "Monsters and Other Childish Things", "genre": "Horror Comedy" },
      { "title": "In A Wicked Age", "genre": "Sword & Sorcery" },
      { "title": "Reign (O.R.E. System)", "genre": "Fantasy Political" },
      { "title": "Rogue Trader (Warhammer 40k Proto)", "genre": "Sci-Fi" },
      { "title": "Changeling: The Lost (1st Edition)", "genre": "Urban Fantasy" },
      { "title": "Savage Worlds Explorer's Edition", "genre": "Generic" },
      { "title": "Traveller Mongoose 1st Edition", "genre": "Sci-Fi" },
      { "title": "Pathfinder Adventure Path #1 (Rise of the Runelords)", "genre": "Fantasy" },
      { "title": "D&D Rules Cyclopedia (Retro reprint)", "genre": "Fantasy" }
    ],
    board_game: [
      { "title": "Agricola", "genre": "Farming" },
      { "title": "Race for the Galaxy", "genre": "Engine Building" },
      { "title": "Brass (Brass: Lancashire 1e)", "genre": "Economic" },
      { "title": "Pandemic (Prototype)", "genre": "Cooperative" },
      { "title": "Galaxy Trucker", "genre": "Sci-Fi Strategy" },
      { "title": "Combat Commander: Mediterranean", "genre": "Wargame" },
      { "title": "ASL Action Pack 3", "genre": "Wargame" },
      { "title": "Illuminati: Mutual Assured Destruction", "genre": "Satire" },
      { "title": "Star Fleet Battles Commander's Rulebook 2e", "genre": "Sci-Fi" },
      { "title": "Operational Combat Series: Case Blue 2e", "genre": "Wargame" },
      { "title": "The Ardennes Offensive 4e", "genre": "Wargame" },
      { "title": "The Battle of Lodi 3e", "genre": "Wargame" },
      { "title": "Tanks! WWII Edition", "genre": "Wargame" }
    ]
  },
  2008: {
    ttrpg: [
      { "title": "Dungeons & Dragons 4th Edition Players Handbook", "genre": "Fantasy" },
      { "title": "Trail of Cthulhu", "genre": "Horror Investigative" },
      { "title": "Mouse Guard Roleplaying Game (1st Edition)", "genre": "Fantasy" },
      { "title": "Hunter: The Vigil", "genre": "Urban Fantasy" },
      { "title": "Star Wars Saga Edition", "genre": "Sci-Fi" },
      { "title": "Dark Heresy (Warhammer 40,000 Roleplay)", "genre": "Sci-Fi Gothic" },
      { "title": "Cthulhutech (Official Wildfire release)", "genre": "Sci-Fi Horror" },
      { "title": "Mutant City Blues", "genre": "Superhero Cop Drama" },
      { "title": "Labyrinth Lord (OSR)", "genre": "Fantasy OSR" },
      { "title": "Fiasco (Alpha phase)", "genre": "Narrative Crime" },
      { "title": "GURPS Traveller: Interstellar Wars", "genre": "Sci-Fi" },
      { "title": "Swords & Wizardry (Core OSR Rules)", "genre": "Fantasy OSR" },
      { "title": "Pathfinder RPG (Beta public Playtest)", "genre": "Fantasy" }
    ],
    board_game: [
      { "title": "Dominion", "genre": "Deck Building" },
      { "title": "Pandemic", "genre": "Cooperative" },
      { "title": "Stone Age", "genre": "Worker Placement" },
      { "title": "Space Alert", "genre": "Cooperative Sci-Fi" },
      { "title": "Axis & Allies 50th Anniversary Edition", "genre": "Wargame" },
      { "title": "Le Havre", "genre": "Economic" },
      { "title": "Combat Commander: Pacific", "genre": "Wargame" },
      { "title": "ASL Action Pack 4", "genre": "Wargame" },
      { "title": "RoboRally: Crash and Burn", "genre": "Programming" },
      { "title": "Successors 3e Revised (GMT)", "genre": "Wargame" },
      { "title": "The Battles of Bull Run (Revised GMT)", "genre": "Wargame" },
      { "title": "Operation Typhoon 5e", "genre": "Wargame" },
      { "title": "Victory at Sea (Deluxe GMT)", "genre": "Wargame" }
    ]
  },
  2009: {
    ttrpg: [
      { "title": "Pathfinder Roleplaying Game (1st Edition Core Rules)", "genre": "Fantasy" },
      { "title": "Fiasco", "genre": "Narrative Crime" },
      { "title": "Eclipse Phase (1st Edition)", "genre": "Sci-Fi Transhumanist" },
      { "title": "Rogue Trader (Warhammer 40k Roleplay)", "genre": "Sci-Fi" },
      { "title": "Warhammer Fantasy Roleplay 3rd Edition (Box Set)", "genre": "Fantasy" },
      { "title": "Song of Ice and Fire Roleplaying", "genre": "Fantasy Drama" },
      { "title": "Doctor Who: Adventures in Time and Space", "genre": "Sci-Fi" },
      { "title": "Shadowrun 4th Edition 20th Anniversary", "genre": "Cyberpunk" },
      { "title": "Icons Superpowered Roleplaying (Design)", "genre": "Superhero" },
      { "title": "Dungeons & Dragons 4th Edition Player Handbook 2", "genre": "Fantasy" },
      { "title": "Metamorphosis Alpha Deluxe 1e reprint", "genre": "Sci-Fi" },
      { "title": "Apocalypse World (Alpha test plays)", "genre": "Post-Apocalyptic" },
      { "title": "OSRIC (Standardized OSR Compilation)", "genre": "Fantasy OSR" }
    ],
    board_game: [
      { "title": "Space Hulk 3rd Edition", "genre": "Tactical Sci-Fi" },
      { "title": "Hansa Teutonica", "genre": "Route Building" },
      { "title": "Steam: Rails to Riches", "genre": "Network Building" },
      { "title": "Imperial 2030", "genre": "Economic" },
      { "title": "Endeavor", "genre": "Area Control" },
      { "title": "Combat Commander: Resistance", "genre": "Wargame" },
      { "title": "ASL Action Pack 5", "genre": "Wargame" },
      { "title": "Illuminati: Bavarian Fire Drill", "genre": "Satire" },
      { "title": "Star Fleet Battles Commander's Rulebook 3e", "genre": "Sci-Fi" },
      { "title": "Operational Combat Series: Guderian's Blitzkrieg 2e", "genre": "Wargame" },
      { "title": "The Ardennes Offensive 5e", "genre": "Wargame" },
      { "title": "The Battle of Leipzig 4e", "genre": "Wargame" },
      { "title": "Tanks! WWII Deluxe", "genre": "Wargame" }
    ]
  },
  2010: {
    ttrpg: [
      { "title": "Apocalypse World (1st Edition Release)", "genre": "Post-Apocalyptic" },
      { "title": "Lady Blackbird", "genre": "Steampunk" },
      { "title": "Deathwatch (Warhammer 40,000 Roleplay)", "genre": "Sci-Fi" },
      { "title": "Legends of Anglerre (FATE Fantasy)", "genre": "Fantasy" },
      { "title": "Icons: Superpowered Roleplaying Game", "genre": "Superhero" },
      { "title": "Gamma World 7th Edition (D&D 4e rules)", "genre": "Post-Apocalyptic" },
      { "title": "Dungeons & Dragons Essentials Core Rules", "genre": "Fantasy" },
      { "title": "RuneQuest Mongoose 2nd Edition (RQII)", "genre": "Fantasy" },
      { "title": "Pendragon 5.1 Edition", "genre": "Fantasy" },
      { "title": "Mutants & Masterminds 3rd Edition (Hero's Handbook)", "genre": "Superhero" },
      { "title": "The One Ring (Design stage)", "genre": "Fantasy" },
      { "title": "Leverage: The Roleplaying Game (Cortex Classic)", "genre": "Heist Crime" },
      { "title": "Dungeon World (Early design drafts)", "genre": "Fantasy PbtA" }
    ],
    board_game: [
      { "title": "7 Wonders", "genre": "Card Drafting" },
      { "title": "Dominant Species", "genre": "Area Control" },
      { "title": "Hansa Teutonica: East Card", "genre": "Route Building" },
      { "title": "Civilization (Fantasy Flight Edition)", "genre": "Civilization" },
      { "title": "Troyes", "genre": "Dice Drafting" },
      { "title": "Combat Commander: Battle Pack 1", "genre": "Wargame" },
      { "title": "ASL Action Pack 6", "genre": "Wargame" },
      { "title": "Netrunner CCG base 2e", "genre": "Cyberpunk" },
      { "title": "Second Fleet 4e", "genre": "Wargame" },
      { "title": "Successors 3e Revised Deluxe", "genre": "Wargame" },
      { "title": "Operational Combat Series: Burma 2e", "genre": "Wargame" },
      { "title": "The Battle of Rivoli 4e", "genre": "Wargame" },
      { "title": "Tanks! Battle Pack 1", "genre": "Wargame" }
    ]
  },
  2011: {
    ttrpg: [
      { "title": "The One Ring: Adventures over the Edge of the Wild", "genre": "Fantasy" },
      { "title": "Vampire: The Masquerade 20th Anniversary Edition (V20)", "genre": "Gothic Punk" },
      { "title": "Black Crusade (Warhammer 40k Roleplay)", "genre": "Sci-Fi Evil" },
      { "title": "Marvel Heroic Roleplaying (Cortex Plus)", "genre": "Superhero" },
      { "title": "Shinobigami (Modern Ninja Drama)", "genre": "Drama Combat" },
      { "title": "Monsterhearts (PbtA playtest drafts)", "genre": "Urban Fantasy" },
      { "title": "Numenera (Kickstarter / initial design)", "genre": "Science-Fantasy" },
      { "title": "Ashen Stars (GUMSHOE Sci-Fi)", "genre": "Sci-Fi Detective" },
      { "title": "Burning Wheel Gold (1st Printing)", "genre": "Fantasy Core" },
      { "title": "Dungeon World (Alpha playtest public release)", "genre": "Fantasy PbtA" },
      { "title": "Star Wars RPG (FFG Beta Playtests)", "genre": "Sci-Fi" },
      { "title": "D&D 5e (First internal design meetings)", "genre": "Fantasy" },
      { "title": "Classic Traveller 5th Edition (T5 Beta)", "genre": "Sci-Fi" }
    ],
    board_game: [
      { "title": "Mage Knight Board Game", "genre": "Deck Building" },
      { "title": "The Castles of Burgundy", "genre": "Dice Drafting" },
      { "title": "Eclipse: New Dawn for the Galaxy", "genre": "4X Space" },
      { "title": "Sekigahara: The Unification of Japan", "genre": "Blocks Wargame" },
      { "title": "Blood Bowl Team Manager", "genre": "Card Game" },
      { "title": "Combat Commander: Battle Pack 2", "genre": "Wargame" },
      { "title": "ASL Action Pack 7", "genre": "Wargame" },
      { "title": "Illuminati: Crime Lords 2e", "genre": "Satire" },
      { "title": "Star Fleet Battles Commander's Rulebook 4e", "genre": "Sci-Fi" },
      { "title": "Operational Combat Series: Sicily 3e", "genre": "Wargame" },
      { "title": "The Ardennes Offensive 6e", "genre": "Wargame" },
      { "title": "The Battle of Leipzig 5e", "genre": "Wargame" },
      { "title": "Tanks! Battle Pack 2", "genre": "Wargame" }
    ]
  },
  2012: {
    ttrpg: [
      { "title": "Dungeon World (1st Edition Release)", "genre": "Fantasy PbtA" },
      { "title": "Dungeon Crawl Classics RPG (DCC Core)", "genre": "Fantasy OSR" },
      { "title": "Night's Black Agents (GUMSHOE)", "genre": "Spy Horror" },
      { "title": "Only War (Warhammer 40k Imperial Guard)", "genre": "Sci-Fi" },
      { "title": "Durance (Penal Colony Drama)", "genre": "Narrative Space" },
      { "title": "Monsterhearts (Official 1st Edition)", "genre": "Teendrama Horror" },
      { "title": "Star Wars: Edge of the Empire Beta Rules", "genre": "Sci-Fi" },
      { "title": "Iron Kingdoms RPG (Warmachine Setting)", "genre": "Steampunk Fantasy" },
      { "title": "Marvel Heroic Roleplaying Civil War Campaign", "genre": "Superhero" },
      { "title": "Tremulus (Lovecraftian PbtA)", "genre": "Horror" },
      { "title": "Ten Candles (Initial design concepts)", "genre": "Horror Tragedy" },
      { "title": "Mage: The Awakening 2nd Edition (Design drafts)", "genre": "Urban Fantasy" },
      { "title": "Dungeons & Dragons Next (Public Playtest program)", "genre": "Fantasy" }
    ],
    board_game: [
      { "title": "Android: Netrunner (FFG LCG)", "genre": "Cyberpunk Card" },
      { "title": "War of the Ring 2nd Edition", "genre": "Wargame Fantasy" },
      { "title": "Terra Mystica", "genre": "Area Control" },
      { "title": "Tzolk'in: The Mayan Calendar", "genre": "Worker Placement" },
      { "title": "Love Letter", "genre": "Deduction" },
      { "title": "Combat Commander: Battle Pack 3", "genre": "Wargame" },
      { "title": "ASL Action Pack 8", "genre": "Wargame" },
      { "title": "ASL Historical Module: Festung Budapest", "genre": "Wargame" },
      { "title": "Space Hulk: Deathwing 4e", "genre": "Tactical Sci-Fi" },
      { "title": "Successors 3e Revised Deluxe (GMT)", "genre": "Wargame" },
      { "title": "Operational Combat Series: Case Blue 3e", "genre": "Wargame" },
      { "title": "The Battle of Lodi 4e", "genre": "Wargame" },
      { "title": "Tanks! Kursk Battle Pack", "genre": "Wargame" }
    ]
  },
  2013: {
    ttrpg: [
      { "title": "Star Wars: Edge of the Empire (Core Rulebook)", "genre": "Sci-Fi" },
      { "title": "Fate Core System", "genre": "Generic Narrative" },
      { "title": "Shadowrun 5th Edition", "genre": "Cyberpunk" },
      { "title": "Numenera (Core Rulebook)", "genre": "Science-Fantasy" },
      { "title": "The Quiet Year (Map Drawing Game)", "genre": "Narrative" },
      { "title": "Werewolf: The Apocalypse 20th Anniversary (W20)", "genre": "Gothic Punk" },
      { "title": "Firefly Role-Playing Game (Cortex Plus)", "genre": "Sci-Fi" },
      { "title": "13th Age (Core Rulebook)", "genre": "Fantasy Tactical" },
      { "title": "Fate Accelerated Edition (FAE)", "genre": "Generic Narrative" },
      { "title": "Chuubo's Marvelous Wish-Granting Engine", "genre": "Pastoral Surreal" },
      { "title": "Hillfolk (DramaSystem core)", "genre": "Drama Narrative" },
      { "title": "Delta Green (Standalone core rules planning)", "genre": "Conspiracy" },
      { "title": "Blade Runner RPG (Early design pitches)", "genre": "Cyberpunk" }
    ],
    board_game: [
      { "title": "Concordia", "genre": "Route Building" },
      { "title": "Caverna: The Cave Farmers", "genre": "Worker Placement" },
      { "title": "Eldritch Horror", "genre": "Cooperative Adventure" },
      { "title": "Keyflower: The Farmers", "genre": "Worker Placement" },
      { "title": "Forbidden Desert", "genre": "Cooperative Survival" },
      { "title": "Combat Commander: Battle Pack 4", "genre": "Wargame" },
      { "title": "ASL Action Pack 9", "genre": "Wargame" },
      { "title": "Illuminati: Bavarian Fire Drill 2e", "genre": "Satire" },
      { "title": "Star Fleet Battles Commander's Rulebook 5e", "genre": "Sci-Fi" },
      { "title": "Operational Combat Series: Burma 3e", "genre": "Wargame" },
      { "title": "The Ardennes Offensive 7e", "genre": "Wargame" },
      { "title": "The Battle of Rivoli 5e", "genre": "Wargame" },
      { "title": "Tanks! Ardennes Battle Pack", "genre": "Wargame" }
    ]
  },
  2014: {
    ttrpg: [
      { "title": "Dungeons & Dragons 5th Edition Players Handbook", "genre": "Fantasy" },
      { "title": "Call of Cthulhu 7th Edition (Slipcase Set)", "genre": "Horror" },
      { "title": "Star Wars: Age of Rebellion", "genre": "Sci-Fi" },
      { "title": "Mutant: Year Zero", "genre": "Post-Apocalyptic" },
      { "title": "Mage: The Awakening 2nd Edition (Beta release)", "genre": "Urban Fantasy" },
      { "title": "Valiant Universe RPG", "genre": "Superhero" },
      { "title": "Feng Shui 2 (Kickstarter Playtest edition)", "genre": "Action Movie" },
      { "title": "Firefly: Smuggler's Guide", "genre": "Sci-Fi" },
      { "title": "D&D 5e Monster Manual", "genre": "Fantasy" },
      { "title": "D&D 5e Dungeon Master Guide", "genre": "Fantasy" },
      { "title": "Symbaroum (Swedish 1st Edition)", "genre": "Dark Fantasy" },
      { "title": "Delta Green: Agent's Handbook (Drafts)", "genre": "Conspiracy" },
      { "title": "Blades in the Dark (Early alpha plays)", "genre": "Steampunk" }
    ],
    board_game: [
      { "title": "Orléans", "genre": "Bag Building" },
      { "title": "Splendor", "genre": "Engine Building" },
      { "title": "Patchwork", "genre": "Tile Placement" },
      { "title": "Five Tribes", "genre": "Mancala" },
      { "title": "Dead of Winter: A Crossroads Game", "genre": "Cooperative Zombie" },
      { "title": "Combat Commander: Battle Pack 5", "genre": "Wargame" },
      { "title": "ASL Action Pack 10", "genre": "Wargame" },
      { "title": "Space Hulk 4th Edition", "genre": "Tactical Sci-Fi" },
      { "title": "Successors 3e Deluxe (GMT 2nd Print)", "genre": "Wargame" },
      { "title": "Operational Combat Series: Sicily 4e", "genre": "Wargame" },
      { "title": "The Battles of Bull Run (GMT 2nd Print)", "genre": "Wargame" },
      { "title": "The Battle of Leipzig 6e", "genre": "Wargame" },
      { "title": "Tanks! D-Day Battle Pack", "genre": "Wargame" }
    ]
  },
  2015: {
    ttrpg: [
      { "title": "Symbaroum (English 1st Edition Release)", "genre": "Dark Fantasy" },
      { "title": "Urban Shadows (PbtA)", "genre": "Urban Fantasy" },
      { "title": "Feng Shui 2 (Official Release)", "genre": "Action Movie" },
      { "title": "Mage: The Ascension 20th Anniversary Edition (M20)", "genre": "Occult" },
      { "title": "Ryuutama: Natural Fantasy RPG (English Release)", "genre": "Cozy Fantasy" },
      { "title": "Chronicles of Darkness (CofD Core Rulebook)", "genre": "Urban Horror" },
      { "title": "Blades in the Dark (Kickstarter edition)", "genre": "Steampunk Heist" },
      { "title": "Star Wars: Force and Destiny", "genre": "Sci-Fi" },
      { "title": "Cthulhu Dark (Standalone book design)", "genre": "Cosmic Horror" },
      { "title": "Starfinder (First conceptual layout designs)", "genre": "Space Fantasy" },
      { "title": "Zweihänder Grimdark RPG (Beta drafts)", "genre": "Fantasy OSR" },
      { "title": "Delta Green: Need to Know starter", "genre": "Conspiracy" },
      { "title": "Monsterhearts 2 (Early draft)", "genre": "Urban Fantasy" }
    ],
    board_game: [
      { "title": "Pandemic Legacy: Season 1", "genre": "Cooperative Legacy" },
      { "title": "7 Wonders Duel", "genre": "Card Drafting" },
      { "title": "Codenames", "genre": "Word Game" },
      { "title": "Through the Ages: A New Story of Civilization", "genre": "Civilization" },
      { "title": "Viticulture Essential Edition", "genre": "Worker Placement" },
      { "title": "Combat Commander: Battle Pack 6", "genre": "Wargame" },
      { "title": "ASL Action Pack 11", "genre": "Wargame" },
      { "title": "Netrunner: Data and Destiny", "genre": "Cyberpunk" },
      { "title": "Star Fleet Battles Commander's Rulebook 6e", "genre": "Sci-Fi" },
      { "title": "Operational Combat Series: Burma 4e", "genre": "Wargame" },
      { "title": "The Ardennes Offensive 8e", "genre": "Wargame" },
      { "title": "The Battle of Rivoli 6e", "genre": "Wargame" },
      { "title": "Tanks! Normandy Battle Pack", "genre": "Wargame" }
    ]
  },
  2016: {
    ttrpg: [
      { "title": "Delta Green (Standalone Agent's Handbook Release)", "genre": "Conspiracy Horror" },
      { "title": "Traveller Mongoose 2nd Edition (MgT2)", "genre": "Sci-Fi" },
      { "title": "Pendragon 5.2 Edition", "genre": "Fantasy" },
      { "title": "Mage: The Awakening 2nd Edition (Chronicles of Darkness)", "genre": "Urban Fantasy" },
      { "title": "Kult: Divinity Lost (Initial playtest)", "genre": "Occult Horror" },
      { "title": "Coriolis: The Third Horizon", "genre": "Sci-Fi Space Fantasy" },
      { "title": "Blades in the Dark (Version 1.0 Final PDF)", "genre": "Steampunk Heist" },
      { "title": "Godbound (Demigod Sandbox RPG)", "genre": "Fantasy Demigod" },
      { "title": "Tales from the Loop (Alternative 1980s)", "genre": "Sci-Fi Mystery" },
      { "title": "Dungeons & Dragons 5e Volo's Guide to Monsters", "genre": "Fantasy" },
      { "title": "Swords & Wizardry Complete (Revised OSR Edition)", "genre": "Fantasy OSR" },
      { "title": "Delta Green: Handler's Guide (Beta drafts)", "genre": "Conspiracy" },
      { "title": "City of Mist (Early playtest releases)", "genre": "Urban Fantasy" }
    ],
    board_game: [
      { "title": "Scythe", "genre": "Engine Building" },
      { "title": "Terraforming Mars", "genre": "Space Colony" },
      { "title": "Great Western Trail", "genre": "Economic Deckbuilding" },
      { "title": "A Feast for Odin", "genre": "Worker Placement" },
      { "title": "Arkham Horror: The Card Game", "genre": "Cooperative LCG" },
      { "title": "Combat Commander: Battle Pack 7", "genre": "Wargame" },
      { "title": "ASL Action Pack 12", "genre": "Wargame" },
      { "title": "Space Hulk 4th Edition 2nd Print", "genre": "Tactical Sci-Fi" },
      { "title": "Successors 3e Revised Deluxe (GMT 3rd Print)", "genre": "Wargame" },
      { "title": "Operational Combat Series: Case Blue 4e", "genre": "Wargame" },
      { "title": "The Battles of Bull Run (GMT 3rd Print)", "genre": "Wargame" },
      { "title": "The Battle of Leipzig 7e", "genre": "Wargame" },
      { "title": "Tanks! Desert Battle Pack", "genre": "Wargame" }
    ]
  },
  2017: {
    ttrpg: [
      { "title": "Blades in the Dark (Official Hardcover Book)", "genre": "Steampunk Heist" },
      { "title": "Stars Without Number (Revised Edition)", "genre": "Sci-Fi Sandbox" },
      { "title": "Starfinder (Core Rulebook official Release)", "genre": "Space Fantasy" },
      { "title": "Zweihänder Grimdark RPG (Official Hardcover)", "genre": "Dark Fantasy OSR" },
      { "title": "City of Mist (Core Book Official Release)", "genre": "Urban Fantasy" },
      { "title": "Monsterhearts 2 (Official Release)", "genre": "Teendrama Horror" },
      { "title": "Cthulhu Dark (Minimalist Cosmic Horror Book)", "genre": "Cosmic Horror" },
      { "title": "Unknown Armies 3rd Edition", "genre": "Occult Horror" },
      { "title": "Forbidden Lands (Box Set design stage)", "genre": "Fantasy Survival" },
      { "title": "Tales from the Loop RPG (Official Hardcover)", "genre": "Sci-Fi Mystery" },
      { "title": "Dungeons & Dragons 5e Xanathar's Guide to Everything", "genre": "Fantasy" },
      { "title": "Delta Green: Handler's Guide (Hardcover Release)", "genre": "Conspiracy" },
      { "title": "Cyberpunk Red (Early design layout documents)", "genre": "Cyberpunk" }
    ],
    board_game: [
      { "title": "Gloomhaven", "genre": "Cooperative Dungeon Crawl" },
      { "title": "Spirit Island", "genre": "Cooperative Strategy" },
      { "title": "Clans of Caledonia", "genre": "Economic Agricultural" },
      { "title": "Gaia Project", "genre": "Space Strategy" },
      { "title": "Azul", "genre": "Pattern Abstract" },
      { "title": "Combat Commander: Battle Pack 8", "genre": "Wargame" },
      { "title": "ASL Action Pack 13", "genre": "Wargame" },
      { "title": "ASL Historical Module: Hatten in Flames", "genre": "Wargame" },
      { "title": "Netrunner: Terminal Directive", "genre": "Cyberpunk" },
      { "title": "Successors 4th Edition (Drafts)", "genre": "Wargame" },
      { "title": "Operational Combat Series: Sicily 5e", "genre": "Wargame" },
      { "title": "The Ardennes Offensive 9e", "genre": "Wargame" },
      { "title": "Tanks! Normandy Battle Pack 2", "genre": "Wargame" }
    ]
  },
  2018: {
    ttrpg: [
      { "title": "Vampire: The Masquerade 5th Edition (V5)", "genre": "Gothic Punk" },
      { "title": "Ironsworn", "genre": "Fantasy Solo" },
      { "title": "Mothership Sci-Fi Horror RPG (Player's Survival Guide)", "genre": "Sci-Fi Horror" },
      { "title": "Spire: The City Must Fall", "genre": "Urban Fantasy Revolution" },
      { "title": "Kult: Divinity Lost (Hardcover English Edition)", "genre": "Occult Horror" },
      { "title": "Forbidden Lands (Official Box Set Release)", "genre": "Fantasy Survival" },
      { "title": "Delta Green: The Labyrinth", "genre": "Conspiracy Campaign" },
      { "title": "Starfinder: Armory", "genre": "Space Fantasy" },
      { "title": "Warhammer Fantasy Roleplay 4th Edition", "genre": "Fantasy Grimdark" },
      { "title": "Legend of the Five Rings 5th Edition (FFG)", "genre": "Samurai" },
      { "title": "RuneQuest: Roleplaying in Glorantha", "genre": "Mythic Fantasy" },
      { "title": "Dungeons & Dragons 5e Mordenkainen's Tome of Foes", "genre": "Fantasy" },
      { "title": "Lancer: Mecha Tactical RPG (First digital Beta version)", "genre": "Mecha" }
    ],
    board_game: [
      { "title": "Brass: Birmingham", "genre": "Economic Industrial" },
      { "title": "Root", "genre": "Asymmetric Strategy" },
      { "title": "Nemesis", "genre": "Semi-Cooperative Survival" },
      { "title": "Decrypto", "genre": "Word Deduction" },
      { "title": "Everdell", "genre": "Tableau Worker Placement" },
      { "title": "Combat Commander: Battle Pack 9", "genre": "Wargame" },
      { "title": "ASL Action Pack 14", "genre": "Wargame" },
      { "title": "Space Hulk 4th Edition 3rd Print", "genre": "Tactical Sci-Fi" },
      { "title": "Successors 4th Edition (GMT)", "genre": "Wargame" },
      { "title": "The Battles of Bull Run (Revised GMT 3rd Print)", "genre": "Wargame" },
      { "title": "The Battle of Rivoli 7e", "genre": "Wargame" },
      { "title": "Operational Combat Series: Guderian's Blitzkrieg 3e", "genre": "Wargame" },
      { "title": "Tanks! Desert Battle Pack 2", "genre": "Wargame" }
    ]
  },
  2019: {
    ttrpg: [
      { "title": "Pathfinder 2nd Edition (Core Rulebook)", "genre": "Fantasy" },
      { "title": "Lancer (Official Core Rulebook PDF Release)", "genre": "Mecha" },
      { "title": "Alien RPG (Free League Core Rules)", "genre": "Sci-Fi Survival Horror" },
      { "title": "Cyberpunk Red (Jumpstart Kit Release)", "genre": "Cyberpunk" },
      { "title": "Over the Edge 3rd Edition", "genre": "Surrealist Conspiracy" },
      { "title": "Band of Blades (Mercenary Legion FitD)", "genre": "Dark Military Fantasy" },
      { "title": "Spire: Strata", "genre": "Fantasy Revolution" },
      { "title": "Mothership: Dead Planet", "genre": "Sci-Fi Horror" },
      { "title": "Starfinder: Character Operations Manual", "genre": "Space Fantasy" },
      { "title": "Delta Green: Black Sites", "genre": "Conspiracy" },
      { "title": "Ryuutama (Revised English printing)", "genre": "Cozy Fantasy" },
      { "title": "Troika! Numinous Golden Edition", "genre": "Surrealist OSR" },
      { "title": "Torg Eternity Core Rulebook", "genre": "Multiverse Action" }
    ],
    board_game: [
      { "title": "Pax Pamir 2nd Edition", "genre": "Historical Influence" },
      { "title": "Wingspan", "genre": "Card Engine Building" },
      { "title": "Maracaibo", "genre": "Economic Strategy" },
      { "title": "Paladins of the West Kingdom", "genre": "Worker Placement" },
      { "title": "Watergate", "genre": "2-Player Card Driven" },
      { "title": "Combat Commander: Battle Pack 10", "genre": "Wargame" },
      { "title": "ASL Action Pack 15", "genre": "Wargame" },
      { "title": "ASL Historical Module: Hatten in Flames 2e", "genre": "Wargame" },
      { "title": "Successors 4e Deluxe", "genre": "Wargame" },
      { "title": "Operational Combat Series: Burma 5e", "genre": "Wargame" },
      { "title": "The Ardennes Offensive 10e", "genre": "Wargame" },
      { "title": "The Battle of Leipzig 8e", "genre": "Wargame" },
      { "title": "Tanks! Kursk Battle Pack 2", "genre": "Wargame" }
    ]
  },
  2020: {
    ttrpg: [
      { "title": "Cyberpunk Red (Core Rulebook official Release)", "genre": "Cyberpunk" },
      { "title": "Mausritter (Boxed Set / Core rules)", "genre": "Furry Adventure OSR" },
      { "title": "Heart: The City Beneath (Spire companion)", "genre": "Dark Surreal Fantasy" },
      { "title": "Cortex Prime Game Handbook", "genre": "Generic Modular" },
      { "title": "Agon 2nd Edition (Evil Hat)", "genre": "Mythic Heroic" },
      { "title": "Lancer (Hardcover Physical release)", "genre": "Mecha" },
      { "title": "Starfinder: Near Space", "genre": "Space Fantasy" },
      { "title": "Delta Green: Whispers of the Dead", "genre": "Conspiracy" },
      { "title": "Vampire: The Masquerade Companion (Free PDF)", "genre": "Gothic Punk" },
      { "title": "Sentinel Comics: The Roleplaying Game", "genre": "Superhero" },
      { "title": "Alice is Missing (Silent Roleplaying Game)", "genre": "Narrative Mystery" },
      { "title": "Pathfinder 2e Advanced Player's Guide", "genre": "Fantasy" },
      { "title": "Dungeons & Dragons 5e Tasha's Cauldron of Everything", "genre": "Fantasy" }
    ],
    board_game: [
      { "title": "Dune: Imperium", "genre": "Deck Building / Worker Placement" },
      { "title": "Eclipse: Second Dawn for the Galaxy", "genre": "4X Space Strategy" },
      { "title": "Gloomhaven: Jaws of the Lion", "genre": "Cooperative Dungeon Crawl" },
      { "title": "Lost Ruins of Arnak", "genre": "Deck Building / Placement" },
      { "title": "On Mars", "genre": "Economic Colonization" },
      { "title": "Combat Commander: Battle Pack 11", "genre": "Wargame" },
      { "title": "ASL Action Pack 16", "genre": "Wargame" },
      { "title": "Space Hulk: Tactics Base", "genre": "Tactical Sci-Fi" },
      { "title": "Successors 4e Revised (GMT 2nd Print)", "genre": "Wargame" },
      { "title": "Operational Combat Series: Sicily 6e", "genre": "Wargame" },
      { "title": "The Battles of Bull Run (GMT 4th Print)", "genre": "Wargame" },
      { "title": "The Battle of Rivoli 8e", "genre": "Wargame" },
      { "title": "Tanks! Ardennes Battle Pack 2", "genre": "Wargame" }
    ]
  },
  2021: {
    ttrpg: [
      { "title": "The One Ring 2nd Edition (Free League Core)", "genre": "Mythic Tolkien Fantasy" },
      { "title": "Wanderhome (Pastoral Journey RPG)", "genre": "Pastoral Cute Animals" },
      { "title": "The Wildsea", "genre": "Post-Apocalyptic Tree-Faring" },
      { "title": "Lancer: Battlegroup", "genre": "Sci-Fi Space Wargame" },
      { "title": "Alien RPG: Colonial Marines Operation Manual", "genre": "Sci-Fi Survival Horror" },
      { "title": "Ironsworn: Starforged (Sci-Fi Solo)", "genre": "Sci-Fi Solo" },
      { "title": "Coriolis: Empyrean Canticle", "genre": "Sci-Fi" },
      { "title": "Spire: Sin", "genre": "Fantasy Revolution" },
      { "title": "Mothership: Year Zero module", "genre": "Sci-Fi Horror" },
      { "title": "Starfinder: Tech Revolution", "genre": "Space Fantasy" },
      { "title": "Delta Green: Impossible Landscapes", "genre": "Conspiracy Campaign" },
      { "title": "Cthulhu Dark (Revised Edition PDF)", "genre": "Cosmic Horror" },
      { "title": "Dungeons & Dragons 5e Fizban's Treasury of Dragons", "genre": "Fantasy" }
    ],
    board_game: [
      { "title": "Ark Nova", "genre": "Engine Building Zoo" },
      { "title": "Cascadia", "genre": "Pattern Drafting Wildlife" },
      { "title": "Radlands", "genre": "Dueling Cards" },
      { "title": "Unconditional Surrender! World War II in Europe (GMT)", "genre": "Wargame" },
      { "title": "Sleeping Gods", "genre": "Adventure Storytelling" },
      { "title": "Combat Commander: Battle Pack 12", "genre": "Wargame" },
      { "title": "ASL Action Pack 17", "genre": "Wargame" },
      { "title": "ASL Historical Module: Valor at Kharkov 2e", "genre": "Wargame" },
      { "title": "Successors 4e Deluxe (GMT 2nd Print)", "genre": "Wargame" },
      { "title": "Operational Combat Series: Case Blue 5e", "genre": "Wargame" },
      { "title": "The Ardennes Offensive 11e", "genre": "Wargame" },
      { "title": "The Battle of Leipzig 9e", "genre": "Wargame" },
      { "title": "Tanks! D-Day Battle Pack 2", "genre": "Wargame" }
    ]
  },
  2022: {
    ttrpg: [
      { "title": "Hunter: The Reckoning 5th Edition (H5)", "genre": "Urban Horror" },
      { "title": "Queerz! TTRPG (Superhero Anime)", "genre": "Superhero Drama" },
      { "title": "Blade Runner RPG (Free League Core)", "genre": "Cyberpunk Detective" },
      { "title": "Coyote & Crow (Native American Sci-Fi)", "genre": "Futurist Science-Fantasy" },
      { "title": "Mothership Sci-Fi Horror RPG (1.0 Core Rules Box)", "genre": "Sci-Fi Horror" },
      { "title": "Cy_Borg (Cyberpunk spin-off of Mork Borg)", "genre": "Punk Cyberpunk Art" },
      { "title": "Vampire: The Masquerade Second Inquisition", "genre": "Gothic Punk" },
      { "title": "Starfinder: Drift Crashers", "genre": "Space Fantasy" },
      { "title": "Delta Green: Iconoclasts", "genre": "Conspiracy Campaign" },
      { "title": "Apocalypse World: Burned Over", "genre": "Post-Apocalyptic" },
      { "title": "Pathfinder 2e Book of the Dead", "genre": "Fantasy" },
      { "title": "Dungeons & Dragons 5e Spelljammer: Adventures in Space", "genre": "Space Fantasy" },
      { "title": "Dragonbane (Free League Core)", "genre": "Fantasy OSR" }
    ],
    board_game: [
      { "title": "Frosthaven", "genre": "Dungeon Crawl Campaign" },
      { "title": "Heat: Pedal to the Metal", "genre": "Racing Engine" },
      { "title": "Splendor Duel", "genre": "2-Player Drafting" },
      { "title": "Wingspan Asia", "genre": "Card Engine Duet" },
      { "title": "Puerto Rico 1897", "genre": "Historical Upgrade" },
      { "title": "Combat Commander: Battle Pack 13", "genre": "Wargame" },
      { "title": "ASL Action Pack 18", "genre": "Wargame" },
      { "title": "ASL Historical Module: Festung Budapest 2e", "genre": "Wargame" },
      { "title": "Space Hulk 4th Edition 4th Print", "genre": "Tactical Sci-Fi" },
      { "title": "Successors 4e Deluxe (GMT 3rd Print)", "genre": "Wargame" },
      { "title": "Operational Combat Series: Burma 6e", "genre": "Wargame" },
      { "title": "The Battle of Rivoli 9e", "genre": "Wargame" },
      { "title": "Tanks! Normandy Battle Pack 3", "genre": "Wargame" }
    ]
  },
  2023: {
    ttrpg: [
      { "title": "Shadowrun: Sixth World Companion", "genre": "Cyberpunk" },
      { "title": "RuneQuest: Weapons & Equipment", "genre": "Mythic Fantasy" },
      { "title": "Earthdawn 4th Edition Companion", "genre": "Fantasy" },
      { "title": "Alien RPG: Building Better Worlds", "genre": "Sci-Fi Horror" },
      { "title": "Cyberpunk Red: Black Chrome", "genre": "Cyberpunk" },
      { "title": "Starfinder: Starship Operations Manual", "genre": "Space Fantasy" },
      { "title": "Delta Green: Conspiracy Sourcebook 2e", "genre": "Conspiracy" },
      { "title": "Symbaroum: Ruins of Symbaroum 5e", "genre": "Dark Fantasy" },
      { "title": "Pathfinder 2e Player Core (Remaster)", "genre": "Fantasy" },
      { "title": "Pathfinder 2e GM Core (Remaster)", "genre": "Fantasy" },
      { "title": "Dungeons & Dragons 5e Bigby Presents: Glory of the Giants", "genre": "Fantasy" },
      { "title": "Mouseritter: Estate Box", "genre": "Furry OSR" },
      { "title": "Pendragon 6th Edition Starter Set", "genre": "Fantasy Chivalric" }
    ],
    board_game: [
      { "title": "Dune: Imperium – Uprising", "genre": "Deckbuilding Placement" },
      { "title": "The Castles of Burgundy Special Edition", "genre": "Dice Placement" },
      { "title": "Ark Nova: Marine Worlds", "genre": "Zoo Placement Expansion" },
      { "title": "Earth", "genre": "Card Engine Placement" },
      { "title": "Voidfall", "genre": "4X Space Placement" },
      { "title": "Combat Commander: Battle Pack 14", "genre": "Wargame" },
      { "title": "ASL Action Pack 19", "genre": "Wargame" },
      { "title": "ASL Historical Module: Hatten in Flames 3e", "genre": "Wargame" },
      { "title": "Successors 4e Deluxe 4th Print", "genre": "Wargame" },
      { "title": "Operational Combat Series: Case Blue 6e", "genre": "Wargame" },
      { "title": "The Ardennes Offensive 12e", "genre": "Wargame" },
      { "title": "The Battle of Leipzig 10e", "genre": "Wargame" },
      { "title": "Tanks! Desert Battle Pack 3", "genre": "Wargame" }
    ]
  },
  2024: {
    ttrpg: [
      { "title": "Dungeons & Dragons Players Handbook (2024 Remaster)", "genre": "Fantasy" },
      { "title": "Pendragon 6th Edition Core Rulebook", "genre": "Fantasy Arthurian" },
      { "title": "Mothership Sci-Fi Horror 1.0 Box Set release", "genre": "Sci-Fi Horror" },
      { "title": "Werewolf: The Apocalypse 5th Edition", "genre": "Gothic Punk" },
      { "title": "Cyberpunk Red: Edgerunners Mission Kit", "genre": "Cyberpunk" },
      { "title": "Starfinder 2nd Edition Playtest rules", "genre": "Space Fantasy" },
      { "title": "Delta Green: The Conspiracy", "genre": "Conspiracy Campaign" },
      { "title": "Forbidden Lands: Book of Beasts", "genre": "Fantasy Survival" },
      { "title": "Dragonbane: Bestiary", "genre": "Fantasy OSR" },
      { "title": "Pathfinder 2e Player Core 2 (Remaster)", "genre": "Fantasy" },
      { "title": "Lancer: Operation Solstice Rain", "genre": "Mecha" },
      { "title": "Alien RPG: Core Rules 2nd Edition Announcements", "genre": "Sci-Fi Horror" },
      { "title": "RuneQuest: Glorantha Bestiary", "genre": "Mythic Fantasy" }
    ],
    board_game: [
      { "title": "Scythe: Complete Collector's Edition", "genre": "Engine Building" },
      { "title": "Terraforming Mars: Prelude 2", "genre": "Space Colony Expansion" },
      { "title": "Great Western Trail: New Zealand Edition", "genre": "Economic Deckbuilding" },
      { "title": "Arkeis", "genre": "Cooperative Adventure" },
      { "title": "Wyrmspan", "genre": "Card Engine Dragon" },
      { "title": "Combat Commander: Battle Pack 15", "genre": "Wargame" },
      { "title": "ASL Action Pack 20", "genre": "Wargame" },
      { "title": "ASL Historical Module: Valor at Kharkov 3e", "genre": "Wargame" },
      { "title": "Successors 4e Deluxe 5th Print", "genre": "Wargame" },
      { "title": "Operational Combat Series: Guderian's Blitzkrieg 4e", "genre": "Wargame" },
      { "title": "The Ardennes Offensive 13e", "genre": "Wargame" },
      { "title": "The Battle of Rivoli 10e", "genre": "Wargame" },
      { "title": "Tanks! D-Day Battle Pack 3", "genre": "Wargame" }
    ]
  },
  2025: {
    ttrpg: [
      { "title": "Dungeons & Dragons Monster Manual (2025 Remaster)", "genre": "Fantasy" },
      { "title": "Starfinder 2nd Edition Core Rulebook (Expected)", "genre": "Space Fantasy" },
      { "title": "Delta Green: Operational History sourcebook", "genre": "Conspiracy" },
      { "title": "Blade Runner RPG: Replicant Rebellion", "genre": "Cyberpunk Detective" },
      { "title": "Alien RPG 2.0 Core Rules Release", "genre": "Sci-Fi Horror" },
      { "title": "Lancer: Dustgrave", "genre": "Mecha" },
      { "title": "Cyberpunk Red: Rust Belt", "genre": "Cyberpunk" },
      { "title": "Symbaroum: Alberetor Campaign Book", "genre": "Dark Fantasy" },
      { "title": "Pathfinder 2e War of Immortals Core Book", "genre": "Fantasy" },
      { "title": "Dragonbane: Path to the Sun campaign", "genre": "Fantasy OSR" },
      { "title": "Mothership: Another Day, Another Dollar scenario", "genre": "Sci-Fi Horror" },
      { "title": "Wanderhome: Meadowlands Expansion", "genre": "Cozy Pastoral" },
      { "title": "Ironsworn: Starforged Iron Core physical", "genre": "Sci-Fi Solo" }
    ],
    board_game: [
      { "title": "Wingspan: Complete Collection Box", "genre": "Card Engine Zoo" },
      { "title": "Ark Nova: Marine Worlds Expansion Pack 2", "genre": "Zoo Placement Expansion" },
      { "title": "Lost Ruins of Arnak: Expedition Leaders 2e", "genre": "Deck Building Placement" },
      { "title": "Brass: Birmingham 2nd Edition Remaster", "genre": "Economic Industrial" },
      { "title": "Radlands: Wasteland Expanded Box", "genre": "Dueling Cards" },
      { "title": "Combat Commander: Deluxe Boxed Set", "genre": "Wargame" },
      { "title": "ASL Action Pack 21", "genre": "Wargame" },
      { "title": "ASL Historical Module: Festung Budapest 3e", "genre": "Wargame" },
      { "title": "Successors 4e Deluxe 6th Print", "genre": "Wargame" },
      { "title": "Operational Combat Series: Burma 7e", "genre": "Wargame" },
      { "title": "The Battle of Leipzig 11e", "genre": "Wargame" },
      { "title": "Tanks! Desert Battle Pack 4", "genre": "Wargame" }
    ]
  },
  2026: {
    ttrpg: [
      { "title": "Dungeons & Dragons Dungeon Master Guide (2026 Remaster)", "genre": "Fantasy" },
      { "title": "Starfinder 2nd Edition Gamemastery Guide (Expected)", "genre": "Space Fantasy" },
      { "title": "Delta Green: Final Apocalypse", "genre": "Conspiracy Campaign" },
      { "title": "Cyberpunk Red: 2045 Chronicle Book", "genre": "Cyberpunk" },
      { "title": "Lancer: The Karrakin Trade Baronies physical", "genre": "Mecha" },
      { "title": "Coriolis: Empyrean Canticle 2e Edition", "genre": "Sci-Fi" },
      { "title": "Mothership: Core System upgrade book", "genre": "Sci-Fi Horror" },
      { "title": "Pathfinder 2e Gods & Magic (Remaster Edition)", "genre": "Fantasy" },
      { "title": "Symbaroum: Davokar Deep Delve campaign", "genre": "Dark Fantasy" },
      { "title": "Wanderhome: Seasonal Festivities manual", "genre": "Cozy Pastoral" },
      { "title": "Earthdawn 4th Edition Final Core rules edition", "genre": "Fantasy" },
      { "title": "Ironsworn: Starforged Sector Generator sourcebook", "genre": "Sci-Fi Solo" },
      { "title": "RuneQuest: Hero Wars Campaign Book", "genre": "Mythic Fantasy" }
    ],
    board_game: [
      { "title": "Terraforming Mars: Ares Expedition 2nd Edition", "genre": "Space Colony" },
      { "title": "7 Wonders Duel: 10th Anniversary Box", "genre": "Card Drafting" },
      { "title": "Everdell: Farshore 2nd Edition", "genre": "Tableau Worker Placement" },
      { "title": "Carcassonne: 25th Anniversary Big Box", "genre": "Tile Placement" },
      { "title": "Concordia: Imperium Deluxe Box", "genre": "Route Building" },
      { "title": "Combat Commander: Battle Pack 16", "genre": "Wargame" },
      { "title": "ASL Action Pack 22", "genre": "Wargame" },
      { "title": "ASL Historical Module: Hatten in Flames 4e", "genre": "Wargame" },
      { "title": "Successors 4e Deluxe 7th Print", "genre": "Wargame" },
      { "title": "Operational Combat Series: Case Blue 7e", "genre": "Wargame" },
      { "title": "The Ardennes Offensive 14e", "genre": "Wargame" },
      { "title": "The Battle of Rivoli 11e", "genre": "Wargame" },
      { "title": "Tanks! Normandy Battle Pack 4", "genre": "Wargame" }
    ]
  }
};

// Process current loop year
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const currentYear = state.current_year;

if (currentYear > 2026) {
  console.log("Full Registry Complete!");
  process.exit(0);
}

// Fetch year archives
const yearArchive = dbArchive[currentYear];

if (!yearArchive) {
  console.error(`No archive found for year ${currentYear}`);
  process.exit(1);
}

// Compile entries
const compiledGames = [];

// Compile TTRPGs
yearArchive.ttrpg.forEach(item => {
  compiledGames.push({
    title: item.title,
    year: currentYear,
    genre: item.genre,
    medium: "ttrpg"
  });
});

// Compile Board Games
yearArchive.board_game.forEach(item => {
  compiledGames.push({
    title: item.title,
    year: currentYear,
    genre: item.genre,
    medium: "board_game"
  });
});

// Read existing registry
let registry = [];
if (fs.existsSync(registryPath)) {
  registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
}

// Append new entries
registry.push(...compiledGames);

// Save updated files
fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
fs.writeFileSync(statePath, JSON.stringify({ current_year: currentYear + 1 }, null, 2), 'utf8');

console.log(`Year ${currentYear} completed. Cumulative entries: ${registry.length}.`);
