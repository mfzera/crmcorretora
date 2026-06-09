import { z } from 'zod';

export const createCotacaoSchema = z
  .object({
    clienteId: z.string().uuid(),
    produtoId: z.string().uuid(),
    situacao: z.enum(['NOVO', 'RENOVACAO']).optional(),
    vigenciaInicio: z.string(),
    vigenciaFim: z.string(),
    premioEstimado: z.coerce.number().min(0).optional(),
    premioLiquido: z.coerce.number().min(0).optional(),
    percentualComissao: z.coerce.number().min(0).max(100).optional(),
    coberturas: z.record(z.string(), z.unknown()).optional(),
    detalhesRisco: z.record(z.string(), z.unknown()).optional(),
    dataValidade: z.string(),
  })
  .refine((data) => data.vigenciaFim > data.vigenciaInicio, {
    message: 'A data de fim de vigência deve ser posterior à data de início',
    path: ['vigenciaFim'],
  });

export const updateCotacaoSchema = z
  .object({
    produtoId: z.string().uuid().optional(),
    seguradoraParceiraId: z.string().uuid().optional(),
    vigenciaInicio: z.string().optional(),
    vigenciaFim: z.string().optional(),
    premioEstimado: z.coerce.number().min(0).optional().nullable(),
    premioLiquido: z.coerce.number().min(0).optional().nullable(),
    percentualComissao: z.coerce.number().min(0).max(100).optional().nullable(),
    vendedorId: z.string().uuid().optional().nullable(),
    vendedorSecundarioId: z.string().uuid().optional().nullable(),
    vendedorTerceiroId: z.string().uuid().optional().nullable(),
    percentualComissaoPrincipal: z.coerce.number().min(0).max(100).optional().nullable(),
    percentualComissaoSecundario: z.coerce.number().min(0).max(100).optional().nullable(),
    percentualComissaoTerceiro: z.coerce.number().min(0).max(100).optional().nullable(),
    percentualCorretora: z.coerce.number().min(0).max(100).optional().nullable(),
    negocioCorretora: z.boolean().optional(),
    isFechado: z.boolean().optional(),
    situacao: z.enum(['NOVO', 'RENOVACAO']).optional(),
    itemDescricao: z.string().max(500).optional().nullable(),
    status: z.enum(['EM_ELABORACAO', 'PERDIDA', 'EXPIRADA', 'CONVERTIDA']).optional(),
    etapa: z.enum(['LEVANTANDO_DADOS', 'PROPOSTA_ENVIADA', 'EM_NEGOCIACAO', 'AGUARDANDO_RETORNO']).optional(),
    coberturas: z.record(z.string(), z.unknown()).optional().nullable(),
    detalhesRisco: z.record(z.string(), z.unknown()).optional().nullable(),
    dataValidade: z.string().optional(),
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

export const listCotacoesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).optional(),
  clienteId: z.string().uuid().optional(),
  produtoId: z.string().uuid().optional(),
  vendedorId: z.string().uuid().optional(),
  status: z
    .enum([
      'EM_ELABORACAO',
      'ENVIADA_CLIENTE',
      'APROVADA_CLIENTE',
      'RECUSADA_CLIENTE',
      'EXPIRADA',
      'CONVERTIDA',
    ])
    .optional(),
});

export const recusarCotacaoSchema = z.object({
  motivoRecusa: z.string().max(50).optional(),
  detalhesRecusa: z.string().max(1000).optional(),
  concorrenteEscolhido: z.string().max(255).optional(),
});

export const converterCotacaoSchema = z.object({
  tipo: z.enum(['PROPOSTA', 'DOCUMENTO_VENDA']),
});

export const createProspectoSchema = z.object({
  nome: z.string().min(2).max(256),
  produtoId: z.string().uuid(),
});

export type CreateCotacaoInput = z.infer<typeof createCotacaoSchema>;
export type UpdateCotacaoInput = z.infer<typeof updateCotacaoSchema>;
export type ListCotacoesQuery = z.infer<typeof listCotacoesQuerySchema>;
export type RecusarCotacaoInput = z.infer<typeof recusarCotacaoSchema>;
export type ConverterCotacaoInput = z.infer<typeof converterCotacaoSchema>;
