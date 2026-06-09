# WhatsApp Business Integration — Plano Técnico

> Branch: `feature/whatsapp-chatbot`
> Número único da empresa · Múltiplos agentes (vendedores) · Meta Cloud API oficial

---

## Stack

### Backend

| Camada | Tecnologia | Versão | Justificativa |
|---|---|---|---|
| Framework | Fastify | 4.x (existente) | já em produção |
| ORM | Drizzle ORM | 0.45+ (existente) | tipagem estrita, sem overhead |
| Fila de jobs | BullMQ | 5.x (existente) | Redis-backed, retry nativo |
| HTTP client (Meta API) | `undici` | 7.x | nativo do Node.js, zero deps, mais rápido que axios |
| WebSocket | `@fastify/websocket` | 10.x (existente) | canal realtime já ativo |
| Storage de mídia | Cloudflare R2 | — (existente) | já integrado, barato |
| Cache | Redis (ioredis) | 5.x (existente) | já usado pelo BullMQ |
| DB | PostgreSQL + Drizzle | — (existente) | |

### Meta Cloud API

| Item | Detalhe |
|---|---|
| Versão da Graph API | **v22.0** (mais recente, 2025) |
| Endpoint base | `https://graph.facebook.com/v22.0` |
| Envio | `POST /{phone_number_id}/messages` |
| Templates | `GET/POST /{waba_id}/message_templates` |
| Mídia upload | `POST /{phone_number_id}/media` |
| Webhook | eventos `messages`, `statuses` via POST |

### Frontend

| Camada | Tecnologia | Versão | Justificativa |
|---|---|---|---|
| Framework | Next.js (App Router) | 16.x (existente) | |
| Estado global | Zustand | existente | leve, sem boilerplate |
| Realtime | WebSocket nativo (hook) | — | reutiliza canal existente |
| Virtualização de lista | `@tanstack/react-virtual` | 3.x | renderiza só mensagens visíveis |
| Data fetching | SWR | 2.x (existente) | cache + revalidação automática |
| UI | Componentes existentes (`/ui`) | — | consistência visual |
| Emoji picker | `emoji-mart` | 5.x | leve, tree-shakeable |

---

## Arquitetura de alto nível

```
┌─────────────┐    HTTPS     ┌──────────────────────────────────────────────┐
│  Meta Cloud │◄────────────►│  EcoTech API (Fastify)                       │
│  (webhook)  │              │                                              │
└─────────────┘              │  POST /whatsapp/webhook (sem auth, pública)  │
                             │       │                                      │
                             │       ▼                                      │
                             │  BullMQ queue: whatsapp-inbound              │
                             │       │                                      │
                             │       ▼                                      │
                             │  Worker: persiste mensagem no PG             │
                             │       │                                      │
                             │       ▼                                      │
                             │  WebSocket broadcast → vendedor atribuído    │
                             └──────────────────────────────────────────────┘
                                          ▲   ▲
                             WebSocket    │   │  REST (SWR)
                                          │   │
                             ┌────────────┴───┴───────────────┐
                             │  Next.js — /whatsapp           │
                             │  Inbox | Chat | Templates      │
                             └────────────────────────────────┘
```

**Princípio de performance crítico:** O webhook da Meta exige resposta `200 OK` em < 5s ou ele reencaminha. Todo processamento acontece **fora** do request-response cycle, via fila BullMQ.

---

## Schema do banco

### `whatsapp_config`
```
id                  uuid PK
phone_number_id     text NOT NULL        -- ID do número na Meta
waba_id             text NOT NULL        -- WhatsApp Business Account ID
access_token        text NOT NULL        -- token permanente (system user)
webhook_verify_token text NOT NULL       -- token de verificação do webhook
display_name        text
is_active           boolean DEFAULT true
created_at          timestamp
updated_at          timestamp
```

