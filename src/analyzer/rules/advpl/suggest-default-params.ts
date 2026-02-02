import { Issue } from "../../types";

// Suggest creating Default declarations for function parameters
export function run(sourceText: string, fileName: string): Issue[] {
  const issues: Issue[] = [];

  // detect function-like blocks including User Function, Static Function,
  // Function, Method, WsMethod and WSRESTFUL; try to extract params if present
  const funcs: {
    index: number;
    name: string;
    params: string;
    token: string;
  }[] = [];
  const tokenRe =
    /\b(User\s*Function|Static\s*Function|Function|Method|WsMethod|WSMETHOD|WSRESTFUL)\b/gi;
  const scanSource = sourceText
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n\r]*/g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(['"]).*?\1/g, (m) => m.replace(/[^\n]/g, " "));

  let fm: RegExpExecArray | null = null;
  while ((fm = tokenRe.exec(scanSource))) {
    const idx = fm.index;
    const tail = sourceText.slice(idx, Math.min(sourceText.length, idx + 400));
    const after = tail.slice(fm[0].length).trim();
    let name = "<anon>";
    const token = fm[1] || fm[0];
    if (/^\s*WSRESTFUL/i.test(fm[0])) {
      const m = after.match(/([A-Za-z_][A-Za-z0-9_]*)/);
      if (m) name = m[1];
    } else if (/^\s*WsMethod/i.test(fm[0]) || /^\s*WSMETHOD/i.test(fm[0])) {
      const m = after.match(
        /^[A-Za-z_][A-Za-z0-9_]*\s+([A-Za-z_][A-Za-z0-9_]*)/i,
      );
      if (m) name = m[1];
      else {
        const m2 = after.match(/([A-Za-z_][A-Za-z0-9_]*)/);
        if (m2) name = m2[1];
      }
    } else {
      const m = after.match(/([A-Za-z_][A-Za-z0-9_]*)/);
      if (m) name = m[1];
    }
    // try to capture parameter list if parentheses present nearby
    const pMatch = tail.match(/\(([^)]*)\)/);
    const params = pMatch ? pMatch[1] : "";
    funcs.push({ index: idx, name, params, token });
  }
  funcs.push({
    index: sourceText.length,
    name: "<EOF>",
    params: "",
    token: "",
  });

  // collect class ranges to detect method prototypes inside Class ... EndClass
  const classRanges: { start: number; end: number }[] = [];
  const classRe = /\bClass\b\s+[A-Za-z_][A-Za-z0-9_]*/gi;
  let cm: RegExpExecArray | null = null;
  while ((cm = classRe.exec(sourceText))) {
    const start = cm.index;
    const endIdx = sourceText.indexOf("EndClass", start);
    const end = endIdx >= 0 ? endIdx + "EndClass".length : sourceText.length;
    classRanges.push({ start, end });
  }

  for (let i = 0; i < funcs.length - 1; i++) {
    const cur = funcs[i];
    const next = funcs[i + 1];
    const blockText = sourceText.slice(cur.index, next.index);

    // skip suggestions inside WSMETHOD/WSRESTFUL implementations (endpoints)
    if (/^(WsMethod|WSMETHOD|WSRESTFUL)$/i.test(cur.token)) {
      continue;
    }

    const params = (cur.params || "")
      .split(",")
      .map((s) => {
        const src = s.trim();
        // accept plain names or typed params like: name as character
        const m = src.match(
          /^([A-Za-z_][A-Za-z0-9_]*)(?:\s+as\s+[A-Za-z_][A-Za-z0-9_]*)?$/i,
        );
        return m ? m[1] : null;
      })
      .filter((s) => !!s) as string[];

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
        (s) => s.toLowerCase() !== "default",
      );
      for (const id of ids) {
        declaredDefaults.add(id.toLowerCase());
      }
    }

    for (const p of params) {
      if (declaredDefaults.has(p.toLowerCase())) {
        continue;
      }

      // if this function signature is a prototype inside a Class (i.e. between
      // Class ... EndClass) and the signature does NOT include an implementation
      // ('Class <Name>' trailing), skip suggesting Default here — the real
      // implementation will appear elsewhere and should be checked instead.
      const inClass = classRanges.some(
        (r) => cur.index >= r.start && cur.index < r.end,
      );
      if (inClass) {
        // inspect the declaration line to see if it's an implementation (has 'Class')
        const declLine = sourceText
          .slice(cur.index, Math.min(sourceText.length, cur.index + 200))
          .split(/\r?\n/)[0];
        if (!/\bClass\b/i.test(declLine)) {
          continue;
        }
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
        message: `Função: ${cur.name} — Parâmetro: "${p}" — Sugestão: declarar como Default.`,
        functionName: cur.name,
      });
    }
  }

  return issues;
}

export default { run };
