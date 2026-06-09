# Sprint 4 - API de Anexos - Implementado

## 📋 Resumo da Implementação

A API de anexos foi implementada com sucesso conforme o documento `04-API-ANEXOS.md`. Todas as rotas REST para gerenciamento de anexos no backend estão funcionais.

## ✅ Rotas Implementadas

### 1. POST /api/anexos/upload
- ✅ Upload de arquivo para R2
- ✅ Validação de tamanho (máximo 10MB)
- ✅ Validação de MIME types permitidos
- ✅ Validação de acesso à entidade vinculada
- ✅ Tenant isolation
- ✅ Extração automática de texto para PDFs

### 2. GET /api/anexos/:id
- ✅ Obter metadados do anexo
- ✅ Gerar URL assinada (24h de validade)
- ✅ Verificação de tenant
- ✅ Include de dados do usuário que fez upload

### 3. GET /api/anexos/:id/download
- ✅ Gerar URL assinada para download direto do R2
- ✅ Retorna URL com expiração de 24h

### 4. DELETE /api/anexos/:id
- ✅ Soft delete do anexo
- ✅ Remoção do arquivo no R2
- ✅ Auditoria (registra quem deletou)

### 5. GET /api/anexos/entidade/:tipo/:id
- ✅ Listar anexos de uma entidade
- ✅ Suporte para cotação, documento_venda, mensagem_chat
- ✅ Ordenação por data (mais recente primeiro)
- ✅ URLs assinadas para todos os anexos

### 6. POST /api/anexos/:id/new-version
- ✅ Upload de nova versão de arquivo
- ✅ Mantém histórico de versões
- ✅ Vincula versão anterior (arquivoAnteriorId)

### 7. GET /api/anexos/:id/versions
- ✅ Listar histórico de versões
- ✅ Ordenado por versão (mais recente primeiro)
- ✅ Include de dados do usuário em cada versão

### 8. POST /api/anexos/:id/extract-pdf
- ✅ Extrair texto de PDF
- ✅ Salvar texto extraído no banco
- ✅ Salvar metadados (páginas, autor, título)
- ✅ Validação de tipo (apenas PDFs)

## 🔐 Middleware de Validação

### validateEntityAccess
Função criada para validar se o usuário tem acesso à entidade vinculada ao anexo:

```typescript
async function validateEntityAccess(
  entidadeTipo: string,
  entidadeId: string,
  userId: string,
  corretoraId: string,
): Promise<boolean>
```

**Validações por tipo:**
- **cotacao**: Verifica se cotação existe e pertence à corretora
- **documento_venda**: Verifica se documento existe e pertence à corretora
- **mensagem_chat**: Verifica se mensagem existe, canal pertence à corretora e usuário é membro do canal

## 🎯 Rotas Específicas por Entidade

### Cotações
**Arquivo:** `apps/api/src/routes/cotacoes/anexos.ts`

- ✅ POST /api/cotacoes/:id/anexos/upload
- ✅ GET /api/cotacoes/:id/anexos
- ✅ DELETE /api/cotacoes/:cotacaoId/anexos/:anexoId

### Documentos de Venda
**Arquivo:** `apps/api/src/routes/documentos-venda/anexos.ts`

- ✅ POST /api/documentos-venda/:id/anexos/upload
- ✅ GET /api/documentos-venda/:id/anexos
- ✅ DELETE /api/documentos-venda/:documentoId/anexos/:anexoId

### Chat
**Arquivo:** `apps/api/src/routes/chat/anexos.ts`

- ✅ POST /api/chat/canais/:canalId/anexos/upload
- ✅ GET /api/chat/canais/:canalId/anexos
- ✅ GET /api/chat/mensagens/:mensagemId/anexo

**Recursos extras do chat:**
- Cria mensagem automaticamente ao enviar arquivo
- Broadcast via WebSocket para notificar membros do canal
- Suporte para mensagem de texto opcional junto ao arquivo

## 🛠️ Correções Realizadas

### 1. StorageService
**Arquivo:** `libs/shared/storage/src/index.ts`

- ✅ Corrigida assinatura do método `validateFile(mimeType, size)` (removido parâmetro fileName)
- ✅ Ajustadas chamadas do método em `uploadFile` e `uploadNewVersion`

### 2. MetricsService
**Arquivo:** `libs/shared/storage/src/metrics.service.ts`

- ✅ Corrigido erro de tipo em `checkLimits`:
  ```typescript
  bytesLimit: limits.limiteBytes ?? 0,
  arquivosLimit: limits.limiteArquivos ?? 0,
  ```

