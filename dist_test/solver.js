/**
 * src/solver.ts
 *
 * Logical Consistency Solver for the TTRPG Systems Indexer/Rules Explorer.
 * Analyzes selected vectors to detect mechanical overlaps, mutually exclusive states,
 * and directed graph cycles (infinite loop modifiers).
 */
const DEPENDENCY_RULES = [
    { vector: 'combat.melee.rage', from: 'STR', to: 'damage' },
    { vector: 'combat.damage.feedback', from: 'damage', to: 'STR' },
    { vector: 'magic.resource.mana_burn', from: 'mana', to: 'health' },
    { vector: 'magic.resource.feedback_loop', from: 'health', to: 'mana' },
];
const EXCLUSIVE_RULES = [
    {
        id: 'roll-over-vs-roll-under',
        category: 'Resolution Direction',
        vectors: ['resolution.roll_over', 'resolution.roll_under'],
        description: 'Roll-over systems conflict with roll-under systems.',
        resolution: 'Standardize to roll-over; stat becomes the modifier added to the roll.',
    },
    {
        id: 'dice-pool-vs-single-die',
        category: 'Resolution Mechanic',
        vectors: ['resolution.dice_pool', 'resolution.single_die'],
        description: 'Dice pool systems fundamentally conflict with single-die resolution.',
        resolution: 'Use dice pool as primary; convert single-die targets to pool difficulty thresholds.',
    },
    {
        id: 'turn-based-vs-realtime',
        category: 'Action Economy',
        vectors: ['combat.structure.turn_based', 'combat.structure.simultaneous'],
        description: 'Strict turn-based combat conflicts with simultaneous action declaration.',
        resolution: 'Use simultaneous declaration with turn-based resolution phase.',
    },
];
/**
 * Checks if a selected vector matches a pattern (exact match or starts with pattern + '.')
 */
function matchVector(selected, pattern) {
    return selected === pattern || selected.startsWith(pattern + '.');
}
/**
 * Helper to find all selected vectors matching a pattern.
 */
function getMatchingSelected(selectedVectors, pattern) {
    return selectedVectors.filter((v) => matchVector(v, pattern));
}
/**
 * Detects directed graph cycles (infinite loops) in attribute dependencies.
 */
function detectDependencyCycles(selectedVectors) {
    const activeEdges = [];
    for (const rule of DEPENDENCY_RULES) {
        const matches = getMatchingSelected(selectedVectors, rule.vector);
        if (matches.length > 0) {
            activeEdges.push({ from: rule.from, to: rule.to, vector: matches[0] });
        }
    }
    if (activeEdges.length === 0) {
        return [];
    }
    // Build Adjacency List
    const adj = {};
    const nodes = new Set();
    for (const edge of activeEdges) {
        nodes.add(edge.from);
        nodes.add(edge.to);
        if (!adj[edge.from]) {
            adj[edge.from] = [];
        }
        adj[edge.from].push({ to: edge.to, vector: edge.vector });
    }
    const detected = [];
    const visited = new Set();
    const recStack = new Set();
    const path = [];
    function dfs(node) {
        visited.add(node);
        recStack.add(node);
        const neighbors = adj[node] || [];
        for (const neighbor of neighbors) {
            path.push({ from: node, node: neighbor.to, vector: neighbor.vector });
            if (!visited.has(neighbor.to)) {
                if (dfs(neighbor.to))
                    return true;
            }
            else if (recStack.has(neighbor.to)) {
                // Cycle detected! Extract cycle path
                const cycleStartIndex = path.findIndex((p) => p.from === neighbor.to);
                const cyclePath = path.slice(cycleStartIndex >= 0 ? cycleStartIndex : 0);
                const cycleVectors = [...new Set(cyclePath.map((p) => p.vector))];
                const cycleNodes = [neighbor.to, ...cyclePath.map((p) => p.node)];
                detected.push({
                    rule: {
                        id: `infinite-loop-${cycleNodes.join('-').toLowerCase()}`,
                        category: 'Infinite Loop Modifier',
                        vectorPatterns: cycleVectors,
                        description: `Circular dependency detected between modifiers: ${cycleNodes.join(' -> ')}.`,
                        severity: 'critical',
                        resolution: 'Introduce a feedback dampener or cap maximum modifier values to break the infinite loop.',
                    },
                    triggeringVectors: cycleVectors,
                    resolved: false,
                });
                return true;
            }
            path.pop();
        }
        recStack.delete(node);
        return false;
    }
    for (const node of nodes) {
        if (!visited.has(node)) {
            dfs(node);
        }
    }
    return detected;
}
/**
 * Main logical analysis entrypoint.
 */
