const fs = require('fs');
const path = require('path');
const file = process.argv[2] || 'fontestotvs/ti/compras/funcoes/IPA1COD.prw';
const src = fs.readFileSync(path.resolve(file), 'utf8');
const sanitized = src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
  .replace(/\/\/[^\n\r]*/g, m => m.replace(/[^\n]/g, ' '))
  .replace(/(['"]).*?\1/g, m => m.replace(/[^\n]/g, ' '));

const re = /\bStatic\s*Function\s+([A-Za-z_][A-Za-z0-9_]*)/gi;
let m; const decls = [];
while ((m = re.exec(sanitized))) decls.push({name:m[1], idx:m.index, end: m.index + m[0].length, match:m[0]});

console.log('Found static declarations:', decls);
for (const d of decls) {
  console.log('decl idx', d.idx, 'match', sanitized.slice(d.idx, d.idx+60).replace(/\n/g,' '));
  const usageRe = new RegExp('\\b'+d.name+'\\s*\\(', 'gi');
  let used=false; let um;
  const occ = [];
  while ((um = usageRe.exec(sanitized))) {
    occ.push({idx:um.index, txt:sanitized.slice(Math.max(0,um.index-20), um.index+20).replace(/\n/g,' ')});
    if (um.index >= d.idx && um.index < d.end) continue;
    used = true;
  }
  console.log(d.name, 'used?', used, 'occ:', occ);
}
