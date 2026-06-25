/**
 * src/gm-engine.ts
 *
 * AI Game Master Engine for the OmniRuleset Sandbox.
 * Processes player actions against the synthesized ruleset,
 * performs virtual dice rolls, enforces mechanical rules,
 * and generates narrative responses.
 */

import { SynthesizedRuleset, CharacterTemplate } from './rules-synthesizer';

// ============================================================================
// GM Engine Types
// ============================================================================

export interface GMSession {
  /** The active synthesized ruleset governing this session. */
  ruleset: SynthesizedRuleset;
  /** The player's character state (mutable). */
  character: CharacterTemplate;
  /** Full chat log history. */
  chatLog: ChatMessage[];
  /** Current scene description. */
  currentScene: string;
  /** Encounter state tracking. */
  encounterState: EncounterState;
  /** Turn counter. */
  turnNumber: number;
}

export interface ChatMessage {
  role: 'gm' | 'player' | 'system';
  content: string;
  timestamp: number;
}

export interface EncounterState {
  inCombat: boolean;
  enemies: Enemy[];
  roundNumber: number;
}

export interface Enemy {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  alive: boolean;
}

export interface DiceRollResult {
  dice: string;
  rolls: number[];
  total: number;
  modifier: number;
  finalResult: number;
}

// ============================================================================
// Dice Rolling System
// ============================================================================

/**
 * Parse a dice notation string (e.g., "2d6+3", "1d20", "3d8-1").
 */
function parseDiceNotation(notation: string): { count: number; sides: number; modifier: number } {
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return { count: 1, sides: 20, modifier: 0 };
  return {
    count: parseInt(match[1], 10),
    sides: parseInt(match[2], 10),
    modifier: match[3] ? parseInt(match[3], 10) : 0
  };
}

/**
 * Roll dice and return structured result.
 */
export function rollDice(notation: string): DiceRollResult {
  const { count, sides, modifier } = parseDiceNotation(notation);
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  const total = rolls.reduce((a, b) => a + b, 0);
  return {
    dice: notation,
    rolls,
    total,
    modifier,
    finalResult: total + modifier
  };
}

/**
 * Format a dice roll result as an HTML string with styled dice.
 */
function formatRollHTML(roll: DiceRollResult): string {
  const rollsStr = roll.rolls.map(r => `<span class="dice-roll">${r}</span>`).join(' + ');
  const modStr = roll.modifier !== 0 ? ` ${roll.modifier > 0 ? '+' : ''}${roll.modifier}` : '';
  return `🎲 ${roll.dice}: ${rollsStr}${modStr} = <strong>${roll.finalResult}</strong>`;
}

// ============================================================================
// Scene & Encounter Templates
// ============================================================================

const OPENING_SCENES = [
  {
    scene: 'You awaken in a dimly lit tavern cellar. The air is thick with dust and the distant sound of clinking glasses echoes from above. A locked door stands before you, and something scrapes against stone in the shadows behind you.',
    enemies: [{ name: 'Giant Rat', hp: 6, maxHp: 6, attack: 3, defense: 8, alive: true }]
  },
  {
    scene: 'The ancient forest path narrows until the canopy blocks out all sunlight. Strange markings glow faintly on the trees. Ahead, a clearing reveals a crumbling stone altar—and the figures surrounding it don\'t look friendly.',
    enemies: [
      { name: 'Forest Bandit', hp: 12, maxHp: 12, attack: 5, defense: 11, alive: true },
      { name: 'Forest Bandit Archer', hp: 8, maxHp: 8, attack: 6, defense: 10, alive: true }
    ]
  },
  {
    scene: 'The merchant caravan has stopped at a crossroads. To the north, smoke rises from a burning village. To the east, the trade road continues safely. The caravan master looks at you expectantly: "We need someone to scout ahead."',
    enemies: []
  },
  {
    scene: 'Deep within the Crystalline Caverns, your torchlight catches prismatic reflections off every surface. The map leads to a sealed chamber ahead—but the ground trembles as something massive shifts in the darkness below.',
    enemies: [{ name: 'Cave Spider Queen', hp: 20, maxHp: 20, attack: 7, defense: 12, alive: true }]
  }
];

