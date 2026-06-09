import { z } from 'zod';

// --- Query Schemas ---

export const overviewQuerySchema = z.object({
  vendedorId: z.string().uuid().optional(),
  status: z
    .enum(['lead', 'contato_inicial', 'negociacao', 'ganha', 'perdida'])
    .optional(),
});

// --- Body Schemas ---

export const criarOportunidadeGestorSchema = z.object({
  vendedorId: z.string().uuid(),
  nomeCliente: z.string().min(2).max(255),
  emailCliente: z.string().email().optional(),
  telefoneCliente: z.string().max(20).optional(),
  clienteId: z.string().uuid().optional(),
  status: z
    .enum(['lead', 'contato_inicial', 'negociacao', 'ganha', 'perdida'])
    .optional(),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).optional(),
  temperatura: z.enum(['frio', 'morno', 'quente']).optional(),
  premioEstimado: z.string().optional(),
  dataVencimento: z.string().optional(),
  observacoes: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
  origem: z.string().optional(),
});

export const reatribuirOportunidadeSchema = z.object({
  novoVendedorId: z.string().uuid(),
});

export const prioridadeAutomaticaConfigSchema = z.object({
  habilitado: z.boolean(),
  diasBaixa: z.number().int().min(1),
  diasMedia: z.number().int().min(1),
  diasAlta: z.number().int().min(1),
  diasUrgente: z.number().int().min(1),
});

export const atualizarConfigCrmSchema = z.object({
  prioridadeAutomatica: prioridadeAutomaticaConfigSchema.optional(),
});

// --- Response Schemas ---

export const vendedorInfoSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  email: z.string().email(),
});

export const clienteInfoSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().nullable(),
  razaoSocial: z.string().nullable(),
  tipoPessoa: z.enum(['PF', 'PJ']),
});

export const oportunidadeOverviewSchema = z.object({
  id: z.string().uuid(),
  corretoraId: z.string().uuid(),
  vendedorId: z.string().uuid(),
  vendedorOriginalId: z.string().uuid(),
  nomeCliente: z.string(),
  emailCliente: z.string().nullable(),
  telefoneCliente: z.string().nullable(),
  clienteId: z.string().uuid().nullable(),
  status: z.enum(['lead', 'contato_inicial', 'negociacao', 'ganha', 'perdida']),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']),
  temperatura: z.enum(['frio', 'morno', 'quente']),
  premioEstimado: z.string().nullable(),
  dataVencimento: z.string().nullable(),
  observacoes: z.string().nullable(),
  tags: z.array(z.string()),
  origem: z.string().nullable(),
  ordem: z.number().int(),
  dataUltimoContato: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  vendedor: vendedorInfoSchema.nullable(),
  cliente: clienteInfoSchema.nullable(),
});

export const vendedorStatsSchema = z.object({
  total: z.number().int(),
  leads: z.number().int(),
  contatoInicial: z.number().int(),
  negociacao: z.number().int(),
  ganhas: z.number().int(),
  perdidas: z.number().int(),
  valorTotal: z.number(),
  valorEstimado: z.number(),
  taxaConversao: z.number(),
});

export const vendedorComStatsSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  email: z.string().email(),
  stats: vendedorStatsSchema,
});

export const estatisticasGeraisSchema = z.object({
  totalOportunidades: z.number().int(),
  totalLeads: z.number().int(),
  totalContatoInicial: z.number().int(),
  totalNegociacao: z.number().int(),
  totalGanhas: z.number().int(),
  totalPerdidas: z.number().int(),
  valorTotalGanho: z.number(),
  valorEmNegociacao: z.number(),
  taxaConversao: z.number(),
});

export const distribuicaoPrioridadeSchema = z.object({
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']),
  count: z.number().int(),
});

export const distribuicaoTemperaturaSchema = z.object({
  temperatura: z.enum(['frio', 'morno', 'quente']),
  count: z.number().int(),
});

export const estatisticasCompletasSchema = z.object({
  geral: estatisticasGeraisSchema,
  prioridade: z.array(distribuicaoPrioridadeSchema),
  temperatura: z.array(distribuicaoTemperaturaSchema),
});

export const configCrmResponseSchema = z.object({
  prioridadeAutomatica: prioridadeAutomaticaConfigSchema,
});

export const resultadoAtualizacaoPrioridadesSchema = z.object({
  total: z.number().int(),
  updated: z.number().int(),
  skipped: z.boolean().optional(),
});

// --- Types ---

export type OverviewQuery = z.infer<typeof overviewQuerySchema>;
export type CriarOportunidadeGestorInput = z.infer<
  typeof criarOportunidadeGestorSchema
>;
export type ReatribuirOportunidadeInput = z.infer<
  typeof reatribuirOportunidadeSchema
>;
export type AtualizarConfigCrmInput = z.infer<typeof atualizarConfigCrmSchema>;
export type OportunidadeOverview = z.infer<typeof oportunidadeOverviewSchema>;
export type VendedorStats = z.infer<typeof vendedorStatsSchema>;
export type VendedorComStats = z.infer<typeof vendedorComStatsSchema>;
export type EstatisticasGerais = z.infer<typeof estatisticasGeraisSchema>;
export type EstatisticasCompletas = z.infer<typeof estatisticasCompletasSchema>;
export type ConfigCrmResponse = z.infer<typeof configCrmResponseSchema>;
export type ResultadoAtualizacaoPrioridades = z.infer<
  typeof resultadoAtualizacaoPrioridadesSchema
>;
