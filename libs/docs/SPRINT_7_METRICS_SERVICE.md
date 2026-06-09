# Sprint 7 - Storage Metrics Service - Implementado

## 📋 Resumo da Implementação

O Storage Metrics Service foi implementado com sucesso, fornecendo monitoramento completo de uso de storage, limites, custos e histórico para todas as corretoras do sistema.

## ✅ Funcionalidades Implementadas

### 1. MetricsService - Métodos Principais

**Arquivo:** `libs/shared/storage/src/metrics.service.ts`

#### Métodos Implementados:

**1. `calculateCurrentUsage(corretoraId)`**
- Calcula uso atual de storage
- Retorna total de arquivos e bytes
- Agrupa por tipo (cotações, documentos, chat)
- Usa queries otimizadas com GROUP BY

**2. `createDailySnapshot(corretoraId, data?)`**
- Cria snapshot diário de métricas
- Calcula delta (arquivos/bytes adicionados e removidos)
- Calcula custo estimado mensal
- Upsert: atualiza se já existe snapshot do dia

**3. `createDailySnapshotsForAll()`**
- Cria snapshots para todas as corretoras
- Processa em loop com tratamento de erros
- Retorna array de snapshots criados

**4. `getHistoricalData(corretoraId, days)`**
- Busca métricas históricas (últimos N dias)
- Retorna snapshots ordenados por data

**5. `checkLimits(corretoraId)`**
- Verifica limites de storage
- Cria limites padrão se não existir (5GB, 10mil arquivos)
- Retorna status com alertas e bloqueios
- Calcula percentual de uso

**6. `getGlobalOverview()`**
- Visão global de todas as corretoras
- Agrega dados dos snapshots mais recentes
- Retorna totais e top 10 corretoras por uso

**7. `getLargestFiles(corretoraId, limit)` ✨ NOVO**
- Lista maiores arquivos de uma corretora
- Inclui dados do usuário que fez upload
- Retorna com tamanho formatado

**8. `getUsageHistory(corretoraId, days)` ✨ NOVO**
- Histórico de uso com crescimento
- Calcula delta de bytes e arquivos
- Ordenado por data

**9. `calculateCosts(corretoraId)` ✨ NOVO**
- Calcula custos detalhados de R2
- Estimativa de operações (writes/reads)
- Breakdown completo: storage, writes, reads, egress
- Baseado no pricing R2 de 2024

**10. `formatBytes(bytes)` ✨ NOVO**
- Formata bytes para formato legível
- Retorna string com unidade apropriada (B, KB, MB, GB, TB)

### 2. Middleware de Validação de Limites

**Arquivo:** `libs/plugins/quota-validator/src/index.ts`

**Modificações:**
- ✅ Adicionado tipo `'storage'` ao `QuotaType`
- ✅ Importado `MetricsService`
- ✅ Novo case para validar limites de storage
- ✅ Lança `QuotaExceededError` quando shouldBlock = true

**Uso:**
```typescript
await fastify.validateQuota(corretoraId, 'storage');
```

### 3. Rotas de Admin

**Arquivo:** `apps/api/src/routes/admin/metrics.ts`

#### Rotas Existentes (Verificadas):
- ✅ GET `/api/admin/storage/overview` - Visão global
- ✅ GET `/api/admin/tenants` - Lista tenants com uso
- ✅ GET `/api/admin/tenants/:id/usage` - Uso detalhado
- ✅ GET `/api/admin/tenants/:id/usage/history` - Histórico

#### Rotas Adicionadas:
- ✅ GET `/api/admin/tenants/:id/largest-files` - Maiores arquivos
- ✅ GET `/api/admin/tenants/:id/costs` - Custos detalhados
- ✅ POST `/api/admin/tenants/:id/snapshot` - Criar snapshot manual
- ✅ POST `/api/admin/snapshot-all` - Criar snapshots para todos

**Autenticação:**
- Requer autenticação de admin
- Permissões: `view_usage`, `manage_limits`
- Logs de auditoria em todas as ações

### 4. Rotas para Corretoras

**Arquivo:** `apps/api/src/routes/metricas/index.ts`

#### Rotas Adicionadas:

**1. GET `/api/metricas/storage`**
- Métricas de storage da corretora autenticada
- Uso atual total e por tipo
- Status de limites
- Top 10 maiores arquivos
- Valores formatados