// ============================================================================
// Action Processing Engine
// ============================================================================

type ActionType = 'attack' | 'defend' | 'cast' | 'explore' | 'social' | 'skill' | 'rest' | 'unknown';

/**
 * Classify a player action string into an action type.
 */
function classifyAction(input: string): ActionType {
  const lower = input.toLowerCase();
  if (/\b(attack|strike|hit|slash|stab|shoot|punch|kick|fight)\b/.test(lower)) return 'attack';
  if (/\b(defend|block|dodge|parry|shield|protect|brace)\b/.test(lower)) return 'defend';
  if (/\b(cast|spell|magic|invoke|channel|conjure|summon|enchant)\b/.test(lower)) return 'cast';
  if (/\b(explore|search|look|examine|investigate|inspect|scout|check)\b/.test(lower)) return 'explore';
  if (/\b(talk|persuade|negotiate|intimidate|charm|deceive|lie|convince|barter|diplomacy)\b/.test(lower)) return 'social';
  if (/\b(climb|jump|swim|sneak|stealth|hide|pick\s*lock|craft|heal|medicine)\b/.test(lower)) return 'skill';
  if (/\b(rest|sleep|camp|recover|meditate|eat|drink)\b/.test(lower)) return 'rest';
  return 'unknown';
}

/**
 * Get the most relevant stat for an action type.
 */
function getRelevantStat(actionType: ActionType, stats: Record<string, number>): { name: string; value: number } {
  const mapping: Record<ActionType, string> = {
    'attack': 'Strength',
    'defend': 'Dexterity',
    'cast': 'Intelligence',
    'explore': 'Wisdom',
    'social': 'Charisma',
    'skill': 'Dexterity',
    'rest': 'Constitution',
    'unknown': 'Wisdom'
  };
  const statName = mapping[actionType];
  return { name: statName, value: stats[statName] || 10 };
}

/**
 * Calculate the modifier for a stat value (D&D-style: (stat - 10) / 2).
 */
function statModifier(value: number): number {
  return Math.floor((value - 10) / 2);
}

// ============================================================================
// GM Session Management
// ============================================================================

/**
 * Initialize a new GM playtest session.
 */
export function createSession(ruleset: SynthesizedRuleset): GMSession {
  const sceneData = OPENING_SCENES[Math.floor(Math.random() * OPENING_SCENES.length)];

  const session: GMSession = {
    ruleset,
    character: { ...ruleset.characterTemplate },
    chatLog: [],
    currentScene: sceneData.scene,
    encounterState: {
      inCombat: sceneData.enemies.length > 0,
      enemies: sceneData.enemies.map(e => ({ ...e })),
      roundNumber: 1
    },
    turnNumber: 0
  };

  // Opening messages
  addMessage(session, 'system', '⚡ OmniRuleset Playtest Session Initialized');
  addMessage(session, 'system', `📜 Active Ruleset: ${ruleset.title}`);
  addMessage(session, 'gm', sceneData.scene);

  if (session.encounterState.inCombat) {
    const enemyList = session.encounterState.enemies.map(e => e.name).join(', ');
    addMessage(session, 'system', `⚔️ Combat Engaged! Enemies: ${enemyList}`);
    addMessage(session, 'gm', 'Roll for initiative! What do you do?');
  } else {
    addMessage(session, 'gm', 'What would you like to do?');
  }

  return session;
}

/**
 * Add a message to the session's chat log.
 */
function addMessage(session: GMSession, role: 'gm' | 'player' | 'system', content: string): void {
  session.chatLog.push({ role, content, timestamp: Date.now() });
}

/**
 * Process a player action and generate the GM response.
 *
 * @param session - The active GM session (mutated in place)
 * @param playerInput - The player's action description
 * @returns Array of new messages generated this turn
 */
