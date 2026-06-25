const fs = require('fs');
const path = require('path');

const registryPath = path.resolve(__dirname, '../registry.json');

function validateRegistry() {
  console.log('Running validation on:', registryPath);
  if (!fs.existsSync(registryPath)) {
    console.error('FAIL: registry.json does not exist.');
    process.exit(1);
  }

  let registry;
  try {
    registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  } catch (e) {
    console.error('FAIL: registry.json is not valid JSON.', e.message);
    process.exit(1);
  }

  const ttrpgs = registry.ttrpg || [];
  const boardGames = registry.board_game || [];
  const allGames = [...ttrpgs, ...boardGames];
  
  if (allGames.length === 0) {
    console.error('FAIL: Registry is empty.');
    process.exit(1);
  }

  console.log(`Analyzing ${allGames.length} games...`);

  let failures = [];
  let globalVectors = new Set();
  let fourOrMoreCount = 0;

  allGames.forEach(game => {
    const title = game.title || 'Unknown Game';
    const id = game.game_id || 'unknown_id';
    
    // a. Every entry has a non-empty governed_vectors array and matching keys in vector_explanations
    if (!game.governed_vectors || !Array.isArray(game.governed_vectors) || game.governed_vectors.length === 0) {
      failures.push(`Game "${title}" (${id}): governed_vectors is empty or not an array.`);
      return; // Skip other checks if vectors are missing
    }

    if (!game.vector_explanations) {
      failures.push(`Game "${title}" (${id}): vector_explanations is missing.`);
      return;
    }

    // Check unique vectors within the game
    const uniqueGameVectors = new Set(game.governed_vectors);
    if (uniqueGameVectors.size !== game.governed_vectors.length) {
      failures.push(`Game "${title}" (${id}): governed_vectors contains duplicates.`);
    }

    // Check for matching keys
    game.governed_vectors.forEach(vec => {
      globalVectors.add(vec);
      const explanation = game.vector_explanations[vec];
      
      if (explanation === undefined || explanation === null) {
        failures.push(`Game "${title}" (${id}): vector "${vec}" is listed in governed_vectors but missing from vector_explanations.`);
      } else {
        const expStr = String(explanation);
        
        // d. Each explanation string is at least 30 characters in length
        if (expStr.length < 30) {
          failures.push(`Game "${title}" (${id}) / Vector "${vec}": explanation is too short (${expStr.length} chars). Content: "${expStr}"`);
        }
        
        // e. Each explanation string contains the game title
        if (!expStr.includes(title)) {
          failures.push(`Game "${title}" (${id}) / Vector "${vec}": explanation does not contain game title. Content: "${expStr}"`);
        }
      }
    });

    // Check if keys in explanations match governed_vectors
    Object.keys(game.vector_explanations).forEach(key => {
      if (!game.governed_vectors.includes(key)) {
        failures.push(`Game "${title}" (${id}): explanation has key "${key}" which is not in governed_vectors.`);
      }
    });

    // c. At least 85% of games map to 4 or more unique governed vectors
    if (uniqueGameVectors.size >= 4) {
      fourOrMoreCount++;
    }
  });

  const uniqueVectorsCount = globalVectors.size;
  const pctFourOrMore = (fourOrMoreCount / allGames.length) * 100;

  console.log(`Global unique vectors count: ${uniqueVectorsCount}`);
  console.log(`Games with 4 or more vectors: ${fourOrMoreCount}/${allGames.length} (${pctFourOrMore.toFixed(2)}%)`);

  // b. The global catalog has at least 300 unique hierarchical vectors
  if (uniqueVectorsCount < 300) {
    failures.push(`Global catalog has only ${uniqueVectorsCount} unique vectors (minimum required is 300).`);
  }

  // c. At least 85% of games map to 4 or more unique governed vectors
  if (pctFourOrMore < 85) {
    failures.push(`Only ${pctFourOrMore.toFixed(2)}% of games have 4 or more vectors (minimum required is 85%).`);
  }

  if (failures.length > 0) {
    console.error(`\nValidation FAILED with ${failures.length} issues:`);
    // Print first 50 failures to avoid flooding
    failures.slice(0, 50).forEach(f => console.error(` - ${f}`));
    if (failures.length > 50) {
      console.error(` ... and ${failures.length - 50} more issues.`);
    }
    process.exit(1);
  }

  console.log('\nValidation PASSED successfully!');
  process.exit(0);
}

validateRegistry();
