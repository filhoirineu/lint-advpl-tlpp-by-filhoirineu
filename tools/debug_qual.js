const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'fontestotvs', 'ti', 'compras', 'funcoes', 'IPA1COD.prw');
const s = fs.readFileSync(file,'utf8');
const sanitized = s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/\/\/[^\n\r]*/g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(['"]).*?\1/g, (m) => m.replace(/[^\n]/g, ' '));
console.log('--- sanitized ---');
console.log(sanitized);
const qualRe = /\b(\(?\s*[A-Za-z0-9_]+\s*\)?)\s*->\s*([A-Za-z0-9_]+)\b/g;
let m;
while ((m = qualRe.exec(sanitized))) {
  console.log('match at', m.index, 'groups', m[1], m[2]);
}