function analyzeLogicalConflicts(selectedVectors) {
    const conflicts = [];
    // 1. Mutually Exclusive States (Critical)
    for (const rule of EXCLUSIVE_RULES) {
        const matchedVectors = [];
        for (const pattern of rule.vectors) {
            const matches = getMatchingSelected(selectedVectors, pattern);
            if (matches.length > 0) {
                matchedVectors.push(...matches);
            }
        }
        // If we matched more than one of the exclusive patterns
        const uniqueMatchingPatterns = rule.vectors.filter((pattern) => getMatchingSelected(selectedVectors, pattern).length > 0);
        if (uniqueMatchingPatterns.length > 1) {
            conflicts.push({
                rule: {
                    id: rule.id,
                    category: rule.category,
                    vectorPatterns: rule.vectors,
                    description: rule.description,
                    severity: 'critical',
                    resolution: rule.resolution,
                },
                triggeringVectors: [...new Set(matchedVectors)],
                resolved: false,
            });
        }
    }
    // 2. Infinite Loop Modifiers (Critical)
    const cycles = detectDependencyCycles(selectedVectors);
    conflicts.push(...cycles);
    // 3. Overlapping Mechanics (Warning)
    // Check if multiple vectors for the same mechanical namespace are selected.
    // The namespace is the prefix of the vector before the last dot.
    // Group by namespace, excluding namespace checks that are already covered by mutually exclusive/critical rules.
    const namespaceGroups = {};
    for (const vector of selectedVectors) {
        const parts = vector.split('.');
        if (parts.length > 1) {
            const namespace = parts.slice(0, -1).join('.');
            if (!namespaceGroups[namespace]) {
                namespaceGroups[namespace] = [];
            }
            namespaceGroups[namespace].push(vector);
        }
    }
    for (const [namespace, vectors] of Object.entries(namespaceGroups)) {
        if (vectors.length > 1) {
            // Check if this overlap is already completely covered by an exclusive critical rule or cycle to avoid redundant warning
            const isAlreadyCritical = conflicts.some((c) => c.rule.severity === 'critical' && vectors.every((v) => c.triggeringVectors.includes(v)));
            if (!isAlreadyCritical) {
                const category = namespace
                    .split('.')
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                // Specific wording for initiative or generic overlap description
                let desc = `Multiple mechanics selected under the '${namespace}' namespace, causing overlapping rules.`;
                let resolution = `Choose one primary mechanic for '${namespace}' or hybridize them with specific priority rules.`;
                let id = `overlap-${namespace.replace(/\./g, '-')}`;
                if (namespace === 'combat.initiative') {
                    desc = 'Dexterity-based initiative conflicts with narrative initiative flow.';
                    resolution = 'Use narrative initiative by default, with optional dexterity checks for contested moments.';
                    id = 'initiative-dex-vs-narrative';
                }
                else if (namespace === 'combat.damage') {
                    desc = 'Hit point pools conflict with wound level tracks.';
                    resolution = 'Implement wound thresholds on the HP pool—crossing boundaries inflicts wound penalties.';
                    id = 'hp-vs-wound-track';
                }
                else if (namespace === 'character.progression') {
                    desc = 'Class-based progression conflicts with freeform classless advancement.';
                    resolution = 'Offer class templates as optional starting packages that can be freely customized.';
                    id = 'class-vs-classless';
                }
                else if (namespace === 'magic.resource') {
                    desc = 'Vancian spell slots conflict with mana pool systems.';
                    resolution = 'Spell slots define max power tier; mana fuels additional castings within each tier.';
                    id = 'spell-slots-vs-mana';
                }
                else if (namespace === 'combat.positioning') {
                    desc = 'Grid-based tactical positioning conflicts with theater-of-mind freeform.';
                    resolution = 'Use zone-based positioning as middle ground: abstract areas optionally overlaying a grid.';
                    id = 'grid-vs-theater';
                }
                else if (namespace === 'consequences') {
                    desc = 'Stress/consequence tracks conflict with raw numerical HP damage.';
                    resolution = 'HP damage triggers stress conditions at threshold breakpoints for dual-layer consequences.';
                    id = 'stress-vs-hp';
                }
                else if (namespace === 'resolution') {
                    desc = 'Dedicated skill checks conflict with raw attribute-only checks.';
                    resolution = 'Attribute checks are baseline; trained skills add a proficiency bonus.';
                    id = 'skill-vs-attribute-check';
                }
                conflicts.push({
                    rule: {
                        id,
                        category: `${category} Overlap`,
                        vectorPatterns: [namespace],
                        description: desc,
                        severity: 'warning',
                        resolution,
                    },
                    triggeringVectors: vectors,
                    resolved: false,
                });
            }
        }
    }
    return conflicts;
}
// Global exposure
if (typeof window !== 'undefined') {
    window.analyzeLogicalConflicts = analyzeLogicalConflicts;
}
