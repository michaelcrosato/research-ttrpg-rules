const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === '.agents' || file === 'dist') {
      continue;
    }
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      search(fullPath);
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.ts'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('npm') || line.includes('tsc') || line.includes('build') || line.includes('clean') || line.includes('strip-exports')) {
          if (!line.includes('npm-shrinkwrap') && !line.includes('eslint') && !line.includes('class ') && !line.includes('function ')) {
            console.log(`${fullPath}:${i+1}: ${line.trim()}`);
          }
        }
      }
    }
  }
}

search(path.resolve(__dirname, '..'));
