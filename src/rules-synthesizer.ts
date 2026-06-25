/**
 * src/rules-synthesizer.ts
 *
 * OmniRuleset Synthesis Engine.
 * Takes a set of selected mechanical vectors and their associated game data,
 * resolves detected conflicts, and generates a unified, formatted rules sheet.
 */

import { DetectedConflict } from './conflict-checker';

// ============================================================================
// Synthesis Data Structures
// ============================================================================

export interface SynthesisInput {
  /** Selected vector names. */
  vectors: string[];
  /** Detected conflicts for reconciliation. */
  conflicts: DetectedConflict[];
  /** Map of vector → array of game-specific explanation strings. */
  vectorExplanations: Record<string, string[]>;
}

export interface SynthesizedRuleset {
  /** Generated ruleset title. */
  title: string;
  /** Generated sections of the unified ruleset. */
  sections: RulesetSection[];
  /** Conflict resolution notes applied during synthesis. */
  resolutionNotes: string[];
  /** The character template derived from the synthesized rules. */
  characterTemplate: CharacterTemplate;
}

export interface RulesetSection {
  /** Section heading (e.g., "Combat Resolution"). */
  heading: string;
  /** Domain grouping (e.g., "combat", "magic", "character"). */
  domain: string;
  /** Formatted rules content as an array of rule statements. */
  rules: string[];
}

export interface CharacterTemplate {
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

// ============================================================================
// Domain Knowledge Base
// ============================================================================

/**
 * Maps vector domain prefixes to canonical section headings and rule generation templates.
 */
const DOMAIN_TEMPLATES: Record<string, { heading: string; baseRules: string[] }> = {
  'combat': {
    heading: '⚔️ Combat System',
    baseRules: [
      'Combat encounters begin when hostilities are declared or an ambush is triggered.',
      'All combatants determine initiative to establish turn order.',
      'On each turn, a combatant may take one standard action, one move action, and one free action.',
      'Attacks are resolved by making an attack roll against the target\'s defense value.'
    ]
  },
  'resolution': {
    heading: '🎯 Resolution Mechanics',
    baseRules: [
      'When the outcome of an action is uncertain, the GM calls for a check.',
      'The player rolls the designated dice and adds relevant modifiers.',
      'The result is compared against a difficulty threshold to determine success or failure.',
      'Critical results (exceptional highs or lows) trigger special narrative outcomes.'
    ]
  },
  'character': {
    heading: '👤 Character System',
    baseRules: [
      'Characters are defined by a set of core attributes representing physical and mental capabilities.',
      'Skills represent trained proficiencies that modify attribute-based checks.',
      'Characters advance through earned experience, unlocking new abilities and stat increases.',
      'Equipment and inventory are tracked and may provide passive bonuses.'
    ]
  },
  'magic': {
    heading: '✨ Magic & Powers System',
    baseRules: [
      'Magical abilities draw from an energy resource that replenishes during rest periods.',
      'Spells and powers have defined ranges, durations, and areas of effect.',
      'Casting requires a successful check against a difficulty based on spell power.',
      'Failed castings may result in diminished effects, backlash, or resource loss.'
    ]
  },
  'social': {
    heading: '🗣️ Social Interaction System',
    baseRules: [
      'Social encounters use opposed checks between participants.',
      'NPCs have disposition levels that shift based on interaction outcomes.',
      'Persuasion, deception, and intimidation each have distinct mechanical paths.',
      'Repeated social pressure imposes diminishing returns per encounter.'
    ]
  },
  'exploration': {
    heading: '🗺️ Exploration & Navigation',
    baseRules: [
      'Travel is measured in watches (4-hour blocks) for overland movement.',
      'Environmental hazards require appropriate skill checks to navigate safely.',
      'Resource tracking (rations, light sources, supplies) affects party endurance.',
      'Discovery checks reveal hidden locations, treasures, or lore.'
    ]
  },
  'consequences': {
    heading: '💔 Consequences & Conditions',
    baseRules: [
      'Damage and adverse effects impose conditions that modify capabilities.',
      'Conditions range from minor (fatigued, shaken) to severe (incapacitated, dying).',
      'Recovery requires rest, medical attention, or magical healing.',
      'Conditions stack but cannot exceed three active conditions of the same severity.'
    ]
  },
  'crafting': {
    heading: '🔨 Crafting & Creation',
    baseRules: [
      'Crafting requires appropriate materials, tools, and proficiency.',
      'Complex items require extended crafting checks across multiple work periods.',
      'Quality tiers (common, fine, masterwork, legendary) affect item statistics.',
      'Failed crafting checks may waste materials or produce flawed items.'
    ]
  }
};

// ============================================================================
// Synthesis Engine
// ============================================================================

/**
 * Extract the top-level domain from a hierarchical vector string.
 */
function getDomain(vector: string): string {
  return vector.split('.')[0];
}

/**
 * Format a vector into a readable label.
 */
function vectorToLabel(vector: string): string {
  return vector
    .split('.')
    .map(part => part.replace(/_/g, ' '))
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' → ');
}

/**
 * Generate specific rules from vector explanations gathered across the database.
 */
function generateVectorRules(vector: string, explanations: string[]): string[] {
  const label = vectorToLabel(vector);
  const rules: string[] = [];

  rules.push(`[${label}]: This subsystem is incorporated from ${explanations.length} indexed game(s).`);

  // Deduplicate and pick the most descriptive explanations
  const unique = [...new Set(explanations)];
  const topExplanations = unique.slice(0, 3);

  for (const exp of topExplanations) {
    // Clean up explanation into a rule statement
    const cleaned = exp.charAt(0).toUpperCase() + exp.slice(1);
    rules.push(`• ${cleaned}`);
  }

  return rules;
}

