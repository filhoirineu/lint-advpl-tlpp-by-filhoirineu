import * as vscode from "vscode";
import { AnalysisResult } from "../analyzer/types";

export class LintTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly tooltip?: string,
    public readonly description?: string,
    public readonly command?: vscode.Command,
    public readonly icon?: vscode.ThemeIcon
  ) {
    super(label, collapsibleState);
    this.tooltip = tooltip;
    this.description = description;
    if (command) this.command = command;
    if (icon) this.iconPath = icon;
  }
}

export class LintTreeProvider implements vscode.TreeDataProvider<LintTreeItem> {
  public static readonly viewId = "lint-advpl.sidebar";

  private _onDidChangeTreeData: vscode.EventEmitter<LintTreeItem | void> =
    new vscode.EventEmitter<LintTreeItem | void>();
  readonly onDidChangeTreeData: vscode.Event<LintTreeItem | void> =
    this._onDidChangeTreeData.event;

  private _lastResult?: AnalysisResult;
  private _lastUri?: string;
  private _lastDocVersion?: number;
  private _diagnostics: vscode.DiagnosticCollection;

  constructor(private readonly _context: vscode.ExtensionContext) {
    this._diagnostics =
      vscode.languages.createDiagnosticCollection("lint-advpl");
    this._context.subscriptions.push(this._diagnostics);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: LintTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: LintTreeItem): Thenable<LintTreeItem[]> {
    if (!this._lastResult) {
      return Promise.resolve([
        new LintTreeItem(
          "Nenhum resultado disponível.",
          vscode.TreeItemCollapsibleState.None
        ),
      ]);
    }

    // root level: Suggestions and Issues
    if (!element) {
      const suggestionsExist = (this._lastResult.blocks || []).some(
        (b) => (b.locals || []).length > 0 || (b.defaults || []).length > 0
      );
      const issuesExist = (this._lastResult.issues || []).length > 0;

      const roots: LintTreeItem[] = [];
      if (suggestionsExist) {
        roots.push(
          new LintTreeItem(
            "Sugestões",
            vscode.TreeItemCollapsibleState.Collapsed
          )
        );
      }
      if (issuesExist) {
        roots.push(
          new LintTreeItem("Issues", vscode.TreeItemCollapsibleState.Collapsed)
        );
      }

      if (roots.length === 0) {
        return Promise.resolve([
          new LintTreeItem(
            "Nenhuma sugestão ou issue.",
            vscode.TreeItemCollapsibleState.None
          ),
        ]);
      }

      return Promise.resolve(roots);
    }

    // children for root nodes
    if (element.label === "Sugestões") {
      const items: LintTreeItem[] = [];
      const blocks = this._lastResult?.blocks || [];
      for (const b of blocks) {
        const locals = b.locals || [];
        const defaults = b.defaults || [];
        if (locals.length === 0 && defaults.length === 0) continue;

        const title = `[${b.blockType} ${b.blockName}]`;
        const blockItem = new LintTreeItem(
          title,
          vscode.TreeItemCollapsibleState.Collapsed
        );

        // attach children by setting a special label on children
        (blockItem as any)._block = b;
        items.push(blockItem);
      }

      return Promise.resolve(
        items.length
          ? items
          : [
              new LintTreeItem(
                "(nenhuma)",
                vscode.TreeItemCollapsibleState.None
              ),
            ]
      );
    }

    if (element.label && element.label.startsWith("[")) {
      // block children
      const b = (element as any)._block;
      const children: LintTreeItem[] = [];

      for (const s of b.locals || []) {
        children.push(
          new LintTreeItem(s.text, vscode.TreeItemCollapsibleState.None, s.text)
        );
      }
      for (const s of b.defaults || []) {
        children.push(
          new LintTreeItem(s.text, vscode.TreeItemCollapsibleState.None, s.text)
        );
      }

      return Promise.resolve(
        children.length
          ? children
          : [
              new LintTreeItem(
                "(nenhuma)",
                vscode.TreeItemCollapsibleState.None
              ),
            ]
      );
    }

    // If this element is a group node (created below), render its issue children
    if ((element as any)._rule) {
      const issuesForRule: any[] = (element as any)._issues || [];
      const items: LintTreeItem[] = [];
      for (const it of issuesForRule) {
        const msg = (it.message || "").replace(/\r?\n/g, " ");
        const varMatch = /"([^"]+)"/.exec(msg);
        const varName = varMatch ? varMatch[1] : undefined;
        const shortMsg = msg.length > 120 ? msg.slice(0, 117) + "..." : msg;
        const label = `${(it.severity || "info").toUpperCase()} • ${
          varName ?? "-"
        } @ ${it.functionName ?? "-"} Ln ${it.line ?? "-"}`;

        let icon: vscode.ThemeIcon | undefined;
        const sev = (it.severity || "info").toLowerCase();
        if (sev === "error") icon = new vscode.ThemeIcon("error");
        else if (sev === "warning") icon = new vscode.ThemeIcon("warning");
        else icon = new vscode.ThemeIcon("info");

        items.push(
          new LintTreeItem(
            label,
            vscode.TreeItemCollapsibleState.None,
            msg,
            shortMsg,
            {
              command: "lint-advpl.openFile",
              title: "Abrir",
              arguments: [this._lastUri ?? "", it.line ?? 1, it.column ?? 1],
            },
            icon
          )
        );
      }

