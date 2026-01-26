const fs = require('fs');
const path = require('path');

const file = process.argv[2] || path.join(__dirname, '..', 'fontestotvs','ti','funcoes','fonteteste.tlpp');
const startLine = parseInt(process.argv[3] || '13', 10);
const endLine = parseInt(process.argv[4] || '19', 10);

const src = fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
const lines = src.split('\n');
if (startLine < 1 || endLine > lines.length) {
  console.error('Invalid line range', startLine, endLine, 'file lines', lines.length);
  process.exit(2);
}
const sel = lines.slice(startLine-1, endLine);

function runSort(blockLines){
  const lines = blockLines.slice();
  const declInfos = [];
  for (const ln of lines){
    const m = /^(\s*)(Local|Private|Static|Default)\b(.*)$/i.exec(ln);
    if (m){
      const indent = m[1] || '';
      const keyword = m[2];
      let rest = m[3] || '';
      const commentMatch = rest.match(/(\/\/.*)$/);
      const comment = commentMatch ? commentMatch[1] : '';
      if (comment) rest = rest.slice(0, rest.length - comment.length);
      const parts = rest.split(',').map(p=>p.trim()).filter(Boolean);
      const first = parts.length ? (parts[0].match(/^([A-Za-z_][A-Za-z0-9_]*)/)?.[1] ?? null) : null;
      declInfos.push({ orig: ln, indent, keyword, rest, firstId: first?first.toLowerCase():null, comment });
    }
  }
  if (declInfos.length > 0 && declInfos.length === lines.length){
    declInfos.sort((a,b)=>{ const A=a.firstId||''; const B=b.firstId||''; return A < B ? -1 : A > B ? 1 : 0; });
    let out = [];
    const simpleLines = declInfos.map(d=>{ const parts = d.rest.split(',').map(p=>p.trim()).filter(Boolean); return {info:d, parts}; });
    const allSingle = simpleLines.every(s=>s.parts.length===1);
    if (allSingle){
      let maxLeftColLocal = 0;
      for (const s of simpleLines){
        const part = s.parts[0];
        const idm = part.match(/^([A-Za-z_][A-Za-z0-9_]*)/);
        const id = idm ? idm[1] : '';
        const totalIndent = (s.info.indent||'').length;
        const len = totalIndent + id.length;
        if (len > maxLeftColLocal) maxLeftColLocal = len;
      }
      out = simpleLines.map(s=>{
        const d = s.info; const part = s.parts[0];
        const idm = part.match(/^([A-Za-z_][A-Za-z0-9_]*)/); const id = idm?idm[1]:null;
        const tail = id && part.length>id.length ? part.slice(id.length):'';
        if (!id) return `${d.indent}${d.keyword} ${part}${d.comment? ' '+d.comment: ''}`.replace(/\s+$/,'');
        const totalIndent = (d.indent||'').length; const leftPad = Math.max(0, maxLeftColLocal - (totalIndent + id.length));
        const idP = id + '' + ' '.repeat(leftPad);
        const tailTrim = tail.trimStart();
        const sep = tailTrim ? (idP.endsWith(' ') ? '' : ' ') : '';
        return `${d.indent}${d.keyword} ${idP}${sep}${tailTrim}${d.comment? ' '+d.comment: ''}`.replace(/\s+$/,'');
      });
    } else {
      out = declInfos.map(d=>{ const trimmedRest = d.rest.trim(); return `${d.indent}${d.keyword} ${trimmedRest}${d.comment? ' '+d.comment: ''}`.replace(/\s+$/,''); });
    }
    return out;
  } else {
    return blockLines;
  }
}

