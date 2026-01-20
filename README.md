# LINT ADVPL/TLPP — Offline Static Analysis for AdvPL/TLPP

**Lint ADVPL/TLPP** é uma extensão para VS Code que oferece análise estática offline de código-fonte ADVPL/TLPP, identificando problemas comuns de escopo, nomenclatura, documentação e boas práticas — **sem necessidade de dependência do ambiente TOTVS**.

**Versão:** 0.0.8

## 🎯 Visão Geral

- ✅ **Análise em tempo real** — executa automaticamente ao abrir, editar ou salvar arquivos `.prw`, `.prx`, `.tlpp`.
- ✅ **Painel lateral** com resultados agrupados por regra; visualização clara de issues com contexto (função, linha, severidade).
- ✅ **Configuração flexível** — ative/desative regras individualmente ou em conjunto; customize comportamentos com opções granulares.
- ✅ **Sem dependências externas** — análise estática pura, rápida, offline; funciona sem conectar ao TOTVS.
- ✅ **Exportação de relatórios** — gere TXT com sugestões para compartilhamento e documentação.
- ✅ **Heurísticas avançadas** — reconhece padrões de inicialização, chamadas de função, acesso a propriedades e ignorar WSMETHOD dentro de WSRESTFUL.

## 📋 Regras Implementadas (7 regras ativas)

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

## Como usar no VS Code

1. Abra um arquivo ADVPL/TLPP (.prw, .prx, .tlpp etc.).
2. A extensão roda automaticamente; o painel lateral **LINT** (aba de extensões) mostra resultados em tempo real.
3. Clique em um issue para abri-lo no editor na linha específica.
4. Use **Lint: Export TXT** para gerar relatório em TXT para compartilhamento.

### 📌 Comandos Disponíveis

| Comando                              | Ação                                     |
| ------------------------------------ | ---------------------------------------- |
| `LINT ADVPL: Analisar arquivo atual` | Força reanálise do arquivo ativo         |
| `LINT ADVPL: Exportar relatório TXT` | Gera TXT com todos os issues e sugestões |
| `LINT ADVPL: Open Sidebar`           | Abre/foca a aba lateral **LINT**         |

### 🎨 Painel Lateral (Sidebar)

- **Estrutura em árvore** — issues agrupados por regra (`advpl/no-unused-local`, `advpl/hungarian-notation`, etc.).
- **Cada item mostra** — severidade (⚠️ warning), linha, função/contexto, nome da variável/símbolo.
- **Ações rápidas** — clique para abrir no editor, exporte para TXT com um comando.
- **Fonte primária de resultados** — painel Problems é opcional (controlado por configuração).

## ⚙️ Configuração

### Opções Gerais

| Configuração                                           | Tipo    | Padrão                                         | Descrição                                                       |
| ------------------------------------------------------ | ------- | ---------------------------------------------- | --------------------------------------------------------------- |
| `lint-advpl.showInProblems`                            | boolean | `true`                                         | Publica issues no painel Problems do VS Code                    |
| `lint-advpl.editorUnderline`                           | boolean | `false`                                        | Mostra squiggles/sublinhados no editor; false = apenas Problems |
| `lint-advpl.ignoredNames`                              | array   | `["aRotina", "cCadastro", "INCLUI", "ALTERA"]` | Nomes a ignorar em todos as regras (case-insensitive)           |
| `lint-advpl.hungarianSuggestInitializers`              | boolean | `true`                                         | Sugere inicializadores baseado em prefixo húngaro               |
| `lint-advpl.hungarianIgnoreAsType`                     | boolean | `true`                                         | Não sugere inicializadores se `As <Type>` está presente         |
| `lint-advpl.requireDocHeaderRequireName`               | boolean | `true`                                         | Exige `{Protheus.doc} <nome>` no cabeçalho                      |
| `lint-advpl.requireDocHeaderIgnoreWsMethodInWsRestful` | boolean | `true`                                         | Ignora WSMETHOD dentro de WSRESTFUL para doc-header             |
| `lint-advpl.enableRules`                               | boolean | `true`                                         | Master switch — ativa/desativa todas as regras                  |
| `lint-advpl.rules`                                     | object  | (todas `true`)                                 | Ativa/desativa regras individuais                               |

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
  "lint-advpl.enableRules": true,
  "lint-advpl.rules": {
    "advpl/no-unused-local": true,
    "advpl/require-doc-header": true,
    "advpl/require-local": true,
    "advpl/hungarian-notation": true,
    "advpl/suggest-default-for-params": true,
    "advpl/require-explicit-private": true,
    "advpl/include-replace": true
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
# Antes de publicar, atualize a versão em package.json
# Então compile e empacote:
npm run compile
npx vsce package --out lint-advpl-tlpp-X.X.X.vsix

# Para publicar no Marketplace VS Code:
npx vsce publish
```

## 📊 Histórico de Versões

### Versão 0.0.7 (atual)

- ✨ Ajustes na regra `advpl/require-doc-header` para validação mais precisa
- ✨ Métodos declarados dentro de `Class ... End Class` não exigem cabeçalho individual; implementações (`Method ... Class ...`) continuam exigindo `{Protheus.doc} <MethodName>`
- 🔧 Não aceitar mais o nome da classe como substituto do cabeçalho do construtor — apenas `{Protheus.doc} New` é válido para `Method New()`
- 🎯 Melhorias na detecção de blocos `Class` e `WSRESTFUL` para reduzir falsos-positivos
- 🐛 Correções de diagnóstico e remoção de logs de depuração temporários

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

Versão atual: **0.0.7** | Última atualização: **19 de janeiro de 2026**
