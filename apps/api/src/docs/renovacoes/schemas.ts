import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';
import { renovacoesComerciais } from '@ecotech/shared/database';
import {
  routeDoc,
  defaultErrors,
  defaultErrorsWithNotFound,
  uuidParam,
  metaSchema,
} from '../index.js';
import { wireDate } from '../wire.js';

const statusRenovacao = z.enum([
  'NAO_TRABALHADO',
  'EM_PROSPECCAO',
  'EM_NEGOCIACAO',
  'AGUARDANDO_CLIENTE',
  'RENOVADO',
  'PERDIDO',
  'CANCELADO',
]);

const renovacaoSelect = createSelectSchema(renovacoesComerciais);

const renovacaoBase = renovacaoSelect.extend({
  dataFinalizacao: wireDate.nullable(),
  dataPerda: wireDate.nullable(),
  dataCancelamento: wireDate.nullable(),
  transferidaEm: wireDate.nullable(),
  createdAt: wireDate.nullable(),
  updatedAt: wireDate.nullable(),
});

const listQueryDoc = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  vendedorId: z.string().uuid().optional(),
  status: statusRenovacao.optional(),
  dataVencimentoInicio: z.string().optional(),
  dataVencimentoFim: z.string().optional(),
  search: z.string().max(100).optional(),
});

const comentario = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  texto: z.string(),
  createdAt: wireDate,
  autor: z.object({
    id: z.string().uuid(),
    nome: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  replies: z.array(z.unknown()),
});

const clienteSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().nullable(),
  razaoSocial: z.string().nullable(),
  nomeFantasia: z.string().nullable(),
  tipoPessoa: z.string(),
  cpf: z.string().nullable(),
  cnpj: z.string().nullable(),
  email: z.string().nullable(),
  telefone: z.string().nullable(),
  ativo: z.boolean(),
});

const vendedorSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
});

const renovacaoPendenteItem = renovacaoBase.extend({
  vendedor: vendedorSchema.nullable(),
  cliente: clienteSchema.nullable(),
  documentoVendaAnterior: z
    .object({
      id: z.string().uuid(),
      cliente: clienteSchema.nullable(),
      produto: z
        .object({
          id: z.string().uuid(),
          nomeProduto: z.string(),
          tipoSeguro: z.string().nullable(),
          ativo: z.boolean(),
        })
        .nullable(),
      vendedor: z.object({ id: z.string().uuid(), nome: z.string(), email: z.string() }).nullable(),
      seguradoraParceira: z
        .object({ id: z.string().uuid(), razaoSocial: z.string(), nomeFantasia: z.string().nullable() })
        .nullable(),
    })
    .nullable(),
  solicitacaoExclusao: z
    .object({
      id: z.string().uuid(),
      renovacaoId: z.string().uuid(),
      status: z.string(),
      motivoRecusa: z.string().nullable(),
      criadoEm: wireDate,
    })
    .nullable(),
  diasParaVencimento: z.number(),
  prioridade: z.enum(['ALTA', 'MEDIA', 'BAIXA']),
  statusLabel: z.string(),
  podeIniciar: z.boolean(),
  emAndamento: z.boolean(),
  finalizado: z.boolean(),
  dentroJanela: z.boolean(),
  vencido: z.boolean(),
});