function runAlign(blockLines){
  const items = [];
  const assignRe = /^(\s*)([\s\S]*?)(\s*(?::=|\+=|-=|\*=|\/=)\s*)([\s\S]*?)(\s*(\/\/.*))?$/;
  for (const seg of blockLines){
    const am = assignRe.exec(seg);
    if (am){
      const innerIndent = am[1]||'';
      const leftRaw = (am[2]||'').trimEnd();
      const op = (am[3]||'').trim();
      const right = (am[4]||'').trimStart();
      const comment = (am[5]||'').trim();
      const declMatch = /^\s*(Local|Private|Static|Default)\b\s*(.*)$/i.exec(leftRaw);
      if (declMatch){
        const keyword = declMatch[1];
        const rest = declMatch[2] || '';
        const idMatch = /^([A-Za-z_][A-Za-z0-9_]*)([\s\S]*)$/.exec(rest.trim());
        const id = idMatch ? idMatch[1] : null;
        const tail = idMatch ? idMatch[2] : rest;
        items.push({ kind:'assign-decl', orig:seg, prefix:'', innerIndent, keyword, id, tail: tail||'', op, right, comment });
        continue;
      }
      items.push({ kind:'assign', orig:seg, prefix:'', innerIndent, left: leftRaw, op, right, comment });
      continue;
    }
    const dm = /^(\s*)(Local|Private|Static|Default)\b(.*)$/i.exec(seg);
    if (dm){
      const innerIndent = dm[1]||''; const keyword = dm[2]; let rest = dm[3]||''; const commentMatch = rest.match(/(\/\/.*)$/); const comment = commentMatch?commentMatch[1]:''; if (comment) rest = rest.slice(0, rest.length - comment.length);
      const partsRaw = rest.split(',').map(p=>p.trim()).filter(Boolean);
      const parts = partsRaw.map(part=>{ const idm = part.match(/^([A-Za-z_][A-Za-z0-9_]*)/); const id = idm?idm[1]:null; const tail = id?part.slice(id.length):part; return { id: id??null, idLower: id? id.toLowerCase(): null, raw: part, tail }; });
      items.push({ kind:'decl', orig:seg, prefix:'', innerIndent, keyword, parts, comment });
      continue;
    }
    items.push({ kind:'other', orig:seg, prefix:'' });
  }

  let maxLeftCol = 0; let maxIdLen = 0;
  for (const it of items){
    if (it.kind==='assign'){
      const totalIndent = it.prefix.length + it.innerIndent.replace(/\t/g,' ').length; const len = totalIndent + it.left.replace(/\t/g,' ').length; if (len>maxLeftCol) maxLeftCol=len;
    } else if (it.kind==='assign-decl'){
      if (it.id){ const totalIndent = it.prefix.length + it.innerIndent.replace(/\t/g,' ').length; const len = totalIndent + it.id.replace(/\t/g,' ').length; if (len>maxLeftCol) maxLeftCol=len; if (it.id.length>maxIdLen) maxIdLen = it.id.length; }
    } else if (it.kind==='decl'){
      for (const p of it.parts){ if (p.id && p.id.length>maxIdLen) maxIdLen = p.id.length; if (p.id){ const totalIndent = it.prefix.length + it.innerIndent.replace(/\t/g,' ').length; const len = totalIndent + p.id.replace(/\t/g,' ').length; if (len>maxLeftCol) maxLeftCol = len; } }
    }
  }

  const outLines = [];
  for (const it of items){
    if (it.kind==='assign'){
      const inner = it.innerIndent||''; const left = it.left||''; const totalIndent = it.prefix.length + inner.replace(/\t/g,' ').length; const leftPadLen = Math.max(0, maxLeftCol - (totalIndent + left.length)); const leftPadded = left + ' '.repeat(leftPadLen); const op = it.op || ':='; const right = it.right || ''; const comment = it.comment ? ` ${it.comment}` : '';
      outLines.push( ( it.prefix + inner + leftPadded + ' ' + op + ' ' + right + (comment || '') ).replace(/\s+$/,'') );
    } else if (it.kind==='assign-decl'){
      const inner = it.innerIndent||''; const totalIndent = it.prefix.length + inner.replace(/\t/g,' ').length; const id = it.id||''; const leftPadLen = Math.max(0, maxLeftCol - (totalIndent + id.length)); const idP = id + '' + ' '.repeat(leftPadLen); const tailTrim = (it.tail||'').trimStart(); const sep = tailTrim ? (idP.endsWith(' ') ? '' : ' ') : ''; const leftPart = `${it.keyword} ${idP}${sep}${tailTrim}`.replace(/\s+$/,''); const op = it.op||':='; const right = it.right||''; const comment = it.comment ? ` ${it.comment}` : '';
      outLines.push( ( it.prefix + inner + leftPart + ' ' + op + ' ' + right + (comment || '') ).replace(/\s+$/,'') );
    } else if (it.kind==='decl'){
      const joined = it.parts.map(p=>{ if (!p.id) return p.raw; const idPad = p.id.padEnd(maxIdLen,' '); const tail = p.tail.trimStart(); return tail ? `${idPad} ${tail}` : idPad; }).join(', ');
      outLines.push( ( it.prefix + it.innerIndent + it.keyword + ' ' + joined + (it.comment ? ' ' + it.comment : '') ).replace(/\s+$/,'') );
    } else {
      outLines.push( it.prefix + it.orig );
    }
  }
  return outLines;
}

const before = sel.join('\n');
const sorted = runSort(sel);
let aligned = runAlign(sorted);
// post-adjust AS and := to same column
{
  const lines = aligned.slice();
  let target = 0;
  for (const l of lines) {
    const op = l.indexOf(':=');
    const asIdx = l.toLowerCase().indexOf(' as ');
    if (op >= 0 && op > target) target = op;
    if (asIdx >= 0 && asIdx > target) target = asIdx;
  }
  if (target > 0) {
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const op = l.indexOf(':=');
      const asIdx = l.toLowerCase().indexOf(' as ');
      if (op >= 0 && op < target) {
        const pad = target - op;
        lines[i] = l.slice(0, op) + ' '.repeat(pad) + l.slice(op);
      } else if (asIdx >= 0 && asIdx < target) {
        const pad = target - asIdx;
        lines[i] = l.slice(0, asIdx) + ' '.repeat(pad) + l.slice(asIdx);
      }
    }
  }
  aligned = lines;
}

console.log('--- BEFORE ---');
console.log(before);
console.log('\n--- SORTED ---');
console.log(sorted.join('\n'));
console.log('\n--- SORTED+ALIGNED ---');
console.log(aligned.join('\n'));

const outdir = path.join(__dirname,'tmp'); if (!fs.existsSync(outdir)) fs.mkdirSync(outdir,{recursive:true});
fs.writeFileSync(path.join(outdir,'selection.before.txt'), before, 'utf8');
fs.writeFileSync(path.join(outdir,'selection.sorted.txt'), sorted.join('\n'), 'utf8');
fs.writeFileSync(path.join(outdir,'selection.aligned.txt'), aligned.join('\n'), 'utf8');
console.log('\nWROTE files to tools/tmp');
