# 🐛 Relatório de Bugs - Sistema de Cotações

**Data**: 2026-01-06  
**Prioridade**: 🔴 CRÍTICA

---

## 🔴 BUG #1: Cotação não salva produto, vigência e valores

### Descrição
Ao criar uma nova cotação através do formulário "Novo Seguro", os seguintes campos não são persistidos:
- Produto
- Vigência (início e fim)
- Prêmio estimado
- Prêmio líquido

### Status Atual
✅ **Frontend validado**: Código correto
❓ **Backend**: Requer investigação

### Análise Frontend

#### Payload Enviado
```typescript
// Arquivo: apps/web/src/components/area-trabalho/novo-seguro-dialog.tsx
const payload = {
  clienteId: "uuid",           // ✅ Correto
  produtoId: "uuid",           // ✅ Correto
  situacao: "NOVO",            // ✅ Correto
  vigenciaInicio: "2026-01-15", // ✅ Correto (ISO date)
  vigenciaFim: "2027-01-15",    // ✅ Correto (ISO date)
  premioEstimado: 1500.00,      // ✅ Correto (number | undefined)
  premioLiquido: 1450.00,       // ✅ Correto (number | undefined)
  dataValidade: "2026-02-06",   // ✅ Correto (calculado +30 dias)
  observacoes: "...",           // ✅ Correto
};

console.log('📝 Dados do formulário:', payload); // Debug ativo
await onCriar(payload); // Chama handleCriarNovoSeguro
```

#### Mutation Executada
```typescript
// Arquivo: apps/web/src/lib/queries/area-trabalho.ts
export function useCriarCotacao() {
  return useMutation({
    mutationFn: async (data: any) => {
      return api.post('/cotacoes', data); // ✅ POST correto
    },
    onSuccess: () => {
      // ✅ Invalida cache corretamente
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
    },
  });
}
```

### 🎯 Diagnóstico
O frontend está **100% correto**. O bug está no backend.

### 🔍 Investigação Backend Necessária

#### 1. Verificar Controller/Route
```typescript
// Arquivo provável: apps/api/src/controllers/cotacoes.controller.ts
// ou: apps/api/src/routes/cotacoes.routes.ts

// O que verificar:
POST /cotacoes
- O controller está recebendo todos os campos?
- Há log dos dados recebidos?
- Existe validação de schema (Zod/Joi)?
```

#### 2. Verificar DTO/Schema
```typescript
// Verificar se o DTO está completo:
interface CreateCotacaoDTO {
  clienteId: string;
  produtoId: string;        // ⚠️ Campo pode estar faltando
  situacao: string;
  vigenciaInicio: string;   // ⚠️ Campo pode estar faltando
  vigenciaFim: string;      // ⚠️ Campo pode estar faltando
  premioEstimado?: number;  // ⚠️ Campo pode estar faltando
  premioLiquido?: number;   // ⚠️ Campo pode estar faltando
  dataValidade: string;
  observacoes?: string;
}
```

#### 3. Verificar Prisma Model
```prisma
// Arquivo: apps/api/prisma/schema.prisma
model Cotacao {
  id              String   @id @default(uuid())
  clienteId       String
  produtoId       String   // ⚠️ Verificar se existe
  situacao        String
  vigenciaInicio  DateTime // ⚠️ Verificar se existe
  vigenciaFim     DateTime // ⚠️ Verificar se existe
  premioEstimado  Float?   // ⚠️ Verificar se existe
  premioLiquido   Float?   // ⚠️ Verificar se existe
  dataValidade    DateTime
  observacoes     String?
  
  cliente         Cliente  @relation(...)
  produto         Produto  @relation(...) // ⚠️ Verificar relação
}
```

#### 4. Verificar Chamada Prisma
```typescript
// No service/repository:
await prisma.cotacao.create({
  data: {
    clienteId: data.clienteId,
    produtoId: data.produtoId,       // ⚠️ Pode estar faltando
    vigenciaInicio: data.vigenciaInicio, // ⚠️ Pode estar faltando
    vigenciaFim: data.vigenciaFim,       // ⚠️ Pode estar faltando
    premioEstimado: data.premioEstimado, // ⚠️ Pode estar faltando
    premioLiquido: data.premioLiquido,   // ⚠️ Pode estar faltando
    // ...
  },
});
```

