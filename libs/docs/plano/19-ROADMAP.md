# 19 - Roadmap de Implementação

## 🗓️ Organização em Sprints

Total estimado: **5-8 semanas** (7 sprints)

---

## 📦 Sprint 1: Fundação - Backend de Anexos (1 semana)

### Objetivo
Criar a infraestrutura básica de storage com R2 e banco de dados.

### Tarefas

#### 1.1 Setup Inicial
- [ ] Instalar dependências:
  ```bash
  pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner pdf-parse
  ```
- [ ] Configurar variáveis de ambiente no `.env`
- [ ] Criar conta e bucket no Cloudflare R2

#### 1.2 Database Schema
- [ ] Criar `libs/shared/database/src/schema/anexo.ts`
- [ ] Criar migration `0018_add_anexos.sql`
- [ ] Rodar migration: `pnpm db:migrate`
- [ ] Gerar types: `pnpm db:generate`

#### 1.3 Storage Service
- [ ] Criar `libs/shared/storage/package.json`
- [ ] Criar `libs/shared/storage/src/r2-client.ts` (cliente R2)
- [ ] Criar `libs/shared/storage/src/pdf-extractor.ts` (extração de PDF)
- [ ] Criar `libs/shared/storage/src/index.ts` (service principal)
- [ ] Implementar métodos:
  - `uploadFile()`
  - `downloadFile()`
  - `getSignedUrl()`
  - `deleteFile()`
  - `extractPdfText()`

#### 1.4 Rotas Básicas da API
- [ ] Criar `apps/api/src/routes/anexos/index.ts`
- [ ] Implementar rotas:
  - `POST /api/anexos/upload`
  - `GET /api/anexos/:id`
  - `GET /api/anexos/:id/download`
  - `DELETE /api/anexos/:id`
- [ ] Registrar rotas no `apps/api/src/app.ts`

#### 1.5 Testes Manuais
- [ ] Upload de PDF via Postman/Thunder Client
- [ ] Verificar arquivo no bucket R2
- [ ] Download via URL assinada
- [ ] Deletar arquivo (soft delete)

### Entregáveis
✅ Storage service funcional com R2  
✅ Upload e download básicos funcionando  
✅ Extração de texto de PDFs

---

## 🔗 Sprint 2: Integração com Entidades (1 semana)

### Objetivo
Conectar sistema de anexos com cotações, documentos e chat.

### Tarefas

#### 2.1 Anexos em Cotações
- [ ] Adicionar rotas:
  - `GET /api/cotacoes/:id/anexos`
  - `POST /api/cotacoes/:id/anexos/upload`
- [ ] Validar permissões de acesso
- [ ] Atualizar schema de cotações (se necessário)

#### 2.2 Anexos em Documentos de Venda
- [ ] Adicionar rotas:
  - `GET /api/documentos-venda/:id/anexos`
  - `POST /api/documentos-venda/:id/anexos/upload`
- [ ] Validar permissões de acesso

#### 2.3 Integração com Chat
- [ ] Modificar `libs/plugins/chat/src/chat.service.ts`
- [ ] Adicionar método `sendFileMessage()`
- [ ] Atualizar WebSocket para suportar arquivos
- [ ] Testar envio de arquivo via chat

#### 2.4 Validações e Segurança
- [ ] Implementar validação de MIME types
- [ ] Implementar validação de tamanho
- [ ] Implementar tenant isolation em todas as rotas
- [ ] Adicionar rate limiting para uploads

#### 2.5 Testes
- [ ] Upload em cotação
- [ ] Upload em documento
- [ ] Envio de arquivo no chat
- [ ] Verificar isolamento entre tenants

### Entregáveis
✅ Anexos funcionando em cotações e documentos  
✅ Chat suportando arquivos  
✅ Validações de segurança implementadas

---

## 👑 Sprint 3: Painel Admin - Backend (1-2 semanas)

