# 📋 Manifesto de Publicação — LINT ADVPL/TL++ v0.0.12

## 🏷️ Metadados da Extensão

| Chave                  | Valor                                                         |
| ---------------------- | ------------------------------------------------------------- |
| **Nome**               | LINT ADVPL/TL++                                               |
| **Versão**             | 0.0.12                                                        |
| **Publisher**          | filhoirineu                                                   |
| **ID Completo**        | `filhoirineu.lint-advpl-tlpp`                                 |
| **Data de Lançamento** | 21 de janeiro de 2026                                         |
| **Licença**            | GPL-3.0                                                       |
| **Repositório**        | https://github.com/filhoirineu/lint-advpl-tlpp-by-filhoirineu |
| **Requisitos**         | VS Code ≥ 1.79.0                                              |
| **Categorias**         | Linters, Programming Languages                                |
| **Tags**               | advpl, tlpp, totvs, análise-estática, lint                    |

---

## 📦 Arquivo VSIX

**Nome:** `lint-advpl-tlpp-0.0.12.vsix`
**Tamanho:** 4.48 MB
**Local:** `c:\Users\IFILHOSTUDIES\@estudos\extensao_vscode\lint-advpl-tlpp\lint-advpl-tlpp-by-filhoirineu\`
**Arquivos:** 1142
**Status:** ✓ Pronto para publicação

---

## 📚 Documentação

### README.md

- **Tamanho:** 30.57 KB
- **Versão:** 0.0.12
- **Seções:** 13 (índice, visão geral, regras, conversores, comandos, ferramentas, configurações, setup, requisitos, desenvolvimento, histórico, contribuições, suporte)
- **Conteúdo:**
  - 11 regras documentadas com heurísticas e exemplos
  - 3 conversores SQL ↔ AdvPL explicados
  - 8+ comandos listados
  - 15+ configurações mapeadas
  - Exemplos de settings.json
  - Setup local com npm
  - Publicação e desenvolvimento

### CHANGELOG.md

- **Tamanho:** 21.76 KB
- **Versão mais recente:** 0.0.12
- **Entradas:** 7 versões documentadas (0.0.2 → 0.0.12)
- **Formato:** Keep a Changelog
- **Seção v0.0.12 inclui:**
  - Added: 2 regras novas, 2 comandos, 5 configurações, quick-fixes
  - Changed: 3 regras melhoradas, conversores otimizados
  - Fixed: Correções específicas
  - Notes: Observações de implementação

### RELEASE_INSTRUCTIONS.md

- **Tamanho:** 6.2 KB
- **Conteúdo:**
  - Instalação manual (2 métodos)
  - Publicação no Marketplace (3 métodos)
  - Pré-requisitos e setup
  - Passo-a-passo registro publisher
  - Geração de PAT do Azure DevOps
  - Verificação após publicação
  - Checklist de publicação

### SUMMARY.md

- **Tamanho:** 10.8 KB
- **Conteúdo:**
  - Sumário executivo do trabalho realizado
  - Auditoria completa do projeto
  - Resumo de features v0.0.12
  - Próximos passos
  - Estatísticas de mudanças
  - Validação de status

---

## 🔧 Configurações (package.json)

### Comandos Registrados (11 total)

```json
"commands": [
  {
    "command": "lint-advpl.analyze",
    "title": "LINT ADVPL/TL++: Analisar arquivo"
  },
  {
    "command": "lint-advpl.exportTxt",
    "title": "LINT ADVPL/TL++: Exportar relatório (TXT)"
  },
  {
    "command": "lint-advpl.openView",
    "title": "LINT ADVPL/TL++: Abrir painel LINT"
  },
  {
    "command": "lint-advpl.openConverterSettings",
    "title": "LINT ADVPL/TL++: Configurar conversores"
  },
  {
    "command": "lint-advpl.convertBeginSQL",
    "title": "LINT ADVPL/TL++: BeginSQL → ADVPL/TL++"
  },
  {
    "command": "lint-advpl.convertSelectionToQuery",
    "title": "LINT ADVPL/TL++: SQL → ADVPL/TL++"
  },
  {
    "command": "lint-advpl.convertAdvplToSql",
    "title": "LINT ADVPL/TL++: ADVPL/TL++ → SQL"
  },
  {
    "command": "lint-advpl.sortVariables",
    "title": "LINT ADVPL/TL++: Ordenar Variáveis"
  },
  {
    "command": "lint-advpl.uppercaseTableFields",
    "title": "LINT ADVPL/TL++: Uppercase Tabela→Campo"
  },
  {
    "command": "lint-advpl.editDocHeaderTemplate",
    "title": "LINT ADVPL/TL++: Editar template de cabeçalho"
  },
  {
    "command": "lint-advpl.saveDocHeaderTemplate",
    "title": "LINT ADVPL/TL++: Salvar template de cabeçalho"
  }
]
```

### Propriedades de Configuração (15+ total)

```json
"configuration": {
  "title": "LINT ADVPL/TL++",
  "properties": {
    "lint-advpl.showInProblems": { "type": "boolean", "default": true },
    "lint-advpl.editorUnderline": { "type": "boolean", "default": false },
    "lint-advpl.ignoredNames": { "type": "array", "default": [...] },
    "lint-advpl.enableRules": { "type": "boolean", "default": true },
    "lint-advpl.rules": { "type": "object", ... },
    "lint-advpl.hungarianSuggestInitializers": { "type": "boolean", "default": true },
    "lint-advpl.hungarianIgnoreAsType": { "type": "boolean", "default": true },
    "lint-advpl.database": { "type": "string", "default": "sqlserver", "enum": [...] },
    "lint-advpl.requireDocHeaderRequireName": { "type": "boolean", "default": true },
    "lint-advpl.requireDocHeaderIgnoreWsMethodInWsRestful": { "type": "boolean", "default": true },
    "lint-advpl.databaseCompany": { "type": "string", "default": "010" },
    "lint-advpl.enableConvertBeginSQL": { "type": "boolean", "default": true },
    "lint-advpl.enableConvertSelection": { "type": "boolean", "default": true },
    "lint-advpl.docHeaderTemplate": { "type": "string", "default": "//--------------------------------------------------\\n..." },
    "lint-advpl.defaultAuthor": { "type": "string", "default": "" }
  }
}
```

### Contribuições

- **Ativação:** `onLanguage:advpl` (ao abrir arquivo `.prw`, `.prx`, `.tlpp`)
- **Painel lateral:** TreeView "lint-advpl-sidebar"
- **Menu de contexto:** Editor context menu para conversores
- **CodeActions:** Quick-fixes para diagnósticos

---

## 🎯 Regras de Análise (11 total)

### Implementadas e Ativas

1. **advpl/no-unused-local** — Declarações não utilizadas
2. **advpl/require-local** — Força declaração Local
3. **advpl/hungarian-notation** — Valida notação húngara
4. **advpl/suggest-default-for-params** — Sugere Default em parâmetros
5. **advpl/require-explicit-private** — Valida Private explícito
6. **advpl/require-doc-header** — Cabeçalho Protheus.doc (com quick-fix snippet)
7. **advpl/include-replace** — Sugere totvs.ch
8. **advpl/require-with-nolock** — WITH(NOLOCK) para SQL Server (com quick-fix)
9. **advpl/use-crlf** — Sugere CRLF variable
10. **advpl/require-field-reference** — Campos sem qualificador/minúsculos (NOVO, com quick-fix)
11. **advpl/require-field-table** — Prefixo de campo valida (NOVO)

---

## 💡 Quick-fixes / CodeActions

| Regra                         | Ação                               | Tipo     |
| ----------------------------- | ---------------------------------- | -------- |
| advpl/require-with-nolock     | Replace (NOLOCK) with WITH(NOLOCK) | Auto-fix |
| advpl/require-doc-header      | Inserir cabeçalho de documentação  | Snippet  |
| advpl/require-field-reference | Uppercase field reference          | Auto-fix |

---

## 🔄 Conversores

### 1. BeginSQL → AdvPL/TL++

- **Comando:** `lint-advpl.convertBeginSQL`
- **Entrada:** Bloco `BeginSQL...EndSQL`
- **Saída:** `cQuery := "..."` concatenado
- **Tipo:** In-place (edita o arquivo)
- **Tokens suportados:** `%table:`, `%xFilial:`, `%notdel%`, `%Exp:`

### 2. SQL → AdvPL/TL++

- **Comando:** `lint-advpl.convertSelectionToQuery`
- **Entrada:** Seleção SQL
- **Saída:** `cQuery := "..."` concatenado
- **Tipo:** In-place (edita o arquivo)
- **Tokens suportados:** `%table:`, `%xFilial:`, `%notdel%`, `%Exp:`

### 3. AdvPL/TL++ → SQL

- **Comando:** `lint-advpl.convertAdvplToSql`
- **Entrada:** Concatenação `cQuery`
- **Saída:** SQL legível
- **Tipo:** Clipboard (copia resultado)
- **Configurável:** `databaseCompany` (sufixo de empresa)

---

## 📊 Estatísticas de Versão

### v0.0.12 (Atual)

- **Regras:** 11 (2 novas)
- **Comandos:** 11 (5 novos)
- **Configurações:** 17 (7 novas)
- **Quick-fixes:** 3 (1 novo)
- **README:** 30.57 KB (+252%)
- **CHANGELOG:** 21.76 KB (+118%)
- **VSIX:** 4.48 MB

### v0.0.11 (Anterior)

- **Regras:** 9
- **Comandos:** 6
- **Configurações:** 10
- **Quick-fixes:** 2
- **README:** 8.7 KB
- **Changelog:** ~10 KB

---

## 📅 Timeline de Desenvolvimento

| Versão     | Data           | Foco                                                 |
| ---------- | -------------- | ---------------------------------------------------- |
| 0.0.2      | 2026-01-16     | Sidebar, exportação TXT                              |
| 0.0.4      | 2026-01-16     | Private explícito, ignored names                     |
| 0.0.5      | 2026-01-17     | Inicializadores húngaros                             |
| 0.0.6      | 2026-01-19     | Doc-header, include-replace                          |
| 0.0.7      | 2026-01-19     | BeginSQL, NOLOCK, CRLF, database config              |
| 0.0.8      | 2026-01-20     | Relaxamento de heurísticas                           |
| 0.0.11     | 2026-01-20     | Conversores bidirecionais                            |
| **0.0.12** | **2026-01-21** | **2 regras novas, snippets, documentação expandida** |

---

## ✅ Checklist de Publicação

- [x] Versão atualizada em `package.json` (0.0.12)
- [x] README.md reescrito com todas as features
- [x] CHANGELOG.md atualizado com entrada v0.0.12
- [x] TypeScript compilado sem erros
- [x] VSIX gerado (4.48 MB)
- [x] Documentação de publicação criada (RELEASE_INSTRUCTIONS.md)
- [x] Manifesto de publicação criado (este arquivo)
- [x] Sumário executivo criado (SUMMARY.md)
- [ ] Personal Access Token (PAT) gerado (ação do usuário)
- [ ] Publicado via `npx vsce publish --pat <token>` (ação do usuário)
- [ ] Verificado no Marketplace (ação do usuário)

---

## 🔗 Links de Referência

- **Marketplace:** https://marketplace.visualstudio.com
- **Publisher Console:** https://marketplace.visualstudio.com/manage
- **Azure DevOps:** https://dev.azure.com
- **VSCE CLI:** https://github.com/microsoft/vscode-vsce
- **VS Code API:** https://code.visualstudio.com/api
- **Repository:** https://github.com/filhoirineu/lint-advpl-tlpp-by-filhoirineu

---

## 📞 Informações de Contato

- **Desenvolvedor:** [@filhoirineu](https://github.com/filhoirineu)
- **Issues:** https://github.com/filhoirineu/lint-advpl-tlpp-by-filhoirineu/issues
- **Discussions:** https://github.com/filhoirineu/lint-advpl-tlpp-by-filhoirineu/discussions

---

**Documento criado:** 21 de janeiro de 2026
**Versão da extensão:** 0.0.12
**Status:** ✓ Pronto para publicação no VS Code Marketplace
