const fs = require('fs');
const analyzer = require('../out/analyzer/index.js');
const dir = 'fontestotvs';
const files = fs.readdirSync(dir).filter(f=>f.match(/\.(prw|PRW|tlpp|TLPP)$/));
let all=[];
for(const file of files){
  const src = fs.readFileSync(dir+'/'+file,'utf8');
  const res = analyzer.analyzeDocument(src, dir+'/'+file, { ignoredNames: ['aRotina','cCadastro','INCLUI','ALTERA'] });
  for(const iss of res.issues){ iss.file = file; all.push(iss); }
}
const multiline = all.filter(i=>/\n/.test(i.message));
console.log('files scanned', files.length, 'issues', all.length, 'multiline_msgs', multiline.length);
if(multiline.length>0) console.log(JSON.stringify(multiline.slice(0,20), null, 2));
