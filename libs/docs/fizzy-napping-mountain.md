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
       │                            │
       └────────────────────────────┘
                    │
                    ▼
               PostgreSQL
```

## Estrutura de Pastas

```
apps/
└── mcp-server/           (NOVO)
    ├── src/
    │   ├── index.ts              # Entry point
    │   ├── server.ts             # MCP Server config
    │   ├── tools/                # Tools do MCP
    │   │   ├── clientes.ts
    │   │   ├── cotacoes.ts
    │   │   ├── propostas.ts
    │   │   ├── documentos.ts
    │   │   ├── renovacoes.ts
    │   │   └── oportunidades.ts
    │   └── auth/
    │       └── tenant.ts         # Autenticação por tenant
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

Vai reutilizar `@ecotech/database` do monorepo.

## Tools do MCP

### 1. buscar_cliente
- **Input:** `{ seguradoraId, termo }` - busca por nome, CPF, CNPJ ou telefone
- **Output:** Lista de clientes com dados básicos

### 2. detalhes_cliente
- **Input:** `{ seguradoraId, clienteId }`
- **Output:** Cliente completo com endereços, contatos, histórico

### 3. listar_cotacoes
- **Input:** `{ seguradoraId, clienteId?, status?, limite? }`
- **Output:** Cotações com valores, datas, status

### 4. detalhes_cotacao
- **Input:** `{ seguradoraId, cotacaoId }`
- **Output:** Cotação completa com produto, vendedor, comissões

### 5. listar_propostas
- **Input:** `{ seguradoraId, clienteId?, status? }`
- **Output:** Propostas com status atual

### 6. listar_documentos_venda
- **Input:** `{ seguradoraId, clienteId? }`
- **Output:** Apólices ativas, valores, vencimentos

### 7. listar_renovacoes
- **Input:** `{ seguradoraId, clienteId?, proximosMeses? }`
- **Output:** Renovações pendentes ou próximas do vencimento

### 8. listar_oportunidades
- **Input:** `{ seguradoraId, status?, prioridade? }`
- **Output:** Pipeline CRM

## Autenticação

O MCP Server recebe `seguradoraId` em cada chamada para garantir isolamento de tenant.

Opção 1 (simples): Token fixo por seguradora configurado no bot
Opção 2 (seguro): API key gerada no painel da seguradora

## Implementação - Passos

1. **Criar app no Nx**
   ```bash
   nx g @nx/node:application mcp-server
   ```

2. **Instalar SDK do MCP**
   ```bash
   pnpm add @modelcontextprotocol/sdk
   ```

3. **Criar server.ts** - Configurar MCP Server com stdio transport

4. **Criar tools/** - Implementar cada tool usando Drizzle ORM

5. **Criar auth/tenant.ts** - Validar seguradoraId em cada request

6. **Configurar project.json** - Build e scripts de execução

7. **Testar com MCP Inspector**

## Arquivos a Modificar

- `apps/` - Adicionar pasta `mcp-server/`
- `package.json` (root) - Adicionar dependência MCP SDK
- `nx.json` - Já suporta novos apps automaticamente

## Verificação

1. Rodar o server: `nx serve mcp-server`
2. Testar com MCP Inspector ou Claude Desktop
3. Validar isolamento de tenant (seguradoraId diferente = dados diferentes)
4. Testar cada tool com dados reais