export const renovacoesDocs = {
  listarPendentes: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(renovacaoPendenteItem),
      }),
      ...defaultErrors,
    },
  }),

  listarVencidas: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(renovacaoPendenteItem),
      }),
      ...defaultErrors,
    },
  }),

  listar: routeDoc({
    querystring: listQueryDoc,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(
          renovacaoBase.extend({
            vendedor: z.object({ id: z.string().uuid(), nome: z.string() }),
            cliente: z.object({
              id: z.string().uuid(),
              nome: z.string().nullable(),
              razaoSocial: z.string().nullable(),
              tipoPessoa: z.string(),
            }),
          }),
        ),
        meta: metaSchema,
      }),
      ...defaultErrors,
    },
  }),

  buscar: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: renovacaoBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  reatribuirCliente: routeDoc({
    params: uuidParam,
    body: z.object({ novoClienteId: z.string().uuid() }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          id: z.string().uuid(),
          clienteId: z.string().uuid(),
          clienteAnteriorRemovido: z.boolean(),
        }),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  iniciar: routeDoc({
    params: uuidParam,
    body: z.object({ produtoId: z.string().uuid().optional() }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({ renovacao: renovacaoBase, cotacao: z.unknown() }),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  desfazerInicio: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({ renovacao: renovacaoBase }),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  atualizarStatus: routeDoc({
    params: uuidParam,
    body: z.object({
      status: z.enum([
        'NAO_TRABALHADO',
        'EM_PROSPECCAO',
        'EM_NEGOCIACAO',
        'AGUARDANDO_CLIENTE',
      ]),
    }),
    response: {
      200: z.object({ success: z.literal(true), data: renovacaoBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  atualizarValores: routeDoc({
    params: uuidParam,
    body: z.object({
      premioNovo: z.number().min(0).optional(),
      percentualComissaoNovo: z.number().min(0).max(100).optional(),
      novaVigenciaInicio: z.string().optional().describe('Formato YYYY-MM-DD'),
      novaVigenciaFim: z.string().optional().describe('Formato YYYY-MM-DD'),
      observacoes: z.string().max(2000).optional(),
    }),
    response: {
      200: z.object({ success: z.literal(true), data: renovacaoBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  finalizar: routeDoc({
    params: uuidParam,
    body: z.object({ documentoVendaNovoId: z.string().uuid() }),
    response: {
      200: z.object({ success: z.literal(true), data: renovacaoBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  perder: routeDoc({
    params: uuidParam,
    body: z.object({
      motivoPerda: z.string().max(500),
      concorrenteGanhou: z.string().max(255).optional(),
      detalhesPerda: z.string().max(1000).optional(),
    }),
    response: {
      200: z.object({ success: z.literal(true), data: renovacaoBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  desfazerPerda: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: renovacaoBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  cancelar: routeDoc({
    params: uuidParam,
    body: z.object({
      motivoCancelamento: z.string().max(1000),
    }),
    response: {
      200: z.object({ success: z.literal(true), data: renovacaoBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  reativar: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: renovacaoBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  processarPendentes: routeDoc({
    body: z.object({
      vendedorId: z.string().uuid(),
      linhasPendentes: z
        .array(
          z.object({
            linha: z.number().int(),
            documento: z.string(),
            itemDescricao: z.string().optional(),
            produtoDescricao: z.string().optional(),
            seguradoraAnterior: z.string().optional(),
            premioLiquido: z.string().optional(),
            comissao: z.string().optional(),
            vigenciaFinal: z.string(),
            statusPlanilha: z.string().optional(),
          }),
        )
        .max(1000),
    }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          total: z.number().int(),
          sucesso: z.number().int(),
          erros: z.number().int(),
          detalhes: z.array(
            z.object({
              linha: z.number().int(),
              status: z.enum(['sucesso', 'erro']),
              mensagem: z.string(),
            }),
          ),
        }),
      }),
      ...defaultErrors,
    },
  }),

  criarManual: routeDoc({
    body: z.object({ documentoVendaAnteriorId: z.string().uuid() }),
    response: {
      201: z.object({ success: z.literal(true), data: renovacaoBase }),
      ...defaultErrors,
    },
  }),

  importar: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          importacaoId: z.string().uuid(),
          total: z.number().int(),
          sucesso: z.number().int(),
          erros: z.number().int(),
          pendentes: z.number().int(),
          pulados: z.number().int(),
          detalhes: z.array(
            z.object({
              linha: z.number().int(),
              status: z.enum(['sucesso', 'erro', 'pulado', 'pendente']),
              mensagem: z.string(),
              cliente: z.string().optional(),
              produto: z.string().optional(),
            }),
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
            }),
          ),
        }),
      }),
      ...defaultErrors,
    },
  }),

  transferir: routeDoc({
    body: z.object({
      renovacaoIds: z
        .array(z.string().uuid())
        .min(1)
        .describe('IDs das renovações a transferir'),
      novoVendedorId: z.string().uuid(),
      observacoes: z.string().optional(),
    }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          message: z.string(),
          transferenciaId: z.string().uuid(),
          renovacoes: z.number().int(),
        }),
      }),
      ...defaultErrors,
    },
  }),

  listarTransferenciasPendentes: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(
          z.object({
            id: z.string().uuid(),
            corretoraId: z.string().uuid(),
            solicitanteId: z.string().uuid(),
            destinatarioId: z.string().uuid(),
            status: z.literal('PENDENTE'),
            observacoes: z.string().nullable(),
            criadoEm: wireDate,
            solicitante: z.object({
              id: z.string().uuid(),
              nome: z.string(),
              email: z.string(),
            }),
            itens: z.array(
              z.object({
                id: z.string().uuid(),
                renovacaoId: z.string().uuid(),
                renovacao: z.unknown().nullable(),
              }),
            ),
          }),
        ),
      }),
      ...defaultErrors,
    },
  }),

  aceitarTransferencia: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({ message: z.string() }),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  recusarTransferencia: routeDoc({
    params: uuidParam,
    body: z.object({ motivo: z.string().max(500).optional() }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({ message: z.string() }),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  solicitarExclusao: routeDoc({
    params: uuidParam,
    body: z.object({ motivo: z.string().min(1).max(500) }),
    response: {
      201: z.object({
        success: z.literal(true),
        data: z.object({
          id: z.string().uuid(),
          renovacaoId: z.string().uuid(),
          solicitanteId: z.string().uuid(),
          motivo: z.string(),
          status: z.literal('PENDENTE'),
          criadoEm: wireDate,
        }),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  listarExclusoesPendentes: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(
          z.object({
            id: z.string().uuid(),
            renovacaoId: z.string().uuid(),
            solicitanteId: z.string().uuid(),
            motivo: z.string(),
            status: z.literal('PENDENTE'),
            criadoEm: wireDate,
            renovacao: z.unknown().nullable(),
            solicitante: z.object({
              id: z.string().uuid(),
              nome: z.string(),
              email: z.string(),
            }),
          }),
        ),
      }),
      ...defaultErrors,
    },
  }),

  historicoExclusoes: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(
          z.object({
            id: z.string().uuid(),
            renovacaoId: z.string().uuid(),
            solicitanteId: z.string().uuid(),
            motivo: z.string(),
            status: z.enum(['PENDENTE', 'ACEITA', 'RECUSADA']),
            motivoRecusa: z.string().nullable(),
            criadoEm: wireDate,
            respondidoEm: wireDate.nullable(),
            renovacao: z.unknown().nullable(),
            solicitante: z.object({
              id: z.string().uuid(),
              nome: z.string(),
              email: z.string(),
            }),
            respondidoPor: z
              .object({
                id: z.string().uuid(),
                nome: z.string(),
                email: z.string(),
              })
              .nullable(),
          }),
        ),
      }),
      ...defaultErrors,
    },
  }),

  aceitarExclusao: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({ message: z.string() }),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  recusarExclusao: routeDoc({
    params: uuidParam,
    body: z.object({ motivoRecusa: z.string().min(1).max(500) }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({ message: z.string() }),
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
    body: z.object({
      texto: z.string().min(1).max(2000),
      parentId: z.string().uuid().nullable().optional(),
    }),
    response: {
      201: z.object({
        success: z.literal(true),
        data: z.object({
          id: z.string().uuid(),
          parentId: z.string().uuid().nullable(),
          texto: z.string(),
          createdAt: wireDate,
          autor: z.object({
            id: z.string().uuid().optional(),
            nome: z.string().optional(),
            avatarUrl: z.string().nullable(),
          }),
          replies: z.array(z.unknown()),
        }),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),
};
