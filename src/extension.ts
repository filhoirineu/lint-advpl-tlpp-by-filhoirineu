import * as vscode from "vscode";
// try both possible compiled analyzer locations (index.js or analyzer.js)
let analyzer: any;
try {
  analyzer = require("../out/analyzer/index");
} catch (e) {
  try {
    analyzer = require("../out/analyzer/analyzer");
  } catch {
    analyzer = {
      analyzeDocument: () => ({
        fileName: "",
        blocks: [],
        issues: [],
        summary: {
          blocksWithIssues: 0,
          localsCount: 0,
          defaultsCount: 0,
          issuesCount: 0,
        },
      }),
    };
  }
}

// helper: uppercase common SQL keywords (case-insensitive replacement)
function upperCaseSqlKeywords(s: string): string {
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
    "in",
  ];
  const re = new RegExp("\\b(" + keywords.join("|") + ")\\b", "gi");
  return s.replace(re, (m) => m.toUpperCase());
}

function convertAdvplConcatToSql(input: string, companySuffix: string): string {
  const rawLines = input.replace(/\r\n/g, "\n").split("\n");
  const outLines: string[] = [];

  for (let rawLine of rawLines) {
    if (!rawLine.trim()) continue;
    const cqMatch = /^\s*cQuery\s*(?:\+?=|:=)\s*(.*)$/i.exec(rawLine);
    let expr = rawLine;
    if (cqMatch) expr = cqMatch[1];

    const parts: string[] = [];
    let cur = "";
    let inStr = false;
    for (let i = 0; i < expr.length; i++) {
      const ch = expr[i];
      if (ch === '"') {
        inStr = !inStr;
        cur += ch;
        continue;
      }
      if (!inStr && ch === "+") {
        const t = cur.trim();
        if (t) parts.push(t);
        cur = "";
        continue;
      }
      cur += ch;
    }
    if (cur.trim()) parts.push(cur.trim());

    let built = "";
    for (let idx = 0; idx < parts.length; idx++) {
      const p = parts[idx];
      const t = p.trim();
      if (t.toUpperCase() === "CRLF") {
        continue;
      }
      if (/^".*"$/.test(t)) {
        let s = t.slice(1, -1).replace(/\\"/g, '"');
        built += s;
        continue;
      }
      const retm = /Ret[A-Za-z0-9_]*Name\(\s*"?([A-Za-z0-9_]+)"?\s*\)/i.exec(t);
      if (retm) {
        built += retm[1] + companySuffix;
        const next = parts[idx + 1];
        if (next && /^".*"$/.test(next.trim())) {
          const lit = next.trim().slice(1, -1).replace(/\\"/g, '"');
          built += lit;
          idx++;
        }
        continue;
      }
      const fnm = /([A-Za-z0-9_]+\([^)]*\))/i.exec(t);
      if (fnm) {
        if (built.endsWith("'")) {
          built += fnm[1];
        } else {
          built += "'" + fnm[1] + "'";
        }
        continue;
      }
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(t)) {
        if (t.toUpperCase() === "CRLF") {
          continue;
        }
        if (built.endsWith("'")) {
          built += t;
        } else {
          built += "'" + t + "'";
        }
        continue;
      }
      built += t;
    }

    built = built.replace(/^\s+/, "").replace(/\s+$/g, "");
    built = upperCaseSqlKeywords(built);

    outLines.push(built);
  }

  // post-process filial-only lines
  const fixed: string[] = [];
  for (let ln of outLines) {
    const m = /xFilial\(\s*"?([A-Za-z0-9_]+)"?\s*\)/i.exec(ln);
    if (m) {
      const trimmed = ln.trim();
      if (/^'?\s*xFilial\(\s*"?[A-Za-z0-9_]+"?\s*\)\s*'?$/i.test(trimmed)) {
        const prefix = m[1];
        const expr = trimmed.replace(/^'+|'+$/g, "");
        fixed.push(`AND ${prefix}_FILIAL = '${expr}'`);
        continue;
      }
    }
    fixed.push(ln);
  }

  const merged = fixed.join("\n");
  return postProcessSqlLines(merged, companySuffix);
}

