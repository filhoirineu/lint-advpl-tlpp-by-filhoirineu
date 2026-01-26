const fs = require('fs');
const path = require('path');

function walk(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const fp = path.join(dir, file);
    const stat = fs.statSync(fp);
    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === '.git' || file === 'out') return; // skip heavy dirs
      walk(fp, filelist);
    } else {
      filelist.push(fp);
    }
  });
  return filelist;
}

function isTargetFile(f) {
  return f.endsWith('.prw') || f.endsWith('.prx') || f.endsWith('.tlpp');
}

const analyzerPath = path.join(__dirname, '..', 'out', 'analyzer', 'index.js');
if (!fs.existsSync(analyzerPath)) {
  console.error('Analyzer not found at', analyzerPath);
  process.exit(2);
}
const analyzer = require(analyzerPath);

const root = path.join(__dirname, '..');
const all = walk(root);
const targets = all.filter(isTargetFile);

let totalIssues = 0;
const filesWithIssues = [];

for (const f of targets) {
  try {
    const src = fs.readFileSync(f, 'utf8');
    const res = analyzer.default.analyzeDocument(src, path.relative(root, f).replace(/\\/g, '/'));
    if (res && res.issues && res.issues.length > 0) {
      totalIssues += res.issues.length;
      filesWithIssues.push({ file: path.relative(root, f), count: res.issues.length, issues: res.issues.slice(0,5) });
    }
  } catch (e) {
    console.error('Error analyzing', f, e && e.message);
  }
}

console.log(JSON.stringify({ scanned: targets.length, totalIssues, filesWithIssues }, null, 2));