### 🛠️ Passos para Resolver

1. **Adicionar logs no backend**:
```typescript
// No controller de POST /cotacoes
console.log('📥 Dados recebidos:', req.body);
```

2. **Verificar resposta do banco**:
```typescript
const cotacao = await prisma.cotacao.create({ data });
console.log('💾 Cotação criada:', cotacao);
```

3. **Verificar migrations**:
```bash
cd apps/api
npx prisma migrate status
# Se houver migrations pendentes:
npx prisma migrate deploy
```

4. **Verificar schema atualizado**:
```bash
npx prisma generate
```

### 📋 Checklist de Verificação Backend

- [ ] Controller recebe todos os campos do payload?
- [ ] DTO/Schema inclui `produtoId`, `vigenciaInicio`, `vigenciaFim`, `premioEstimado`, `premioLiquido`?
- [ ] Model Prisma tem todos os campos necessários?
- [ ] Migrations estão aplicadas?
- [ ] Prisma Client foi regenerado após mudanças no schema?
- [ ] Service/Repository passa todos os campos para `prisma.cotacao.create()`?
- [ ] Não há transformação de dados que remove campos?

---

## 🔴 BUG #2: Visualização não mostra dados (mas edição mostra)

### Descrição
Ao visualizar uma cotação (modo "view"), os dados não aparecem, mas ao clicar em "editar" os dados estão presentes.

### Análise Frontend

#### Componente CotacaoDialog
```typescript
// Arquivo: apps/web/src/components/area-trabalho/cotacao-dialog.tsx

// Modo Visualização (linhas ~295-370)
{mode === 'view' ? (
  <div className="space-y-4">
    <p className="font-medium">{nomeCliente}</p>  // ✅ Acessa cotacao.cliente
    <p className="font-medium">{cotacao.produto.nome}</p> // ⚠️ Problema aqui?
    <p>{new Date(cotacao.vigenciaInicio).toLocaleDateString('pt-BR')}</p>
  </div>
) : (
  // Modo Edição (linhas ~370-500)
  <Form {...form}>
    <FormField name="produtoId" value={form.getValues('produtoId')} />
    // ✅ Formulário popula valores corretamente
  </Form>
)}
```

### 🎯 Possíveis Causas

#### Causa #1: Dados não retornados pelo GET
```typescript
// Endpoint: GET /cotacoes/:id
// Backend pode não estar incluindo relações:

// ❌ Errado:
const cotacao = await prisma.cotacao.findUnique({
  where: { id },
  // Faltando include
});

// ✅ Correto:
const cotacao = await prisma.cotacao.findUnique({
  where: { id },
  include: {
    cliente: true,  // ⚠️ Verificar se existe
    produto: true,  // ⚠️ Verificar se existe
  },
});
```

#### Causa #2: Dados salvos como NULL
Se o Bug #1 não foi corrigido, os campos estão NULL no banco:
```sql
SELECT * FROM "Cotacao" WHERE id = '...';
-- produtoId: NULL ❌
-- vigenciaInicio: NULL ❌
-- vigenciaFim: NULL ❌
```

#### Causa #3: Rendering Condicional
```typescript
// Se cotacao.produto for null/undefined:
{cotacao.produto?.nome || 'Produto não informado'} // ✅ Safe rendering
```

### 🛠️ Passos para Resolver

1. **Verificar resposta da API**:
```typescript
// No frontend, adicionar log:
const handleVisualizarCotacao = (cotacao: Cotacao) => {
  console.log('👁️ Visualizar cotação:', cotacao);
  console.log('   - Produto:', cotacao.produto);
  console.log('   - Vigência:', cotacao.vigenciaInicio, cotacao.vigenciaFim);
  setSelectedCotacao(cotacao);
  setCotacaoMode('view');
};
```

