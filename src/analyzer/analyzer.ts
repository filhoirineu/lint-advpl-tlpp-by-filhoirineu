import {
  AnalysisResult,
  BlockResult,
  BlockType,
  Issue,
  Suggestion,
} from "./types";

type AssignmentOp = ":=" | "+=" | "-=" | "*=" | "/=";

type RawBlock = {
  blockType: BlockType;
  blockName: string;
  signature: string;
  body: string;
  startIndex: number;
  bodyStartIndex: number;
};

type Assignment = {
  varName: string;
  varKey: string;
  op: AssignmentOp;
  indexInBody: number;
  rhsRaw: string;
};

type VarFirstOccur = {
  varName: string;
  varKey: string;
  op: AssignmentOp;
  absIndex: number;
};

type LineIndex = number[];

type InferredType =
  | "number"
  | "string"
  | "boolean"
  | "array"
  | "date"
  | "nil"
  | "unknown";

type DeclarationKind = "Static" | "Private" | "Local" | "Default";

type Declaration = {
  kind: DeclarationKind;
  varName: string;
  varKey: string;
  absIndex: number;
  rhsRaw?: string;
};

type ParamInfo = {
  name: string;
  key: string;
};

type SqlVarFinding = { varName: string; varKey: string; absIndex: number };

function fmtWarningLines(lines: string[]): string {
  return lines.join("\n\n");
}

