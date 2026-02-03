import { Issue } from "../../types";

// Detect Static Function declarations that are never referenced/called in the file
export function run(sourceText: string, fileName: string): Issue[] {
  const issues: Issue[] = [];

  // sanitize source: remove block comments, line comments and string literals
  const sanitized = sourceText
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n\r]*/g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(['"]).*?\1/g, (m) => m.replace(/[^\n]/g, " "));

  // find all Static Function declarations
  const re = /\bStatic\s*Function\s+([A-Za-z_][A-Za-z0-9_]*)/gi;
  let m: RegExpExecArray | null = null;
  const decls: { name: string; index: number; end: number }[] = [];
  while ((m = re.exec(sanitized))) {
    decls.push({ name: m[1], index: m.index, end: m.index + m[0].length });
  }

  // for each declaration, search sanitized source for usages (name followed by '(')
  for (const d of decls) {
    const name = d.name;
    // ignore well-known Static functions invoked by the framework via StaticCall
    if (/^(MenuDef|ModelDef|ViewDef|SchedDef)$/i.test(name)) continue;
    const usageRe = new RegExp("\\b" + name + "\\s*\\(", "gi");
    let used = false;
    let um: RegExpExecArray | null = null;
    while ((um = usageRe.exec(sanitized))) {
      // ignore occurrences that fall within the declaration text itself
      if (um.index >= d.index && um.index < d.end) continue;
      used = true;
      break;
    }

    if (!used) {
      // compute line/column for diagnostic at declaration
      const abs = d.index;
      const prefix = sourceText.slice(0, abs);
      const line = prefix.split(/\r?\n/).length;
      const column = (prefix.split(/\r?\n/).pop()?.length ?? 0) + 1;

      issues.push({
        ruleId: "advpl/no-unused-static-function",
        severity: "info",
        line,
        column,
        message: `Static Function '${name}' não é usada neste arquivo — considerar remover para limpar o código.`,
        functionName: name,
      });
    }
  }

  return issues;
}

export default { run };
