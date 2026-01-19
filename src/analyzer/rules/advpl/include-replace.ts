import { Issue } from "../../types";

// Suggest replacing legacy include protheus.ch with totvs.ch
export function run(sourceText: string, fileName: string): Issue[] {
  const issues: Issue[] = [];

  // match lines with #include "protheus.ch" or <protheus.ch> (case-insensitive)
  const re = /^\s*#\s*include\s*["<]\s*protheus\.ch\s*[">]/gim;
  let m: RegExpExecArray | null = null;
  while ((m = re.exec(sourceText))) {
    const abs =
      m.index + (m[0].indexOf("protheus") >= 0 ? m[0].indexOf("protheus") : 0);
    const prefix = sourceText.slice(0, abs);
    const line = prefix.split(/\r?\n/).length;
    const column = (prefix.split(/\r?\n/).pop()?.length ?? 0) + 1;

    issues.push({
      ruleId: "advpl/include-replace",
      severity: "info",
      line,
      column,
      message:
        'Include antigo detectado: use #include "totvs.ch" em vez de #include "protheus.ch".',
    });
  }

  return issues;
}

export default { run };
