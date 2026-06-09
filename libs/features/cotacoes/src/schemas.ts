import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato YYYY-MM-DD');

export const createCotacaoSchema = z.object({
  clienteId: z.string().uuid(),
  produtoId: z.string().uuid(),
  seguradoraParceiraId: z.string().uuid().optional(),
  situacao: z.enum(['NOVO', 'RENOVACAO']).default('NOVO'),
  origem: z.enum(['MANUAL', 'RENOVACAO_PENDENTE']).default('MANUAL'),
  vigenciaInicio: isoDate,
  vigenciaFim: isoDate,
  premioLiquido: z.coerce.number().min(0).optional().nullable(),
  percentualComissao: z.coerce.number().min(0).max(100).optional(),

  // Vendedor principal pode ser escolhido (default: usuário logado)
  vendedorId: z.string().uuid().optional().nullable(),

  // Commission split fields (optional)
  vendedorSecundarioId: z.string().uuid().optional().nullable(),
  vendedorTerceiroId: z.string().uuid().optional().nullable(),
  percentualComissaoPrincipal: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional()
    .nullable(),
  percentualComissaoSecundario: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional()
    .nullable(),
  percentualComissaoTerceiro: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional()
    .nullable(),
  percentualCorretora: z.coerce.number().min(0).max(100).optional().nullable(),
  negocioCorretora: z.boolean().optional().default(true),

  itemDescricao: z.string().max(500).optional(),
  coberturas: z.record(z.string(), z.unknown()).optional(),
  detalhesRisco: z.record(z.string(), z.unknown()).optional(),
  documentoVendaId: z.string().uuid().optional().nullable(),
});

export const updateCotacaoSchema = z.object({
  produtoId: z.string().uuid().optional(),
  seguradoraParceiraId: z.string().uuid().optional(),
  situacao: z.enum(['NOVO', 'RENOVACAO']).optional(),
  vigenciaInicio: isoDate.optional(),
  vigenciaFim: isoDate.optional(),
  premioLiquido: z.coerce.number().min(0).optional().nullable(),
  percentualComissao: z.coerce.number().min(0).max(100).optional().nullable(),

  // Vendedor principal editável
  vendedorId: z.string().uuid().optional().nullable(),

  // Commission split fields (optional)
  vendedorSecundarioId: z.string().uuid().optional().nullable(),
  vendedorTerceiroId: z.string().uuid().optional().nullable(),
  percentualComissaoPrincipal: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional()
    .nullable(),
  percentualComissaoSecundario: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional()
    .nullable(),
  percentualComissaoTerceiro: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional()
    .nullable(),
  percentualCorretora: z.coerce.number().min(0).max(100).optional().nullable(),
  negocioCorretora: z.boolean().optional(),
  isFechado: z.boolean().optional(),
  clienteId: z.string().uuid().optional(),

  itemDescricao: z.string().max(500).optional().nullable(),
  coberturas: z.record(z.string(), z.unknown()).optional().nullable(),
  detalhesRisco: z.record(z.string(), z.unknown()).optional().nullable(),
  status: z.enum(['EM_ELABORACAO', 'PERDIDA', 'EXPIRADA', 'CONVERTIDA']).optional(),
  etapa: z
    .enum(['LEVANTANDO_DADOS', 'PROPOSTA_ENVIADA', 'EM_NEGOCIACAO', 'AGUARDANDO_RETORNO'])
    .optional(),
});

export const listCotacoesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).optional(),
  clienteId: z.string().uuid().optional(),
  produtoId: z.string().uuid().optional(),
  vendedorId: z.string().uuid().optional(),
  status: z
    .enum(['EM_ELABORACAO', 'PERDIDA', 'EXPIRADA', 'CONVERTIDA'])
    .optional(),
  negocioCorretora: z
    .union([z.boolean(), z.string()])
    .transform((val) => {
      if (typeof val === 'boolean') return val;
      return val === 'true';
    })
    .optional(),
});

export const marcarPerdidaSchema = z.object({
  motivoPerda: z
    .string()
    .min(1, 'Motivo da perda é obrigatório')
    .max(100, 'Motivo da perda deve ter no máximo 100 caracteres'),
  detalhesPerda: z
    .string()
    .max(1000, 'Detalhes devem ter no máximo 1000 caracteres')
    .optional()
    .or(z.literal('')),
  concorrenteGanhou: z
    .string()
    .max(255, 'Nome do concorrente deve ter no máximo 255 caracteres')
    .optional()
    .or(z.literal('')),
});

export type CreateCotacaoInput = z.infer<typeof createCotacaoSchema>;
export type UpdateCotacaoInput = z.infer<typeof updateCotacaoSchema>;
export type ListCotacoesQuery = z.infer<typeof listCotacoesQuerySchema>;
export type MarcarPerdidaInput = z.infer<typeof marcarPerdidaSchema>;