export function analyzeDocument(
  sourceText: string,
  fileName: string
): AnalysisResult {
  const masked = maskCommentsPreserveLayout(sourceText);
  const lineIndex = buildLineIndex(masked);

  const declaredPrivOrStatic = collectGlobalPrivateAndStatic(masked);

  const setPrvtFindings = collectSetPrvt(masked);
  for (const v of setPrvtFindings.vars) {
    declaredPrivOrStatic.add(v);
  }

  const globalDecls = collectGlobalDeclarationsWithInit(masked);

  const issues: Issue[] = [];

  // ✅ Detectar declarações múltiplas no cabeçalho (GLOBAL)
  {
    const head = masked.slice(0, findFirstBlockStartIndex(masked));
    issues.push(
      ...collectMultiDeclIssues(head, lineIndex, "Global", "(Global)", 0)
    );

    // ✅ NOVO: declarações sem inicialização no cabeçalho (GLOBAL)
    issues.push(
      ...collectNoInitDeclIssues(head, lineIndex, "Global", "(Global)", 0)
    );
  }

  for (const call of setPrvtFindings.calls) {
    const pos = indexToLineCol(lineIndex, call.absIndex);
    const suggestion = call.vars
      .map((x) => `Private ${x} := ${defaultInitializerForVar(x)}`)
      .join(" | ");

    issues.push({
      ruleId: "private/setprvt",
      severity: "warning",
      line: pos.line,
      column: pos.column,
      message: fmtWarningLines([
        "Escopo: Private (SetPrvt)",
        "Função: (Global)",
        `Variável: SetPrvt("${call.vars.join(", ")}") encontrado`,
        `Sugestão: evitar SetPrvt(). Declare explicitamente como Private: ${suggestion}`,
      ]),
    });
  }

  for (const d of globalDecls) {
    const naming = validateNameRuleStrict(d.varName);
    if (!naming.ok) {
      const pos = indexToLineCol(lineIndex, d.absIndex);
      issues.push({
        ruleId: "naming/prefix-style",
        severity: "error",
        line: pos.line,
        column: pos.column,
        message: fmtWarningLines([
          `Escopo: ${d.kind} (Global)`,
          "Função: (Global)",
          `Variável: "${d.varName}"`,
          `Sugestão: ajustar nomenclatura. ${naming.reason}`,
        ]),
      });
    }

    if (d.rhsRaw && d.rhsRaw.trim().length > 0) {
      const inferred = inferTypeFromRhs(d.rhsRaw);
      const expected = expectedTypeFromVarName(d.varName);

      if (
        inferred !== "unknown" &&
        inferred !== "nil" &&
        expected !== "unknown" &&
        inferred !== expected
      ) {
        const pos = indexToLineCol(lineIndex, d.absIndex);
        issues.push({
          ruleId: "hungarian/type-mismatch",
          severity: "error",
          line: pos.line,
          column: pos.column,
          message: fmtWarningLines([
            `Escopo: ${d.kind} (Global)`,
            "Função: (Global)",
            `Variável: "${d.varName}"`,
            `Sugestão: tipo incompatível. Esperado ${expected}, recebeu ${inferred} (${previewRhs(
              d.rhsRaw
            )}).`,
          ]),
        });
      }
    }
  }

  const maskedNoGlobalDeclLines = maskDeclarationLines(masked, "global");

  for (const d of globalDecls) {
    // ✅ IGNORA unused para cCadastro/aRotina (uso indireto)
    if (isUnusedIgnoredVar(d.varName)) {
      continue;
    }

    const count = countIdentifierUsage(maskedNoGlobalDeclLines, d.varName);

    if (count === 0) {
      const pos = indexToLineCol(lineIndex, d.absIndex);
      issues.push({
        ruleId: "unused/declaration",
        severity: "warning",
        line: pos.line,
        column: pos.column,
        message: fmtWarningLines([
          `Escopo: ${d.kind}`,
          "Função: (Global)",
          `Variável: "${d.varName}" declarado mas não utilizado no fonte`,
          "Sugestão: remover a declaração",
        ]),
      });
    }
  }

  const blocks = extractBlocksByNextStart(masked);

  // ✅ texto para procurar chamadas sem contar a própria linha de declaração da função
  const maskedNoFuncDeclLines = maskFunctionDeclLines(masked);

  const blockResults: BlockResult[] = [];

  for (const b of blocks) {
    // ✅ NOVO: Static Function declarada e não utilizada
    if (b.blockType === "Static") {
      const calls = countFunctionCalls(maskedNoFuncDeclLines, b.blockName);

      if (calls === 0) {
        const pos = indexToLineCol(lineIndex, b.startIndex);

        issues.push({
          ruleId: "unused/static-function",
          severity: "warning",
          line: pos.line,
          column: pos.column,
          message: fmtWarningLines([
            "Escopo: Static Function",
            `Função: ${b.blockType} ${b.blockName}`,
            `Problema: função Static "${b.blockName}" declarada e não utilizada no fonte`,
            "Sugestão: remover/excluir a função (ou validar se é chamada indiretamente).",
          ]),
        });
      }
    }

    // ✅ Detectar declarações múltiplas dentro do bloco
    issues.push(
      ...collectMultiDeclIssues(
        b.body,
        lineIndex,
        "Bloco",
        `${b.blockType} ${b.blockName}`,
        b.bodyStartIndex
      )
    );

    // ✅ NOVO: declarações sem inicialização dentro do bloco
    issues.push(
      ...collectNoInitDeclIssues(
        b.body,
        lineIndex,
        "Bloco",
        `${b.blockType} ${b.blockName}`,
        b.bodyStartIndex
      )
    );

    issues.push(
      ...collectTcQueryWarnings(
        b.body,
        lineIndex,
        `${b.blockType} ${b.blockName}`,
        b.bodyStartIndex
      )
    );

    const params = extractParamsFromSignatureDetailed(b.signature);
    const paramsKeys = new Set<string>(params.map((p) => p.key));

    const defaultsDefined = collectDefaultsInBlock(b.body);
    const defaultDeclsInBlock = collectDefaultDeclarations(
      b.body,
      b.bodyStartIndex
    );

    const declaredVarsInBlock = new Set<string>();
    for (const k of collectDeclaredLocalsInBlock(b.body)) {
      declaredVarsInBlock.add(k);
    }
    for (const k of collectDeclaredStaticsInBlock(b.body)) {
      declaredVarsInBlock.add(k);
    }
    for (const k of collectDeclaredPrivatesInBlock(b.body)) {
      declaredVarsInBlock.add(k);
    }

    const localDecls = collectLocalDeclarationsWithInit(
      b.body,
      b.bodyStartIndex
    );
    const staticDeclsInBlock = collectStaticDeclarationsWithInit(
      b.body,
      b.bodyStartIndex
    );
    const privateDeclsInBlock = collectPrivateDeclarationsWithInit(
      b.body,
      b.bodyStartIndex
    );

    const assignments = collectAssignments(b.body);

    const localsCandidates = new Map<string, VarFirstOccur>();
    const defaultsCandidates = new Map<string, VarFirstOccur>();

    for (const asg of assignments) {
      const varName = asg.varName;

      if (varName.includes("->")) {
        continue;
      }
      if (startsWithUpperAfterUnderscore(varName)) {
        continue;
      }

      const naming = validateNameRuleStrict(varName);
      if (!naming.ok) {
        continue;
      }

      if (declaredVarsInBlock.has(asg.varKey)) {
        continue;
      }
      if (declaredPrivOrStatic.has(asg.varKey)) {
        continue;
      }

      const absIndex = b.bodyStartIndex + asg.indexInBody;
      const isParam = paramsKeys.has(asg.varKey);

      // ✅ Local somente se NÃO for parâmetro
      if (!isParam) {
        if (!localsCandidates.has(asg.varKey)) {
          localsCandidates.set(asg.varKey, {
            varName,
            varKey: asg.varKey,
            op: asg.op,
            absIndex,
          });
        }
      }

      // ✅ Default SOMENTE para parâmetro
      if (isParam && !defaultsDefined.has(asg.varKey)) {
        if (!defaultsCandidates.has(asg.varKey)) {
          defaultsCandidates.set(asg.varKey, {
            varName,
            varKey: asg.varKey,
            op: ":=",
            absIndex,
          });
        }
      }
    }

    for (const p of params) {
      if (defaultsDefined.has(p.key)) {
        continue;
      }
      if (declaredPrivOrStatic.has(p.key)) {
        continue;
      }

      if (!defaultsCandidates.has(p.key)) {
        defaultsCandidates.set(p.key, {
          varName: p.name,
          varKey: p.key,
          op: ":=",
          absIndex: b.startIndex,
        });
      }
    }

    // SQL string => TCQUERY + MpSysOpenQuery
    {
      const alreadyHasTcQuery = hasTcQueryUsage(b.body);
      if (!alreadyHasTcQuery) {
        const sqlVars = collectSqlStringVarsFromAssignments(
          assignments,
          b.bodyStartIndex
        );

        if (sqlVars.length > 0 && blockUsesSqlOpenByString(b.body, sqlVars)) {
          const first = sqlVars.reduce(
            (a, v) => (v.absIndex < a.absIndex ? v : a),
            sqlVars[0]
          );
          const pos = indexToLineCol(lineIndex, first.absIndex);

          issues.push({
            ruleId: "sql/prefer-tcquery-mpsysopenquery",
            severity: "warning",
            line: pos.line,
            column: pos.column,
            message: fmtWarningLines([
              "Escopo: SQL/string",
              `Função: ${b.blockType} ${b.blockName}`,
              `Variável: ${sqlVars.map((v) => v.varName).join(", ")}`,
              "Sugestão: evitar montar SQL em string e abrir via DbUseArea/TCGenQry/TCSqlExec/etc. Prefira:",
              '  1) TCQUERY oQuery NEW ALIAS "QRY..."',
              "  2) MpSysOpenQuery(oQuery)",
            ]),
          });
        }
      }
    }

    const localsSuggestions: Suggestion[] = [];
    const defaultsSuggestions: Suggestion[] = [];

    for (const v of localsCandidates.values()) {
      localsSuggestions.push(
        makeSuggestion("Local", v.varName, b.blockName, b.blockType)
      );
    }

    for (const v of defaultsCandidates.values()) {
      defaultsSuggestions.push(
        makeSuggestion("Default", v.varName, b.blockName, b.blockType)
      );
    }

    if (localsSuggestions.length > 0 || defaultsSuggestions.length > 0) {
      blockResults.push({
        blockType: b.blockType,
        blockName: b.blockName,
        locals: localsSuggestions,
        defaults: defaultsSuggestions,
      });
    }

    const bodyForUsage = maskDeclarationLines(b.body, "block");

    const declsToCheckUnused: Declaration[] = [
      ...localDecls,
      ...staticDeclsInBlock,
      ...privateDeclsInBlock,
      ...defaultDeclsInBlock,
    ];

    for (const d of declsToCheckUnused) {
      // ✅ IGNORA unused para cCadastro/aRotina
      if (isUnusedIgnoredVar(d.varName)) {
        continue;
      }

      if (startsWithUpperAfterUnderscore(d.varName)) {
        continue;
      }
      if (declaredPrivOrStatic.has(d.varKey)) {
        continue;
      }

      for (const d of declsToCheckUnused) {
        if (isUnusedIgnoredVar(d.varName)) {
          continue;
        }
        if (startsWithUpperAfterUnderscore(d.varName)) {
          continue;
        }
        if (declaredPrivOrStatic.has(d.varKey)) {
          continue;
        }

        // ✅ NOVO: Local "write-only" (declarada/atribuída e nunca lida)
        if (d.kind === "Local") {
          const writes = countVariableWrites(bodyForUsage, d.varName);
          const reads = countVariableReads(bodyForUsage, d.varName);

          // se tem escrita (declaração inicial já foi mascarada; escrita aqui é :=, += etc)
          // e não tem nenhuma leitura -> problema
          if (writes > 0 && reads === 0) {
            const pos = indexToLineCol(lineIndex, d.absIndex);

            issues.push({
              ruleId: "unused/local-write-only",
              severity: "warning",
              line: pos.line,
              column: pos.column,
              message: fmtWarningLines([
                "Escopo: Local",
                `Função: ${b.blockType} ${b.blockName}`,
                `Variável: "${d.varName}"`,
                "Problema: variável Local recebe valores (write), mas nunca é utilizada em leitura (read) dentro da função.",
                "Sugestão: remover a variável ou usar o valor dela em algum ponto (provável código morto/mal utilizado).",
              ]),
            });

            continue; // evita cair em outras regras e duplicar aviso
          }
        }

        // regra antiga (unused geral) continua valendo para os outros casos:
        const count = countIdentifierUsage(bodyForUsage, d.varName);
        if (count === 0) {
          const pos = indexToLineCol(lineIndex, d.absIndex);
          issues.push({
            ruleId: "unused/declaration",
            severity: "warning",
            line: pos.line,
            column: pos.column,
            message: fmtWarningLines([
              `Escopo: ${d.kind}`,
              `Função: ${b.blockType} ${b.blockName}`,
              `Variável: "${d.varName}" declarado mas não utilizado no bloco`,
              "Sugestão: remover a declaração",
            ]),
          });
        }
      }

      const count = countIdentifierUsage(bodyForUsage, d.varName);
      if (count === 0) {
        const pos = indexToLineCol(lineIndex, d.absIndex);
        issues.push({
          ruleId: "unused/declaration",
          severity: "warning",
          line: pos.line,
          column: pos.column,
          message: fmtWarningLines([
            `Escopo: ${d.kind}`,
            `Função: ${b.blockType} ${b.blockName}`,
            `Variável: "${d.varName}" declarado mas não utilizado no bloco`,
            "Sugestão: remover a declaração",
          ]),
        });
      }
    }
  }

  const summary = {
    blocksWithIssues: blockResults.length,
    localsCount: blockResults.reduce((acc, x) => acc + x.locals.length, 0),
    defaultsCount: blockResults.reduce((acc, x) => acc + x.defaults.length, 0),
    issuesCount: issues.length,
  };

  return { fileName, blocks: blockResults, issues, summary };
}

