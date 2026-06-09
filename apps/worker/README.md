# 🔧 EcoTech Worker - Background Jobs System

Sistema de processamento assíncrono e agendamento de tarefas para o EcoTech SYS.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Jobs Implementados](#jobs-implementados)
- [Setup Local](#setup-local)
- [Configuração](#configuração)
- [Execução](#execução)
- [Monitoramento](#monitoramento)
- [Deploy](#deploy)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O Worker App resolve o **Problema Crítico #1** identificado no diagnóstico: **renovações que dependem de ação manual**.

### Antes (Manual):
1. Apólice entra em janela de renovação (45 dias antes do vencimento)
2. ❌ Nenhum registro de renovação é criado automaticamente
3. ❌ Vendedor precisa lembrar de criar manualmente
4. ❌ Risco de perda de receita por esquecimento

### Depois (Automatizado):
1. Apólice entra em janela de renovação
2. ✅ Job detecta automaticamente (diário às 03:00)
3. ✅ Registro de renovação criado com status `NAO_TRABALHADO`
4. ✅ Vendedor notificado (a cada hora 9h-18h)
5. ✅ Zero dependência de memória humana

---

## 🏗️ Arquitetura

```
apps/worker/
├── src/
│   ├── config/
│   │   └── redis.ts                    # Configuração Redis + retry logic
│   ├── jobs/
│   │   ├── detect-renewals.job.ts      # Job: detecção de renovações
│   │   ├── notify-urgent-renewals.job.ts # Job: notificações urgentes
│   │   └── types.ts                    # TypeScript types
│   ├── queues/
│   │   └── index.ts                    # Setup BullMQ queues + schedules
│   ├── workers/
│   │   └── index.ts                    # Workers que processam jobs
│   ├── scripts/
│   │   └── clear-schedules.ts          # Utilitário para limpar cron jobs
│   └── index.ts                        # Entry point
├── .env.example
├── package.json
└── README.md
```

### Stack Tecnológica

- **BullMQ**: Sistema de filas robusto com suporte a cron
- **Redis**: Backend para persistência de filas
- **IORedis**: Cliente Redis com retry strategy
- **TypeScript**: Type safety end-to-end
- **Domain Layer**: Reutiliza `@ecotech/shared/domain` (DDD)

---

## 📦 Jobs Implementados

### 1️⃣ Detecção Automática de Renovações

**Nome**: `detect-renewals-daily`  
**Schedule**: Diário às **03:00 AM**  
**Função**: `detectRenewalsJob()`

**O que faz:**
1. Busca documentos de venda ativos que expiram nos próximos 60 dias
2. Verifica se já existe registro de renovação (idempotente)
3. Se não existir, cria automaticamente via `renovacaoService.criarRenovacaoAutomatica()`
4. Loga resultados por tenant

**Regras de negócio:**
- Janela de renovação: 45 dias antes do vencimento
- Nova vigência: +1 ano a partir do término anterior
- Preserva: prêmio, comissão, coberturas, valor segurado
- Status inicial: `NAO_TRABALHADO`

**Parâmetros configuráveis:**
```typescript
{
  tenantId?: string;      // Opcional: processar tenant específico
  daysAhead?: number;     // Default: 60 dias
}
```

**Retorno:**
```typescript
{
  totalRenewalsCreated: number;
  tenantsProcessed: number;
  results: Array<{
    tenantId: string;
    renewalsCreated: number;
    documentsChecked: number;
    errors: string[];
  }>;
  executedAt: Date;
}
```

---

### 2️⃣ Notificações de Renovações Urgentes

**Nome**: `notify-urgent-renewals-hourly`  
**Schedule**: A cada hora das **9h às 18h** (horário comercial)  
**Função**: `notifyUrgentRenewalsJob()`

**O que faz:**
1. Busca renovações pendentes com prioridade ALTA ou vencendo em <= 15 dias
2. Agrupa por vendedor responsável
3. Envia notificação (email/SMS/push - placeholder implementado)
4. Registra estatísticas

**Critérios de urgência:**
- Prioridade ALTA: vence em <= 15 dias OU prêmio > R$ 50.000
- Dias <= threshold (default: 15)

**Parâmetros configuráveis:**
```typescript
{
  tenantId?: string;      // Opcional: processar tenant específico
  daysThreshold?: number; // Default: 15 dias
}
```

**Retorno:**
```typescript
{
  totalNotificationsSent: number;
  vendedoresNotified: number;
  urgentRenewals: number;
  results: Array<{
    tenantId: string;
    notificationsSent: number;
    urgentCount: number;
  }>;
  executedAt: Date;
}
```

---

## 🚀 Setup Local

### Pré-requisitos

1. **Redis** rodando localmente:

```bash
# Opção 1: Docker (recomendado)
docker run -d \
  --name ecotech-redis \
  -p 6379:6379 \
  redis:7-alpine

# Opção 2: Instalação nativa (Linux/Mac)
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# macOS
brew install redis
brew services start redis
```

2. **Banco de dados PostgreSQL** configurado (compartilhado com API)

### Instalação

```bash
# 1. Instalar dependências (na raiz do monorepo)
npm install

# 2. Configurar variáveis de ambiente
cd apps/worker
cp .env.example .env

# 3. Editar .env com suas configurações
nano .env
```

### Configuração `.env`

```bash
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=           # Deixar vazio se não tiver senha
REDIS_DB=0

# Database (herda do root .env se não especificado)
DATABASE_URL=postgresql://user:password@localhost:5432/ecotech

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

---

## ▶️ Execução

### Desenvolvimento (com watch mode)

```bash
cd apps/worker
npm run dev
```

### Produção

```bash
# 1. Build
npm run build

# 2. Executar
npm start
```

### Scripts Úteis

```bash
# Limpar schedules antigos (útil se mudou cron pattern)
npm run clear-schedules
```

---

## 📊 Monitoramento

### Logs do Console

O worker emite logs estruturados:

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

### Quando um job executa:

```
🔄 Processando job: detect-renewals-daily [job-id-12345]
📊 Data: { daysAhead: 60 }
✅ Job concluído: detect-renewals-daily em 2340ms
📈 Resultado: {
  totalRenewalsCreated: 15,
  tenantsProcessed: 3,
  ...
}
```

### BullMQ Board (opcional)

Instalar UI para monitoramento visual:

```bash
npm install -g bull-board

# Executar
npx bull-board
```

Acesse `http://localhost:3000` para ver:
- Jobs ativos, completados, falhados
- Retry attempts
- Logs detalhados
- Métricas de performance

---

## 🚢 Deploy

### Docker

```dockerfile
# apps/worker/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY apps/worker ./apps/worker
COPY libs ./libs

# Install dependencies
RUN npm install --production

# Build worker
WORKDIR /app/apps/worker
RUN npm run build

# Run
CMD ["npm", "start"]
```

### Docker Compose

```yaml
# docker-compose.yml (adicionar ao existente)
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  worker:
    build:
      context: .
      dockerfile: apps/worker/Dockerfile
    depends_on:
      redis:
        condition: service_healthy
      db:
        condition: service_healthy
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - DATABASE_URL=${DATABASE_URL}
      - NODE_ENV=production
    restart: unless-stopped

volumes:
  redis-data:
```

### Kubernetes

```yaml
# k8s/worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ecotech-worker
spec:
  replicas: 1  # Apenas 1 instância (schedules não duplicam)
  selector:
    matchLabels:
      app: ecotech-worker
  template:
    metadata:
      labels:
        app: ecotech-worker
    spec:
      containers:
      - name: worker
        image: ecotech/worker:latest
        env:
        - name: REDIS_HOST
          value: "redis-service"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
```

### PM2 (VPS tradicional)

```bash
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'ecotech-worker',
    script: './dist/index.js',
    cwd: '/var/www/ecotech/apps/worker',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/log/ecotech/worker-error.log',
    out_file: '/var/log/ecotech/worker-out.log',
  }]
};

# Executar
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 🐛 Troubleshooting

### Erro: `ECONNREFUSED 127.0.0.1:6379`

**Causa**: Redis não está rodando

**Solução**:
```bash
# Verificar se Redis está rodando
redis-cli ping
# Deve retornar: PONG

# Se não estiver, iniciar
docker start ecotech-redis
# ou
brew services start redis
```

---

### Erro: Job duplicado executando 2x

**Causa**: Schedule foi adicionado múltiplas vezes (restart sem clear)

**Solução**:
```bash
npm run clear-schedules
# Depois reiniciar worker
npm run dev
```

---

### Jobs não executam no horário esperado

**Causa**: Timezone incorreto ou cron pattern errado

**Verificar**:
```bash
# Timezone do container/servidor
date
timedatectl  # Linux

# Validar cron pattern
# Usar: https://crontab.guru/
```

**Ajustar** no `queues/index.ts`:
```typescript
repeat: {
  pattern: '0 3 * * *',
  tz: 'America/Sao_Paulo',  // Adicionar timezone
}
```

---

### Performance: Jobs muito lentos

**Otimizações**:

1. **Aumentar concorrência** (`workers/index.ts`):
```typescript
new Worker('renewals-detection', processor, {
  concurrency: 3,  // Processar 3 jobs em paralelo
});
```

2. **Particionar por tenant**:
```typescript
// Em vez de 1 job para todos os tenants
await queue.add('detect-renewals-tenant-1', { tenantId: 'tenant-1' });
await queue.add('detect-renewals-tenant-2', { tenantId: 'tenant-2' });
```

3. **Usar Redis Cluster** (produção):
```typescript
connection: {
  host: 'redis-cluster',
  sentinels: [
    { host: 'sentinel-1', port: 26379 },
    { host: 'sentinel-2', port: 26379 },
  ],
  name: 'mymaster',
}
```

---

### Testes

**Executar job manualmente** (para testes):

```typescript
// apps/worker/src/scripts/test-job.ts
import { detectRenewalsJob } from '../jobs/detect-renewals.job';

const result = await detectRenewalsJob({
  tenantId: 'test-tenant-123',
  daysAhead: 60,
});

console.log(result);
```

```bash
tsx src/scripts/test-job.ts
```

---

## 📈 Métricas de Sucesso

Após implementação, você deve observar:

- ✅ **100% das renovações criadas automaticamente** (45 dias antes do vencimento)
- ✅ **0% de renovações perdidas por esquecimento**
- ✅ **Notificações enviadas para vendedores** antes de virar urgente
- ✅ **Redução do churn** (clientes que não renovam)
- ✅ **Aumento da receita recorrente**

---

## 🔮 Próximos Passos

1. **Integrar serviço de email real** (SendGrid, AWS SES)
2. **Adicionar notificações push** (OneSignal, Firebase)
3. **Dashboard de métricas** (Grafana + Prometheus)
4. **Alertas Slack/Discord** para jobs falhados
5. **Job de limpeza** (arquivar renovações antigas)

---

## 📞 Suporte

Problemas? Abra uma issue ou contate o time de DevOps.

**Documentação relacionada:**
- [Plano de Diagnóstico](/.claude/plans/crispy-exploring-treehouse.md)
- [Domain Layer](../../libs/shared/domain/README.md)
- [BullMQ Docs](https://docs.bullmq.io/)
