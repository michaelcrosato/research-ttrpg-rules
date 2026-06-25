const fs = require('fs');
const path = require('path');

const files = [path.join(__dirname, 'dist/app.js'), path.join(__dirname, 'dist/search-worker.js')];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // Strip trailing export {}
    content = content.replace(/export\s*\{\s*\}\s*;?/g, '');
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Successfully stripped export from ${file}`);
  } else {
    console.warn(`File not found: ${file}`);
  }
}