## 📝 Registro de Rotas

### App Principal
**Arquivo:** `apps/api/src/app.ts`

```typescript
await app.register(anexosRoutes, { prefix: '/api/anexos' });
```

### Rotas de Entidades
Todas as rotas específicas estão registradas:

```typescript
// cotacoes/index.ts
await fastify.register(cotacoesAnexosRoutes);

// documentos-venda/index.ts
await fastify.register(documentosVendaAnexosRoutes);

// chat/index.ts
await fastify.register(chatAnexosRoutes);
```

## 🔒 Segurança

### Validações Implementadas
- ✅ Tenant isolation em todas as rotas
- ✅ Autenticação obrigatória
- ✅ Validação de permissões via middleware `authorize`
- ✅ Validação de acesso à entidade vinculada
- ✅ Validação de MIME types (whitelist)
- ✅ Validação de tamanho máximo (10MB)

### MIME Types Permitidos
```typescript
- application/pdf
- image/jpeg
- image/jpg
- image/png
- application/vnd.openxmlformats-officedocument.wordprocessingml.document (DOCX)
- application/vnd.openxmlformats-officedocument.spreadsheetml.sheet (XLSX)
```

## 📊 Funcionalidades Especiais

### 1. Versionamento de Arquivos
- Histórico completo mantido
- Cadeia de versões através de `arquivoAnteriorId`
- Incremento automático do número de versão

### 2. Extração de PDF
- Texto extraído automaticamente no upload
- Campo `textoExtraido` no banco de dados
- Campo `metadadosExtracao` com informações do PDF
- Endpoint manual para reprocessar: POST /api/anexos/:id/extract-pdf

### 3. URLs Assinadas
- Validade de 24h
- Geradas sob demanda
- Acesso direto ao R2 sem passar pelo backend

### 4. Soft Delete
- Anexos não são removidos permanentemente do banco
- Campo `deletedAt` e `deletedPorId` para auditoria
- Arquivo removido do R2 (opcional, pode manter para backup)

## 🧪 Exemplos de Uso

### Upload de Arquivo
```bash
curl -X POST http://localhost:3000/api/anexos/upload \
  -H "Authorization: Bearer {token}" \
  -H "x-tenant-id: {corretoraId}" \
  -F "file=@documento.pdf" \
  -F "entidadeTipo=cotacao" \
  -F "entidadeId={cotacaoId}"
```

### Listar Anexos de Cotação
```bash
curl http://localhost:3000/api/cotacoes/{id}/anexos \
  -H "Authorization: Bearer {token}" \
  -H "x-tenant-id: {corretoraId}"
```

### Download de Arquivo
```bash
curl http://localhost:3000/api/anexos/{id}/download \
  -H "Authorization: Bearer {token}" \
  -H "x-tenant-id: {corretoraId}" \
  -o arquivo.pdf
```

### Nova Versão
```bash
curl -X POST http://localhost:3000/api/anexos/{id}/new-version \
  -H "Authorization: Bearer {token}" \
  -H "x-tenant-id: {corretoraId}" \
  -F "file=@documento_v2.pdf"
```

### Histórico de Versões
```bash
curl http://localhost:3000/api/anexos/{id}/versions \
  -H "Authorization: Bearer {token}" \
  -H "x-tenant-id: {corretoraId}"
```

### Extrair Texto de PDF
```bash
curl -X POST http://localhost:3000/api/anexos/{id}/extract-pdf \
  -H "Authorization: Bearer {token}" \
  -H "x-tenant-id: {corretoraId}"
```

## 📋 Documentação Swagger

Todas as rotas estão documentadas no Swagger com:
- Tags apropriadas (Anexos, Cotações, Documentos de Venda, Chat)
- Descrições claras
- Schemas de validação com Zod
- Exemplos de resposta

Acesse: http://localhost:3000/docs

## ✨ Status Final

**✅ Implementação 100% completa**

- Todas as 8 rotas principais implementadas
- Rotas específicas por entidade implementadas
- Validações de segurança implementadas
- Middleware de validação de acesso criado
- Correções de bugs realizadas
- Código sem erros de TypeScript no contexto da aplicação

## 🚀 Próximos Passos

Conforme documento original, o próximo passo é:
**[05-INTEGRACAO-CHAT.md]** - Integração com WebSocket

**Nota:** A integração básica com chat já está implementada (broadcast de mensagens com anexos via WebSocket).