### `whatsapp_conversations`
```
id                  uuid PK
wa_contact_phone    text NOT NULL        -- número do contato (ex: 5511999999999)
wa_contact_name     text                 -- nome retornado pelo WhatsApp
cliente_id          uuid FK clientes     -- nullable (pode ser contato sem cadastro)
assigned_to         uuid FK usuarios     -- vendedor atual
status              enum: open|waiting|closed|archived  DEFAULT open
last_message_at     timestamp
last_message_preview text
unread_count        integer DEFAULT 0
created_at          timestamp
updated_at          timestamp

INDEX: (assigned_to, status, last_message_at DESC)  -- inbox query
INDEX: (wa_contact_phone)                            -- dedup de contato
```

### `whatsapp_messages`
```
id                  uuid PK
conversation_id     uuid FK NOT NULL
wamid               text UNIQUE          -- ID da mensagem na Meta (ex: wamid.xxx)
direction           enum: inbound|outbound
type                enum: text|image|document|audio|video|sticker|template|reaction|unsupported
-- conteúdo (apenas 1 preenchido por vez)
text_body           text
media_r2_key        text                 -- mídia baixada e re-hospedada no R2
media_mime_type     text
media_filename      text
media_caption       text
template_name       text
template_params     jsonb
reaction_emoji      text
reaction_target_wamid text
-- status (outbound)
status              enum: pending|sent|delivered|read|failed  DEFAULT pending
error_code          text
error_message       text
-- remetente (outbound)
sender_id           uuid FK usuarios
sent_at             timestamp
delivered_at        timestamp
read_at             timestamp
created_at          timestamp

INDEX: (conversation_id, created_at DESC)  -- history query
INDEX: (wamid)                              -- status update lookup
```

### `whatsapp_templates`
```
id                  uuid PK
meta_template_id    text UNIQUE          -- ID retornado pela Meta
name                text NOT NULL
language            text NOT NULL        -- ex: pt_BR
category            enum: marketing|utility|authentication
status              enum: pending|approved|rejected|paused
components          jsonb                -- estrutura completa da Meta
preview_text        text                 -- texto renderizado para preview
created_by          uuid FK usuarios
created_at          timestamp
updated_at          timestamp
```

### `whatsapp_transfers`
```
id                  uuid PK
conversation_id     uuid FK NOT NULL
from_user_id        uuid FK usuarios
to_user_id          uuid FK usuarios
reason              text
created_at          timestamp

INDEX: (conversation_id, created_at DESC)
```

---

## API Routes

### Webhook (sem autenticação JWT)

```
GET  /whatsapp/webhook         verificação Meta (hub.challenge)
POST /whatsapp/webhook         receber eventos — responde 200 imediatamente, enfileira job
```

### Conversas (JWT obrigatório)

```
GET    /whatsapp/conversations                   listar (filtros: status, assigned_to, search)
GET    /whatsapp/conversations/:id               detalhe
GET    /whatsapp/conversations/:id/messages      histórico paginado (cursor-based)
POST   /whatsapp/conversations/start             iniciar via template (para número novo)
PATCH  /whatsapp/conversations/:id/status        open | closed | archived
POST   /whatsapp/conversations/:id/transfer      atribuir a outro vendedor
POST   /whatsapp/conversations/:id/read          marcar todas como lidas
```

### Mensagens (JWT obrigatório)

```
POST   /whatsapp/conversations/:id/messages      enviar mensagem
  body: { type: "text" | "image" | "document" | "audio" | "template" | "reaction" }
  multipart para mídia
```

### Templates (JWT obrigatório)

```
GET    /whatsapp/templates                       listar templates aprovados
POST   /whatsapp/templates                       criar e submeter para Meta
DELETE /whatsapp/templates/:id                   remover
POST   /whatsapp/templates/sync                  sincronizar status da Meta
```

### Config (admin only)

```
GET    /whatsapp/config                          ler credenciais WABA
PUT    /whatsapp/config                          salvar credenciais
POST   /whatsapp/config/test                     testar conexão com a Meta
```

---

## Eventos WebSocket