export function processAction(session: GMSession, playerInput: string): ChatMessage[] {
  const newMessages: ChatMessage[] = [];
  session.turnNumber++;

  // Record player message
  addMessage(session, 'player', playerInput);
  newMessages.push(session.chatLog[session.chatLog.length - 1]);

  const actionType = classifyAction(playerInput);
  const stat = getRelevantStat(actionType, session.character.stats);
  const mod = statModifier(stat.value);

  switch (actionType) {
    case 'attack':
      newMessages.push(...handleAttack(session, mod, stat.name));
      break;
    case 'defend':
      newMessages.push(...handleDefend(session, mod, stat.name));
      break;
    case 'cast':
      newMessages.push(...handleCast(session, mod, stat.name));
      break;
    case 'explore':
      newMessages.push(...handleExplore(session, mod, stat.name));
      break;
    case 'social':
      newMessages.push(...handleSocial(session, mod, stat.name));
      break;
    case 'skill':
      newMessages.push(...handleSkillCheck(session, mod, stat.name, playerInput));
      break;
    case 'rest':
      newMessages.push(...handleRest(session));
      break;
    default:
      newMessages.push(...handleUnknown(session));
      break;
  }

  // Check for character death
  if (session.character.hitPoints <= 0) {
    session.character.hitPoints = 0;
    addMessage(session, 'system', '💀 Your character has fallen! Session Over.');
    newMessages.push(session.chatLog[session.chatLog.length - 1]);
  }

  // Check if all enemies defeated
  if (session.encounterState.inCombat && session.encounterState.enemies.every(e => !e.alive)) {
    session.encounterState.inCombat = false;
    addMessage(session, 'system', '🏆 All enemies defeated! Combat ended.');
    newMessages.push(session.chatLog[session.chatLog.length - 1]);
    addMessage(session, 'gm', 'The dust settles. You catch your breath and survey the area. What would you like to do next?');
    newMessages.push(session.chatLog[session.chatLog.length - 1]);
  }

  return newMessages;
}

// ============================================================================
// Action Handlers
// ============================================================================

function handleAttack(session: GMSession, mod: number, statName: string): ChatMessage[] {
  const msgs: ChatMessage[] = [];

  const attackRoll = rollDice('1d20');
  const attackTotal = attackRoll.finalResult + mod;

  addMessage(session, 'system', `${formatRollHTML(attackRoll)} + ${mod} (${statName}) = ${attackTotal}`);
  msgs.push(session.chatLog[session.chatLog.length - 1]);

  const aliveEnemies = session.encounterState.enemies.filter(e => e.alive);
  if (aliveEnemies.length === 0) {
    addMessage(session, 'gm', 'There\'s nothing to attack right now. Perhaps you should explore your surroundings?');
    msgs.push(session.chatLog[session.chatLog.length - 1]);
    return msgs;
  }

  const target = aliveEnemies[0];

  if (attackTotal >= target.defense) {
    const dmgRoll = rollDice('1d8');
    const damage = Math.max(dmgRoll.finalResult + mod, 1);
    target.hp -= damage;

    addMessage(session, 'system', `💥 Damage: ${formatRollHTML(dmgRoll)} + ${mod} = ${damage}`);
    msgs.push(session.chatLog[session.chatLog.length - 1]);

    if (target.hp <= 0) {
      target.hp = 0;
      target.alive = false;
      addMessage(session, 'gm', `Your strike lands true! The ${target.name} crumbles to the ground, defeated. (${damage} damage dealt)`);
    } else {
      addMessage(session, 'gm', `A solid hit against the ${target.name}! It staggers but remains standing. (${damage} damage dealt, ${target.hp}/${target.maxHp} HP remaining)`);
    }
    msgs.push(session.chatLog[session.chatLog.length - 1]);
  } else {
    addMessage(session, 'gm', `Your attack swings wide of the ${target.name}! It deftly avoids your blow. (Needed ${target.defense}, rolled ${attackTotal})`);
    msgs.push(session.chatLog[session.chatLog.length - 1]);
  }

  // Enemy counter-attack
  msgs.push(...enemyTurn(session));

  return msgs;
}

function handleDefend(session: GMSession, mod: number, statName: string): ChatMessage[] {
  const msgs: ChatMessage[] = [];

  const defenseRoll = rollDice('1d20');
  const defenseTotal = defenseRoll.finalResult + mod;

  addMessage(session, 'system', `🛡️ Defense: ${formatRollHTML(defenseRoll)} + ${mod} (${statName}) = ${defenseTotal}`);
  msgs.push(session.chatLog[session.chatLog.length - 1]);

  if (defenseTotal >= 15) {
    addMessage(session, 'gm', 'You brace yourself expertly, raising your defenses. You gain advantage on your next defensive reaction.');
    session.character.conditions.push('Defending (+2 to next save)');
  } else {
    addMessage(session, 'gm', 'You take a defensive posture but feel uncertain of your footing.');
  }
  msgs.push(session.chatLog[session.chatLog.length - 1]);

  msgs.push(...enemyTurn(session));
  return msgs;
}

