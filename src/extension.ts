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

  // register convert BeginSQL block command
  context.subscriptions.push(
    vscode.commands.registerCommand("lint-advpl.convertBeginSQL", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("LINT: No active editor.");
        return;
      }
      const doc = editor.document;
      const full = doc.getText();
      let selText = editor.document.getText(editor.selection);

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
      // remove leading BeginSQL line
      if (/^\s*BeginSQL\b/i.test(lines[0])) {
        lines.shift();
      }
      // remove trailing EndSQL line if present
      if (lines.length && /^\s*EndSQL\b/i.test(lines[lines.length - 1])) {
        lines.pop();
      }

      // trim start/end blank lines
      while (lines.length && lines[0].trim() === "") lines.shift();
      while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();

      // build concatenated AdvPL string
      const out: string[] = [];
      out.push("cQuery := " + '""');
      out.push("");
      for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
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
                const aliasLiteral = aliasMatch[0] + " (NOLOCK)";
                exprPieces.push('"' + aliasLiteral.replace(/"/g, '\\"') + '"');
                // consume the alias characters so they are not added again as tail
                lastIndex = tailStart + aliasMatch[0].length;
                // advance the regex lastIndex to skip consumed alias
                tokenRe.lastIndex = lastIndex;
                continue;
              }
            }
            exprPieces.push('RetSQLName("' + param + '")');
          } else if (token.toLowerCase() === "xfilial" && param) {
            exprPieces.push('xFilial("' + param + '")');
          } else if (token.toLowerCase() === "notdel") {
            exprPieces.push("\"D_E_L_E_T_ = ''\"");
          } else if (token.toLowerCase() === "exp" && param) {
            // %Exp:VAR% -> embed variable VAR (no quotes) into the concatenation
            exprPieces.push(param);
          } else {
            // unknown token: keep as literal
            exprPieces.push('"' + m[0].replace(/"/g, '\\"') + '"');
          }
          lastIndex = idx + m[0].length;
        }
        const tail = raw.slice(lastIndex);
        if (exprPieces.length === 0) {
          // no tokens, keep as simple quoted line
          // add trailing space if line ends with an alphanumeric character
          const rawTrim = raw;
          const rawOut = /[A-Za-z0-9]$/.test(rawTrim.trim())
            ? rawTrim + " "
            : rawTrim;
          out.push('cQuery += "' + rawOut.replace(/"/g, '\\"') + '" + CRLF');
        } else {
          if (tail.length > 0) {
            exprPieces.push('"' + tail.replace(/"/g, '\\"') + '"');
          }
          // if all pieces are string literals, merge them into a single string
          const allLiteral = exprPieces.every((p) => /^".*"$/.test(p));
          if (allLiteral) {
            let combined = exprPieces.map((p) => p.slice(1, -1)).join("");
            // if combined ends with alphanumeric, append a space for readability (e.g. "WHERE" -> "WHERE ")
            if (/[A-Za-z0-9]$/.test(combined.trim())) combined = combined + " ";
            out.push(
              'cQuery += "' + combined.replace(/"/g, '\\"') + '" + CRLF'
            );
          } else {
            // join pieces with ' + '
            out.push("cQuery += " + exprPieces.join(" + ") + " + CRLF");
          }
        }
      }

      const content = out.join("\n");

      // open untitled document with the result (language advpl)
      const docUntitled = await vscode.workspace.openTextDocument({
        content,
        language: "advpl",
      });
      await vscode.window.showTextDocument(docUntitled, { preview: false });
      vscode.window.showInformationMessage(
        "LINT: Converted BeginSQL block to concatenated query (untitled)."
      );
    })
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

        // Re-analyze the saved document so diagnostics/lines update immediately.
        const text = doc.getText();
        const result = safeAnalyze(text, doc.fileName);
        provider.setResult(result, doc.uri, doc.version);
      } catch {
        // silencioso
      }
    })
  );

  // CodeActionProvider: quick fix for advpl/no-with-nolock when DB = sqlserver
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
            if (codeStr === "advpl/no-with-nolock") {
              const title = "Replace WITH (NOLOCK) with (NOLOCK)";
              const fix = new vscode.CodeAction(
                title,
                vscode.CodeActionKind.QuickFix
              );
              fix.diagnostics = [diag];
              try {
                const line = document.lineAt(diag.range.start.line).text;
                const m = /\bWITH\s*\(\s*NOLOCK\s*\)/i.exec(line);
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
                    "(NOLOCK)"
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

    // only analyze ADVPL/TLPP files (by extension or language id)
    const fname = doc.fileName.toLowerCase();
    const allowedExt = [".prw", ".prx", ".tlpp"];
    if (
      !allowedExt.some((e) => fname.endsWith(e)) &&
      doc.languageId !== "advpl"
    ) {
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
