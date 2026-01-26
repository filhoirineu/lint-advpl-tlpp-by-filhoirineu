# Changelog

All notable changes to this project will be documented in this file.

This project follows the Keep a Changelog format and aims to use Semantic Versioning.

## [2.0.0] - 26 de janeiro de 2026

Major release: reorganização de comandos, correções e melhorias de usabilidade.

### Added

- `lint-advpl.arrumar` — novo utilitário para normalizar espaçamento de `:=` e `AS`.
- Comandos para gerenciar `lint-advpl.ignoredFiles` (adicionar/remover/mostrar) e correção para que a análise respeite os padrões.

### Changed

- Removido o comando `alignVariables` e atualizadas referências/documentação para usar `arrumar`.
- Quick-fix de cabeçalho de documentação agora preserva quebras de linha corretamente.

## [0.0.12] - 21 de janeiro de 2026

Release: Novas regras de validação de campos, snippets configuráveis, melhorias em conversores e expansão documentar completa.

### Added

#### Novas Regras de Análise

- **advpl/require-field-reference:** Detecta campos de tabela não qualificados ou qualificados com referência em minúsculas.
  - Identifica patterns como `sa1->a1_cod` (minúsculo) ou campos soltos como `A1_COD` sem qualificador.
  - Sugere uppercase automática (ex.: `SA1->A1_COD`).
  - Quick-fix fornecido: "Uppercase field reference".
  - Ignora campos sem `_` no nome e parenthesizados (variáveis de alias).

- **advpl/require-field-table:** Valida correlação entre prefixo de campo e código de tabela.
  - Regra de prefixo: Se tabela começa com `S`, campo deve começar com primeira letra (`A` para `SA1`). Caso contrário, prefixo = nome da tabela (`DA1->DA1_...`).
  - Ignora tabelas parenthesizadas (dinâmicas).
  - Sugestões claras de alinhamento de prefixo.

#### Novos Comandos e Utilities

- **Uppercase Tabela→Campo** — `lint-advpl.uppercaseTableFields`:
  - Converte todas as referências `tabela->campo` para MAIÚSCULAS na seleção ou arquivo inteiro.
  - Preserva variáveis entre parênteses.
  - Ignora strings e comentários.

- **Editar template de cabeçalho** — `lint-advpl.editDocHeaderTemplate`:
  - Abre editor interativo para customizar template de documentação Protheus.doc.
  - Suporta placeholders: `${FUNC_NAME}`, `${DESCRIPTION}`, `${AUTHOR}`, `${DATE}`, `${YEAR}`.

- **Salvar template de cabeçalho** — `lint-advpl.saveDocHeaderTemplate`:
  - Salva template editado nas settings globais/workspace.

#### Novas Configurações

- `lint-advpl.docHeaderTemplate` — Template customizável com placeholders para quick-fix de cabeçalho:
  - Default: `//--------------------------------------------------\n/*/{Protheus.doc} ${FUNC_NAME}\n${DESCRIPTION}\n\n@author ${AUTHOR}\n@since ${DATE}\n*/\n//--------------------------------------------------\n`
  - Suporta quebras de linha e indentação.

- `lint-advpl.defaultAuthor` — Autor padrão preenchido em snippets (default: `""`).

- `lint-advpl.databaseCompany` — Sufixo de empresa para injetar em `RetSQLName("XXX")` → `XXX{company}` (default: `"010"`).

- `lint-advpl.enableConvertBeginSQL` — Toggle para conversor BeginSQL → AdvPL (default: `true`).

- `lint-advpl.enableConvertSelection` — Toggle para conversor SQL → AdvPL por seleção (default: `true`).

#### Quick-fixes Expandidos

- **advpl/require-field-reference:** Quick-fix "Uppercase field reference" substitui campo automaticamente.
- **advpl/require-doc-header:** Melhorado com snippet configurável usando SnippetString — insere template com placeholders e tabstops para edição interativa.
- **advpl/require-with-nolock:** Mantido e otimizado (já existia).

#### Documentação Expandida

