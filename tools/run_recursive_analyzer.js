const fs = require('fs');
const path = require('path');
const analyzer = require('../out/analyzer/index.js');

const ROOT = process.argv[2] || 'fontestotvs';
const OUT = process.argv[3] || 'out/analyzer_report.json';

function walk(dir) {
  const res = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const d of list) {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) {
      res.push(...walk(full));
    } else if (d.isFile()) {
      if (full.match(/\.(prw|PRW|tlpp|TLPP|prg|PRG)$/)) res.push(full);
    }
  }
  return res;
}

function analyzeFiles(files) {
  const summary = { totalFiles: files.length, totalIssues: 0, byRule: {}, byFile: {} };
  for (const f of files) {
    try {
      const src = fs.readFileSync(f, 'utf8');
      const res = analyzer.analyzeDocument(src, f, { ignoredNames: ['aRotina','cCadastro','INCLUI','ALTERA'] });
      summary.byFile[f] = { issues: res.issues.length };
      summary.totalIssues += res.issues.length;
      for (const iss of res.issues) {
        const r = iss.ruleId || 'unknown';
        summary.byRule[r] = (summary.byRule[r] || 0) + 1;
        if (!summary.byFile[f].top) summary.byFile[f].top = {};
        summary.byFile[f].top[r] = (summary.byFile[f].top[r] || 0) + 1;
      }
    } catch (e) {
      summary.byFile[f] = { error: String(e) };
    }
  }
  return summary;
}

function main() {
  if (!fs.existsSync(ROOT)) {
    console.error('Root path does not exist:', ROOT);
    process.exit(2);
  }
  const files = walk(ROOT);
  console.log('Files to analyze:', files.length);
  const summary = analyzeFiles(files);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(summary, null, 2), 'utf8');
  console.log('Report written to', OUT);
}

main();
