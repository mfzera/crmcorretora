# 🧪 Guia de Teste End-to-End - EcoTech Worker

## ✅ Status dos Testes

### Infraestrutura ✅
- [x] Redis conectado e funcionando (PONG recebido)
- [x] Variáveis de ambiente configuradas
- [x] Database URL configurado
- [x] Worker packages instalados

---

## 🚧 Limitação Técnica Encontrada

Durante os testes, identificamos um **bug no tsx** com workspaces TypeScript que impede execução direta dos jobs:
- Erro: `Cannot find module '.../@ecotech/shared/domain/index.jsx'`
- Causa: tsx procura `.jsx` em vez de `.ts` em workspaces pnpm
- Status: Conhecido, sem solução imediata

### Soluções Alternativas:

**Opção 1: Testar via Build (Produção)**
```bash
# Build do worker
cd apps/worker
npm run build

# Executar compilado
node ../../dist/apps/worker/index.js
```

**Opção 2: Testar via API REST (Recomendado para E2E)**
```bash
# 1. Iniciar API
cd apps/api
npm run dev

# 2. Criar endpoint temporário de teste
# POST /api/jobs/detect-renewals (trigger manual)

# 3. Verificar resultados no banco
```

**Opção 3: Teste Manual no Banco**
```sql
-- 1. Criar documento de venda expirando em 30 dias
INSERT INTO documento_venda (
  numero_documento,
  seguradora_id,
  cliente_id,
  produto_id,
  status,
  data_inicio_vigencia,
  data_fim_vigencia,
  premio,
  comissao_percentual,
  comissao_valor
) VALUES (
  'TEST-2024-001',
  'uuid-seguradora',
  'uuid-cliente',
  'uuid-produto',
  'ATIVO',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  5000.00,
  10.00,
  500.00
);

-- 2. Verificar documentos expirando
SELECT 
  numero_documento,
  data_fim_vigencia,
  (data_fim_vigencia - CURRENT_DATE) as dias_restantes,
  premio
FROM documento_venda
WHERE status = 'ATIVO'
  AND data_fim_vigencia BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days';

-- 3. Após rodar job, verificar renovações criadas
SELECT 
  r.id,
  r.status,
  r.data_vencimento,
  r.premio_anterior,
  d.numero_documento as doc_anterior
FROM renovacao_comercial r
LEFT JOIN documento_venda d ON r.documento_venda_anterior_id = d.id
WHERE r.created_at > NOW() - INTERVAL '10 minutes'
ORDER BY r.created_at DESC;
```

---

## 🎯 Teste End-to-End Completo (Quando Build Funcionar)

### Passo 1: Preparar Ambiente

```bash
# Redis rodando
docker ps | grep redis
# Se não estiver: docker start ecotech-redis

# Build do worker
cd apps/worker
npm run build
```

### Passo 2: Criar Dados de Teste

Opções:
1. Via interface web (apps/web)
2. Via API (apps/api)
3. Via SQL (diretamente no banco)

**Dados necessários:**
- 1 Seguradora ativa
- 1 Cliente
- 1 Produto
- 1 Documento de Venda ATIVO expirando em 30-45 dias

### Passo 3: Executar Jobs Manualmente

```bash
# Executar job de detecção
node dist/apps/worker/index.js

# Ou criar script específico:
node -e "
import('./dist/apps/worker/jobs/detect-renewals.job.js').then(async (mod) => {
  const result = await mod.detectRenewalsJob({ daysAhead: 60 });
  console.log(result);
});
"
```

### Passo 4: Validar Resultados

**No console do worker:**
- ✅ Logs de renovações criadas
- ✅ Número de documentos processados
- ✅ Erros (se houver)

**No banco de dados:**
```sql
-- Renovações criadas recentemente
SELECT COUNT(*) FROM renovacao_comercial 
WHERE created_at > NOW() - INTERVAL '5 minutes';

-- Detalhes
SELECT 
  r.*,
  d.numero_documento,
  c.nome as cliente
FROM renovacao_comercial r
LEFT JOIN documento_venda d ON r.documento_venda_anterior_id = d.id
LEFT JOIN cliente c ON d.cliente_id = c.id
WHERE r.created_at > NOW() - INTERVAL '5 minutes';
```

