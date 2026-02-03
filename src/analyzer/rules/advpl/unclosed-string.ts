import { Issue } from "../../types";

// Detect unclosed single or double quoted strings in source (spanning lines)
export function run(sourceText: string, fileName: string): Issue[] {
  const issues: Issue[] = [];

  let inBlockComment = false;
  let inLineComment = false;
  let inSingle = false;
  let inDouble = false;
  let startIdx = -1;
  let startLine = 0;
  let startCol = 0;

  let line = 1;
  let col = 1;

  for (let i = 0; i < sourceText.length; i++) {
    const ch = sourceText[i];
    const next = i + 1 < sourceText.length ? sourceText[i + 1] : "";

    // handle line breaks
    if (ch === "\r") {
      // skip here; will be followed by \n or alone
    }

    // if currently in block comment, look for end
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++; // consume /
        col += 2;
        continue;
      }
      if (ch === "\n") {
        line++;
        col = 1;
      } else {
        col++;
      }
      continue;
    }

    // if in line comment, skip until newline
    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
        line++;
        col = 1;
      } else {
        col++;
      }
      continue;
    }

    // if in single-quoted string
    if (inSingle) {
      if (ch === "'") {
        // escaped quote by doubling '' -> skip both
        if (next === "'") {
          i++;
          col += 2;
          continue;
        }
        // end of string
        inSingle = false;
        startIdx = -1;
        col++;
        continue;
      }
      if (ch === "\n") {
        line++;
        col = 1;
      } else {
        col++;
      }
      continue;
    }

    // if in double-quoted string
    if (inDouble) {
      if (ch === '"') {
        if (next === '"') {
          i++;
          col += 2;
          continue;
        }
        inDouble = false;
        startIdx = -1;
        col++;
        continue;
      }
      if (ch === "\n") {
        line++;
        col = 1;
      } else {
        col++;
      }
      continue;
    }

    // not in comment or string: detect comment start or string start
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i++;
      col += 2;
      continue;
    }
    if (ch === "/" && next === "/") {
      inLineComment = true;
      i++;
      col += 2;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      startIdx = i;
      startLine = line;
      startCol = col;
      col++;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      startIdx = i;
      startLine = line;
      startCol = col;
      col++;
      continue;
    }

    if (ch === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
  }

  // after scan, if still in single or double string -> report
  if (inSingle) {
    issues.push({
      ruleId: "advpl/unclosed-string",
      severity: "error",
      line: startLine,
      column: startCol,
      message: "String iniciada com aspas simples não foi fechada.",
    });
  }
  if (inDouble) {
    issues.push({
      ruleId: "advpl/unclosed-string",
      severity: "error",
      line: startLine,
      column: startCol,
      message: "String iniciada com aspas duplas não foi fechada.",
    });
  }

  return issues;
}

export default { run };