- **README.md:** Reescrito completamente para v0.0.12:
  - Índice completo com 13 seções.
  - Documentação detalhada de todas as 11 regras com exemplos.
  - Seção dedicada a conversores SQL ↔ AdvPL (BeginSQL, seleção, reverso).
  - Seção expandida de comandos (análise, conversores, utilities).
  - Ferramentas/utilities documentadas (ordenar variáveis, uppercase campos, snippets).
  - Tabela completa de configurações com 15+ opções.
  - Exemplos de `settings.json` básico e avançado.
  - Estrutura do projeto e setup local.
  - Histórico de versões detalhado.

### Changed

#### Melhorias em Regras Existentes

- `advpl/require-local`: Agora detecta variáveis em `Aadd(...)` cuja primeira argumento não está declarada.
  - Ignora assignment de propriedades indexadas (ex.: `oBrowse:aColumns[1]:cTitle := ...`).
  - Maior cobertura de padrões de inicialização dinâmica.

- `advpl/require-doc-header`: Suporta placeholder `${FUNC_NAME}` para validação automática de correspondência.
  - Quick-fix agora insere snippet com placeholders interativos.
  - Melhor integração com VS Code SnippetString.

#### Melhorias nos Conversores

- **BeginSQL → AdvPL:**
  - Reconhece alias e gera chamadas `u_zParOpenQuery()` automaticamente.
  - Uppercase palavras-chave SQL e nomes de tabela/alias.
  - Trata tokens especiais com maior robustez.

- **SQL → AdvPL:**
  - Preserva espaciamento ao redor de operadores.
  - Uppercases keywords e nomes.
  - Suporta tokens expandidos.

- **AdvPL → SQL:**
  - Injeta sufixo de empresa via `databaseCompany`.
  - Reverter placeholders com maior precisão.

#### Melhorias Gerais

- **Menu de contexto:** Adicionados comandos de conversão e utilities sob "Converters" e "Refactoring".
- **Performance:** Analyzer roda com debounce automático (250ms) ao editar.
- **Compatibilidade:** Verifica todas as extensões `.prw`, `.prx`, `.tlpp` automaticamente.

### Fixed

- Corrigida detecção de variáveis em `Aadd()` com múltiplos argumentos.
- Melhorada validação de prefixo de campo para S-tables vs outras tabelas.
- Reduzidos falsos-positivos em require-field-reference ignorando campos sem `_`.

### Notes

- Versão package.json atualizada para `0.0.12`.
- Todas as 11 regras agora ativas e bem documentadas.
- Recomendação: Execute `npm run compile` antes de usar a extensão localmente.
- Para publicação no Marketplace: `npx vsce publish --pat <token>`.

## [1.0.0] - 23 de janeiro de 2026

Major release: stability improvements, new utilities and configuration to manage ignored files.

### Added

- `lint-advpl.ignoredFiles` setting to exclude files/path-suffixes/simple-globs from analysis.
- Commands: `lint-advpl.addIgnoredFile`, `lint-advpl.removeIgnoredFile`, `lint-advpl.showIgnoredFiles` (available in editor and explorer context menus).
- Editor utilities: `lint-advpl.sortVariables`, `lint-advpl.arrumar` to sort and normalize variable declarations within selection.

### Changed

- Analyzer matching for `ignoredFiles` now normalizes path separators and supports basename/suffix/glob matching (avoids accidental full-repo ignores).
- `advpl/require-local` improved to detect `++`/`--` increments and respect file-level `Static`/`Private` declarations.
- Several rules now ignore variables matching `MV_PAR\d{2}`.

### Fixed

- Multiple false-positive sources related to ignored-files matching and require-local scoping.
- JSON/packaging issues fixed and TypeScript compilation validated.

---

## [0.0.11] - 20 de janeiro de 2026

Release: bidirectional SQL <-> ADVPL/TL++ converters, behaviour fixes and UX improvements.

### Added

- Commands to convert between SQL and ADVPL/TL++:
  - `BeginSQL → ADVPL/TL++`: in-place conversion of `BeginSQL...EndSQL` blocks to concatenated AdvPL/TL++ `cQuery` strings with token support.
  - `SQL → ADVPL/TL++`: converts selected SQL into a concatenated AdvPL/TL++ `cQuery` preserving blank lines and normalizing `NOLOCK` to `WITH(NOLOCK)`.
  - `ADVPL/TL++ → SQL`: converts concatenated AdvPL/TL++ `cQuery` back to readable SQL and copies the result to the clipboard (does not edit the file when selection looks like `cQuery`).

