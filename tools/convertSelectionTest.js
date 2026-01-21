const sample = `SELECT * FROM SB1010 SB1 (NOLOCK)
	WHERE 1 = 1
	AND D_E_L_E_T_ = ' '

`;

function convertSelection(selText) {
  const lines = selText.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  out.push('cQuery := ""');
  out.push("");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (trimmed === "") continue;

    const fromJoinRe = /\b(FROM|JOIN)\s+([A-Za-z0-9_]+)\b/i;
    const m = fromJoinRe.exec(trimmed);
    if (m && m[2] && m[2].length === 6) {
      const tbl = m[2];
      const prefix = trimmed.slice(0, m.index + m[1].length + 1);
      const after = trimmed.slice(m.index + m[1].length + 1 + tbl.length);
      const first3 = tbl.slice(0, 3);
      const leftLiteral = (" " + prefix).replace(/"/g, '\\"');
      const rightLiteral = (after + " ").replace(/"/g, '\\"');
      out.push(
        'cQuery += "' + leftLiteral + '" + RetSQLName("' + first3 + '") + "' + rightLiteral + '" + CRLF'
      );
      continue;
    }

    const padded = ` ${trimmed} `;
    const escaped = padded.replace(/"/g, '\\"');
    out.push('cQuery += "' + escaped + '" + CRLF');
  }
  return out.join('\n');
}

console.log(convertSelection(sample));
