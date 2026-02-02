const fs = require('fs');
const path = require('path');
const file = process.argv[2] || 'fontestotvs/ti/compras/funcoes/IPA1COD.prw';
const src = fs.readFileSync(path.resolve(file), 'utf8');
const sanitized = src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
  .replace(/\/\/[^\n\r]*/g, m => m.replace(/[^\n]/g, ' '))
  .replace(/(['"]).*?\1/g, m => m.replace(/[^\n]/g, ' '));

const re = /\bStatic\s*Function\s+([A-Za-z_][A-Za-z0-9_]*)/gi;
let m; const decls = [];
while ((m = re.exec(sanitized))) decls.push({name:m[1], idx:m.index});

console.log('Found static declarations:', decls.map(d=>d.name));
for (const d of decls) {
  const usageRe = new RegExp('\\b'+d.name+'\\s*\\(', 'gi');
  let used=false; let um;
  while ((um = usageRe.exec(sanitized))) {
    if (um.index !== d.idx) { used = true; break; }
  }
  console.log(d.name, 'used?', used);
}
