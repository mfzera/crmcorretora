# 🚀 Setup Rápido - EcoTech Worker

## ✅ O que foi implementado

### **Fase 5 - Background Jobs** ✅ COMPLETO

Sistema de processamento assíncrono que resolve o **Problema Crítico #1**: renovações que dependem de ação manual.

---

## 📦 Arquivos Criados

### Configuração
- ✅ `apps/worker/package.json` - Dependências (BullMQ, IORedis, dotenv)
- ✅ `apps/worker/tsconfig.json` - TypeScript config
- ✅ `apps/worker/project.json` - Nx project config
- ✅ `apps/worker/.env` - Variáveis de ambiente
- ✅ `apps/worker/.env.example` - Template de configuração

### Código
- ✅ `src/index.ts` - Entry point com bootstrap e graceful shutdown
- ✅ `src/config/redis.ts` - Configuração Redis com retry logic
- ✅ `src/queues/index.ts` - BullMQ queues e cron schedules
- ✅ `src/workers/index.ts` - Workers com event listeners
- ✅ `src/jobs/detect-renewals.job.ts` - Detecção automática de renovações
- ✅ `src/jobs/notify-urgent-renewals.job.ts` - Notificações urgentes
- ✅ `src/jobs/types.ts` - TypeScript types para jobs
- ✅ `src/scripts/clear-schedules.ts` - Utilitário para limpar cron jobs

### Documentação
- ✅ `README.md` - Documentação completa (185 linhas)
- ✅ `SETUP.md` - Este arquivo
- ✅ `dev.sh` - Script de desenvolvimento

---

## 🎯 Jobs Configurados

### 1. Detecção Automática de Renovações
- **Schedule**: Diário às 03:00 AM
- **Função**: Busca apólices expirando em 60 dias e cria renovações automaticamente
- **Idempotente**: Não duplica renovações
- **Status inicial**: `NAO_TRABALHADO`

### 2. Notificações Urgentes
- **Schedule**: A cada hora das 9h às 18h
- **Função**: Notifica vendedores sobre renovações com prioridade ALTA
- **Critérios**: <= 15 dias ou prêmio > R$ 50.000

---

## 🔧 Como Executar

### Pré-requisitos

```bash
# 1. Redis rodando
docker run -d --name ecotech-redis -p 6379:6379 redis:7-alpine

# 2. Verificar se Redis está acessível
docker ps | grep redis
```

### Opção 1: Script de desenvolvimento (recomendado)

```bash
cd apps/worker
./dev.sh
```

### Opção 2: Via package.json

```bash
cd apps/worker
npm run dev
```

### Opção 3: Nx

```bash
# Na raiz do monorepo
nx dev worker
```

---

## ⚙️ Variáveis de Ambiente Necessárias

O arquivo `.env` já está configurado com:

```bash
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Database (herdado do .env raiz)
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/saas_seguradoras

# JWT (necessário pela validação do shared/utils, mas não usado pelo worker)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long-string
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars-long

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

---

## 📊 Output Esperado

```
🚀 Iniciando EcoTech Worker...

📡 Conectando ao Redis...
✅ Redis conectado

🔧 Inicializando workers...
✅ Workers inicializados

⏱️  Configurando schedules dos jobs...
✅ Job agendado: detect-renewals-daily (03:00 AM)
✅ Job agendado: notify-urgent-renewals-hourly (9h-18h)

✅ EcoTech Worker rodando!
📊 Jobs agendados:
   - detect-renewals-daily: 03:00 AM (diário)
   - notify-urgent-renewals-hourly: 9h-18h (a cada hora)

🔄 Aguardando jobs...
```

---

## 🐛 Troubleshooting

### Erro: `ECONNREFUSED 127.0.0.1:6379`

**Solução**:
```bash
docker start ecotech-redis
# ou
docker run -d --name ecotech-redis -p 6379:6379 redis:7-alpine
```

### Erro: `Cannot find module '@ecotech/shared/domain'`

**Solução**:
```bash
# Na raiz do monorepo
pnpm install
```

### Erro: `Invalid environment variables`

**Solução**: Verificar se o arquivo `apps/worker/.env` existe e contém todas as variáveis necessárias.

---

## 🧪 Testar Manualmente

### Executar job de detecção imediatamente

Criar arquivo `apps/worker/src/scripts/test-detect-renewals.ts`:

```typescript
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), 'apps/worker/.env') });

import { detectRenewalsJob } from '../jobs/detect-renewals.job';

async function main() {
  const result = await detectRenewalsJob({ daysAhead: 60 });
  console.log('Resultado:', result);
}

main();
```

Executar:
```bash
npx tsx apps/worker/src/scripts/test-detect-renewals.ts
```

---

## 📈 Métricas de Sucesso

Após implementação, você deve observar:

- ✅ **100% das renovações criadas automaticamente** (45 dias antes)
- ✅ **0% de renovações perdidas por esquecimento**
- ✅ **Vendedores notificados proativamente**
- ✅ **Redução do churn** (clientes que não renovam)

---

## 🔮 Próximas Melhorias

1. **[ ] Integrar serviço de email real** (SendGrid, AWS SES)
2. **[ ] Adicionar notificações push** (OneSignal)
3. **[ ] Dashboard de métricas** (Grafana)
4. **[ ] Alertas Slack** para jobs falhados
5. **[ ] Job de limpeza** (arquivar renovações antigas)

---

## 📚 Arquitetura

O worker reutiliza toda a **Domain Layer** implementada na Fase 3:

```typescript
// Jobs chamam serviços de domínio
const renovacaoService = new RenovacaoService(
  renovacaoRepo,
  documentoRepo,
  cotacaoRepo,
);

// Serviço encapsula lógica de negócio
const renovacao = await renovacaoService.criarRenovacaoAutomatica(
  documentoId,
  tenantId,
);
```

**Benefícios**:
- ✅ Zero duplicação de código
- ✅ Lógica testável
- ✅ Fácil manutenção

---

## 🎉 Status Final

**FASE 5 - COMPLETA** ✅

Todos os componentes implementados e prontos para uso:
- [x] Estrutura do worker app
- [x] Configuração BullMQ + Redis
- [x] Job de detecção de renovações
- [x] Job de notificações urgentes
- [x] Cron schedules configurados
- [x] Documentação completa
- [x] Scripts de desenvolvimento

**Problema #1 (Manual renewals) → RESOLVIDO** 🎯