/* =========================
   Comentários preservando layout
   ========================= */

function maskCommentsPreserveLayout(input: string): string {
  const chars = input.split("");

  const blockRe = /\/\*[\s\S]*?\*\//g;
  let m: RegExpExecArray | null = null;

  while ((m = blockRe.exec(input))) {
    const start = m.index;
    const end = start + m[0].length;
    for (let i = start; i < end; i++) {
      if (chars[i] !== "\n" && chars[i] !== "\r") {
        chars[i] = " ";
      }
    }
  }

  const lineRe = /\/\/.*$/gm;
  while ((m = lineRe.exec(input))) {
    const start = m.index;
    const end = start + m[0].length;
    for (let i = start; i < end; i++) {
      if (chars[i] !== "\n" && chars[i] !== "\r") {
        chars[i] = " ";
      }
    }
  }

  return chars.join("");
}

/* =========================
   Blocos
   ========================= */

function extractBlocksByNextStart(text: string): RawBlock[] {
  const blocks: RawBlock[] = [];

  const startRe =
    /\b(User\s*Function|UserFunction|Static\s*Function|StaticFunction|Function|Method|WsMethod)\b\s+([A-Za-z_][A-Za-z0-9_]*)\s*(\([^\)]*\))?/gi;

  const starts: {
    index: number;
    end: number;
    typeRaw: string;
    name: string;
    args: string;
  }[] = [];

  let m: RegExpExecArray | null = null;
  while ((m = startRe.exec(text))) {
    starts.push({
      index: m.index,
      end: m.index + m[0].length,
      typeRaw: m[1],
      name: m[2],
      args: m[3] ?? "",
    });
  }

  for (let i = 0; i < starts.length; i++) {
    const cur = starts[i];
    const next = starts[i + 1];

    const end = next ? next.index : text.length;
    const blockText = text.slice(cur.end, end);

    const stopRe = /\bReturn\b/gi;
    const stop = stopRe.exec(blockText);
    const bodyEndInBlock = stop ? stop.index : blockText.length;

    const body = blockText.slice(0, bodyEndInBlock);
    const bodyStartIndex = cur.end;

    const blockType = normalizeBlockType(cur.typeRaw);

    blocks.push({
      blockType,
      blockName: cur.name,
      signature: cur.args ?? "",
      body,
      startIndex: cur.index,
      bodyStartIndex,
    });
  }

  return blocks;
}

