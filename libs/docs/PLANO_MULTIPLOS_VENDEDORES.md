# Plano de Implementação: Sistema de Múltiplos Vendedores com Divisão de Comissões

## Resumo
Implementar funcionalidade para permitir até 3 vendedores por cotação com divisão configurável de comissões, incluindo opção de participação da corretora.

## Contexto Atual
- Sistema usa `cotacao_vendedor` para histórico de vendedores (um de cada vez)
- Comissão calculada: `(premioEstimado * percentualComissao) / 100`
- Padrão: Um vendedor ativo por cotação
- Componente `VendedoresSection` já existe para gerenciar vendedores

## Requisitos
1. Até 3 vendedores simultâneos por cotação
2. Cada vendedor tem percentual configurável de comissão
3. Opção "Participação da Corretora" com percentual configurável
4. Soma de todos os percentuais deve ser 100%
5. Interface intuitiva para adicionar/remover vendedores
6. Cálculo automático de valores baseado nos percentuais

---

## FASE 1: Alterações no Banco de Dados

### 1.1 Migration - Adicionar campos em `cotacao_vendedor`

**Arquivo:** `libs/shared/database/drizzle/migrations/XXXX_multiplos_vendedores_comissao.sql`

```sql
-- Adicionar campos para divisão de comissões
ALTER TABLE cotacao_vendedor 
  ADD COLUMN tipo_participacao VARCHAR(20) DEFAULT 'PRINCIPAL',
  ADD COLUMN percentual_comissao DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN ordem SMALLINT DEFAULT 1;

-- Criar índice para queries por ordem
CREATE INDEX idx_cotacao_vendedor_ordem ON cotacao_vendedor(cotacao_id, ordem, ativo);

-- Comentários
COMMENT ON COLUMN cotacao_vendedor.tipo_participacao IS 'Tipo de participação: PRINCIPAL, INDICADOR, COLABORADOR';
COMMENT ON COLUMN cotacao_vendedor.percentual_comissao IS 'Percentual da comissão total que este vendedor recebe';
COMMENT ON COLUMN cotacao_vendedor.ordem IS 'Ordem de exibição do vendedor (1, 2, 3)';
```

### 1.2 Migration - Adicionar campos em `cotacao`

```sql
-- Adicionar campos para participação da corretora
ALTER TABLE cotacao
  ADD COLUMN participacao_corretora BOOLEAN DEFAULT FALSE,
  ADD COLUMN percentual_corretora DECIMAL(5,2) DEFAULT 0;

-- Comentários
COMMENT ON COLUMN cotacao.participacao_corretora IS 'Se TRUE, a corretora tem participação na comissão';
COMMENT ON COLUMN cotacao.percentual_corretora IS 'Percentual da comissão que fica com a corretora';
```

### 1.3 Atualizar Schema TypeScript - `cotacao-vendedor.ts`

**Arquivo:** `libs/shared/database/src/schema/cotacao-vendedor.ts`

Adicionar campos:
```typescript
tipoParticipacao: varchar('tipo_participacao', { length: 20 })
  .notNull()
  .default('PRINCIPAL'),
percentualComissao: decimal('percentual_comissao', {
  precision: 5,
  scale: 2,
}).notNull().default('0'),
ordem: smallint('ordem').notNull().default(1),
```

Criar enum TypeScript:
```typescript
export const TIPOS_PARTICIPACAO = {
  PRINCIPAL: 'PRINCIPAL',
  INDICADOR: 'INDICADOR',
  COLABORADOR: 'COLABORADOR',
} as const;

export type TipoParticipacao = (typeof TIPOS_PARTICIPACAO)[keyof typeof TIPOS_PARTICIPACAO];
```

### 1.4 Atualizar Schema TypeScript - `cotacao.ts`

**Arquivo:** `libs/shared/database/src/schema/cotacao.ts`

Adicionar campos:
```typescript
participacaoCorretora: boolean('participacao_corretora')
  .notNull()
  .default(false),
percentualCorretora: decimal('percentual_corretora', {
  precision: 5,
  scale: 2,
}).default('0'),
```

---

## FASE 2: Backend - Schemas de Validação

