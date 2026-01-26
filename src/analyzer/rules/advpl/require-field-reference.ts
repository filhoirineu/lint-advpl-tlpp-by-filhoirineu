import { Issue } from "../../types";

// Rule: detect unqualified table field references like "ZZ_FILIAL" or "ZZI_COD" used
// without an object/table qualifier (e.g. should be `oZZ->ZZ_FILIAL` or `ZZI->ZZI_COD`).
// Emits a warning suggesting the field should be qualified by its table alias/object.
export function run(sourceText: string, fileName: string): Issue[] {
  const issues: Issue[] = [];

  // ignore inside strings and comments
  const sanitized = sourceText
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n\r]*/g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(['"]).*?\1/g, (m) => m.replace(/[^\n]/g, " "));

  // pattern: two or three uppercase letters/digits, underscore, then at least 3 letters/digits/underscores
  const fieldRe = /\b([A-Za-z0-9]{2,3}_[A-Za-z0-9_]{3,})\b/g;
  // skip qualified forms like obj->FIELD or obj:prop or this->FIELD
  const qualifiedRe =
    /(?:[A-Za-z_][A-Za-z0-9_]*\s*->\s*|[A-Za-z_][A-Za-z0-9_]*\s*:\s*|\bthis\s*->\s*)/i;

  let m: RegExpExecArray | null = null;
  while ((m = fieldRe.exec(sanitized))) {
    const idx = m.index;
    const name = m[1];

    // ignore MV_PAR00..MV_PAR99 system/session variables
    if (/^mv_par\d{2}$/i.test(name)) continue;

    // check preceding text (up to 8 chars) for '->' or ':' qualifier
    const before = sanitized.slice(Math.max(0, idx - 24), idx);
    if (/(->|::|:)\s*$/.test(before)) continue;
    if (qualifiedRe.test(before)) continue;

    // also skip cases like SELECT ... FROM ZZI010 where the table code appears (we only target field-like names)
    // if the token appears immediately after FROM or JOIN it's probably a table identifier, skip
    const afterCtx = sanitized.slice(
      Math.max(0, idx - 12),
      idx + name.length + 12
    );
    if (/\b(FROM|JOIN)\s+[A-Za-z0-9_]*$/i.test(afterCtx)) continue;

    // compute line/column from original sourceText
    const abs = idx;
    const prefix = sourceText.slice(0, abs);
    const line = prefix.split(/\r?\n/).length;
    const column = (prefix.split(/\r?\n/).pop()?.length ?? 0) + 1;

    issues.push({
      ruleId: "advpl/require-field-reference",
      severity: "warning",
      line,
      column,
      message: `Campo '${name}' usado sem qualificador de tabela/objeto. Considere usar OBJ->${name} ou <alias->${name}>.`,
    });
  }

  // additionally, detect qualified references like tabela->campo where the
  // field looks like a database field (contains underscore) but the field
  // is written in lowercase (or table is lowercase). Also handle cases where
  // the table is a parenthesized variable, e.g. (cAlias)->a1_filial.
  const qualRe = /(\(?\s*[A-Za-z0-9_]+\s*\)?)\s*->\s*([A-Za-z0-9_]+)\b/g;
  let q: RegExpExecArray | null = null;
  while ((q = qualRe.exec(sanitized))) {
    let tbl = q[1];
    const fld = q[2];
    // only consider when field contains underscore (likely DB field) to reduce false positives
    if (!fld.includes("_")) continue;
    // normalize table/token by stripping surrounding parentheses and whitespace
    const tblNorm = tbl.replace(/^\(+|\)+$/g, "").trim();
    const tblHasLower = /[a-z]/.test(tblNorm);
    const fldHasLower = /[a-z]/.test(fld);
    // Only notify when the field part is lowercase. If only the table/token is
    // lowercase (e.g. a variable like cAlias), that's acceptable and we don't warn.
    if (!fldHasLower) continue;
    const abs = q.index;
    const prefix = sourceText.slice(0, abs);
    const line = prefix.split(/\r?\n/).length;
    const column = (prefix.split(/\r?\n/).pop()?.length ?? 0) + 1;

    // suggest uppercasing only the field, preserve the original table token
    // (this ensures variables like (cAlias) remain unchanged).
    const suggested = `${tbl}->${fld.toUpperCase()}`;

    issues.push({
      ruleId: "advpl/require-field-reference",
      severity: "warning",
      line,
      column,
      message: `Referência qualificada '${tbl}->${fld}' parece em minúsculas; use maiúsculas: ${suggested}.`,
    });
  }

  return issues;
}

export default { run };