function normalizeBlockType(raw: string): BlockType {
  const r = raw.toLowerCase();

  if (r.includes("user")) {
    return "User";
  }
  if (r.includes("static")) {
    return "Static";
  }
  if (r === "function") {
    return "User";
  }
  if (r.includes("wsmethod")) {
    return "WsMethod";
  }
  if (r === "method") {
    return "Method";
  }

  return "User";
}

/* =========================
   Assignments
   ========================= */

function collectAssignments(body: string): Assignment[] {
  const list: Assignment[] = [];

  const re =
    /\b([A-Za-z_][A-Za-z0-9_]*)\s*(\+=|-=|\*=|\/=|:=)\s*(?![=])([^\r\n]*)/g;

  let m: RegExpExecArray | null = null;
  while ((m = re.exec(body))) {
    const varName = m[1];
    const op = m[2] as AssignmentOp;
    const rhsRaw = (m[3] ?? "").trim();

    list.push({
      varName,
      varKey: normalizeVarKey(varName),
      op,
      indexInBody: m.index,
      rhsRaw,
    });
  }

  return list;
}

/* =========================
   Params / Defaults
   ========================= */

function extractParamsFromSignatureDetailed(signature: string): ParamInfo[] {
  const raw = signature.trim();
  if (!raw) {
    return [];
  }

  const inner = raw.replace(/^\(/, "").replace(/\)$/, "");
  if (!inner.trim()) {
    return [];
  }

  return inner
    .split(",")
    .map((p) => p.replace(/\b(ByVal|ByRef)\b/gi, "").trim())
    .map((p) => p.split(/\s+/)[0].trim())
    .filter(Boolean)
    .map((name) => ({ name, key: normalizeVarKey(name) }));
}

function collectDefaultsInBlock(body: string): Set<string> {
  const set = new Set<string>();
  const re = /\bDefault\s+([A-Za-z_][A-Za-z0-9_]*)\s*:=/gi;

  let m: RegExpExecArray | null = null;
  while ((m = re.exec(body))) {
    set.add(normalizeVarKey(m[1]));
  }

  return set;
}

function collectDefaultDeclarations(
  body: string,
  bodyStartIndex: number
): Declaration[] {
  const decls: Declaration[] = [];
  const re = /\bDefault\b\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::=\s*([^\r\n]*))?/gi;

  let m: RegExpExecArray | null = null;
  while ((m = re.exec(body))) {
    decls.push({
      kind: "Default",
      varName: m[1],
      varKey: normalizeVarKey(m[1]),
      absIndex: bodyStartIndex + m.index,
      rhsRaw: (m[2] ?? "").trim(),
    });
  }

  return decls;
}

