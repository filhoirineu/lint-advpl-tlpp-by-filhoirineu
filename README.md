# LINT ADVPL/TL++ — Offline Static Analysis for AdvPL/TL++

**Lint ADVPL/TL++** é uma extensão para VS Code que oferece análise estática offline de código-fonte ADVPL/TL++, identificando problemas comuns de escopo, nomenclatura, documentação e boas práticas — **sem necessidade de dependência do ambiente TOTVS**.

**Versão:** 2.0.0

## Release v2.0.0 (26 de janeiro de 2026)

- Major release: reorganização de comandos e melhorias de usabilidade.
- Novo comando `lint-advpl.arrumar` (normaliza espaçamento de `:=` e `AS`).
- Substituído `alignVariables` por `arrumar` e removidas referências antigas.
- Correção: `ignoredFiles` agora é respeitado pela análise e há comandos para adicionar/remover/listar padrões.
- Quick-fix para inserir cabeçalho de documentação (`lint-advpl.insertDocHeaderSnippet`) agora preserva quebras de linha.

## 🆕 What's New (v1.0.0)

- Adicionado suporte a `lint-advpl.ignoredFiles` para excluir arquivos inteiros da análise e comandos para adicionar/remover/listar ignorados via menu do editor/explorador.
- Regras aprimoradas: ignoração de variáveis `MV_PAR00..MV_PAR99`, detecção de operadores `++/--` em `advpl/require-local` e correções de false-positives para declarações `Static`/`Private` em nível de arquivo.
- Novos comandos de refatoração: `lint-advpl.sortVariables` e `lint-advpl.arrumar` (preservam indentação/seletor).
- Melhoria na correspondência de padrões `ignoredFiles` (basename, sufixo de caminho e simples globs) para evitar exclusões acidentais.

## 🎯 Visão Geral

- ✅ **Análise em tempo real** — executa automaticamente ao abrir, editar ou salvar arquivos `.prw`, `.prx`, `.tlpp`.
- ✅ **Painel lateral** com resultados agrupados por regra; visualização clara de issues com contexto (função, linha, severidade).
- ✅ **Configuração flexível** — ative/desative regras individualmente ou em conjunto; customize comportamentos com opções granulares.
- ✅ **Sem dependências externas** — análise estática pura, rápida, offline; funciona sem conectar ao TOTVS.
- ✅ **Exportação de relatórios** — gere TXT com sugestões para compartilhamento e documentação.
- ✅ **Heurísticas avançadas** — reconhece padrões de inicialização, chamadas de função, acesso a propriedades e ignorar WSMETHOD dentro de WSRESTFUL.

## 📋 Regras Implementadas (11 regras implementadas)

### 1. **advpl/no-unused-local** — Detecta declarações não utilizadas

Identifica variáveis declaradas como `Local`, `Private`, `Static` ou `Default` que não são usadas em nenhum lugar do bloco de código.

**Heurísticas aplicadas:**

- Reconhece usos dentro de strings e inicializadores (p. ex.: `cMsg := "var=" + varName`).
- Ignora `Private` declaradas globalmente no arquivo (detecta em toda a fonte).
- Reconhece inicializadores em classe `Data` (atributos públicos/privados em classes).

**Exemplo:**

```advpl
Local lReti := .T.    // ⚠️ Se lReti nunca for usada, será reportada
Local cMsg As Char    // ✅ Se usada em return ou log, passa
```

### 2. **advpl/require-local** — Força declaração de variáveis locais

Detecta quando uma variável recebe um valor (atribuição `:=`, `+=`, `-=`, etc.) sem ser declarada como `Local`, `Private`, ou `Static`.

**Heurísticas:**

- Ignora propriedades de objetos (ex.: `obj:campo := valor`).
- Ignora atributos qualificados com `::` ou `Self:`.
- Respeita declarações `Private` globais no arquivo.

**Exemplo:**

```advpl
oBody := JsonObject():New()  // ⚠️ Sem Local oBody — reporta require-local
Local oBody As Object
oBody := JsonObject():New()  // ✅ Agora está declarado
```

### 3. **advpl/hungarian-notation** — Valida notação húngara de variáveis

Verifica se as variáveis seguem a convenção de notação húngara (prefixo minúsculo + nome CamelCase) e propõe inicializadores apropriados baseados no prefixo.

**Prefixos e inicializadores sugeridos:**

