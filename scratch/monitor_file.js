const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, '../dist/app.js');
console.log(`Monitoring: ${target}`);

const startTime = Date.now();
let lastExists = null;

const interval = setInterval(() => {
  const exists = fs.existsSync(target);
  const elapsed = Date.now() - startTime;
  
  if (exists !== lastExists) {
    console.log(`[${elapsed}ms] dist/app.js exists: ${exists}`);
    lastExists = exists;
  }
  
  if (elapsed > 40000) {
    clearInterval(interval);
    console.log('Finished monitoring.');
  }
}, 100);