function handleCast(session: GMSession, mod: number, statName: string): ChatMessage[] {
  const msgs: ChatMessage[] = [];

  const hasSpells = session.character.abilities.some(a => a.toLowerCase().includes('spell') || a.toLowerCase().includes('cantrip'));
  if (!hasSpells) {
    addMessage(session, 'gm', 'You attempt to channel magical energy, but you don\'t have any spells prepared. Consider learning magic through advancement.');
    msgs.push(session.chatLog[session.chatLog.length - 1]);
    return msgs;
  }

  const castRoll = rollDice('1d20');
  const castTotal = castRoll.finalResult + mod;

  addMessage(session, 'system', `✨ Spellcasting: ${formatRollHTML(castRoll)} + ${mod} (${statName}) = ${castTotal}`);
  msgs.push(session.chatLog[session.chatLog.length - 1]);

  const aliveEnemies = session.encounterState.enemies.filter(e => e.alive);

  if (castTotal >= 12) {
    const dmgRoll = rollDice('2d6');
    const damage = Math.max(dmgRoll.finalResult + mod, 1);

    addMessage(session, 'system', `🌟 Spell damage: ${formatRollHTML(dmgRoll)} + ${mod} = ${damage}`);
    msgs.push(session.chatLog[session.chatLog.length - 1]);

    if (aliveEnemies.length > 0) {
      const target = aliveEnemies[0];
      target.hp -= damage;
      if (target.hp <= 0) {
        target.hp = 0;
        target.alive = false;
        addMessage(session, 'gm', `Arcane energy crackles from your hands and engulfs the ${target.name}! It dissolves into motes of light. (${damage} magical damage dealt)`);
      } else {
        addMessage(session, 'gm', `Your spell strikes the ${target.name} with brilliant force! (${damage} magical damage, ${target.hp}/${target.maxHp} HP remaining)`);
      }
    } else {
      addMessage(session, 'gm', 'Your spell illuminates the area with brilliant energy. The magical display is impressive, but there are no targets nearby.');
    }
  } else {
    addMessage(session, 'gm', 'The spell fizzles as you lose concentration. The magical energy dissipates harmlessly. (Failed casting check)');
  }
  msgs.push(session.chatLog[session.chatLog.length - 1]);

  msgs.push(...enemyTurn(session));
  return msgs;
}

function handleExplore(session: GMSession, mod: number, statName: string): ChatMessage[] {
  const msgs: ChatMessage[] = [];

  const roll = rollDice('1d20');
  const total = roll.finalResult + mod;

  addMessage(session, 'system', `🔍 Perception: ${formatRollHTML(roll)} + ${mod} (${statName}) = ${total}`);
  msgs.push(session.chatLog[session.chatLog.length - 1]);

  if (total >= 18) {
    addMessage(session, 'gm', 'Excellent perception! You notice a hidden compartment in the wall containing a vial of healing potion and 15 gold pieces. You also spot fresh tracks leading deeper into the area.');
    session.character.inventory.push('Healing Potion');
  } else if (total >= 12) {
    addMessage(session, 'gm', 'You carefully examine your surroundings and notice some interesting details: worn markings on the walls suggesting this area was once well-traveled, and a faint draft indicating a passage nearby.');
  } else {
    addMessage(session, 'gm', 'You look around but nothing immediately catches your eye. The area seems unremarkable at first glance, but something feels off...');
  }
  msgs.push(session.chatLog[session.chatLog.length - 1]);

  return msgs;
}

