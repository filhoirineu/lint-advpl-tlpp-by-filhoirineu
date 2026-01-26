import { Issue } from "../../types";

// Very small heuristic: find Local declarations and check for usages inside the same function/block.
export function run(
  sourceText: string,
  fileName: string,
  options?: { ignoredNames?: string[] }
): Issue[] {
  const issues: Issue[] = [];

  // Names to ignore for unused-local checks (project-specific exceptions)
  const defaultIgnored = ["aRotina", "cCadastro", "INCLUI", "ALTERA"];
  const fromOptions = (options && options.ignoredNames) || [];
  const merged = Array.from(new Set([...defaultIgnored, ...fromOptions]));
  const IGNORED_NAMES = new Set(merged.map((s) => s.toLowerCase()));
  const isIgnored = (name: string) => {
    if (!name) return false;
    if (IGNORED_NAMES.has(name.toLowerCase())) return true;
    if (/^mv_par\d{2}$/i.test(name)) return true;
    return false;
  };

  // detect class attribute declarations (tlpp): public Data <name> ...
  const classAttrRe =
    /\b(public|private|protected)\b\s+Data\b\s+([A-Za-z_][A-Za-z0-9_]*)/gim;
  let ca: RegExpExecArray | null = null;
  while ((ca = classAttrRe.exec(sourceText))) {
    IGNORED_NAMES.add((ca[2] || "").toLowerCase());
  }

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

  // add sentinel for end
  funcStarts.push({ index: sourceText.length, name: "<EOF>" });

  for (let i = 0; i < funcStarts.length - 1; i++) {
    const cur = funcStarts[i];
    const next = funcStarts[i + 1];
    const blockText = sourceText.slice(cur.index, next.index);

    // find Local/Private declaration lines in the block
    const localRe = /^\s*(Local|Private)\b([^\r\n]*)/gim;
    let lm: RegExpExecArray | null = null;
    while ((lm = localRe.exec(blockText))) {
      const kind = lm[1] ?? "Local";
      const tail = lm[2] ?? "";
      // take left-hand side before := or = to avoid RHS identifiers
      // take left-hand side before := or = to avoid RHS identifiers
      // and strip any trailing 'As <Type>' clause so type names are not
      // interpreted as identifiers (e.g. `Local aRet As Array`)
      let declPart = tail.split(/[:=]/)[0];
      declPart = declPart.split(/\bAs\b/i)[0];
      const ids = (declPart.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).filter(
        (s) => s.toLowerCase() !== "local"
      );
      for (const id of ids) {
        if (isIgnored(id)) continue;
        // build word regex
        const key = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const usageRe = new RegExp("\\b" + key + "\\b", "i");
        // mask declaration line so it doesn't match itself
        const declAbsIndex = cur.index + lm.index;
        const declLineStart =
          sourceText.lastIndexOf("\n", cur.index + lm.index) + 1;
        const declLineEnd = sourceText.indexOf("\n", cur.index + lm.index);
        // mask only the current declaration line so we don't hide usages
        const declLine = lm[0] || "";
        const before = blockText.slice(0, lm.index);
        const after = blockText.slice(lm.index + declLine.length);
        const maskedDecl = declLine.replace(/[^\n]/g, " ");
        const blockForSearch = before + maskedDecl + after;

        // also consider usages inside string-initializers like "FuncName(varName)" or 'Func(var)'
        const stringUsageRe = new RegExp(
          "[\"']([^\"']*\\b" + key + "\\b[^\"']*)[\"']",
          "i"
        );

        // If the declaration is `Private`, it may be referenced from other functions
        // so search the whole sourceText (with the declaration line masked) instead
        let searchTextForUsage = blockForSearch;
        if ((kind || "").toLowerCase() === "private") {
          const fullBefore = sourceText.slice(0, cur.index + lm.index);
          const fullAfter = sourceText.slice(
            cur.index + lm.index + declLine.length
          );
          const maskedFull = fullBefore + maskedDecl + fullAfter;
          searchTextForUsage = maskedFull;
        }

        // include anonymous blocks {|| ... } inside the block (they are part of blockText already)

        const has =
          usageRe.test(searchTextForUsage) ||
          stringUsageRe.test(searchTextForUsage);
        if (!has) {
          // locate line/column (use position of identifier within the declaration)
          const idPosInDecl = (lm[0] || "").indexOf(id);
          const abs =
            cur.index + lm.index + (idPosInDecl >= 0 ? idPosInDecl : 0);
          const prefix = sourceText.slice(0, abs);
          const line = prefix.split(/\r?\n/).length;
          const column = (prefix.split(/\r?\n/).pop()?.length ?? 0) + 1;

          issues.push({
            ruleId: "advpl/no-unused-local",
            severity: "warning",
            line,
            column,
            message: `Escopo: ${kind} — Função: User ${cur.name} — Variável: "${id}" declarada mas não utilizada no bloco`,
          });
        }
      }
    }
  }

  return issues;
}

export default { run };