| Prefixo            | Tipo        | Inicializador sugerido |
| ------------------ | ----------- | ---------------------- |
| `a`                | Array       | `:= {}`                |
| `c`, `s`           | Char/String | `:= ""`                |
| `n`                | Numeric     | `:= 0`                 |
| `l`                | Logical     | `:= .F.`               |
| `o`, `j`, `u`, `x` | Object      | `:= Nil`               |
| `b`                | Block/Code  | `:= {\|\| }`           |

**Heurísticas aplicadas:**

- Ignora variáveis inicializadas a partir de outras variáveis (p. ex.: `Local x := y`).
- Ignora chamadas de função/método (p. ex.: `Local x := GetValue()`).
- Aceita inicializadores por concatenação (p. ex.: `cFile := "path_" + cName + ".txt"`).
- **Nova:** Não sugere inicializadores se a declaração já inclui `As <Type>` (p. ex.: `Local nCode As Numeric`).

**Exemplo:**

```advpl
Local aItems         // ⚠️ Prefixo 'a' sem inicializador — sugere `:= {}`
Local aItems := {}   // ✅ Correto
Local nCode As Numeric  // ✅ Tipo explícito, sem sugestão
```

### 4. **advpl/suggest-default-for-params** — Sugere marcação de parâmetros padrão

Propõe adicionar a palavra-chave `Default` para parâmetros que frequentemente recebem valores padrão ou são opcionais.

**Heurísticas:**

- Ignora sugestões dentro de implementações `WSMETHOD` / `WSRESTFUL` (reduz falsos-positivos em endpoints).
- Análisa assinatura da função e padrões de uso.

**Exemplo:**

```advpl
Function MyFunc(cName, cEmail)
  // ⚠️ Se cEmail é frequentemente omitido em chamadas, sugere:
Function MyFunc(cName, cEmail Default "")
```

### 5. **advpl/require-explicit-private** — Sugere declaração explícita de `Private`

Detecta o uso de `SetPrvt()` e propõe substituir por declaração explícita `Private` na cabeçalho da função.

**Exemplo:**

```advpl
// ⚠️ Estilo antigo:
SetPrvt("cMinho")
SetPrvt("aLista")

// ✅ Estilo recomendado:
Private cMinho := ""
Private aLista := {}
```

### 6. **advpl/require-doc-header** — Valida cabeçalho de documentação

Verifica se funções, métodos, WebServices e classes possuem um cabeçalho de documentação Protheus.doc com nome, descrição e metadados.

**Formato esperado:**

```advpl
//--------------------------------------------------
/*/{Protheus.doc} nomeFunction
Descrição breve da função

@author Nome do Autor
@since data ou versão
/*/
//--------------------------------------------------
User Function nomeFunction()
  Return .T.
EndFunction
```

**Heurísticas:**

- **Nova:** Valida se o nome após `{Protheus.doc}` corresponde ao nome real da função/método.
- Ignora `WSMETHOD` declaradas dentro de blocos `WSRESTFUL ... END WSRESTFUL` (não precisam de cabeçalho individual).
- Não reporta o token de fechamento `END WSRESTFUL`.

**Exemplo (padrão):**

```advpl
// ⚠️ Incompleto:
/*/{Protheus.doc} paoDeBatata
/*/
User Function paoDeBatata()  // Detecta descomassador se nome não bate

// ✅ Correto:
/*/{Protheus.doc} paoDeBatata
Função de teste
@author Irineu
@since 19/01/2026
/*/
User Function paoDeBatata()
```

### 7. **advpl/include-replace** — Sugere substituição de includes

Propõe atualizar `#include "protheus.ch"` para `#include "totvs.ch"` (include moderno).

**Exemplo:**

```advpl
// ⚠️ Include legado:
#include "protheus.ch"

// ✅ Include moderno:
#include "totvs.ch"
```

### 8. **advpl/require-with-nolock** — Força padronização de NOLOCK (SQL Server)

Detecta `(NOLOCK)` não precedido por `WITH` e sugere `WITH(NOLOCK)` (válido apenas quando `database = sqlserver`).

**Ativa apenas quando:** `lint-advpl.database == "sqlserver"`

**Exemplo:**

```advpl
// ⚠️ SQL com (NOLOCK) insuficiente:
SELECT * FROM SA1 (NOLOCK)

// ✅ Correto para SQL Server:
SELECT * FROM SA1 WITH(NOLOCK)
```