- A `lint-advpl.databaseCompany` setting (default `010`) to control the company suffix appended when mapping `Ret...Name('XXX')` → `XXX{company}` during ADVPL→SQL conversion.

### Changed

- Converter behaviour and robustness improvements:
  - Drop parser tokens such as `%noparser%`, `%xFilial:NAME%`, `%Exp:VAR%` and `%notdel%` during conversion where appropriate.
  - Accept multiple variants of the RetName helper (`RetSqlName`, `RetSlqName`, `RetSQLName`, etc.) when mapping table names.
  - Preserve alias and `WITH(NOLOCK)` tokens that follow `Ret*Name(...)` tokens for both `FROM` and `JOIN` clauses.
  - Improved literal merging and whitespace preservation (blank lines are preserved where possible).

### Fixed

- Post-processing fixes to avoid accidental quote duplication around variable placeholders and to preserve empty-string literals `''`.
- Unwrap nested or escaped stringified `cQuery` selections when converting ADVPL→SQL.
- Ensure ADVPL→SQL command copies to clipboard instead of editing the file when the selection is a concatenated `cQuery`.

---

## [0.0.8] - 2026-01-20

Bugfix release: relaxed doc-header and Hungarian notation heuristics to reduce false positives.

### Changed

- `advpl/require-doc-header`: expanded context window from 12 to 30 lines to allow longer documentation blocks with multiple `Exp*` parameter descriptions.
- `advpl/hungarian-notation`: skip validation when initializer is an array access (e.g., `nVar := aArray[idx]`, `nVar := aArray[idx][1]`).

## [0.0.7] - 2026-01-19

Feature release: BeginSQL converter, NOLOCK handling, CRLF suggestions, and configurable database target.

### Added

- New command `lint-advpl.convertBeginSQL`: converts `BeginSQL...EndSQL` blocks to concatenated AdvPL query strings with token support (`%table%`, `%xFilial%`, `%notdel%`, `%Exp%`).
- New rule `advpl/require-with-nolock`: detects `(NOLOCK)` without a preceding `WITH` and suggests `WITH(NOLOCK)` for SQL Server (configurable via `lint-advpl.database`).
- New rule `advpl/use-crlf`: suggests using `CRLF` variable instead of `CHR(13) + CHR(10)` concatenation.
- New configuration `lint-advpl.database` (default: `sqlserver`) to gate SQL Server-specific diagnostics and quick fixes.
- CodeActionProvider for quick fixes on `advpl/require-with-nolock` (restricted to `database == sqlserver`).

### Changed

- BeginSQL converter: improved literal merging, skip blank lines, auto-insert `(NOLOCK)` after alias in `FROM`/`JOIN` when using `%table:NAME%`, and add trailing space to literals ending in alphanumeric.
- Localized diagnostic messages for new rules to Portuguese.

## [0.0.6] - 2026-01-19

Release preparing the extension package and polishing docs and rules.

### Added

- New rule `advpl/require-doc-header` to require `{Protheus.doc}` headers for functions/WS/WSMETHODs (configurable).
- New rule `advpl/include-replace` to suggest replacing `protheus.ch` with `totvs.ch` in includes.

### Changed

- Project defaults and packaging preparation: bumped version to `0.0.6` and updated README for Marketplace readiness.
- Added master switch `lint-advpl.enableRules` and per-rule toggles in `lint-advpl.rules` to allow fine-grained control.

### Fixed

- Further reduced false positives for `advpl/no-unused-local` and `advpl/hungarian-notation` with initializer and WSMETHOD heuristics.
- Skipped doc-header checks for `WSMETHOD` inside `WSRESTFUL` blocks when configured.

## [0.0.5] - 2026-01-17

Small release with heuristics improvements, new initializer suggestions and better WSMETHOD handling.

### Added

