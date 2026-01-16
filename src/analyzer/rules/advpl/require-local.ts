import { Issue } from "../../types";

// Rule: detect assignments to identifiers that are not declared as Local
// and not declared as Private or Static (ignore Static Function).
export function run(sourceText: string, fileName: string): Issue[] {
  const issues: Issue[] = [];

  const funcRe =
    /\b(User\s*Function|Static\s*Function|Function|Method|WsMethod)\b\s+([A-Za-z_][A-Za-z0-9_]*)/gi;
  const funcStarts: { index: number; name: string }[] = [];
  let fm: RegExpExecArray | null = null;
  while ((fm = funcRe.exec(sourceText))) {
    funcStarts.push({ index: fm.index, name: fm[2] });
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

  for (let i = 0; i < funcStarts.length - 1; i++) {
    const cur = funcStarts[i];
    const next = funcStarts[i + 1];
    const blockText = sourceText.slice(cur.index, next.index);

    // collect declared locals, privates, statics (excluding Static Function)
    const locals = new Set<string>();
    const privates = new Set<string>();
    const statics = new Set<string>();

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

      const key = id.toLowerCase();
      // if declared as Local/Private/Static in this block or declared Private anywhere, skip
      if (
        locals.has(key) ||
        privates.has(key) ||
        statics.has(key) ||
        globalPrivates.has(key)
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
        message: `Variável "${id}" recebe valor mas não é declarada como Local (verifique se deve ser Local).`,
        functionName: cur.name,
      });
    }
  }

  return issues;
}

export default { run };
