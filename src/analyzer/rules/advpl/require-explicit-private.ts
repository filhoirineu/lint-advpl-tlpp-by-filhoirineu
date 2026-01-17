import { Issue } from "../../types";

// Suggest explicit `Private` declarations instead of using SetPrvt("A,B,C")
export function run(
  sourceText: string,
  fileName: string,
  options?: { ignoredNames?: string[] }
): Issue[] {
  const issues: Issue[] = [];

  const IGNORED_NAMES = new Set(
    (options?.ignoredNames || []).map((s) => s.toLowerCase())
  );

  // detect function-like blocks including User Function, Static Function,
  // Function, Method, WsMethod and WSRESTFUL; extract a sensible name for each
  const funcStarts: { index: number; name: string }[] = [];
  const tokenRe =
    /\b(User\s*Function|Static\s*Function|Function|WsMethod|WSMETHOD|WSRESTFUL|Method)\b/gi;
  const scanSource = sourceText
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n\r]*/g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(['"]).*?\1/g, (m) => m.replace(/[^\n]/g, " "));

  let fm: RegExpExecArray | null = null;
  while ((fm = tokenRe.exec(scanSource))) {
    const idx = fm.index;
    const tail = sourceText.slice(idx, Math.min(sourceText.length, idx + 300));
    const after = tail.slice(fm[0].length).trim();
    let name = "<anon>";
    if (/^\s*WSRESTFUL/i.test(fm[0])) {
      const m = after.match(/([A-Za-z_][A-Za-z0-9_]*)/);
      if (m) name = m[1];
    } else if (/^\s*WsMethod/i.test(fm[0]) || /^\s*WSMETHOD/i.test(fm[0])) {
      const m = after.match(
        /^[A-Za-z_][A-Za-z0-9_]*\s+([A-Za-z_][A-Za-z0-9_]*)/i
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
    funcStarts.push({ index: idx, name });
  }
  funcStarts.push({ index: sourceText.length, name: "<EOF>" });

  const setPrvtRe = /\bSetPrvt\s*\(\s*(["'])(.*?)\1\s*\)/gims;
  let m: RegExpExecArray | null = null;
  while ((m = setPrvtRe.exec(sourceText))) {
    const fullMatch = m[0];
    const varsString = m[2] || "";
    const matchIndex = m.index;

    // find function block containing this SetPrvt (if any)
    let blockStart = 0;
    let blockText = sourceText;
    for (let i = 0; i < funcStarts.length - 1; i++) {
      const cur = funcStarts[i];
      const next = funcStarts[i + 1];
      if (matchIndex >= cur.index && matchIndex < next.index) {
        blockStart = cur.index;
        blockText = sourceText.slice(cur.index, next.index);
        break;
      }
    }

    const names = varsString
      .split(/\s*,\s*/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .filter((s) => !IGNORED_NAMES.has(s.toLowerCase()));

    // Build grouped suggestions for all names in this SetPrvt call
    const decls: string[] = [];
    const suggestHungarian = (orig: string, preferPrefix?: string | null) => {
      const up = orig.toUpperCase();
      const map: Record<string, string> = {
        A: "a",
        B: "b",
        C: "c",
        D: "d",
        J: "j",
        L: "l",
        N: "n",
        O: "o",
        S: "s",
        U: "u",
        X: "x",
        V: "v",
      };
      let prefix = "c"; // default to string
      let rest = up;
      if (map[up[0]]) {
        prefix = map[up[0]];
        rest = up.slice(1);
      } else if (/NUM|QTD|CNT|LIN|NUSADO|QTDE|QTDB|QTDVEN/.test(up)) {
        prefix = "n";
      } else if (/^B|^BLK|^IS|^HAS/.test(up)) {
        prefix = "b";
      } else if (/^L/.test(up)) {
        prefix = "l";
      }

      if (preferPrefix) prefix = preferPrefix;

      const restLower = rest.toLowerCase();
      const restCamel = restLower.length
        ? restLower.charAt(0).toUpperCase() + restLower.slice(1)
        : "";
      const suggestion = prefix + restCamel;
      if (suggestion.toLowerCase() === orig.toLowerCase()) return suggestion;
      return suggestion;
    };

    const initMap: Record<string, string> = {
      a: "{}",
      b: "Nil",
      c: '""',
      d: 'CTOD("")',
      e: "Nil",
      f: "Nil",
      g: "Nil",
      h: "Nil",
      i: "Nil",
      j: "Nil",
      k: "Nil",
      l: ".F.",
      m: "Nil",
      n: "0",
      o: "Nil",
      p: "Nil",
      q: "Nil",
      r: "Nil",
      s: '""',
      t: "Nil",
      u: "Nil",
      v: "Nil",
      w: "Nil",
      x: "Nil",
      y: "Nil",
      z: "Nil",
    };

    for (const name of names) {
      // detect simple initializer patterns inside the same function block
      const arrayInitRe = new RegExp(
        "\\b" + name + "\\b\\s*(?::=|=)\\s*\\{",
        "i"
      );
      const stringInitRe = new RegExp(
        "\\b" + name + "\\b\\s*(?::=|=)\\s*['\"]",
        "i"
      );
      const numberInitRe = new RegExp(
        "\\b" + name + "\\b\\s*(?::=|=)\\s*[-+]?[0-9]",
        "i"
      );

      let preferPrefix: string | null = null;
      if (arrayInitRe.test(blockText)) preferPrefix = "a";
      else if (stringInitRe.test(blockText)) preferPrefix = "c";
      else if (numberInitRe.test(blockText)) preferPrefix = "n";

      const suggested = suggestHungarian(name, preferPrefix);

      let initLiteral: string | undefined;
      if (preferPrefix) initLiteral = initMap[preferPrefix];
      const origFirst = (name[0] || "").toLowerCase();
      if (!initLiteral && origFirst && initMap[origFirst]) {
        initLiteral = initMap[origFirst];
      }
      if (!initLiteral) {
        const finalPrefix = suggested.charAt(0).toLowerCase();
        initLiteral = initMap[finalPrefix] ?? "Nil";
      }

      decls.push(`Private ${suggested} := ${initLiteral}`);
    }

    // if all names were filtered due to ignoredNames, skip
    if (names.length === 0) continue;

    // compute location at start of the SetPrvt call
    const prefix = sourceText.slice(0, matchIndex);
    const line = prefix.split(/\r?\n/).length;
    const column = (prefix.split(/\r?\n/).pop()?.length ?? 0) + 1;

    issues.push({
      ruleId: "advpl/require-explicit-private",
      severity: "info",
      line,
      column,
      message: `SetPrvt detectada — Sugestões: ${decls.join(" ; ")}`,
    });
  }

  return issues;
}

export default { run };
