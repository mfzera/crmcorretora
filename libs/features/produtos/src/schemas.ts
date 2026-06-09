import { z } from 'zod';

export const createProdutoSchema = z.object({
  nomeProduto: z.string().min(2).max(256),
  descricao: z.string().max(1000).optional(),
  tipoSeguro: z.enum([
    'AUTO',
    'VIDA',
    'RESIDENCIAL',
    'EMPRESARIAL',
    'SAUDE',
    'VIAGEM',
    'OUTROS',
  ]),
  premioMinimo: z.coerce.number().min(0).optional(),
  premioMaximo: z.coerce.number().min(0).optional(),
  percentualComissaoPadrao: z.coerce.number().min(0).max(100).optional(),
});

export const updateProdutoSchema = z.object({
  nomeProduto: z.string().min(2).max(256).optional(),
  descricao: z.string().max(1000).optional().nullable(),
  tipoSeguro: z
    .enum([
      'AUTO',
      'VIDA',
      'RESIDENCIAL',
      'EMPRESARIAL',
      'SAUDE',
      'VIAGEM',
      'OUTROS',
    ])
    .optional(),
  premioMinimo: z.coerce.number().min(0).optional().nullable(),
  premioMaximo: z.coerce.number().min(0).optional().nullable(),
  percentualComissaoPadrao: z.coerce.number().min(0).max(100).optional().nullable(),
  ativo: z.boolean().optional(),
});

export const listProdutosQuerySchema = z.object({
  pagina: z.coerce.number().min(1).default(1),
  porPagina: z.coerce.number().min(1).max(500).default(10),
  tipoSeguro: z.string().optional(),
  ativo: z.string().optional(),
  busca: z.string().optional(),
});

export type CreateProdutoInput = z.infer<typeof createProdutoSchema>;
export type UpdateProdutoInput = z.infer<typeof updateProdutoSchema>;
export type ListProdutosQuery = z.infer<typeof listProdutosQuerySchema>;
