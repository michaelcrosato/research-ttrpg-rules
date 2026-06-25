const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === '.agents' || file === 'dist') {
      continue;
    }
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.json'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('dist/app.js') || content.includes('rimraf') || content.includes('clean') || content.includes('unlink')) {
        console.log(`Found in: ${fullPath}`);
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('dist/app.js') || lines[i].includes('rimraf') || lines[i].includes('clean') || lines[i].includes('unlink')) {
            console.log(`  Line ${i+1}: ${lines[i].trim()}`);
          }
        }
      }
    }
  }
}

searchDir(path.resolve(__dirname, '..'));
