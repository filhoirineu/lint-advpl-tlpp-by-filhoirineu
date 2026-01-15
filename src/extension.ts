import * as vscode from "vscode";
import { analyzeDocument } from "./analyzer/analyzer";
import { AnalysisResult } from "./analyzer/types";
import { LintSidebarProvider } from "./sidebar/LintSidebarProvider";

let provider: LintSidebarProvider | undefined;

// ✅ debounce
let analyzeTimer: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
  provider = new LintSidebarProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      LintSidebarProvider.viewType,
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  // ✅ comando do package.json: lintAdvplTlpp.analyzeCurrentFile
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "lintAdvplTlpp.analyzeCurrentFile",
      async () => {
        try {
          runAnalyzeNow(true); // com toast
        } catch (e: any) {
          vscode.window.showErrorMessage(
            "LINT: Falha ao analisar arquivo: " + (e?.message ?? String(e))
          );
        }
      }
    )
  );

  // ✅ comando do package.json: lintAdvplTlpp.exportReportTxt
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "lintAdvplTlpp.exportReportTxt",
      async () => {
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

          if (!uri) {
            return;
          }

          const content = provider!.buildTxtReport(last);
          await vscode.workspace.fs.writeFile(
            uri,
            Buffer.from(content, "utf8")
          );
          vscode.window.showInformationMessage(
            "LINT: TXT exportado com sucesso."
          );
        } catch (e: any) {
          vscode.window.showErrorMessage(
            "LINT: Falha ao exportar TXT: " + (e?.message ?? String(e))
          );
        }
      }
    )
  );

  // ✅ comando do package.json: lintAdvplTlpp.ping
  context.subscriptions.push(
    vscode.commands.registerCommand("lintAdvplTlpp.ping", () => {
      vscode.window.showInformationMessage("LINT: Ping OK");
    })
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
        if (!provider) {
          return;
        }

        const lastUri = provider.getLastUri();
        if (!lastUri) {
          return;
        }

        if (doc.uri.toString() !== lastUri) {
          return;
        }

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
  return analyzeDocument(sourceText, fileName);
}
