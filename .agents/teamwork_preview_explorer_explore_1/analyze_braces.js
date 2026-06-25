const fs = require('fs');
const content = fs.readFileSync('../../src/app.ts', 'utf8');

let pDepth = 0;
let bDepth = 0;
let curlyDepth = 0;
let inString = false;
let quoteChar = '';
let isComment = false;
let isLineComment = false;

for (let i = 0; i < content.length; i++) {
  const c = content[i];
  const next = content[i + 1];

  if (isLineComment) {
    if (c === '\n' || c === '\r') {
      isLineComment = false;
    }
    continue;
  }

  if (isComment) {
    if (c === '*' && next === '/') {
      isComment = false;
      i++;
    }
    continue;
  }

  if (inString) {
    if (c === '\\') {
      i++;
    } else if (c === quoteChar) {
      inString = false;
    }
    continue;
  }

  // Not in string or comment
  if (c === '/' && next === '/') {
    isLineComment = true;
    i++;
  } else if (c === '/' && next === '*') {
    isComment = true;
    i++;
  } else if (c === '\'' || c === '"' || c === '`') {
    inString = true;
    quoteChar = c;
  } else if (c === '(') {
    pDepth++;
  } else if (c === ')') {
    pDepth--;
    if (pDepth < 0) {
      console.log(`Unmatched ) at index ${i}, line ${getLine(i)}`);
      pDepth = 0;
    }
  } else if (c === '[') {
    bDepth++;
  } else if (c === ']') {
    bDepth--;
    if (bDepth < 0) {
      console.log(`Unmatched ] at index ${i}, line ${getLine(i)}`);
      bDepth = 0;
    }
  } else if (c === '{') {
    curlyDepth++;
  } else if (c === '}') {
    curlyDepth--;
    if (curlyDepth < 0) {
      console.log(`Unmatched } at index ${i}, line ${getLine(i)}`);
      curlyDepth = 0;
    }
  }
}

console.log('Final results:');
console.log('Parentheses depth:', pDepth);
console.log('Brackets depth:', bDepth);
console.log('Curlies depth:', curlyDepth);
console.log('Still in string:', inString);

function getLine(index) {
  return content.substring(0, index).split('\n').length;
}
