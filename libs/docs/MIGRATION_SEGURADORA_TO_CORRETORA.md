# Plano de Migração: Renomear Seguradora para Corretora

## Contexto
O sistema é para corretoras de seguro (brokers), não para seguradoras. A tabela `seguradora` representa o tenant (a corretora), enquanto `seguradoras_parceiras` representa as seguradoras com quem a corretora trabalha (Porto Seguro, etc).

## Impacto
Esta é uma mudança estrutural grande que afeta:
- 1 tabela principal (seguradora → corretora)
- 15+ tabelas com foreign keys
- Dezenas de arquivos de código
- Todas as migrations existentes
- Schema do Drizzle ORM
- Queries no backend
- Types no frontend

## Arquivos Criados
✅ `/libs/shared/database/migrations/0011_rename_seguradora_to_corretora.sql` - Migration SQL completa

## Passos para Execução

### 1. Backup do Banco de Dados
```bash
# IMPORTANTE: Faça backup antes de executar qualquer mudança
pg_dump $DATABASE_URL > backup_before_rename_$(date +%Y%m%d).sql
```

### 2. Executar Migration
```bash
# Conectar ao banco e executar a migration
psql $DATABASE_URL < libs/shared/database/migrations/0011_rename_seguradora_to_corretora.sql
```

### 3. Atualizar Schema do Drizzle

#### Arquivos a modificar:
- `libs/shared/database/src/schema/seguradora.ts` → renomear para `corretora.ts`
  - Mudar nome da tabela: `"seguradora"` → `"corretora"`
  - Renomear exports: `seguradoras` → `corretoras`
  - Renomear types: `Seguradora` → `Corretora`
  
- Todas as tabelas que referenciam (15+ arquivos):
  - `usuario.ts`
  - `cargo.ts`
  - `equipe.ts`
  - `cliente.ts`
  - `produto.ts`
  - `cotacao.ts`
  - `proposta.ts`
  - `documento-venda.ts`
  - `endosso.ts`
  - `renovacao-comercial.ts`
  - `notificacao.ts`
  - `canal-chat.ts`
  - `oportunidade.ts`
  
  Em cada um:
  - Renomear coluna: `seguradoraId` → `corretoraId`
  - Atualizar import: `import { seguradoras }` → `import { corretoras }`
  - Atualizar referencias e relations

### 4. Atualizar Index (libs/shared/database/src/index.ts)
```typescript
// Antes
export * from './schema/seguradora.js';

// Depois
export * from './schema/corretora.js';
```

### 5. Atualizar Backend (apps/api)
Buscar e substituir em todos os arquivos:
- `seguradoraId` → `corretoraId`
- `import { seguradoras }` → `import { corretoras }`
- `seguradoras.` → `corretoras.`
- Comentários e strings que mencionam "seguradora" onde deveria ser "corretora"

Principais arquivos:
- Todos os routes (`apps/api/src/routes/**/*.ts`)
- Plugins de autenticação
- Tenant isolation plugin
- Seeds

### 6. Atualizar Frontend (apps/web)
- Types e interfaces
- Stores (Zustand)
- Queries (React Query)
- Componentes que mostram dados da seguradora/corretora

### 7. Atualizar Types Compartilhados
- `libs/shared/types/src/**/*.ts`

### 8. Executar Testes
```bash
# Testar se tudo compila
pnpm build

# Testar a aplicação
pnpm dev
```

## Rollback (se necessário)
Se algo der errado, você pode reverter usando o backup:
```bash
psql $DATABASE_URL < backup_before_rename_YYYYMMDD.sql
```

## Checklist de Validação
- [ ] Migration executada sem erros
- [ ] Schema do Drizzle atualizado
- [ ] Código compila sem erros TypeScript
- [ ] API inicia sem erros
- [ ] Frontend inicia sem erros
- [ ] Login funciona
- [ ] CRUD básico funciona em pelo menos 3 entidades
- [ ] Tenant isolation ainda funciona
- [ ] Métricas carregam corretamente

## Notas Importantes
1. Esta mudança quebra a compatibilidade com dados existentes se não executar a migration
2. Todos os desenvolvedores precisarão executar a migration localmente
3. Em produção, execute durante janela de manutenção
4. Considere fazer em uma branch separada primeiro

## Estimativa de Tempo
- Migration: 2-5 minutos
- Atualização de código: 2-3 horas
- Testes: 1 hora
- **Total: ~4 horas**

## Status
- [x] Migration SQL criada
- [ ] Migration executada no banco
- [ ] Schema Drizzle atualizado
- [ ] Código backend atualizado
- [ ] Código frontend atualizado
- [ ] Testes realizados
- [ ] Deploy em produção
