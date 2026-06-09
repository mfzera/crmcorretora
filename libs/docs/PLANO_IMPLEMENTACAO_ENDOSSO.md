# Plano de Implementação - Endosso e Cancelados no Workspace

## Status: Em Implementação

### ✅ Concluído

#### 1. Schema de Banco de Dados
- [x] Atualizado `statusEndossoEnum` em `libs/shared/database/src/schema/enums.ts`
  - Removido: `EM_VALIDACAO`, `EMITIDO`
  - Mantido: `SOLICITADO`, `APROVADO`, `RECUSADO`, `CANCELADO`
- [x] Adicionado evento `ENDOSSO_APROVADO` no `tipoEventoDocumentoEnum`

#### 2. Rota de Aprovação
- [x] Atualizada rota `POST /:id/aprovar` em `apps/api/src/routes/endossos/index.ts`
  - Mudou permissão de `vendas:aprovar_endosso` → `cadastro:aprovar_endosso`
  - Agora aplica alterações imediatamente no documento ao aprovar
  - Atualiza: `premioLiquido`, `percentualComissao`, `valorComissao`
  - Registra no histórico com evento `ENDOSSO_APROVADO`
  - Aceita campo opcional `numeroEndossoExterno` no body

---

### 🔄 Pendente

#### 3. Remover/Atualizar Rotas de Endosso

**Arquivo:** `apps/api/src/routes/endossos/index.ts`

##### A) Remover completamente:
```typescript
// Linha ~345-395
// Validar endosso - POST /:id/validar
// Não é mais necessário no fluxo simplificado
```

```typescript
// Linha ~545-615
// Emitir endosso - POST /:id/emitir
// Não é mais necessário, aprovação já aplica as mudanças
```

##### B) Atualizar:
```typescript
// Linha ~493-540
// Recusar endosso - POST /:id/recusar
// Mudar de:
if (!['SOLICITADO', 'EM_VALIDACAO'].includes(endosso.status))
// Para:
if (endosso.status !== 'SOLICITADO')

// Mudar permissão:
preHandler: [authorize(['cadastro:aprovar_endosso'])]
// Descrição:
'Recusa um endosso solicitado com motivo.'
```

```typescript
// Linha ~615-660
// Cancelar endosso - POST /:id/cancelar
// Atualizar validação de status:
if (!['SOLICITADO', 'EM_VALIDACAO'].includes(endosso.status))
// Para:
if (endosso.status !== 'SOLICITADO')
```

##### C) Atualizar listagem de endossos:
```typescript
// Linha ~210-270
// GET / (listar endossos)
// Remover referência a permissão vendas:aprovar_endosso
// Adicionar suporte a cadastro:aprovar_endosso
```

---

#### 4. Adicionar Endpoints no Workspace

**Arquivo:** `apps/api/src/routes/workspace/index.ts`

##### A) Adicionar import de endossos:
```typescript
const {
  db,
  renovacoesComerciais,
  cotacoes,
  propostasComerciais,
  documentosVenda,
  endossos, // ADICIONAR
} = await import('@ecotech/shared/database');
```

##### B) Criar endpoint para endossos:
```typescript
// GET /workspace/endossos
fastify.get(
  '/endossos',
  {
    schema: {
      tags: ['Workspace'],
      summary: 'Listar endossos aguardando aprovação',
    },
    preHandler: [authorize(['cadastro:aprovar_endosso'])],
  },
  async (request) => {
    const endossosPendentes = await db.query.endossos.findMany({
      where: and(
        eq(endossos.seguradoraId, request.seguradoraId),
        isNull(endossos.deletedAt),
        eq(endossos.status, 'SOLICITADO'),
      ),
      with: {
        documentoVenda: {
          columns: {
            id: true,
            numeroDocumento: true,
            numeroApoliceExterna: true,
          },
          with: {
            cliente: {
              columns: {
                id: true,
                nome: true,
                razaoSocial: true,
                tipoPessoa: true,
              },
            },
            produto: {
              columns: {
                id: true,
                nomeProduto: true,
              },
            },
          },
        },
        vendedor: {
          columns: {
            id: true,
            nome: true,
          },
        },
      },
      limit: 20,
      orderBy: (e, { desc }) => [desc(e.createdAt)],
    });

    return {
      success: true,
      data: endossosPendentes,
    };
  },
);
```

