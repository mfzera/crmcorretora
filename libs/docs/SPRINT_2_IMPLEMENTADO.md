# Sprint 2: Integração com Entidades ✅

## 📅 Data de Implementação
26 de Janeiro de 2026

## 🎯 Objetivo
Conectar o sistema de anexos com cotações, documentos de venda e chat, adicionando rotas específicas e validações de segurança.

## ✅ Tarefas Concluídas

### 2.1 Anexos em Cotações ✅

**Arquivo criado:** `apps/api/src/routes/cotacoes/anexos.ts`

**Rotas Implementadas:**

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/api/cotacoes/:id/anexos/upload` | Upload de arquivo em cotação | ✅ vendas:criar_cotacao |
| GET | `/api/cotacoes/:id/anexos` | Listar anexos da cotação | ✅ vendas:visualizar_cotacao |
| DELETE | `/api/cotacoes/:cotacaoId/anexos/:anexoId` | Deletar anexo | ✅ vendas:criar_cotacao |

**Recursos:**
- ✅ Validação de tenant isolation
- ✅ Verificação de existência da cotação
- ✅ URLs assinadas para todos os anexos
- ✅ Upload multipart/form-data
- ✅ Listagem ordenada por data (mais recente primeiro)
- ✅ Soft delete

**Integração:**
- ✅ Rotas registradas em `apps/api/src/routes/cotacoes/index.ts`

---

### 2.2 Anexos em Documentos de Venda ✅

**Arquivo criado:** `apps/api/src/routes/documentos-venda/anexos.ts`

**Rotas Implementadas:**

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/api/documentos-venda/:id/anexos/upload` | Upload de arquivo em documento | ✅ vendas:criar_cotacao |
| GET | `/api/documentos-venda/:id/anexos` | Listar anexos do documento | ✅ vendas:visualizar_cotacao |
| DELETE | `/api/documentos-venda/:documentoId/anexos/:anexoId` | Deletar anexo | ✅ vendas:criar_cotacao |

**Recursos:**
- ✅ Validação de tenant isolation
- ✅ Verificação de existência do documento
- ✅ URLs assinadas para todos os anexos
- ✅ Upload multipart/form-data
- ✅ Listagem ordenada por data
- ✅ Soft delete

**Integração:**
- ✅ Rotas registradas em `apps/api/src/routes/documentos-venda/index.ts`

---

### 2.3 Integração com Chat ✅

**Arquivo criado:** `apps/api/src/routes/chat/anexos.ts`

