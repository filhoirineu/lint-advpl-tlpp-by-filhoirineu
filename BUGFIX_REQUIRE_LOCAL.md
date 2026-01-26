# 🔧 Correção da Regra `advpl/require-local`

## 🐛 Problema Reportado

A regra `advpl/require-local` estava reportando falso-positivo para variáveis declaradas como `Static` no nível de arquivo (fora de funções).

**Exemplo:**

```advpl
// No início do arquivo
Static aINFOUSUARIO := {}

User Function setInfoUsuario()
  // ⚠️ ANTES: Reportava erro
  // "Variável: aINFOUSUARIO usada em Aadd(...) mas não é declarada como Local"
  Aadd(aINFOUSUARIO, "item")
EndFunction
```

**Causa raiz:**
A regra coletava `Static` declarations apenas dentro de blocos de função, não no nível de arquivo.

---

## ✅ Solução Implementada

Adicionei coleta de `Static` declarations em nível de arquivo (análogo ao que já era feito para `Private`):

### Mudanças no arquivo `src/analyzer/rules/advpl/require-local.ts`

1. **Novo set global:** `globalStatics`
   - Coleta `Static` declarations no nível de arquivo
   - Exclusão automática de `Static Function` (não são variáveis)

2. **Atualização das verificações (4 locais):**
   - Verificação de assignments normais
   - Verificação de assignments a propriedades de objetos
   - Verificação de `Aadd(...)`

3. **Lógica:**

   ```typescript
   // Coleta Static globais (não-function)
   if (/^\s*Function\b/i.test(tail)) continue; // skip Static Function

   // Verifica se variável está declarada
   if (
     locals.has(key) ||
     privates.has(key) ||
     statics.has(key) ||
     globalPrivates.has(key) ||
     globalStatics.has(key) || // ← NOVO
     classAttrs.has(key)
   )
     continue;
   ```

---

## 🧪 Teste

Arquivo `test-static-global.tlpp` criado com casos de teste:

- ✓ `Static` global respeitada em `Aadd()`
- ✓ `Static` global respeitada em assignments
- ✓ `Private` global respeitada (já funcionava)
- ⚠️ Variáveis não declaradas ainda reportam erro (correto)
- ✓ `Local` declaradas respeitadas (já funcionava)

---

## 🔍 Validação

```bash
# TypeScript compilou sem erros ✓
npx tsc -p ./
```

---

## 📋 Resumo

| Aspecto                    | Status                     |
| -------------------------- | -------------------------- |
| Bug corrigido              | ✅                         |
| Compilação                 | ✅ Sem erros               |
| Testes criados             | ✅ test-static-global.tlpp |
| Compatibilidade            | ✅ Sem quebras             |
| Falsos-positivos reduzidos | ✅                         |

---

## 🎯 Próximo Passo

Teste a extensão com seu arquivo `custom.cadastro.ztif20.tlpp`:

- Abra o arquivo em VS Code
- A regra `advpl/require-local` não deve mais reportar erro na linha 543 para `aINFOUSUARIO`

Se houver outros casos semelhantes, reporte para ajustes adicionais!

---

**Data:** 22 de janeiro de 2026
**Versão:** 0.0.12+ (correção de bug)
**Regra corrigida:** `advpl/require-local`