**Response:**
```json
{
  "usage": {
    "totalFiles": 150,
    "totalBytes": 524288000,
    "byType": {
      "cotacoes": {
        "bytes": 209715200,
        "formatted": "200.00 MB"
      },
      "documentos": {
        "bytes": 262144000,
        "formatted": "250.00 MB"
      },
      "chat": {
        "bytes": 52428800,
        "formatted": "50.00 MB"
      }
    },
    "formatted": "500.00 MB"
  },
  "limits": {
    "ok": true,
    "shouldAlert": false,
    "shouldBlock": false,
    "percentUsed": 9.54,
    "bytesUsed": 524288000,
    "bytesLimit": 5497558138,
    "arquivosUsados": 150,
    "arquivosLimit": 10000
  },
  "largestFiles": [...]
}
```

**2. GET `/api/metricas/storage/history?days=30`**
- Histórico de uso (últimos N dias)
- Crescimento de bytes e arquivos

**Response:**
```json
{
  "history": [
    {
      "data": "2024-01-15",
      "totalBytes": 524288000,
      "totalArquivos": 150,
      "crescimentoBytes": 10485760,
      "crescimentoArquivos": 5
    }
  ],
  "days": 30
}
```

**3. GET `/api/metricas/storage/costs`**
- Custos estimados de R2
- Breakdown detalhado

**Response:**
```json
{
  "costs": {
    "storageGB": 0.5,
    "storageCostMonthly": 0.0075,
    "estimatedWrites": 300,
    "estimatedReads": 1500,
    "operationsCostMonthly": 0.00189,
    "totalCostMonthly": 0.00939,
    "breakdown": {
      "storage": 0.0075,
      "writes": 0.00135,
      "reads": 0.00054,
      "egress": 0
    },
    "storageFormatted": "500.00 MB"
  }
}
```

## 📊 Estrutura de Dados

### StorageUsageSnapshot
```typescript
interface StorageUsageSnapshot {
  corretoraId: string;
  data: Date;
  totalArquivos: number;
  totalBytes: number;
  totalBytesCotacoes: number;
  totalBytesDocumentos: number;
  totalBytesChat: number;
  arquivosAdicionados: number;
  arquivosRemovidos: number;
  bytesAdicionados: number;
  bytesRemovidos: number;
  custoEstimadoMensal: number;
}
```

### LimitStatus
```typescript
interface LimitStatus {
  ok: boolean;
  shouldAlert: boolean;
  shouldBlock: boolean;
  percentUsed: number;
  bytesUsed: number;
  bytesLimit: number;
  arquivosUsados: number;
  arquivosLimit: number;
}
```

## 💰 Pricing R2 (2024)

```typescript
const R2_PRICING = {
  STORAGE_PER_GB: 0.015,        // $0.015/GB/month
  CLASS_A_PER_MILLION: 4.5,     // $4.50/million writes
  CLASS_B_PER_MILLION: 0.36,    // $0.36/million reads
  EGRESS: 0,                    // FREE!
};
```

## 🔒 Limites Padrão

Quando uma corretora não tem limites configurados:

```typescript
{
  limiteBytes: 5 * 1024 * 1024 * 1024,  // 5GB
  limiteArquivos: 10000,
  alertarEm: '80.00',                   // 80%
  bloquearUploadEm: '95.00',            // 95%
}
```

## 🔄 Fluxos de Uso

### 1. Validação de Limite antes do Upload

```typescript
// Em qualquer rota de upload
fastify.addHook('preHandler', async (request, reply) => {
  await fastify.validateQuota(request.corretoraId, 'storage');
});
```

Se limite atingido:
```json
{
  "error": "Limite de storage atingido (95.5% usado)",
  "details": {
    "limite": 5368709120,
    "atual": 5126170624,
    "tipo": "storage",
    "percentUsed": 95.5
  }
}
```

### 2. Consulta de Métricas pela Corretora

```bash
curl http://localhost:3000/api/metricas/storage \
  -H "Authorization: Bearer {token}" \
  -H "x-tenant-id: {corretoraId}"
```

### 3. Admin - Visão Global

```bash
curl http://localhost:3000/api/admin/storage/overview \
  -H "Authorization: Bearer {admin-token}"
```

### 4. Admin - Criar Snapshots Manuais

```bash
# Snapshot de uma corretora
curl -X POST http://localhost:3000/api/admin/tenants/{corretoraId}/snapshot \
  -H "Authorization: Bearer {admin-token}"

# Snapshot de todas
curl -X POST http://localhost:3000/api/admin/snapshot-all \
  -H "Authorization: Bearer {admin-token}"
```

