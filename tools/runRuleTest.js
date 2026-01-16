const fs = require('fs');
const path = require('path');

const analyzer = require(path.join(__dirname, '..', 'out', 'analyzer', 'index.js'));

const file = path.join(__dirname, '..', 'fontestotvs', 'pza3cada.prw');
const text = fs.readFileSync(file, 'utf8');

const result = analyzer.analyzeDocument(text, file);
console.log(JSON.stringify(result.issues || [], null, 2));
console.log('summary:', result.summary);
