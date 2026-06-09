import { z } from 'zod';

// --- Enums ---

export const oportunidadeStatusEnum = z.enum([
  'lead',
  'contato_inicial',
  'negociacao',
  'ganha',
  'perdida',
]);

export const oportunidadePrioridadeEnum = z.enum([
  'baixa',
  'media',
  'alta',
  'urgente',
]);

export const oportunidadeTemperaturaEnum = z.enum(['frio', 'morno', 'quente']);

export const oportunidadeOrigemEnum = z.enum([
  'site',
  'indicacao',
  'telefone',
  'email',
  'whatsapp',
  'rede_social',
  'evento',
  'outro',
]);

// --- Query Schemas ---

export const listOportunidadesQuerySchema = z.object({
  status: oportunidadeStatusEnum.optional(),
  prioridade: oportunidadePrioridadeEnum.optional(),
  vendedorId: z.string().uuid().optional(),
});

// --- Body Schemas ---

export const createOportunidadeSchema = z.object({
  vendedorId: z.string().uuid().optional(),
  nomeCliente: z.string().min(2).max(255),
  emailCliente: z.string().email().optional(),
  telefoneCliente: z.string().max(20).optional(),
  clienteId: z.string().uuid().optional(),
  status: oportunidadeStatusEnum.optional(),
  prioridade: oportunidadePrioridadeEnum.optional(),
  temperatura: oportunidadeTemperaturaEnum.optional(),
  premioEstimado: z.string().optional(),
  dataVencimento: z.string().optional(),
  observacoes: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
  origem: oportunidadeOrigemEnum.optional(),
});

export const updateOportunidadeSchema = z.object({
  vendedorId: z.string().uuid().optional(),
  nomeCliente: z.string().min(2).max(255).optional(),
  emailCliente: z.string().email().optional().nullable(),
  telefoneCliente: z.string().max(20).optional().nullable(),
  clienteId: z.string().uuid().optional().nullable(),
  status: oportunidadeStatusEnum.optional(),
  prioridade: oportunidadePrioridadeEnum.optional(),
  temperatura: oportunidadeTemperaturaEnum.optional(),
  premioEstimado: z.string().optional().nullable(),
  dataVencimento: z.string().optional().nullable(),
  observacoes: z.string().max(5000).optional().nullable(),
  tags: z.array(z.string()).optional(),
  origem: oportunidadeOrigemEnum.optional(),
});

export const atualizarStatusSchema = z.object({
  status: oportunidadeStatusEnum,
  ordem: z.number().int().min(0).optional(),
});

export const atualizarOrdemSchema = z.object({
  ordens: z.array(
    z.object({
      id: z.string().uuid(),
      ordem: z.number().int().min(0),
    }),
  ),
});

export const transferirOportunidadeSchema = z.object({
  novoVendedorId: z.string().uuid(),
  motivoTransferencia: z.string().max(500).optional(),
});

export const adicionarInteracaoSchema = z.object({
  tipo: z.enum([
    'EMAIL',
    'TELEFONE',
    'WHATSAPP',
    'REUNIAO',
    'PROPOSTA',
    'OUTRO',
  ]),
  descricao: z.string().max(2000),
  dataInteracao: z.string().datetime().optional(),
});

export const vincularClienteSchema = z.object({
  clienteId: z.string().uuid(),
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
  email: z.string().nullable(),
  telefone: z.string().nullable(),
});

export const oportunidadeResponseSchema = z.object({
  id: z.string().uuid(),
  corretoraId: z.string().uuid(),
  vendedorId: z.string().uuid(),
  vendedorOriginalId: z.string().uuid(),
  nomeCliente: z.string(),
  emailCliente: z.string().nullable(),
  telefoneCliente: z.string().nullable(),
  clienteId: z.string().uuid().nullable(),
  status: oportunidadeStatusEnum,
  prioridade: oportunidadePrioridadeEnum,
  temperatura: oportunidadeTemperaturaEnum,
  premioEstimado: z.string().nullable(),
  dataVencimento: z.string().nullable(),
  observacoes: z.string().nullable(),
  tags: z.array(z.string()),
  origem: oportunidadeOrigemEnum.nullable(),
  ordem: z.number().int(),
  dataUltimoContato: z.string().nullable(),
  motivoPerda: z.string().nullable(),
  motivoTransferencia: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const oportunidadeComRelacoesResponseSchema =
  oportunidadeResponseSchema.extend({
    vendedor: vendedorInfoSchema.nullable(),
    vendedorOriginal: vendedorInfoSchema.nullable(),
    cliente: clienteInfoSchema.nullable(),
  });

export const interacaoResponseSchema = z.object({
  id: z.string().uuid(),
  oportunidadeId: z.string().uuid(),
  usuarioId: z.string().uuid(),
  tipo: z.enum([
    'EMAIL',
    'TELEFONE',
    'WHATSAPP',
    'REUNIAO',
    'PROPOSTA',
    'OUTRO',
  ]),
  descricao: z.string(),
  dataInteracao: z.string(),
  createdAt: z.string(),
});

export const interacaoComUsuarioResponseSchema = interacaoResponseSchema.extend(
  {
    usuario: z.object({
      id: z.string().uuid(),
      nome: z.string(),
    }),
  },
);

export const estatisticasKanbanResponseSchema = z.object({
  totalOportunidades: z.number().int(),
  porStatus: z.record(z.string(), z.number().int()),
  valorTotalEstimado: z.number(),
  taxaConversao: z.number(),
  tempoMedioPorEtapa: z.record(z.string(), z.number()),
});

// --- Types ---

export type ListOportunidadesQuery = z.infer<
  typeof listOportunidadesQuerySchema
>;
export type CreateOportunidadeInput = z.infer<typeof createOportunidadeSchema>;
export type UpdateOportunidadeInput = z.infer<typeof updateOportunidadeSchema>;
export type AtualizarStatusInput = z.infer<typeof atualizarStatusSchema>;
export type AtualizarOrdemInput = z.infer<typeof atualizarOrdemSchema>;
export type TransferirOportunidadeInput = z.infer<
  typeof transferirOportunidadeSchema
>;
export type AdicionarInteracaoInput = z.infer<typeof adicionarInteracaoSchema>;
export type VincularClienteInput = z.infer<typeof vincularClienteSchema>;
export type OportunidadeResponse = z.infer<typeof oportunidadeResponseSchema>;
export type OportunidadeComRelacoesResponse = z.infer<
  typeof oportunidadeComRelacoesResponseSchema
>;
export type InteracaoResponse = z.infer<typeof interacaoResponseSchema>;
export type InteracaoComUsuarioResponse = z.infer<
  typeof interacaoComUsuarioResponseSchema
>;
export type EstatisticasKanbanResponse = z.infer<
  typeof estatisticasKanbanResponseSchema
>;
