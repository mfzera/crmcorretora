# 20 - Ordem de Implementação (Roadmap)

**Navegação**: [← 18. Segurança](./18-SEGURANCA.md) | [Índice](./00-INDICE.md)

---

## 🎯 Visão Geral

Roadmap completo de implementação dividido em 4 sprints de 2 semanas cada (8 semanas totais).

## 📅 Sprint 1: Fundação (Semanas 1-2)

### Objetivo
Implementar infraestrutura base e funcionalidades essenciais de upload/download.

### Tarefas

#### 1.1 Setup Inicial (2 dias)
- [ ] Configurar Cloudflare R2
  - [ ] Criar conta Cloudflare
  - [ ] Criar bucket `ecotech-anexos`
  - [ ] Criar bucket `ecotech-backups`
  - [ ] Gerar Access Keys
  - [ ] Testar conexão via SDK
- [ ] Configurar variáveis de ambiente
  - [ ] `.env` template
  - [ ] Documentar secrets necessários
- [ ] Instalar dependências
  ```bash
  pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
  ```

#### 1.2 Database Schema (2 dias)
- [ ] Criar tabelas no schema
  - [ ] `anexos`
  - [ ] `storage_limits`
  - [ ] `storage_metrics`
- [ ] Criar migrations
  ```bash
  pnpm db:generate
  pnpm db:migrate
  ```
- [ ] Seed de dados de teste
- [ ] Criar índices otimizados

#### 1.3 Storage Service (3 dias)
- [ ] Implementar `StorageService`
  - [ ] `upload()` - Upload para R2
  - [ ] `getSignedUrl()` - URLs assinadas
  - [ ] `softDelete()` - Soft delete
  - [ ] `listByEntity()` - Listar anexos
- [ ] Implementar validações
  - [ ] MIME type whitelist
  - [ ] File size validation
  - [ ] Filename sanitization
- [ ] Testes unitários
  - [ ] Upload com sucesso
  - [ ] Rejeição de MIME inválido
  - [ ] Rejeição de arquivo grande

#### 1.4 API Anexos (3 dias)
- [ ] Criar rotas `/api/anexos`
  - [ ] `POST /upload` - Upload
  - [ ] `GET /:id` - Download (URL assinada)
  - [ ] `GET /` - Listar por entidade
  - [ ] `DELETE /:id` - Soft delete
- [ ] Middleware de autenticação
- [ ] Tenant isolation
- [ ] Testes de integração

#### 1.5 Frontend Básico (4 dias)
- [ ] Componente `FileUpload`
  - [ ] Drag & drop
  - [ ] Progress bar
  - [ ] Preview de imagens
- [ ] Componente `FileList`
  - [ ] Listagem com ícones
  - [ ] Ações (download, delete)
  - [ ] Loading states
- [ ] Integração com Cotações
  - [ ] Upload em modal
  - [ ] Lista de anexos
- [ ] Testes E2E básicos

### Entrega Sprint 1
- ✅ Upload de arquivos funcionando
- ✅ Download via URL assinada
- ✅ Listagem e exclusão
- ✅ Interface básica no frontend

---

## 📅 Sprint 2: Métricas e Limites (Semanas 3-4)

### Objetivo
Implementar monitoramento de uso e sistema de limites.

### Tarefas

#### 2.1 Metrics Service (3 dias)
- [ ] Implementar `StorageMetricsService`
  - [ ] `calculateUsage()` - Uso em tempo real
  - [ ] `createDailySnapshot()` - Snapshot diário
  - [ ] `checkLimits()` - Verificar limites
  - [ ] `getUsageHistory()` - Histórico
  - [ ] `getGlobalStats()` - Stats globais
- [ ] Testes unitários completos

#### 2.2 Sistema de Limites (2 dias)
- [ ] CRUD de `storage_limits`
  - [ ] Criar limite para corretora
  - [ ] Editar limites
  - [ ] Listar limites
- [ ] Middleware de verificação de limite
  - [ ] Bloquear upload se limite atingido
  - [ ] Mensagem clara para usuário
- [ ] Testes de integração

#### 2.3 Workers e Jobs (4 dias)
- [ ] Setup BullMQ + Redis
  - [ ] Configurar conexão
  - [ ] Criar filas
- [ ] Implementar jobs
  - [ ] Daily metrics snapshot (00:00)
  - [ ] Check limits (a cada hora)
- [ ] Monitoramento de jobs
  - [ ] BullMQ Board (dev)
  - [ ] Logs estruturados
- [ ] Testes de jobs

#### 2.4 API de Métricas (2 dias)
- [ ] Rotas `/api/anexos/usage`
  - [ ] `GET /usage` - Uso atual
  - [ ] `GET /history` - Histórico
- [ ] Dashboard de uso (frontend)
  - [ ] Card de uso total
  - [ ] Breakdown por tipo
  - [ ] Gráfico de histórico
- [ ] Testes