### Objetivo
Criar infraestrutura administrativa para monitoramento e backup.

### Tarefas

#### 3.1 Schemas Admin
- [ ] Criar `libs/shared/database/src/schema/admin.ts`
- [ ] Criar `libs/shared/database/src/schema/storage-metrics.ts`
- [ ] Criar `libs/shared/database/src/schema/backup.ts`
- [ ] Criar migrations:
  - `0019_add_admin_tables.sql`
  - `0020_add_storage_metrics.sql`
  - `0021_add_backup_tables.sql`
- [ ] Rodar migrations

#### 3.2 Autenticação Admin
- [ ] Criar `apps/api/src/routes/admin/auth.ts`
- [ ] Implementar login separado para admins
- [ ] Criar middleware `authenticateAdmin`
- [ ] Gerar JWT separado para admins

#### 3.3 Metrics Service
- [ ] Criar `libs/shared/storage/src/metrics-service.ts`
- [ ] Implementar métodos:
  - `calculateUsage(corretoraId)`
  - `createDailySnapshot()`
  - `checkLimits(corretoraId)`
  - `getHistoricalData(corretoraId, days)`

#### 3.4 Backup Service
- [ ] Criar `libs/shared/storage/src/backup-service.ts`
- [ ] Implementar métodos:
  - `createFullBackup(corretoraId)`
  - `createIncrementalBackup(corretoraId)`
  - `restoreBackup(backupId)`
  - `verifyBackup(backupId)`
  - `listBackups(filters)`

#### 3.5 Rotas Admin
- [ ] Criar `apps/api/src/routes/admin/index.ts`
- [ ] Implementar rotas:
  - `POST /api/admin/auth/login`
  - `GET /api/admin/tenants`
  - `GET /api/admin/tenants/:id/usage`
  - `GET /api/admin/tenants/:id/usage/history`
  - `PUT /api/admin/tenants/:id/limits`
  - `GET /api/admin/storage/overview`
  - `POST /api/admin/backups`
  - `GET /api/admin/backups`
  - `GET /api/admin/backups/:id`
  - `POST /api/admin/backups/:id/restore`
  - `POST /api/admin/backups/:id/verify`
  - `GET /api/admin/audit-logs`
- [ ] Registrar rotas admin no `app.ts`

#### 3.6 Testes Backend Admin
- [ ] Login admin via API
- [ ] Calcular métricas de corretora
- [ ] Criar backup manual
- [ ] Listar backups
- [ ] Verificar integridade de backup

### Entregáveis
✅ API admin completa e funcional  
✅ Sistema de métricas operacional  
✅ Sistema de backup operacional

---

## 🎨 Sprint 4: Painel Admin - Frontend (1-2 semanas)

### Objetivo
Criar aplicação Next.js administrativa com dashboards e gestão.

### Tarefas

#### 4.1 Setup do App Admin
- [ ] Criar `apps/admin/` (novo projeto Next.js)
- [ ] Configurar `apps/admin/package.json`
- [ ] Instalar dependências:
  ```bash
  pnpm add recharts date-fns @tanstack/react-table
  ```
- [ ] Configurar Tailwind CSS
- [ ] Configurar roteamento

#### 4.2 Autenticação Admin
- [ ] Criar `apps/admin/src/app/(auth)/login/page.tsx`
- [ ] Implementar formulário de login
- [ ] Armazenar JWT admin no localStorage
- [ ] Criar middleware de autenticação

#### 4.3 Dashboard Overview
- [ ] Criar `apps/admin/src/app/(dashboard)/overview/page.tsx`
- [ ] Criar componentes:
  - `storage-usage-chart.tsx` (gráfico de uso)
  - `growth-trend-chart.tsx` (crescimento)
  - `breakdown-pie-chart.tsx` (breakdown por tipo)
- [ ] Cards com totais (storage, arquivos, corretoras)
- [ ] Lista de alertas ativos

