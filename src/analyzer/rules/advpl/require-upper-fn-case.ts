import { Issue } from "../../types";

// Enforce uppercase for specific date/string helper functions: STOD/CTOD/DTOS/DTOC
export function run(sourceText: string, fileName: string): Issue[] {
  const issues: Issue[] = [];

  const sanitized = sourceText
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n\r]*/g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(['"]).*?\1/g, (m) => m.replace(/[^\n]/g, " "));

  const re = /\b(stod|ctod|dtos|dtoc)\s*\(/gi;
  let m: RegExpExecArray | null = null;
  while ((m = re.exec(sanitized))) {
    const nameLower = m[1];
    const abs = m.index;
    // extract actual text from original source at same position
    const actual = sourceText.substr(abs, nameLower.length);
    if (actual !== actual.toUpperCase()) {
      const prefix = sourceText.slice(0, abs);
      const line = prefix.split(/\r?\n/).length;
      const column = (prefix.split(/\r?\n/).pop()?.length ?? 0) + 1;

      issues.push({
        ruleId: "advpl/require-upper-fn-case",
        severity: "info",
        line,
        column,
        message: `Use caixa alta no NOME da função ${nameLower.toUpperCase()}() — os parâmetros continuam como atualmente tratados.`,
        functionName: nameLower.toUpperCase(),
      });
    }
  }

  return issues;
}

export default { run };