- Config `lint-advpl.hungarianSuggestInitializers` (default: true) to enable/disable prefix-based initializer suggestions.
- Initializer suggestions for common Hungarian prefixes (`a`,`c`,`s`,`n`,`l`,`o`,`j`,`u`,`x`,`b`) when a variable is declared without initializer.

### Changed

- `WSMETHOD`/`WSRESTFUL` parsing improved so method names are correctly extracted (e.g. `reImprime` instead of `GET`).
- `advpl/suggest-default-for-params` now skips suggestions inside `WSMETHOD`/`WSREST` implementations to reduce false positives on endpoints.
- `Local <name> As <Type>` parsing fixed so type names (ex.: `Array`) are not treated as identifiers by rules.
- Diagnostic messages normalized to single-line format for better Problems panel rendering.

### Fixed

- Reduced multiple false positives on declaration lines (now a single, focused initializer suggestion when appropriate).

## [0.0.4] - 2026-01-16

### Added

- New rule `advpl/require-explicit-private`: detects uses of `SetPrvt("A,B,C")` and suggests explicit `Private` declarations with heuristic initializers; suggestions are grouped per `SetPrvt` call.
- New configuration `lint-advpl.ignoredNames` to allow per-project exceptions for `no-unused-local`.

### Changed

- `advpl/no-unused-local`: when a variable is declared as `Private`, search the whole document (masking the declaration line) so usages in other functions are recognized; default project exceptions include `aRotina`, `cCadastro`.
- `advpl/hungarian-notation`: added minimal-length validation and refined heuristics for initializers.
- README updated and simplified for Marketplace readiness.

### Fixed

- Grouped SetPrvt suggestions into a single diagnostic per call (was one per variable).
- Reduced false-positives for unused-local and adjusted positional diagnostics.

## [0.0.2] - 2026-01-16

### Added

- Sidebar implemented as a `TreeDataProvider` with grouping by rule and quick actions (open file at line, export TXT).
- Language contribution for ADVPL with extensions `.prw`, `.prx`, `.tlpp` and `language-configuration.json`.
- Commands to open issues in editor and export sidebar items to TXT for offline review.

### Changed

- `advpl/hungarian-notation`: relaxed heuristics — skip name checks when a declaration is initialized from another identifier or from a function call; improved handling for prefix `b` (accepts `Nil` or code-block initializers like `{|| ... }`).
- `advpl/no-unused-local`: improved masking to only mask the declaration line and fixed line/column calculation so diagnostics point to the declared identifier position.
- Diagnostics publication is configurable via `lint-advpl.showInProblems` and `lint-advpl.editorUnderline` (control Problems panel and editor squiggles).
- README rewritten and reorganized with clearer usage, configuration and Marketplace-ready content.
- Icons updated (activity bar/sidebar SVG and marketplace PNG). See `media/` for assets.

### Fixed

- Fixed off-by-one / incorrect column for `no-unused-local` diagnostic positions.
- Reduced false-positives for unused-local when usage occurs inside initializer strings; declaration-line masking applied.

### Notes

- `package.json` now includes an `icon` pointing to `media/market-icon.png` (used by packaged VSIX / Marketplace). If the installed VSIX does not show the icon, uninstall the previous extension and reinstall the new package, or publish to the Marketplace to have it displayed online.
- Recommended: replace the current `LICENSE` stub with the full GPL-3.0 text before publishing.

---

For guidance on writing changelog entries see: http://keepachangelog.com/

Bugfix release: relaxed doc-header and Hungarian notation heuristics to reduce false positives.

### Changed

- `advpl/require-doc-header`: expanded context window from 12 to 30 lines to allow longer documentation blocks with multiple `Exp*` parameter descriptions.
- `advpl/hungarian-notation`: skip validation when initializer is an array access (e.g., `nVar := aArray[idx]`, `nVar := aArray[idx][1]`).

## [0.0.7] - 2026-01-19

Feature release: BeginSQL converter, NOLOCK handling, CRLF suggestions, and configurable database target.

### Added

