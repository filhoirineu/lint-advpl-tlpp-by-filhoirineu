const fs = require('fs');
const path = require('path');

const analyzer = require(path.join(__dirname, '..', 'out', 'analyzer', 'index.js'));

const file = path.join(__dirname, '..', 'fontestotvs', 'filtrasc6.prw');
const text = fs.readFileSync(file, 'utf8');

// pass default ignored names when running tests so behavior matches extension defaults
// match extension defaults
const result = analyzer.analyzeDocument(text, file, { ignoredNames: ["aRotina", "cCadastro", "INCLUI", "ALTERA"] });
console.log(JSON.stringify(result.issues || [], null, 2));
console.log('summary:', result.summary);
