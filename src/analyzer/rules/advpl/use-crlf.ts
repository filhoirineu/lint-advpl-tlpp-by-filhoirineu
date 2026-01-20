import { Issue } from "../../types";

// Suggest using `CRLF` instead of explicit CHR(13) + CHR(10) sequences.
export function run(sourceText: string, _fileName: string): Issue[] {
  const issues: Issue[] = [];

  // match CHR(13) + CHR(10) with optional spaces and case-insensitive
  const re = /\bCHR\s*\(\s*13\s*\)\s*\+\s*CHR\s*\(\s*10\s*\)/gi;
  let m: RegExpExecArray | null = null;
  while ((m = re.exec(sourceText))) {
    const abs = m.index;
    const prefix = sourceText.slice(0, abs);
    const line = prefix.split(/\r?\n/).length;
    const column = (prefix.split(/\r?\n/).pop()?.length ?? 0) + 1;

    issues.push({
      ruleId: "advpl/use-crlf",
      severity: "info",
      line,
      column,
      message:
        "advpl/use-crlf: Use a variável compartilhada CRLF (do TOTVS.CH) em vez de CHR(13) + CHR(10).",
    });
  }

  return issues;
}

export default { run };