**Quick-fix disponível:** Substitui automaticamente `(NOLOCK)` por `WITH(NOLOCK)`.

---

### 9. **advpl/use-crlf** — Recomenda uso de variável CRLF

Detecta `CHR(13) + CHR(10)` e sugere usar a variável compartilhada `CRLF` (definida em `TOTVS.CH`).

**Exemplo:**

```advpl
// ⚠️ Repetitivo:
cMsg := "Linha 1" + CHR(13) + CHR(10) + "Linha 2"

// ✅ Melhor:
cMsg := "Linha 1" + CRLF + "Linha 2"
```

---

### 10. **advpl/require-field-reference** — Detecta referências de campo sem qualificador ou em minúsculas

**Nova (v0.0.12):** Detecta:

1. **Campos não qualificados:** `XX_XXXXX` ou `XXX_XXXXX` usados sem `tabela->` ou `objeto->`.
2. **Campos qualificados em minúsculas:** `SA1->a1_cod` ou `(cAlias)->a1_filial` devem ter o campo em MAIÚSCULAS (ex.: `SA1->A1_COD`).

**Heurísticas:**

- Detecta padrão `<tabela>-><campo>` tanto direto quanto parenthesizado.
- Ignora fields sem `_` no nome (reduz falsos-positivos).
- Ignora quando a tabela é uma variável entre parênteses (ex.: `(cAlias)->campo` — só valida o campo).

**Exemplo:**

```advpl
// ⚠️ Não qualificado:
nCod := A1_COD

// ⚠️ Qualificado mas em minúsculas:
cFilial := sa1->a1_filial

// ✅ Correto:
cFilial := SA1->A1_FILIAL
```

**Quick-fix disponível:** Uppercase o campo após `->`.

---

### 11. **advpl/require-field-table** — Valida prefixo de campo com nome de tabela

**Nova (v0.0.12):** Valida que o prefixo do campo corresponde ao código da tabela (apenas para tabelas explícitas):

- Se `TABLE` começa com `S` → `FIELD` deve começar com `TABLE.substr(1)` (ex.: `SA1->A1_COD` ✅, `SA1->B1_COD` ❌).
- Se `TABLE` não começa com `S` → `FIELD` deve começar com `TABLE` (ex.: `DA1->DA1_COD` ✅).
- **Ignora:** Tabelas parenthesizadas (variáveis).

**Exemplo:**

```advpl
// ✅ Correto:
SA1->A1_FILIAL      // S + A1
DA1->DA1_FILIAL     // DA + DA1

// ⚠️ Incorreto:
SA1->B1_FILIAL      // Prefixo B1 não bate com SA1
DA1->A1_FILIAL      // Prefixo A1 não bate com DA1

// ✅ Variáveis (sem validação):
(cAlias)->A1_FILIAL  // Qualquer campo é aceito
```

---

## 🛠️ Conversores SQL ↔ AdvPL/TL++

### 1. **BeginSQL → ADVPL/TL++** — `lint-advpl.convertBeginSQL`

Converte um bloco `BeginSQL...EndSQL` em declaração `cQuery` concatenada com tratamento de tokens especiais.

**Características:**

- ✅ In-place: substitui o bloco original no arquivo.
- ✅ Reconhece alias em `BeginSQL alias <varName>` e gera chamadas `u_zParOpenQuery`.
- ✅ Normaliza `(NOLOCK)` → `WITH(NOLOCK)`.
- ✅ Remove linhas `%noparser%` completamente.
- ✅ Suporta tokens:
  - `%table:NAME%` → `RetSQLName("NAME")` (injeta primeira 3 letras do código).
  - `%xFilial:NAME%` → `xFilial("NAME")` (injeta função de filial).
  - `%notdel%` → `D_E_L_E_T_ = ''`.
  - `%Exp:VAR%` → insere valor de variável entre aspas simples.
- ✅ Preserva espaçamento ao redor de operadores.
- ✅ Uppercases palavras-chave SQL e nomes de tabela/alias.

**Exemplo:**

```advpl
BeginSQL alias oAlias
    SELECT A1_FILIAL, A1_COD, A1_NOME
    FROM %table:SA1% SA1
    WHERE A1_FILIAL = %xFilial:SA1%
    AND %notdel%
EndSQL
```

