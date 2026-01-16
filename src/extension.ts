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
  return analyzer.analyzeDocument(sourceText, fileName);
}
