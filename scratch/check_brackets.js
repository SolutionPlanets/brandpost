const fs = require('fs');

const content = fs.readFileSync('src/app/dashboard/composer/page.tsx', 'utf8');
const lines = content.split('\n');

const stack = [];
const startLine = 1;
const endLine = lines.length;

for (let i = startLine - 1; i < endLine; i++) {
  const line = lines[i];
  const lineNum = i + 1;
  
  for (let col = 0; col < line.length; col++) {
    const char = line[col];
    if (char === '(' || char === '{' || char === '[') {
      stack.push({ char, lineNum, col: col + 1 });
    } else if (char === ')' || char === '}' || char === ']') {
      if (stack.length === 0) {
        console.log(`Unmatched closing character '${char}' at line ${lineNum}, col ${col + 1}`);
        continue;
      }
      const top = stack.pop();
      const match = (top.char === '(' && char === ')') ||
                    (top.char === '{' && char === '}') ||
                    (top.char === '[' && char === ']');
      if (!match) {
        console.log(`Mismatch: '${top.char}' at line ${top.lineNum}, col ${top.col} closed by '${char}' at line ${lineNum}, col ${col + 1}`);
      }
    }
  }
}

console.log(`Scan complete. Remaining open brackets in stack:`, stack.length);
if (stack.length > 0) {
  console.log(`Unclosed brackets:`, stack.slice(-10));
}
