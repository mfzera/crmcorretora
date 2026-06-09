import { z } from 'zod';

// --- Query Schemas ---

export const listRenovacoesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  vendedorId: z.string().uuid().optional(),
  vendedorIds: z.string().optional(),
  status: z
    .enum([
      'NAO_TRABALHADO',
      'EM_PROSPECCAO',
      'EM_NEGOCIACAO',
      'AGUARDANDO_CLIENTE',
      'RENOVADO',
      'PERDIDO',
      'CANCELADO',
    ])
    .optional(),
  dataVencimentoInicio: z.string().optional(),
  dataVencimentoFim: z.string().optional(),
  search: z.string().max(100).optional(),
});

// --- Body Schemas ---

export const atualizarStatusSchema = z.object({
  status: z.enum([
    'NAO_TRABALHADO',
    'EM_PROSPECCAO',
    'EM_NEGOCIACAO',
    'AGUARDANDO_CLIENTE',
  ]),
});

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (use YYYY-MM-DD)')
  .refine((v) => !isNaN(Date.parse(v)), 'Data inválida');

export const atualizarValoresSchema = z.object({
  premioNovo: z.coerce.number().min(0).optional(),
  percentualComissaoNovo: z.coerce.number().min(0).max(100).optional(),
  novaVigenciaInicio: isoDate.optional(),
  novaVigenciaFim: isoDate.optional(),
  observacoes: z.string().max(2000).optional(),
});

export const finalizarRenovacaoSchema = z.object({
  documentoVendaNovoId: z.string().uuid(),
});

export const perderRenovacaoSchema = z.object({
  motivoPerda: z.string().max(500),
  concorrenteGanhou: z.string().max(255).optional(),
  detalhesPerda: z.string().max(1000).optional(),
});

export const cancelarRenovacaoSchema = z.object({
  motivoCancelamento: z.string().max(1000),
});

export const criarRenovacaoManualSchema = z.object({
  documentoVendaAnteriorId: z.string().uuid(),
});

// --- Response Schemas ---

export const renovacaoResponseSchema = z.object({
  id: z.string().uuid(),
  corretoraId: z.string().uuid(),
  clienteId: z.string().uuid(),
  documentoVendaAnteriorId: z.string().uuid().nullable(),
  vendedorId: z.string().uuid(),
  status: z.enum([
    'NAO_TRABALHADO',
    'EM_PROSPECCAO',
    'EM_NEGOCIACAO',
    'AGUARDANDO_CLIENTE',
    'RENOVADO',
    'PERDIDO',
    'CANCELADO',
  ]),
  premioAnterior: z.string().nullable(),
  percentualComissaoAnterior: z.string().nullable(),
  valorComissaoAnterior: z.string().nullable(),
  premioNovo: z.string().nullable(),
  percentualComissaoNovo: z.string().nullable(),
  valorComissaoNovo: z.string().nullable(),
  dataVencimento: z.string(),
  novaVigenciaInicio: z.string().nullable(),
  novaVigenciaFim: z.string().nullable(),
  documentoVendaNovoId: z.string().uuid().nullable(),
  dataFinalizacao: z.string().nullable(),
  finalizadoPorId: z.string().uuid().nullable(),
  dataPerda: z.string().nullable(),
  motivoPerda: z.string().nullable(),
  concorrenteGanhou: z.string().nullable(),
  detalhesPerda: z.string().nullable(),
  motivoCancelamento: z.string().nullable(),
  observacoes: z.string().nullable(),
  itemDescricao: z.string().nullable(),
  produtoDescricao: z.string().nullable(),
  seguradoraAnterior: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const renovacaoComVendedorResponseSchema = renovacaoResponseSchema.extend({
  vendedor: z.object({
    id: z.string().uuid(),
    nome: z.string(),
  }).nullable(),
});

export const iniciarRenovacaoResponseSchema = z.object({
  renovacao: renovacaoResponseSchema,
  cotacao: z.object({
    id: z.string().uuid(),
    numeroCotacao: z.string(),
    status: z.string(),
    situacao: z.string(),
    vigenciaInicio: z.string(),
    vigenciaFim: z.string(),
  }),
});

export const importacaoResultadoSchema = z.object({
  total: z.number().int(),
  sucesso: z.number().int(),
  erros: z.number().int(),
  pendentes: z.number().int(),
  detalhes: z.array(
    z.object({
      linha: z.number().int(),
      status: z.enum(['sucesso', 'erro', 'pulado', 'pendente']),
      mensagem: z.string(),
      cliente: z.string().optional(),
      produto: z.string().optional(),
    })
  ),
  clientesPendentes: z.array(
    z.object({
      linha: z.number().int(),
      tipoPessoa: z.enum(['PF', 'PJ']),
      nome: z.string(),
      documento: z.string(),
      emails: z.array(z.string()),
      telefones: z.array(z.string()),
      produto: z.string(),
      premioLiquido: z.string().nullable(),
      comissao: z.string().nullable(),
      vigenciaFinal: z.string(),
      seguradora: z.string().nullable(),
    })
  ),
});

// --- Types ---

export type ListRenovacoesQuery = z.infer<typeof listRenovacoesQuerySchema>;
export type AtualizarStatusInput = z.infer<typeof atualizarStatusSchema>;
export type AtualizarValoresInput = z.infer<typeof atualizarValoresSchema>;
export type FinalizarRenovacaoInput = z.infer<typeof finalizarRenovacaoSchema>;
export type PerderRenovacaoInput = z.infer<typeof perderRenovacaoSchema>;
export type CancelarRenovacaoInput = z.infer<typeof cancelarRenovacaoSchema>;
export type CriarRenovacaoManualInput = z.infer<typeof criarRenovacaoManualSchema>;
export type RenovacaoResponse = z.infer<typeof renovacaoResponseSchema>;
export type RenovacaoComVendedorResponse = z.infer<typeof renovacaoComVendedorResponseSchema>;
export type IniciarRenovacaoResponse = z.infer<typeof iniciarRenovacaoResponseSchema>;
export type ImportacaoResultado = z.infer<typeof importacaoResultadoSchema>;
