# LINT ADVPL/TLPP by @filhoirineu

Extensão de lint para fontes ADVPL/TLPP. Identifica problemas comuns de escopo, nomenclatura e boas práticas sem depender do ambiente TOTVS.

## Visao geral

- Analisa o arquivo ativo ao abrir, trocar de aba, editar ou salvar.
- Sugere declaração de `Local` e `Default` para variáveis usadas sem cabeçalho.
- Reporta issues de nomenclatura, tipo esperado, declarações duplicadas ou sem inicialização, funções `Static` não utilizadas e riscos com SQL dinâmico.
- Exibe resultados na aba lateral (Tree view) com agrupamento por regra e ocorrências.
- Permite exportar o relatório em TXT para compartilhamento.

## Novidades na versão 0.0.5

- Sugestões de inicializadores configuráveis por prefixo (ex.: `a` -> `:= {}`, `c` -> `:= ""`, `n` -> `:= 0`). Controlável por `lint-advpl.hungarianSuggestInitializers` (padrão: true).
- `WSMETHOD`/`WSRESTFUL` parsing melhorado: nomes de método (ex.: `WSMETHOD GET reImprime`) agora são extraídos corretamente, evitando que o verbo `GET` apareça como nome da função.
- `advpl/suggest-default-for-params` não sugere `Default` dentro de implementações de `WSMETHOD`/`WSREST` (reduz falsos-positivos em endpoints).
- Melhor tratamento de declarações `Local <name> As <Type>` para evitar que o tipo (ex.: `Array`) seja reportado como identificador.
- Nova configuração padrão `lint-advpl.hungarianSuggestInitializers` adicionada (veja `package.json`).

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

Novas conveniências

- Pequenas ferramentas auxiliares em `tools/` para inspeção de issues, geração de top-100 e execução recursiva de análise em pastas grandes.
- Mensagens de diagnóstico normalizadas (uma linha) para melhor integração com Problems/IDE.

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

# LINT ADVPL/TLPP — extensão

Versão: 0.0.4

Extensão de lint para fontes ADVPL/TLPP (arquivo local). Fornece sugestões sobre escopo (`Local`/`Private`), nomenclatura estilo húngaro, inicializadores e boas práticas.

Principais características

- Análise automática ao abrir/editar/trocar arquivo (suporte: `.prw`, `.prx`, `.tlpp`).
- Painel lateral (Tree view) com agrupamento por regra; export para TXT.
- Regras configuráveis e opção para publicar issues no painel Problems.

Regras importantes

- `advpl/no-unused-local` — detecta `Local`/`Private` não usados; agora reconhece usos em inicializadores/strings e aceita `Private` declaradas no arquivo (busca global mascarando a linha de declaração).
- `advpl/require-local` — alerta quando um identificador recebe valor sem declaração `Local`.
- `advpl/hungarian-notation` — valida prefixos e inicializadores esperados; relaxado para casos onde a variável é inicializada a partir de outro identificador ou chamada de função.
- `advpl/require-explicit-private` — sugere declarar explicitamente `Private` em vez de `SetPrvt(...)` (agrega sugestões por chamada e propõe inicializadores seguindo mapeamento heurístico).

Configurações (em `package.json`)

- `lint-advpl.showInProblems` (boolean): publica issues em Problems.
- `lint-advpl.editorUnderline` (boolean): controla squiggles no editor.
- `lint-advpl.ignoredNames` (string[]): lista (case-insensitive) de identificadores que o analisador deve ignorar. Atualmente é respeitada pelas regras `advpl/no-unused-local`, `advpl/hungarian-notation`, `advpl/require-local` e `advpl/require-explicit-private` — adicione nomes de projeto como `aRotina`, `cCadastro`, `INCLUI`, `ALTERA` para evitar falsos-positivos.

Exemplo de `settings.json` (Workspace) — coloque em `.vscode/settings.json` para aplicar ao projeto:

```json
{
  "lint-advpl.ignoredNames": ["aRotina", "cCadastro", "INCLUI", "ALTERA"],
  "lint-advpl.showInProblems": true,
  "lint-advpl.editorUnderline": false
}
```

Como usar (rápido)

1. Instale dependências: `npm install`
2. Compile: `npm run compile`
3. Abra um arquivo ADVPL/TLPP no VS Code — a análise ocorre automaticamente.
4. Use o comando `Lint: Export TXT` para salvar um relatório.

Desenvolvimento

- Runner de teste de regras: `node tools/runRuleTest.js`
- Compilar em watch: `npm run watch`

Contribuições
Abra um PR ou issue no repositório para propor mudanças. Antes de publicar no Marketplace, verifique a licença e o ícone `media/market-icon.png`.

Licença
GPL-3.0 (ver `LICENSE`)

---

Se quiser, adapto uma versão em inglês ou adiciono screenshots para o README.