#### 2.5 Sistema de Alertas (3 dias)
- [ ] Schema `alerts`
- [ ] Implementar `AlertService`
  - [ ] Storage limit alerts
  - [ ] Email notifications
  - [ ] Webhook (Slack/Discord)
- [ ] Notificações in-app
  - [ ] API de notificações
  - [ ] Dropdown no frontend
  - [ ] Badge de contador
- [ ] Testes de alertas

### Entrega Sprint 2
- ✅ Métricas de uso implementadas
- ✅ Limites por tenant funcionando
- ✅ Jobs automáticos rodando
- ✅ Alertas de limite configurados
- ✅ Dashboard de uso no frontend

---

## 📅 Sprint 3: Backups e Versionamento (Semanas 5-6)

### Objetivo
Implementar sistema completo de backups e versionamento de arquivos.

### Tarefas

#### 3.1 Backup Service (4 dias)
- [ ] Implementar `BackupService`
  - [ ] `createIncrementalBackup()` - Backup incremental
  - [ ] `createFullBackup()` - Backup completo
  - [ ] `verifyBackup()` - Verificar integridade
  - [ ] `restoreBackup()` - Restaurar
  - [ ] `cleanupOldBackups()` - Limpeza
- [ ] Testes unitários extensivos
  - [ ] Criar backups
  - [ ] Verificar checksums
  - [ ] Restaurar (dry run)

#### 3.2 Jobs de Backup (2 dias)
- [ ] Implementar jobs
  - [ ] Incremental backup (02:00 diário)
  - [ ] Full backup (03:00 domingo)
  - [ ] Verify backups (05:00 diário)
  - [ ] Cleanup old backups (04:00 domingo)
- [ ] Alertas de backup
  - [ ] Backup failed
  - [ ] Backup integrity compromised
- [ ] Monitoramento

#### 3.3 Versionamento (3 dias)
- [ ] Implementar upload de nova versão
  - [ ] Link com `arquivoAnteriorId`
  - [ ] Incrementar `versao`
- [ ] API de versões
  - [ ] `GET /anexos/:id/versoes` - Histórico
  - [ ] `POST /anexos/:id/versao` - Nova versão
  - [ ] `POST /anexos/:id/restaurar/:versaoId` - Restaurar
- [ ] Frontend de versões
  - [ ] Modal de histórico
  - [ ] Timeline de versões
  - [ ] Comparação de versões
- [ ] Testes E2E

#### 3.4 Integração Chat (2 dias)
- [ ] Upload de anexos no chat
  - [ ] Drag & drop na área de mensagem
  - [ ] Preview inline
  - [ ] Múltiplos arquivos
- [ ] Download de anexos do chat
  - [ ] Click para abrir/baixar
  - [ ] Gallery view para imagens
- [ ] Testes

#### 3.5 Documentação (3 dias)
- [ ] README completo
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Guia de deployment
- [ ] Troubleshooting guide

### Entrega Sprint 3
- ✅ Backups automáticos funcionando
- ✅ Versionamento de arquivos
- ✅ Integração completa com chat
- ✅ Documentação técnica completa

---

## 📅 Sprint 4: Admin Panel e Polimento (Semanas 7-8)

### Objetivo
Implementar painel administrativo e finalizar sistema completo.

### Tarefas

#### 4.1 Admin Auth (2 dias)
- [ ] Schema `admins` e `admin_audit_logs`
- [ ] Implementar autenticação admin
  - [ ] Login separado
  - [ ] JWT com secret diferente
  - [ ] Middleware de auth
- [ ] Script para criar primeiro admin
- [ ] Testes de auth

#### 4.2 Admin Frontend (5 dias)
- [ ] Setup app Next.js `apps/admin`
- [ ] Páginas principais
  - [ ] Login
  - [ ] Dashboard (stats globais)
  - [ ] Tenants (lista e detalhes)
  - [ ] Backups (lista e gestão)
  - [ ] Audit Logs
- [ ] Componentes
  - [ ] Stats cards
  - [ ] Usage charts
  - [ ] Tables com filtros
  - [ ] Dialogs de ação
- [ ] Testes E2E (Playwright)

#### 4.3 API Admin (3 dias)
- [ ] Rotas `/api/admin`
  - [ ] `GET /dashboard/stats` - Stats globais
  - [ ] `GET /tenants` - Lista tenants
  - [ ] `GET /tenants/:id` - Detalhes tenant
  - [ ] `PUT /tenants/:id/limits` - Editar limites
  - [ ] `GET /backups` - Lista backups
  - [ ] `POST /backups` - Criar backup manual
  - [ ] `POST /backups/:id/verify` - Verificar
  - [ ] `POST /backups/:id/restore` - Restaurar
  - [ ] `GET /audit-logs` - Logs de auditoria
- [ ] Testes de integração

#### 4.4 Cleanup e Otimizações (2 dias)
- [ ] Job de arquivos órfãos (domingo 01:00)
- [ ] Job de temp files (06:00 diário)
- [ ] Compressão de imagens
  - [ ] Middleware de compressão
  - [ ] Thumbnails para PDFs