- New command `lint-advpl.convertBeginSQL`: converts `BeginSQL...EndSQL` blocks to concatenated AdvPL query strings with token support (`%table%`, `%xFilial%`, `%notdel%`, `%Exp%`).
- New rule `advpl/require-with-nolock`: detects `(NOLOCK)` without a preceding `WITH` and suggests `WITH(NOLOCK)` for SQL Server (configurable via `lint-advpl.database`).
- New rule `advpl/use-crlf`: suggests using `CRLF` variable instead of `CHR(13) + CHR(10)` concatenation.
- New configuration `lint-advpl.database` (default: `sqlserver`) to gate SQL Server-specific diagnostics and quick fixes.
- CodeActionProvider for quick fixes on `advpl/require-with-nolock` (restricted to `database == sqlserver`).

### Changed

- BeginSQL converter: improved literal merging, skip blank lines, auto-insert `(NOLOCK)` after alias in `FROM`/`JOIN` when using `%table:NAME%`, and add trailing space to literals ending in alphanumeric.
- Localized diagnostic messages for new rules to Portuguese.

## [0.0.6] - 2026-01-19

Release preparing the extension package and polishing docs and rules.

### Added

- New rule `advpl/require-doc-header` to require `{Protheus.doc}` headers for functions/WS/WSMETHODs (configurable).
- New rule `advpl/include-replace` to suggest replacing `protheus.ch` with `totvs.ch` in includes.

### Changed

- Project defaults and packaging preparation: bumped version to `0.0.6` and updated README for Marketplace readiness.
- Added master switch `lint-advpl.enableRules` and per-rule toggles in `lint-advpl.rules` to allow fine-grained control.

### Fixed

- Further reduced false positives for `advpl/no-unused-local` and `advpl/hungarian-notation` with initializer and WSMETHOD heuristics.
- Skipped doc-header checks for `WSMETHOD` inside `WSRESTFUL` blocks when configured.

## [0.0.5] - 2026-01-17

Small release with heuristics improvements, new initializer suggestions and better WSMETHOD handling.

### Added

- Config `lint-advpl.hungarianSuggestInitializers` (default: true) to enable/disable prefix-based initializer suggestions.
- Initializer suggestions for common Hungarian prefixes (`a`,`c`,`s`,`n`,`l`,`o`,`j`,`u`,`x`,`b`) when a variable is declared without initializer.

### Changed

- `WSMETHOD`/`WSRESTFUL` parsing improved so method names are correctly extracted (e.g. `reImprime` instead of `GET`).
- `advpl/suggest-default-for-params` now skips suggestions inside `WSMETHOD`/`WSREST` implementations to reduce false positives on endpoints.
- `Local <name> As <Type>` parsing fixed so type names (ex.: `Array`) are not treated as identifiers by rules.
- Diagnostic messages normalized to single-line format for better Problems panel rendering.

### Fixed

- Reduced multiple false positives on declaration lines (now a single, focused initializer suggestion when appropriate).

## [Unreleased]

Work in progress: further tuning and documentation updates.

## [0.0.11] - 2026-01-21

Release: bidirectional SQL <-> ADVPL/TL++ converters, behaviour fixes and UX improvements.

### Added

- Commands to convert between SQL and ADVPL/TL++:
  - `BeginSQL → ADVPL/TL++`: in-place conversion of `BeginSQL...EndSQL` blocks to concatenated AdvPL/TL++ `cQuery` strings with token support.
  - `SQL → ADVPL/TL++`: converts selected SQL into a concatenated AdvPL/TL++ `cQuery` preserving blank lines and normalizing `NOLOCK` to `WITH(NOLOCK)`.
  - `ADVPL/TL++ → SQL`: converts concatenated AdvPL/TL++ `cQuery` back to readable SQL and copies the result to the clipboard (does not edit the file when selection looks like `cQuery`).

- A `lint-advpl.databaseCompany` setting (default `010`) to control the company suffix appended when mapping `Ret...Name('XXX')` → `XXX{company}` during ADVPL→SQL conversion.

### Changed

- Converter behaviour and robustness improvements:
  - Drop parser tokens such as `%noparser%`, `%xFilial:NAME%`, `%Exp:VAR%` and `%notdel%` during conversion where appropriate.
  - Accept multiple variants of the RetName helper (`RetSqlName`, `RetSlqName`, `RetSQLName`, etc.) when mapping table names.
  - Preserve alias and `WITH(NOLOCK)` tokens that follow `Ret*Name(...)` tokens for both `FROM` and `JOIN` clauses.
  - Improved literal merging and whitespace preservation (blank lines are preserved where possible).

