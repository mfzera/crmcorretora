import { z } from 'zod';

export const createDocumentoVendaSchema = z
  .object({
    clienteId: z.string().uuid(),
    vendedorId: z.string().uuid().optional(), // vendedor principal; se omitido, usa o usuário logado (atuante)
    produtoId: z.string().uuid(),
    tipoDocumento: z.enum([
      'COTACAO_DIRETA',
      'PROPOSTA_FORMAL',
      'VENDA_EXPRESSA',
      'COTACAO_PERDIDA',
    ]),
    numeroPropostaExterna: z.string().max(100).optional(),
    numeroApoliceExterna: z.string().max(100).optional(),
    numeroSistemaLegado: z.string().max(100).optional(),
    vigenciaInicio: z.string(),
    vigenciaFim: z.string(),
    moeda: z.string().length(3).default('BRL'),
    premioLiquido: z.coerce.number().min(0).optional(),
    percentualComissao: z.coerce.number().min(0).max(100).optional(),
    coberturas: z.record(z.string(), z.unknown()).optional(),
    franquia: z.coerce.number().min(0).optional(),
    valorSegurado: z.coerce.number().min(0).optional(),
    observacoes: z.string().max(2000).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    // Negócio Corretora - comissão split
    negocioCorretora: z.boolean().optional().default(false),
    percentualCorretora: z.coerce.number().min(0).max(100).optional(),
    valorComissaoCorretora: z.coerce.number().min(0).optional(),
  })
  .refine((data) => data.vigenciaFim > data.vigenciaInicio, {
    message: 'A data de fim de vigência deve ser posterior à data de início',
    path: ['vigenciaFim'],
  });

export const updateDocumentoVendaSchema = z
  .object({
    numeroPropostaExterna: z.string().max(100).optional().nullable(),
    numeroApoliceExterna: z.string().max(100).optional().nullable(),
    dataEmissaoApolice: z.string().optional().nullable(),
    numeroSistemaLegado: z.string().max(100).optional().nullable(),
    vigenciaInicio: z.string().optional(),
    vigenciaFim: z.string().optional(),
    premioLiquido: z.coerce.number().min(0).optional().nullable(),
    percentualComissao: z.coerce.number().min(0).max(100).optional().nullable(),
    coberturas: z.record(z.string(), z.unknown()).optional().nullable(),
    itemDescricao: z.string().max(500).optional().nullable(),
    franquia: z.coerce.number().min(0).optional().nullable(),
    valorSegurado: z.coerce.number().min(0).optional().nullable(),
    observacoes: z.string().max(2000).optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.vigenciaInicio && data.vigenciaFim) {
        return data.vigenciaFim > data.vigenciaInicio;
      }
      return true;
    },
    {
      message: 'A data de fim de vigência deve ser posterior à data de início',
      path: ['vigenciaFim'],
    },
  );

export const listDocumentosVendaQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).optional(),
  search: z.string().max(100).optional(),
  clienteId: z.string().uuid().optional(),
  produtoId: z.string().uuid().optional(),
  vendedorId: z.string().uuid().optional(),
  status: z.string().optional(),
  tipoDocumento: z
    .enum([
      'COTACAO_DIRETA',
      'PROPOSTA_FORMAL',
      'VENDA_EXPRESSA',
      'COTACAO_PERDIDA',
    ])
    .optional(),
  seguradoraParceiraId: z.string().uuid().optional(),
  vigenciaFimAte: z.string().optional(),
  vigenciaFimDe: z.string().optional(),
  vigenciaInicioAte: z.string().optional(),
  vigenciaInicioDe: z.string().optional(),
  criadoApos: z.string().optional(),
  criadoAntes: z.string().optional(),
  dataAprovacaoDe: z.string().optional(),
  dataAprovacaoAte: z.string().optional(),
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