function collectDeclaredLocalsInBlock(body: string): Set<string> {
  const set = new Set<string>();
  const re = /\bLocal\b([^\r\n]*)/gi;

  let m: RegExpExecArray | null = null;
  while ((m = re.exec(body))) {
    const tail = m[1] ?? "";
    const ids = tail.match(/[A-Za-z_][A-Za-z0-9_]*/g);
    if (!ids) {
      continue;
    }
    for (const id of ids) {
      const low = id.toLowerCase();
      if (low !== "local") {
        set.add(normalizeVarKey(id));
      }
    }
  }

  return set;
}

function collectDeclaredStaticsInBlock(body: string): Set<string> {
  const set = new Set<string>();
  const re = /\bStatic\b(?!\s+Function)\s+([A-Za-z_][A-Za-z0-9_]*)/gi;

  let m: RegExpExecArray | null = null;
  while ((m = re.exec(body))) {
    set.add(normalizeVarKey(m[1]));
  }

  return set;
}

function collectDeclaredPrivatesInBlock(body: string): Set<string> {
  const set = new Set<string>();
  const re = /\bPrivate\b\s+([A-Za-z_][A-Za-z0-9_]*)/gi;

  let m: RegExpExecArray | null = null;
  while ((m = re.exec(body))) {
    set.add(normalizeVarKey(m[1]));
  }

  return set;
}

function findFirstBlockStartIndex(text: string): number {
  const re =
    /\b(User\s*Function|UserFunction|Static\s*Function|StaticFunction|Function|Method|WsMethod)\b\s+([A-Za-z_][A-Za-z0-9_]*)/i;
  const m = re.exec(text);
  return m ? m.index : text.length;
}

function collectGlobalPrivateAndStatic(text: string): Set<string> {
  const set = new Set<string>();
  const head = text.slice(0, findFirstBlockStartIndex(text));

  const re = /\b(Private|Static)\b([^\r\n]*)/gi;

  let m: RegExpExecArray | null = null;
  while ((m = re.exec(head))) {
    if (m[1].toLowerCase() === "static") {
      const lookahead = head.slice(
        m.index,
        Math.min(head.length, m.index + 30)
      );
      if (/^\s*Static\s+Function\b/i.test(lookahead)) {
        continue;
      }
    }

    const tail = m[2] ?? "";
    const ids = tail.match(/[A-Za-z_][A-Za-z0-9_]*/g);
    if (!ids) {
      continue;
    }

    for (const id of ids) {
      const low = id.toLowerCase();
      if (low !== "private" && low !== "static") {
        set.add(normalizeVarKey(id));
      }
    }
  }

  return set;
}

function collectGlobalDeclarationsWithInit(text: string): Declaration[] {
  const decls: Declaration[] = [];
  const head = text.slice(0, findFirstBlockStartIndex(text));

  const re =
    /\b(Static|Private)\b\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::=\s*([^\r\n]*))?/gi;

  let m: RegExpExecArray | null = null;
  while ((m = re.exec(head))) {
    const kind = (m[1][0].toUpperCase() +
      m[1].slice(1).toLowerCase()) as DeclarationKind;

    decls.push({
      kind,
      varName: m[2],
      varKey: normalizeVarKey(m[2]),
      absIndex: m.index,
      rhsRaw: (m[3] ?? "").trim(),
    });
  }

  return decls;
}

function collectLocalDeclarationsWithInit(
  body: string,
  bodyStartIndex: number
): Declaration[] {
  const decls: Declaration[] = [];
  const re = /\bLocal\b\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::=\s*([^\r\n]*))?/gi;

  let m: RegExpExecArray | null = null;
  while ((m = re.exec(body))) {
    decls.push({
      kind: "Local",
      varName: m[1],
      varKey: normalizeVarKey(m[1]),
      absIndex: bodyStartIndex + m.index,
      rhsRaw: (m[2] ?? "").trim(),
    });
  }

  return decls;
}

function collectStaticDeclarationsWithInit(
  body: string,
  bodyStartIndex: number
): Declaration[] {
  const decls: Declaration[] = [];
  const re =
    /\bStatic\b(?!\s+Function)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::=\s*([^\r\n]*))?/gi;

  let m: RegExpExecArray | null = null;
  while ((m = re.exec(body))) {
    decls.push({
      kind: "Static",
      varName: m[1],
      varKey: normalizeVarKey(m[1]),
      absIndex: bodyStartIndex + m.index,
      rhsRaw: (m[2] ?? "").trim(),
    });
  }

  return decls;
}

function collectPrivateDeclarationsWithInit(
  body: string,
  bodyStartIndex: number
): Declaration[] {
  const decls: Declaration[] = [];
  const re = /\bPrivate\b\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::=\s*([^\r\n]*))?/gi;

  let m: RegExpExecArray | null = null;
  while ((m = re.exec(body))) {
    decls.push({
      kind: "Private",
      varName: m[1],
      varKey: normalizeVarKey(m[1]),
      absIndex: bodyStartIndex + m.index,
      rhsRaw: (m[2] ?? "").trim(),
    });
  }

  return decls;
}

/* =========================
   style/multi-declaration
   ========================= */

