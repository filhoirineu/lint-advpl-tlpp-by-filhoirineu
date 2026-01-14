import * as vscode from "vscode";
import { analyzeDocument } from "./analyzer/analyzer";
import { LintSidebarProvider } from "./sidebar/LintSidebarProvider";

function isAdvplFile(fileName: string): boolean {
  const f = fileName.toLowerCase();
  return f.endsWith(".prw") || f.endsWith(".prx") || f.endsWith(".tlpp");
}

export function activate(context: vscode.ExtensionContext) {
  console.log("LINT >>> activate() iniciou");

  const provider = new LintSidebarProvider(context);

  // Sidebar provider (Webview)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "lintAdvplTlpp.sidebar",
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  // ==========
  // ANALYZER
  // ==========
  const analyzeIfPossible = async (reason: string) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const doc = editor.document;
    if (!isAdvplFile(doc.fileName)) {
      return;
    }

    const result = analyzeDocument(doc.getText(), doc.fileName);
    provider.setResult(result);

    console.log(`LINT >>> analisado (${reason}): ${doc.fileName}`);
  };

  // Command: Analyze current file (manual / sob demanda)
  // ✅ NÃO dá foco na sidebar
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "lintAdvplTlpp.analyzeCurrentFile",
      async () => {
        await analyzeIfPossible("manual");
        vscode.window.showInformationMessage(
          "LINT: Análise atualizada (sem foco)."
        );
      }
    )
  );

  // ==========
  // EXPORT TXT
  // ==========
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "lintAdvplTlpp.exportReportTxt",
      async () => {
        const last = provider.getLastResult();
        if (!last) {
          vscode.window.showWarningMessage(
            "LINT: Nenhum resultado para exportar. Rode a análise primeiro."
          );
          return;
        }

        const activeDoc = vscode.window.activeTextEditor?.document;
        if (!activeDoc) {
          vscode.window.showWarningMessage(
            "LINT: Nenhum arquivo ativo para definir o local do TXT."
          );
          return;
        }

        const txt = provider.buildTxtReport(last);

        const path = require("path") as typeof import("path");
        const dir = path.dirname(activeDoc.uri.fsPath);
        const base = path.basename(activeDoc.uri.fsPath);

        const outUri = vscode.Uri.joinPath(
          vscode.Uri.file(dir),
          `${base}.lint.txt`
        );

        await vscode.workspace.fs.writeFile(outUri, Buffer.from(txt, "utf8"));

        vscode.window.showInformationMessage("LINT: TXT exportado.");
      }
    )
  );

  // ===========================
  // AUTO UPDATE (background, leve)
  // ===========================
  let debounceTimer: NodeJS.Timeout | undefined;

  const scheduleAutoAnalyze = (reason: string) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      analyzeIfPossible(reason).catch((err) => console.error(err));
    }, 250);
  };

  // 1) Ao trocar de arquivo (editor ativo mudou)
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((ed) => {
      if (!ed) {
        return;
      }
      if (!isAdvplFile(ed.document.fileName)) {
        return;
      }
      scheduleAutoAnalyze("active-editor-changed");
    })
  );

  // 2) Ao salvar
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (!isAdvplFile(doc.fileName)) {
        return;
      }

      const active = vscode.window.activeTextEditor?.document;
      if (!active || active.uri.toString() !== doc.uri.toString()) {
        return;
      }

      scheduleAutoAnalyze("saved");
    })
  );

  // 3) Startup: se já estiver com .prw aberto, atualiza em background
  if (vscode.window.activeTextEditor) {
    const doc = vscode.window.activeTextEditor.document;
    if (isAdvplFile(doc.fileName)) {
      scheduleAutoAnalyze("startup");
    }
  }
}

export function deactivate() {}