**Na interface web:**
- Acessar "Área de Trabalho"
- Verificar seção "Renovações Pendentes"
- Confirmar que renovação aparece com status "NÃO_TRABALHADO"

### Passo 5: Testar Notificações

```bash
# Executar job de notificações
# (mesmo processo do job de detecção)
```

**Validar:**
- Logs de notificações enviadas
- Vendedores notificados
- Renovações urgentes identificadas

---

## 📊 Checklist de Validação

### Funcionalidade ✅
- [ ] Job de detecção executa sem erros
- [ ] Renovações são criadas automaticamente
- [ ] Status inicial é "NAO_TRABALHADO"
- [ ] Dados preservados (prêmio, comissão, coberturas)
- [ ] Vigência calculada corretamente (+1 ano)
- [ ] Idempotência (não duplica renovações)

### Notificações
- [ ] Job identifica renovações urgentes
- [ ] Prioridade calculada corretamente
- [ ] Vendedores agrupados
- [ ] Logs de notificações gerados

### Integração
- [ ] Renovações aparecem na Área de Trabalho
- [ ] Vendedor consegue "Iniciar Renovação"
- [ ] Cotação é criada ao iniciar
- [ ] Status muda para "EM_PROSPECCAO"

---

## 🐛 Troubleshooting

### Worker não inicia

**Erro: `ECONNREFUSED Redis`**
```bash
docker start ecotech-redis
```

**Erro: `Invalid environment variables`**
```bash
# Verificar apps/worker/.env
cat apps/worker/.env
```

### Job não cria renovações

**Verificar se há documentos elegíveis:**
```sql
SELECT COUNT(*) 
FROM documento_venda
WHERE status = 'ATIVO'
  AND data_fim_vigencia BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days';
```

**Se resultado = 0:** Criar documento de teste manualmente

### Renovação duplicada

**Verificar idempotência:**
```sql
-- Deve retornar apenas 1 renovação por documento
SELECT documento_venda_anterior_id, COUNT(*) as quantidade
FROM renovacao_comercial
GROUP BY documento_venda_anterior_id
HAVING COUNT(*) > 1;
```

---

## 🎉 Critérios de Sucesso

O teste é considerado **APROVADO** quando:

1. ✅ Worker inicia sem erros
2. ✅ Jobs executam completamente
3. ✅ Renovações são criadas automaticamente
4. ✅ Dados estão corretos no banco
5. ✅ Interface web mostra renovações
6. ✅ Notificações são geradas (logs)
7. ✅ Não há duplicatas
8. ✅ Performance aceitável (< 5s para 100 documentos)

---

## 📝 Teste Realizado

### Data: 2026-01-05

**Infraestrutura:**
- ✅ Redis: OK (PONG recebido)
- ✅ Env vars: OK
- ✅ Database: OK

**Pendente:**
- ⏳ Execução dos jobs (bloqueado por bug tsx)
- ⏳ Validação de criação de renovações
- ⏳ Teste de notificações

**Próximos passos:**
1. Aguardar build do worker funcionar, OU
2. Criar endpoint temporário na API para trigger manual, OU
3. Testar diretamente em produção após deploy

---

## 🚀 Alternativa: Deploy e Teste em Produção

Dado que a infraestrutura está OK e o código está completo, podemos:

1. **Deploy do worker em ambiente de staging/produção**
   - Docker container com build compilado
   - Configurar cron schedules
   - Monitorar logs

2. **Testar com dados reais**
   - Sistema já em uso
   - Documentos reais expirando
   - Validar comportamento real

3. **Validar incrementalmente**
   - Primeira execução: modo dry-run (apenas logs)
   - Segunda execução: criar 1 renovação teste
   - Terceira execução: liberar para todos

**Vantagem:** Evita problemas de ambiente de desenvolvimento

**Recomendação:** 🟢 Esta é a melhor opção neste momento