### 2.1 Atualizar `createCotacaoSchema`

**Arquivo:** `apps/api/src/routes/cotacoes/schemas.ts`

```typescript
export const createCotacaoSchema = z.object({
  // ... campos existentes
  
  // Novos campos
  participacaoCorretora: z.boolean().default(false),
  percentualCorretora: z.coerce.number().min(0).max(100).default(0),
  
  // Array de vendedores
  vendedores: z.array(z.object({
    vendedorId: z.string().uuid(),
    tipoParticipacao: z.enum(['PRINCIPAL', 'INDICADOR', 'COLABORADOR']),
    percentualComissao: z.coerce.number().min(0.01).max(100),
    ordem: z.number().int().min(1).max(3),
  })).min(1).max(3).optional(),
}).refine((data) => {
  // Validação: soma dos percentuais deve ser 100%
  if (!data.vendedores || data.vendedores.length === 0) return true;
  
  const somaVendedores = data.vendedores.reduce((sum, v) => sum + v.percentualComissao, 0);
  const somaCorretora = data.participacaoCorretora ? data.percentualCorretora : 0;
  const somaTotal = somaVendedores + somaCorretora;
  
  return Math.abs(somaTotal - 100) < 0.01; // Tolerância de 0.01% para arredondamento
}, {
  message: "A soma dos percentuais de todos os vendedores e da corretora deve ser 100%",
});
```

### 2.2 Schema para atualizar vendedores

```typescript
export const updateVendedoresCotacaoSchema = z.object({
  participacaoCorretora: z.boolean().optional(),
  percentualCorretora: z.coerce.number().min(0).max(100).optional(),
  vendedores: z.array(z.object({
    id: z.string().uuid().optional(), // Se já existe
    vendedorId: z.string().uuid(),
    tipoParticipacao: z.enum(['PRINCIPAL', 'INDICADOR', 'COLABORADOR']),
    percentualComissao: z.coerce.number().min(0.01).max(100),
    ordem: z.number().int().min(1).max(3),
  })).min(1).max(3),
}).refine((data) => {
  const somaVendedores = data.vendedores.reduce((sum, v) => sum + v.percentualComissao, 0);
  const somaCorretora = data.participacaoCorretora ? (data.percentualCorretora || 0) : 0;
  const somaTotal = somaVendedores + somaCorretora;
  
  return Math.abs(somaTotal - 100) < 0.01;
}, {
  message: "A soma dos percentuais deve ser 100%",
});
```

---

## FASE 3: Backend - Endpoints e Lógica

### 3.1 Modificar POST `/cotacoes` - Criação com múltiplos vendedores

**Arquivo:** `apps/api/src/routes/cotacoes/index.ts`

**Alterações:**
1. Aceitar array `vendedores` no body
2. Criar registros em `cotacao_vendedor` para cada vendedor em uma transação
3. Definir `vendedor_id` da cotação como o vendedor com `ordem=1` (principal)
4. Salvar `participacaoCorretora` e `percentualCorretora`

**Pseudocódigo:**
```typescript
const result = await db.transaction(async (tx) => {
  // 1. Criar cotação
  const [cotacao] = await tx.insert(cotacoes).values({
    vendedorId: data.vendedores[0].vendedorId, // Principal
    participacaoCorretora: data.participacaoCorretora,
    percentualCorretora: data.percentualCorretora?.toString(),
    // ... outros campos
  }).returning();

  // 2. Criar vendedores
  if (data.vendedores && data.vendedores.length > 0) {
    const vendedoresData = data.vendedores.map(v => ({
      cotacaoId: cotacao.id,
      vendedorId: v.vendedorId,
      tipoParticipacao: v.tipoParticipacao,
      percentualComissao: v.percentualComissao.toString(),
      ordem: v.ordem,
      atribuidoPor: request.user.sub,
      ativo: true,
    }));
    
    await tx.insert(cotacaoVendedores).values(vendedoresData);
  }

  return cotacao;
});
```

### 3.2 Novo endpoint PUT `/cotacoes/:id/vendedores` - Atualizar vendedores

