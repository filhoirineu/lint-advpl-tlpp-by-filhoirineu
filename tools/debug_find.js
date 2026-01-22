const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'fontestotvs', 'ti', 'compras', 'funcoes', 'IPA1COD.prw');
const s = fs.readFileSync(file,'utf8');
console.log('--- original ---');
console.log(s);
console.log('--- occurrences of cAlias in original ---');
let idx = s.indexOf('cAlias');
while (idx !== -1) { console.log('index', idx); idx = s.indexOf('cAlias', idx+1); }
const sanitized = s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/\/\/[^\n\r]*/g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(['"]).*?\1/g, (m) => m.replace(/[^\n]/g, ' '));
console.log('--- sanitized occurrences of cAlias ---');
let id2 = sanitized.indexOf('cAlias');
while (id2 !== -1) { console.log('index', id2); id2 = sanitized.indexOf('cAlias', id2+1); }
console.log('--- sanitized excerpt ---');
console.log(sanitized.slice(600,760));
