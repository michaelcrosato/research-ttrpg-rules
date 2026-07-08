#!/usr/bin/env node
/**
 * Bundles the per-domain taxonomy files in data/taxonomy/*.json into the
 * canonical data/taxonomy.json consumed by the validator and the app.
 *
 * Output shape:
 * {
 *   version: 2,
 *   generated_at: ISO string,
 *   domains: { <domain>: { description, applies_to, subsystems: { <sub>: { description, focuses: { <focus>: definition } } } } },
 *   vectors: { "<domain>.<sub>.<focus>": { definition, domain, subsystem, focus, applies_to } },
 *   stats: { domains, subsystems, vectors }
 * }
 */
const fs = require('fs');
const path = require('path');

const taxonomyDir = path.join(__dirname, '..', 'data', 'taxonomy');
const outPath = path.join(__dirname, '..', 'data', 'taxonomy.json');

const SEGMENT_RE = /^[a-z0-9]+(_[a-z0-9]+)*$/;

function fail(msg) {
  console.error('ERROR: ' + msg);
  process.exitCode = 1;
}

const files = fs
  .readdirSync(taxonomyDir)
  .filter((f) => f.endsWith('.json'))
  .sort();

const domains = {};
const vectors = {};
let subsystemCount = 0;

for (const file of files) {
  const full = path.join(taxonomyDir, file);
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (e) {
    fail(`${file}: invalid JSON (${e.message})`);
    continue;
  }
  const domain = doc.domain;
  if (!domain || !SEGMENT_RE.test(domain)) {
    fail(`${file}: missing or invalid "domain" (${domain})`);
    continue;
  }
  if (domain !== path.basename(file, '.json')) {
    fail(`${file}: domain "${domain}" does not match filename`);
  }
  if (domains[domain]) {
    fail(`${file}: duplicate domain "${domain}"`);
    continue;
  }
  if (typeof doc.description !== 'string' || doc.description.length < 10) {
    fail(`${file}: domain description missing/too short`);
  }
  const applies = Array.isArray(doc.applies_to) ? doc.applies_to : [];
  if (!applies.length || applies.some((m) => m !== 'ttrpg' && m !== 'board_game')) {
    fail(`${file}: applies_to must be a non-empty subset of ["ttrpg","board_game"]`);
  }
  const subsystems = doc.subsystems || {};
  for (const [sub, subDoc] of Object.entries(subsystems)) {
    subsystemCount++;
    if (!SEGMENT_RE.test(sub)) fail(`${file}: bad subsystem name "${sub}"`);
    if (typeof subDoc.description !== 'string' || !subDoc.description) {
      fail(`${file}: subsystem "${sub}" missing description`);
    }
    const focuses = subDoc.focuses || {};
    if (!Object.keys(focuses).length) fail(`${file}: subsystem "${sub}" has no focuses`);
    for (const [focus, definition] of Object.entries(focuses)) {
      if (!SEGMENT_RE.test(focus)) fail(`${file}: bad focus name "${sub}.${focus}"`);
      if (typeof definition !== 'string' || definition.trim().length < 25) {
        fail(`${file}: definition for "${domain}.${sub}.${focus}" missing or too short`);
      }
      const key = `${domain}.${sub}.${focus}`;
      if (vectors[key]) fail(`duplicate vector ${key}`);
      vectors[key] = { definition, domain, subsystem: sub, focus, applies_to: applies };
    }
  }
  domains[domain] = {
    description: doc.description,
    applies_to: applies,
    subsystems,
  };
}

if (process.exitCode) {
  console.error('Taxonomy bundle FAILED — fix the errors above.');
  process.exit(1);
}

const bundle = {
  version: 2,
  domains,
  vectors,
  stats: {
    domains: Object.keys(domains).length,
    subsystems: subsystemCount,
    vectors: Object.keys(vectors).length,
  },
};

fs.writeFileSync(outPath, JSON.stringify(bundle));

// Compact one-vector-per-line list for tooling and curation workflows.
const listPath = path.join(__dirname, '..', 'data', 'taxonomy_vectors.txt');
fs.writeFileSync(listPath, Object.keys(vectors).sort().join('\n') + '\n');

console.log(
  `Taxonomy bundled: ${bundle.stats.domains} domains, ${bundle.stats.subsystems} subsystems, ${bundle.stats.vectors} vectors -> ${path.relative(process.cwd(), outPath)}`
);