**Rota:**
```typescript
fastify.put(
  '/:id/vendedores',
  {
    schema: {
      tags: ['Cotações'],
      summary: 'Atualizar vendedores e divisão de comissões',
    },
    preHandler: [authorize(['vendas:editar_cotacao'])],
  },
  async (request, reply) => {
    const { id } = request.params;
    const data = updateVendedoresCotacaoSchema.parse(request.body);
    
    const result = await db.transaction(async (tx) => {
      // 1. Desativar todos os vendedores atuais
      await tx.update(cotacaoVendedores)
        .set({ ativo: false })
        .where(and(
          eq(cotacaoVendedores.cotacaoId, id),
          eq(cotacaoVendedores.ativo, true)
        ));
      
      // 2. Inserir novos vendedores
      const vendedoresData = data.vendedores.map(v => ({
        cotacaoId: id,
        vendedorId: v.vendedorId,
        tipoParticipacao: v.tipoParticipacao,
        percentualComissao: v.percentualComissao.toString(),
        ordem: v.ordem,
        atribuidoPor: request.user.sub,
        ativo: true,
      }));
      
      await tx.insert(cotacaoVendedores).values(vendedoresData);
      
      // 3. Atualizar cotação
      const [cotacao] = await tx.update(cotacoes)
        .set({
          vendedorId: data.vendedores.find(v => v.ordem === 1)?.vendedorId,
          participacaoCorretora: data.participacaoCorretora,
          percentualCorretora: data.percentualCorretora?.toString(),
          updatedAt: new Date(),
        })
        .where(eq(cotacoes.id, id))
        .returning();
      
      return cotacao;
    });
    
    return reply.send({ success: true, data: result });
  }
);
```

### 3.3 Modificar GET `/cotacoes/:id/vendedores` - Retornar vendedores ativos

**Alterações:**
- Adicionar novos campos na resposta
- Ordenar por `ordem` ASC
- Filtrar apenas `ativo=true`

```typescript
const vendedoresAtivos = await db.query.cotacaoVendedores.findMany({
  where: and(
    eq(cotacaoVendedores.cotacaoId, cotacaoId),
    eq(cotacaoVendedores.ativo, true)
  ),
  with: {
    vendedor: {
      columns: { id: true, nome: true, email: true }
    },
  },
  orderBy: [asc(cotacaoVendedores.ordem)],
});
```

### 3.4 Função auxiliar - Calcular valores individuais de comissão

```typescript
function calcularComissoesVendedores(
  premioLiquido: number,
  percentualComissaoTotal: number,
  vendedores: Array<{ percentualComissao: number }>,
  participacaoCorretora: boolean,
  percentualCorretora: number
) {
  const valorComissaoTotal = (premioLiquido * percentualComissaoTotal) / 100;
  
  const comissoes = vendedores.map(v => ({
    ...v,
    valorComissao: (valorComissaoTotal * v.percentualComissao) / 100,
  }));
  
  const valorCorretora = participacaoCorretora 
    ? (valorComissaoTotal * percentualCorretora) / 100 
    : 0;
  
  return { comissoes, valorCorretora };
}
```

---

## FASE 4: Frontend - Componente de Vendedores

### 4.1 Criar novo componente `ComissoesVendedoresForm`

**Arquivo:** `apps/web/src/components/cotacoes/comissoes-vendedores-form.tsx`

**Props:**
```typescript
interface ComissoesVendedoresFormProps {
  premioLiquido: number;
  percentualComissaoTotal: number; // Da tabela cotacao
  vendedores: Array<{
    id?: string;
    vendedorId: string;
    tipoParticipacao: 'PRINCIPAL' | 'INDICADOR' | 'COLABORADOR';
    percentualComissao: number;
    ordem: number;
  }>;
  participacaoCorretora: boolean;
  percentualCorretora: number;
  onChange: (data: {
    vendedores: Array<...>;
    participacaoCorretora: boolean;
    percentualCorretora: number;
  }) => void;
  vendedoresDisponiveis: Array<{ id: string; nome: string; email: string }>;
  readonly?: boolean;
}
```