**Converte para:**

```advpl
cQuery := ""

cQuery += "SELECT A1_FILIAL, A1_COD, A1_NOME " + CRLF
cQuery += "FROM " + RetSQLName("SA1") + " SA1 WITH(NOLOCK) " + CRLF
cQuery += "WHERE A1_FILIAL = " + xFilial("SA1") + " " + CRLF
cQuery += "AND D_E_L_E_T_ = '' " + CRLF

oAlias := ""
oAlias := u_zParOpenQuery( cQuery )
```

---

### 2. **SQL → ADVPL/TL++** — `lint-advpl.convertSelectionToQuery`

Converte uma seleção SQL em concatenação `cQuery` AdvPL no editor (in-place).

**Características:**

- ✅ Transforma SELECT em `cQuery := ""`; `cQuery += "..."` para cada linha.
- ✅ Normaliza `(NOLOCK)` → `WITH(NOLOCK)`.
- ✅ Suporta os mesmos tokens (`%table:%`, `%xFilial:%`, `%notdel%`, `%Exp:%`).
- ✅ Preserva linhas em branco da seleção como spacing na saída.
- ✅ Uppercases palavras-chave e nomes.

**Exemplo de seleção:**

```sql
SELECT A1_COD, A1_NOME
FROM SA1
WHERE A1_FILIAL = '01'
```

**Converte para:**

```advpl
cQuery := ""

cQuery += "SELECT A1_COD, A1_NOME " + CRLF
cQuery += "FROM SA1 " + CRLF
cQuery += "WHERE A1_FILIAL = '01' " + CRLF
```

---

### 3. **ADVPL/TL++ → SQL** — `lint-advpl.convertAdvplToSql`

Reconstrói SQL legível a partir de uma concatenação `cQuery` AdvPL; **copia o resultado para a área de transferência** (não altera o arquivo).

**Características:**

- ✅ Copia apenas se a seleção contiver `cQuery` ou atribuição.
- ✅ Reverte placeholders de função para tokens ou literais simples.
- ✅ Reconhece `Ret*Name(...)`, `xFilial(...)` e variáveis.
- ✅ Injeta sufixo de empresa configurável (`lint-advpl.databaseCompany`, padrão `"010"`).
- ✅ Normaliza para maiúsculas.
- ✅ Detecta e preserva linhas que contêm apenas identificadores de tabela (ex.: `Z5L010` após `RetSQLName("Z5L")`).

**Exemplo de entrada AdvPL:**

```advpl
Local cQuery := ""

cQuery := ""
cQuery += "SELECT A1_COD FROM " + RetSQLName("SA1") + " A1 " + CRLF
cQuery += "WHERE A1_FILIAL = " + xFilial("SA1") + " " + CRLF
```

**Copia para clipboard:**

```sql
SELECT A1_COD FROM SA1010 A1
WHERE A1_FILIAL = '<filial_code>'
```

---

1. Abra um arquivo ADVPL/TL++ (.prw, .prx, .tlpp etc.).
2. A extensão roda automaticamente; o painel lateral **LINT** (aba de extensões) mostra resultados em tempo real.
3. Clique em um issue para abri-lo no editor na linha específica.
4. Use **Lint: Export TXT** para gerar relatório em TXT para compartilhamento.

### 📌 Comandos Disponíveis

| Comando | Ação |

### 🎨 Painel Lateral (Sidebar)

- **Estrutura em árvore** — issues agrupados por regra (`advpl/no-unused-local`, `advpl/hungarian-notation`, etc.).
- **Cada item mostra** — severidade (⚠️ warning), linha, função/contexto, nome da variável/símbolo.
- **Ações rápidas** — clique para abrir no editor, exporte para TXT com um comando.
- **Fonte primária de resultados** — painel Problems é opcional (controlado por configuração).

---

## 📌 Comandos Disponíveis (Expandido)

### Análise e Painel

| Comando ID                         | Label                    | Descrição                               |
| ---------------------------------- | ------------------------ | --------------------------------------- |
| `lint-advpl.analyze`               | Analisar arquivo         | Força reanálise do arquivo ativo        |
| `lint-advpl.exportTxt`             | Exportar relatório (TXT) | Gera TXT com issues e sugestões         |
| `lint-advpl.openView`              | Abrir painel LINT        | Abre/foca a aba lateral **LINT**        |
| `lint-advpl.openConverterSettings` | Configurar conversores   | Abre Settings filtrado para conversores |

