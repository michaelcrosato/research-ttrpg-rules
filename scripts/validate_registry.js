#!/usr/bin/env node
/**
 * Validates registry.json (or a curated data file passed as argv[2]) against
 * the v2 schema and the canonical taxonomy (data/taxonomy.json).
 *
 * Usage:
 *   node scripts/validate_registry.js                  # validate registry.json
 *   node scripts/validate_registry.js data/curated/x.json --strict
 *
 * --strict (used for curated files) additionally requires:
 *   - provenance === "curated"
 *   - >= 12 governed vectors per game
 *   - explanations >= 60 chars
 *   - resolution_core, designers, publisher present (ttrpg & board_game)
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const strict = args.includes('--strict');
const target = args.find((a) => !a.startsWith('--')) || 'registry.json';
const targetPath = path.isAbsolute(target) ? target : path.join(root, target);

const SEGMENT_RE = /^[a-z0-9]+(_[a-z0-9]+)*$/;
const ID_RE = /^[a-z0-9]+(_[a-z0-9]+)*$/;
const MEDIA = ['ttrpg', 'board_game'];
const PROVENANCE = ['curated', 'generated', 'imported'];

let taxonomy = null;
const taxonomyPath = path.join(root, 'data', 'taxonomy.json');
if (fs.existsSync(taxonomyPath)) {
  taxonomy = JSON.parse(fs.readFileSync(taxonomyPath, 'utf8'));
} else {
  console.warn(
    'WARN: data/taxonomy.json not found — vector existence checks skipped. Run npm run data:taxonomy first.'
  );
}

const raw = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
// Accept: full registry {ttrpg:[],board_game:[]}, {games:[]}, or a bare array.
let games;
if (Array.isArray(raw)) games = raw;
else if (Array.isArray(raw.games)) games = raw.games;
else if (raw.ttrpg || raw.board_game) games = [...(raw.ttrpg || []), ...(raw.board_game || [])];
else {
  console.error('ERROR: unrecognized file shape');
  process.exit(1);
}

let errors = 0;
let warnings = 0;
const err = (id, msg) => {
  errors++;
  if (errors <= 50) console.error(`ERROR [${id}]: ${msg}`);
};
const warn = (id, msg) => {
  warnings++;
  if (warnings <= 20) console.warn(`WARN  [${id}]: ${msg}`);
};

const seenIds = new Set();
for (const g of games) {
  const id = g.game_id || '(missing id)';
  if (!g.game_id || !ID_RE.test(g.game_id)) err(id, 'game_id missing or not snake_case');
  if (seenIds.has(g.game_id)) err(id, 'duplicate game_id');
  seenIds.add(g.game_id);
  if (typeof g.title !== 'string' || !g.title.trim()) err(id, 'title missing');
  if (!Number.isInteger(g.year) || g.year < 1800 || g.year > 2027) err(id, `year out of range: ${g.year}`);
  if (!MEDIA.includes(g.medium)) err(id, `medium invalid: ${g.medium}`);
  if (typeof g.primary_genre !== 'string' || !g.primary_genre) err(id, 'primary_genre missing');
  if (!Array.isArray(g.subgenres)) err(id, 'subgenres must be an array');
  if (!Array.isArray(g.governed_vectors) || g.governed_vectors.length === 0) {
    err(id, 'governed_vectors missing/empty');
    continue;
  }
  const vecSet = new Set(g.governed_vectors);
  if (vecSet.size !== g.governed_vectors.length) err(id, 'duplicate governed_vectors');
  for (const v of g.governed_vectors) {
    const parts = v.split('.');
    if (parts.length !== 3 || !parts.every((p) => SEGMENT_RE.test(p))) {
      err(id, `malformed vector "${v}"`);
      continue;
    }
    if (taxonomy && !taxonomy.vectors[v]) err(id, `vector not in taxonomy: "${v}"`);
  }
  const expKeys = Object.keys(g.vector_explanations || {});
  for (const k of expKeys) {
    if (!vecSet.has(k)) err(id, `explanation for unlisted vector "${k}"`);
    const text = g.vector_explanations[k];
    if (typeof text !== 'string' || text.trim().length < 20) err(id, `explanation too short for "${k}"`);
  }
  for (const v of g.governed_vectors) {
    if (!g.vector_explanations || !g.vector_explanations[v]) err(id, `missing explanation for "${v}"`);
  }

  // Optional v2 fields
  if (g.provenance !== undefined && !PROVENANCE.includes(g.provenance)) err(id, `bad provenance: ${g.provenance}`);
  if (g.designers !== undefined && (!Array.isArray(g.designers) || g.designers.some((d) => typeof d !== 'string')))
    err(id, 'designers must be string[]');
  if (g.publisher !== undefined && typeof g.publisher !== 'string') err(id, 'publisher must be a string');
  if (g.resolution_core !== undefined && typeof g.resolution_core !== 'string')
    err(id, 'resolution_core must be a string');
  if (g.crunch !== undefined && (!Number.isInteger(g.crunch) || g.crunch < 1 || g.crunch > 5))
    err(id, 'crunch must be an integer 1-5');
  if (g.family !== undefined && typeof g.family !== 'string') err(id, 'family must be a string');
  if (g.player_count !== undefined) {
    const pc = g.player_count;
    if (!pc || !Number.isInteger(pc.min) || !Number.isInteger(pc.max) || pc.min < 1 || pc.max < pc.min)
      err(id, 'player_count must be {min,max} with 1 <= min <= max');
  }
  if (g.playtime_minutes !== undefined) {
    const pt = g.playtime_minutes;
    if (!pt || !Number.isInteger(pt.min) || !Number.isInteger(pt.max) || pt.min < 1 || pt.max < pt.min)
      err(id, 'playtime_minutes must be {min,max} with 1 <= min <= max');
  }

  if (strict) {
    if (g.provenance !== 'curated') err(id, 'strict: provenance must be "curated"');
    if (g.governed_vectors.length < 12) err(id, `strict: only ${g.governed_vectors.length} vectors (need >= 12)`);
    for (const [k, text] of Object.entries(g.vector_explanations || {})) {
      if (typeof text === 'string' && text.trim().length < 60) err(id, `strict: explanation for "${k}" under 60 chars`);
    }
    if (!g.resolution_core) err(id, 'strict: resolution_core required');
    if (!g.designers || !g.designers.length) err(id, 'strict: designers required');
    if (!g.publisher) err(id, 'strict: publisher required');
    if (!g.crunch) warn(id, 'strict: crunch recommended');
  }
}

console.log(
  `Validated ${games.length} games from ${path.relative(root, targetPath)}: ${errors} errors, ${warnings} warnings${strict ? ' (strict)' : ''}`
);
if (errors > 50) console.error(`(only first 50 errors shown; total ${errors})`);
process.exit(errors ? 1 : 0);
