const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const distTestDir = path.join(__dirname, 'dist_test');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      processDir(filePath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');

      // Strip trailing export {} or named exports like export { foo, bar };
      content = content.replace(/export\s*\{[\s\S]*?\}\s*;?/g, '');

      // Strip inline export keywords (e.g. export function, export class, export const, export let, export async)
      content = content.replace(/^export\s+(function|class|const|let|var|async\s+function)/gm, '$1');
      content = content.replace(/(\s+)export\s+(function|class|const|let|var|async\s+function)/g, '$1$2');

      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Successfully stripped exports from ${filePath}`);
    }
  }
}

processDir(distDir);

// Ensure transformers.min.js is copied to dist/
const srcTransformers = path.join(__dirname, 'src', 'transformers.min.js');
const distTransformers = path.join(__dirname, 'dist', 'transformers.min.js');
if (fs.existsSync(srcTransformers)) {
  fs.copyFileSync(srcTransformers, distTransformers);
  console.log(`Successfully copied transformers.min.js to dist/`);
}

// Copy dist to dist_test
if (fs.existsSync(distDir)) {
  copyDirRecursive(distDir, distTestDir);
  console.log(`Successfully synced dist to dist_test`);
}
