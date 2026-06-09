# Análise de Problemas - Frontend /workspace

**Data da Análise**: 2026-01-06  
**Escopo**: `/apps/web/src/app/(app)/workspace/` e componentes relacionados

---

## 🔴 PROBLEMAS CRÍTICOS (Alta Prioridade)

### 1. Objetos Vazios em Transformação de Dados
**Arquivo**: `lib/queries/area-trabalho.ts` (Linhas 50-90)
**Problema**:
```typescript
return {
  ...renovacao,
  cliente: renovacao.documentoVendaAnterior?.cliente || {}, // ❌ Objeto vazio
  produto: renovacao.documentoVendaAnterior?.produto || {},  // ❌ Pode quebrar UI
```
**Impacto**: UI espera propriedades como `cliente.nome`, `cliente.tipoPessoa` - pode crashar
**Solução**: Retornar `null` e adicionar verificações null-safe na UI

---

### 2. Validação de NaN Ausente em Formulários
**Arquivo**: `components/area-trabalho/novo-seguro-dialog.tsx` (Linha 68)
**Problema**:
```typescript
premioEstimado: data.premioEstimado?.trim() !== '' 
  ? parseFloat(data.premioEstimado) // ❌ Sem verificação de NaN
  : undefined,
```
**Impacto**: `parseFloat('abc')` retorna `NaN` - dados inválidos enviados à API
**Solução**: Adicionar validação `isNaN()` antes de enviar

---

### 3. Tabelas Sem Paginação
**Arquivos**: 
- `components/area-trabalho/cotacoes-ativas-table.tsx`
- `components/area-trabalho/propostas-ativas-table.tsx`

**Problema**: Renderiza todos os itens sem paginação
**Impacto**: Performance ruim com +100 registros
**Solução**: Implementar paginação server-side ou client-side

---

## 🟡 PROBLEMAS MODERADOS (Média Prioridade)

### 4. Código Morto no CotacaoDialog
**Arquivo**: `components/area-trabalho/cotacao-dialog.tsx` (Linhas 200-330)
**Problema**:
```typescript
{false && (
  <TabsContent value="confirmar" className="space-y-6 mt-4">
    {/* 130+ linhas de código que nunca executam */}
  </TabsContent>
)}
```
**Impacto**: Confusão na manutenção, arquivo inchado
**Solução**: Remover bloco inteiro ou implementar funcionalidade

---

### 5. Lógica de Data Duplicada
**Arquivos**: 
- `components/area-trabalho/cotacoes-ativas-table.tsx`
- `components/area-trabalho/renovacoes-pendentes-card.tsx`
- Outros componentes

**Problema**: Cálculo de "dias para vencimento" repetido 3+ vezes
```typescript
const diasValidade = Math.ceil(
  (new Date(cotacao.dataValidade).getTime() - Date.now()) /
    (1000 * 60 * 60 * 24)
);
```
**Solução**: Extrair para função utilitária `calculateDaysUntil(date)`

---

### 6. Strings Mágicas para Status
**Problema**: Status verificados com strings literais
```typescript
if (cotacao.status === 'EM_ELABORACAO') // ❌ Magic string
if (renovacao.status !== 'PENDENTE')
```
**Solução**: Criar arquivo de constantes
```typescript
// libs/shared/types/src/status-constants.ts
export const STATUS_COTACAO = {
  EM_ELABORACAO: 'EM_ELABORACAO',
  ATIVA: 'ATIVA',
  PERDIDA: 'PERDIDA',
  // ...
} as const;
```

---

### 7. Loading States Ausentes em Mutações
**Arquivo**: `components/area-trabalho/cotacao-dialog.tsx`
**Problema**: Sem feedback visual durante submit do formulário
```typescript
const handleConfirmarVenda = () => {
  confirmarVenda(cotacao.id, { // ❌ Sem loading spinner
    onSuccess: () => {
      toast.success('Venda confirmada!');
```
**Solução**: Usar `mutation.isPending` para mostrar loading

---

### 8. Router no Modal (Acoplamento)
**Arquivo**: `components/area-trabalho/cotacao-dialog.tsx` (Linha 196)
**Problema**:
```typescript
const router = useRouter();
// ...
router.push('/cadastro'); // ❌ Modal não deveria saber sobre rotas
```
**Solução**: Passar callback `onSuccessRedirect` via props

---

## 🟢 MELHORIAS RECOMENDADAS (Baixa Prioridade)

### 9. Sem Debouncing em Busca de Clientes
**Arquivo**: `components/area-trabalho/novo-seguro-dialog.tsx`
**Problema**: Busca dispara a cada keystroke
**Solução**: Adicionar debounce de 300ms com `useDebouncedValue`

---

### 10. Tratamento de Erros Genérico
**Problema**: Mensagens de erro não específicas
```typescript
toast.error('Erro ao atualizar cotação. Tente novamente.');
```
**Solução**: Extrair mensagem do backend
```typescript
toast.error(error?.response?.data?.message || 'Erro ao atualizar cotação');
```

---

### 11. Falta de Atributos de Acessibilidade
**Problema**: Tabelas sem `aria-label`, navegação por teclado
**Solução**: Adicionar ARIA attributes apropriados

---

### 12. Textos Hardcoded (i18n)
**Problema**: Strings em português direto no código
**Solução**: Criar sistema de i18n (mesmo que só pt-BR por enquanto)

---

## ✅ PONTOS POSITIVOS IDENTIFICADOS

- ✅ Boa separação de responsabilidades (pages → components → queries)
- ✅ Uso consistente de TypeScript com interfaces
- ✅ Padrão de modais para CRUD evita navegação excessiva
- ✅ Validação de forms com Zod + react-hook-form
- ✅ Componentes shadcn/ui (acessíveis por padrão)
- ✅ Loading states com skeletons
- ✅ Estados vazios bem tratados

---

## 📁 ARQUIVOS PRINCIPAIS AFETADOS

```
apps/web/src/
├── app/(app)/workspace/page.tsx                  [Leve refactor]
├── components/area-trabalho/
│   ├── cotacao-dialog.tsx                        [🔴 Crítico - remover código morto]
│   ├── novo-seguro-dialog.tsx                    [🔴 Crítico - NaN validation]
│   ├── cotacoes-ativas-table.tsx                 [🟡 Moderado - paginação, utils]
│   ├── renovacoes-pendentes-card.tsx             [🟡 Moderado - utils]
│   └── propostas-ativas-table.tsx                [🟡 Moderado - paginação]
└── lib/
    ├── queries/area-trabalho.ts                  [🔴 Crítico - null-safety]
    └── utils/                                    [Novo - criar date-utils.ts]
```

---

**Próximos Passos Recomendados**:
1. Revisar e aprovar este relatório
2. Criar issues/tickets individuais no sistema de gestão
3. Priorizar correções críticas
4. Implementar quick wins em sprint dedicado
