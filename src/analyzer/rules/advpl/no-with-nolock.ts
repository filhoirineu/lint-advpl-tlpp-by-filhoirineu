import { Issue } from "../../types";

// Detects occurrences of "WITH (NOLOCK)" and suggests using just "(NOLOCK)".
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

  const re = /\bWITH\s*\(\s*NOLOCK\s*\)/gi;
  let m: RegExpExecArray | null = null;
  while ((m = re.exec(sourceText))) {
    const abs = m.index;
    const prefix = sourceText.slice(0, abs);
    const line = prefix.split(/\r?\n/).length;
    const column = (prefix.split(/\r?\n/).pop()?.length ?? 0) + 1;

    issues.push({
      ruleId: "advpl/no-with-nolock",
      severity: "warning",
      line,
      column,
      message:
        "advpl/no-with-nolock: Use '(NOLOCK)' em vez de 'WITH (NOLOCK)'. Substitua 'WITH (NOLOCK)' por '(NOLOCK)'.",
    });
  }

  return issues;
}

export default { run };
