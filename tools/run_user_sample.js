const company = '010';

function upperCaseSqlKeywords(s) {
  if (!s) return s;
  const keywords = [
    "select","from","where","inner","join","left","right","full","outer",
    "on","group","by","order","having","as","into","values","update",
    "set","delete","insert","distinct","union","all","top","limit","offset",
    "case","when","then","else","end","between","like","is","null","and","or","in"
  ];
  const re = new RegExp("\\b(" + keywords.join("|") + ")\\b", "gi");
  return s.replace(re, (m) => m.toUpperCase());
}

function convertAdvplConcatToSql(input, companySuffix) {
  const rawLines = input.replace(/\r\n/g, "\n").split("\n");
  const outLines = [];

  for (let rawLine of rawLines) {
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
        let s = t.slice(1, -1).replace(/\\\"/g, '"');
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

  // post-process filial-only lines like in src/extension.ts
  const fixed = [];
  for (let ln of outLines) {
    const m = /xFilial\(\s*"?([A-Za-z0-9_]+)"?\s*\)/i.exec(ln);
    if (m) {
      const trimmed = ln.trim();
      // Only convert when the whole line is (optionally quoted) xFilial("X")
      if (/^'?\s*xFilial\(\s*"?[A-Za-z0-9_]+"?\s*\)\s*'?$/i.test(trimmed)) {
        const prefix = m[1];
        const expr = trimmed.replace(/^'+|'+$/g, "");
        fixed.push(`AND ${prefix}_FILIAL = '${expr}'`);
        continue;
      }
    }
    fixed.push(ln);
  }

  return fixed.join("\n");
}

const sample = `
  cQuery := ""
  cQuery += " SELECT Z0T_NOMUSU AS ANALISTA " + CRLF
  cQuery += " , Z0T_CODUSU CODUSU " + CRLF
  cQuery += " , ZRA.ZRA_NOME AS RESPONSA " + CRLF
  cQuery += " , Z0T_ITEM AS ITEM " + CRLF
  cQuery += " , ISNULL(ZX5TIPO.ZX5_DESCRI,'NAO CADASTRADO') AS TIPOREQ " + CRLF
  cQuery += " , Z0T_CODREQ AS RECURSO " + CRLF
  cQuery += " , ISNULL(ZX5MODELO.ZX5_DESCRI,'NAO CADASTRADO') AS DESCREQ " + CRLF
  cQuery += " , Z0Q_SERIAL AS SERIAL " + CRLF
  cQuery += " , Z0Q_PATRIM AS PATRIMONIO " + CRLF
  cQuery += " , Z0T_DATA AS DTINCLUSAO " + CRLF

  cQuery += " FROM " + RetSqlName("Z0T") + " Z0T (NOLOCK) " + CRLF

  cQuery += " INNER JOIN " + RetSqlName("Z0Q") + " Z0Q (NOLOCK) " + CRLF
  cQuery += " ON Z0Q_FILIAL = '" + xFilial("Z0Q") + "' " + CRLF
  cQuery += " AND Z0Q_CODIGO = Z0T_CODREQ " + CRLF
  cQuery += " AND Z0Q.D_E_L_E_T_ = ' ' " + CRLF

  cQuery += " LEFT JOIN " + RetSqlName("ZX5") + " ZX5MODELO (NOLOCK) " + CRLF
  cQuery += " ON ZX5MODELO.ZX5_FILIAL = '" + xFilial("ZX5") + "' " + CRLF
  cQuery += " AND ZX5MODELO.ZX5_TABELA = '032' " + CRLF
  cQuery += " AND ZX5MODELO.ZX5_CHAVE = Z0Q_CODMOD " + CRLF
  cQuery += " AND ZX5MODELO.D_E_L_E_T_ = ' ' " + CRLF

  cQuery += " LEFT JOIN " + RetSqlName("ZX5") + " ZX5TIPO (NOLOCK) " + CRLF
  cQuery += " ON ZX5TIPO.ZX5_FILIAL = '" + xFilial("ZX5") + "' " + CRLF
  cQuery += " AND ZX5TIPO.ZX5_TABELA = '031' " + CRLF
  cQuery += " AND ZX5TIPO.ZX5_CHAVE = Z0Q_CODTIP " + CRLF
  cQuery += " AND ZX5TIPO.D_E_L_E_T_ = ' ' " + CRLF

  cQuery += " LEFT JOIN " + RetSqlName("ZRA") + " ZRA (NOLOCK) " + CRLF
  cQuery += " ON ZRA_FILIAL = '" + xFilial("ZRA") + "' " + CRLF
  cQuery += " AND ZRA_FILSRA = '" + xFilial("SRA") + "' " + CRLF
  cQuery += " AND ZRA_MAT = Z0T_CODMAT " + CRLF
  cQuery += " AND ZRA.D_E_L_E_T_ = '  ' " + CRLF

  cQuery += " WHERE Z0T_FILIAL = '" + xFilial("Z0T") + "' " + CRLF
  cQuery += " AND Z0T_CODMAT = '" + cCodMat + "' " + CRLF
  cQuery += " AND Z0T.D_E_L_E_T_ = '' " + CRLF

  cQuery += " ORDER BY TIPOREQ " + CRLF
  cQuery += " , RECURSO " + CRLF
`;

console.log(convertAdvplConcatToSql(sample, company));