### Conversores SQL ↔ AdvPL

| Comando ID                           | Label                 | Descrição                             |
| ------------------------------------ | --------------------- | ------------------------------------- |
| `lint-advpl.convertBeginSQL`         | BeginSQL → ADVPL/TL++ | Converte bloco BeginSQL em cQuery     |
| `lint-advpl.convertSelectionToQuery` | SQL → ADVPL/TL++      | Converte seleção SQL em cQuery        |
| `lint-advpl.convertAdvplToSql`       | ADVPL/TL++ → SQL      | Reconstrói SQL (copia para clipboard) |

### Utilities e Refactoring

| Comando ID                         | Label                        | Descrição                             |
| ---------------------------------- | ---------------------------- | ------------------------------------- |
| `lint-advpl.sortVariables`         | Ordenar Variáveis            | Ordena declarações alfabeticamente    |
| `lint-advpl.uppercaseTableFields`  | Uppercase Tabela→Campo       | Converte campos para MAIÚSCULAS       |
| `lint-advpl.editDocHeaderTemplate` | Editar template de cabeçalho | Abre editor para customizar template  |
| `lint-advpl.saveDocHeaderTemplate` | Salvar template de cabeçalho | Salva o template editado nas settings |

---

## 🛠️ Ferramentas/Utilities

### Ordenar Variáveis — `lint-advpl.sortVariables`

Ordena declarações `Local`, `Private`, `Static`, `Default` alfabeticamente (case-insensitive) na seleção ou no bloco.

**Características:**

- ✅ Preserva indentação exata.
- ✅ Mantém inicializadores e tipos (`As Type`).
- ✅ Mantém comentários inline.
- ✅ Funciona com seleção (ordena dentro) ou arquivo inteiro.

**Exemplo:**

```advpl
// Antes:
Local nCod := 0
Local cNome := ""
Local aItems := {}
Local lAtivo := .T.

// Depois (ordenado alfabeticamente):
Local aItems := {}
Local cNome := ""
Local lAtivo := .T.
Local nCod := 0
```

---

### Uppercase Tabela→Campo — `lint-advpl.uppercaseTableFields`

Converte todas as referências `tabela->campo` para MAIÚSCULAS na seleção ou no arquivo inteiro.

**Características:**

- ✅ Preserva variáveis entre parênteses (ex.: `(cAlias)` permanece minúscula).
- ✅ Ignora strings e comentários.
- ✅ Converte tabelas explícitas e campos.

**Exemplo:**

```advpl
// Antes:
cFilial := sa1->a1_filial
cNome := (cAlias)->a1_nome

// Depois:
cFilial := SA1->A1_FILIAL
cNome := (cAlias)->A1_NOME
```

---

### Snippets de Cabeçalho Configurável

O quick-fix `advpl/require-doc-header` insere um snippet com placeholders que o analista preenche.

**Template padrão (v0.0.12):**

```
//--------------------------------------------------
/*/{Protheus.doc} ${FUNC_NAME}
${DESCRIPTION}

@author ${AUTHOR}
@since ${DATE}
/*/
//--------------------------------------------------
```

**Placeholders suportados:**

- `${FUNC_NAME}` — preenchido automaticamente com nome da função.
- `${DESCRIPTION}` — tabstop para o analista editar.
- `${AUTHOR}` — tabstop com padrão de `lint-advpl.defaultAuthor`.
- `${DATE}` — preenchido automaticamente com data atual (DD/MM/AAAA).
- `${YEAR}` — preenchido automaticamente com ano atual.

**Personalização:**

Edite `lint-advpl.docHeaderTemplate` em `settings.json`:

```json
{
  "lint-advpl.docHeaderTemplate": "//comment\n/*/{Protheus.doc} ${FUNC_NAME}\n${DESCRIPTION}\n\n@author ${AUTHOR}\n@since ${DATE}\n*/\n//comment\n",
  "lint-advpl.defaultAuthor": "Seu Nome"
}
```

---

---

## ⚙️ Configuração

### Opções Gerais