function collectMultiDeclIssues(
  text: string,
  lineIndex: LineIndex,
  scopeLabel: string,
  functionLabel: string,
  absBaseIndex: number
): Issue[] {
  const issues: Issue[] = [];

  // Linha inteira com Local/Private/Static/Default e múltiplas variáveis separadas por vírgula
  // Ex: Local oMainWnd, oDlg2
  // Obs: não pega linhas com := (intencional)
  const re =
    /^\s*(Local|Private|Static|Default)\b(?!\s+Function)\s+([A-Za-z_][A-Za-z0-9_]*(?:\s*,\s*[A-Za-z_][A-Za-z0-9_]*)+)\s*$/gim;

  let m: RegExpExecArray | null = null;
  while ((m = re.exec(text))) {
    const declKind = m[1] as "Local" | "Private" | "Static" | "Default";
    const listRaw = m[2] ?? "";

    const vars = listRaw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    if (vars.length < 2) {
      continue;
    }

    const absIndex = absBaseIndex + m.index;
    const pos = indexToLineCol(lineIndex, absIndex);

    const suggestionLines = vars
      .map((v) => `${declKind} ${v} := ${defaultInitializerForVar(v)}`)
      .join("\n");

    issues.push({
      ruleId: "style/multi-declaration",
      severity: "warning",
      line: pos.line,
      column: pos.column,
      message: fmtWarningLines([
        `Escopo: ${scopeLabel}`,
        `Função: ${functionLabel}`,
        `Variável: declaração múltipla na mesma linha (${declKind})`,
        "Sugestão: declarar uma variável por linha (melhor leitura/diff):",
        suggestionLines,
      ]),
    });
  }

  return issues;
}

/* =========================
   NOVO: declaração sem inicialização
   ========================= */

function collectNoInitDeclIssues(
  text: string,
  lineIndex: LineIndex,
  scopeLabel: string,
  functionLabel: string,
  absBaseIndex: number
): Issue[] {
  const issues: Issue[] = [];

  // Pega linhas tipo:
  // Local cMsg
  // Private nX
  // Static aHeader
  // Default cTipo
  //
  // Regras:
  // - Não pega se tiver vírgula (multi-decl) -> já tem regra própria
  // - Não pega se tiver ":=" (já inicializado)
  const re =
    /^\s*(Local|Private|Static|Default)\b(?!\s+Function)\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/gim;

  let m: RegExpExecArray | null = null;
  while ((m = re.exec(text))) {
    const declKind = m[1] as "Local" | "Private" | "Static" | "Default";
    const varName = m[2];

    // Case: se por algum motivo vier com "Local a,b" (vírgula), ignora (multi-decl rule cobre)
    if (varName.includes(",")) {
      continue;
    }

    const absIndex = absBaseIndex + m.index;
    const pos = indexToLineCol(lineIndex, absIndex);

    issues.push({
      ruleId: "declaration/missing-initializer",
      severity: "warning",
      line: pos.line,
      column: pos.column,
      message: fmtWarningLines([
        `Escopo: ${scopeLabel}`,
        `Função: ${functionLabel}`,
        `Variável: "${varName}" declarado sem valor inicial (${declKind})`,
        "Sugestão: inicializar seguindo o padrão:",
        `${declKind} ${varName} := ${defaultInitializerForVar(varName)}`,
      ]),
    });
  }

  return issues;
}

function collectTcQueryWarnings(
  text: string,
  lineIndex: LineIndex,
  functionLabel: string,
  absBaseIndex: number
): Issue[] {
  const issues: Issue[] = [];

  // pega linhas do tipo:
  //   TCQUERY cQuery1 NEW ALIAS "query8"
  // (multiline + case-insensitive)
  const re = /^[ \t]*TCQUERY\b[^\r\n]*/gim;

  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const fullLine = m[0];

    // tenta extrair variável e ALIAS para enriquecer o warning
    const varMatch = fullLine.match(/^\s*TCQUERY\s+([A-Za-z_]\w*)/i);
    const varName = varMatch?.[1];

    const aliasMatch = fullLine.match(/\bALIAS\s+"([^"]+)"/i);
    const aliasName = aliasMatch?.[1];

    const absIndex = absBaseIndex + m.index;
    const pos = indexToLineCol(lineIndex, absIndex);

    issues.push({
      ruleId: "sql/tcquery",
      severity: "warning",
      line: pos.line,
      column: pos.column,
      message: fmtWarningLines([
        "Escopo: SQL (TCQUERY)",
        `Função: ${functionLabel}`,
        `Trecho original: ${fullLine.trim()}`,
        "Sugestão de substituição:",
        "",
        `MpSysOpenQuery( ${varName ?? "<cQueryPar>"} , ${
          aliasName ? `"${aliasName}"` : "<cAliasPar>"
        } )`,
      ]),
    });
  }

  return issues;
}

/* =========================
Utilidades de nome / tipo
========================= */

function normalizeVarKey(name: string): string {
  return name.replace(/^_+/, "").toLowerCase();
}

// ignore list para UNUSED
const UNUSED_IGNORE_KEYS = new Set<string>([
  normalizeVarKey("cCadastro"),
  normalizeVarKey("aRotina"),
]);

function isUnusedIgnoredVar(varName: string): boolean {
  return UNUSED_IGNORE_KEYS.has(normalizeVarKey(varName));
}

function getFirstSignificantChar(name: string): string {
  const n = name.replace(/^_+/, "");
  return n.length > 0 ? n[0] : "";
}

