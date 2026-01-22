# 🎯 Quick Reference — LINT ADVPL/TL++ v0.0.12

## 📦 Distribuição

| Item          | Local                                           |
| ------------- | ----------------------------------------------- |
| **VSIX**      | `lint-advpl-tlpp-0.0.12.vsix` (4.48 MB)         |
| **README**    | `README.md` (30.57 KB) — 13 seções completas    |
| **CHANGELOG** | `CHANGELOG.md` — Entrada detalhada v0.0.12      |
| **Setup**     | `RELEASE_INSTRUCTIONS.md` — Guia passo-a-passo  |
| **Manifesto** | `PUBLICATION_MANIFEST.md` — Metadados completos |
| **Sumário**   | `SUMMARY.md` — Visão geral do trabalho          |

---

## 🚀 Publicação em 3 Passos

### 1️⃣ Gerar PAT (Azure DevOps)

```
https://dev.azure.com → Personal access tokens → New Token
Scope: Publish → Copy token
```

### 2️⃣ Publicar

```bash
npx vsce publish --pat <seu-token>
```

### 3️⃣ Verificar (5 minutos depois)

```
https://marketplace.visualstudio.com/items?itemName=filhoirineu.lint-advpl-tlpp
```

---

## 📋 Checklist Rápido

- [x] VSIX gerado (4.48 MB)
- [x] README.md completo (30.57 KB)
- [x] CHANGELOG.md detalhado
- [x] TypeScript compilado ✓
- [x] Documentação de publicação
- [ ] PAT gerado (faça você mesmo)
- [ ] Publicado (faça você mesmo)

---

## 🎓 Features Principais

**11 Regras** | **3 Conversores** | **11 Comandos** | **17 Configurações** | **3 Quick-fixes**

### Regras Novas (v0.0.12)

- `advpl/require-field-reference` — Campos sem qualificador/minúsculos
- `advpl/require-field-table` — Prefixo de campo vs. nome de tabela

### Utilities Novas

- Uppercase Tabela→Campo
- Snippets de cabeçalho configuráveis
- Editar/salvar template de header

---

## 📞 Suporte

```
GitHub: https://github.com/filhoirineu/lint-advpl-tlpp-by-filhoirineu
Issues: https://github.com/filhoirineu/lint-advpl-tlpp-by-filhoirineu/issues
```

---

**v0.0.12** | 21 de janeiro de 2026 | Pronto para publicação ✅
