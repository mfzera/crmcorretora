import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';
import { cotacoes } from '@ecotech/shared/database';
import {
  createCotacaoSchema,
  updateCotacaoSchema,
  marcarPerdidaSchema,
} from '@ecotech/features/cotacoes';
import {
  routeDoc,
  defaultErrors,
  defaultErrorsWithNotFound,
  uuidParam,
  metaSchema,
} from '../index.js';
import { wireDate, wireNumber } from '../wire.js';

const pessoaRef = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  email: z.string(),
});

/**
 * Base derivada da tabela cotacoes (drizzle-zod). Nullability e tipos vêm
 * direto do schema do DB — adicionar/remover colunas na tabela reflete aqui
 * automaticamente. Overrides explícitos abaixo cobrem campos onde o handler
 * transforma o valor cru do Drizzle (decimais → number via parseFloat;
 * timestamps Date → ISO string via JSON.stringify).
 */
const cotacaoSelect = createSelectSchema(cotacoes);

const cotacaoBase = cotacaoSelect.extend({
  // decimais: handler converte com parseFloat (string Drizzle → number wire)
  premioLiquido: wireNumber.nullable(),
  percentualComissao: wireNumber.nullable(),
  valorComissao: wireNumber.nullable(),
  percentualComissaoPrincipal: wireNumber.nullable(),
  percentualComissaoSecundario: wireNumber.nullable(),
  percentualComissaoTerceiro: wireNumber.nullable(),
  valorComissaoPrincipal: wireNumber.nullable(),
  valorComissaoSecundario: wireNumber.nullable(),
  valorComissaoTerceiro: wireNumber.nullable(),
  percentualCorretora: wireNumber.nullable(),
  valorComissaoCorretora: wireNumber.nullable(),

  // timestamps: Date no runtime → string ISO no JSON
  createdAt: wireDate.nullable(),
  updatedAt: wireDate.nullable(),
  deletedAt: wireDate.nullable(),
  dataMarcadaPerdida: wireDate.nullable(),

  // alias do handler (numero = numeroCotacao)
  numero: z.string(),
});

const clienteRelacao = z.object({
  id: z.string().uuid(),
  tipoPessoa: z.string(),
  nome: z.string().nullable(),
  cpf: z.string().nullable(),
  rg: z.string().nullish(),
  dataNascimento: z.string().nullable(),
  sexo: z.string().nullish(),
  estadoCivil: z.string().nullish(),
  profissao: z.string().nullish(),
  razaoSocial: z.string().nullable(),
  nomeFantasia: z.string().nullable(),
  cnpj: z.string().nullable(),
  inscricaoEstadual: z.string().nullish(),
  inscricaoMunicipal: z.string().nullish(),
  ramoAtividade: z.string().nullish(),
  dataAbertura: z.string().nullish(),
  email: z.string().nullable(),
  telefone: z.string().nullable(),
  celular: z.string().nullable(),
  endereco: z.unknown(),
  ativo: z.boolean(),
}).nullable();

const cotacaoComRelacoes = cotacaoBase.extend({
  cliente: clienteRelacao,
  vendedor: pessoaRef.nullable(),
  vendedorSecundario: pessoaRef.nullable(),
  vendedorTerceiro: pessoaRef.nullable(),
  atuante: pessoaRef.nullable(),
  produto: z.unknown(),
  seguradoraParceira: z
    .object({
      id: z.string().uuid(),
      razaoSocial: z.string(),
      nomeFantasia: z.string().nullable(),
    })
    .nullable(),
  dadosRenovacao: z
    .object({
      premioLiquidoAnterior: wireNumber.nullable(),
      percentualComissaoAnterior: wireNumber.nullable(),
      valorComissaoAnterior: wireNumber.nullable(),
    })
    .optional(),
});

const comentario = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  texto: z.string(),
  createdAt: wireDate,
  replies: z.array(z.unknown()),
  autor: z.object({
    id: z.string().uuid(),
    nome: z.string(),
    avatarUrl: z.string().nullable(),
  }),
});

const comentarioBody = z.object({
  texto: z.string().min(1).max(2000),
  parentId: z.string().uuid().nullable().optional(),
});

const msgSuccess = z.object({
  success: z.literal(true),
  message: z.string(),
});

const listCotacoesQueryDoc = z.object({
  page: z.coerce.number().min(1).default(1).describe('Página'),
  limit: z.coerce.number().min(1).optional().describe('Itens por página'),
  clienteId: z.string().uuid().optional(),
  produtoId: z.string().uuid().optional(),
  vendedorId: z.string().uuid().optional(),
  status: z
    .enum(['EM_ELABORACAO', 'PERDIDA', 'EXPIRADA', 'CONVERTIDA'])
    .optional(),
  negocioCorretora: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional()
    .describe('Filtrar por negócio da corretora'),
});

export const cotacoesDocs = {
  criar: routeDoc({
    body: createCotacaoSchema,
    response: {
      201: z.object({ success: z.literal(true), data: cotacaoBase }),
      ...defaultErrors,
    },
  }),

  listar: routeDoc({
    querystring: listCotacoesQueryDoc,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(z.unknown()),
        meta: metaSchema,
      }),
      ...defaultErrors,
    },
  }),

  buscar: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: cotacaoComRelacoes }),
      ...defaultErrorsWithNotFound,
    },
  }),

  atualizar: routeDoc({
    params: uuidParam,
    body: updateCotacaoSchema,
    response: {
      200: z.object({ success: z.literal(true), data: cotacaoBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  excluir: routeDoc({
    params: uuidParam,
    response: { 200: msgSuccess, ...defaultErrorsWithNotFound },
  }),

  marcarPerdida: routeDoc({
    params: uuidParam,
    body: marcarPerdidaSchema,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          cotacao: cotacaoBase,
          documentoVenda: z.unknown(),
        }),
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  reabrir: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: cotacaoBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  confirmarVenda: routeDoc({
    params: uuidParam,
    body: z.object({
      skipAnexosCheck: z.boolean().optional(),
      fechadorId: z.string().uuid().optional(),
      vigenciaInicio: z.string().date(),
      vigenciaFim: z.string().date(),
    }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.unknown(),
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  adicionarVendedor: routeDoc({
    params: uuidParam,
    body: z.object({ vendedorId: z.string().uuid() }),
    response: { 200: msgSuccess, ...defaultErrorsWithNotFound },
  }),

  listarVendedores: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(z.unknown()),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  listarComentarios: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: z.array(comentario) }),
      ...defaultErrorsWithNotFound,
    },
  }),

  adicionarComentario: routeDoc({
    params: uuidParam,
    body: comentarioBody,
    response: {
      201: z.object({ success: z.literal(true), data: comentario }),
      ...defaultErrorsWithNotFound,
    },
  }),
};

/** Mapeia o resultado cru do Drizzle para o shape que cotacaoBase exige.
 *  Sempre use este helper ao retornar uma cotação — garante que o campo
 *  `numero` (alias de numeroCotacao) esteja presente e evita 500 de
 *  ResponseSerializationError. */
export const mapCotacao = <T extends { numeroCotacao: string }>(c: T) => ({
  ...c,
  numero: c.numeroCotacao,
});
