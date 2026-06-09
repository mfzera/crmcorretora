# 04 - API de Anexos

## 📋 Visão Geral

Rotas REST para gerenciamento de anexos no backend.

**Arquivo**: `apps/api/src/routes/anexos/index.ts`

## 🛣️ Rotas Implementadas

### 1. POST /api/anexos/upload

Upload de arquivo para R2.

**Headers:**
```
Authorization: Bearer {jwt}
x-tenant-id: {corretoraId}
Content-Type: multipart/form-data
```

**Body (multipart):**
```typescript
{
  file: File, // Arquivo binário
  entidadeTipo: 'cotacao' | 'documento_venda' | 'mensagem_chat',
  entidadeId: string // UUID da entidade
}
```

**Response 201:**
```typescript
{
  success: true,
  data: {
    anexo: {
      id: string,
      nomeOriginal: string,
      nomeArquivo: string,
      mimeType: string,
      tamanho: number,
      r2Key: string,
      versao: number,
      uploadEm: string
    },
    urlAssinada: string // URL para download (24h)
  }
}
```

**Validações:**
- ✅ Arquivo não excede 10MB
- ✅ MIME type está na whitelist
- ✅ Usuário tem permissão na entidade
- ✅ Entidade existe
- ✅ Tenant isolation

**Implementação:**

```typescript
import { FastifyPluginAsync } from 'fastify';
import { StorageService } from '@ecotech/storage';
import { authorize } from '@ecotech/plugins/authorization';

const anexosRoutes: FastifyPluginAsync = async (fastify) => {
  const storage = new StorageService();

  fastify.addHook('preHandler', fastify.tenantIsolation);
  fastify.addHook('preHandler', fastify.authenticate);

  // Upload
  fastify.post(
    '/upload',
    {
      preHandler: [authorize(['anexos:criar'])],
    },
    async (request, reply) => {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          success: false,
          error: 'Nenhum arquivo enviado',
        });
      }

      // Validar tamanho
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      const buffer = await data.toBuffer();

      if (buffer.length > MAX_SIZE) {
        return reply.status(400).send({
          success: false,
          error: `Arquivo muito grande: ${buffer.length} bytes (máximo: ${MAX_SIZE} bytes)`,
        });
      }

      // Validar MIME type
      const ALLOWED_MIMES = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];

      if (!ALLOWED_MIMES.includes(data.mimetype)) {
        return reply.status(400).send({
          success: false,
          error: `Tipo de arquivo não permitido: ${data.mimetype}`,
        });
      }

      // Parse query params
      const { entidadeTipo, entidadeId } = request.query as {
        entidadeTipo: string;
        entidadeId: string;
      };

      if (!entidadeTipo || !entidadeId) {
        return reply.status(400).send({
          success: false,
          error: 'entidadeTipo e entidadeId são obrigatórios',
        });
      }

      // TODO: Validar se usuário tem acesso à entidade
      // TODO: Validar se entidade existe

      // Upload
      const result = await storage.uploadFile({
        file: buffer,
        fileName: data.filename,
        mimeType: data.mimetype,
        corretoraId: request.user.corretoraId,
        entidadeTipo: entidadeTipo as any,
        entidadeId,
        uploadPorId: request.user.sub,
      });

      return reply.status(201).send({
        success: true,
        data: result,
      });
    }
  );
};

export default anexosRoutes;
```

---

### 2. GET /api/anexos/:id

Obter metadados e URL assinada.

**Response 200:**
```typescript
{
  success: true,
  data: {
    anexo: Anexo,
    urlAssinada: string
  }
}
```

**Implementação:**

```typescript
fastify.get(
  '/:id',
  {
    preHandler: [authorize(['anexos:visualizar'])],
  },
  async (request, reply) => {
    const { id } = request.params as { id: string };

    const anexo = await db.query.anexos.findFirst({
      where: and(
        eq(anexos.id, id),
        eq(anexos.corretoraId, request.user.corretoraId),
        isNull(anexos.deletedAt)
      ),
    });

    if (!anexo) {
      return reply.status(404).send({
        success: false,
        error: 'Anexo não encontrado',
      });
    }

    // TODO: Validar acesso à entidade vinculada

    const urlAssinada = await storage.getSignedUrl(id);

    return {
      success: true,
      data: { anexo, urlAssinada },
    };
  }
);
```

---

### 3. GET /api/anexos/:id/download

Stream direto do arquivo.

**Response 200:**
```
Content-Type: {mimeType}
Content-Disposition: attachment; filename="{nomeOriginal}"
Body: arquivo binário
```