2. **Verificar backend**:
```typescript
// GET /cotacoes/:id
const cotacao = await prisma.cotacao.findUnique({
  where: { id },
  include: {
    cliente: true,
    produto: true, // ⚠️ ESSENCIAL
    vendedor: true,
  },
});

console.log('📤 Cotação enviada:', cotacao);
```

3. **Adicionar fallbacks no componente**:
```typescript
// No CotacaoDialog modo 'view':
<p className="font-medium">
  {cotacao.produto?.nome || '⚠️ Produto não informado'}
</p>
<p>
  {cotacao.vigenciaInicio 
    ? new Date(cotacao.vigenciaInicio).toLocaleDateString('pt-BR')
    : '⚠️ Data não informada'
  }
</p>
```

### 📋 Checklist de Verificação

- [ ] GET `/cotacoes/:id` inclui `include: { produto: true }`?
- [ ] Dados realmente existem no banco (não são NULL)?
- [ ] Frontend loga a resposta da API corretamente?
- [ ] Componente tem fallbacks para dados ausentes?
- [ ] TypeScript types estão corretos (produto é opcional?)

---

## 🟡 OUTRAS TAREFAS IDENTIFICADAS

### 1. Fluxo de Status
- [ ] **Perdido**: Remover de "Renovações Pendentes" → Mover para histórico
- [ ] **Cancelado**: Mover para cadastro/histórico
- [ ] **Endosso**: Implementar fluxo específico

### 2. Dashboard
- [ ] Avaliar remoção de "Vendas e Renovações próximos 45 dias"
- [ ] Cotações convertidas devem sair de "Cotações Ativas"
- [ ] Implementar histórico de 60 dias em "Convertidos"

### 3. Múltiplos Vendedores
- [ ] Modelar `CotacaoVendedor` many-to-many
- [ ] UI para adicionar/remover vendedores
- [ ] Regras de comissão compartilhada

---

## 🔧 AÇÕES IMEDIATAS RECOMENDADAS

### Prioridade 1 (Crítica)
1. ✅ Adicionar logs detalhados no backend (POST e GET cotações)
2. ✅ Verificar se migrations estão aplicadas
3. ✅ Confirmar que Prisma Client está atualizado
4. ✅ Testar criação de cotação via Postman/Insomnia

### Prioridade 2 (Alta)
5. ✅ Corrigir controller/service para salvar todos os campos
6. ✅ Adicionar `include` no GET de cotações
7. ✅ Adicionar fallbacks no frontend para dados ausentes
8. ✅ Implementar testes automatizados para CRUD de cotações

### Prioridade 3 (Média)
9. ⏳ Implementar transições de status
10. ⏳ Refatorar dashboard conforme solicitado
11. ⏳ Adicionar histórico de 60 dias

---

## 📝 COMO TESTAR

### Teste Manual
```bash
# 1. Criar cotação via UI
- Preencher TODOS os campos
- Verificar console.log no navegador (payload)
- Submeter formulário

# 2. Verificar no backend
- Checar logs do servidor
- Conectar no banco e consultar:
SELECT * FROM "Cotacao" ORDER BY "criadoEm" DESC LIMIT 1;

# 3. Visualizar cotação
- Clicar em "Visualizar" na tabela
- Verificar se dados aparecem
- Comparar com modo "Editar"
```

### Teste com cURL
```bash
# Criar cotação
curl -X POST http://localhost:3001/cotacoes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "clienteId": "uuid-do-cliente",
    "produtoId": "uuid-do-produto",
    "situacao": "NOVO",
    "vigenciaInicio": "2026-01-15",
    "vigenciaFim": "2027-01-15",
    "premioEstimado": 1500.00,
    "premioLiquido": 1450.00,
    "dataValidade": "2026-02-06"
  }'

# Buscar cotação
curl -X GET http://localhost:3001/cotacoes/{id} \
  -H "Authorization: Bearer {token}"
```

---

**Próximos Passos**: Investigar e corrigir backend conforme checklists acima.