**Rotas Implementadas:**

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/api/chat/canais/:canalId/anexos/upload` | Upload de arquivo no chat | ✅ chat:enviar_mensagem |
| GET | `/api/chat/canais/:canalId/anexos` | Listar anexos do canal | ✅ chat:visualizar_mensagens |
| GET | `/api/chat/mensagens/:mensagemId/anexo` | Obter anexo de mensagem | ✅ chat:visualizar_mensagens |

**Recursos Especiais do Chat:**
- ✅ Verificação de membro do canal
- ✅ Criação automática de mensagem tipo 'file'
- ✅ Broadcast via WebSocket para membros do canal
- ✅ Mensagem de texto opcional junto com arquivo
- ✅ Metadata do arquivo na mensagem:
  ```json
  {
    "anexoId": "uuid",
    "nomeArquivo": "documento.pdf",
    "tamanho": 12345,
    "mimeType": "application/pdf"
  }
  ```

**Fluxo de Upload no Chat:**
1. Cliente envia arquivo via multipart
2. StorageService faz upload para R2
3. Cria mensagem do tipo 'file' no chat
4. Atualiza anexo com ID da mensagem
5. Broadcast via WebSocket para todos os membros
6. Retorna mensagem + anexo com URL assinada

**Integração:**
- ✅ Rotas registradas em `apps/api/src/routes/chat/index.ts`

---

### 2.4 Validações e Segurança ✅

**Arquivo criado:** `libs/shared/storage/src/validators.ts`

**Validações Implementadas:**

#### 1. MIME Types Permitidos
```typescript
- PDFs: application/pdf
- Imagens: image/jpeg, image/jpg, image/png, image/gif, image/webp
- Office: DOCX, XLSX, PPTX, DOC, XLS
- Texto: text/plain, text/csv
- Compactados: application/zip, application/x-rar-compressed
```

#### 2. Limites de Tamanho por Tipo
```typescript
- Imagens (JPEG/PNG): 5MB
- GIFs: 2MB
- PDFs: 10MB
- ZIPs/RAR: 20MB
- Outros: 10MB (padrão)
```

#### 3. Validação de Nome de Arquivo
- ✅ Prevenção de path traversal (`..`, `/`, `\`)
- ✅ Caracteres permitidos: alfanuméricos, espaço, hífen, underscore, ponto
- ✅ Obrigatoriedade de extensão
- ✅ Limite de 255 caracteres
- ✅ Sanitização automática

#### 4. Funções de Validação
```typescript
✅ validateMimeType(mimeType)
✅ validateFileSize(size, mimeType)
✅ validateFileName(fileName)
✅ sanitizeFileName(fileName)
✅ detectMimeTypeFromExtension(fileName)
✅ isImage(mimeType)
✅ isPDF(mimeType)
✅ isOfficeDocument(mimeType)
✅ validateFile(fileName, mimeType, size) // Validação completa
```

**Segurança Implementada:**

1. **Tenant Isolation**: Todos os endpoints verificam `corretoraId`
2. **Autorização**: Decoradores de permissões em todas as rotas
3. **Ownership**: Verificação de pertencimento da entidade ao tenant
4. **Member Validation**: No chat, verifica se usuário é membro do canal
5. **Soft Delete**: Arquivos deletados mantidos para auditoria
6. **Rate Limiting**: Herdado do Fastify (já configurado no app)
7. **File Size Limits**: Diferentes por tipo de arquivo
8. **MIME Type Whitelist**: Apenas tipos seguros permitidos
9. **Path Traversal Protection**: Validação de nome de arquivo
10. **Signed URLs**: URLs com expiração de 24h

---

## 📊 Estatísticas

- **Arquivos criados:** 4
- **Linhas de código:** ~750
- **Endpoints API adicionados:** 9
- **Funções de validação:** 9
- **MIME types suportados:** 15

---

## 🔧 Estrutura de Arquivos

```
apps/api/src/routes/
├── cotacoes/
│   └── anexos.ts           ✅ NOVO - Anexos em cotações
├── documentos-venda/
│   └── anexos.ts           ✅ NOVO - Anexos em documentos
└── chat/
    └── anexos.ts           ✅ NOVO - Anexos no chat

libs/shared/storage/src/
└── validators.ts           ✅ NOVO - Validações de segurança
```

---

## �� Resumo das Rotas

### Total de Endpoints de Anexos

| Contexto | Endpoints | Status |
|----------|-----------|--------|
| Anexos Gerais | 7 | ✅ Sprint 1 |
| Cotações | 3 | ✅ Sprint 2 |
| Documentos | 3 | ✅ Sprint 2 |
| Chat | 3 | ✅ Sprint 2 |
| **TOTAL** | **16** | ✅ |

---

## 🧪 Como Testar

### 1. Testar Upload em Cotação

```bash
# 1. Fazer login
POST http://localhost:3001/api/auth/login
{
  "email": "vendedor@corretora.com",
  "senha": "senha123"
}

# 2. Criar ou obter ID de cotação existente
GET http://localhost:3001/api/cotacoes

# 3. Upload de anexo
POST http://localhost:3001/api/cotacoes/{cotacaoId}/anexos/upload
Headers:
  Authorization: Bearer {JWT}
  Content-Type: multipart/form-data
Body:
  file: proposta.pdf

# 4. Listar anexos da cotação
GET http://localhost:3001/api/cotacoes/{cotacaoId}/anexos
Headers:
  Authorization: Bearer {JWT}
