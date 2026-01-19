import { Issue } from "../../types";

// Rule: ensure a documentation header exists before function/method/ws/class declarations
export function run(
  sourceText: string,
  fileName: string,
  options?: {
    requireDocHeaderRequireName?: boolean;
    requireDocHeaderIgnoreWsMethodInWsRestful?: boolean;
  }
): Issue[] {
  const issues: Issue[] = [];

  const tokenRe =
    /\b(User\s*Function|Static\s*Function|Function|WsMethod|WSMETHOD|WSRESTFUL|Method|Class)\b/gi;

  // mask strings and comments so token matching ignores occurrences inside them
  const scanSource = sourceText
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n\r]*/g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(['"]).*?\1/g, (m) => m.replace(/[^\n]/g, " "));

  // precompute WSRESTFUL ranges to allow skipping inner WSMETHODs
  const restRanges: Array<{ start: number; end: number }> = [];
  const restOpenRe = /\bWSRESTFUL\b/gi;
  const restEndRe = /^\s*END\s+WSRESTFUL\b/gim;
  let openMatch: RegExpExecArray | null = null;
  while ((openMatch = restOpenRe.exec(scanSource))) {
    const startIdx = openMatch.index;
    // find the next END WSRESTFUL after startIdx
    restEndRe.lastIndex = startIdx;
    const endMatch = restEndRe.exec(sourceText);
    const endIdx = endMatch
      ? endMatch.index + endMatch[0].length
      : sourceText.length;
    restRanges.push({ start: startIdx, end: endIdx });
  }

  let fm: RegExpExecArray | null = null;
  while ((fm = tokenRe.exec(scanSource))) {
    const idx = fm.index;
    const token = fm[1] || "";
    // skip closing END WSRESTFUL lines (don't require header on the END)
    const lineStart = sourceText.lastIndexOf("\n", idx) + 1;
    const nextNewline = sourceText.indexOf("\n", idx);
    const lineEnd = nextNewline === -1 ? sourceText.length : nextNewline;
    const lineText = sourceText.slice(lineStart, lineEnd);
    if (/^\s*END\s+WSRESTFUL\b/i.test(lineText)) continue;
    // skip WSMETHOD tokens that are inside a WSRESTFUL ... END WSRESTFUL block
    if (/^\s*WSMETHOD/i.test(fm[0])) {
      const inside = restRanges.some((r) => idx > r.start && idx < r.end);
      if (inside) continue;
    }
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

    // compute line number of declaration
    const prefix = sourceText.slice(0, idx);
    const declLine = prefix.split(/\r?\n/).length;

    // inspect up to 12 lines before the declaration for a doc header
    const allLines = sourceText.split(/\r?\n/);
    const startLine = Math.max(0, declLine - 13);
    const contextLines = allLines.slice(startLine, declLine - 1);
    const contextText = contextLines.join("\n");

    // look for explicit {Protheus.doc} followed by a name
    const headerNameMatch = contextText.match(
      /\{\s*Protheus\.doc\s*\}\s*([A-Za-z_][A-Za-z0-9_]*)/i
    );
    if (headerNameMatch) {
      const headerName = headerNameMatch[1];
      if (headerName.toLowerCase() !== name.toLowerCase()) {
        issues.push({
          ruleId: "advpl/require-doc-header",
          severity: "warning",
          line: declLine,
          column: 1,
          message: `${token.trim()} ${name} tem cabeçalho com nome diferente: encontrado "${headerName}", esperado "${name}".`,
          functionName: name,
        });
      }
    } else {
      // if no explicit {Protheus.doc} + name, treat as missing header
      const hasOtherMarkers = /@author|@since|\/\*\//i.test(contextText);
      issues.push({
        ruleId: "advpl/require-doc-header",
        severity: "warning",
        line: declLine,
        column: 1,
        message: hasOtherMarkers
          ? `${token.trim()} ${name} tem cabeçalho incompleto: adicione "{Protheus.doc} ${name}" na linha de abertura do cabeçalho.`
          : `${token.trim()} ${name} parece não ter o cabeçalho de documentação esperado ({Protheus.doc} ${name}, @author, @since).`,
        functionName: name,
      });
    }
  }

  return issues;
}

export default { run };