function handleSocial(session: GMSession, mod: number, statName: string): ChatMessage[] {
  const msgs: ChatMessage[] = [];

  const roll = rollDice('1d20');
  const total = roll.finalResult + mod;

  addMessage(session, 'system', `🗣️ Charisma: ${formatRollHTML(roll)} + ${mod} (${statName}) = ${total}`);
  msgs.push(session.chatLog[session.chatLog.length - 1]);

  const aliveEnemies = session.encounterState.enemies.filter(e => e.alive);

  if (total >= 20) {
    if (aliveEnemies.length > 0) {
      addMessage(session, 'gm', `Your words carry undeniable authority. The ${aliveEnemies[0].name} hesitates, then lowers its guard. "Perhaps we can reach an arrangement..." Combat paused.`);
      session.encounterState.inCombat = false;
    } else {
      addMessage(session, 'gm', 'Your eloquent speech echoes through the area. You sense this place holds secrets that respond to the spoken word.');
    }
  } else if (total >= 13) {
    addMessage(session, 'gm', 'Your words have some effect. You notice a subtle shift in the atmosphere—not quite resolution, but an opening for further negotiation.');
  } else {
    addMessage(session, 'gm', 'Your attempt at diplomacy falls flat. Tensions remain unchanged.');
    if (aliveEnemies.length > 0) {
      msgs.push(...enemyTurn(session));
    }
  }
  msgs.push(session.chatLog[session.chatLog.length - 1]);

  return msgs;
}

function handleSkillCheck(session: GMSession, mod: number, statName: string, input: string): ChatMessage[] {
  const msgs: ChatMessage[] = [];
  const lower = input.toLowerCase();

  let skillName = 'Skill Check';
  if (/heal|medicine/.test(lower)) skillName = 'Medicine';
  else if (/sneak|stealth|hide/.test(lower)) skillName = 'Stealth';
  else if (/climb/.test(lower)) skillName = 'Athletics (Climb)';
  else if (/pick\s*lock/.test(lower)) skillName = 'Thieves\' Tools';
  else if (/craft/.test(lower)) skillName = 'Crafting';

  const roll = rollDice('1d20');
  const total = roll.finalResult + mod;

  addMessage(session, 'system', `🎯 ${skillName}: ${formatRollHTML(roll)} + ${mod} (${statName}) = ${total}`);
  msgs.push(session.chatLog[session.chatLog.length - 1]);

  if (skillName === 'Medicine' && total >= 12) {
    const healAmount = Math.min(rollDice('1d6').finalResult, session.character.maxHitPoints - session.character.hitPoints);
    session.character.hitPoints += healAmount;
    addMessage(session, 'gm', `You tend to your wounds with practiced hands, recovering ${healAmount} HP. (HP: ${session.character.hitPoints}/${session.character.maxHitPoints})`);
  } else if (total >= 15) {
    addMessage(session, 'gm', `Impressive! Your ${skillName.toLowerCase()} check succeeds beautifully. The outcome exceeds your expectations.`);
  } else if (total >= 10) {
    addMessage(session, 'gm', `You manage to succeed at the ${skillName.toLowerCase()} check, though just barely. It gets the job done.`);
  } else {
    addMessage(session, 'gm', `Your ${skillName.toLowerCase()} attempt doesn't go as planned. You'll need to try a different approach.`);
  }
  msgs.push(session.chatLog[session.chatLog.length - 1]);

  return msgs;
}

function handleRest(session: GMSession): ChatMessage[] {
  const msgs: ChatMessage[] = [];

  if (session.encounterState.inCombat) {
    addMessage(session, 'gm', 'You can\'t rest while enemies are bearing down on you! Deal with the threat first.');
    msgs.push(session.chatLog[session.chatLog.length - 1]);
    msgs.push(...enemyTurn(session));
    return msgs;
  }

  const healRoll = rollDice('1d8');
  const healAmount = Math.min(healRoll.finalResult, session.character.maxHitPoints - session.character.hitPoints);
  session.character.hitPoints += healAmount;
  session.character.conditions = [];

  addMessage(session, 'system', `💤 Rest: Recovered ${healAmount} HP (${formatRollHTML(healRoll)})`);
  msgs.push(session.chatLog[session.chatLog.length - 1]);

  addMessage(session, 'gm', `You take a moment to rest and recover. The tension eases from your muscles as you recuperate. (HP: ${session.character.hitPoints}/${session.character.maxHitPoints}). All conditions cleared.`);
  msgs.push(session.chatLog[session.chatLog.length - 1]);

  return msgs;
}