**Implementação:**

```typescript
fastify.get(
  '/:id/download',
  {
    preHandler: [authorize(['anexos:visualizar'])],
  },
  async (request, reply) => {
    const { id } = request.params as { id: string };

    const anexo = await db.query.anexos.findFirst({
      where: and(
        eq(anexos.id, id),
        eq(anexos.corretoraId, request.user.corretoraId),
        isNull(anexos.deletedAt)
      ),
    });

    if (!anexo) {
      return reply.status(404).send({
        success: false,
        error: 'Anexo não encontrado',
      });
    }

    const buffer = await storage.downloadFile(id);

    reply
      .type(anexo.mimeType)
      .header('Content-Disposition', `attachment; filename="${anexo.nomeOriginal}"`)
      .send(buffer);
  }
);
```

---

### 4. DELETE /api/anexos/:id

Soft delete do anexo.

**Response 200:**
```typescript
{
  success: true,
  message: 'Anexo deletado com sucesso'
}
```

**Implementação:**

```typescript
fastify.delete(
  '/:id',
  {
    preHandler: [authorize(['anexos:deletar'])],
  },
  async (request, reply) => {
    const { id } = request.params as { id: string };

    const anexo = await db.query.anexos.findFirst({
      where: and(
        eq(anexos.id, id),
        eq(anexos.corretoraId, request.user.corretoraId),
        isNull(anexos.deletedAt)
      ),
    });

    if (!anexo) {
      return reply.status(404).send({
        success: false,
        error: 'Anexo não encontrado',
      });
    }

    // TODO: Validar ownership ou permissão admin

    await storage.deleteFile(id, request.user.sub);

    return {
      success: true,
      message: 'Anexo deletado com sucesso',
    };
  }
);
```

---

### 5. GET /api/cotacoes/:id/anexos

Listar anexos de uma cotação.

**Response 200:**
```typescript
{
  success: true,
  data: Anexo[]
}
```

**Implementação:**

```typescript
// Em apps/api/src/routes/cotacoes/index.ts

fastify.get(
  '/:id/anexos',
  {
    preHandler: [authorize(['vendas:visualizar_cotacao'])],
  },
  async (request, reply) => {
    const { id } = request.params as { id: string };

    // Validar acesso à cotação
    const cotacao = await db.query.cotacoes.findFirst({
      where: and(
        eq(cotacoes.id, id),
        eq(cotacoes.corretoraId, request.user.corretoraId)
      ),
    });

    if (!cotacao) {
      return reply.status(404).send({
        success: false,
        error: 'Cotação não encontrada',
      });
    }

    // Buscar anexos
    const anexosList = await db.query.anexos.findMany({
      where: and(
        eq(anexos.entidadeTipo, 'cotacao'),
        eq(anexos.entidadeId, id),
        eq(anexos.corretoraId, request.user.corretoraId),
        isNull(anexos.deletedAt)
      ),
      orderBy: [desc(anexos.uploadEm)],
      with: {
        uploadPor: {
          columns: {
            id: true,
            nome: true,
          },
        },
      },
    });

    // Gerar URLs assinadas
    const storage = new StorageService();
    const anexosComUrl = await Promise.all(
      anexosList.map(async (anexo) => ({
        ...anexo,
        urlAssinada: await storage.getSignedUrl(anexo.id),
      }))
    );

    return {
      success: true,
      data: anexosComUrl,
    };
  }
);
```

---

### 6. POST /api/anexos/:id/new-version

Upload de nova versão.

**Response 201:**
```typescript
{
  success: true,
  data: {
    anexo: Anexo, // Nova versão
    urlAssinada: string
  }
}
```

**Implementação:**

```typescript
fastify.post(
  '/:id/new-version',
  {
    preHandler: [authorize(['anexos:editar'])],
  },
  async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({
        success: false,
        error: 'Nenhum arquivo enviado',
      });
    }

    const buffer = await data.toBuffer();

    const result = await storage.uploadNewVersion(
      id,
      buffer,
      request.user.sub
    );

    return reply.status(201).send({
      success: true,
      data: result,
    });
  }
);
```

---

### 7. GET /api/anexos/:id/versions

Histórico de versões.

**Response 200:**
```typescript
{
  success: true,
  data: Anexo[] // Todas as versões, da mais recente para antiga
}
```

**Implementação:**