### Fixed

- Post-processing fixes to avoid accidental quote duplication around variable placeholders and to preserve empty-string literals `''`.
- Unwrap nested or escaped stringified `cQuery` selections when converting ADVPL→SQL.
- Ensure ADVPL→SQL command copies to clipboard instead of editing the file when the selection is a concatenated `cQuery`.

## [0.0.7] - 2026-01-19

Pequena release de correções e refinamento da regra de cabeçalho `{Protheus.doc}`.

### Added

- Ajustes de heurística na validação de cabeçalhos: métodos implementados com a sintaxe `Method <name>(...) Class <ClassName>` agora exigem cabeçalho explícito `{Protheus.doc} <MethodName>`.

### Changed

- Não aceitar mais o nome da `Class` como substituto do cabeçalho do construtor; somente `{Protheus.doc} New` é aceito para `Method New()`.
- Métodos declarados dentro de um bloco `Class ... End Class` (assinaturas públicas/privadas) são ignorados pela checagem de cabeçalho — apenas implementações (`Method ... Class ...`) são validadas.
- Melhorias na detecção de ranges `Class ... End Class` e `WSRESTFUL ... END WSRESTFUL` para reduzir falsos-positivos.

### Fixed

- Corrigidos casos em que um único cabeçalho de classe poderia satisfazer múltiplos métodos indevidamente.
- Removidos logs de depuração deixados durante desenvolvimento.

## [0.0.2] - 2026-01-16

### Added

- Sidebar implemented as a `TreeDataProvider` with grouping by rule and quick actions (open file at line, export TXT).
- Language contribution for ADVPL with extensions `.prw`, `.prx`, `.tlpp` and `language-configuration.json`.
- Commands to open issues in editor and export sidebar items to TXT for offline review.

### Changed

- `advpl/hungarian-notation`: relaxed heuristics — skip name checks when a declaration is initialized from another identifier or from a function call; improved handling for prefix `b` (accepts `Nil` or code-block initializers like `{|| ... }`).
- `advpl/no-unused-local`: improved masking to only mask the declaration line and fixed line/column calculation so diagnostics point to the declared identifier position.
- Diagnostics publication is configurable via `lint-advpl.showInProblems` and `lint-advpl.editorUnderline` (control Problems panel and editor squiggles).
- README rewritten and reorganized with clearer usage, configuration and Marketplace-ready content.
- Icons updated (activity bar/sidebar SVG and marketplace PNG). See `media/` for assets.

### Fixed

- Fixed off-by-one / incorrect column for `no-unused-local` diagnostic positions.
- Reduced false-positives for unused-local when usage occurs inside initializer strings; declaration-line masking applied.

### Notes

- `package.json` now includes an `icon` pointing to `media/market-icon.png` (used by packaged VSIX / Marketplace). If the installed VSIX does not show the icon, uninstall the previous extension and reinstall the new package, or publish to the Marketplace to have it displayed online.
- Recommended: replace the current `LICENSE` stub with the full GPL-3.0 text before publishing.

---

For guidance on writing changelog entries see: http://keepachangelog.com/

## [0.0.4] - 2026-01-16

### Added

- New rule `advpl/require-explicit-private`: detects uses of `SetPrvt("A,B,C")` and suggests explicit `Private` declarations with heuristic initializers; suggestions are grouped per `SetPrvt` call.
- New configuration `lint-advpl.ignoredNames` to allow per-project exceptions for `no-unused-local`.

### Changed

- `advpl/no-unused-local`: when a variable is declared as `Private`, search the whole document (masking the declaration line) so usages in other functions are recognized; default project exceptions include `aRotina`, `cCadastro`.
- `advpl/hungarian-notation`: added minimal-length validation and refined heuristics for initializers.
- README updated and simplified for Marketplace readiness.

### Fixed

- Grouped SetPrvt suggestions into a single diagnostic per call (was one per variable).
- Reduced false-positives for unused-local and adjusted positional diagnostics.
