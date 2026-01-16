# LINT ADVPL/TLPP by @filhoirineu

Extensão de lint para fontes ADVPL/TLPP. Identifica problemas comuns de escopo, nomenclatura e boas práticas sem depender do ambiente TOTVS.

## Visao geral

- Analisa o arquivo ativo ao abrir, trocar de aba, editar ou salvar.
- Sugere declaração de `Local` e `Default` para variáveis usadas sem cabeçalho.
- Reporta issues de nomenclatura, tipo esperado, declarações duplicadas ou sem inicialização, funções `Static` não utilizadas e riscos com SQL dinâmico.
- Exibe resultados na aba lateral (Tree view) com agrupamento por regra e ocorrências.
- Permite exportar o relatório em TXT para compartilhamento.

## Como usar no VS Code

1. Abra um arquivo ADVPL/TLPP (.prw, .prx, .tlpp etc.).
2. A extensao roda automaticamente; o painel lateral "LINT ADVPL/TLPP" mostra o resultado mais recente.
3. Ajuste o codigo seguindo as sugestoes de Locals/Defaults e corrija issues listadas.

### Comandos disponiveis

| Comando              | Ação                                                   |
| -------------------- | ------------------------------------------------------ |
| `Lint: Analyze`      | Força uma nova análise do editor ativo                 |
| `Lint: Export TXT`   | Gera um TXT com sugestões e issues do último resultado |
| `Lint: Open Sidebar` | Abre/foca a aba lateral da lint                        |

### Painel lateral

- Implementado como `TreeDataProvider` (aba lateral) com grupos por `ruleId` e nós de ocorrência.
- Cada ocorrência mostra severidade, variável, função e linha; descrição apresenta mensagem truncada para leitura rápida.
- Ações rápidas: abrir o arquivo na linha da ocorrência e exportar relatório.

Observação: o painel é a fonte primária de resultados — a publicação no painel Problems é opcional e controlada por configuração (veja abaixo).

## Principais verificacoes

- `advpl/no-unused-local`: detecta `Local`/`Private` não usados — melhora para reconhecer usos dentro de inicializadores (strings) e evita mascarar inicializadores de outras declarações.
- `advpl/require-local`: detecta atribuições para identificadores não declarados como `Local` (sugere declarar ou revisar).
- `advpl/hungarian-notation`: checa prefixo/hungarian-style; relaxado para ignorar declarações que inicializam a partir de outro identificador ou chamam função (ex.: `Local x := y` ou `Local x := GetY()` não geram aviso de nome). Mantém validação de inicializador literal/esperado.
- `advpl/suggest-default-for-params`: sugere marcar parâmetros como `Default` quando aplicável.

Outras verificações: declarações duplicadas, funções `Static` não utilizadas, padrões de SQL/Query.

## Estrutura essencial

- `src/extension.ts`: ponto de entrada, registra comandos, eventos e inicializa o provedor lateral.
- `src/sidebar/LintTreeProvider.ts`: implementa o `TreeDataProvider` que exibe e organiza os issues.
- `src/analyzer/index.ts`: orquestra a execução das regras.
- `src/analyzer/rules/advpl/`: regras modulares (ex.: `no-unused-local.ts`, `hungarian-notation.ts`, `require-local.ts`, `suggest-default-for-params.ts`).
- `tools/runRuleTest.js`: runner local para validar regras contra arquivos de exemplo.

## Requisitos

- Visual Studio Code 1.108 ou superior.
- Node.js 22.x para desenvolvimento e build.
- Dependencias de desenvolvimento listadas no `package.json`.

## Desenvolvimento

### Instalar dependencias

```bash
npm install
```

### Compilar uma vez

```bash
npm run compile
```

### Compilar em modo watch

---

# 🔎 LINT ADVPL/TLPP — by @filhoirineu

Extensão de lint para fontes ADVPL/TLPP que oferece sugestões de boas práticas, detecção de escopo e verificação de nomenclatura sem depender do ambiente TOTVS.

