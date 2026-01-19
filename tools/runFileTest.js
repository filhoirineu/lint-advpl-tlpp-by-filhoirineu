const fs = require('fs');
const path = require('path');

const analyzer = require(path.join(__dirname, '..', 'out', 'analyzer', 'index.js'));

const arg = process.argv[2];
const file = arg
  ? path.resolve(arg)
  : path.join(__dirname, '..', 'fontestotvs', 'pcp', 'ws', 'ZPCPW30.prw');

if (!fs.existsSync(file)) {
  console.error('File not found:', file);
  process.exit(2);
}

const text = fs.readFileSync(file, 'utf8');
const result = analyzer.analyzeDocument(text, file, { ignoredNames: ["aRotina", "cCadastro", "INCLUI", "ALTERA"] });

console.log('file:', file);
console.log('total issues:', result.issues.length);

const byRule = result.issues.reduce((m, i) => {
  m[i.ruleId] = (m[i.ruleId] || 0) + 1;
  return m;
}, {});

console.log('by rule:');
Object.keys(byRule)
  .sort()
  .forEach((k) => console.log(k, byRule[k]));

const docs = result.issues.filter((i) => i.ruleId === 'advpl/require-doc-header');
console.log('doc header issues:', docs.length);
docs.forEach((i) => console.log(i.line, i.message));

// write JSON report for further inspection
const out = path.join(__dirname, '..', 'out', 'reports');
try { fs.mkdirSync(out, { recursive: true }); } catch {}
fs.writeFileSync(path.join(out, path.basename(file) + '.issues.json'), JSON.stringify(result.issues, null, 2));
console.log('wrote', path.join(out, path.basename(file) + '.issues.json'));
