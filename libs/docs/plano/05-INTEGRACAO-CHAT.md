
## 📋 Visão Geral

Integração do sistema de anexos com o chat em tempo real via WebSocket.

**Arquivo a modificar**: `libs/plugins/chat/src/chat.service.ts`

## 🔄 Fluxo de Envio de Arquivo no Chat

```
1. Cliente seleciona arquivo
2. Upload para R2 via API REST
3. Criar mensagem tipo 'arquivo'
4. Vincular anexo à mensagem
5. Broadcast via WebSocket para todos do canal
6. Clientes renderizam mensagem com preview
```

## 📝 Modificações no ChatService

### 1. Adicionar Método `sendFileMessage`

```typescript
// libs/plugins/chat/src/chat.service.ts

import { StorageService } from '@ecotech/storage';

export class ChatService {
  private r2: R2Client;
  private storage: StorageService;

  constructor() {
    // ... existing code
    this.storage = new StorageService();
  }

  /**
   * Enviar mensagem com arquivo no chat
   */
  async sendFileMessage(
    canalId: string,
    usuarioId: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
    legenda?: string
  ): Promise<MensagemChat> {
    logger.info(
      `📎 sendFileMessage: canal=${canalId}, usuario=${usuarioId}, file=${fileName}`
    );

    // 1. Validar permissão no canal
    const hasPermission = await this.checkChannelPermission(canalId, usuarioId);
    if (!hasPermission) {
      throw new Error('Sem permissão para enviar mensagens neste canal');
    }

    // 2. Buscar canal para pegar corretoraId
    const canal = await db.query.canaisChat.findFirst({
      where: eq(canaisChat.id, canalId),
    });

    if (!canal) {
      throw new Error('Canal não encontrado');
    }

    // 3. Upload para R2 (cria anexo temporário)
    const uploadResult = await this.storage.uploadFile({
      file,
      fileName,
      mimeType,
      corretoraId: canal.corretoraId,
      entidadeTipo: 'mensagem_chat',
      entidadeId: 'temp', // Temporário, será atualizado depois
      uploadPorId: usuarioId,
    });

    // 4. Criar mensagem com tipo 'arquivo'
    const [mensagem] = await db
      .insert(mensagensChat)
      .values({
        canalId,
        usuarioId,
        tipo: 'arquivo',
        conteudo: legenda || fileName,
        arquivoUrl: uploadResult.urlAssinada,
        arquivoNome: fileName,
        arquivoTipo: mimeType,
      })
      .returning();

    logger.info(`💾 Mensagem criada com ID: ${mensagem.id}`);

    // 5. Atualizar anexo com ID da mensagem
    await db
      .update(anexos)
      .set({ entidadeId: mensagem.id })
      .where(eq(anexos.id, uploadResult.anexo.id));

    // 6. Processar menções (se houver na legenda)
    if (legenda) {
      await this.processMentions(mensagem.id, legenda, canalId, usuarioId);
    }

    // 7. Buscar dados completos da mensagem
    const mensagemCompleta = await db.query.mensagensChat.findFirst({
      where: eq(mensagensChat.id, mensagem.id),
      with: {
        usuario: {
          columns: {
            id: true,
            nome: true,
            email: true,
            avatarUrl: true,
          },
          with: {
            cargo: {
              columns: {
                nomeCargo: true,
                cor: true,
              },
            },
          },
        },
      },
    });

    logger.info(`📡 Iniciando broadcast para canal ${canalId}`);

    // 8. Broadcast via WebSocket
    await this.broadcastToChannel(canalId, canal.corretoraId, {
      type: 'message',
      canalId,
      usuarioId,
      data: mensagemCompleta,
    });

    logger.info(`✅ Arquivo enviado com sucesso no chat`);

    return mensagemCompleta as MensagemChat;
  }
}
```

---

## 🌐 Adicionar Handler WebSocket

### Modificar WebSocket Handler