#### 4.4 Página de Tenants
- [ ] Criar `apps/admin/src/app/(dashboard)/tenants/page.tsx`
- [ ] Tabela com todas as corretoras
- [ ] Filtros e busca
- [ ] Métricas de uso em cada linha
- [ ] Link para detalhes

#### 4.5 Detalhes de Tenant
- [ ] Criar `apps/admin/src/app/(dashboard)/tenants/[id]/usage/page.tsx`
- [ ] Gráfico de uso histórico
- [ ] Lista dos 50 maiores arquivos
- [ ] Configuração de limites
- [ ] Botão criar backup

#### 4.6 Página de Backups
- [ ] Criar `apps/admin/src/app/(dashboard)/backups/page.tsx`
- [ ] Tabela de backups com status
- [ ] Filtros por corretora, tipo, data
- [ ] Dialog para criar novo backup
- [ ] Ações: Verificar, Restaurar, Ver logs

#### 4.7 Página de Auditoria
- [ ] Criar `apps/admin/src/app/(dashboard)/audit/page.tsx`
- [ ] Tabela de logs administrativos
- [ ] Filtros por admin, ação, data
- [ ] Detalhes em modal

#### 4.8 React Query Hooks
- [ ] Criar `apps/admin/src/lib/queries/admin.ts`
- [ ] Hooks:
  - `useAdminLogin()`
  - `useTenants()`
  - `useTenantUsage(id)`
  - `useBackups()`
  - `useCreateBackup()`
  - `useAuditLogs()`

### Entregáveis
✅ Painel admin completo e navegável  
✅ Dashboards com gráficos funcionais  
✅ Gestão de backups via UI

---

## 🤖 Sprint 5: Automação e Workers (1 semana)

### Objetivo
Implementar jobs agendados para tarefas automáticas.

### Tarefas

#### 5.1 Setup BullMQ
- [ ] Verificar se BullMQ já está configurado
- [ ] Criar `apps/worker/src/jobs/storage-jobs.ts`
- [ ] Configurar Redis connection

#### 5.2 Job: Daily Metrics Snapshot
- [ ] Criar job `dailyMetricsSnapshot`
- [ ] Agendar para 00:00 todo dia
- [ ] Calcular métricas de todas as corretoras
- [ ] Inserir em `storage_metrics`

#### 5.3 Job: Check Storage Limits
- [ ] Criar job `checkStorageLimits`
- [ ] Agendar para rodar a cada hora
- [ ] Verificar uso vs limite de cada corretora
- [ ] Enviar alertas por email quando necessário

#### 5.4 Job: Incremental Backup
- [ ] Criar job `incrementalBackup`
- [ ] Agendar para 02:00 todo dia
- [ ] Fazer backup incremental de todas as corretoras
- [ ] Registrar em `backups`

#### 5.5 Job: Weekly Full Backup
- [ ] Criar job `weeklyFullBackup`
- [ ] Agendar para 03:00 domingo
- [ ] Fazer backup completo de todas as corretoras

#### 5.6 Job: Cleanup Old Backups
- [ ] Criar job `cleanupOldBackups`
- [ ] Agendar para 04:00 todo dia
- [ ] Remover backups incrementais > 30 dias
- [ ] Remover backups completos > 90 dias

#### 5.7 Job: Verify Recent Backups
- [ ] Criar job `verifyRecentBackups`
- [ ] Agendar para 05:00 todo dia
- [ ] Verificar integridade dos backups dos últimos 7 dias
- [ ] Alertar admin se falha detectada

#### 5.8 Sistema de Alertas
- [ ] Criar `libs/shared/utils/src/alerts.ts`
- [ ] Implementar `AlertService`:
  - `alertStorageLimit()`
  - `alertBackupFailed()`
  - `alertBackupVerificationFailed()`
- [ ] Integrar com email service (se existir)

### Entregáveis
✅ Jobs agendados funcionando  
✅ Métricas sendo coletadas automaticamente  
✅ Backups automáticos rodando  
✅ Alertas sendo enviados

