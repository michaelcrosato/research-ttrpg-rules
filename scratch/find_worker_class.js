const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve(__dirname, '../src/app.ts'), 'utf8');
const startIdx = content.indexOf('class LocalSearchWorker');
if (startIdx !== -1) {
  const snippet = content.slice(startIdx, startIdx + 2000);
  console.log(snippet);
} else {
  console.log('class LocalSearchWorker not found');
}
