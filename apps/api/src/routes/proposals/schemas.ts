import { z } from 'zod';

export const createPropostaSchema = z.object({
  cotacaoId: z.string().uuid().optional(),
  clienteId: z.string().uuid(),
  produtoId: z.string().uuid(),
  numeroPropostaExterno: z.string().max(100).optional(),
  vigenciaInicio: z.string(),
  vigenciaFim: z.string(),
  premioLiquido: z.coerce.number().min(0).optional(),
  percentualComissao: z.coerce.number().min(0).max(100).optional(),
  coberturas: z.record(z.string(), z.unknown()).optional(),
  observacoes: z.string().max(2000).optional(),
  anexos: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const updatePropostaSchema = z.object({
  numeroPropostaExterno: z.string().max(100).optional().nullable(),
  vigenciaInicio: z.string().optional(),
  vigenciaFim: z.string().optional(),
  premioLiquido: z.coerce.number().min(0).optional().nullable(),
  percentualComissao: z.coerce.number().min(0).max(100).optional().nullable(),
  coberturas: z.record(z.string(), z.unknown()).optional().nullable(),
  observacoes: z.string().max(2000).optional().nullable(),
  anexos: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
});

export const listPropostasQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).optional(),
  clienteId: z.string().uuid().optional(),
  produtoId: z.string().uuid().optional(),
  vendedorId: z.string().uuid().optional(),
  status: z
    .enum([
      'AGUARDANDO_ENVIO',
      'ENVIADA',
      'EM_ANALISE',
      'PENDENTE_DOCUMENTACAO',
      'APROVADA',
      'APROVADA_CONDICIONAL',
      'RECUSADA',
      'CANCELADA',
      'VENDA_CONFIRMADA',
    ])
    .optional(),
});

export const recusarPropostaSchema = z.object({
  motivoRecusa: z.string().max(100).optional(),
  detalhesRecusa: z.string().max(1000).optional(),
});

export type CreatePropostaInput = z.infer<typeof createPropostaSchema>;
export type UpdatePropostaInput = z.infer<typeof updatePropostaSchema>;
export type ListPropostasQuery = z.infer<typeof listPropostasQuerySchema>;
export type RecusarPropostaInput = z.infer<typeof recusarPropostaSchema>;