// Extra helper: clean common concatenation artifacts and ensure FROM prefix
function postProcessSqlLines(sql: string, companySuffix: string): string {
  const lines = sql.split("\n");
  const out: string[] = [];
  let sawFrom = false;
  for (let i = 0; i < lines.length; i++) {
    let ln = lines[i];
    // replace patterns like " + var + ", '" + var + "', or mixed quotes, with 'var'
    ln = ln.replace(
      /["']\s*\+\s*([A-Za-z_][A-Za-z0-9_]*)\s*\+\s*["']/g,
      "'$1'"
    );
    // collapse runs of 3+ single quotes into two (preserve empty-string literals '')
    ln = ln.replace(/'{3,}/g, "''");

    // detect table-only lines like 'Z5L010' (table + companySuffix) and prefix FROM if needed
    const tblRe = new RegExp(
      "^\\s*([A-Za-z0-9_]+)" + companySuffix + "\\s*$",
      "i"
    );
    if (tblRe.test(ln)) {
      // if we haven't seen a FROM already and previous meaningful line was SELECT, add FROM
      const prev = out
        .slice()
        .reverse()
        .find((l) => l.trim() !== "");
      if (
        prev &&
        /\bSELECT\b/i.test(prev) &&
        !/\bFROM\b/i.test(prev) &&
        !sawFrom
      ) {
        ln = "FROM " + ln.trim();
        sawFrom = true;
      }
    }

    if (/\bFROM\b/i.test(ln)) sawFrom = true;
    out.push(ln);
  }
  return out.join("\n");
}
import { AnalysisResult } from "./analyzer/types";
import LintTreeProvider from "./sidebar/LintTreeProvider";

let provider: LintTreeProvider | undefined;

// ✅ debounce
let analyzeTimer: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log("lint-advpl: activating extension");
  provider = new LintTreeProvider(context);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(LintTreeProvider.viewId, provider)
  );
  console.log(
    "lint-advpl: registered TreeDataProvider for",
    LintTreeProvider.viewId
  );

  const cfg = vscode.workspace.getConfiguration("lint-advpl");
  const enableConvertBeginSQL = cfg.get<boolean>("enableConvertBeginSQL", true);
  const enableConvertSelection = cfg.get<boolean>(
    "enableConvertSelection",
    true
  );
  console.log(
    `lint-advpl: config enableConvertBeginSQL=${enableConvertBeginSQL} enableConvertSelection=${enableConvertSelection}`
  );

  // register ADVPL -> SQL converter command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "lint-advpl.convertAdvplToSql",
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showWarningMessage("LINT: No active editor.");
          return;
        }

        const sel =
          editor.document.getText(editor.selection) ||
          editor.document.getText();
        if (!sel || !sel.trim()) {
          vscode.window.showWarningMessage("LINT: No text to convert.");
          return;
        }

        const cfg = vscode.workspace.getConfiguration("lint-advpl");
        const company = cfg.get<string>("databaseCompany", "010") || "010";

        try {
          // If selection already contains concatenated AdvPL cQuery, treat as ADVPL->SQL
          if (/\bcQuery\b\s*(:=|\+=)/i.test(sel)) {
            const sql = convertAdvplConcatToSql(sel, company);
            await vscode.env.clipboard.writeText(sql);
            vscode.window.showInformationMessage(
              "LINT: SQL copiado para o clipboard."
            );
            return;
          }

          const sql = convertAdvplConcatToSql(sel, company);
          await vscode.env.clipboard.writeText(sql);
          vscode.window.showInformationMessage(
            "LINT: SQL copiado para o clipboard."
          );
        } catch (e: any) {
          vscode.window.showErrorMessage(
            "LINT: Falha ao converter para SQL: " + (e?.message ?? String(e))
          );
        }
      }
    )
  );

  // register analyze command
  context.subscriptions.push(
    vscode.commands.registerCommand("lint-advpl.analyze", async () => {
      try {
        runAnalyzeNow(true); // show information message
      } catch (e: any) {
        vscode.window.showErrorMessage(
          "LINT: Falha ao analisar arquivo: " + (e?.message ?? String(e))
        );
      }
    })
  );

  // register export command
  context.subscriptions.push(
    vscode.commands.registerCommand("lint-advpl.exportTxt", async () => {
      try {
        const last = provider?.getLastResult();
        if (!last) {
          vscode.window.showWarningMessage(
            "LINT: Nenhum resultado para exportar."
          );
          return;
        }

        const uri = await vscode.window.showSaveDialog({
          saveLabel: "Exportar TXT",
          filters: { Text: ["txt"] },
          defaultUri: vscode.Uri.file(
            (last.fileName || "lint-report").replace(/[\\/:*?"<>|]/g, "_") +
              ".lint.txt"
          ),
        });

        if (!uri) return;

        const content = provider!.buildTxtReport(last);
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf8"));
        vscode.window.showInformationMessage(
          "LINT: TXT exportado com sucesso."
        );
      } catch (e: any) {
        vscode.window.showErrorMessage(
          "LINT: Falha ao exportar TXT: " + (e?.message ?? String(e))
        );
      }
    })
  );

  // ping command removed

  // register open view command (reveals the activitybar view)
  context.subscriptions.push(
    vscode.commands.registerCommand("lint-advpl.openView", async () => {
      try {
        await vscode.commands.executeCommand(
          "workbench.view.extension.lint-advpl"
        );
      } catch (e) {
        // ignore
      }
    })
  );

  // quick helper: open converter-related settings in Settings UI
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "lint-advpl.openConverterSettings",
      async () => {
        try {
          // opens Settings UI filtered to the converter setting
          await vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "lint-advpl.enableConvertSelection"
          );
        } catch (e) {
          vscode.window.showInformationMessage(
            "LINT: Unable to open settings UI. Check 'lint-advpl.enableConvertSelection' in settings.json."
          );
        }
      }
    )
  );

  // register convert BeginSQL block command (only if enabled)
  if (enableConvertBeginSQL) {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "lint-advpl.convertBeginSQL",
        async () => {
          const editor = vscode.window.activeTextEditor;
          if (!editor) {
            vscode.window.showWarningMessage("LINT: No active editor.");
            return;
          }
          const doc = editor.document;
          const full = doc.getText();
          let selText = editor.document.getText(editor.selection);
          let replaceRange: vscode.Range | undefined = undefined;

          // if nothing selected, try to find BeginSQL/EndSQL around cursor
          if (!selText || !selText.trim()) {
            const pos = editor.selection.active;
            const offset = doc.offsetAt(pos);
            const beginRe = /BeginSQL\b[\s\S]*?EndSQL\b/gi;
            let match: RegExpExecArray | null = null;
            while ((match = beginRe.exec(full))) {
              const start = match.index;
              const end = match.index + match[0].length;
              if (offset >= start && offset <= end) {
                selText = match[0];
                replaceRange = new vscode.Range(
                  doc.positionAt(start),
                  doc.positionAt(end)
                );
                break;
              }
            }
          }

          if (!selText || !/BeginSQL\b/i.test(selText)) {
            vscode.window.showWarningMessage(
              "LINT: Selecione um bloco BeginSQL...EndSQL."
            );
            return;
          }

          // strip BeginSQL ... line and EndSQL
          const lines = selText.replace(/\r\n/g, "\n").split("\n");
          // detect alias in BeginSQL line: e.g. "BeginSQL alias _cAliasDHL"
          let beginAlias: string | undefined = undefined;
          if (/^\s*BeginSQL\b/i.test(lines[0])) {
            const m = /^\s*BeginSQL\b(?:\s+alias\s+([A-Za-z0-9_]+))?/i.exec(
              lines[0]
            );
            if (m && m[1]) beginAlias = m[1];
            lines.shift();
          }
          // remove trailing EndSQL line if present
          if (lines.length && /^\s*EndSQL\b/i.test(lines[lines.length - 1])) {
            lines.pop();
          }

          // trim start/end blank lines
          while (lines.length && lines[0].trim() === "") lines.shift();
          while (lines.length && lines[lines.length - 1].trim() === "")
            lines.pop();

          // build concatenated AdvPL string
          const out: string[] = [];
          out.push("cQuery := " + '""');
          out.push("");
          for (let i = 0; i < lines.length; i++) {
            let raw = lines[i];
            // normalize '(NOLOCK)' to 'WITH(NOLOCK)' when 'WITH' is not already present
            try {
              if (
                /\(\s*NOLOCK\s*\)/i.test(raw) &&
                !/\bWITH\s*\(\s*NOLOCK\s*\)/i.test(raw)
              ) {
                raw = raw.replace(/\(\s*NOLOCK\s*\)/i, "WITH(NOLOCK)");
              }
            } catch (e) {
              // ignore
            }
            // uppercase common SQL keywords for consistency
            raw = upperCaseSqlKeywords(raw);
            // if the line is a %noparser% marker, drop it entirely
            if (raw.trim().toLowerCase() === "%noparser%") {
              continue;
            }
            // skip blank lines (no need to emit empty cQuery += "" + CRLF)
            if (raw.trim() === "") continue;
            // replace tokens like %table:NAME%, %xFilial:NAME% and %notdel%
            const tokenRe = /%([A-Za-z0-9_]+)(?::([A-Za-z0-9_]+))?%/gi;
            let m: RegExpExecArray | null = null;
            let lastIndex = 0;
            let exprPieces: string[] = [];
            while ((m = tokenRe.exec(raw))) {
              const idx = m.index;
              const token = m[1];
              const param = m[2];
              const literal = raw.slice(lastIndex, idx);
              if (literal.length > 0) {
                exprPieces.push('"' + literal.replace(/"/g, '\\"') + '"');
              }
              if (token.toLowerCase() === "table" && param) {
                // if the table token is followed by an alias (e.g. "%table:Z43% Z43"),
                // inject a " (NOLOCK)" after the alias unless NOLOCK already appears.
                const tailStart = idx + m[0].length;
                const after = raw.slice(tailStart);
                const aliasMatch = after.match(/^\s*([A-Za-z0-9_]+)/);
                if (aliasMatch) {
                  // check for existing NOLOCK in the next chars
                  const nextPart = after.slice(0, 80);
                  if (!/NOLOCK/i.test(nextPart)) {
                    exprPieces.push('RetSQLName("' + param + '")');
                    const aliasLiteral = aliasMatch[0] + " WITH(NOLOCK)";
                    exprPieces.push(
                      '"' + aliasLiteral.replace(/"/g, '\\"') + '"'
                    );
                    // consume the alias characters so they are not added again as tail
                    lastIndex = tailStart + aliasMatch[0].length;
                    // advance the regex lastIndex to skip consumed alias
                    tokenRe.lastIndex = lastIndex;
                    continue;
                  }
                }
                exprPieces.push('RetSQLName("' + param + '")');
              } else if (token.toLowerCase() === "xfilial" && param) {
                // inject the xFilial value wrapped in single quotes; attach opening quote
                if (
                  exprPieces.length &&
                  /^".*"$/.test(exprPieces[exprPieces.length - 1])
                ) {
                  const prev = exprPieces[exprPieces.length - 1];
                  const inner = prev.slice(1, -1) + "'";
                  exprPieces[exprPieces.length - 1] =
                    '"' + inner.replace(/"/g, '\\"') + '"';
                } else {
                  exprPieces.push('"' + "'".replace(/"/g, '\\"') + '"');
                }
                exprPieces.push('xFilial("' + param + '")');
                exprPieces.push('"' + "' ".replace(/"/g, '\\"') + '"');
              } else if (token.toLowerCase() === "notdel") {
                exprPieces.push("\"D_E_L_E_T_ = ''\"");
              } else if (token.toLowerCase() === "exp" && param) {
                // inject the variable value wrapped in single quotes (no field name);
                // attach opening quote to previous literal when possible
                if (
                  exprPieces.length &&
                  /^".*"$/.test(exprPieces[exprPieces.length - 1])
                ) {
                  const prev = exprPieces[exprPieces.length - 1];
                  const inner = prev.slice(1, -1) + "'";
                  exprPieces[exprPieces.length - 1] =
                    '"' + inner.replace(/"/g, '\\"') + '"';
                } else {
                  exprPieces.push('"' + "'".replace(/"/g, '\\"') + '"');
                }
                exprPieces.push(param);
                exprPieces.push('"' + "' ".replace(/"/g, '\\"') + '"');
              } else {
                // unknown token: keep as literal
                exprPieces.push('"' + m[0].replace(/"/g, '\\"') + '"');
              }
              lastIndex = idx + m[0].length;
            }
            const tail = raw.slice(lastIndex);
            if (exprPieces.length === 0) {
              // no tokens -> try special patterns (filial field or FROM/JOIN table)
              const trimmedLine = raw.trim();

              // filial field pattern: <PREFIX>_FILIAL = '...'
              const filialRe = /([A-Za-z0-9]{2,3})_FILIAL\s*=\s*'([^']*)'/i;
              const fm = filialRe.exec(trimmedLine);
              if (fm) {
                const prefix = fm[1];
                const tbl = prefix.length === 2 ? "S" + prefix : prefix;
                const before =
                  trimmedLine.slice(0, fm.index) + fm[1] + "_FILIAL = ";
                const leftLiteral = (" " + before + "'").replace(/"/g, '\\"');
                const rightLiteral = "' ".replace(/"/g, '\\"');
                console.log(
                  `lint-advpl: convertBeginSQL detected filial prefix='${prefix}' tbl='${tbl}'`
                );
                out.push(
                  'cQuery += "' +
                    leftLiteral +
                    '" + xFilial("' +
                    tbl +
                    '") + "' +
                    rightLiteral +
                    '" + CRLF'
                );
              } else {
                // FROM/JOIN table detection to inject RetSQLName when needed
                const fromJoinRe2 = /\b(FROM|JOIN)\s+([A-Za-z0-9_]+)\b/i;
                const m2 = fromJoinRe2.exec(trimmedLine);
                if (m2 && m2[2] && m2[2].length === 6) {
                  const tbl = m2[2];
                  const prefix = trimmedLine.slice(
                    0,
                    m2.index + m2[1].length + 1
                  );
                  const after = trimmedLine.slice(
                    m2.index + m2[1].length + 1 + tbl.length
                  );
                  const first3 = tbl.slice(0, 3);
                  const leftLiteral = (" " + prefix).replace(/"/g, '\\"');
                  const rightLiteral = (after + " ").replace(/"/g, '\\"');
                  out.push(
                    'cQuery += "' +
                      leftLiteral +
                      '" + RetSQLName("' +
                      first3 +
                      '") + "' +
                      rightLiteral +
                      '" + CRLF'
                  );
                } else {
                  // fallback: quote the whole raw line, append a space if it ends alphanumeric
                  const rawTrim = raw;
                  const rawOut = /[A-Za-z0-9]$/.test(rawTrim.trim())
                    ? rawTrim + " "
                    : rawTrim;
                  out.push(
                    'cQuery += "' + rawOut.replace(/"/g, '\\"') + '" + CRLF'
                  );
                }
              }
            } else {
              if (tail.length > 0) {
                exprPieces.push('"' + tail.replace(/"/g, '\\"') + '"');
              }
              // if all pieces are string literals, merge them into a single string
              const allLiteral = exprPieces.every((p) => /^".*"$/.test(p));
              if (allLiteral) {
                let combined = exprPieces.map((p) => p.slice(1, -1)).join("");
                // if combined ends with alphanumeric, append a space for readability (e.g. "WHERE" -> "WHERE ")
                if (/[A-Za-z0-9]$/.test(combined.trim()))
                  combined = combined + " ";
                out.push(
                  'cQuery += "' + combined.replace(/"/g, '\\"') + '" + CRLF'
                );
              } else {
                // join pieces with ' + '
                out.push("cQuery += " + exprPieces.join(" + ") + " + CRLF");
              }
            }
          }

          let content = out.join("\n");

          // if BeginSQL declared an alias variable, append open-query calls (not concatenated)
          if (beginAlias) {
            // ensure a blank line before the alias block
            out.push("");
            out.push(`${beginAlias} := ""`);
            out.push(`${beginAlias} := u_zParOpenQuery( cQuery )`);
            // rebuild final content including alias lines
            content = out.join("\n");
          }

          // try to replace the selection / matched BeginSQL block in-place
          try {
            const we = new vscode.WorkspaceEdit();
            if (replaceRange) {
              we.replace(doc.uri, replaceRange, content);
            } else {
              we.replace(doc.uri, editor.selection, content);
            }
            const applied = await vscode.workspace.applyEdit(we);
            if (!applied) throw new Error("applyEdit returned false");

            // ensure the document is visible in the editor and select the new range
            await vscode.window.showTextDocument(doc, { preview: false });
            const startPos = replaceRange
              ? replaceRange.start
              : editor.selection.start;
            const endPos = doc.positionAt(
              doc.offsetAt(startPos) + content.length
            );
            const active = vscode.window.activeTextEditor;
            if (
              active &&
              active.document.uri.toString() === doc.uri.toString()
            ) {
              active.selection = new vscode.Selection(startPos, endPos);
            }
            vscode.window.showInformationMessage(
              "LINT: Converted BeginSQL block to concatenated query."
            );
          } catch (e) {
            // fallback: open untitled document with the result (language advpl)
            const docUntitled = await vscode.workspace.openTextDocument({
              content,
              language: "advpl",
            });
            await vscode.window.showTextDocument(docUntitled, {
              preview: false,
            });
            vscode.window.showInformationMessage(
              "LINT: Converted BeginSQL block to concatenated query (untitled)."
            );
          }
        }
      )
    );
  }

  // register convert selected SQL -> concatenated AdvPL query (always register; handler respects setting)
  console.log(
    "lint-advpl: registering convertSelectionToQuery command (runtime-guarded)"
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "lint-advpl.convertSelectionToQuery",
      async () => {
        const cfg = vscode.workspace.getConfiguration("lint-advpl");
        if (!cfg.get<boolean>("enableConvertSelection", true)) {
          vscode.window.showWarningMessage(
            "LINT: Converter de seleção está desabilitado nas configurações."
          );
          return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showWarningMessage("LINT: No active editor.");
          return;
        }
        const selText = editor.document.getText(editor.selection);
        if (!selText || !selText.trim()) {
          vscode.window.showWarningMessage("LINT: No selection to convert.");
          return;
        }

        const lines = selText.replace(/\r\n/g, "\n").split("\n");
        const out: string[] = [];
        out.push("cQuery := " + '""');
        out.push("");
        for (let i = 0; i < lines.length; i++) {
          let raw = lines[i];
          // normalize '(NOLOCK)' to 'WITH(NOLOCK)' when 'WITH' is not already present
          try {
            if (
              /\(\s*NOLOCK\s*\)/i.test(raw) &&
              !/\bWITH\s*\(\s*NOLOCK\s*\)/i.test(raw)
            ) {
              raw = raw.replace(/\(\s*NOLOCK\s*\)/i, "WITH(NOLOCK)");
            }
          } catch (e) {
            // ignore replacement errors
          }
          // uppercase common SQL keywords for consistency
          raw = upperCaseSqlKeywords(raw);
          if (raw.trim() === "") {
            // preserve blank lines from the selection as spacing in the output
            out.push("");
            continue;
          }

          // if the line is a %noparser% marker, drop it entirely
          if (raw.trim().toLowerCase() === "%noparser%") {
            continue;
          }

          // token handling (same logic as BeginSQL converter)
          const tokenRe = /%([A-Za-z0-9_]+)(?::([A-Za-z0-9_]+))?%/gi;
          let m: RegExpExecArray | null = null;
          let lastIndex = 0;
          let exprPieces: string[] = [];
          while ((m = tokenRe.exec(raw))) {
            const idx = m.index;
            const token = m[1];
            const param = m[2];
            const literal = raw.slice(lastIndex, idx);
            if (literal.length > 0) {
              exprPieces.push('"' + literal.replace(/"/g, '\\"') + '"');
            }
            if (token.toLowerCase() === "table" && param) {
              const tailStart = idx + m[0].length;
              const after = raw.slice(tailStart);
              const aliasMatch = after.match(/^\s*([A-Za-z0-9_]+)/);
              if (aliasMatch) {
                const nextPart = after.slice(0, 80);
                if (!/NOLOCK/i.test(nextPart)) {
                  exprPieces.push('RetSQLName("' + param + '")');
                  const aliasLiteral = aliasMatch[0] + " WITH(NOLOCK)";
                  exprPieces.push(
                    '"' + aliasLiteral.replace(/"/g, '\\"') + '"'
                  );
                  lastIndex = tailStart + aliasMatch[0].length;
                  tokenRe.lastIndex = lastIndex;
                  continue;
                }
              }
              exprPieces.push('RetSQLName("' + param + '")');
            } else if (token.toLowerCase() === "xfilial" && param) {
              // inject the xFilial value wrapped in single quotes; do NOT repeat the field name
              exprPieces.push('"' + "'".replace(/"/g, '\\"') + '"');
              exprPieces.push('xFilial("' + param + '")');
              exprPieces.push('"' + "' ".replace(/"/g, '\\"') + '"');
            } else if (token.toLowerCase() === "notdel") {
              exprPieces.push("\"D_E_L_E_T_ = ''\"");
            } else if (token.toLowerCase() === "exp" && param) {
              // inject the variable value wrapped in single quotes (no field name)
              exprPieces.push('"' + "'".replace(/"/g, '\\"') + '"');
              exprPieces.push(param);
              exprPieces.push('"' + "' ".replace(/"/g, '\\"') + '"');
            } else {
              exprPieces.push('"' + m[0].replace(/"/g, '\\"') + '"');
            }
            lastIndex = idx + m[0].length;
          }

          const tail = raw.slice(lastIndex);
          if (exprPieces.length === 0) {
            // no tokens -> try filial field pattern first, then FROM/JOIN
            const trimmedLine = raw.trim();
            // filial field pattern: <PREFIX>_FILIAL = '...'
            const filialRe = /([A-Za-z0-9]{2,3})_FILIAL\s*=\s*'([^']*)'/i;
            const fm = filialRe.exec(trimmedLine);
            if (fm) {
              const prefix = fm[1];
              const tbl = prefix.length === 2 ? "S" + prefix : prefix;
              const before =
                trimmedLine.slice(0, fm.index) + fm[1] + "_FILIAL = ";
              const leftLiteral = (" " + before + "'").replace(/"/g, '\\"');
              const rightLiteral = "' ".replace(/"/g, '\\"');
              console.log(
                `lint-advpl: convertSelectionToQuery detected filial prefix='${prefix}' tbl='${tbl}'`
              );
              out.push(
                'cQuery += "' +
                  leftLiteral +
                  '" + xFilial("' +
                  tbl +
                  '") + "' +
                  rightLiteral +
                  '" + CRLF'
              );
              continue;
            }

            const fromJoinRe2 = /\b(FROM|JOIN)\s+([A-Za-z0-9_]+)\b/i;
            const m2 = fromJoinRe2.exec(trimmedLine);
            if (m2 && m2[2] && m2[2].length === 6) {
              const tbl = m2[2];
              const prefix = trimmedLine.slice(0, m2.index + m2[1].length + 1);
              const after = trimmedLine.slice(
                m2.index + m2[1].length + 1 + tbl.length
              );
              const first3 = tbl.slice(0, 3);
              const leftLiteral = (" " + prefix).replace(/"/g, '\\"');
              const rightLiteral = (after + " ").replace(/"/g, '\\"');
              out.push(
                'cQuery += "' +
                  leftLiteral +
                  '" + RetSQLName("' +
                  first3 +
                  '") + "' +
                  rightLiteral +
                  '" + CRLF'
              );
              continue;
            }

            // fallback: quote the whole raw line, append a space if it ends alphanumeric
            const rawTrim = raw;
            const rawOut = /[A-Za-z0-9]$/.test(rawTrim.trim())
              ? rawTrim + " "
              : rawTrim;
            out.push('cQuery += "' + rawOut.replace(/"/g, '\\"') + '" + CRLF');
          } else {
            if (tail.length > 0) {
              exprPieces.push('"' + tail.replace(/"/g, '\\"') + '"');
            }
            const allLiteral = exprPieces.every((p) => /^".*"$/.test(p));
            if (allLiteral) {
              let combined = exprPieces.map((p) => p.slice(1, -1)).join("");
              if (/[A-Za-z0-9]$/.test(combined.trim()))
                combined = combined + " ";
              out.push(
                'cQuery += "' + combined.replace(/"/g, '\\"') + '" + CRLF'
              );
            } else {
              out.push("cQuery += " + exprPieces.join(" + ") + " + CRLF");
            }
          }
        }

        const content = out.join("\n");
        try {
          // replace selection in-place
          await editor.edit((edit) => {
            edit.replace(editor.selection, content);
          });
          // select the inserted content
          const start = editor.selection.start;
          const endPos = editor.document.positionAt(
            editor.document.offsetAt(start) + content.length
          );
          editor.selection = new vscode.Selection(start, endPos);
          vscode.window.showInformationMessage(
            "LINT: Seleção convertida para query concatenada."
          );
        } catch (e) {
          // fallback: open untitled if edit fails
          const docUntitled = await vscode.workspace.openTextDocument({
            content,
            language: "advpl",
          });
          await vscode.window.showTextDocument(docUntitled, {
            preview: false,
          });
          vscode.window.showInformationMessage(
            "LINT: Converted selection to concatenated query (untitled)."
          );
        }
      }
    )
  );

  // register command to open a file at a given line/column from tree items
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "lint-advpl.openFile",
      async (uriString?: string, line?: number, col?: number) => {
        try {
          if (!uriString) return;
          const uri = vscode.Uri.parse(uriString);
          const doc = await vscode.workspace.openTextDocument(uri);
          const ed = await vscode.window.showTextDocument(doc);
          if (typeof line === "number" && typeof col === "number") {
            const pos = new vscode.Position(
              Math.max(0, line - 1),
              Math.max(0, col - 1)
            );
            ed.selection = new vscode.Selection(pos, pos);
            ed.revealRange(
              new vscode.Range(pos, pos),
              vscode.TextEditorRevealType.InCenter
            );
          }
        } catch (e) {
          // ignore errors opening
        }
      }
    )
  );

  // ✅ (NOVO) ao ativar: se já tem um editor aberto, já analisa automaticamente
  scheduleAnalyze(0);

  // ✅ (NOVO) ao trocar de arquivo/aba: analisa automaticamente
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      scheduleAnalyze(0);
    })
  );

  // ✅ (NOVO) ao editar o arquivo ativo: reanalisa automaticamente (sem precisar salvar)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      const active = vscode.window.activeTextEditor?.document;
      if (!active) {
        return;
      }

      // só se for o doc ativo
      if (e.document.uri.toString() !== active.uri.toString()) {
        return;
      }

      // reanalisa com debounce (pra não pesar)
      scheduleAnalyze(250);
    })
  );

  // ✅ ao salvar, continua funcionando (pode manter)
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      try {
        if (!provider) return;

        // only analyze configured extensions on save
        const cfg = vscode.workspace.getConfiguration("lint-advpl");
        const allowedExt = cfg.get<string[]>("fileExtensions", [
          ".prw",
          ".prx",
          ".tlpp",
        ]);
        const fname = doc.fileName.toLowerCase();
        const matchesExt = allowedExt.some((e) => {
          const ext = e.startsWith(".")
            ? e.toLowerCase()
            : ("." + e).toLowerCase();
          return fname.endsWith(ext);
        });
        if (!matchesExt && doc.languageId !== "advpl") return;

        // Re-analyze the saved document so diagnostics/lines update immediately.
        const text = doc.getText();
        const result = safeAnalyze(text, doc.fileName);
        provider.setResult(result, doc.uri, doc.version);
      } catch {
        // silencioso
      }
    })
  );

  // CodeActionProvider: quick fix for advpl/require-with-nolock when DB = sqlserver
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: "file", language: "advpl" },
      {
        provideCodeActions(document, _range, context) {
          const actions: vscode.CodeAction[] = [];
          const cfg = vscode.workspace.getConfiguration("lint-advpl");
          const database = (
            cfg.get<string>("database", "sqlserver") || "sqlserver"
          ).toLowerCase();
          if (database !== "sqlserver") return actions;

          for (const diag of context.diagnostics) {
            const code = diag.code;
            const codeStr =
              typeof code === "string" ? code : String(code ?? "");
            if (codeStr === "advpl/require-with-nolock") {
              const title = "Replace (NOLOCK) with WITH(NOLOCK)";
              const fix = new vscode.CodeAction(
                title,
                vscode.CodeActionKind.QuickFix
              );
              fix.diagnostics = [diag];
              try {
                const line = document.lineAt(diag.range.start.line).text;
                const m = /\(\s*NOLOCK\s*\)/i.exec(line);
                if (m) {
                  const start = new vscode.Position(
                    diag.range.start.line,
                    m.index
                  );
                  const end = new vscode.Position(
                    diag.range.start.line,
                    m.index + m[0].length
                  );
                  const edit = new vscode.WorkspaceEdit();
                  edit.replace(
                    document.uri,
                    new vscode.Range(start, end),
                    "WITH(NOLOCK)"
                  );
                  fix.edit = edit;
                  fix.isPreferred = true;
                  actions.push(fix);
                }
              } catch (e) {
                // ignore
              }
            }
          }

          return actions;
        },
      },
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  );

  // -------------------------
  // helpers
  // -------------------------

  function scheduleAnalyze(delayMs: number) {
    if (!provider) {
      return;
    }

    if (analyzeTimer) {
      clearTimeout(analyzeTimer);
    }
    analyzeTimer = setTimeout(() => runAnalyzeNow(false), delayMs);
  }

  function runAnalyzeNow(showToast: boolean) {
    if (!provider) {
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const doc = editor.document;

    // only analyze files matching configured extensions or language id
    const cfg = vscode.workspace.getConfiguration("lint-advpl");
    const allowedExt = cfg.get<string[]>("fileExtensions", [
      ".prw",
      ".prx",
      ".tlpp",
    ]);
    const fname = doc.fileName.toLowerCase();
    const matchesExt = allowedExt.some((e) => {
      const ext = e.startsWith(".") ? e.toLowerCase() : ("." + e).toLowerCase();
      return fname.endsWith(ext);
    });
    if (!matchesExt && doc.languageId !== "advpl") {
      return;
    }

    // ✅ opcional: filtre extensões/linguagens se quiser
    // if (!doc.fileName.toLowerCase().endsWith(".prw")) return;

    const text = doc.getText();
    const result = safeAnalyze(text, doc.fileName);

    provider.setResult(result, doc.uri, doc.version);

    if (showToast) {
      vscode.window.showInformationMessage("LINT: Análise concluída");
    }
  }
}

export function deactivate() {}

function safeAnalyze(sourceText: string, fileName: string): AnalysisResult {
  try {
    const cfg = vscode.workspace.getConfiguration("lint-advpl");
    const ignoredNames = cfg.get<string[]>("ignoredNames", []);
    const enableRules = cfg.get<boolean>("enableRules", true);
    const rules = cfg.get<Record<string, boolean>>("rules", {});
    const hungarianSuggestInitializers = cfg.get<boolean>(
      "hungarianSuggestInitializers",
      true
    );
    const hungarianIgnoreAsType = cfg.get<boolean>(
      "hungarianIgnoreAsType",
      true
    );
    const requireDocHeaderRequireName = cfg.get<boolean>(
      "requireDocHeaderRequireName",
      true
    );
    const requireDocHeaderIgnoreWsMethodInWsRestful = cfg.get<boolean>(
      "requireDocHeaderIgnoreWsMethodInWsRestful",
      true
    );
    const database = cfg.get<string>("database", "sqlserver");

    return analyzer.analyzeDocument(sourceText, fileName, {
      ignoredNames,
      hungarianSuggestInitializers,
      hungarianIgnoreAsType,
      requireDocHeaderRequireName,
      requireDocHeaderIgnoreWsMethodInWsRestful,
      enableRules,
      enabledRules: rules,
    });
  } catch {
    return analyzer.analyzeDocument(sourceText, fileName);
  }
}
