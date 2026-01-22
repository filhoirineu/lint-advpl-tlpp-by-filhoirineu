import { Issue } from "../../types";

// Rule: validate that for explicit table references TABLE->FIELD the FIELD
// prefix matches the table code rules:
// - if TABLE starts with 'S' then FIELD prefix should equal TABLE.substr(1)
// - otherwise FIELD prefix should equal TABLE
// Skip cases where the table token is parenthesized (variables) e.g. (cAlias)->FIELD
export function run(
  sourceText: string,
  fileName: string,
  _options?: any
): Issue[] {
  const issues: Issue[] = [];

  const sanitized = sourceText
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n\r]*/g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(['"]).*?\1/g, (m) => m.replace(/[^\n]/g, " "));

  const qualRe = /\b([A-Za-z0-9_]+)\s*->\s*([A-Za-z0-9_]+)\b/g;
  let m: RegExpExecArray | null = null;
  while ((m = qualRe.exec(sanitized))) {
    const tbl = m[1];
    const fld = m[2];

    // skip parenthesized table usages like (cAlias)->field by checking the
    // character immediately before the match in the sanitized text
    const preChar = sanitized[m.index - 1] || "";
    if (preChar === "(") continue;

    // only consider fields that contain an underscore (likely DB fields)
    if (!fld.includes("_")) continue;

    const expectedPrefix = /^s/i.test(tbl) ? tbl.slice(1) : tbl;
    const fldPrefix = fld.split("_")[0];

    if (fldPrefix.toUpperCase() !== expectedPrefix.toUpperCase()) {
      const abs = m.index;
      const prefix = sourceText.slice(0, abs);
      const line = prefix.split(/\r?\n/).length;
      const column = (prefix.split(/\r?\n/).pop()?.length ?? 0) + 1;

      issues.push({
        ruleId: "advpl/require-field-table",
        severity: "warning",
        line,
        column,
        message: `Campo '${fld}' parece não pertencer à tabela '${tbl}'. Prefixo esperado: '${expectedPrefix}'.`,
      });
    }
  }

  return issues;
}

export default { run };
