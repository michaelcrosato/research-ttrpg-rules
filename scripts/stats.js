#!/usr/bin/env node
/**
 * Catalog depth report for registry.json.
 * Usage: node scripts/stats.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const r = JSON.parse(fs.readFileSync(path.join(root, 'registry.json'), 'utf8'));
const all = [...(r.ttrpg || []), ...(r.board_game || [])];

const pct = (n, d) => ((100 * n) / d).toFixed(1) + '%';
const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

console.log('=== Catalog Depth Report ===');
console.log(`Games: ${all.length} (ttrpg ${r.ttrpg.length}, board_game ${r.board_game.length})`);

const counts = all.map((g) => g.governed_vectors.length).sort((a, b) => a - b);
const total = counts.reduce((a, b) => a + b, 0);
console.log(
  `Vectors per game: min ${counts[0]}, p25 ${quantile(counts, 0.25)}, median ${quantile(counts, 0.5)}, p75 ${quantile(counts, 0.75)}, p95 ${quantile(counts, 0.95)}, max ${counts[counts.length - 1]}, mean ${(total / counts.length).toFixed(1)}`
);

const vecs = new Map();
all.forEach((g) => g.governed_vectors.forEach((v) => vecs.set(v, (vecs.get(v) || 0) + 1)));
console.log(`Unique vectors in use: ${vecs.size}; total vector assignments: ${total}`);

const domains = {};
vecs.forEach((c, v) => {
  const d = v.split('.')[0];
  domains[d] = domains[d] || { vectors: 0, uses: 0 };
  domains[d].vectors++;
  domains[d].uses += c;
});
console.log('By domain (vectors in use / assignments):');
Object.entries(domains)
  .sort((a, b) => b[1].uses - a[1].uses)
  .forEach(([d, s]) => console.log(`  ${d.padEnd(12)} ${String(s.vectors).padStart(5)} / ${s.uses}`));

const prov = {};
all.forEach((g) => {
  const p = g.provenance || '(unset)';
  prov[p] = (prov[p] || 0) + 1;
});
console.log(
  'Provenance:',
  Object.entries(prov)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')
);

const curated = all.filter((g) => g.provenance === 'curated');
if (curated.length) {
  const cc = curated.map((g) => g.governed_vectors.length).sort((a, b) => a - b);
  console.log(
    `Curated depth: ${curated.length} games, median ${quantile(cc, 0.5)} vectors/game, mean ${(cc.reduce((a, b) => a + b, 0) / cc.length).toFixed(1)}`
  );
}

// Taxonomy coverage
const taxPath = path.join(root, 'data', 'taxonomy.json');
if (fs.existsSync(taxPath)) {
  const tax = JSON.parse(fs.readFileSync(taxPath, 'utf8'));
  const taxVecs = Object.keys(tax.vectors);
  const used = taxVecs.filter((v) => vecs.has(v)).length;
  const unknown = [...vecs.keys()].filter((v) => !tax.vectors[v]);
  console.log(
    `Taxonomy: ${taxVecs.length} defined vectors; ${used} used by games (${pct(used, taxVecs.length)}); ${unknown.length} game vectors NOT in taxonomy`
  );
  if (unknown.length) console.log('  e.g.', unknown.slice(0, 8).join(', '));
}

// Boilerplate heuristic: explanations that are the game title mail-merged into a shared template
const templById = new Map();
let expTotal = 0;
all.forEach((g) => {
  Object.values(g.vector_explanations || {}).forEach((text) => {
    expTotal++;
    const norm = typeof text === 'string' ? text.split(g.title).join('{T}') : '';
    templById.set(norm, (templById.get(norm) || 0) + 1);
  });
});
let boiler = 0;
templById.forEach((c) => {
  if (c >= 25) boiler += c;
});
console.log(
  `Explanations: ${expTotal} total; ~${boiler} (${pct(boiler, expTotal)}) look like shared mail-merge templates (>=25 identical after title removal)`
);