##### C) Criar endpoint para documentos cancelados:
```typescript
// GET /workspace/cancelados
fastify.get(
  '/cancelados',
  {
    schema: {
      tags: ['Workspace'],
      summary: 'Listar documentos cancelados recentes',
    },
    preHandler: [authorize(['dashboard:visualizar'])],
  },
  async (request) => {
    const treintaDiasAtras = new Date();
    treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);

    const documentosCancelados = await db.query.documentosVenda.findMany({
      where: and(
        eq(documentosVenda.seguradoraId, request.seguradoraId),
        isNull(documentosVenda.deletedAt),
        eq(documentosVenda.status, 'CANCELADO'),
        sql`${documentosVenda.dataCancelamento} >= ${treintaDiasAtras}`,
      ),
      with: {
        cliente: {
          columns: {
            id: true,
            nome: true,
            razaoSocial: true,
            tipoPessoa: true,
          },
        },
        produto: {
          columns: {
            id: true,
            nomeProduto: true,
          },
        },
        canceladoPor: {
          columns: {
            id: true,
            nome: true,
          },
        },
      },
      limit: 20,
      orderBy: (d, { desc }) => [desc(d.dataCancelamento)],
    });

    return {
      success: true,
      data: documentosCancelados,
    };
  },
);
```

##### D) Atualizar endpoint /workspace/resumo:
```typescript
// Adicionar na query de estatísticas:
const [endossosPendentesCount] = await db
  .select({ count: sql<number>`count(*)` })
  .from(endossos)
  .where(
    and(
      eq(endossos.seguradoraId, request.seguradoraId),
      isNull(endossos.deletedAt),
      eq(endossos.status, 'SOLICITADO'),
    ),
  );

const [canceladosMesCount] = await db
  .select({ count: sql<number>`count(*)` })
  .from(documentosVenda)
  .where(
    and(
      eq(documentosVenda.seguradoraId, request.seguradoraId),
      isNull(documentosVenda.deletedAt),
      eq(documentosVenda.status, 'CANCELADO'),
      sql`${documentosVenda.dataCancelamento} >= ${startOfMonth}`,
      sql`${documentosVenda.dataCancelamento} <= ${endOfMonth}`,
    ),
  );

// Adicionar ao retorno de estatisticas:
const estatisticas = {
  // ... existentes
  totalEndossosPendentes: Number(endossosPendentesCount[0]?.count ?? 0),
  totalCanceladosMes: Number(canceladosMesCount[0]?.count ?? 0),
};
```

---

#### 5. Frontend - Tipos TypeScript

**Arquivo:** `apps/web/src/types/area-trabalho.ts`

```typescript
export type StatusEndosso = 'SOLICITADO' | 'APROVADO' | 'RECUSADO' | 'CANCELADO';

export type TipoEndosso =
  | 'INCLUSAO_COBERTURA'
  | 'EXCLUSAO_COBERTURA'
  | 'ALTERACAO_VALOR'
  | 'INCLUSAO_ITEM'
  | 'EXCLUSAO_ITEM'
  | 'ALTERACAO_DADOS'
  | 'ALTERACAO_VIGENCIA'
  | 'TRANSFERENCIA_SEGURADO'
  | 'OUTROS';

export interface Endosso {
  id: string;
  numeroEndosso: string;
  status: StatusEndosso;
  tipoEndosso: TipoEndosso;
  descricao: string;
  documentoVenda: {
    id: string;
    numeroDocumento: string;
    numeroApoliceExterna: string | null;
    cliente: Cliente;
    produto: Produto;
  };
  vendedor: {
    id: string;
    nome: string;
  };
  premioAnterior: number | null;
  premioNovo: number | null;
  diferencaPremio: number | null;
  percentualComissaoAnterior: number | null;
  percentualComissaoNovo: number | null;
  diferencaComissao: number | null;
  dataSolicitacao: string;
  dataAprovacao: string | null;
  motivoRecusa: string | null;
  observacoes: string | null;
}

export interface DocumentoCancelado {
  id: string;
  numeroDocumento: string;
  numeroApoliceExterna: string | null;
  cliente: Cliente;
  produto: Produto;
  premioLiquido: number | null;
  dataCancelamento: string;
  motivoCancelamento: string | null;
  canceladoPor: {
    id: string;
    nome: string;
  } | null;
  vigenciaInicio: string;
  vigenciaFim: string;
}

// Atualizar interface ResumoAreaTrabalho:
export interface ResumoAreaTrabalho {
  renovacoesPendentes: RenovacaoPendente[];
  cotacoesAtivas: Cotacao[];
  propostasAtivas: Proposta[];
  estatisticas: {
    totalRenovacoesPendentes: number;
    totalCotacoesAtivas: number;
    totalPropostasAtivas: number;
    totalEndossosPendentes: number; // NOVO
    totalCanceladosMes: number; // NOVO
    metaMensal: number;
    vendidoMes: number;
  };
}
```