**Estrutura do componente:**
```tsx
export function ComissoesVendedoresForm({ ... }: ComissoesVendedoresFormProps) {
  const [localVendedores, setLocalVendedores] = useState(vendedores);
  const [localParticipacaoCorretora, setLocalParticipacaoCorretora] = useState(participacaoCorretora);
  const [localPercentualCorretora, setLocalPercentualCorretora] = useState(percentualCorretora);
  
  // Calcular valores
  const valorComissaoTotal = (premioLiquido * percentualComissaoTotal) / 100;
  const somaPercentuais = calcularSomaPercentuais();
  const isValid = Math.abs(somaPercentuais - 100) < 0.01;
  
  // Handlers
  const adicionarVendedor = () => { /* ... */ };
  const removerVendedor = (ordem: number) => { /* ... */ };
  const atualizarVendedor = (ordem: number, field: string, value: any) => { /* ... */ };
  
  // useEffect para propagar mudanças
  useEffect(() => {
    onChange({
      vendedores: localVendedores,
      participacaoCorretora: localParticipacaoCorretora,
      percentualCorretora: localPercentualCorretora,
    });
  }, [localVendedores, localParticipacaoCorretora, localPercentualCorretora]);
  
  return (
    <div className="space-y-4">
      {/* Header com resumo */}
      <div className="rounded-lg border p-4 bg-muted/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Comissão Total do Produto</p>
            <p className="text-2xl font-bold">{percentualComissaoTotal}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Valor Total</p>
            <p className="text-2xl font-bold">R$ {valorComissaoTotal.toFixed(2)}</p>
          </div>
        </div>
      </div>
      
      {/* Lista de vendedores */}
      <div className="space-y-3">
        {localVendedores.map((v, idx) => (
          <VendedorCard
            key={v.ordem}
            vendedor={v}
            valorComissao={(valorComissaoTotal * v.percentualComissao) / 100}
            vendedoresDisponiveis={vendedoresDisponiveis}
            onUpdate={(field, value) => atualizarVendedor(v.ordem, field, value)}
            onRemove={() => removerVendedor(v.ordem)}
            canRemove={localVendedores.length > 1}
            readonly={readonly}
          />
        ))}
      </div>
      
      {/* Botão adicionar */}
      {!readonly && localVendedores.length < 3 && (
        <Button
          variant="outline"
          onClick={adicionarVendedor}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Vendedor (máx. 3)
        </Button>
      )}
      
      {/* Participação da corretora */}
      <div className="rounded-lg border p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Checkbox
            id="participacao-corretora"
            checked={localParticipacaoCorretora}
            onCheckedChange={setLocalParticipacaoCorretora}
            disabled={readonly}
          />
          <label htmlFor="participacao-corretora" className="font-medium">
            Corretora tem participação
          </label>
        </div>
        
        {localParticipacaoCorretora && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Percentual (%)</Label>
              <Input
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                value={localPercentualCorretora}
                onChange={(e) => setLocalPercentualCorretora(parseFloat(e.target.value))}
                disabled={readonly}
              />
            </div>
            <div>
              <Label>Valor</Label>
              <Input
                value={`R$ ${((valorComissaoTotal * localPercentualCorretora) / 100).toFixed(2)}`}
                disabled
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Resumo final */}
      <div className="rounded-lg border p-4 bg-primary/5">
        <div className="flex items-center justify-between">
          <span className="font-medium">Total Distribuído:</span>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
              {somaPercentuais.toFixed(2)}%
            </span>
            {isValid ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
          </div>
        </div>
        {!isValid && (
          <p className="text-sm text-red-600 mt-2">
            A soma deve ser exatamente 100%
          </p>
        )}
      </div>
    </div>
  );
}
```

### 4.2 Sub-componente `VendedorCard`

