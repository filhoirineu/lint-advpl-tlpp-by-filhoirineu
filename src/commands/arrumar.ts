import * as vscode from "vscode";

export function registerArrumar(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("lint-advpl.arrumar", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("LINT: No active editor.");
        return;
      }

      const doc = editor.document;
      const sel = editor.selection;

      let text = doc.getText(sel);
      let rangeToReplace: vscode.Range = sel;
      if (!text || !text.trim()) {
        text = doc.getText();
        rangeToReplace = new vscode.Range(
          doc.positionAt(0),
          doc.positionAt(doc.getText().length)
        );
      }

      // operate line-by-line to preserve leading indentation
      const lines = text.replace(/\r\n/g, "\n").split("\n");
      const out: string[] = [];
      for (let ln of lines) {
        const leading = (ln.match(/^\s*/) || [""])[0];
        let body = ln.slice(leading.length);

        // normalize := to have exactly one space before and after
        body = body.replace(/\s*(:=)\s*/g, " $1 ");

        // normalize AS (case-insensitive) to have one space before and after, preserve original case
        body = body.replace(/\s*\b(AS)\b\s*/gi, (__, p1) => " " + p1 + " ");

        // ensure single spacing around tokens if multiple were present
        body = body.replace(/\s+(:=)\s+/g, (m, p1) => ` ${p1} `);
        body = body.replace(/\s+\b(AS)\b\s+/gi, (m, p1) => ` ${p1} `);

        out.push(leading + body);
      }

      const result = out.join(doc.eol === vscode.EndOfLine.LF ? "\n" : "\r\n");

      await editor.edit((eb) => {
        eb.replace(rangeToReplace, result);
      });
    })
  );
}

export default registerArrumar;
