# Plano: MCP Server para EcoTech

## Objetivo
MCP Server separado que permite uma IA de WhatsApp consultar dados do sistema EcoTech (clientes, cotações, propostas, etc).

## Arquitetura

```
WhatsApp Bot (IA/LLM)
       │
       ▼
  MCP Server (novo)  ──────►  API EcoTech (existente)
  porta 3001                   porta 3000
                                    │
                                    ▼
                               PostgreSQL
```

> O MCP Server **não acessa o banco diretamente**. Toda leitura de dados passa pela API REST existente (porta 3000), reutilizando a lógica de negócio, permissões e formatações já implementadas.

## Estrutura de Pastas

```
apps/
└── mcp-server/           (NOVO)
    ├── src/
    │   ├── index.ts              # Entry point
    │   ├── server.ts             # MCP Server config (HTTP/SSE transport)
    │   ├── api-client.ts         # Cliente HTTP para a API EcoTech
    │   ├── tools/                # Tools do MCP
    │   │   ├── clientes.ts
    │   │   ├── cotacoes.ts
    │   │   ├── propostas.ts
    │   │   ├── documentos.ts
    │   │   ├── renovacoes.ts
    │   │   └── oportunidades.ts
    │   └── auth/
    │       └── tenant.ts         # Valida API key e extrai seguradoraId
    ├── project.json
    ├── tsconfig.json
    └── package.json
```

## Dependências

```json
{
  "@modelcontextprotocol/sdk": "^1.0.0",
  "zod": "^3.x"
}
```

Não usa `@ecotech/database` diretamente — acessa dados via API REST.

## Transport: HTTP/SSE (não stdio)

Usar **Streamable HTTP transport** (padrão recomendado pelo SDK do MCP para servidores em produção), não stdio.

- `stdio` só serve para processos locais (ex.: Claude Desktop)
- HTTP/SSE permite múltiplos bots conectados simultaneamente
- Facilita deploy e monitoramento

```ts
// server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
```

## Autenticação

Usar **API key estática por seguradora** (simples e suficiente para começar).

- Cada seguradora tem uma API key configurada no `.env` do bot
- O MCP Server valida a key no header `Authorization: Bearer <api-key>`
- A key mapeia para um `seguradoraId` internamente
- Todas as chamadas à API EcoTech são feitas com o token de serviço correspondente

```
# .env do mcp-server
API_KEY_SEGURADORA_1=abc123   # → seguradoraId: 1
API_KEY_SEGURADORA_2=xyz456   # → seguradoraId: 2
```

Evolução futura: API keys geradas e gerenciadas pelo painel da seguradora.

## Tools do MCP

### 1. buscar_cliente
- **Input:** `{ termo }` - busca por nome, CPF, CNPJ ou telefone
- **Output:** Lista de clientes com dados básicos
- **API:** `GET /clientes?search={termo}`

### 2. detalhes_cliente
- **Input:** `{ clienteId }`
- **Output:** Cliente completo com endereços, contatos, histórico
- **API:** `GET /clientes/{clienteId}`

### 3. listar_cotacoes
- **Input:** `{ clienteId?, status?, limite? }`
- **Output:** Cotações com valores, datas, status
- **API:** `GET /cotacoes?clienteId={id}&status={status}`

### 4. detalhes_cotacao
- **Input:** `{ cotacaoId }`
- **Output:** Cotação completa com produto, vendedor, comissões
- **API:** `GET /cotacoes/{cotacaoId}`

### 5. listar_propostas
- **Input:** `{ clienteId?, status? }`
- **Output:** Propostas com status atual
- **API:** `GET /propostas?clienteId={id}&status={status}`

### 6. listar_documentos_venda
- **Input:** `{ clienteId? }`
- **Output:** Apólices ativas, valores, vencimentos
- **API:** `GET /documentos-venda?clienteId={id}`

### 7. listar_renovacoes
- **Input:** `{ clienteId?, proximosMeses? }`
- **Output:** Renovações pendentes ou próximas do vencimento
- **API:** `GET /renovacoes?clienteId={id}&proximosMeses={n}`