```tsx
function VendedorCard({
  vendedor,
  valorComissao,
  vendedoresDisponiveis,
  onUpdate,
  onRemove,
  canRemove,
  readonly,
}: VendedorCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant={vendedor.ordem === 1 ? 'default' : 'secondary'}>
            {vendedor.tipoParticipacao}
          </Badge>
          {vendedor.ordem === 1 && <span className="text-sm text-muted-foreground">(Principal)</span>}
        </div>
        {canRemove && !readonly && (
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {/* Select vendedor */}
        <div>
          <Label>Vendedor</Label>
          <Select
            value={vendedor.vendedorId}
            onValueChange={(value) => onUpdate('vendedorId', value)}
            disabled={readonly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {vendedoresDisponiveis.map(v => (
                <SelectItem key={v.id} value={v.id}>
                  {v.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Input percentual */}
        <div>
          <Label>Comissão (%)</Label>
          <Input
            type="number"
            min="0.01"
            max="100"
            step="0.01"
            value={vendedor.percentualComissao}
            onChange={(e) => onUpdate('percentualComissao', parseFloat(e.target.value))}
            disabled={readonly}
          />
        </div>
        
        {/* Valor calculado */}
        <div>
          <Label>Valor</Label>
          <Input
            value={`R$ ${valorComissao.toFixed(2)}`}
            disabled
            className="font-semibold"
          />
        </div>
      </div>
    </Card>
  );
}
```

---

## FASE 5: Frontend - Integração

### 5.1 Atualizar `CotacaoDialog` - Modo edição

**Arquivo:** `apps/web/src/components/area-trabalho/cotacao-dialog.tsx`

**Alterações:**
1. Adicionar novo campo no form para vendedores
2. Adicionar seção "Comissões" nas tabs
3. Integrar `ComissoesVendedoresForm`

```tsx
// No schema do form
const editCotacaoSchema = z.object({
  // ... campos existentes
  vendedoresComissoes: z.object({
    vendedores: z.array(...),
    participacaoCorretora: z.boolean(),
    percentualCorretora: z.number(),
  }).optional(),
});

// No componente
<Tabs>
  <TabsList>
    <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
    <TabsTrigger value="comissoes">Comissões</TabsTrigger>
    <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
  </TabsList>
  
  <TabsContent value="comissoes">
    <FormField
      control={form.control}
      name="vendedoresComissoes"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Divisão de Comissões</FormLabel>
          <FormControl>
            <ComissoesVendedoresForm
              premioLiquido={parseFloat(form.watch('premioLiquido') || '0')}
              percentualComissaoTotal={parseFloat(form.watch('percentualComissao') || '0')}
              {...field.value}
              onChange={field.onChange}
              vendedoresDisponiveis={vendedores}
              readonly={mode === 'view'}
            />
          </FormControl>
        </FormItem>
      )}
    />
  </TabsContent>
</Tabs>
```

### 5.2 Atualizar `NovoSeguroDialog` - Criação

**Arquivo:** `apps/web/src/components/area-trabalho/novo-seguro-dialog.tsx`

Adicionar mesmo campo e componente na criação de cotações.

### 5.3 React Query - Mutations

**Arquivo:** `apps/web/src/lib/queries/area-trabalho.ts`

```typescript
export function useAtualizarVendedoresCotacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      cotacaoId, 
      data 
    }: { 
      cotacaoId: string; 
      data: UpdateVendedoresCotacaoData 
    }) => {
      return api.put(`/cotacoes/${cotacaoId}/vendedores`, data);
    },
    onSuccess: (_, { cotacaoId }) => {
      queryClient.invalidateQueries({ 
        queryKey: [...areaTrabalhoKeys.cotacoes(), cotacaoId, 'vendedores'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: areaTrabalhoKeys.cotacoes() 
      });
    },
  });
}
```

---

## FASE 6: Validações e Testes

### 6.1 Validações de Backend

**Checklist:**
- [ ] Soma de percentuais = 100% (tolerância 0.01%)
- [ ] Mínimo 1 vendedor, máximo 3
- [ ] Vendedor não pode estar duplicado
- [ ] `ordem` deve ser sequencial (1, 2, 3)
- [ ] `percentualComissao` entre 0.01 e 100
- [ ] Se `participacaoCorretora=false`, `percentualCorretora` deve ser 0
- [ ] Permissões corretas para editar vendedores

### 6.2 Validações de Frontend

**Checklist:**
- [ ] Desabilitar botão "Salvar" se soma != 100%
- [ ] Feedback visual de erro quando soma incorreta
- [ ] Cálculo em tempo real dos valores
- [ ] Não permitir adicionar se já tem 3 vendedores
- [ ] Não permitir remover se só tem 1 vendedor
- [ ] Não permitir vendedor duplicado no dropdown

