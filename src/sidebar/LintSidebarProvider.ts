import * as vscode from "vscode";
import { AnalysisResult } from "../analyzer/types";

export class LintSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "lintAdvplTlpp.sidebarView";

  private _view?: vscode.WebviewView;
  private _lastResult?: AnalysisResult;

  constructor(private readonly _context: vscode.ExtensionContext) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri],
    };

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (!msg || !msg.type) {
        return;
      }

      switch (msg.type) {
        case "ping":
          vscode.window.showInformationMessage("LINT: Ping OK");
          return;

        case "refresh":
          vscode.commands.executeCommand("lintAdvplTlpp.analyzeCurrentFile");
          return;

        case "exportTxt":
          vscode.commands.executeCommand("lintAdvplTlpp.exportTxt");
          return;
      }
    });

    webviewView.webview.html = this.getHtml(webviewView.webview);

    // Se já havia um resultado anterior, renderiza ao abrir a view
    if (this._lastResult) {
      this.postResult(this._lastResult);
    }
  }

  public setResult(result: AnalysisResult) {
    this._lastResult = result;
    this.postResult(result);
  }

  public getLastResult(): AnalysisResult | undefined {
    return this._lastResult;
  }

  public buildTxtReport(result: AnalysisResult): string {
    const lines: string[] = [];

    lines.push("LINT ADVPL/TLPP - RELATÓRIO");
    lines.push("============================================================");
    lines.push(`Arquivo: ${result.fileName}`);
    lines.push("");
    lines.push(
      `Resumo: blocos=${result.summary?.blocksWithIssues ?? 0} | locals=${
        result.summary?.localsCount ?? 0
      } | defaults=${result.summary?.defaultsCount ?? 0} | issues=${
        result.summary?.issuesCount ?? 0
      }`
    );
    lines.push("");

    // Sugestões por bloco
    lines.push("SUGESTÕES");
    lines.push("------------------------------------------------------------");

    const blocks = result.blocks ?? [];
    if (blocks.length === 0) {
      lines.push("(nenhuma)");
    } else {
      let any = false;

      for (const b of blocks) {
        const locals = b.locals ?? [];
        const defaults = b.defaults ?? [];
        if (locals.length === 0 && defaults.length === 0) {
          continue;
        }

        any = true;
        lines.push(`[${b.blockType} ${b.blockName}]`);

        for (const s of locals) {
          lines.push(`  ${s.text}`);
        }
        for (const s of defaults) {
          lines.push(`  ${s.text}`);
        }

        lines.push("");
      }

      if (!any) {
        lines.push("(nenhuma)");
      }
    }

    lines.push("");

    // Issues
    lines.push("ISSUES");
    lines.push("------------------------------------------------------------");

    const issues = result.issues ?? [];
    if (issues.length === 0) {
      lines.push("(nenhum)");
    } else {
      for (const it of issues) {
        lines.push(
          `${(it.severity ?? "info").toUpperCase()} • ${it.ruleId ?? ""}`
        );
        lines.push(`Ln ${it.line ?? "-"}, Col ${it.column ?? "-"}`);
        lines.push(it.message ?? "");
        lines.push("");
      }
    }

    return lines.join("\r\n");
  }

  private postResult(result: AnalysisResult) {
    if (!this._view) {
      return;
    }
    this._view.webview.postMessage({ type: "result", result });
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LINT ADVPL/TLPP</title>

  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      padding: 10px;
    }

    .toolbar {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }

    button {
      border: 1px solid var(--vscode-button-border, transparent);
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      padding: 6px 10px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
    }

    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .card {
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 10px;
    }

    .muted {
      opacity: 0.8;
      font-size: 12px;
      line-height: 1.4;
    }

    .section-title {
      font-weight: 700;
      margin: 10px 0 8px;
      font-size: 13px;
    }

    .issue {
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 8px;
      padding: 8px;
      margin-bottom: 8px;
    }

    .issue-header {
      font-size: 12px;
      opacity: 0.9;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }

    .issue-message {
      white-space: pre-wrap; /* ✅ \\n quebra linha */
      font-size: 12px;
      line-height: 1.35;
    }

    .badge {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 999px;
      border: 1px solid var(--vscode-editorWidget-border);
      opacity: 0.9;
      white-space: nowrap;
    }

    .list {
      margin: 0;
      padding-left: 16px;
    }

    .list li {
      margin: 4px 0;
      font-size: 12px;
      line-height: 1.35;
    }
  </style>