Reutiliza o canal existente `/api/chat/ws`. Novos tipos de evento:

```typescript
// Server → Client
{ type: "wa:message_new",          payload: WaMessage }
{ type: "wa:message_status",       payload: { wamid, status, timestamp } }
{ type: "wa:conversation_new",     payload: WaConversation }
{ type: "wa:conversation_updated", payload: { id, assigned_to, status, unread_count } }
{ type: "wa:conversation_assigned",payload: { id, to_user_id, from_user_id } }
```

Vendedores recebem apenas eventos das conversas atribuídas a eles.
Admins recebem todos os eventos.

---

## Workers BullMQ

### `whatsapp-inbound` (nova fila)
- **Trigger:** POST /whatsapp/webhook
- **Processamento:**
  1. Parsear evento (`messages` ou `statuses`)
  2. Para `messages`:
     - Upsert conversation (cria se novo contato)
     - Baixar mídia da Meta e re-hospedar no R2 (se aplicável)
     - Inserir mensagem no banco
     - Broadcast WebSocket `wa:message_new`
     - Incrementar `unread_count` na conversation
  3. Para `statuses`:
     - Atualizar `status`, `delivered_at`, `read_at` na mensagem
     - Broadcast WebSocket `wa:message_status`
- **Concorrência:** 5 workers paralelos
- **Retry:** 3x com backoff exponencial (1s, 5s, 30s)

### `whatsapp-send` (nova fila)
- **Trigger:** POST /messages ou /start
- **Processamento:**
  1. Ler mensagem do banco (status: pending)
  2. Chamar Meta Graph API v22.0 via `undici`
  3. Salvar `wamid` retornado, status → sent
  4. Broadcast WebSocket `wa:message_status`
- **Retry:** 3x (falhas transitórias da Meta API)
- **Em caso de falha definitiva:** status → failed + error_code

---

## Meta Cloud API — Integrações chave

### Enviar mensagem de texto
```
POST https://graph.facebook.com/v22.0/{phone_number_id}/messages
Authorization: Bearer {access_token}
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "text",
  "text": { "body": "Olá!" }
}
```

### Enviar template
```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "template",
  "template": {
    "name": "nome_do_template",
    "language": { "code": "pt_BR" },
    "components": [
      { "type": "body", "parameters": [{ "type": "text", "text": "João" }] }
    ]
  }
}
```

### Webhook payload (inbound)
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{ "id": "wamid.xxx", "from": "5511...", "type": "text", "text": { "body": "..." } }],
        "statuses": [{ "id": "wamid.xxx", "status": "delivered", "timestamp": "..." }],
        "contacts": [{ "wa_id": "5511...", "profile": { "name": "..." } }]
      }
    }]
  }]
}
```

---

## Frontend — Páginas e componentes

### Estrutura de arquivos
```
apps/web/src/
  app/(dashboard)/whatsapp/
    page.tsx                   — Inbox (lista de conversas)
    [id]/
      page.tsx                 — Tela de chat
    templates/
      page.tsx                 — CRUD de templates
  components/whatsapp/
    ConversationList.tsx       — painel esquerdo, virtualizado
    ConversationItem.tsx       — item da lista com avatar + preview + badge
    ChatWindow.tsx             — painel direito
    MessageList.tsx            — lista virtualizada de mensagens (react-virtual)
    MessageBubble.tsx          — bolha com status (✓ ✓✓ 🔵)
    MessageInput.tsx           — textarea + botões de ação
    MediaUploadButton.tsx      — upload de imagem/doc
    TemplateSelector.tsx       — modal de escolha de template
    TransferModal.tsx          — modal de transferência de vendedor
    ContactPanel.tsx           — slide-in com dados do cliente
    StatusBadge.tsx            — open | waiting | closed
    TemplateForm.tsx           — criar template
    TemplateList.tsx           — listar templates com status Meta
  hooks/whatsapp/
    useConversations.ts        — SWR para lista de conversas
    useMessages.ts             — SWR com paginação cursor-based
    useWhatsAppSocket.ts       — escuta eventos wa:* do WebSocket
    useSendMessage.ts          — mutação de envio