### 8. listar_oportunidades
- **Input:** `{ status?, prioridade? }`
- **Output:** Pipeline CRM
- **API:** `GET /oportunidades?status={status}&prioridade={p}`

> `seguradoraId` não aparece nos inputs das tools — é extraído automaticamente da API key autenticada no header, garantindo isolamento de tenant sem expor o conceito para o LLM.

## Implementação - Passos

1. **Criar app no Nx**
   ```bash
   nx g @nx/node:application mcp-server
   ```

2. **Instalar SDK do MCP**
   ```bash
   pnpm add @modelcontextprotocol/sdk
   ```

3. **Criar `api-client.ts`** — cliente HTTP que injeta o token de serviço e o `seguradoraId` em todas as chamadas à API EcoTech

4. **Criar `auth/tenant.ts`** — middleware que valida a API key do header e resolve o `seguradoraId`

5. **Criar `server.ts`** — configurar MCP Server com Streamable HTTP transport

6. **Criar `tools/`** — implementar cada tool chamando `api-client.ts`

7. **Configurar `project.json`** — build e scripts de execução

8. **Testar com MCP Inspector**

## Arquivos a Modificar

- `apps/` - Adicionar pasta `mcp-server/`
- `package.json` (root) - Adicionar dependência MCP SDK

## Verificação

1. Rodar o server: `nx serve mcp-server`
2. Testar com MCP Inspector ou Claude Desktop
3. Validar isolamento de tenant (API key diferente = dados de seguradora diferente)
4. Testar cada tool com dados reais
5. Simular dois bots conectados simultaneamente (validar HTTP/SSE vs stdio)

---

# Parte 2: IA do WhatsApp

## Arquitetura do Bot

```
Cliente WhatsApp
       │
       ▼
  WhatsApp Business API (Meta Cloud / Evolution API)
       │
       ▼
  Bot Service (Node.js)
       │
       ├──► LLM (Claude/OpenAI)
       │         │
       │         ▼
       │    MCP Server ──► API EcoTech ──► PostgreSQL
       │
       └──► Webhook de respostas
```

## Fluxo de Mensagem

```
1. Cliente envia mensagem no WhatsApp
           │
           ▼
2. Webhook recebe a mensagem
   - Extrai: telefone, nome, conteúdo
   - Identifica seguradoraId pelo número do bot
           │
           ▼
3. Busca contexto do cliente
   - MCP: buscar_cliente({ termo: telefone })
   - Se não encontrar: criar lead ou pedir identificação
           │
           ▼
4. Monta prompt para LLM
   - System prompt com persona e regras
   - Contexto do cliente (dados, histórico)
   - Histórico da conversa (últimas N mensagens)
   - Mensagem atual
           │
           ▼
5. LLM processa com acesso ao MCP
   - Decide se precisa consultar dados
   - Chama tools se necessário
   - Gera resposta
           │
           ▼
6. Envia resposta ao cliente
   - Salva mensagem no histórico
   - Envia via WhatsApp API
```

## System Prompt da IA

```
Você é a assistente virtual da [NOME_SEGURADORA].

FUNÇÕES:
- Responder dúvidas sobre seguros do cliente
- Informar status de cotações e propostas
- Avisar sobre renovações próximas
- Coletar informações para novas cotações
- Encaminhar para atendimento humano quando necessário

REGRAS:
- Seja cordial e objetiva
- Não invente informações, consulte o sistema
- Para assuntos sensíveis (sinistros, cancelamentos), encaminhe para humano
- Não compartilhe dados de outros clientes
- Horário de atendimento humano: 8h-18h

FERRAMENTAS DISPONÍVEIS:
- buscar_cliente: encontrar cliente por nome/CPF/telefone
- detalhes_cliente: ver dados completos do cliente
- listar_cotacoes: ver cotações do cliente
- listar_documentos_venda: ver apólices ativas
- listar_renovacoes: ver renovações pendentes
```

## Intenções e Respostas

