import { Issue } from "../../types";

// Rule: detect assignments to identifiers that are not declared as Local
// and not declared as Private or Static (ignore Static Function).
export function run(
  sourceText: string,
  fileName: string,
  options?: { ignoredNames?: string[] }
): Issue[] {
  const issues: Issue[] = [];

  const IGNORED_NAMES = new Set(
    (options?.ignoredNames || []).map((s) => s.toLowerCase())
  );
  const isIgnored = (name: string) => {
    if (!name) return false;
    if (IGNORED_NAMES.has(name.toLowerCase())) return true;
    if (/^mv_par\d{2}$/i.test(name)) return true;
    return false;
  };

  // detect function-like blocks including User Function, Static Function,
  // Function, Method, WsMethod and WSRESTFUL; extract a sensible name for each
  const funcStarts: { index: number; name: string }[] = [];
  const tokenRe =
    /\b(User\s*Function|Static\s*Function|Function|WsMethod|WSMETHOD|WSRESTFUL|Method)\b/gi;
  // mask strings and comments so token matching ignores occurrences inside them
  const scanSource = sourceText
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n\r]*/g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(['"]).*?\1/g, (m) => m.replace(/[^\n]/g, " "));

  let fm: RegExpExecArray | null = null;
  while ((fm = tokenRe.exec(scanSource))) {
    const idx = fm.index;
    const token = fm[1] || "";
    const tail = sourceText.slice(idx, Math.min(sourceText.length, idx + 300));
    const after = tail.slice(fm[0].length).trim();
    let name = "<anon>";
    if (/^\s*WSRESTFUL/i.test(fm[0])) {
      const m = after.match(/([A-Za-z_][A-Za-z0-9_]*)/);
      if (m) name = m[1];
    } else if (/^\s*WsMethod/i.test(fm[0]) || /^\s*WSMETHOD/i.test(fm[0])) {
      // WSMETHOD <VERB> <name> ...
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

  // collect Private declarations across the whole file (treat as declared)
  const globalPrivates = new Set<string>();
  const privGlobalRe = /^\s*Private\b([^\r\n]*)/gim;
  let pg: RegExpExecArray | null = null;
  while ((pg = privGlobalRe.exec(sourceText))) {
    const tail = pg[1] ?? "";
    const declPart = tail.split(/[:=]/)[0];
    const ids = (declPart.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).filter(
      (s) => s.toLowerCase() !== "private"
    );
    for (const id of ids) globalPrivates.add(id.toLowerCase());
  }

  // collect Static declarations across the whole file (treat as declared)
  // exclude Static Function declarations
  const globalStatics = new Set<string>();
  const staticGlobalRe = /^\s*Static\b([^\r\n]*)/gim;
  let sg: RegExpExecArray | null = null;
  while ((sg = staticGlobalRe.exec(sourceText))) {
    const tail = sg[1] ?? "";
    // ignore Static Function declarations
    if (/^\s*Function\b/i.test(tail)) continue;
    const declPart = tail.split(/[:=]/)[0];
    const ids = (declPart.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).filter(
      (s) => s.toLowerCase() !== "static"
    );
    for (const id of ids) globalStatics.add(id.toLowerCase());
  }

  // collect class attribute declarations (tlpp classes: public Data <name> ...)
  const classAttrs = new Set<string>();
  const classAttrRe =
    /\b(public|private|protected)\b\s+Data\b\s+([A-Za-z_][A-Za-z0-9_]*)/gim;
  let ca: RegExpExecArray | null = null;
  while ((ca = classAttrRe.exec(sourceText))) {
    classAttrs.add((ca[2] || "").toLowerCase());
  }

  for (let i = 0; i < funcStarts.length - 1; i++) {
    const cur = funcStarts[i];
    const next = funcStarts[i + 1];
    const blockText = sourceText.slice(cur.index, next.index);

    // collect declared locals, privates, statics (excluding Static Function)
    const locals = new Set<string>();
    const privates = new Set<string>();
    const statics = new Set<string>();

    // collect function parameters from the declaration line and treat them as declared
    try {
      const declLine = sourceText
        .slice(cur.index, Math.min(sourceText.length, cur.index + 200))
        .split(/\r?\n/)[0];
      const paramsMatch =
        /\b(?:User\s*Function|Static\s*Function|Function|Method|WsMethod)\b\s+[A-Za-z_][A-Za-z0-9_]*\s*\(([^)]*)\)/i.exec(
          declLine
        );
      if (paramsMatch && paramsMatch[1]) {
        const params = paramsMatch[1]
          .split(",")
          .map((s) => s.trim())
          .filter((s) => !!s && /^[A-Za-z_][A-Za-z0-9_]*$/.test(s));
        for (const p of params) locals.add(p.toLowerCase());
      }
    } catch {
      // ignore
    }

    const localRe = /^\s*Local\b([^\r\n]*)/gim;
    let lm: RegExpExecArray | null = null;
    while ((lm = localRe.exec(blockText))) {
      const tail = lm[1] ?? "";
      const declPart = tail.split(/[:=]/)[0];
      const ids = (declPart.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).filter(
        (s) => s.toLowerCase() !== "local"
      );
      for (const id of ids) locals.add(id.toLowerCase());
    }

    const privRe = /^\s*Private\b([^\r\n]*)/gim;
    let pm: RegExpExecArray | null = null;
    while ((pm = privRe.exec(blockText))) {
      const tail = pm[1] ?? "";
      const declPart = tail.split(/[:=]/)[0];
      const ids = (declPart.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).filter(
        (s) => s.toLowerCase() !== "private"
      );
      for (const id of ids) privates.add(id.toLowerCase());
    }

    const staticRe = /^\s*Static\b([^\r\n]*)/gim;
    let sm: RegExpExecArray | null = null;
    while ((sm = staticRe.exec(blockText))) {
      const tail = sm[1] ?? "";
      // ignore Static Function declarations
      if (/^\s*Function\b/i.test(tail)) continue;
      const declPart = tail.split(/[:=]/)[0];
      const ids = (declPart.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).filter(
        (s) => s.toLowerCase() !== "static"
      );
      for (const id of ids) statics.add(id.toLowerCase());
    }

    // Default declarations (Protheus) - treat as declared variables
    const defaultRe = /^\s*Default\b([^\r\n]*)/gim;
    let dm: RegExpExecArray | null = null;
    while ((dm = defaultRe.exec(blockText))) {
      const tail = dm[1] ?? "";
      const declPart = tail.split(/[:=]/)[0];
      const ids = (declPart.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).filter(
        (s) => s.toLowerCase() !== "default"
      );
      for (const id of ids) locals.add(id.toLowerCase());
    }

    // remove comments (block /* */ and line //) but preserve newlines/positions
    let sanitized = blockText.replace(/\/\*[\s\S]*?\*\//g, (m) =>
      m.replace(/[^\n]/g, " ")
    );
    sanitized = sanitized.replace(/\/\/[^\n\r]*/g, (m) =>
      m.replace(/[^\n]/g, " ")
    );

    // mask declaration lines so they don't trigger (operate on sanitized text)
    let masked = sanitized.replace(
      /^[^\n]*\b(Local|Private|Static|Default)\b[^\n]*$/gim,
      (s) => s.replace(/[^\n]/g, " ")
    );

    // find assignments: identifier followed by :=, +=, -=, *=, /=
    const assignRe =
      /(^|[^A-Za-z0-9_>])([A-Za-z_][A-Za-z0-9_]*)\s*(?::=|\+=|-=|\*=|\/=)/gim;
    let am: RegExpExecArray | null = null;
    while ((am = assignRe.exec(masked))) {
      const id = am[2];
      const idx = am.index + am[1].length;
      // skip object properties (->)
      const prev2 = idx >= 2 ? masked.slice(idx - 2, idx) : "";
      if (prev2 === "->") continue;

      // check raw preceding text to ignore qualified assignments like self:cAttr or ::cAttr
      const absIdx = cur.index + idx;
      const beforeRaw = sourceText.slice(Math.max(0, absIdx - 8), absIdx);
      if (/\bself\b\s*:\s*$/i.test(beforeRaw)) continue;
      if (/::\s*$/.test(beforeRaw)) continue;
      if (/\bthis\b\s*:\s*$/i.test(beforeRaw)) continue;
      // skip general object/property access like obj:prop and indexed forms like obj:arr[1]:prop
      if (/\b[A-Za-z_][A-Za-z0-9_]*(?:\s*\[[^\]]*\])*\s*:\s*$/i.test(beforeRaw))
        continue;

      const lineStart = sourceText.lastIndexOf("\n", absIdx) + 1;
      const lineEnd = sourceText.indexOf("\n", absIdx);
      const lineText = sourceText.slice(
        lineStart,
        lineEnd === -1 ? sourceText.length : lineEnd
      );

      // regex matches chains like id[:id[...]]+:=  (covers indexed access before colons)
      const propAssignRe =
        /(?:[A-Za-z_][A-Za-z0-9_]*(?:\s*\[[^\]]*\])?\s*:\s*)+[A-Za-z_][A-Za-z0-9_]*\s*(?::=|\+=|-=|\*=|\/=)/;
      if (propAssignRe.test(lineText)) {
        // when assignment is to an object attribute chain (oBrowse:...:cTitle := ...)
        // the variable that should be checked is the base identifier (oBrowse)
        const baseMatch = lineText.match(
          /([A-Za-z_][A-Za-z0-9_]*)\s*(?:\[[^\]]*\])?\s*:/
        );
        if (baseMatch && baseMatch[1]) {
          const baseId = baseMatch[1];
          const baseKey = baseId.toLowerCase();
          // if base object is declared, skip reporting
          if (
            locals.has(baseKey) ||
            privates.has(baseKey) ||
            statics.has(baseKey) ||
            globalPrivates.has(baseKey) ||
            globalStatics.has(baseKey) ||
            classAttrs.has(baseKey)
          ) {
            continue;
          }

          // report issue for the base identifier instead of the attribute
          const absBase = lineStart + lineText.indexOf(baseMatch[0]);
          const prefixBase = sourceText.slice(0, absBase);
          const lineBase = prefixBase.split(/\r?\n/).length;
          const columnBase = (prefixBase.split(/\r?\n/).pop()?.length ?? 0) + 1;

          issues.push({
            ruleId: "advpl/require-local",
            severity: "warning",
            line: lineBase,
            column: columnBase,
            message: `Função: User ${cur.name} — Variável: "${baseId}" recebe valor mas não é declarada como Local.`,
            functionName: cur.name,
          });
        }
        continue;
      }

      if (isIgnored(id)) continue;

      const key = id.toLowerCase();
      // if declared as Local/Private/Static in this block or declared Private/Static anywhere, skip
      if (
        locals.has(key) ||
        privates.has(key) ||
        statics.has(key) ||
        globalPrivates.has(key) ||
        globalStatics.has(key) ||
        classAttrs.has(key)
      )
        continue;

      // report issue
      const abs = cur.index + idx;
      const prefix = sourceText.slice(0, abs);
      const line = prefix.split(/\r?\n/).length;
      const column = (prefix.split(/\r?\n/).pop()?.length ?? 0) + 1;

      issues.push({
        ruleId: "advpl/require-local",
        severity: "warning",
        line,
        column,
        message: `Função: User ${cur.name} — Variável: "${id}" recebe valor mas não é declarada como Local.`,
        functionName: cur.name,
      });
    }

    // detect auto-increment/decrement (nTeste++, nTeste--)
    const incDecRe =
      /(^|[^A-Za-z0-9_>])([A-Za-z_][A-Za-z0-9_]*)\s*(\+\+|--)(?![A-Za-z0-9_])/gim;
    let im: RegExpExecArray | null = null;
    while ((im = incDecRe.exec(masked))) {
      const id = im[2];
      const idx = im.index + im[1].length;
      // skip object properties (->)
      const prev2 = idx >= 2 ? masked.slice(idx - 2, idx) : "";
      if (prev2 === "->") continue;

      // check raw preceding text to ignore qualified like self:cAttr++ or ::cAttr++
      const absIdx = cur.index + idx;
      const beforeRaw = sourceText.slice(Math.max(0, absIdx - 8), absIdx);
      if (/\bself\b\s*:\s*$/i.test(beforeRaw)) continue;
      if (/::\s*$/.test(beforeRaw)) continue;
      if (/\bthis\b\s*:\s*$/i.test(beforeRaw)) continue;
      if (/\b[A-Za-z_][A-Za-z0-9_]*(?:\s*\[[^\]]*\])*\s*:\s*$/i.test(beforeRaw))
        continue;

      if (IGNORED_NAMES.has(id.toLowerCase())) continue;

      const key = id.toLowerCase();
      if (
        locals.has(key) ||
        privates.has(key) ||
        statics.has(key) ||
        globalPrivates.has(key) ||
        globalStatics.has(key) ||
        classAttrs.has(key)
      )
        continue;

      // report issue
      const abs = cur.index + idx;
      const prefix = sourceText.slice(0, abs);
      const line = prefix.split(/\r?\n/).length;
      const column = (prefix.split(/\r?\n/).pop()?.length ?? 0) + 1;

      issues.push({
        ruleId: "advpl/require-local",
        severity: "warning",
        line,
        column,
        message: `Função: User ${cur.name} — Variável: "${id}" é auto-incrementada/decrementada mas não é declarada como Local.`,
        functionName: cur.name,
      });
    }

    // detect Aadd(...) calls where the first argument is a variable that should be declared
    const aaddRe = /\bAadd\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*,/gi;
    let am2: RegExpExecArray | null = null;
    while ((am2 = aaddRe.exec(sanitized))) {
      const id = am2[1];
      if (IGNORED_NAMES.has(id.toLowerCase())) continue;
      const key = id.toLowerCase();
      if (
        locals.has(key) ||
        privates.has(key) ||
        statics.has(key) ||
        globalPrivates.has(key) ||
        globalStatics.has(key) ||
        classAttrs.has(key)
      )
        continue;

      const abs = cur.index + am2.index + am2[0].indexOf(id);
      const prefix = sourceText.slice(0, abs);
      const line = prefix.split(/\r?\n/).length;
      const column = (prefix.split(/\r?\n/).pop()?.length ?? 0) + 1;

      issues.push({
        ruleId: "advpl/require-local",
        severity: "warning",
        line,
        column,
        message: `Função: User ${cur.name} — Variável: "${id}" usada em Aadd(...) mas não é declarada como Local.`,
        functionName: cur.name,
      });
    }
  }

  return issues;
}

export default { run };
