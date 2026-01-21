const company = '010';

function upperCaseSqlKeywords(s) {
  if (!s) return s;
  const keywords = [
    "select",
    "from",
    "where",
    "inner",
    "join",
    "left",
    "right",
    "full",
    "outer",
    "on",
    "group",
    "by",
    "order",
    "having",
    "as",
    "into",
    "values",
    "update",
    "set",
    "delete",
    "insert",
    "distinct",
    "union",
    "all",
    "top",
    "limit",
    "offset",
    "case",
    "when",
    "then",
    "else",
    "end",
    "between",
    "like",
    "is",
    "null",
    "and",
    "or",
    "in"
  ];
  const re = new RegExp("\\b(" + keywords.join("|") + ")\\b", "gi");
  return s.replace(re, (m) => m.toUpperCase());
}

function convertAdvplConcatToSql(input, companySuffix) {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const outLines = [];

  for (let rawLine of lines) {
    if (!rawLine.trim()) continue;
    const cqMatch = /^\s*cQuery\s*(?:\+?=|:=)\s*(.*)$/i.exec(rawLine);
    let expr = rawLine;
    if (cqMatch) expr = cqMatch[1];

    const parts = [];
    let cur = "";
    let inStr = false;
    for (let i = 0; i < expr.length; i++) {
      const ch = expr[i];
      if (ch === '"') { inStr = !inStr; cur += ch; continue; }
      if (!inStr && ch === '+') { const t = cur.trim(); if (t) parts.push(t); cur = ""; continue; }
      cur += ch;
    }
    if (cur.trim()) parts.push(cur.trim());

    let built = "";
    for (const p of parts) {
      const t = p.trim();
      if (t.toUpperCase() === "CRLF") { continue; }
      if (/^".*"$/.test(t)) {
        let s = t.slice(1, -1).replace(/\\"/g, '"');
        built += s;
        continue;
      }
      const retm = /RetSQLName\(\s*"?([A-Za-z0-9_]+)"?\s*\)/i.exec(t);
      if (retm) { built += retm[1] + companySuffix; continue; }
      const fnm = /([A-Za-z0-9_]+\([^)]*\))/i.exec(t);
      if (fnm) { if (built.endsWith("'")) { built += fnm[1]; } else { built += "'" + fnm[1] + "'"; } continue; }
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(t)) { if (t.toUpperCase() === 'CRLF') { continue; } if (built.endsWith("'")) { built += t; } else { built += "'" + t + "'"; } continue; }
      built += t;
    }

    built = built.replace(/^\s+/, "").replace(/\s+$/g, "");
    built = upperCaseSqlKeywords(built);
    outLines.push(built);
  }

  return outLines.join("\n");
}

const sample = `
	cQuery := ""
	cQuery += " SELECT Z5L.R_E_C_N_O_ Z5LRECNO " + CRLF
	cQuery += " FROM " + RetSqlName("Z5L") + " Z5L WITH(NOLOCK) " + CRLF
	cQuery += " WHERE 1 = 1 " + CRLF
	cQuery += " AND Z5L_FILIAL = '" + xFilial("Z5L") + "' " + CRLF
	cQuery += " AND Z5L_CODATV = '" + cIDAtivo + "' " + CRLF
	cQuery += " AND Z5L.D_E_L_E_T_ = ' ' " + CRLF
	cQuery += " ORDER BY Z5L_STATUS " + CRLF
	cQuery += " , Z5L_ITEM " + CRLF
`;

console.log(convertAdvplConcatToSql(sample, company));
