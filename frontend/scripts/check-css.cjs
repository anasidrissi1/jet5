const fs = require('fs');
const path = require('path');

function collectCssFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectCssFiles(fullPath));
    } else if (entry.isFile() && fullPath.endsWith('.css')) {
      files.push(fullPath);
    }
  }
  return files;
}

function checkFile(filePath, root) {
  const text = fs.readFileSync(filePath, 'utf8');
  let balance = 0;
  let line = 1;
  const issues = [];

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '{') {
      balance += 1;
    } else if (ch === '}') {
      balance -= 1;
      if (balance < 0) {
        issues.push(`Extra closing brace in ${path.relative(root, filePath)} at line ${line}`);
        balance = 0;
      }
    }

    if (ch === '\n') {
      line += 1;
    }
  }

  if (balance > 0) {
    issues.push(`Missing closing brace in ${path.relative(root, filePath)}`);
  }

  return issues;
}

function main() {
  const root = path.join(process.cwd(), 'src');
  const cssFiles = collectCssFiles(root);
  const problems = cssFiles.flatMap((file) => checkFile(file, root));

  if (problems.length) {
    problems.forEach((msg) => console.log(msg));
    process.exit(1);
  } else {
    console.log('All CSS braces balanced');
  }
}

main();
