import { Issue } from "../../types";

// Very small heuristic: find Local declarations and check for usages inside the same function/block.
export function run(
  sourceText: string,
  fileName: string,
  options?: { ignoredNames?: string[] }
): Issue[] {
  const issues: Issue[] = [];

  // Names to ignore for unused-local checks (project-specific exceptions)
  const defaultIgnored = ["aRotina", "cCadastro"];
  const fromOptions = (options && options.ignoredNames) || [];
  const merged = Array.from(new Set([...defaultIgnored, ...fromOptions]));
  const IGNORED_NAMES = new Set(merged.map((s) => s.toLowerCase()));

  const funcRe =
    /\b(User\s*Function|Static\s*Function|Function|Method|WsMethod)\b\s+([A-Za-z_][A-Za-z0-9_]*)/gi;
  const funcStarts: { index: number; name: string }[] = [];
  let fm: RegExpExecArray | null = null;
  while ((fm = funcRe.exec(sourceText))) {
    funcStarts.push({ index: fm.index, name: fm[2] });
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
      const declPart = tail.split(/[:=]/)[0];
      const ids = (declPart.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).filter(
        (s) => s.toLowerCase() !== "local"
      );
      for (const id of ids) {
        if (IGNORED_NAMES.has(id.toLowerCase())) continue;
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
            message: `Escopo: ${kind}\n\nFunção: User ${cur.name}\n\nVariável: \"${id}\" declarada mas não utilizada no bloco`,
          });
        }
      }
    }
  }

  return issues;
}

export default { run };