function handleUnknown(session: GMSession): ChatMessage[] {
  const msgs: ChatMessage[] = [];
  addMessage(session, 'gm', 'You consider your options carefully. Try describing a specific action: attack an enemy, cast a spell, explore the area, talk to someone, use a skill, or rest to recover.');
  msgs.push(session.chatLog[session.chatLog.length - 1]);
  return msgs;
}

// ============================================================================
// Enemy AI
// ============================================================================

function enemyTurn(session: GMSession): ChatMessage[] {
  const msgs: ChatMessage[] = [];
  const aliveEnemies = session.encounterState.enemies.filter(e => e.alive);

  if (!session.encounterState.inCombat || aliveEnemies.length === 0) return msgs;

  for (const enemy of aliveEnemies) {
    const enemyRoll = rollDice('1d20');
    const enemyAttack = enemyRoll.finalResult + enemy.attack;
    const playerDefense = 10 + statModifier(session.character.stats['Dexterity'] || 10);

    // Check for defending condition bonus
    const defendingIdx = session.character.conditions.indexOf('Defending (+2 to next save)');
    const defenseBonus = defendingIdx >= 0 ? 2 : 0;
    if (defendingIdx >= 0) {
      session.character.conditions.splice(defendingIdx, 1);
    }

    const effectiveDefense = playerDefense + defenseBonus;

    if (enemyAttack >= effectiveDefense) {
      const enemyDmgRoll = rollDice('1d6');
      const damage = Math.max(enemyDmgRoll.finalResult, 1);
      session.character.hitPoints -= damage;

      addMessage(session, 'system', `⚠️ ${enemy.name} attacks! ${formatRollHTML(enemyRoll)} + ${enemy.attack} = ${enemyAttack} vs Defense ${effectiveDefense}`);
      msgs.push(session.chatLog[session.chatLog.length - 1]);

      addMessage(session, 'gm', `The ${enemy.name} strikes you for ${damage} damage! (HP: ${session.character.hitPoints}/${session.character.maxHitPoints})`);
      msgs.push(session.chatLog[session.chatLog.length - 1]);
    } else {
      addMessage(session, 'system', `🛡️ ${enemy.name} attacks: ${formatRollHTML(enemyRoll)} + ${enemy.attack} = ${enemyAttack} vs Defense ${effectiveDefense} — MISS!`);
      msgs.push(session.chatLog[session.chatLog.length - 1]);

      addMessage(session, 'gm', `The ${enemy.name} lunges at you but you evade the blow!`);
      msgs.push(session.chatLog[session.chatLog.length - 1]);
    }
  }

  session.encounterState.roundNumber++;
  return msgs;
}

/**
 * Render the character sheet as an HTML string.
 */
export function renderCharacterSheetHTML(character: CharacterTemplate): string {
  let html = '';
  html += `<div class="char-stat"><span class="char-stat-label">Name</span><span class="char-stat-value">${character.name}</span></div>`;
  html += `<div class="char-stat"><span class="char-stat-label">Level</span><span class="char-stat-value">${character.level}</span></div>`;
  html += `<div class="char-stat"><span class="char-stat-label">HP</span><span class="char-stat-value" style="color: ${character.hitPoints <= character.maxHitPoints * 0.3 ? 'var(--color-danger)' : character.hitPoints <= character.maxHitPoints * 0.6 ? 'var(--color-amber)' : 'var(--color-success)'};">${character.hitPoints}/${character.maxHitPoints}</span></div>`;

  for (const [stat, value] of Object.entries(character.stats)) {
    const mod = Math.floor((value - 10) / 2);
    const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
    html += `<div class="char-stat"><span class="char-stat-label">${stat}</span><span class="char-stat-value">${value} (${modStr})</span></div>`;
  }

  if (character.conditions.length > 0) {
    html += `<div class="char-stat"><span class="char-stat-label">Conditions</span><span class="char-stat-value" style="color: var(--color-amber);">${character.conditions.join(', ')}</span></div>`;
  }

  html += `<div class="char-stat"><span class="char-stat-label">Skills</span><span class="char-stat-value" style="font-size:0.75rem">${character.skills.join(', ')}</span></div>`;

  return html;
}
