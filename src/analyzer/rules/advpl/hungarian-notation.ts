import { Issue } from "../../types";

// Rule: enforce hungarian-like notation for variable names
// First non-underscore character must be lowercase (a-z).
// Checks Local/Private/Static/Default declarations and assignment LHS.
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

  for (let i = 0; i < funcStarts.length - 1; i++) {
    const cur = funcStarts[i];
    const next = funcStarts[i + 1];
    const blockText = sourceText.slice(cur.index, next.index);

    // remove comments but preserve newlines/positions
    let sanitized = blockText.replace(/\/\*[\s\S]*?\*\//g, (m) =>
      m.replace(/[^\n]/g, " ")
    );
    sanitized = sanitized.replace(/\/\/[^\n\r]*/g, (m) =>
      m.replace(/[^\n]/g, " ")
    );

    // track which ids we've already reported inside this block
    const reported = new Set<string>();

    // helper to validate a name
    const checkName = (id: string, absPos: number) => {
      // skip empty
      if (!id) return;
      const key = id.toLowerCase();
      if (reported.has(key)) return;
      // enforce minimal name length: at least 2 characters when
      // ignoring leading underscores; if name starts with '_' require
      // at least 3 characters total (equivalent to stripped length >= 2)
      const stripped = id.replace(/^_+/, "");
      if (stripped.length < 2) {
        reported.add(key);
        const prefix = sourceText.slice(0, absPos);
        const line = prefix.split(/\r?\n/).length;
        const column = (prefix.split(/\r?\n/).pop()?.length ?? 0) + 1;
        issues.push({
          ruleId: "advpl/hungarian-notation",
          severity: "warning",
          line,
          column,
          message: `Nome de variável \"${id}\" muito curto: use pelo menos 2 caracteres (3 se iniciar com '_').`,
          functionName: cur.name,
        });
        return;
      }
      // find first valid letter/digit after underscores
      let pos = 0;
      while (pos < id.length && id[pos] === "_") pos++;
      if (pos >= id.length) return; // name of only underscores
      const ch = id[pos];
      // if first valid char is lowercase, it's potentially valid — but
      // require the following character (if a letter) to be uppercase
      if (/[a-z]/.test(ch)) {
        const nextChar = id[pos + 1];
        if (!nextChar || !/[A-Za-z]/.test(nextChar) || /[A-Z]/.test(nextChar)) {
          return; // OK
        }
        // else: nextChar is a letter but not uppercase -> fallthrough to report
      }
      // if reached here, either first valid char isn't lowercase, or next-letter rule failed
      reported.add(key);
      const prefix = sourceText.slice(0, absPos);
      const line = prefix.split(/\r?\n/).length;
      const column = (prefix.split(/\r?\n/).pop()?.length ?? 0) + 1;
      issues.push({
        ruleId: "advpl/hungarian-notation",
        severity: "warning",
        line,
        column,
        message: `Nome de variável \"${id}\" não segue a notação (primeiro caractere válido deve ser minúsculo e o próximo caractere, se letra, deve ser maiúsculo).`,
        functionName: cur.name,
      });
    };

    // Check declarations: Local, Private, Static (excluding Static Function), Default
    const declRe = /^\s*(Local|Private|Static|Default)\b([^\r\n]*)/gim;
    // helpers for initializer detection reused across declarations
    const funcCallRe = /^\s*[A-Za-z_][A-Za-z0-9_]*\s*\(/;
    const bareIdRe =
      /^\s*[A-Za-z_][A-Za-z0-9_]*(?:\s*(?:->|\.)\s*[A-Za-z_][A-Za-z0-9_]*)*\s*$/;
    let dm: RegExpExecArray | null = null;
    while ((dm = declRe.exec(blockText))) {
      const kind = dm[1];
      const tail = dm[2] ?? "";
      // ignore Static Function cases
      if (kind.toLowerCase() === "static" && /^\s*Function\b/i.test(tail))
        continue;
      const declPart = tail.split(/[:=]/)[0];
      const ids = (declPart.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).filter(
        (s) => s.toLowerCase() !== kind.toLowerCase()
      );
      for (const id of ids) {
        const abs = cur.index + dm.index + dm[0].indexOf(id);
        // detect initializer on the declaration line (if any)
        let initVal: string | null = null;
        try {
          const lineText = dm[0];
          const initRe = new RegExp(
            "\\b" + id + "\\b\\s*(?::=|=)\\s*([^,\\n]*)",
            "i"
          );
          const im = initRe.exec(lineText);
          if (im && im[1]) {
            initVal = im[1].trim();
          }
        } catch (e) {
          initVal = null;
        }

        // if initializer is a function call or a bare identifier/field access,
        // skip the naming check (variable receives value from another symbol)
        if (initVal && (funcCallRe.test(initVal) || bareIdRe.test(initVal))) {
          continue;
        }

        // otherwise validate the name
        checkName(id, abs);

        // if initializer exists and is not a function call / bare id, validate expected type
        if (initVal) {
          const prefix = id.replace(/^_+/, "")[0]?.toLowerCase() ?? "";
          const expectMap: Record<string, RegExp> = {
            a: /^{/,
            // prefix 'b' = bloco de código: aceita Nil ou um code-block iniciado com '{' seguido de '|' (ex: {|| ... })
            b: /^\s*(?:Nil\b|\{\s*\|)/i,
            c: /^\s*("|')/,
            d: /CTOD\s*\(/i,
            j: /^\s*Nil\b/i,
            l: /^\s*\.(T|F)\./i,
            n: /^\s*[-+]?\d+(\.\d+)?\b/,
            o: /^\s*Nil\b/i,
            s: /^\s*("|')/,
            u: /^\s*Nil\b/i,
            x: /^\s*Nil\b/i,
          };
          const expectRe = expectMap[prefix];
          if (expectRe && !expectRe.test(initVal)) {
            const prefixAbs = cur.index + dm.index;
            const pre = sourceText.slice(0, prefixAbs);
            const line = pre.split(/\r?\n/).length;
            const column = (pre.split(/\r?\n/).pop()?.length ?? 0) + 1;
            if (!reported.has(id.toLowerCase())) reported.add(id.toLowerCase());
            issues.push({
              ruleId: "advpl/hungarian-notation",
              severity: "warning",
              line,
              column,
              message: `Declaração de "${id}" inicializa como "${initVal}" mas prefixo "${prefix}" sugere outro tipo/inicializador.`,
              functionName: cur.name,
            });
          }
        }
      }
    }

    // mask declaration lines so they don't double-report in assignment check
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
      const abs = cur.index + idx;
      checkName(id, abs);
    }
  }

  return issues;
}

export default { run };
