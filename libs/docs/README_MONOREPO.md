# Ecotech2 Monorepo

## Transformação em Monorepo Nx Concluída ✅

Este é um monorepo Nx para o sistema SaaS de gestão de vendas para seguradoras.

### Estrutura

```
├── apps/api/                    # API Fastify principal
├── libs/shared/                 # Bibliotecas compartilhadas
├── libs/plugins/                # Plugins Fastify reutilizáveis
├── libs/features/               # Lógica de negócio por feature (12 modules)
└── docs/                        # Documentação
```

### Quick Start

```bash
# Instalar
pnpm install

# Development
pnpm dev

# Build
pnpm build

# Database
pnpm db:push
pnpm db:seed
```

### Scripts Disponíveis

- `pnpm dev` - Iniciar servidor
- `pnpm build` - Build da API
- `pnpm test` - Rodar testes
- `pnpm lint` - Lint do código
- `pnpm db:push` - Sincronizar schema
- `pnpm db:studio` - Drizzle Studio
- `pnpm nx:graph` - Visualizar dependency graph

### Path Aliases

```typescript
// Shared
@ecotech/shared/database
@ecotech/shared/utils
@ecotech/shared/types
@ecotech/shared/config

// Plugins
@ecotech/plugins/auth
@ecotech/plugins/authorization
@ecotech/plugins/tenant-isolation
@ecotech/plugins/quota-validator
@ecotech/plugins/error-handler

// Features (12 modules)
@ecotech/features/auth
@ecotech/features/usuarios
... (e assim por diante)
```

### Próximas Ações

1. Testar build: `pnpm nx build api`
2. Iniciar dev server: `pnpm dev`
3. Acessar API: http://localhost:3000
4. Acessar docs: http://localhost:3000/docs

---

Transformação concluída com sucesso! 🚀
