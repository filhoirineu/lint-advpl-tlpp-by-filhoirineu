const path = require('path');
const fs = require('fs');
const analyzer = require('../out/analyzer/index');
const target = path.join(__dirname, '..', 'fontestotvs', 'ti', 'compras', 'funcoes', 'IPA1COD.prw');
const txt = fs.readFileSync(target, 'utf8');
const result = analyzer.analyzeDocument(txt, target, {});
console.log(JSON.stringify(result, null, 2));
