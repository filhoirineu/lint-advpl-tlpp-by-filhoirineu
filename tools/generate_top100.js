const fs = require('fs');
const R = JSON.parse(fs.readFileSync('out/analyzer_report_fontestotvs.json','utf8'));
const arr = Object.keys(R.byFile).map(f=>({file:f,issues:R.byFile[f].issues||0,top:R.byFile[f].top||{}})).sort((a,b)=>b.issues-a.issues).slice(0,100);
fs.writeFileSync('out/top100_issues.json', JSON.stringify({totalFiles:R.totalFiles,totalIssues:R.totalIssues,byRule:R.byRule,top:arr}, null, 2), 'utf8');
console.log('written out/top100_issues.json');