</head>

<body>
  <div class="toolbar">
    <button id="btnRefresh">Atualizar</button>
    <button id="btnExport" class="secondary">Exportar TXT</button>
    <button id="btnPing" class="secondary">Ping View</button>
  </div>

  <div class="card">
    <div class="muted"><b>Arquivo:</b> <span id="filePath">-</span></div>
    <div class="muted"><b>Resumo:</b> <span id="summary">-</span></div>
  </div>

  <div class="section-title">Sugestões</div>
  <div id="suggestions">
    <div class="card"><div class="muted">Nenhuma sugestão encontrada.</div></div>
  </div>

  <div class="section-title">Issues</div>
  <div class="card" id="issues">
    <div class="muted">Nenhum issue encontrado.</div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    document.getElementById("btnRefresh").addEventListener("click", () => {
      vscode.postMessage({ type: "refresh" });
    });
    document.getElementById("btnExport").addEventListener("click", () => {
      vscode.postMessage({ type: "exportTxt" });
    });
    document.getElementById("btnPing").addEventListener("click", () => {
      vscode.postMessage({ type: "ping" });
    });

    window.addEventListener("message", (event) => {
      const msg = event.data;
      if (!msg || msg.type !== "result") return;

      const result = msg.result;

      document.getElementById("filePath").textContent = result.fileName || "-";
      document.getElementById("summary").textContent =
        "blocos=" + (result.summary?.blocksWithIssues ?? 0) +
        " | locals=" + (result.summary?.localsCount ?? 0) +
        " | defaults=" + (result.summary?.defaultsCount ?? 0) +
        " | issues=" + (result.summary?.issuesCount ?? 0);

      renderSuggestions(result);
      renderIssues(result.issues || []);
    });

    function renderSuggestions(result) {
      const container = document.getElementById("suggestions");
      container.innerHTML = "";

      const blocks = result.blocks || [];
      let renderedAny = false;

      for (const b of blocks) {
        const locals = b.locals || [];
        const defaults = b.defaults || [];

        if (locals.length === 0 && defaults.length === 0) continue;

        renderedAny = true;

        const blockCard = document.createElement("div");
        blockCard.className = "card";

        const title = document.createElement("div");
        title.className = "section-title";
        title.textContent = b.blockType + " " + b.blockName;
        blockCard.appendChild(title);

        const ul = document.createElement("ul");
        ul.className = "list";

        for (const s of locals) {
          const li = document.createElement("li");
          li.textContent = s.text;
          ul.appendChild(li);
        }

        for (const s of defaults) {
          const li = document.createElement("li");
          li.textContent = s.text;
          ul.appendChild(li);
        }

        blockCard.appendChild(ul);
        container.appendChild(blockCard);
      }

      if (!renderedAny) {
        container.innerHTML =
          '<div class="card"><div class="muted">Nenhuma sugestão encontrada.</div></div>';
      }
    }

    function renderIssues(issues) {
      const container = document.getElementById("issues");
      container.innerHTML = "";

      if (!issues || issues.length === 0) {
        container.innerHTML = '<div class="muted">Nenhum issue encontrado.</div>';
        return;
      }

      for (const it of issues) {
        container.appendChild(renderIssueCard(it));
      }
    }

    function renderIssueCard(it) {
      const wrap = document.createElement("div");
      wrap.className = "issue";

      const header = document.createElement("div");
      header.className = "issue-header";

      const left = document.createElement("div");
      left.textContent =
        (it.severity || "info").toUpperCase() + " • " + (it.ruleId || "");

      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "Ln " + (it.line ?? "-") + ", Col " + (it.column ?? "-");

      header.appendChild(left);
      header.appendChild(badge);

      const msg = document.createElement("div");
      msg.className = "issue-message";
      msg.textContent = it.message || "";

      wrap.appendChild(header);
      wrap.appendChild(msg);

      return wrap;
    }
  </script>
</body>
</html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