---

## 🔄 Sprint 6: Versionamento e Features Avançadas (1 semana)

### Objetivo
Implementar versionamento de arquivos e import de PDFs legados.

### Tarefas

#### 6.1 Versionamento - Backend
- [ ] Implementar `uploadNewVersion()` no StorageService
- [ ] Implementar `getVersionHistory()` no StorageService
- [ ] Implementar `restoreVersion()` no StorageService
- [ ] Adicionar rotas:
  - `POST /api/anexos/:id/new-version`
  - `GET /api/anexos/:id/versions`
  - `POST /api/anexos/:id/restore-version/:versaoId`

#### 6.2 Versionamento - Frontend
- [ ] Criar componente `version-history.tsx`
- [ ] Mostrar lista de versões com timestamps
- [ ] Botão para restaurar versão
- [ ] Preview de versão anterior

#### 6.3 Import de PDFs Legados
- [ ] Criar `apps/api/src/routes/anexos/import-legacy.ts`
- [ ] Implementar extração inteligente de dados:
  - Número da cotação
  - Valores (prêmio, comissão)
  - Datas de vigência
  - Nome do segurado
- [ ] Implementar rota `POST /api/anexos/import-legacy`

#### 6.4 UI de Import Legado
- [ ] Criar componente `import-legacy-dialog.tsx`
- [ ] Upload de PDF antigo
- [ ] Preview de dados extraídos
- [ ] Permitir edição antes de confirmar
- [ ] Criar cotação com dados extraídos

#### 6.5 Componentes Frontend - Anexos Tenant
- [ ] Criar `apps/web/src/components/anexos/file-upload.tsx`
- [ ] Criar `apps/web/src/components/anexos/file-list.tsx`
- [ ] Criar `apps/web/src/components/anexos/pdf-viewer.tsx`
- [ ] Integrar em `cotacao-dialog.tsx` (nova aba "Anexos")
- [ ] Integrar em `chat-window.tsx`

### Entregáveis
✅ Versionamento completo funcionando  
✅ Import de PDFs antigos operacional  
✅ UI de anexos completa no tenant

---

## 🧪 Sprint 7: Testes e Refinamentos (1 semana)

### Objetivo
Testar todo o sistema end-to-end e fazer ajustes finais.

### Tarefas

#### 7.1 Testes de Upload
- [ ] Upload de arquivo 10MB
- [ ] Upload simultâneo de múltiplos arquivos
- [ ] Upload com rede lenta (throttling)
- [ ] Upload de diferentes tipos (PDF, JPG, DOCX)
- [ ] Validação de MIME type inválido
- [ ] Validação de tamanho excedido

#### 7.2 Testes de Download
- [ ] Download via URL assinada
- [ ] Expiração de URL (após 24h)
- [ ] Download simultâneo de múltiplos arquivos
- [ ] Stream de arquivo grande

#### 7.3 Testes de Versionamento
- [ ] Criar versão 2 de arquivo
- [ ] Ver histórico de versões
- [ ] Restaurar versão anterior
- [ ] Deletar versão específica

#### 7.4 Testes de Chat
- [ ] Enviar PDF no chat
- [ ] Enviar imagem no chat
- [ ] Preview inline de imagem
- [ ] Download de arquivo do chat
- [ ] Broadcast via WebSocket

#### 7.5 Testes de Admin
- [ ] Login no painel admin
- [ ] Ver dashboard overview
- [ ] Ver detalhes de tenant
- [ ] Configurar limite de storage
- [ ] Criar backup manual
- [ ] Verificar integridade de backup
- [ ] Restaurar backup (em ambiente de teste!)
- [ ] Ver logs de auditoria

#### 7.6 Testes de Automação
- [ ] Verificar job de metrics rodou (checar storage_metrics)
- [ ] Forçar exceder limite e receber alerta
- [ ] Verificar backup incremental foi criado
- [ ] Verificar backup completo semanal
- [ ] Verificar cleanup de backups antigos