```typescript
fastify.get(
  '/:id/versions',
  {
    preHandler: [authorize(['anexos:visualizar'])],
  },
  async (request, reply) => {
    const { id } = request.params as { id: string };

    // Buscar anexo atual
    const anexoAtual = await db.query.anexos.findFirst({
      where: eq(anexos.id, id),
    });

    if (!anexoAtual) {
      return reply.status(404).send({
        success: false,
        error: 'Anexo não encontrado',
      });
    }

    // Buscar todas as versões (seguindo a cadeia)
    const versoes: Anexo[] = [anexoAtual];
    let anteriorId = anexoAtual.arquivoAnteriorId;

    while (anteriorId) {
      const anterior = await db.query.anexos.findFirst({
        where: eq(anexos.id, anteriorId),
      });

      if (!anterior) break;

      versoes.push(anterior);
      anteriorId = anterior.arquivoAnteriorId;
    }

    return {
      success: true,
      data: versoes,
    };
  }
);
```

---

### 8. POST /api/anexos/:id/extract-pdf

Extrair texto de PDF.

**Response 200:**
```typescript
{
  success: true,
  data: {
    texto: string,
    metadata: {
      totalPages: number,
      author?: string,
      title?: string
    }
  }
}
```

**Implementação:**

```typescript
fastify.post(
  '/:id/extract-pdf',
  {
    preHandler: [authorize(['anexos:editar'])],
  },
  async (request, reply) => {
    const { id } = request.params as { id: string };

    const anexo = await db.query.anexos.findFirst({
      where: and(
        eq(anexos.id, id),
        eq(anexos.corretoraId, request.user.corretoraId)
      ),
    });

    if (!anexo) {
      return reply.status(404).send({
        success: false,
        error: 'Anexo não encontrado',
      });
    }

    if (anexo.mimeType !== 'application/pdf') {
      return reply.status(400).send({
        success: false,
        error: 'Apenas PDFs podem ter texto extraído',
      });
    }

    // Download do PDF
    const buffer = await storage.downloadFile(id);

    // Extrair texto
    const pdfExtractor = new PdfExtractor();
    const extracted = await pdfExtractor.extract(buffer);

    // Salvar no banco
    await db
      .update(anexos)
      .set({
        textoExtraido: pdfExtractor.cleanText(extracted.text),
        metadadosExtracao: extracted.metadata,
      })
      .where(eq(anexos.id, id));

    return {
      success: true,
      data: {
        texto: extracted.text,
        metadata: extracted.metadata,
      },
    };
  }
);
```

---

## 🔐 Middleware de Validação

```typescript
// Validar acesso à entidade
async function validateEntityAccess(
  entidadeTipo: string,
  entidadeId: string,
  userId: string,
  corretoraId: string
): Promise<boolean> {
  switch (entidadeTipo) {
    case 'cotacao':
      const cotacao = await db.query.cotacoes.findFirst({
        where: and(
          eq(cotacoes.id, entidadeId),
          eq(cotacoes.corretoraId, corretoraId)
        ),
      });
      return !!cotacao;

    case 'documento_venda':
      const doc = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, entidadeId),
          eq(documentosVenda.corretoraId, corretoraId)
        ),
      });
      return !!doc;

    case 'mensagem_chat':
      // Validar acesso ao canal
      const mensagem = await db.query.mensagensChat.findFirst({
        where: eq(mensagensChat.id, entidadeId),
        with: { canal: true },
      });

      if (!mensagem) return false;

      // Validar se usuário é membro do canal
      // ... lógica de validação
      return true;

    default:
      return false;
  }
}
```

---

## 📝 Registrar Rotas

```typescript
// apps/api/src/app.ts

import anexosRoutes from './routes/anexos/index.js';

// ...

await app.register(anexosRoutes, { prefix: '/api/anexos' });
```

---

## 🧪 Testes

```bash
# Upload
curl -X POST http://localhost:3000/api/anexos/upload \
  -H "Authorization: Bearer {token}" \
  -H "x-tenant-id: {corretoraId}" \
  -F "file=@test.pdf" \
  -F "entidadeTipo=cotacao" \
  -F "entidadeId={cotacaoId}"

# Listar anexos de cotação
curl http://localhost:3000/api/cotacoes/{id}/anexos \
  -H "Authorization: Bearer {token}"

# Download
curl http://localhost:3000/api/anexos/{id}/download \
  -H "Authorization: Bearer {token}" \
  -o arquivo.pdf
```

---

## 📝 Próximo Documento

Continue com **[05-INTEGRACAO-CHAT.md](./05-INTEGRACAO-CHAT.md)** para integrar com WebSocket.
