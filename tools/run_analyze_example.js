const fs = require('fs');
const path = require('path');
const analyzer = require('../out/analyzer/index.js');

const filePath = path.resolve(process.argv[2] || 'fontestotvs/ti/compras/funcoes/IPA1COD.prw');
const src = fs.readFileSync(filePath, 'utf8');
const res = analyzer.default.analyzeDocument(src, filePath, { enabledRules: { 'advpl/no-unused-static-function': true, 'advpl/suggest-default-for-params': true }, enableRules: true });
console.log(JSON.stringify(res, null, 2));