---

🎯 Destaques

- Análise automática ao abrir/editar/salvar arquivos ADVPL/TLPP (.prw, .prx, .tlpp).
- Resultados apresentados principalmente na aba lateral (Tree view), agrupados por regra.
- Publicação opcional em Problems e squiggles configuráveis.

---

🛠️ Regras principais

- ✅ `advpl/no-unused-local` — locais/privates não usados (heurísticas aprimoradas para inicializadores e strings).
- ✅ `advpl/require-local` — detecta atribuições sem declaração `Local`.
- ✅ `advpl/hungarian-notation` — valida notação estilo hungaro; ignora casos onde a variável é inicializada por outro identificador ou por chamada de função (ex.: `Local npOpc := nOpcPar`).
- ✅ `advpl/suggest-default-for-params` — sugere `Default` para parâmetros quando apropriado.

Outras verificações adicionais: duplicações de declaração, `Static` não utilizados, uso inseguro de SQL dinâmico, etc.

---

🧭 Painel lateral (UI)

- Implementado como `TreeDataProvider`.
- Estrutura: grupos por `ruleId` → ocorrências por arquivo/linha.
- Cada ocorrência mostra: severidade • variável • função • linha, com descrição resumida.
- Ações: abrir arquivo na linha da ocorrência, exportar relatório TXT.

💡 Recomenda-se usar a aba lateral como fonte principal de informação; habilite a publicação em Problems apenas para revisão em lote.

---

⚙️ Configurações relevantes

- `lint-advpl.showInProblems` (boolean, padrão `false`) — publica diagnostics no painel Problems quando `true`.
- `lint-advpl.editorUnderline` (boolean, padrão `false`) — habilita squiggles/subinilhado no editor quando `true`.

---

🚀 Como usar (rápido)

1. Abra um arquivo ADVPL/TLPP.
2. A análise ocorre automaticamente; abra a aba lateral "LINT ADVPL/TLPP" para ver os resultados.
3. Utilize os comandos para forçar análise ou exportar relatório.

Comandos úteis:

```bash
Lint: Analyze       # força análise do arquivo ativo
Lint: Export TXT    # exporta relatório em TXT
Lint: Open Sidebar  # abre/foca a aba lateral
```

---

🧩 Desenvolvimento

Instalar dependências:

```bash
npm install
```

Compilar:

```bash
npm run compile
```

Modo watch:

```bash
npm run watch
```

Executar o test-harness de regras:

```bash
node tools/runRuleTest.js
```

Debug (VS Code): pressione F5 para abrir uma janela de extensão e testar com arquivos ADVPL/TLPP.

---

📁 Estrutura relevante

- `src/extension.ts` — registro de comandos e inicialização.
- `src/sidebar/LintTreeProvider.ts` — TreeDataProvider (aba lateral).
- `src/analyzer/index.ts` — orquestra execução das regras.
- `src/analyzer/rules/advpl/` — regras modulares (ex.: `no-unused-local.ts`, `hungarian-notation.ts`, `require-local.ts`, `suggest-default-for-params.ts`).
- `tools/runRuleTest.js` — runner local para validar as regras contra arquivos de exemplo.

---

📝 Changelog rápido (últimas alterações)

- Relaxamento da heurística de `hungarian-notation` para ignorar inicializações por outros identificadores ou chamadas de função.
- `no-unused-local` melhorou detecção para usos em inicializadores e strings e passou a mascarar apenas a linha de declaração.
- Adição da aba lateral como fonte primária de resultado; diagnostics em Problems agora são opcionais via configuração.

---

📬 Contribuições

Contribuições internas são bem-vindas via PR ou issue no repositório privado. Se preferir, eu posso também adicionar exemplos visuais (screenshots/GIF) ou um changelog detalhado.

---

Se quiser ajustes no tom, mais emojis ou uma versão em inglês também — digo e faço! ✨