| Configuração                                           | Tipo    | Padrão                                         | Descrição                                                                             |
| ------------------------------------------------------ | ------- | ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| `lint-advpl.showInProblems`                            | boolean | `true`                                         | Publica issues no painel Problems do VS Code                                          |
| `lint-advpl.editorUnderline`                           | boolean | `false`                                        | Mostra squiggles/sublinhados no editor; false = apenas Problems                       |
| `lint-advpl.ignoredNames`                              | array   | `["aRotina", "cCadastro", "INCLUI", "ALTERA"]` | Nomes a ignorar em todos as regras (case-insensitive)                                 |
| `lint-advpl.hungarianSuggestInitializers`              | boolean | `true`                                         | Sugere inicializadores baseado em prefixo húngaro                                     |
| `lint-advpl.hungarianIgnoreAsType`                     | boolean | `true`                                         | Não sugere inicializadores se `As <Type>` está presente                               |
| `lint-advpl.database`                                  | string  | `sqlserver`                                    | Banco de dados do projeto; controla regras específicas (ex.: NOLOCK para `sqlserver`) |
| `lint-advpl.requireDocHeaderRequireName`               | boolean | `true`                                         | Exige `{Protheus.doc} <nome>` no cabeçalho                                            |
| `lint-advpl.requireDocHeaderIgnoreWsMethodInWsRestful` | boolean | `true`                                         | Ignora WSMETHOD dentro de WSRESTFUL para doc-header                                   |
| `lint-advpl.enableRules`                               | boolean | `true`                                         | Master switch — ativa/desativa todas as regras                                        |
| `lint-advpl.rules`                                     | object  | (todas `true`)                                 | Ativa/desativa regras individuais                                                     |
| `lint-advpl.fileExtensions`                            | array   | `[".prw", ".prx", ".tlpp"]`                    | Extensões de arquivo a analisar                                                       |
| `lint-advpl.databaseCompany`                           | string  | `"010"`                                        | Sufixo de empresa para injetar em `RetSQLName("XXX")` → `XXX010`                      |
| `lint-advpl.enableConvertBeginSQL`                     | boolean | `true`                                         | Ativa conversor BeginSQL → AdvPL                                                      |
| `lint-advpl.enableConvertSelection`                    | boolean | `true`                                         | Ativa conversor SQL → AdvPL (seleção)                                                 |
| `lint-advpl.docHeaderTemplate`                         | string  | (veja abaixo)                                  | Template customizável para quick-fix de cabeçalho (com placeholders)                  |
| `lint-advpl.defaultAuthor`                             | string  | `""`                                           | Autor padrão usado no template de cabeçalho                                           |

### Exemplo de `settings.json` (workspace)

**Configuração básica:**

```json
{
  "lint-advpl.ignoredNames": ["aRotina", "cCadastro", "INCLUI", "ALTERA"],
  "lint-advpl.showInProblems": true,
  "lint-advpl.editorUnderline": false
}
```

**Configuração avançada (com heurísticas e toggles por-regra):**

```json
{
  "lint-advpl.ignoredNames": ["aRotina", "cCadastro", "INCLUI", "ALTERA"],
  "lint-advpl.showInProblems": true,
  "lint-advpl.editorUnderline": false,
  "lint-advpl.hungarianSuggestInitializers": true,
  "lint-advpl.hungarianIgnoreAsType": true,
  "lint-advpl.requireDocHeaderRequireName": true,
  "lint-advpl.requireDocHeaderIgnoreWsMethodInWsRestful": true,
  "lint-advpl.database": "sqlserver",
  "lint-advpl.databaseCompany": "010",
  "lint-advpl.enableConvertBeginSQL": true,
  "lint-advpl.enableConvertSelection": true,
  "lint-advpl.docHeaderTemplate": "//--------------------------------------------------\n/*/{Protheus.doc} ${FUNC_NAME}\n${DESCRIPTION}\n\n@author ${AUTHOR}\n@since ${DATE}\n*/\n//--------------------------------------------------\n",
  "lint-advpl.defaultAuthor": "Seu Nome",
  "lint-advpl.enableRules": true,
  "lint-advpl.rules": {
    "advpl/no-unused-local": true,
    "advpl/require-doc-header": true,
    "advpl/require-local": true,
    "advpl/hungarian-notation": true,
    "advpl/suggest-default-for-params": true,
    "advpl/require-explicit-private": true,
    "advpl/include-replace": true,
    "advpl/require-with-nolock": true,
    "advpl/use-crlf": true,
    "advpl/require-field-reference": true,
    "advpl/require-field-table": true
  }
}
```