```typescript
// apps/api/src/routes/chat/websocket.ts (ou similar)

import { ChatService } from '@ecotech/plugins/chat';

export function setupWebSocket(fastify: FastifyInstance) {
  const chatService = new ChatService();

  fastify.get('/ws', { websocket: true }, (socket, request) => {
    const { sub: usuarioId, corretoraId } = request.user;

    // Adicionar cliente
    chatService.addClient(usuarioId, corretoraId, socket);

    socket.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case 'message':
            await chatService.sendMessage(
              data.canalId,
              usuarioId,
              data.conteudo,
              data.respostaParaId
            );
            break;

          case 'typing':
            await chatService.startTyping(data.canalId, usuarioId);
            break;

          case 'stop_typing':
            await chatService.stopTyping(data.canalId, usuarioId);
            break;

          // 🆕 Novo handler para arquivos
          case 'request_upload_url':
            // Cliente quer URL para upload direto
            const uploadUrl = await getPresignedUploadUrl(
              corretoraId,
              data.canalId,
              usuarioId,
              data.fileName,
              data.mimeType
            );

            socket.send(
              JSON.stringify({
                type: 'upload_url',
                data: {
                  uploadUrl,
                  canalId: data.canalId,
                  tempId: data.tempId,
                },
              })
            );
            break;

          // Cliente confirmou upload
          case 'file_uploaded':
            // Arquivo foi uploaded para R2
            // Criar mensagem e broadcast
            await handleFileUploaded(
              data.canalId,
              usuarioId,
              data.anexoId,
              data.legenda
            );
            break;

          default:
            logger.warn(`Tipo de mensagem desconhecido: ${data.type}`);
        }
      } catch (error) {
        logger.error('Erro ao processar mensagem WebSocket:', error);
        socket.send(
          JSON.stringify({
            type: 'error',
            error: error.message,
          })
        );
      }
    });

    socket.on('close', () => {
      chatService.removeClient(usuarioId, socket);
    });
  });
}
```

---

## 🔄 Fluxo Alternativo: Upload via REST

### Abordagem Recomendada

Em vez de enviar arquivo via WebSocket (limitações de tamanho), usar REST API:

```typescript
// Cliente React faz:
// 1. POST /api/anexos/upload (via REST)
// 2. Recebe anexoId
// 3. Envia via WebSocket apenas metadata

// WebSocket message:
{
  type: 'file_message',
  canalId: 'uuid',
  anexoId: 'uuid',
  legenda: 'Veja o contrato anexo'
}

// Backend WebSocket handler:
case 'file_message':
  const anexo = await db.query.anexos.findFirst({
    where: eq(anexos.id, data.anexoId)
  });

  if (!anexo) {
    throw new Error('Anexo não encontrado');
  }

  // Criar mensagem
  const [mensagem] = await db.insert(mensagensChat).values({
    canalId: data.canalId,
    usuarioId,
    tipo: 'arquivo',
    conteudo: data.legenda || anexo.nomeOriginal,
    arquivoUrl: await storage.getSignedUrl(anexo.id),
    arquivoNome: anexo.nomeOriginal,
    arquivoTipo: anexo.mimeType
  }).returning();

  // Atualizar anexo
  await db.update(anexos)
    .set({ entidadeId: mensagem.id })
    .where(eq(anexos.id, anexo.id));

  // Broadcast
  await chatService.broadcastToChannel(...);
  break;
```

---

## 📱 Exemplo Completo de Fluxo

### Backend: Rota Dedicada para Chat

```typescript
// apps/api/src/routes/chat/upload.ts

export default async function chatUploadRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', fastify.tenantIsolation);

  // Upload específico para chat
  fastify.post('/upload', async (request, reply) => {
    const data = await request.file();
    
    if (!data) {
      return reply.status(400).send({ error: 'Nenhum arquivo' });
    }

    const { canalId, legenda } = request.query as {
      canalId: string;
      legenda?: string;
    };

    // Validar acesso ao canal
    const canal = await db.query.canaisChat.findFirst({
      where: eq(canaisChat.id, canalId),
    });

    if (!canal) {
      return reply.status(404).send({ error: 'Canal não encontrado' });
    }

    const hasAccess = await chatService.checkChannelPermission(
      canalId,
      request.user.sub
    );

    if (!hasAccess) {
      return reply.status(403).send({ error: 'Sem acesso ao canal' });
    }

    // Upload e criar mensagem
    const buffer = await data.toBuffer();
    
    const mensagem = await chatService.sendFileMessage(
      canalId,
      request.user.sub,
      buffer,
      data.filename,
      data.mimetype,
      legenda
    );

    return {
      success: true,
      data: mensagem,
    };
  });
}
```

