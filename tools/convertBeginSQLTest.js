const selText = `SELECT * FROM SB1010 SB1 (NOLOCK)
  WHERE 1 = 1
  AND B1_FILIAL = '  '
  AND B1_COD = '000001'
  AND D_E_L_E_T_ = ' '
`;

function convertBeginSQL(selText) {
  const lines = selText.replace(/\r\n/g, "\n").split("\n");
  // mimic BeginSQL conversion simplified: only token-less branch
  const out = [];
  out.push('cQuery := ""');
  out.push('');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.trim() === "") continue;
    // no token handling here, simulate exprPieces.length === 0
    const trimmedLine = raw.trim();

    // filial detection
    const filialRe = /([A-Za-z0-9]{2,3})_FILIAL\s*=\s*'([^']*)'/i;
    const fm = filialRe.exec(trimmedLine);
    if (fm) {
      const prefix = fm[1];
      const tbl = prefix.length === 2 ? 'S' + prefix : prefix;
      const before = trimmedLine.slice(0, fm.index) + fm[1] + '_FILIAL = ';
      const leftLiteral = (' ' + before + "'").replace(/"/g, '\\"');
      const rightLiteral = ("' ").replace(/"/g, '\\"');
      out.push('cQuery += "' + leftLiteral + '" + xFilial("' + tbl + '") + "' + rightLiteral + '" + CRLF');
      continue;
    }

    const fromJoinRe2 = /\b(FROM|JOIN)\s+([A-Za-z0-9_]+)\b/i;
    const m2 = fromJoinRe2.exec(trimmedLine);
    if (m2 && m2[2] && m2[2].length === 6) {
      const tbl = m2[2];
      const prefix = trimmedLine.slice(0, m2.index + m2[1].length + 1);
      const after = trimmedLine.slice(m2.index + m2[1].length + 1 + tbl.length);
      const first3 = tbl.slice(0, 3);
      const leftLiteral = (" " + prefix).replace(/"/g, '\\"');
      const rightLiteral = (after + " ").replace(/"/g, '\\"');
      out.push('cQuery += "' + leftLiteral + '" + RetSQLName("' + first3 + '") + "' + rightLiteral + '" + CRLF');
    } else {
      const rawTrim = raw;
      const rawOut = /[A-Za-z0-9]$/.test(rawTrim.trim()) ? rawTrim + ' ' : rawTrim;
      out.push('cQuery += "' + rawOut.replace(/"/g, '\\"') + '" + CRLF');
    }
  }
  return out.join('\n');
}

console.log(convertBeginSQL(selText));