- [ ] Deduplicação de arquivos (opcional)

#### 4.5 Testes Completos (2 dias)
- [ ] Coverage > 80%
  - [ ] Testes unitários
  - [ ] Testes de integração
  - [ ] Testes E2E
- [ ] Load testing (k6)
  - [ ] Upload performance
  - [ ] Download performance
- [ ] Security testing
  - [ ] Auth/authz
  - [ ] Input validation
  - [ ] SQL injection
  - [ ] XSS

#### 4.6 Deploy e CI/CD (2 dias)
- [ ] GitHub Actions
  - [ ] Tests on PR
  - [ ] Auto deploy to staging
- [ ] Deploy produção
  - [ ] API (Vercel/Railway)
  - [ ] Worker (Docker/PM2)
  - [ ] Admin (Vercel)
- [ ] Monitoramento
  - [ ] Sentry (error tracking)
  - [ ] Logs centralizados

### Entrega Sprint 4
- ✅ Painel admin completo
- ✅ Backups gerenciáveis via UI
- ✅ Audit logs visíveis
- ✅ Sistema em produção
- ✅ Testes completos (>80% coverage)
- ✅ CI/CD configurado

---

## 📊 Cronograma Visual

```
Semana 1-2  │████████│ Sprint 1: Fundação
            │ Upload, Download, Frontend Básico
            │
Semana 3-4  │████████│ Sprint 2: Métricas e Limites
            │ Metrics, Limites, Jobs, Alertas
            │
Semana 5-6  │████████│ Sprint 3: Backups e Versionamento
            │ Backups, Versões, Chat Integration
            │
Semana 7-8  │████████│ Sprint 4: Admin Panel e Polimento
            │ Admin Frontend, API, Deploy
            │
            └─────────────────────────────────
             Total: 8 semanas (2 meses)
```

## 🎯 Milestones

### Milestone 1: MVP (Fim Sprint 1)
- Upload/download funcionando
- Interface básica
- **Pronto para testes internos**

### Milestone 2: Monitoramento (Fim Sprint 2)
- Métricas implementadas
- Limites funcionando
- Alertas configurados
- **Pronto para beta fechado**

### Milestone 3: Backup (Fim Sprint 3)
- Backups automáticos
- Versionamento completo
- Chat integrado
- **Pronto para beta público**

### Milestone 4: Produção (Fim Sprint 4)
- Admin panel completo
- Testes extensivos
- Deploy realizado
- **PRONTO PARA PRODUÇÃO** 🚀

## 📋 Checklist Final

### Funcionalidades
- [ ] Upload de arquivos (PDF, imagens, docs)
- [ ] Download via URLs assinadas
- [ ] Soft delete com auditoria
- [ ] Versionamento de arquivos
- [ ] Métricas de uso por tenant
- [ ] Limites de storage configuráveis
- [ ] Backups automáticos (incremental + completo)
- [ ] Restore de backups
- [ ] Verificação de integridade
- [ ] Alertas (email + webhook)
- [ ] Notificações in-app
- [ ] Painel admin completo
- [ ] Audit logs

### Qualidade
- [ ] Testes unitários (>80% coverage)
- [ ] Testes de integração
- [ ] Testes E2E (Playwright)
- [ ] Load testing (k6)
- [ ] Security testing
- [ ] Code review completo

### Documentação
- [ ] README com setup
- [ ] API documentation
- [ ] Guia de deployment
- [ ] Troubleshooting
- [ ] Exemplos de uso

### Deploy
- [ ] CI/CD configurado
- [ ] Staging environment
- [ ] Production environment
- [ ] Monitoramento (Sentry)
- [ ] Logs centralizados
- [ ] Backups configurados

## 🚀 Pós-Launch (Opcional)

### Fase 5: Melhorias Incrementais
- [ ] Upload direto para R2 (presigned URLs)
- [ ] Processamento de imagens (thumbnails)
- [ ] OCR em PDFs (extração de texto)
- [ ] Busca full-text em documentos
- [ ] Compartilhamento de arquivos (links públicos)
- [ ] Expiração de arquivos temporários
- [ ] Integração com e-signature (DocuSign)
- [ ] Mobile app (React Native)
- [ ] Bulk operations (download múltiplos)
- [ ] Tags e categorização

## 🎓 Lições Aprendidas (Placeholder)

Após cada sprint, documentar:
- O que funcionou bem
- O que pode melhorar
- Bloqueios encontrados
- Soluções criativas
- Estimativas vs realidade

---

## 🏁 Conclusão

Este roadmap fornece um caminho claro e estruturado para implementação completa do sistema de gerenciamento de anexos. Cada sprint tem entregas concretas e testáveis, permitindo feedback contínuo e ajustes conforme necessário.

**Tempo total estimado:** 8 semanas (2 meses)  
**Complexidade:** Média-Alta  
**Valor entregue:** Sistema completo de storage com backup, versionamento e monitoramento

---

**Navegação**: [← 18. Segurança](./18-SEGURANCA.md) | [Índice](./00-INDICE.md)