---

## 🎨 Frontend: Componente de Upload

```typescript
// apps/web/src/components/chat/file-upload-button.tsx

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUploadChatFile } from '@/lib/queries/chat';

export function FileUploadButton({ canalId }: { canalId: string }) {
  const [uploading, setUploading] = useState(false);
  const uploadMutation = useUploadChatFile();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho
    if (file.size > 10 * 1024 * 1024) {
      alert('Arquivo muito grande (máximo 10MB)');
      return;
    }

    setUploading(true);

    try {
      // Upload via REST
      const formData = new FormData();
      formData.append('file', file);

      await uploadMutation.mutateAsync({
        canalId,
        file: formData,
      });

      // Mensagem será broadcasted automaticamente via WebSocket
    } catch (error) {
      console.error('Erro ao enviar arquivo:', error);
      alert('Falha ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        type="file"
        id="chat-file-upload"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => document.getElementById('chat-file-upload')?.click()}
        disabled={uploading}
      >
        <Upload className={uploading ? 'animate-spin' : ''} />
      </Button>
    </>
  );
}
```

---

## 🎨 Frontend: Renderizar Arquivo em Mensagem

```typescript
// apps/web/src/components/chat/message-item.tsx

function renderFileMessage(mensagem: Mensagem) {
  const isImage = mensagem.arquivoTipo?.startsWith('image/');
  const isPdf = mensagem.arquivoTipo === 'application/pdf';

  if (isImage) {
    return (
      <div className="space-y-2">
        <img
          src={mensagem.arquivoUrl}
          alt={mensagem.arquivoNome}
          className="max-w-xs rounded-lg"
        />
        {mensagem.conteudo && (
          <p className="text-sm">{mensagem.conteudo}</p>
        )}
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
        <FileText className="h-6 w-6" />
        <div className="flex-1">
          <p className="font-medium">{mensagem.arquivoNome}</p>
          {mensagem.conteudo && (
            <p className="text-sm text-muted-foreground">
              {mensagem.conteudo}
            </p>
          )}
        </div>
        <a
          href={mensagem.arquivoUrl}
          download
          className="p-2 hover:bg-background rounded"
        >
          <Download className="h-4 w-4" />
        </a>
      </div>
    );
  }

  // Outros tipos
  return (
    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
      <Paperclip className="h-6 w-6" />
      <div className="flex-1">
        <p className="font-medium">{mensagem.arquivoNome}</p>
        {mensagem.conteudo && (
          <p className="text-sm text-muted-foreground">
            {mensagem.conteudo}
          </p>
        )}
      </div>
      <a
        href={mensagem.arquivoUrl}
        download
        className="p-2 hover:bg-background rounded"
      >
        <Download className="h-4 w-4" />
      </a>
    </div>
  );
}
```

---

## 🧪 Testes

### Teste de Upload via Chat

```typescript
// Test: Upload arquivo no chat
const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
const formData = new FormData();
formData.append('file', file);

const response = await fetch(
  `http://localhost:3000/api/chat/upload?canalId=${canalId}&legenda=Arquivo de teste`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  }
);

// Deve retornar mensagem criada
// WebSocket deve broadcast para todos do canal
```

---

## 📝 Checklist de Implementação

- [ ] Adicionar `sendFileMessage()` ao ChatService
- [ ] Criar rota `/api/chat/upload`
- [ ] Adicionar handlers WebSocket para arquivos
- [ ] Criar componente `FileUploadButton`
- [ ] Modificar `MessageItem` para renderizar arquivos
- [ ] Adicionar preview de imagens inline
- [ ] Adicionar botão de download
- [ ] Testar upload + broadcast
- [ ] Testar com múltiplos clientes conectados

---

## 📝 Próximo Documento

Continue com **[06-ADMIN-AUTH.md](./06-ADMIN-AUTH.md)** para autenticação administrativa.
