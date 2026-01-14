import * as vscode from "vscode";
import { analyzeDocument } from "./analyzer/analyzer";
import { LintSidebarProvider } from "./sidebar/LintSidebarProvider";
import { AnalysisResult } from "./analyzer/types";

let provider: LintSidebarProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
  provider = new LintSidebarProvider(context);

  // Sidebar view
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      LintSidebarProvider.viewType,
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  // Command: analyze current file (always uses active editor text)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "lintAdvplTlpp.analyzeCurrentFile",
      async () => {
        try {
          const editor = vscode.window.activeTextEditor;
          if (!editor) {
            vscode.window.showWarningMessage("LINT: Nenhum editor ativo.");
            return;
          }

          const doc = editor.document;

          // ✅ SOB DEMANDA: só aceita arquivos texto (e preferencialmente .prw/.tlpp)
          const fileName = doc.fileName ?? "Untitled";

          const text = doc.getText(); // ✅ SEMPRE o texto atual do VS Code
          const result = safeAnalyze(text, fileName);

          provider?.setResult(result, doc.uri, doc.version);

          // (opcional) Toast curto. Se você quiser remover depois, é só apagar esta linha.
          vscode.window.showInformationMessage("LINT: Análise concluída");
        } catch (e: any) {
          vscode.window.showErrorMessage(
            "LINT: Falha ao analisar arquivo: " + (e?.message ?? String(e))
          );
        }
      }
    )
  );

  // Command: export txt
  context.subscriptions.push(
    vscode.commands.registerCommand("lintAdvplTlpp.exportTxt", async () => {
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

  // ✅ IMPORTANTE: ao salvar, se o arquivo salvo é o mesmo do último resultado,
  // atualiza SILENCIOSAMENTE para corrigir linha/coluna no webview.
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

        // ✅ sem toast
        provider.setResult(result, doc.uri, doc.version);
      } catch {
        // Silencioso de propósito
      }
    })
  );
}

export function deactivate() {}

function safeAnalyze(sourceText: string, fileName: string): AnalysisResult {
  // aqui você pode adicionar guards futuros (ex: tamanho máximo, etc.)
  return analyzeDocument(sourceText, fileName);
}
