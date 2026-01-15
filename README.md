# LINT ADVPL/TLPP by @filhoirineu

Extensao de lint local para fontes ADVPL/TLPP. O objetivo e identificar problemas comuns de escopo, nomenclatura e boas praticas sem depender de ambientes TOTVS.

## Visao geral

- Analisa o arquivo ativo ao abrir, trocar de aba, editar ou salvar.
- Sugere declaracao de `Local` e `Default` para variaveis usadas sem cabecalho.
- Reporta issues de nomenclatura, tipo esperado, declaracoes duplicadas ou sem inicializacao, funcoes Static nao utilizadas e riscos com SQL dinamico.
- Exibe resultados em uma webview lateral com resumo, sugestoes e lista de problemas.
- Permite exportar o relatorio em TXT para compartilhamento.

## Como usar no VS Code

1. Abra um arquivo ADVPL/TLPP (.prw, .prx, .tlpp etc.).
2. A extensao roda automaticamente; o painel lateral "LINT ADVPL/TLPP" mostra o resultado mais recente.
3. Ajuste o codigo seguindo as sugestoes de Locals/Defaults e corrija issues listadas.

### Comandos disponiveis

| Comando                                                   | Acao                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------ |
| `LINT ADVPL/TLPP: Analisar arquivo atual`                 | Forca uma nova analise do editor ativo e exibe toast de conclusao. |
| `LINT ADVPL/TLPP: Exportar relatorio TXT (arquivo atual)` | Gera um TXT com sugestoes e issues detectadas no ultimo resultado. |
| `LINT ADVPL/TLPP: Ping (teste)`                           | Mostra uma notificacao rapida para validar o ciclo de comandos.    |

### Painel lateral

- Botao **Atualizar** aciona o comando de analise manual.
- Botao **Exportar TXT** chama a rotina de exportacao.
- Botao **Ping View** executa o comando de ping.
- Resumo traz contagem de blocos com problemas, Locals, Defaults e issues.

## Principais verificacoes

- Nomenclatura padrao hungaro (tipos incoerentes geram erro).
- Declaracoes duplicadas (`Local`, `Private`, `Static`) na mesma linha.
- Declaracoes sem inicializacao quando a regra exige valor inicial.
- Variaveis globais (`Static`, `Private`) nao utilizadas.
- Uso de `SetPrvt` com alerta para declaracao explicita.
- Funcoes `Static` declaradas e nunca chamadas.
- Construcoes de SQL dinamico que nao usam `TCQUERY` e `MpSysOpenQuery`.

## Estrutura essencial

- `src/extension.ts`: ponto de entrada, registra comandos, eventos e dispara analise.
- `src/sidebar/LintSidebarProvider.ts`: renderiza webview com resultados e integra os botoes.
- `src/analyzer/analyzer.ts`: implementa o motor de analise e regras de lint.
- `src/analyzer/report.ts`: gera HTML e TXT a partir do resultado da analise.

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

```bash
npm run watch
```

### Analisar codigo fonte com ESLint

```bash
npm run lint
```

### Executar testes de extensao

```bash
npm test
```

### Debug da extensao

1. Abra esta pasta no VS Code.
2. Pressione F5 (ou "Run and Debug") para iniciar uma nova janela de extensao.
3. Abra um arquivo ADVPL/TLPP na janela de teste e confira a aba lateral da lint.

## Roadmap

- Adicionar screenshots/gravacoes da webview lateral.
- Cobrir cenarios adicionais de regras (por exemplo, validacao de includes).
- Expandir testes automatizados para cada regra principal.

Contribuicoes internas sao bem-vindas via PR ou issue no repositorio privado.