**Desabilitar regras específicas:**

```json
{
  "lint-advpl.rules": {
    "advpl/hungarian-notation": false, // Desativa sugestões de notação
    "advpl/require-doc-header": false // Desativa verificação de cabeçalho
  }
}
```

## Estrutura essencial

```
.
├── src/
│   ├── extension.ts                  # Ponto de entrada, registra comandos e eventos
│   ├── analyzer/
│   │   ├── index.ts                  # Orquestrador de regras
│   │   ├── types.ts                  # Tipos TypeScript (Issue, AnalysisResult)
│   │   └── rules/advpl/
│   │       ├── no-unused-local.ts     # Detecta declarações não usadas
│   │       ├── require-local.ts       # Força declaração de variáveis
│   │       ├── hungarian-notation.ts  # Valida notação húngara e inicializadores
│   │       ├── suggest-default-params.ts  # Sugere Default em parâmetros
│   │       ├── require-explicit-private.ts # Valida Private explícito
│   │       ├── require-doc-header.ts  # Valida cabeçalho de documentação
│   │       └── include-replace.ts     # Sugere atualização de includes
│   └── sidebar/
│       └── LintTreeProvider.ts        # TreeDataProvider para visualização
├── tools/
│   ├── runFileTest.js                # Executa analyzer em arquivo específico
│   └── (outros utilitários)
├── package.json                      # Manifest, configurações, dependências
├── tsconfig.json                     # Compilação TypeScript
└── README.md                         # Este arquivo
```

## Requisitos

- **VS Code:** `^1.79.0` (versão 1.79 ou superior)
- **Node.js:** `22.x` (para desenvolvimento e compilação)
- Não requer nenhuma dependência externa em runtime (análise estática pura)

## Desenvolvimento

### Setup local

```bash
# Clone o repositório
git clone https://github.com/filhoirineu/lint-advpl-tlpp-by-filhoirineu
cd lint-advpl-tlpp-by-filhoirineu

# Instale dependências
npm install

# Compile uma vez
npm run compile

# Ou compile em modo watch (recompila ao salvar)
npm run watch
```

### Testes

```bash
# Executar analyzer em arquivo específico
node tools/runFileTest.js fontestotvs/pcp/ws/ZPCPW30.prw

# Gera relatório JSON em out/reports/
```

### Publicação

```bash
# Antes de publicar, verifique a versão em package.json (deve ser 0.0.12)
npm run compile

# Gerar o VSIX com nome contendo a versão:
npx vsce package --out lint-advpl-tlpp-0.0.12.vsix

# Publicar no Marketplace (requer Personal Access Token ou login do publisher):
# usando token em variável de ambiente (recomendado ao CI):
npx vsce publish --pat $VSCE_TOKEN

# Ou faça login interativo e publique:
# npx vsce login filhoirineu
# npx vsce publish
```

## 📊 Histórico de Versões

### Versão 0.0.12 (atual) — 21 de janeiro de 2026

#### Novas Regras

- ✨ **advpl/require-field-reference:** Detecta campos não qualificados ou qualificados em minúsculas (ex.: `sa1->a1_cod` → sugestão: `SA1->A1_COD`).
- ✨ **advpl/require-field-table:** Valida que prefixo de campo corresponde ao código da tabela (ex.: `SA1->A1_COD` ✅, `SA1->B1_COD` ❌).

#### Melhorias em Regras Existentes

- 🔧 **advpl/require-local:** Detecta variáveis em `Aadd(...)` cuja primeira argumento não está declarada; ignora assignment de propriedades indexadas (ex.: `oBrowse:aColumns[1]:cTitle := ...`).
- 🔧 **advpl/require-doc-header:** Suporta quick-fix com snippet configurável (placeholders `${DESCRIPTION}`, `${AUTHOR}`).

#### Novos Conversores e Utilities

- 🔄 **Conversor SQL → AdvPL (melhorado):** Uppercases palavras-chave SQL e nomes de tabela/alias; preserva espaciamento.
- 🔄 **Conversor BeginSQL → AdvPL (melhorado):** Reconhece alias e gera chamadas `u_zParOpenQuery`; trata tokens corretamente.
- ✨ **Comando: Uppercase Tabela→Campo** — `lint-advpl.uppercaseTableFields`: Converte todas as referências de campo para MAIÚSCULAS.
- ✨ **Snippets de Cabeçalho Configurável:** Template editável via `lint-advpl.docHeaderTemplate` com placeholders `${FUNC_NAME}`, `${DESCRIPTION}`, `${AUTHOR}`, `${DATE}`.