### 6.3 Casos de Teste

**1. Criação com 1 vendedor:**
- Vendedor Principal: 100%
- Participação Corretora: Não
- Resultado: Vendedor recebe 100% da comissão

**2. Criação com 2 vendedores:**
- Vendedor Principal: 70%
- Vendedor Indicador: 30%
- Resultado: Dividido corretamente

**3. Criação com 3 vendedores + corretora:**
- Vendedor Principal: 40%
- Vendedor Indicador: 30%
- Vendedor Colaborador: 20%
- Corretora: 10%
- Resultado: Total 100%, todos recebem corretamente

**4. Edição de vendedores:**
- Remover vendedor 2
- Ajustar percentuais
- Salvar
- Resultado: Histórico mantido, novos vendedores ativos

**5. Validação de erro:**
- Tentar salvar com soma = 95%
- Resultado: Erro de validação, não permite salvar

---

## FASE 7: Documentação

### 7.1 Comentários no Código

Adicionar JSDoc em funções principais:
```typescript
/**
 * Calcula as comissões individuais de cada vendedor baseado nos percentuais configurados.
 * 
 * @param premioLiquido - Valor do prêmio líquido da cotação
 * @param percentualComissaoTotal - Percentual total de comissão do produto
 * @param vendedores - Array com vendedores e seus percentuais
 * @param participacaoCorretora - Se a corretora tem participação
 * @param percentualCorretora - Percentual da corretora
 * @returns Objeto com valores calculados para cada vendedor e corretora
 */
```

### 7.2 README de Comissões

**Arquivo:** `docs/COMISSOES.md`

Documentar:
- Como funciona o sistema de múltiplos vendedores
- Exemplos de cálculo
- Regras de negócio
- Screenshots da interface

---

## Arquivos Críticos a Modificar

### Backend
1. `libs/shared/database/drizzle/migrations/XXXX_multiplos_vendedores_comissao.sql` - Nova migration
2. `libs/shared/database/src/schema/cotacao-vendedor.ts` - Adicionar campos
3. `libs/shared/database/src/schema/cotacao.ts` - Adicionar campos da corretora
4. `apps/api/src/routes/cotacoes/schemas.ts` - Validações Zod
5. `apps/api/src/routes/cotacoes/index.ts` - Lógica de CRUD

### Frontend
6. `apps/web/src/components/cotacoes/comissoes-vendedores-form.tsx` - Novo componente
7. `apps/web/src/components/area-trabalho/cotacao-dialog.tsx` - Integração
8. `apps/web/src/components/area-trabalho/novo-seguro-dialog.tsx` - Integração
9. `apps/web/src/lib/queries/area-trabalho.ts` - React Query hooks
10. `apps/web/src/types/area-trabalho.ts` - Tipos TypeScript

---

## Estimativa de Implementação

**Total:** ~12-16 horas

- Fase 1 (BD): 2h
- Fase 2 (Backend Schemas): 1h
- Fase 3 (Backend Endpoints): 3h
- Fase 4 (Frontend Componente): 4h
- Fase 5 (Integração): 2h
- Fase 6 (Validações/Testes): 2h
- Fase 7 (Documentação): 1h

---

## Riscos e Considerações

1. **Performance:** Queries com joins múltiplos podem ser lentas → usar índices apropriados
2. **Consistência:** Usar transações para garantir atomicidade
3. **UX:** Interface pode ficar complexa → design iterativo com feedback do usuário
4. **Migração de Dados:** Cotações antigas não terão múltiplos vendedores → definir migração
5. **Relatórios:** Precisará atualizar queries de relatórios de comissões

---

## Próximos Passos Após Aprovação

1. Revisar e aprovar o plano
2. Criar branch de feature
3. Implementar Fase 1 (BD)
4. Testar migration localmente
5. Implementar Fases 2-3 (Backend)
6. Testar endpoints com Postman/Insomnia
7. Implementar Fases 4-5 (Frontend)
8. Testes de integração
9. Code review
10. Deploy
