import { Issue } from "../../types";

// Ensure a documentation header exists before function/method/ws/class declarations.
export function run(
  sourceText: string,
  _fileName: string,
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
    .replace(/\/\/[^\r\n]*/g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(['"]).*?\1/g, (m) => m.replace(/[^\n]/g, " "));

  // precompute WSRESTFUL ranges to allow skipping inner WSMETHODs
  const restRanges: Array<{ start: number; end: number }> = [];
  const restOpenRe = /^\s*WSRESTFUL\b/gim;
  const restEndRe = /^\s*END\s+WSRESTFUL\b/gim;
  let openMatch: RegExpExecArray | null = null;
  while ((openMatch = restOpenRe.exec(scanSource))) {
    const startIdx = openMatch.index;
    restEndRe.lastIndex = startIdx;
    const endMatch = restEndRe.exec(scanSource);
    const endIdx = endMatch
      ? endMatch.index + endMatch[0].length
      : scanSource.length;
    restRanges.push({ start: startIdx, end: endIdx });
  }

  // precompute Class ... End Class ranges to allow skipping Method inside classes
  const classRanges: Array<{ start: number; end: number }> = [];
  const classOpenRe = /^\s*Class\b/gim;
  const classEndRe = /^\s*End\s+Class\b/gim;
  let classOpenMatch: RegExpExecArray | null = null;
  while ((classOpenMatch = classOpenRe.exec(scanSource))) {
    const startIdx = classOpenMatch.index;
    classEndRe.lastIndex = startIdx;
    const endMatch = classEndRe.exec(scanSource);
    const endIdx = endMatch
      ? endMatch.index + endMatch[0].length
      : scanSource.length;
    classRanges.push({ start: startIdx, end: endIdx });
  }

  // collect method names present in the file to avoid mis-associating method headers with classes
  const methodNames = new Set<string>();
  const methodRe = /\bMethod\s+([A-Za-z_][A-Za-z0-9_]*)/gi;
  let mm2: RegExpExecArray | null = null;
  while ((mm2 = methodRe.exec(scanSource))) {
    methodNames.add(mm2[1]);
  }

  // iterate tokens
  let fm: RegExpExecArray | null = null;
  while ((fm = tokenRe.exec(scanSource))) {
    const idx = fm.index;
    const token = (fm[1] || fm[0] || "").toString();

    // basic context
    const tail = sourceText.slice(idx, Math.min(sourceText.length, idx + 400));
    const after = tail.slice(fm[0].length).trim();

    // determine the declared name for this token
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

    // if this is a Method declaration, try to extract the Class it belongs to (if present)
    let methodClassName: string | null = null;
    if (/^\s*Method/i.test(fm[0])) {
      const cm = tail.match(/Class\s+([A-Za-z_][A-Za-z0-9_]*)/i);
      if (cm) methodClassName = cm[1];
    }

    // compute line number of declaration
    const prefix = sourceText.slice(0, idx);
    const declLine = prefix.split(/\r?\n/).length;

    // inspect up to 12 lines before the declaration for a doc header
    const allLines = sourceText.split(/\r?\n/);
    const startLine = Math.max(0, declLine - 13);
    const contextLines = allLines.slice(startLine, declLine - 1);
    const contextText = contextLines.join("\n");

    // compute current line text to skip closing markers
    const lineStart = sourceText.lastIndexOf("\n", idx) + 1;
    const nextNewline = sourceText.indexOf("\n", idx);
    const lineEnd = nextNewline === -1 ? sourceText.length : nextNewline;
    const lineText = sourceText.slice(lineStart, lineEnd);

    // skip closing END WSRESTFUL and End Class lines
    if (/^\s*END\s+WSRESTFUL\b/i.test(lineText)) continue;
    if (/^\s*End\s+Class\b/i.test(lineText)) continue;

    // ignore `Class` tokens that are actually the suffix on a Method declaration line
    if (token.trim().toLowerCase() === "class") {
      if (/\bMethod\b/i.test(lineText)) continue;
    }

    // skip WSMETHOD tokens that are inside a WSRESTFUL ... END WSRESTFUL block
    if (/^\s*WSMETHOD/i.test(fm[0])) {
      const inside = restRanges.some((r) => idx > r.start && idx < r.end);
      if (inside) continue;
    }

    // skip Method tokens that are inside a Class ... End Class block (these are declarations)
    if (/^\s*Method/i.test(fm[0])) {
      const insideClass = classRanges.some(
        (r) => idx >= r.start && idx < r.end
      );
      if (insideClass) continue;
    }

    // look for explicit {Protheus.doc} followed by a name near the declaration
    const headerNameMatch = contextText.match(
      /\{\s*Protheus\.doc\s*\}\s*([A-Za-z_][A-Za-z0-9_]*)/i
    );
    if (headerNameMatch) {
      const headerName = headerNameMatch[1];
      // If header near a class but names a method, ignore for class
      if (
        token.trim().toLowerCase() === "class" &&
        methodNames.has(headerName)
      ) {
        // treat as missing
      } else if (token.trim().toLowerCase() === "method") {
        const headerMatchMethod =
          headerName.toLowerCase() === name.toLowerCase();
        // do not accept class-name header for methods
        if (!headerMatchMethod) {
          issues.push({
            ruleId: "advpl/require-doc-header",
            severity: "warning",
            line: declLine,
            column: 1,
            message: `${token.trim()} ${name} tem cabeçalho com nome diferente: encontrado "${headerName}", esperado "${name}".`,
            functionName: name,
          });
          continue;
        }
      } else if (headerName.toLowerCase() !== name.toLowerCase()) {
        issues.push({
          ruleId: "advpl/require-doc-header",
          severity: "warning",
          line: declLine,
          column: 1,
          message: `${token.trim()} ${name} tem cabeçalho com nome diferente: encontrado "${headerName}", esperado "${name}".`,
          functionName: name,
        });
        continue;
      }
    } else {
      // no nearby header
      // allow class-level header to cover methods inside that class
      // do not allow class-level header to satisfy constructor 'New'; require explicit method header
      // Extra strict check: if this is a method implementation (Method ... Class ...)
      // and it's not the constructor `New`, require an explicit {Protheus.doc} <MethodName>
      if (token.trim().toLowerCase() === "method" && methodClassName) {
        const methodHeaderRe = new RegExp(
          "\\{\\s*Protheus\\.doc\\s*\\}\\s*" + name,
          "i"
        );
        if (!methodHeaderRe.test(contextText)) {
          issues.push({
            ruleId: "advpl/require-doc-header",
            severity: "warning",
            line: declLine,
            column: 1,
            message: `${token.trim()} ${name} parece não ter o cabeçalho de documentação esperado ({Protheus.doc} ${name}, @author, @since).`,
            functionName: name,
          });
          continue;
        }
      }

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