#### 7.7 Testes de Segurança
- [ ] Tentar acessar anexo de outra corretora (deve falhar)
- [ ] Tentar fazer upload sem autenticação (deve falhar)
- [ ] Tentar acessar admin sem JWT admin (deve falhar)
- [ ] Tentar upload com MIME type não permitido (deve falhar)
- [ ] Verificar tenant isolation em todas as rotas

#### 7.8 Testes de Performance
- [ ] Upload de 100 arquivos em sequência
- [ ] Calcular métricas de 100 corretoras
- [ ] Backup de corretora com 10GB
- [ ] Extração de PDF com 200 páginas

#### 7.9 Documentação
- [ ] Adicionar comentários em código complexo
- [ ] Criar README.md para cada módulo
- [ ] Documentar variáveis de ambiente
- [ ] Criar guia de troubleshooting

#### 7.10 Refinamentos
- [ ] Melhorar mensagens de erro
- [ ] Adicionar loading states
- [ ] Melhorar responsividade mobile (admin)
- [ ] Otimizar queries lentas
- [ ] Adicionar logs em pontos críticos

### Entregáveis
✅ Sistema 100% testado  
✅ Bugs críticos corrigidos  
✅ Documentação completa  
✅ Pronto para produção

---

## 📊 Resumo por Sprint

| Sprint | Foco                  | Tempo     | Complexidade |
| ------ | --------------------- | --------- | ------------ |
| 1      | Backend Anexos        | 1 semana  | Média        |
| 2      | Integração Entidades  | 1 semana  | Média        |
| 3      | Admin Backend         | 1-2 sem   | Alta         |
| 4      | Admin Frontend        | 1-2 sem   | Alta         |
| 5      | Automação             | 1 semana  | Média        |
| 6      | Features Avançadas    | 1 semana  | Média        |
| 7      | Testes e Refinamentos | 1 semana  | Baixa        |
| **TOTAL** | **MVP Completo**  | **5-8 sem** | -         |

## 🎯 Marcos Importantes

### Milestone 1: MVP Anexos (Sprints 1-2)
- ✅ Upload e download funcionando
- ✅ Integração com cotações, documentos e chat
- **Valor**: Sistema básico de anexos operacional

### Milestone 2: Admin Panel (Sprints 3-4)
- ✅ Painel administrativo funcional
- ✅ Monitoramento de uso em tempo real
- ✅ Sistema de backup manual
- **Valor**: Controle completo sobre uso do sistema

### Milestone 3: Automação (Sprint 5)
- ✅ Jobs agendados rodando
- ✅ Backups automáticos
- ✅ Alertas de limite
- **Valor**: Sistema self-service, sem intervenção manual

### Milestone 4: Produção (Sprints 6-7)
- ✅ Features avançadas
- ✅ Sistema testado e estável
- ✅ Documentação completa
- **Valor**: Pronto para uso em produção

## 🚀 Como Usar Este Roadmap

1. **Siga a ordem dos sprints** - Cada sprint depende do anterior
2. **Marque as tarefas concluídas** - Use `[x]` em vez de `[ ]`
3. **Não pule testes** - Cada sprint tem sua fase de testes
4. **Documente problemas** - Se encontrar issues, adicione na seção 7.10
5. **Comunique progresso** - Ao final de cada sprint, revise o que foi feito

## 📞 Suporte Durante Implementação

- **Dúvidas técnicas**: Consulte os documentos específicos (01-18)
- **Problemas de config**: Veja [14-CONFIGURACAO.md](./14-CONFIGURACAO.md)
- **Problemas de SQL**: Veja [15-MIGRATIONS.md](./15-MIGRATIONS.md)
- **Estimativa de custos**: Veja [17-CUSTOS.md](./17-CUSTOS.md)