| Intenção | Exemplo | Ação da IA |
|----------|---------|------------|
| Saudação | "Oi", "Bom dia" | Cumprimentar + perguntar como ajudar |
| Status cotação | "Como tá minha cotação?" | `listar_cotacoes` → informar status |
| Status proposta | "Minha proposta foi aprovada?" | `listar_propostas` → informar status |
| Ver apólice | "Qual meu seguro atual?" | `listar_documentos_venda` → mostrar resumo |
| Renovação | "Quando vence meu seguro?" | `listar_renovacoes` → informar data |
| Nova cotação | "Quero fazer um seguro" | Coletar dados → encaminhar para vendedor |
| Sinistro | "Bati o carro" | Encaminhar para atendimento humano |
| Cancelamento | "Quero cancelar" | Encaminhar para atendimento humano |
| Dúvida geral | "O que cobre o seguro?" | Responder com base no produto |
| Fora do escopo | "Qual a capital da França?" | Redirecionar para assuntos de seguro |

## Estrutura do Bot Service

```
apps/
└── whatsapp-bot/
    ├── src/
    │   ├── index.ts
    │   ├── webhook.ts            # Recebe mensagens
    │   ├── whatsapp/
    │   │   ├── client.ts         # API do WhatsApp
    │   │   └── templates.ts      # Mensagens formatadas
    │   ├── ai/
    │   │   ├── llm.ts            # Cliente Claude/OpenAI
    │   │   ├── mcp-client.ts     # Conecta ao MCP Server via HTTP/SSE
    │   │   └── prompts.ts        # System prompts
    │   ├── conversation/
    │   │   ├── history.ts        # Histórico Redis (com fallback em memória)
    │   │   └── context.ts        # Monta contexto
    │   └── handlers/
    │       ├── message.ts        # Processa mensagem
    │       └── handoff.ts        # Encaminha para humano
    ├── project.json
    └── package.json
```

## Dependências do Bot

```json
{
  "@anthropic-ai/sdk": "^0.x",
  "@modelcontextprotocol/sdk": "^1.0.0",
  "ioredis": "^5.x",
  "fastify": "^4.x"
}
```

## Histórico de Conversa

Armazenar no Redis com TTL de 24h. Se o Redis estiver indisponível, fallback para cache em memória (Map) com TTL reduzido de 1h — garante continuidade sem travar o serviço.

```
Key: chat:{seguradoraId}:{telefone}
Value: [
  { role: "user", content: "Oi", timestamp: ... },
  { role: "assistant", content: "Olá! Como posso ajudar?", timestamp: ... },
  ...
]
TTL: 86400 (24 horas)
```

```ts
// history.ts — estratégia de fallback
async function getHistory(key: string): Promise<Message[]> {
  try {
    return await redis.get(key) ?? [];
  } catch {
    return inMemoryCache.get(key) ?? [];
  }
}
```

## Handoff para Humano

Quando a IA não consegue resolver:

1. IA responde: "Vou transferir para um atendente"
2. Cria notificação no sistema EcoTech
3. Marca conversa como "aguardando_humano"
4. Humano assume pelo painel ou WhatsApp Web
5. Quando finalizar, marca como "resolvido"

## Implementação - Passos

1. **Configurar WhatsApp Business API**
   - Meta Cloud API ou Evolution API (self-hosted)
   - Configurar webhook

2. **Criar app whatsapp-bot no Nx**

3. **Implementar webhook** - Receber e validar mensagens

4. **Implementar cliente MCP** - Conectar ao MCP Server via HTTP/SSE

5. **Implementar lógica de conversa**
   - Histórico no Redis com fallback em memória
   - Montagem de contexto
   - Chamada ao LLM

6. **Implementar handlers** - Processar intenções

7. **Implementar handoff** - Encaminhar para humano

8. **Testar fluxos principais**

## Verificação

1. Enviar "Oi" → IA responde com saudação
2. Perguntar status → IA consulta MCP e responde
3. Pedir cancelamento → IA encaminha para humano
4. Conversa longa → Histórico mantido corretamente
5. Cliente não cadastrado → IA pede identificação
6. Redis indisponível → Bot continua funcionando via fallback em memória
