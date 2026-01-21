import { AnalysisResult } from "./types";

export function renderHtml(opts: {
  title: string;
  status: string;
  result: AnalysisResult | null;
}): string {
  const { title, status, result } = opts;

  const body = result
    ? renderResultHtml(result)
    : `<div class="muted">Sem resultado.</div>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; padding: 12px; }
  .row { display:flex; gap:8px; margin-bottom: 10px; }
  button { padding: 6px 10px; cursor:pointer; }
  .status { margin: 8px 0 12px 0; font-size: 12px; opacity: .85; }
  .card { border: 1px solid rgba(128,128,128,.3); border-radius: 8px; padding: 10px; margin-bottom: 10px; }
  .h { font-weight: 600; margin-bottom: 6px; }
  .muted { opacity: .7; }
  pre { white-space: pre-wrap; word-break: break-word; background: rgba(128,128,128,.08); padding: 8px; border-radius: 6px; }
</style>
</head>
<body>
  <div class="row">
    <button id="refresh">Atualizar</button>
    <button id="exportTxt">Exportar TXT</button>
  </div>

  <div class="status">${escapeHtml(status)}</div>

  ${body}

<script>
  const vscode = acquireVsCodeApi();
  document.getElementById('refresh').addEventListener('click', () => vscode.postMessage({ type: 'refresh' }));
  document.getElementById('exportTxt').addEventListener('click', () => vscode.postMessage({ type: 'exportTxt' }));
</script>
</body>
</html>`;
}

function renderResultHtml(result: AnalysisResult): string {
  const blocks = result.blocks
    .map((b) => {
      const locals = b.locals.length
        ? `<div class="h">Locals sugeridos</div><pre>${b.locals
            .map((x) => x.text)
            .join("\n")}</pre>`
        : `<div class="muted">Sem Locals.</div>`;

      const defs = b.defaults.length
        ? `<div class="h">Defaults sugeridos</div><pre>${b.defaults
            .map((x) => x.text)
            .join("\n")}</pre>`
        : `<div class="muted">Sem Defaults.</div>`;

      return `<div class="card">
        <div class="h">${escapeHtml(b.blockType)} ${escapeHtml(
          b.blockName
        )}</div>
        ${locals}
        ${defs}
      </div>`;
    })
    .join("\n");

  return `<div class="card">
    <div class="h">Resumo</div>
    <div>Blocos com ocorrências: <b>${result.summary.blocksWithIssues}</b></div>
    <div>Locals: <b>${result.summary.localsCount}</b> | Defaults: <b>${
      result.summary.defaultsCount
    }</b></div>
    <div class="muted">Arquivo: ${escapeHtml(result.fileName)}</div>
  </div>
  ${blocks || `<div class="muted">Nenhuma ocorrência encontrada.</div>`}`;
}

export function renderTxtReport(result: AnalysisResult): string {
  const lines: string[] = [];
  lines.push("LINT ADVPL/TL++ by @filhoirineu");
  lines.push(`Arquivo: ${result.fileName}`);
  lines.push(`Blocos com ocorrências: ${result.summary.blocksWithIssues}`);
  lines.push(
    `Locals: ${result.summary.localsCount} | Defaults: ${result.summary.defaultsCount}`
  );
  lines.push("");

  for (const b of result.blocks) {
    lines.push(`${b.blockType} ${b.blockName}`);

    if (b.locals.length) {
      lines.push("  Locals sugeridos:");
      for (const s of b.locals) {
        lines.push(`    - ${s.text}`);
      }
    }

    if (b.defaults.length) {
      lines.push("  Defaults sugeridos:");
      for (const s of b.defaults) {
        lines.push(`    - ${s.text}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[ch] as string
  );
}