function startsWithUpperAfterUnderscore(name: string): boolean {
  const n = name.replace(/^_+/, "");
  if (!n) {
    return false;
  }
  return /^[A-Z]/.test(n);
}

function validateNameRuleStrict(name: string): {
  ok: boolean;
  reason?: string;
} {
  // remove underscores iniciais
  const cleaned = name.replace(/^_+/, "");

  // ✅ NOVO: variável deve ter pelo menos 2 caracteres (prefixo + nome)
  // Ex inválido: I, J, X
  // Ex válido: nX, cA, lT
  if (cleaned.length < 2) {
    return {
      ok: false,
      reason:
        "Nome inválido. Variável deve possuir prefixo de tipo + identificador (ex: nX, cA, lT).",
    };
  }

  const first = cleaned[0];

  // prefixo deve ser letra minúscula
  if (first !== first.toLowerCase()) {
    return {
      ok: false,
      reason:
        "O prefixo da variável deve ser uma letra minúscula indicando o tipo (ex: n, c, l, a, d, o).",
    };
  }

  return { ok: true };
}

function inferTypeFromRhs(rhs: string): InferredType {
  const t = rhs.trim();
  if (!t) {
    return "unknown";
  }
  if (/^\{\s*\}$/.test(t)) {
    return "array";
  }
  if (/^nil$/i.test(t)) {
    return "nil";
  }
  if (/^\.t\.|^\.f\./i.test(t)) {
    return "boolean";
  }
  if (/^ctod\s*\(/i.test(t)) {
    return "date";
  }
  if (/^["']/.test(t)) {
    return "string";
  }
  if (/^[+-]?\d+(\.\d+)?$/.test(t)) {
    return "number";
  }
  return "unknown";
}

function expectedTypeFromVarName(name: string): InferredType {
  const n = name.replace(/^_+/, "");
  const first = n[0]?.toLowerCase() ?? "";

  if (first === "n") {
    return "number";
  }
  if (first === "c") {
    return "string";
  }
  if (first === "l") {
    return "boolean";
  }
  if (first === "a") {
    return "array";
  }
  if (first === "d") {
    return "date";
  }
  if (first === "o") {
    return "unknown";
  }

  return "unknown";
}

function previewRhs(rhs: string): string {
  const t = rhs.replace(/\s+/g, " ").trim();
  return t.length > 50 ? t.slice(0, 47) + "..." : t;
}

function defaultInitializerForVar(name: string): string {
  const n = name.replace(/^_+/, "");
  const first = n[0]?.toLowerCase() ?? "";

  if (first === "a") {
    return "{}";
  }
  if (first === "b") {
    return "Nil";
  }
  if (first === "c") {
    return '""';
  }
  if (first === "d") {
    return 'CTOD("")';
  }
  if (first === "j") {
    return "Nil";
  }
  if (first === "l") {
    return ".F.";
  }
  if (first === "n") {
    return "0";
  }
  if (first === "o") {
    return "Nil";
  }

  return "Nil";
}

function makeSuggestion(
  kind: "Local" | "Default",
  varName: string,
  blockName: string,
  blockType: BlockType
): Suggestion {
  return {
    kind,
    varName,
    blockName,
    blockType,
    text: `${kind} ${varName} := ${defaultInitializerForVar(varName)}`,
  };
}

function collectSetPrvt(text: string): {
  vars: Set<string>;
  calls: { absIndex: number; vars: string[] }[];
} {
  const vars = new Set<string>();
  const calls: { absIndex: number; vars: string[] }[] = [];

  const re = /\bSetPrvt\s*\(\s*["']([^"']+)["']\s*\)/gi;

  let m: RegExpExecArray | null = null;
  while ((m = re.exec(text))) {
    const inside = m[1] ?? "";
    const list = inside
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => x.replace(/^_+/, ""))
      .filter(Boolean);

    for (const v of list) {
      vars.add(normalizeVarKey(v));
    }
    calls.push({ absIndex: m.index, vars: list });
  }

  return { vars, calls };
}

function countFunctionCalls(text: string, fnName: string): number {
  const name = escapeRegExp(fnName);

  // Foo( ... )  ou  ::Foo( ... )
  const re = new RegExp(`(?:\\b|::)${name}\\s*\\(`, "g");

  let m: RegExpExecArray | null = null;
  let count = 0;

  while ((m = re.exec(text))) {
    count++;
  }

  return count;
}

function maskFunctionDeclLines(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];

  // Mesma regex base do extractBlocksByNextStart
  const reDecl =
    /^\s*\b(User\s*Function|UserFunction|Static\s*Function|StaticFunction|Function|Method|WsMethod)\b\s+[A-Za-z_][A-Za-z0-9_]*\s*(\([^\)]*\))?/i;

  for (const ln of lines) {
    if (reDecl.test(ln)) {
      out.push(ln.replace(/[^\r\n]/g, " "));
    } else {
      out.push(ln);
    }
  }

  return out.join("\n");
}

