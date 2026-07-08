#!/usr/bin/env node
/**
 * Overlays curated game entries (data/curated/*.json) onto registry.json.
 *
 * Matching order per curated game:
 *   1. exact game_id match anywhere in the registry -> replace in place
 *   2. normalized-title match within the same medium -> replace that entry
 *      (the curated record's game_id wins)
 *   3. no match -> append to the medium bucket
 *
 * Also stamps provenance="generated" on every legacy entry that lacks a
 * provenance value, and rebuilds registry_names.json from the merged data.
 *
 * Usage: node scripts/merge_curated.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const curatedDir = path.join(root, 'data', 'curated');
const dryRun = process.argv.includes('--dry-run');

const normTitle = (t) =>
  String(t)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const registry = JSON.parse(fs.readFileSync(path.join(root, 'registry.json'), 'utf8'));
for (const bucket of ['ttrpg', 'board_game']) registry[bucket] = registry[bucket] || [];

// Index existing entries
const byId = new Map();
const byTitle = new Map(); // "<medium>|<norm title>" -> entry ref
for (const medium of ['ttrpg', 'board_game']) {
  for (const g of registry[medium]) {
    byId.set(g.game_id, { medium, entry: g });
    const key = `${medium}|${normTitle(g.title)}`;
    if (!byTitle.has(key)) byTitle.set(key, { medium, entry: g });
  }
}

let files = [];
if (fs.existsSync(curatedDir)) {
  files = fs
    .readdirSync(curatedDir)
    .filter((f) => f.endsWith('.json'))
    .sort();
}
if (!files.length) console.warn('No curated files found in data/curated/');

let replacedById = 0,
  replacedByTitle = 0,
  appended = 0;

for (const file of files) {
  const doc = JSON.parse(fs.readFileSync(path.join(curatedDir, file), 'utf8'));
  const games = Array.isArray(doc) ? doc : doc.games;
  if (!Array.isArray(games)) {
    console.error(`ERROR: ${file} is not an array or {games:[...]} — skipped`);
    process.exitCode = 1;
    continue;
  }
  for (const g of games) {
    g.provenance = 'curated';
    const bucket = registry[g.medium];
    if (!bucket) {
      console.error(`ERROR: ${file} -> ${g.game_id}: bad medium "${g.medium}"`);
      process.exitCode = 1;
      continue;
    }
    const idHit = byId.get(g.game_id);
    const titleHit = byTitle.get(`${g.medium}|${normTitle(g.title)}`);
    if (idHit) {
      const arr = registry[idHit.medium];
      arr[arr.indexOf(idHit.entry)] = g;
      byId.set(g.game_id, { medium: idHit.medium, entry: g });
      replacedById++;
      if (dryRun) console.log(`replace-by-id: ${g.game_id}`);
    } else if (titleHit) {
      const arr = registry[titleHit.medium];
      arr[arr.indexOf(titleHit.entry)] = g;
      byId.delete(titleHit.entry.game_id);
      byId.set(g.game_id, { medium: titleHit.medium, entry: g });
      replacedByTitle++;
      if (dryRun) console.log(`replace-by-title: "${g.title}" (${titleHit.entry.game_id} -> ${g.game_id})`);
    } else {
      bucket.push(g);
      byId.set(g.game_id, { medium: g.medium, entry: g });
      appended++;
      if (dryRun) console.log(`append: ${g.game_id}`);
    }
    byTitle.set(`${g.medium}|${normTitle(g.title)}`, { medium: g.medium, entry: g });
  }
}

// Stamp provenance on remaining entries
let stamped = 0;
for (const medium of ['ttrpg', 'board_game']) {
  for (const g of registry[medium]) {
    if (!g.provenance) {
      g.provenance = 'generated';
      stamped++;
    }
  }
}

console.log(
  `Merged curated: ${replacedById} replaced by id, ${replacedByTitle} replaced by title, ${appended} appended; provenance stamped on ${stamped} legacy entries.`
);

if (dryRun) {
  console.log('(dry run — nothing written)');
  process.exit(process.exitCode || 0);
}

// Preserve the original pretty-printed formatting (2-space indent) so git
// diffs stay reviewable and show only real content changes.
fs.writeFileSync(path.join(root, 'registry.json'), JSON.stringify(registry, null, 2) + '\n');

// Rebuild the flat names index, sorted alphabetically by title to match the
// original file's convention (keeps this generated index's diff minimal).
const names = [];
for (const medium of ['ttrpg', 'board_game']) {
  for (const g of registry[medium]) {
    names.push({ title: g.title, year: g.year, genre: g.primary_genre, medium });
  }
}
names.sort((a, b) => a.title.localeCompare(b.title) || a.medium.localeCompare(b.medium));
fs.writeFileSync(path.join(root, 'registry_names.json'), JSON.stringify(names, null, 2) + '\n');
console.log(
  `Wrote registry.json (${registry.ttrpg.length} ttrpg + ${registry.board_game.length} board_game) and registry_names.json (${names.length}).`
);