#### Novas Configurações

- ⚙️ `lint-advpl.docHeaderTemplate` — Template customizável para quick-fix de cabeçalho.
- ⚙️ `lint-advpl.defaultAuthor` — Autor padrão usado no snippet.
- ⚙️ `lint-advpl.databaseCompany` — Sufixo de empresa para `RetSQLName()`.
- ⚙️ `lint-advpl.enableConvertBeginSQL` — Toggle para conversor BeginSQL.
- ⚙️ `lint-advpl.enableConvertSelection` — Toggle para conversor de seleção SQL.

#### Quick-fixes e CodeActions

- 💡 **advpl/require-field-reference:** "Uppercase field reference" — substitui automaticamente o campo.
- 💡 **advpl/require-doc-header:** "Inserir cabeçalho de documentação" — insere snippet com placeholders.
- 💡 **advpl/require-with-nolock:** "Replace (NOLOCK) with WITH(NOLOCK)" (já existia, melhorado).

#### Melhorias Gerais

- 📊 **Documentação expandida:** README.md agora inclui todas as regras, conversores, comandos, configurações e exemplos.
- 🎨 **Menu de contexto:** Adicionados comandos de conversão e utilities no menu editor/context.
- 🚀 **Performance:** Analyzer roda com debounce automático ao editar (250ms).

---

### Versão 0.0.11 — 20 de janeiro de 2026

- ✨ Conversores bidirecionais entre SQL e ADVPL/TL++:
  - `BeginSQL → ADVPL/TL++` (in-place): converte `BeginSQL...EndSQL` em `cQuery` concatenado com tokens.
  - `SQL → ADVPL/TL++` (seleção): converte seleção SQL em `cQuery`, preservando linhas em branco e normalizando `NOLOCK` para `WITH(NOLOCK)`.
  - `ADVPL/TL++ → SQL`: reconstrói SQL legível a partir de `cQuery` e copia o resultado para a área de transferência (não altera o arquivo quando a seleção é `cQuery`).

- 🛠️ Melhorias e correções de robustez:
  - Aceita variações de helpers `Ret*Name(...)` (por exemplo `RetSqlName`, `RetSlqName`) e aplica sufixo de empresa configurável via `lint-advpl.databaseCompany`.
  - Remoção de tokens de parsing (`%noparser%`, `%Exp:%`, `%notdel%`) durante conversões quando aplicável.
  - Preservação de alias e `WITH(NOLOCK)` após tokens de nome de tabela em `FROM`/`JOIN`.
  - Evita duplicação de aspas em placeholders e preserva literais `''` corretamente.

### Versão 0.0.7

- ✨ Ajustes na regra `advpl/require-doc-header` para validação mais precisa
- 🎯 Melhorias na detecção de blocos `Class` e `WSRESTFUL` para reduzir falsos-positivos

### Versão 0.0.4 e anteriores

- Regras básicas: no-unused-local, require-local, hungarian-notation, suggest-default-for-params, require-explicit-private
- Painel lateral com Tree view
- Exportação para TXT

## 🤝 Contribuições

Contribuições são bem-vindas! Abra um **Issue** ou **Pull Request** para:

- Reportar bugs ou falsos-positivos
- Sugerir novas regras ou melhorias nas existentes
- Melhorar documentação e exemplos

**Antes de submeter:**

1. Faça fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/minha-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona minha feature'`)
4. Push para a branch (`git push origin feature/minha-feature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto é licenciado sob **GPL-3.0** — veja [LICENSE](LICENSE) para detalhes.

## 🙋 Suporte

- 📧 **Issues & Sugestões:** [GitHub Issues](https://github.com/filhoirineu/lint-advpl-tlpp-by-filhoirineu/issues)
- 💬 **Discussões:** [GitHub Discussions](https://github.com/filhoirineu/lint-advpl-tlpp-by-filhoirineu/discussions)

---

**Desenvolvido com ❤️ por [@filhoirineu](https://github.com/filhoirineu)**

Versão atual: **0.0.12** | Última atualização: **21 de janeiro de 2026**