/**
 * Generate conflict resolution rules to be injected into the synthesized ruleset.
 */
function generateConflictResolutions(conflicts: DetectedConflict[]): string[] {
  return conflicts.map(c => {
    const icon = c.rule.severity === 'critical' ? '🔴' : '🟡';
    return `${icon} [${c.rule.category} Reconciliation]: ${c.rule.resolution}`;
  });
}

/**
 * Synthesize a unified ruleset from the selected vectors and their game data.
 *
 * @param input - The synthesis input containing vectors, conflicts, and explanations
 * @returns A fully structured synthesized ruleset
 */
export function synthesizeRuleset(input: SynthesisInput): SynthesizedRuleset {
  const { vectors, conflicts, vectorExplanations } = input;

  // Group vectors by domain
  const domainGroups: Record<string, string[]> = {};
  for (const v of vectors) {
    const domain = getDomain(v);
    if (!domainGroups[domain]) domainGroups[domain] = [];
    domainGroups[domain].push(v);
  }

  // Generate sections
  const sections: RulesetSection[] = [];

  for (const [domain, domainVectors] of Object.entries(domainGroups).sort()) {
    const template = DOMAIN_TEMPLATES[domain];
    const heading = template ? template.heading : `📋 ${domain.charAt(0).toUpperCase() + domain.slice(1)} System`;
    const baseRules = template ? [...template.baseRules] : ['This domain governs specialized gameplay mechanics.'];

    // Add vector-specific rules
    for (const v of domainVectors) {
      const explanations = vectorExplanations[v] || [];
      if (explanations.length > 0) {
        baseRules.push('');
        baseRules.push(...generateVectorRules(v, explanations));
      } else {
        baseRules.push(`• ${vectorToLabel(v)}: Active subsystem (no game-specific data available).`);
      }
    }

    // Add conflict resolutions for this domain's conflicts
    const domainConflicts = conflicts.filter(c =>
      c.triggeringVectors.some(tv => getDomain(tv) === domain)
    );
    if (domainConflicts.length > 0) {
      baseRules.push('');
      baseRules.push('─── Conflict Reconciliation ───');
      baseRules.push(...generateConflictResolutions(domainConflicts));
    }

    sections.push({ heading, domain, rules: baseRules });
  }

  // Generate resolution notes
  const resolutionNotes = conflicts.map(c =>
    `✅ [${c.rule.category}]: ${c.rule.resolution}`
  );

  // Build a title from the dominant domains
  const domainNames = Object.keys(domainGroups)
    .slice(0, 3)
    .map(d => d.charAt(0).toUpperCase() + d.slice(1));
  const title = `OmniRuleset: ${domainNames.join(' + ')}${Object.keys(domainGroups).length > 3 ? ' + more' : ''} (${vectors.length} vectors)`;

  // Generate a starter character template based on the ruleset
  const characterTemplate = generateCharacterTemplate(domainGroups);

  return { title, sections, resolutionNotes, characterTemplate };
}

/**
 * Generate a default character template based on active domains.
 */
function generateCharacterTemplate(domainGroups: Record<string, string[]>): CharacterTemplate {
  const stats: Record<string, number> = {
    'Strength': 10,
    'Dexterity': 10,
    'Constitution': 10,
    'Intelligence': 10,
    'Wisdom': 10,
    'Charisma': 10
  };

  const skills: string[] = [];
  const abilities: string[] = [];
  const inventory: string[] = ['Traveler\'s Pack', 'Waterskin', '50 ft. Rope'];

  if (domainGroups['combat']) {
    stats['Strength'] = 14;
    stats['Constitution'] = 12;
    skills.push('Athletics', 'Weapon Handling');
    abilities.push('Basic Attack', 'Defensive Stance');
    inventory.push('Short Sword', 'Leather Armor', 'Shield');
  }

  if (domainGroups['magic']) {
    stats['Intelligence'] = 14;
    stats['Wisdom'] = 12;
    skills.push('Arcana', 'Spellcraft');
    abilities.push('Cantrip: Light', 'Spell: Magic Missile');
    inventory.push('Spellbook', 'Component Pouch');
  }

  if (domainGroups['social']) {
    stats['Charisma'] = 14;
    skills.push('Persuasion', 'Insight', 'Deception');
    abilities.push('Silver Tongue');
  }

  if (domainGroups['exploration']) {
    stats['Wisdom'] = 13;
    skills.push('Survival', 'Perception', 'Navigation');
    abilities.push('Trailblazer');
    inventory.push('Map & Compass', 'Torches (3)');
  }

  if (domainGroups['crafting']) {
    skills.push('Crafting', 'Appraisal');
    abilities.push('Basic Crafting');
    inventory.push('Artisan\'s Tools');
  }

  const maxHP = 8 + (stats['Constitution'] - 10);

  return {
    name: 'Unnamed Adventurer',
    level: 1,
    hitPoints: maxHP,
    maxHitPoints: maxHP,
    stats,
    skills: skills.length > 0 ? skills : ['General Knowledge'],
    abilities: abilities.length > 0 ? abilities : ['Improvise'],
    inventory,
    conditions: []
  };
}

/**
 * Render a synthesized ruleset to formatted HTML content string.
 */
export function renderRulesetHTML(ruleset: SynthesizedRuleset): string {
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