function maskDeclarationLines(text: string, mode: "global" | "block"): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];

  for (const ln of lines) {
    const t = ln.trim();

    if (mode === "global") {
      if (/^(Static|Private)\b/i.test(t) && !/^Static\s+Function\b/i.test(t)) {
        out.push(ln.replace(/[^\r\n]/g, " "));
        continue;
      }
    }

    if (mode === "block") {
      if (
        /^(Local|Static|Private|Default)\b/i.test(t) &&
        !/^Static\s+Function\b/i.test(t)
      ) {
        out.push(ln.replace(/[^\r\n]/g, " "));
        continue;
      }
    }

    out.push(ln);
  }

  return out.join("\n");
}

function countIdentifierUsage(text: string, name: string): number {
  const key = normalizeVarKey(name);
  if (!key) {
    return 0;
  }

  const re = new RegExp(`\\b${escapeRegExp(key)}\\b`, "gi");

  let m: RegExpExecArray | null = null;
  let count = 0;

  while ((m = re.exec(text))) {
    const idx = m.index;
    const prev2 = idx >= 2 ? text.slice(idx - 2, idx) : "";
    if (prev2 === "->") {
      continue;
    }
    count++;
  }

  return count;
}

function countVariableWrites(body: string, varName: string): number {
  const key = normalizeVarKey(varName);
  if (!key) {
    return 0;
  }

  // captura "var := ..." etc (var no LHS)
  const re = new RegExp(
    `\\b${escapeRegExp(key)}\\b\\s*(\\+=|-=|\\*=|\\/=|:=)`,
    "gi"
  );

  let m: RegExpExecArray | null = null;
  let writes = 0;

  while ((m = re.exec(body))) {
    const idx = m.index;
    const prev2 = idx >= 2 ? body.slice(idx - 2, idx) : "";
    if (prev2 === "->") {
      continue;
    } // ignora ALIAS->CAMPO
    writes++;
  }

  return writes;
}

function countVariableReads(body: string, varName: string): number {
  const key = normalizeVarKey(varName);
  if (!key) {
    return 0;
  }

  // encontra todas ocorrências do identificador
  const re = new RegExp(`\\b${escapeRegExp(key)}\\b`, "gi");

  let m: RegExpExecArray | null = null;
  let reads = 0;

  while ((m = re.exec(body))) {
    const idx = m.index;

    // ignora acesso a campo: ALIAS->CAMPO
    const prev2 = idx >= 2 ? body.slice(idx - 2, idx) : "";
    if (prev2 === "->") {
      continue;
    }

    // ignora quando é LHS de atribuição (escrita)
    const after = body.slice(idx + m[0].length);
    if (/^\s*(\+=|-=|\*=|\/=|:=)/.test(after)) {
      continue;
    }

    reads++;
  }

  return reads;
}

function hasTcQueryUsage(text: string): boolean {
  return /\bTCQUERY\b/i.test(text);
}

function isLikelySqlString(rhs: string): boolean {
  const t = (rhs ?? "").trim();
  if (!t) {
    return false;
  }

  const lower = t.toLowerCase();

  const sqlKeywords = [
    "select ",
    "update ",
    "insert ",
    "delete ",
    " from ",
    " where ",
    " join ",
    " group by",
    " order by",
    " union ",
  ];

  return sqlKeywords.some((k) => lower.includes(k));
}

function collectSqlStringVarsFromAssignments(
  assignments: Assignment[],
  bodyStartIndex: number
): SqlVarFinding[] {
  const map = new Map<string, SqlVarFinding>();

  for (const a of assignments) {
    if (a.op !== ":=" && a.op !== "+=") {
      continue;
    }

    const first = getFirstSignificantChar(a.varName).toLowerCase();
    if (first !== "c") {
      continue;
    }

    if (!isLikelySqlString(a.rhsRaw)) {
      continue;
    }

    if (!map.has(a.varKey)) {
      map.set(a.varKey, {
        varName: a.varName,
        varKey: a.varKey,
        absIndex: bodyStartIndex + a.indexInBody,
      });
    }
  }

  return Array.from(map.values());
}

function blockUsesSqlOpenByString(
  body: string,
  vars: SqlVarFinding[]
): boolean {
  if (!vars || vars.length === 0) {
    return false;
  }

  const fns = ["DbUseArea", "TCGenQry", "TCSqlExec", "MsExecSql"];

  for (const fn of fns) {
    const re = new RegExp(`\\b${fn}\\s*\\(([^\\)]*)\\)`, "gi");
    let m: RegExpExecArray | null = null;

    while ((m = re.exec(body))) {
      const args = m[1] ?? "";
      for (const v of vars) {
        const vr = new RegExp(`\\b${escapeRegExp(v.varKey)}\\b`, "i");
        if (vr.test(args)) {
          return true;
        }
      }
    }
  }

  return false;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildLineIndex(text: string): LineIndex {
  const idx: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") {
      idx.push(i + 1);
    }
  }
  return idx;
}

function indexToLineCol(
  lineIndex: LineIndex,
  absIndex: number
): {
  line: number;
  column: number;
} {
  let lo = 0;
  let hi = lineIndex.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const start = lineIndex[mid];
    const next = mid + 1 < lineIndex.length ? lineIndex[mid + 1] : Infinity;

    if (absIndex >= start && absIndex < next) {
      return { line: mid + 1, column: absIndex - start + 1 };
    }
    if (absIndex < start) {
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }

  return { line: 1, column: 1 };
}