## 🕐 Jobs Automáticos (Recomendados)

### 1. Snapshot Diário
```typescript
// Executar todo dia às 00:00
schedule('0 0 * * *', async () => {
  await MetricsService.createDailySnapshotsForAll();
});
```

### 2. Verificação de Limites
```typescript
// Executar a cada 6 horas
schedule('0 */6 * * *', async () => {
  const corretoras = await db.select().from(corretoras);
  
  for (const corretora of corretoras) {
    const limitStatus = await MetricsService.checkLimits(corretora.id);
    
    if (limitStatus.shouldAlert) {
      await sendAlertEmail(corretora, limitStatus);
    }
  }
});
```

## 📁 Arquivos Modificados/Criados

1. **`libs/shared/storage/src/metrics.service.ts`**
   - Métodos adicionados: getLargestFiles, getUsageHistory, calculateCosts, formatBytes

2. **`libs/plugins/quota-validator/src/index.ts`**
   - Adicionado suporte para validação de storage

3. **`apps/api/src/routes/admin/metrics.ts`**
   - Rotas adicionadas: largest-files, costs, snapshot, snapshot-all

4. **`apps/api/src/routes/metricas/index.ts`**
   - Rotas adicionadas: /storage, /storage/history, /storage/costs

## 🧪 Exemplos de Uso

### 1. Consultar Uso Atual (Corretora)

```bash
curl http://localhost:3000/api/metricas/storage \
  -H "Authorization: Bearer {token}"
```

### 2. Consultar Histórico (Corretora)

```bash
curl http://localhost:3000/api/metricas/storage/history?days=30 \
  -H "Authorization: Bearer {token}"
```

### 3. Consultar Custos (Corretora)

```bash
curl http://localhost:3000/api/metricas/storage/costs \
  -H "Authorization: Bearer {token}"
```

### 4. Admin - Visão Global

```bash
curl http://localhost:3000/api/admin/storage/overview \
  -H "Authorization: Bearer {admin-token}"
```

### 5. Admin - Maiores Arquivos de um Tenant

```bash
curl http://localhost:3000/api/admin/tenants/{corretoraId}/largest-files?limit=20 \
  -H "Authorization: Bearer {admin-token}"
```

### 6. Admin - Custos de um Tenant

```bash
curl http://localhost:3000/api/admin/tenants/{corretoraId}/costs \
  -H "Authorization: Bearer {admin-token}"
```

## 📈 Métricas Calculadas

### Uso por Tipo
- **Cotações**: Anexos vinculados a cotações
- **Documentos**: Anexos vinculados a documentos de venda
- **Chat**: Anexos enviados no chat

### Crescimento
- **Arquivos Adicionados**: Diferença positiva entre snapshots
- **Bytes Adicionados**: Diferença positiva de tamanho
- **Arquivos Removidos**: Diferença negativa entre snapshots
- **Bytes Removidos**: Diferença negativa de tamanho

### Custos
- **Storage**: $0.015/GB/mês
- **Writes**: $4.50/milhão de operações
- **Reads**: $0.36/milhão de operações
- **Egress**: GRÁTIS (R2)

## ✨ Status Final

**✅ Implementação 100% completa**

- Todos os métodos do MetricsService implementados
- Middleware de validação de limites funcionando
- Rotas de admin completas
- Rotas para corretoras implementadas
- Formatação de bytes implementada
- Cálculo de custos implementado
- Histórico de uso implementado
- Maiores arquivos implementado

## 🚀 Próximos Passos Sugeridos

1. **Jobs Automáticos:**
   - Implementar worker para snapshots diários
   - Implementar verificação automática de limites
   - Implementar alertas por email

2. **Alertas:**
   - Email quando atingir 80% do limite
   - Email quando atingir 95% do limite
   - Notificação in-app

3. **Relatórios:**
   - Relatório mensal de custos
   - Relatório de crescimento
   - Projeções de uso futuro

4. **Otimizações:**
   - Cache de métricas frequentes
   - Agregação pré-calculada
   - Índices otimizados

## 📝 Notas Importantes

1. **Limites Padrão:** Se não configurados, usa 5GB e 10mil arquivos
2. **Ilimitado:** Se limiteBytes ou limiteArquivos = null, não há validação
3. **Snapshots:** Recomendado executar diariamente via cron job
4. **Custos:** São estimativas baseadas em uso médio
5. **Performance:** Queries otimizadas com GROUP BY e agregações SQL
