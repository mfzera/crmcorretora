import { z } from 'zod';

// --- Query Schemas ---

export const metricasQuerySchema = z.object({
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  vendedorId: z.string().uuid().optional(),
  equipeId: z.string().uuid().optional(),
  produtoId: z.string().uuid().optional(),
  seguradoraParceiraId: z.string().uuid().optional(),
});

export const metricasDetalhesQuerySchema = z.object({
  categoria: z.enum([
    'premio_liquido',
    'comissao',
    'status_kanban',
    'cadastro',
    'renovacao',
    'endosso',
  ]),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  vendedorId: z.string().uuid().optional(),
  equipeId: z.string().uuid().optional(),
});

// --- Response Schemas ---

export const metricasPremioLiquidoSchema = z.object({
  total: z.number(),
  media: z.number(),
  count: z.number().int(),
  maior: z.number(),
  menor: z.number(),
});

export const premioPorStatusSchema = z.object({
  status: z.string(),
  total: z.number(),
  count: z.number().int(),
});

export const metricasComissaoSchema = z.object({
  totalComissao: z.number(),
  mediaComissao: z.number(),
  totalCorretora: z.number(),
  countNegocioCorretora: z.number().int(),
});

export const metricasKanbanItemSchema = z.object({
  status: z.string(),
  count: z.number().int(),
  premioEstimado: z.number(),
  valorFechado: z.number(),
});

export const metricasPrioridadeSchema = z.object({
  prioridade: z.string(),
  count: z.number().int(),
});

export const metricasTemperaturaSchema = z.object({
  temperatura: z.string(),
  count: z.number().int(),
});

export const metricasCadastroSchema = z.object({
  totalClientes: z.number().int(),
  clientesPF: z.number().int(),
  clientesPJ: z.number().int(),
  clientesAtivos: z.number().int(),
});

export const metricasRenovacaoItemSchema = z.object({
  status: z.string(),
  count: z.number().int(),
  premioAnterior: z.number(),
  premioNovo: z.number(),
});

export const renovacaoTotalSchema = z.object({
  total: z.number().int(),
  renovados: z.number().int(),
  perdidos: z.number().int(),
  emAndamento: z.number().int(),
});

export const endossoResumidoSchema = z.object({
  total: z.number().int(),
  aprovados: z.number().int(),
  solicitados: z.number().int(),
  recusados: z.number().int(),
});

export const metricasGeralResponseSchema = z.object({
  premioLiquido: metricasPremioLiquidoSchema,
  premioPorStatus: z.array(premioPorStatusSchema),
  comissao: metricasComissaoSchema,
  kanban: z.array(metricasKanbanItemSchema),
  prioridade: z.array(metricasPrioridadeSchema),
  temperatura: z.array(metricasTemperaturaSchema),
  cadastro: metricasCadastroSchema,
  renovacao: z.array(metricasRenovacaoItemSchema),
  renovacaoTotal: renovacaoTotalSchema,
  endosso: endossoResumidoSchema,
});

// --- Types ---

export type MetricasQuery = z.infer<typeof metricasQuerySchema>;
export type MetricasDetalhesQuery = z.infer<typeof metricasDetalhesQuerySchema>;
export type MetricasGeralResponse = z.infer<typeof metricasGeralResponseSchema>;

// Legacy exports for backwards compatibility
export const getMetricasQuerySchema = {
  querystring: metricasQuerySchema,
};

export const getMetricasDetalhesQuerySchema = {
  querystring: metricasDetalhesQuerySchema,
};