```

### 2. Testar Upload em Documento de Venda

```bash
POST http://localhost:3001/api/documentos-venda/{documentoId}/anexos/upload
Headers:
  Authorization: Bearer {JWT}
  Content-Type: multipart/form-data
Body:
  file: apolice.pdf
```

### 3. Testar Upload no Chat

```bash
POST http://localhost:3001/api/chat/canais/{canalId}/anexos/upload
Headers:
  Authorization: Bearer {JWT}
  Content-Type: multipart/form-data
Body:
  file: screenshot.png
  mensagem: "Olha essa captura de tela!"
```

### 4. Testar Validações

```bash
# Testar arquivo muito grande (deve falhar)
# Testar MIME type não permitido (deve falhar)
# Testar nome de arquivo inválido (deve falhar)
```

---

## 🔐 Segurança - Checklist

- ✅ Tenant isolation em todas as rotas
- ✅ Autenticação JWT obrigatória
- ✅ Permissões granulares (RBAC)
- ✅ Validação de MIME type
- ✅ Validação de tamanho de arquivo
- ✅ Validação de nome de arquivo
- ✅ Prevenção de path traversal
- ✅ Soft delete para auditoria
- ✅ URLs assinadas com expiração
- ✅ Verificação de ownership
- ✅ Verificação de membro (chat)
- ✅ Rate limiting (herdado do app)

---

## 🚀 Próximos Passos

### Sprint 3: Painel Admin - Backend (Próximo)
- Criar schemas de admin, métricas e backups
- Implementar autenticação administrativa
- Criar MetricsService para calcular uso
- Criar BackupService para backups automáticos
- Implementar rotas admin completas

### Documentos de Referência:
- [docs/plano/06-ADMIN-AUTH.md](../plano/06-ADMIN-AUTH.md) - Autenticação admin
- [docs/plano/07-METRICS-SERVICE.md](../plano/07-METRICS-SERVICE.md) - Métricas
- [docs/plano/08-BACKUP-SERVICE.md](../plano/08-BACKUP-SERVICE.md) - Backups
- [docs/plano/09-API-ADMIN.md](../plano/09-API-ADMIN.md) - Rotas admin

---

## 📋 Exemplos de Uso

### Upload de Arquivo em Cotação (Node.js)
```javascript
const FormData = require('form-data');
const fs = require('fs');

const form = new FormData();
form.append('file', fs.createReadStream('proposta.pdf'));

const response = await fetch(
  'http://localhost:3001/api/cotacoes/{id}/anexos/upload',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      ...form.getHeaders()
    },
    body: form
  }
);

const result = await response.json();
console.log('Anexo criado:', result.anexo.id);
console.log('URL para download:', result.urlAssinada);
```

### Upload no Chat com Mensagem (cURL)
```bash
curl -X POST \
  http://localhost:3001/api/chat/canais/{canalId}/anexos/upload \
  -H "Authorization: Bearer {JWT}" \
  -F "file=@screenshot.png" \
  -F "mensagem=Veja essa captura!"
```

### Listar Anexos de Documento (Fetch)
```javascript
const response = await fetch(
  `http://localhost:3001/api/documentos-venda/${documentoId}/anexos`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const anexos = await response.json();
console.log(`Total de anexos: ${anexos.length}`);
```

---

## ⚠️ Observações Importantes

1. **WebSocket no Chat**: Mensagens com arquivo são broadcastadas automaticamente
2. **Metadata no Chat**: Informações do arquivo ficam no campo `metadata` da mensagem
3. **Permissões**: Ajustar permissões específicas conforme necessário
4. **Soft Delete**: Arquivos deletados permanecem no DB mas são removidos do R2
5. **URLs Assinadas**: Válidas por 24h, depois precisam ser regeneradas

---

## 🎉 Status Final

**Sprint 2: ✅ COMPLETO**

O sistema de anexos está agora completamente integrado com:
- ✅ Cotações
- ✅ Documentos de Venda  
- ✅ Chat (com broadcast WebSocket)
- ✅ Validações de segurança robustas

Pronto para uso em produção após configuração do Cloudflare R2!