---

#### 6. Frontend - Queries

**Arquivo:** `apps/web/src/lib/queries/area-trabalho.ts`

```typescript
export function useEndossosPendentes() {
  return useQuery({
    queryKey: ['workspace', 'endossos-pendentes'],
    queryFn: async () => {
      const response = await api.get('/workspace/endossos');
      return response.data.data as Endosso[];
    },
  });
}

export function useDocumentosCancelados() {
  return useQuery({
    queryKey: ['workspace', 'documentos-cancelados'],
    queryFn: async () => {
      const response = await api.get('/workspace/cancelados');
      return response.data.data as DocumentoCancelado[];
    },
  });
}
```

---

#### 7. Frontend - Componentes UI

##### A) `apps/web/src/components/area-trabalho/endossos-pendentes-table.tsx`
- Tabela com colunas: Número, Tipo, Cliente, Apólice, Diferença Prêmio, Vendedor, Data, Ações
- Badge colorido para tipo de endosso
- Botão "Analisar" que abre modal de aprovação
- Filtro por tipo de endosso

##### B) `apps/web/src/components/area-trabalho/documentos-cancelados-table.tsx`
- Tabela com colunas: Apólice, Cliente, Produto, Prêmio, Data Cancelamento, Motivo, Cancelado Por
- Badge com motivo do cancelamento
- Visualização em modal com detalhes completos
- Filtro por período

##### C) `apps/web/src/components/area-trabalho/endosso-approval-dialog.tsx`
- Modal de aprovação de endosso
- Mostra comparação antes/depois dos valores
- Campo opcional para número externo
- Botões: Recusar (com motivo) | Aprovar

##### D) Atualizar dashboard principal
- Adicionar cards de estatísticas para endossos e cancelados
- Adicionar seções com as novas tabelas

---

#### 8. Permissões

**Adicionar no sistema de permissões:**

```typescript
// Nova permissão
'cadastro:aprovar_endosso' - Aprovar/recusar endossos
```

**Atualizar cargos padrão** (`libs/shared/utils/src/cargos-padrao.ts`):
- Adicionar `cadastro:aprovar_endosso` ao cargo de Cadastro/BackOffice

---

### 📋 Ordem de Implementação Sugerida

1. ✅ Schema de banco (concluído)
2. ✅ Rota de aprovação (concluído)
3. 🔄 Limpar rotas desnecessárias de endosso
4. 🔄 Adicionar endpoints no workspace
5. 🔄 Criar/atualizar tipos TypeScript
6. 🔄 Criar queries no frontend
7. 🔄 Criar componentes de UI
8. 🔄 Atualizar sistema de permissões

---

### 🧪 Testes Necessários

- [ ] Criar endosso em documento ativo
- [ ] Aprovar endosso e verificar se documento foi atualizado
- [ ] Recusar endosso com motivo
- [ ] Cancelar endosso pelo vendedor
- [ ] Listar endossos pendentes no workspace (cadastro)
- [ ] Listar documentos cancelados no workspace
- [ ] Verificar permissões (vendedor não pode aprovar)
- [ ] Verificar histórico do documento após aprovação

---

### 🗄️ Migration Necessária

Como removemos status do enum, será necessário criar uma migration:

```sql
-- Remove status antigos que não existem mais
UPDATE endosso SET status = 'APROVADO' WHERE status = 'EMITIDO';
UPDATE endosso SET status = 'CANCELADO' WHERE status = 'EM_VALIDACAO';

-- Altera o enum (Drizzle vai gerar isso automaticamente)
ALTER TYPE status_endosso RENAME TO status_endosso_old;
CREATE TYPE status_endosso AS ENUM ('SOLICITADO', 'APROVADO', 'RECUSADO', 'CANCELADO');
ALTER TABLE endosso ALTER COLUMN status TYPE status_endosso USING status::text::status_endosso;
DROP TYPE status_endosso_old;

-- Mesmo para tipo_evento_documento
ALTER TYPE tipo_evento_documento ADD VALUE IF NOT EXISTS 'ENDOSSO_APROVADO';
```

---

**Data de criação:** 2026-01-07  
**Última atualização:** 2026-01-07