      return Promise.resolve(
        items.length
          ? items
          : [
              new LintTreeItem(
                "(nenhuma)",
                vscode.TreeItemCollapsibleState.None
              ),
            ]
      );
    }

    // Root "Issues" node: group by ruleId for better visual scan
    if (element.label === "Issues") {
      const issues = this._lastResult?.issues || [];
      if (issues.length === 0) {
        return Promise.resolve([
          new LintTreeItem("(nenhum)", vscode.TreeItemCollapsibleState.None),
        ]);
      }

      // group issues by ruleId, keep order by ruleId then line
      const grouped = new Map<string, any[]>();
      const sorted = [...issues].sort((a, b) => {
        const r = (a.ruleId || "").localeCompare(b.ruleId || "");
        if (r !== 0) return r;
        return (a.line ?? 0) - (b.line ?? 0);
      });
      for (const it of sorted) {
        const key = it.ruleId || "(unknown)";
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(it);
      }

      const roots: LintTreeItem[] = [];
      for (const [ruleId, arr] of grouped) {
        const label = `${ruleId} (${arr.length})`;
        const node = new LintTreeItem(
          label,
          vscode.TreeItemCollapsibleState.Collapsed
        );
        (node as any)._rule = ruleId;
        (node as any)._issues = arr;
        roots.push(node);
      }

      return Promise.resolve(roots);
    }

    return Promise.resolve([]);
  }

  public setResult(
    result: AnalysisResult,
    uri?: vscode.Uri,
    docVersion?: number
  ) {
    this._lastResult = result;
    if (uri) this._lastUri = uri.toString();
    if (typeof docVersion === "number") this._lastDocVersion = docVersion;
    this.refresh();

    // publish diagnostics to Problems panel for the provided document
    try {
      const config = vscode.workspace.getConfiguration("lint-advpl");
      const showInProblems = config.get<boolean>("showInProblems", true);
      const editorUnderline = config.get<boolean>("editorUnderline", false);

      const targetUri =
        uri || (this._lastUri ? vscode.Uri.parse(this._lastUri) : undefined);
      if (!targetUri) return;

      if (!showInProblems) {
        this._diagnostics.delete(targetUri);
        return;
      }

      const issues = result.issues || [];
      const diags: vscode.Diagnostic[] = issues.map((it) => {
        const line = Math.max(0, (it.line ?? 1) - 1);
        const col = Math.max(0, (it.column ?? 1) - 1);

        // if editorUnderline is false, make the range zero-length at the position
        // and use Information severity to minimize editor decorations
        const range = editorUnderline
          ? new vscode.Range(
              new vscode.Position(line, col),
              new vscode.Position(line, col + 1)
            )
          : new vscode.Range(
              new vscode.Position(line, col),
              new vscode.Position(line, col)
            );

        const sev = (it.severity || "info").toLowerCase();
        const severity = editorUnderline
          ? sev === "error"
            ? vscode.DiagnosticSeverity.Error
            : sev === "warning"
            ? vscode.DiagnosticSeverity.Warning
            : vscode.DiagnosticSeverity.Information
          : vscode.DiagnosticSeverity.Information;

        const message = `${it.ruleId ?? ""}: ${it.message ?? ""}`;
        const diag = new vscode.Diagnostic(range, message, severity);
        diag.code = it.ruleId;
        return diag;
      });

      this._diagnostics.set(targetUri, diags);
    } catch (e) {
      // ignore diagnostics publication errors
    }
  }

  public getLastResult(): AnalysisResult | undefined {
    return this._lastResult;
  }

  public getLastUri(): string | undefined {
    return this._lastUri;
  }

  public getLastDocVersion(): number | undefined {
    return this._lastDocVersion;
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
        if (locals.length === 0 && defaults.length === 0) continue;

        any = true;
        lines.push(`[${b.blockType} ${b.blockName}]`);
        for (const s of locals) lines.push(`  ${s.text}`);
        for (const s of defaults) lines.push(`  ${s.text}`);
        lines.push("");
      }
      if (!any) lines.push("(nenhuma)");
    }

    lines.push("");
    lines.push("ISSUES");
    lines.push("------------------------------------------------------------");

    const issues = result.issues ?? [];
    const sorted = [...issues].sort((a, b) => {
      const r = (a.ruleId || "").localeCompare(b.ruleId || "");
      if (r !== 0) return r;
      return (a.line ?? 0) - (b.line ?? 0);
    });
    if (issues.length === 0) {
      lines.push("(nenhum)");
    } else {
      for (const it of sorted) {
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
}

export default LintTreeProvider;
