/**
 * src/conflict-checker.ts
 *
 * Structural Conflict Analysis Module for the OmniRuleset Sandbox.
 * Detects mechanical contradictions among selected rules vectors
 * using pattern-based heuristics and known incompatibility mappings.
 */

// ============================================================================
// Conflict Rule Definitions
// ============================================================================

export interface ConflictRule {
  /** Unique identifier for the conflict pattern. */
  id: string;
  /** Human-readable conflict category (e.g., "Dice System", "Turn Sequence"). */
  category: string;
  /** Set of vector namespace prefixes that this rule applies to. */
  vectorPatterns: string[];
  /** Short description of the conflict. */
  description: string;
  /** Severity level for UI display. */
  severity: 'warning' | 'critical';
  /** Suggested resolution approach. */
  resolution: string;
}

export interface DetectedConflict {
  rule: ConflictRule;
  /** The specific vectors that triggered this conflict. */
  triggeringVectors: string[];
  /** Whether the synthesizer has auto-resolved this conflict. */
  resolved: boolean;
}

/**
 * Known conflict patterns between common TTRPG mechanical subsystems.
 * Each pattern defines two or more vector prefixes that are mechanically
 * incompatible and require reconciliation during synthesis.
 */
const CONFLICT_RULES: ConflictRule[] = [
  {
    id: 'dice-pool-vs-single-die',
    category: 'Resolution Mechanic',
    vectorPatterns: ['resolution.dice_pool', 'resolution.single_die'],
    description: 'Dice pool systems (roll multiple dice, count successes) fundamentally conflict with single-die resolution (roll one die vs target number).',
    severity: 'critical',
    resolution: 'Use dice pool as the primary resolution and convert single-die targets to pool difficulty thresholds.'
  },
  {
    id: 'initiative-dex-vs-narrative',
    category: 'Turn Sequence',
    vectorPatterns: ['combat.initiative.dexterity_based', 'combat.initiative.narrative'],
    description: 'Dexterity-based initiative (stat-derived turn order) conflicts with narrative initiative (fiction-first turn flow).',
    severity: 'warning',
    resolution: 'Use narrative initiative by default, with optional dexterity checks for contested moments.'
  },
  {
    id: 'hp-vs-wound-track',
    category: 'Damage System',
    vectorPatterns: ['combat.damage.hit_points', 'combat.damage.wound_levels'],
    description: 'Hit point pools (numerical HP deduction) conflict with wound level tracks (discrete wound states like Light/Moderate/Critical).',
    severity: 'critical',
    resolution: 'Implement wound thresholds on the HP pool—crossing HP boundaries inflicts wound level penalties.'
  },
  {
    id: 'class-vs-classless',
    category: 'Character Architecture',
    vectorPatterns: ['character.progression.class_based', 'character.progression.classless'],
    description: 'Class-based progression (predefined archetypes) conflicts with freeform classless advancement (point-buy skills).',
    severity: 'warning',
    resolution: 'Offer class templates as optional starting packages that can be freely customized during advancement.'
  },
  {
    id: 'turn-based-vs-realtime',
    category: 'Action Economy',
    vectorPatterns: ['combat.structure.turn_based', 'combat.structure.simultaneous'],
    description: 'Strict turn-based combat (sequential actions) conflicts with simultaneous action declaration (all players act at once).',
    severity: 'critical',
    resolution: 'Use simultaneous declaration with a turn-based resolution phase for ordered outcome adjudication.'
  },
  {
    id: 'spell-slots-vs-mana',
    category: 'Magic System',
    vectorPatterns: ['magic.resource.spell_slots', 'magic.resource.mana_pool'],
    description: 'Vancian spell slot systems (fixed prepared spells) conflict with mana pool systems (flexible point-spend casting).',
    severity: 'warning',
    resolution: 'Merge into a hybrid: spell slots define maximum power tier, while mana fuels additional castings within each tier.'
  },
  {
    id: 'tactical-grid-vs-theater-of-mind',
    category: 'Spatial System',
    vectorPatterns: ['combat.positioning.grid_based', 'combat.positioning.theater_of_mind'],
    description: 'Grid-based tactical positioning (exact squares/hexes) conflicts with theater-of-mind freeform positioning.',
    severity: 'warning',
    resolution: 'Use zone-based positioning as a middle ground: abstract areas that can optionally overlay a grid.'
  },
  {
    id: 'roll-over-vs-roll-under',
    category: 'Resolution Direction',
    vectorPatterns: ['resolution.roll_over', 'resolution.roll_under'],
    description: 'Roll-over systems (beat a target number) conflict with roll-under systems (roll below your stat).',
    severity: 'critical',
    resolution: 'Standardize to roll-over with derived target numbers (stat becomes the modifier added to the roll).'
  },
  {
    id: 'narrative-stress-vs-numerical-damage',
    category: 'Consequence System',
    vectorPatterns: ['consequences.stress_track', 'combat.damage.hit_points'],
    description: 'Stress/consequence tracks (narrative conditions) conflict with raw numerical HP damage.',
    severity: 'warning',
    resolution: 'HP damage triggers stress conditions at threshold breakpoints for a dual-layer consequence system.'
  },
  {
    id: 'skill-check-vs-attribute-check',
    category: 'Check Architecture',
    vectorPatterns: ['resolution.skill_checks', 'resolution.attribute_checks'],
    description: 'Dedicated skill check systems conflict with raw attribute-only check systems.',
    severity: 'warning',
    resolution: 'Attribute checks serve as the baseline; trained skills add a proficiency bonus to the attribute roll.'
  }
];

// ============================================================================
// Conflict Detection Engine
// ============================================================================

/**
 * Check if a vector matches a pattern (exact or prefix match).
 */
function vectorMatchesPattern(vector: string, pattern: string): boolean {
  return vector === pattern || vector.startsWith(pattern + '.');
}

/**
 * Analyze a set of selected vectors for mechanical conflicts.
 *
 * @param selectedVectors - Array of vector strings selected by the user
 * @returns Array of detected conflicts with triggering vector details
 */
export function analyzeConflicts(selectedVectors: string[]): DetectedConflict[] {
  const detected: DetectedConflict[] = [];

  for (const rule of CONFLICT_RULES) {
    const matchedPatterns: string[][] = rule.vectorPatterns.map(pattern =>
      selectedVectors.filter(v => vectorMatchesPattern(v, pattern))
    );

    // Conflict triggers when ALL patterns in the rule have at least one matching vector
    const allPatternsMatched = matchedPatterns.every(matches => matches.length > 0);

    if (allPatternsMatched) {
      const triggeringVectors = matchedPatterns.flat();
      // Remove duplicates
      const uniqueTriggers = [...new Set(triggeringVectors)];

      detected.push({
        rule,
        triggeringVectors: uniqueTriggers,
        resolved: false
      });
    }
  }

  return detected;
}

/**
 * Get a human-readable summary of all conflicts for the synthesizer.
 */
export function getConflictSummary(conflicts: DetectedConflict[]): string {
  if (conflicts.length === 0) return 'No mechanical conflicts detected.';

  const lines = conflicts.map((c, i) => {
    const icon = c.rule.severity === 'critical' ? '🔴' : '🟡';
    return `${icon} ${i + 1}. [${c.rule.category}] ${c.rule.description}\n   Resolution: ${c.rule.resolution}`;
  });

  return `Detected ${conflicts.length} conflict(s):\n\n${lines.join('\n\n')}`;
}

/**
 * Get all registered conflict rules (for testing and UI enumeration).
 */
export function getConflictRules(): ConflictRule[] {
  return [...CONFLICT_RULES];
}
