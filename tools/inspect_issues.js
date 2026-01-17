const fs = require('fs');
const analyzer = require('../out/analyzer/index.js');
const file = process.argv[2] || 'fontestotvs/pcp/ws/ZPCPW30.prw';
const src = fs.readFileSync(file,'utf8');
const res = analyzer.analyzeDocument(src, file, { ignoredNames: ['aRotina','cCadastro','INCLUI','ALTERA'] });
const issues = res.issues.filter(i=>i.ruleId==='advpl/suggest-default-for-params');
console.log('file', file, 'issues', issues.length);
for(const iss of issues){
  const line = iss.line;
  const parts = src.split(/\r?\n/);
  const context = parts.slice(Math.max(0,line-4), Math.min(parts.length, line+3)).map((l,i)=>`${line-3+i}: ${l}`);
  console.log('---');
  console.log('line',iss.line,'col',iss.column,'func',iss.functionName,'message',iss.message);
  console.log(context.join('\n'));
}
