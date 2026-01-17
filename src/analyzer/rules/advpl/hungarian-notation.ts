import { Issue } from "../../types";

// Rule: enforce hungarian-like notation for variable names
// First non-underscore character must be lowercase (a-z).
// Checks Local/Private/Static/Default declarations and assignment LHS.
export function run(
  sourceText: string,
  fileName: string,
  options?: { ignoredNames?: string[]; hungarianSuggestInitializers?: boolean }
): Issue[] {
  const issues: Issue[] = [];

  const IGNORED_NAMES = new Set(
    (options?.ignoredNames || []).map((s) => s.toLowerCase())
  );
  const suggestInitializers =
    options && typeof options.hungarianSuggestInitializers !== "undefined"
      ? !!options.hungarianSuggestInitializers
      : true;

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
      if (IGNORED_NAMES.has(id.toLowerCase())) return;
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
          message: `Função: ${cur.name} — Nome de variável "${id}" muito curto: use pelo menos 2 caracteres (3 se iniciar com '_').`,
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
        message: `Função: ${cur.name} — Nome de variável "${id}" não segue a notação: primeiro caractere válido deve ser minúsculo e o próximo, se letra, deve ser maiúsculo.`,
        functionName: cur.name,
      });
    };

    // Check declarations: Local, Private, Static (excluding Static Function), Default
    const declRe = /^\s*(Local|Private|Static|Default)\b([^\r\n]*)/gim;
    // helpers for initializer detection reused across declarations
    const funcCallRe = /^\s*[A-Za-z_][A-Za-z0-9_]*\s*\(/;
    const bareIdRe =
      /^\s*[A-Za-z_][A-Za-z0-9_]*(?:\s*(?:->|\.)\s*[A-Za-z_][A-Za-z0-9_]*)*\s*$/;
    const classQualifiedRe =
      /^\s*[A-Za-z_][A-Za-z0-9_]*\s*:\s*[A-Za-z_][A-Za-z0-9_]*\s*$/;
    const methodCallRe =
      /(?:->\s*\(|->\s*[A-Za-z_][A-Za-z0-9_]*\s*\(|\.[A-Za-z_][A-Za-z0-9_]*\s*\()/;
    let dm: RegExpExecArray | null = null;
    while ((dm = declRe.exec(blockText))) {
      const kind = dm[1];
      const tail = dm[2] ?? "";
      // ignore Static Function cases
      if (kind.toLowerCase() === "static" && /^\s*Function\b/i.test(tail))
        continue;
      // take left-hand side before := or = and remove trailing 'As <Type>' so
      // type names are not interpreted as variable identifiers
      let declPart = tail.split(/[:=]/)[0];
      declPart = declPart.split(/\bAs\b/i)[0];
      const ids = (declPart.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).filter(
        (s) => s.toLowerCase() !== kind.toLowerCase()
      );
      for (const id of ids) {
        if (IGNORED_NAMES.has(id.toLowerCase())) continue;
        // compute absolute position of the identifier within the sourceText
        const declStartAbs = cur.index + dm.index; // absolute index of start of declaration match
        const declText = dm[0];
        const offsetInDecl = declText.indexOf(id);
        const abs = declStartAbs + (offsetInDecl >= 0 ? offsetInDecl : 0);
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

        // if initializer is a function call, a bare identifier/field access, or
        // a class/attribute qualified access (::attr, Self:attr, obj:attr),
        // skip the naming check (variable receives value from another symbol)
        if (
          initVal &&
          (funcCallRe.test(initVal) ||
            methodCallRe.test(initVal) ||
            bareIdRe.test(initVal) ||
            classQualifiedRe.test(initVal) ||
            /^\s*::\s*[A-Za-z_][A-Za-z0-9_]*\s*$/.test(initVal))
        ) {
          continue;
        }

        // Accept concatenation expressions as string initializers, e.g.
        // cDtGer + "_" + cNumOs + ".json" -> treat as string initializer
        const splitByPlusIgnoringQuotes = (s: string) => {
          const parts: string[] = [];
          let cur = "";
          let inQuote: string | null = null;
          for (let i = 0; i < s.length; i++) {
            const ch = s[i];
            if (inQuote) {
              cur += ch;
              if (ch === inQuote) inQuote = null;
              continue;
            }
            if (ch === '"' || ch === "'") {
              inQuote = ch;
              cur += ch;
              continue;
            }
            if (ch === "+") {
              parts.push(cur);
              cur = "";
              continue;
            }
            cur += ch;
          }
          if (cur.length) parts.push(cur);
          return parts.map((p) => p.trim()).filter((p) => p.length > 0);
        };

        const isConcatString = (expr: string) => {
          if (!expr || expr.indexOf("+") < 0) return false;
          const parts = splitByPlusIgnoringQuotes(expr);
          if (parts.length === 0) return false;
          for (const part of parts) {
            // allow string literals, bare identifiers/field access, class-qualified, or method calls
            if (
              /^\s*("|')/.test(part) ||
              bareIdRe.test(part) ||
              classQualifiedRe.test(part) ||
              methodCallRe.test(part) ||
              funcCallRe.test(part)
            ) {
              continue;
            }
            return false;
          }
          return true;
        };

        // if there's no initializer but the variable prefix suggests a
        // specific initializer (for example 'a' => array should be initialized
        // with {}), report a single focused message about the missing
        // initializer rather than flagging type-name tokens.
        if (!initVal && suggestInitializers) {
          const prefix = id.replace(/^_+/, "")[0]?.toLowerCase() ?? "";
          const suggestMap: Record<string, string> = {
            a: ":= {}",
            c: ':= ""',
            s: ':= ""',
            n: ":= 0",
            l: ":= .F.",
            o: ":= Nil",
            j: ":= Nil",
            u: ":= Nil",
            x: ":= Nil",
            b: ":= {|| }",
          };
          const suggestion = suggestMap[prefix];
          if (suggestion) {
            const beforeId = sourceText.slice(0, abs);
            const line = beforeId.split(/\r?\n/).length;
            const column = (beforeId.split(/\r?\n/).pop()?.length ?? 0) + 1;
            if (!reported.has(id.toLowerCase())) reported.add(id.toLowerCase());
            issues.push({
              ruleId: "advpl/hungarian-notation",
              severity: "warning",
              line,
              column,
              message: `Função: ${cur.name} — Variável: "${id}" declarada sem inicializador sugerido para prefixo '${prefix}' (considere "${suggestion}").`,
              functionName: cur.name,
            });
            continue;
          }
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
          // special-case: treat concatenation of strings/ids as a valid string initializer
          if (
            prefix &&
            (prefix === "c" || prefix === "s") &&
            isConcatString(initVal)
          ) {
            // considered valid for string prefixes
          } else if (expectRe && !expectRe.test(initVal)) {
            // compute line/column anchored at the identifier position (abs)
            const beforeId = sourceText.slice(0, abs);
            const line = beforeId.split(/\r?\n/).length;
            const column = (beforeId.split(/\r?\n/).pop()?.length ?? 0) + 1;
            if (!reported.has(id.toLowerCase())) reported.add(id.toLowerCase());
            issues.push({
              ruleId: "advpl/hungarian-notation",
              severity: "warning",
              line,
              column,
              message: `Função: ${cur.name} — Declaração de "${id}" inicializa como "${initVal}" mas prefixo "${prefix}" sugere outro tipo/inicializador.`,
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
      if (IGNORED_NAMES.has(id.toLowerCase())) continue;
      // skip class attribute qualified access (::attr)
      if (prev2 === "::") continue;
      // skip Self:self: or self: qualified access (case-insensitive)
      const prev5 = masked.slice(Math.max(0, idx - 8), idx).toLowerCase();
      if (prev5.endsWith("self:")) continue;
      // skip general object/property access like obj:prop or obj:prop (beforeRaw ends with 'obj:')
      const absIdx = cur.index + idx;
      const beforeRaw = sourceText.slice(Math.max(0, absIdx - 32), absIdx);
      if (/\b[A-Za-z_][A-Za-z0-9_]*\s*:\s*$/i.test(beforeRaw)) continue;
      const abs = cur.index + idx;
      checkName(id, abs);
    }
  }

  return issues;
}

export default { run };
