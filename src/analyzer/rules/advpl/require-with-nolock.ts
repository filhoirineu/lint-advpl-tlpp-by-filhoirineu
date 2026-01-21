import { Issue } from "../../types";

// Detects occurrences of "(NOLOCK)" that are NOT preceded by a WITH and
// suggests adding WITH so the proper SQL fragment becomes "WITH(NOLOCK)".
export function run(
  sourceText: string,
  _fileName: string,
  options?: { database?: string }
): Issue[] {
  const issues: Issue[] = [];

  const db =
    options && options.database
      ? (options.database as string).toLowerCase()
      : "sqlserver";
  // Only report when configured database is SQL Server
  if (db !== "sqlserver") {
    return issues;
  }

  const re = /\(\s*NOLOCK\s*\)/gi;
  let m: RegExpExecArray | null = null;
  while ((m = re.exec(sourceText))) {
    const abs = m.index;
    // check preceding text to see if there is a WITH before the parenthesis
    const lookbehindStart = Math.max(0, abs - 16);
    const before = sourceText.slice(lookbehindStart, abs);
    if (/\bWITH\s*$/i.test(before)) {
      // already has WITH immediately before, ok
      continue;
    }

    const prefix = sourceText.slice(0, abs);
    const line = prefix.split(/\r?\n/).length;
    const column = (prefix.split(/\r?\n/).pop()?.length ?? 0) + 1;

    issues.push({
      ruleId: "advpl/require-with-nolock",
      severity: "warning",
      line,
      column,
      message:
        "advpl/require-with-nolock: Use 'WITH(NOLOCK)' em vez de '(NOLOCK)'. Substitua '(NOLOCK)' por 'WITH(NOLOCK)'.",
    });
  }

  return issues;
}

export default { run };