```

### UX do inbox
- Layout de 2 painéis (conversas | chat) em desktop
- Em mobile: navegação entre as telas
- Badge de não lido na sidebar e no item da conversa
- Filtros: Todas / Minhas / Aguardando / Encerradas
- Busca por nome ou número do contato

---

## Performance — Decisões chave

| Ponto | Decisão |
|---|---|
| Webhook | Resposta imediata 200 → fila BullMQ → worker assíncrono |
| Mensagens históricas | Paginação cursor-based (createdAt + id), sem OFFSET |
| Lista de mensagens no frontend | `@tanstack/react-virtual` — renderiza só o visível |
| Mídia inbound | Baixar da Meta (URL expira em 5min) → re-hospedar R2 no worker |
| Conexões WebSocket | 1 conexão por tab, multiplexada com tipos de evento |
| Índices DB | `(assigned_to, status, last_message_at DESC)` para inbox; `(conversation_id, created_at DESC)` para histórico |
| undici | Fetch nativo Node.js, connection pooling, sem overhead de axios |
| Cache de config WABA | Redis com TTL 1h — evita leitura de DB em cada envio |

---

## Fases de implementação

### Fase 1 — Fundação (backend)
- [ ] Schema das 5 tabelas + migration (`npx drizzle-kit generate`)
- [ ] Config WABA: rota admin GET/PUT + cache Redis
- [ ] Webhook endpoint: verificação GET + recebimento POST (resposta imediata)
- [ ] Fila `whatsapp-inbound` no BullMQ + worker básico (persiste texto)
- [ ] Broadcast WebSocket `wa:message_new` e `wa:message_status`

### Fase 2 — Envio e status
- [ ] Rota POST /messages (texto)
- [ ] Fila `whatsapp-send` + worker com undici
- [ ] Status de entrega/leitura via webhook → banco → WebSocket
- [ ] Download e re-hospedagem de mídia inbound no R2

### Fase 3 — Frontend MVP
- [ ] Hook `useWhatsAppSocket`
- [ ] Inbox (ConversationList + filtros)
- [ ] ChatWindow (MessageList virtualizado + MessageInput)
- [ ] Envio de texto e mídia
- [ ] Badge de não lido na sidebar

### Fase 4 — Templates
- [ ] CRUD de templates + submit para Meta
- [ ] Sync de status (approved/rejected)
- [ ] TemplateSelector no MessageInput
- [ ] Iniciar conversa nova via template

### Fase 5 — Transferência e gestão
- [ ] Transferência entre vendedores (backend + histórico)
- [ ] TransferModal no frontend
- [ ] Fechar / reabrir / arquivar conversa
- [ ] ContactPanel: vincular conversa a cliente existente

### Fase 6 — Polimento e métricas
- [ ] Busca no histórico de conversas
- [ ] Notificação push no navegador (Notification API)
- [ ] Métricas: tempo médio de resposta, volume por vendedor
- [ ] Visão admin: todas as conversas + filtro por vendedor

---

## Variáveis de ambiente necessárias

```env
# Meta Cloud API
META_WABA_ID=
META_PHONE_NUMBER_ID=
META_ACCESS_TOKEN=
META_WEBHOOK_VERIFY_TOKEN=
META_API_VERSION=v22.0
```

> As credenciais também são salvas no banco via `whatsapp_config` para permitir atualização sem redeploy.

---

## Segurança

- Webhook POST validado pelo header `X-Hub-Signature-256` (HMAC-SHA256 do payload com o app secret)
- `access_token` armazenado criptografado no banco (AES-256) — nunca exposto ao frontend
- Rotas de envio verificam que o vendedor é o `assigned_to` da conversa (ou admin)
- Rate limit separado para o endpoint do webhook

---

*Plano gerado em 2026-03-19 — atualizar conforme decisões de implementação.*
