const fs = require('fs');
const path = require('path');

const registryPath = path.resolve(__dirname, '../registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

const ttrpgs = registry.ttrpg;
const boardGames = registry.board_game;
const allGames = [...ttrpgs, ...boardGames];

function isGameCurated(game) {
  if (!game.governed_vectors || game.governed_vectors.length === 0) {
    return false;
  }
  return game.governed_vectors.some(vec => {
    const exp = game.vector_explanations ? game.vector_explanations[vec] : null;
    if (!exp) return false;
    return !exp.includes("resolves") && 
           !exp.includes("Initiative order") && 
           !exp.includes("Features structured") && 
           !exp.includes("governed by");
  });
}

console.log(`Total TTRPGs: ${ttrpgs.length}`);
console.log(`Total Board Games: ${boardGames.length}`);
console.log(`Total Games: ${allGames.length}`);

let curatedCount = 0;
let hasDescCount = 0;
let hasExtractCount = 0;
let emptyVectorsCount = 0;
let vectorCounts = {};
let uniqueVectors = new Set();

allGames.forEach(g => {
  if (isGameCurated(g)) curatedCount++;
  if (g.description && g.description.trim()) hasDescCount++;
  if (g.extract && g.extract.trim()) hasExtractCount++;
  
  const vCount = g.governed_vectors ? g.governed_vectors.length : 0;
  if (vCount === 0) emptyVectorsCount++;
  vectorCounts[vCount] = (vectorCounts[vCount] || 0) + 1;
  
  if (g.governed_vectors) {
    g.governed_vectors.forEach(v => uniqueVectors.add(v));
  }
});

console.log(`Curated Games: ${curatedCount}`);
console.log(`Games with non-empty description: ${hasDescCount}`);
console.log(`Games with non-empty extract: ${hasExtractCount}`);
console.log(`Games with 0 governed vectors: ${emptyVectorsCount}`);
console.log(`Vector Count distribution:`, vectorCounts);
console.log(`Total unique vectors: ${uniqueVectors.size}`);
