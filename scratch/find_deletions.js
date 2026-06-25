const fs = require('fs');
const path = require('path');

const files = [
  path.resolve(__dirname, '../tests/tier12.test.js'),
  path.resolve(__dirname, '../tests/tier34.test.js')
];

for (const file of files) {
  console.log(`Checking file: ${file}`);
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('unlink') || line.includes('rmDir') || line.includes('rm') || line.includes('delete') || line.includes('fs.') || line.includes('dist')) {
      console.log(`Line ${i + 1}: ${line.trim()}`);
    }
  }
}
