# EcoTech MCP Server

Serviço interno que expõe dados do EcoTech via protocolo MCP (Model Context Protocol), permitindo que uma IA de WhatsApp consulte clientes, cotações, propostas e outros dados da corretora.

## Arquitetura

```
Bot WhatsApp (IA)
      │
      │  POST /mcp
      │  Authorization: Bearer <MCP_INTERNAL_SECRET>
      │  x-corretora-id: <corretoraId>
      ▼
MCP Server (porta 3002)
      │
      │  POST /api/auth/mcp-token  (1x por hora, cacheado)
      │  GET  /api/clientes, /api/cotacoes, etc.
      ▼
API EcoTech (porta 3001)
      │
      ▼
PostgreSQL
```

O MCP server **não acessa o banco diretamente** — toda leitura passa pela API REST existente.

## Configuração

### Variáveis de ambiente

#### `apps/mcp-server/.env`
```env
PORT=3002
ECOTECH_API_URL=http://localhost:3001   # URL da API EcoTech
MCP_INTERNAL_SECRET=troque-por-um-segredo-longo-e-aleatorio
```

#### `apps/api/.env` (adicionar)
```env
MCP_INTERNAL_SECRET=troque-por-um-segredo-longo-e-aleatorio
```

> O `MCP_INTERNAL_SECRET` deve ser o **mesmo valor** nos dois serviços.

## Rodando em desenvolvimento

```bash
# Terminal 1 — API EcoTech
pnpm dev:api

# Terminal 2 — MCP Server
pnpm dev:mcp
```

## Como o bot se autentica

O bot envia dois headers em toda requisição ao MCP server:

| Header | Valor | Descrição |
|---|---|---|
| `Authorization` | `Bearer <MCP_INTERNAL_SECRET>` | Autentica o serviço interno |
| `x-corretora-id` | ID da corretora | Identifica qual corretora está sendo atendida |

O `corretoraId` é determinado pelo bot com base no número do WhatsApp que recebeu a mensagem — cada número está vinculado a uma corretora no banco.

## Cache de JWT

O MCP server obtém um JWT da API EcoTech para cada `corretoraId` via `POST /api/auth/mcp-token` e guarda em memória por 55 minutos (o token dura 1h). Em caso de 401 inesperado, renova automaticamente.

## Tools disponíveis

| Tool | Descrição | Endpoint |
|---|---|---|
| `buscar_cliente` | Busca por nome, CPF, CNPJ ou telefone | `GET /api/clientes?search=` |
| `detalhes_cliente` | Dados completos do cliente | `GET /api/clientes/:id` |
| `listar_cotacoes` | Cotações com filtro por cliente/status | `GET /api/cotacoes` |
| `detalhes_cotacao` | Cotação completa com produto e comissões | `GET /api/cotacoes/:id` |
| `listar_propostas` | Propostas com filtro por cliente/status | `GET /api/propostas` |
| `listar_documentos_venda` | Apólices ativas com vencimentos | `GET /api/documentos-venda` |
| `listar_renovacoes` | Renovações pendentes ou próximas | `GET /api/renovacoes` |
| `listar_oportunidades` | Pipeline CRM | `GET /api/oportunidades` |

## Testando

### MCP Inspector (recomendado)
```bash
npx @modelcontextprotocol/inspector http://localhost:3002/mcp
```
Adicionar os headers `Authorization` e `x-corretora-id` na UI do inspector.

### curl
```bash
# Listar tools disponíveis
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <MCP_INTERNAL_SECRET>" \
  -H "x-corretora-id: <corretoraId>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Chamar uma tool
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <MCP_INTERNAL_SECRET>" \
  -H "x-corretora-id: <corretoraId>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "buscar_cliente",
      "arguments": { "termo": "João Silva" }
    }
  }'
```

## Deploy (Railway)

Criar um novo serviço no projeto `natural-trust` com as seguintes configurações:

- **Build command:** `pnpm exec nx build mcp-server`
- **Start command:** `node dist/apps/mcp-server/main.js`
- **Root directory:** `/` (raiz do monorepo)

Configurar as variáveis de ambiente `PORT`, `ECOTECH_API_URL` e `MCP_INTERNAL_SECRET` no painel do Railway.

A comunicação com a API EcoTech pode usar a rede interna do Railway:
```env
ECOTECH_API_URL=http://ecotech-api.railway.internal:3001
```
