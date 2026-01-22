# 📦 Instruções de Publicação — LINT ADVPL/TL++ v0.0.12

## 📥 Download e Instalação Manual

O arquivo **VSIX** foi gerado com sucesso:

```
lint-advpl-tlpp-0.0.12.vsix (4.48 MB)
```

**Localização:** `c:\Users\IFILHOSTUDIES\@estudos\extensao_vscode\lint-advpl-tlpp\lint-advpl-tlpp-by-filhoirineu\lint-advpl-tlpp-0.0.12.vsix`

### Para instalar manualmente no VS Code:

1. **Método 1 — Via interface VS Code:**
   - Abra VS Code
   - Vá para **Extensions** (Ctrl+Shift+X)
   - Clique em **"..."** (menu) → **"Install from VSIX..."**
   - Selecione o arquivo `lint-advpl-tlpp-0.0.12.vsix`
   - Recarregue ou reinicie o VS Code

2. **Método 2 — Via terminal:**
   ```bash
   code --install-extension "c:\Users\IFILHOSTUDIES\@estudos\extensao_vscode\lint-advpl-tlpp\lint-advpl-tlpp-by-filhoirineu\lint-advpl-tlpp-0.0.12.vsix"
   ```

---

## 🚀 Publicação no VS Code Marketplace

Para publicar a extensão no marketplace oficial, você precisa:

### Pré-requisitos

1. **Conta Microsoft/GitHub** para registrar-se como publisher
2. **Personal Access Token (PAT)** com permissão "Publish" do Azure DevOps

### Passo 1: Registrar-se como Publisher

1. Acesse: https://marketplace.visualstudio.com/manage
2. Sign in com sua conta Microsoft
3. Crie uma organização ou use a existente
4. Note seu **Publisher ID** (ex.: `filhoirineu`)

### Passo 2: Gerar Personal Access Token (PAT)

1. Acesse: https://dev.azure.com/
2. Clique no ícone de perfil → **Personal access tokens**
3. Clique **+ New Token**
4. Preenchimento:
   - **Name:** `vsce-lint-advpl` (ou similar)
   - **Organization:** Selecione sua organização
   - **Expiration:** 1 ano (ou conforme preferir)
   - **Scopes:** Selecione `Publish` apenas (ou `Code (Full)` se quiser acesso completo)
5. Clique **Create**
6. **Copie o token** (será exibido uma única vez)

### Passo 3: Publicar via CLI

**Opção A — Usando token diretamente (recomendado para CI/CD):**

```bash
cd "c:\Users\IFILHOSTUDIES\@estudos\extensao_vscode\lint-advpl-tlpp\lint-advpl-tlpp-by-filhoirineu"

npx vsce publish --pat <seu-token-aqui>
```

**Substituir `<seu-token-aqui>` pelo PAT copiado acima.**

**Opção B — Fazer login interativo:**

```bash
cd "c:\Users\IFILHOSTUDIES\@estudos\extensao_vscode\lint-advpl-tlpp\lint-advpl-tlpp-by-filhoirineu"

npx vsce login filhoirineu
# Insira o PAT quando solicitado

npx vsce publish
```

**Opção C — Usar variável de ambiente (CI/CD):**

```bash
$env:VSCE_PAT = "<seu-token-aqui>"
npx vsce publish
```

### Passo 4: Verificar publicação

Após alguns minutos:

1. Acesse: https://marketplace.visualstudio.com/items?itemName=filhoirineu.lint-advpl-tlpp
2. Verifique se a versão `0.0.12` aparece
3. Teste instalação via VS Code Extensions Marketplace

---

## 📋 Resumo de Conteúdo da v0.0.12

### ✨ Novas Features

- **2 novas regras de análise:** `advpl/require-field-reference` e `advpl/require-field-table`
- **Snippets configuráveis** para cabeçalho `{Protheus.doc}` com placeholders (`${FUNC_NAME}`, `${AUTHOR}`, etc.)
- **Comando "Uppercase Tabela→Campo"** para conversão em massa
- **Conversores melhorados:** SQL ↔ AdvPL com suporte a tokens e normalização

### 📚 Documentação

- **README.md** completamente reescrito (30.57 KB) com 13 seções
- **CHANGELOG.md** detalhado com todas as mudanças desde v0.0.11

### 🔧 Configurações Novas

| Configuração                        | Tipo    | Padrão                |
| ----------------------------------- | ------- | --------------------- |
| `lint-advpl.docHeaderTemplate`      | string  | Template customizável |
| `lint-advpl.defaultAuthor`          | string  | `""`                  |
| `lint-advpl.databaseCompany`        | string  | `"010"`               |
| `lint-advpl.enableConvertBeginSQL`  | boolean | `true`                |
| `lint-advpl.enableConvertSelection` | boolean | `true`                |

### 🎯 Regras Totais

- **11 regras de análise** implementadas e documentadas
- **Quick-fixes** para 3 regras (NOLOCK, doc-header, field-reference)
- **Master toggle** para ativar/desativar todas as regras

---

## 📞 Suporte e Issues

Após publicação, monitore:

- **GitHub Issues:** https://github.com/filhoirineu/lint-advpl-tlpp-by-filhoirineu/issues
- **Marketplace Reviews:** Feedback de usuários no marketplace
- **Rating:** Mantenha uma boa classificação respondendo a problemas

---

## ✅ Checklist de Publicação

- [x] Versão em `package.json` = `0.0.12`
- [x] README.md atualizado (v0.0.12)
- [x] CHANGELOG.md atualizado (v0.0.12)
- [x] TypeScript compilado (`npm run compile` sem erros)
- [x] VSIX gerado (`lint-advpl-tlpp-0.0.12.vsix`)
- [ ] PAT gerado no Azure DevOps
- [ ] Publicado via `npx vsce publish --pat <token>`
- [ ] Verificado no Marketplace após ~5 minutos
- [ ] Versão tag criada no Git: `git tag v0.0.12 && git push origin v0.0.12`

---

## 🔗 Links Úteis

- **VS Code Marketplace:** https://marketplace.visualstudio.com
- **Publisher Management:** https://marketplace.visualstudio.com/manage
- **Azure DevOps (PAT):** https://dev.azure.com
- **VSCE CLI Docs:** https://github.com/microsoft/vscode-vsce
- **Keep a Changelog:** https://keepachangelog.com

---

**Desenvolvido com ❤️ por [@filhoirineu](https://github.com/filhoirineu)**

v0.0.12 | 21 de janeiro de 2026
