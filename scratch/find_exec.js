const fs = require('fs');
const path = require('path');

const testsDir = path.resolve(__dirname, '../tests');
const files = fs.readdirSync(testsDir);

for (const file of files) {
  if (file.endsWith('.js') || file.endsWith('.ts')) {
    const fullPath = path.join(testsDir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('exec') || line.includes('spawn') || line.includes('run') || line.includes('cmd')) {
        console.log(`${file}:${i+1}: ${line.trim()}`);
      }
    }
  }
}
