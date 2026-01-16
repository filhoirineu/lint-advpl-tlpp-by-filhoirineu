import { Issue } from "../../types";

// Suggest creating Default declarations for function parameters
export function run(sourceText: string, fileName: string): Issue[] {
  const issues: Issue[] = [];

  const funcRe =
    /\b(User\s*Function|Static\s*Function|Function|Method|WsMethod)\b\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/gi;
  let fm: RegExpExecArray | null = null;
  const funcs: { index: number; name: string; params: string }[] = [];
  while ((fm = funcRe.exec(sourceText))) {
    funcs.push({ index: fm.index, name: fm[2], params: fm[3] });
  }
  funcs.push({ index: sourceText.length, name: "<EOF>", params: "" });

  for (let i = 0; i < funcs.length - 1; i++) {
    const cur = funcs[i];
    const next = funcs[i + 1];
    const blockText = sourceText.slice(cur.index, next.index);

    const params = (cur.params || "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => !!s && /^[A-Za-z_][A-Za-z0-9_]*$/.test(s));

    if (params.length === 0) {
      continue;
    }

    // collect Default declarations in this block
    const defaultRe = /^\s*Default\b([^\r\n]*)/gim;
    const declaredDefaults = new Set<string>();
    let dm: RegExpExecArray | null = null;
    while ((dm = defaultRe.exec(blockText))) {
      const tail = dm[1] ?? "";
      const declPart = tail.split(/[:=]/)[0];
      const ids = (declPart.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).filter(
        (s) => s.toLowerCase() !== "default"
      );
      for (const id of ids) {
        declaredDefaults.add(id.toLowerCase());
      }
    }

    for (const p of params) {
      if (declaredDefaults.has(p.toLowerCase())) {
        continue;
      }

      // report suggestion at function declaration position
      const abs = cur.index;
      const prefix = sourceText.slice(0, abs);
      const line = prefix.split(/\r?\n/).length;
      const column = (prefix.split(/\r?\n/).pop()?.length ?? 0) + 1;

      issues.push({
        ruleId: "advpl/suggest-default-for-params",
        severity: "info",
        line,
        column,
        message: `Parâmetro "${p}" encontrado na assinatura de função "${cur.name}" — considere declará-lo como Default.`,
        functionName: cur.name,
      });
    }
  }

  return issues;
}

export default { run };
