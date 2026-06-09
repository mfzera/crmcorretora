import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida — use o formato YYYY-MM-DD');

export const createDocumentoVendaSchema = z
  .object({
  clienteId: z.string().uuid(),
  vendedorId: z.string().uuid().optional(),
  produtoId: z.string().uuid(),
  tipoDocumento: z.enum([
    'COTACAO_DIRETA',
    'PROPOSTA_FORMAL',
    'VENDA_EXPRESSA',
  ]),
  numeroPropostaExterna: z.string().max(100).optional(),
  numeroApoliceExterna: z.string().max(100).optional(),
  numeroSistemaLegado: z.string().max(100).optional(),
  vigenciaInicio: isoDate,
  vigenciaFim: isoDate,
  moeda: z.string().length(3).default('BRL'),
  premioLiquido: z.coerce.number().min(0).optional(),
  percentualComissao: z.coerce.number().min(0).max(100).optional(),

  // Negócio Corretora
  negocioCorretora: z.boolean().optional().default(false),
  percentualCorretora: z.coerce.number().min(0).max(100).optional().nullable(),
  valorComissaoCorretora: z.coerce.number().min(0).optional().nullable(),

  coberturas: z.record(z.string(), z.unknown()).optional(),
  franquia: z.coerce.number().min(0).optional(),
  valorSegurado: z.coerce.number().min(0).optional(),
  observacoes: z.string().max(2000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})
  .refine((d) => d.vigenciaFim >= d.vigenciaInicio, {
    message: 'vigenciaFim deve ser igual ou posterior a vigenciaInicio',
    path: ['vigenciaFim'],
  });

export const registrarApoliceAvulsaSchema = z
  .object({
  clienteId: z.string().uuid(),
  produtoId: z.string().uuid(),
  seguradoraParceiraId: z.string().uuid().optional(),
  numeroApoliceExterna: z.string().min(1).max(100),
  vigenciaInicio: isoDate,
  vigenciaFim: isoDate,
  premioLiquido: z.coerce.number().min(0).optional(),
  percentualComissao: z.coerce.number().min(0).max(100).optional(),
  valorSegurado: z.coerce.number().min(0).optional(),
  franquia: z.coerce.number().min(0).optional(),
  itemDescricao: z.string().max(500).optional(),
  observacoes: z.string().max(2000).optional(),
})
  .refine((d) => d.vigenciaFim >= d.vigenciaInicio, {
    message: 'vigenciaFim deve ser igual ou posterior a vigenciaInicio',
    path: ['vigenciaFim'],
  });

export const updateDocumentoVendaSchema = z
  .object({
  vendedorId: z.string().uuid().optional().nullable(),
  vendedorSecundarioId: z.string().uuid().optional().nullable(),
  vendedorTerceiroId: z.string().uuid().optional().nullable(),
  numeroPropostaExterna: z.string().max(100).optional().nullable(),
  numeroApoliceExterna: z.string().max(100).optional().nullable(),
  numeroSistemaLegado: z.string().max(100).optional().nullable(),
  vigenciaInicio: isoDate.optional(),
  vigenciaFim: isoDate.optional(),
  premioLiquido: z.coerce.number().min(0).optional().nullable(),
  percentualComissao: z.coerce.number().min(0).max(100).optional().nullable(),
  coberturas: z.record(z.string(), z.unknown()).optional().nullable(),
  franquia: z.coerce.number().min(0).optional().nullable(),
  valorSegurado: z.coerce.number().min(0).optional().nullable(),
  observacoes: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  numeroParcelas: z.coerce.number().int().min(1).max(60).optional().nullable(),
  modalidadePagamentoVendedor: z.enum(['AVISTA', 'PARCELADO']).optional().nullable(),
})
  .refine(
    (d) => !d.vigenciaInicio || !d.vigenciaFim || d.vigenciaFim >= d.vigenciaInicio,
    {
      message: 'vigenciaFim deve ser igual ou posterior a vigenciaInicio',
      path: ['vigenciaFim'],
    },
  );

export const listDocumentosVendaQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).optional(),
  search: z
    .string()
    .max(100)
    .transform((s) => s.replace(/%/g, '\\%').replace(/_/g, '\\_'))
    .optional(),
  clienteId: z.string().uuid().optional(),
  produtoId: z.string().uuid().optional(),
  vendedorId: z.string().uuid().optional(),
  status: z.string().optional(),
  tipoDocumento: z
    .enum(['COTACAO_DIRETA', 'PROPOSTA_FORMAL', 'VENDA_EXPRESSA'])
    .optional(),
  seguradoraParceiraId: z.string().uuid().optional(),
  vigenciaFimAte: isoDate.optional(),
  vigenciaFimDe: isoDate.optional(),
  vigenciaInicioAte: isoDate.optional(),
  vigenciaInicioDe: isoDate.optional(),
  criadoApos: isoDate.optional(),
  criadoAntes: isoDate.optional(),
  dataAprovacaoDe: isoDate.optional(),
  dataAprovacaoAte: isoDate.optional(),
});

export const registrarApoliceSchema = z.object({
  numeroApoliceExterna: z.string().max(100),
});

export const rejeitarCadastroSchema = z.object({
  motivoRejeicao: z.string().max(1000),
});

export const cancelarVendaSchema = z.object({
  motivoCancelamento: z.string().max(1000),
});

export const registrarPerdaSchema = z.object({
  motivoPerda: z.string().max(50),
  concorrenteGanhou: z.string().max(255).optional(),
  detalhesPerda: z.string().max(1000).optional(),
});

export const adicionarAnotacaoSchema = z.object({
  descricao: z.string().max(2000),
});

export const solicitarExclusaoVendaSchema = z.object({
  motivo: z.string().max(1000).optional(),
});

export const recusarExclusaoVendaSchema = z.object({
  motivoRecusa: z.string().min(1).max(1000),
});

export const solicitarTrocaVendedorSchema = z.object({
  tipoVendedor: z.enum(['principal', 'secundario', 'terceiro']),
  novoVendedorId: z.string().uuid(),
  motivo: z.string().min(10).max(1000),
});

export const recusarTrocaVendedorSchema = z.object({
  motivoRecusa: z.string().min(1).max(1000),
});

export type SolicitarTrocaVendedorInput = z.infer<
  typeof solicitarTrocaVendedorSchema
>;
export type RecusarTrocaVendedorInput = z.infer<
  typeof recusarTrocaVendedorSchema
>;

export type CreateDocumentoVendaInput = z.infer<
  typeof createDocumentoVendaSchema
>;
export type UpdateDocumentoVendaInput = z.infer<
  typeof updateDocumentoVendaSchema
>;
export type ListDocumentosVendaQuery = z.infer<
  typeof listDocumentosVendaQuerySchema
>;
export type RegistrarApoliceInput = z.infer<typeof registrarApoliceSchema>;
export type RejeitarCadastroInput = z.infer<typeof rejeitarCadastroSchema>;
export type CancelarVendaInput = z.infer<typeof cancelarVendaSchema>;
export type RegistrarPerdaInput = z.infer<typeof registrarPerdaSchema>;
export type AdicionarAnotacaoInput = z.infer<typeof adicionarAnotacaoSchema>;
