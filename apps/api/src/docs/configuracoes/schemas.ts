import { z } from 'zod';
import { routeDoc, defaultErrors, defaultErrorsWithNotFound, uuidParam } from '../index.js';
import { wireNumber } from '../wire.js';

// ── Comissões ──────────────────────────────────────────────────────────────
const tipoSeguroEnum = z.enum(['AUTO', 'VIDA', 'RESIDENCIAL', 'EMPRESARIAL', 'SAUDE', 'VIAGEM', 'OUTROS']);
const tipoNegocio = z.enum(['NOVO', 'RENOVACAO']).optional();
const percentual = z.number().min(0).max(100);

const configComissao = z.object({
  id: z.string().uuid(),
  corretoraId: z.string().uuid(),
  tipoSeguro: tipoSeguroEnum,
  tipoNegocio: z.string().nullable(),
  percentualParticipacao: wireNumber,
  createdAt: z.string(),
  updatedAt: z.string(),
});

const statusPagamento = z.enum(['PENDENTE', 'PAGO', 'CANCELADO']);
const statusRecebimento = z.enum(['AGUARDANDO', 'RECEBIDO', 'NAO_APLICAVEL']);

export const configuracoesComissoesDocs = {
  listarGlobal: routeDoc({
    response: { 200: z.array(configComissao), ...defaultErrors },
  }),

  upsertGlobal: routeDoc({
    body: z.object({ tipoSeguro: tipoSeguroEnum, tipoNegocio: z.enum(['NOVO', 'RENOVACAO']).optional(), percentualParticipacao: percentual }),
    response: { 200: configComissao, ...defaultErrors },
  }),

  excluirGlobal: routeDoc({
    params: uuidParam,
    response: { 204: z.object({}) },
  }),

  listarVendedores: routeDoc({
    response: { 200: z.array(configComissao.extend({ usuarioId: z.string().uuid(), nomeUsuario: z.string() })), ...defaultErrors },
  }),

  criarVendedor: routeDoc({
    body: z.object({ usuarioId: z.string().uuid(), tipoSeguro: tipoSeguroEnum, tipoNegocio: z.enum(['NOVO', 'RENOVACAO']).optional(), percentualParticipacao: percentual }),
    response: { 201: configComissao, ...defaultErrors },
  }),

  atualizarVendedor: routeDoc({
    params: uuidParam,
    body: z.object({ percentualParticipacao: percentual }),
    response: { 200: configComissao, ...defaultErrorsWithNotFound },
  }),

  excluirVendedor: routeDoc({
    params: uuidParam,
    response: { 204: z.object({}) },
  }),

  loteVendedores: routeDoc({
    body: z.object({ usuarioIds: z.array(z.string().uuid()), tipoSeguro: tipoSeguroEnum, tipoNegocio: z.enum(['NOVO', 'RENOVACAO']).optional(), percentualParticipacao: percentual }),
    response: { 200: z.object({ criados: z.number(), atualizados: z.number(), erros: z.array(z.string()) }), ...defaultErrors },
  }),

  listarCargos: routeDoc({
    response: { 200: z.array(configComissao.extend({ cargoId: z.string().uuid(), nomeCargo: z.string() })), ...defaultErrors },
  }),

  criarCargo: routeDoc({
    body: z.object({ cargoId: z.string().uuid(), tipoSeguro: tipoSeguroEnum, tipoNegocio: z.enum(['NOVO', 'RENOVACAO']).optional(), percentualParticipacao: percentual }),
    response: { 201: configComissao, ...defaultErrors },
  }),

  atualizarCargo: routeDoc({
    params: uuidParam,
    body: z.object({ percentualParticipacao: percentual }),
    response: { 200: configComissao, ...defaultErrorsWithNotFound },
  }),

  excluirCargo: routeDoc({
    params: uuidParam,
    response: { 204: z.object({}) },
  }),

  resolver: routeDoc({
    querystring: z.object({ usuarioId: z.string().uuid().optional(), tipoSeguro: tipoSeguroEnum, tipoNegocio: z.enum(['NOVO', 'RENOVACAO']).optional() }),
    response: {
      200: z.object({ percentualParticipacao: z.string().nullable(), fonte: z.enum(['usuario', 'cargo', 'global']).nullable(), sistemaAtivo: z.boolean() }),
      ...defaultErrors,
    },
  }),

  extrato: routeDoc({
    querystring: z.object({
      vendedorId: z.string().uuid().optional(), statusPagamento: statusPagamento.optional(),
      dataInicio: z.string().optional(), dataFim: z.string().optional(), page: z.coerce.number().optional(), limit: z.coerce.number().optional(),
    }),
    response: { 200: z.object({ data: z.array(z.unknown()), pagination: z.unknown() }), ...defaultErrors },
  }),

  atualizarPagamento: routeDoc({
    params: uuidParam,
    body: z.object({ statusPagamentoComissao: statusPagamento, dataPagamentoComissao: z.string().optional(), observacaoPagamentoComissao: z.string().optional() }),
    response: { 200: z.unknown(), ...defaultErrorsWithNotFound },
  }),

  relatorio: routeDoc({
    querystring: z.object({ dataInicio: z.string().optional(), dataFim: z.string().optional() }),
    response: { 200: z.unknown(), ...defaultErrors },
  }),

  historicoConfigs: routeDoc({
    querystring: z.object({ escopo: z.string().optional(), page: z.coerce.number().optional(), limit: z.coerce.number().optional() }),
    response: { 200: z.object({ data: z.array(z.unknown()), pagination: z.unknown() }), ...defaultErrors },
  }),

  lancamentos: routeDoc({
    querystring: z.object({
      documentoVendaId: z.string().uuid().optional(), vendedorId: z.string().uuid().optional(),
      statusPagamentoVendedor: statusPagamento.optional(), statusRecebimentoSeguradora: statusRecebimento.optional(),
      tipo: z.string().optional(), dataInicio: z.string().optional(), dataFim: z.string().optional(),
      page: z.coerce.number().optional(), limit: z.coerce.number().optional(),
    }),
    response: { 200: z.object({ data: z.array(z.unknown()), pagination: z.unknown() }), ...defaultErrors },
  }),

  atualizarRecebimento: routeDoc({
    params: uuidParam,
    body: z.object({ statusRecebimentoSeguradora: statusRecebimento, dataRecebimentoSeguradora: z.string().optional(), observacaoRecebimento: z.string().optional() }),
    response: { 200: z.unknown(), ...defaultErrorsWithNotFound },
  }),

  atualizarPagamentoLancamento: routeDoc({
    params: uuidParam,
    body: z.object({ statusPagamentoVendedor: statusPagamento, dataPagamentoVendedor: z.string().optional(), observacaoPagamento: z.string().optional() }),
    response: { 200: z.unknown(), ...defaultErrorsWithNotFound },
  }),

  pagarLote: routeDoc({
    body: z.object({ ids: z.array(z.string().uuid()), dataPagamento: z.string().optional(), observacao: z.string().optional() }),
    response: { 200: z.object({ pagos: z.number(), ignorados: z.number() }), ...defaultErrors },
  }),

  projecao: routeDoc({
    querystring: z.object({ meses: z.coerce.number().optional() }),
    response: { 200: z.array(z.unknown()), ...defaultErrors },
  }),
};

// ── Configurações da Corretora ─────────────────────────────────────────────
export const corretoraConfigDocs = {
  buscar: routeDoc({
    response: { 200: z.object({ success: z.literal(true), data: z.unknown() }), ...defaultErrors },
  }),

  atualizar: routeDoc({
    body: z.object({
      nomeFantasia: z.string().optional(), razaoSocial: z.string().optional(), emailContato: z.string().email().optional(),
      telefone: z.string().optional(), cep: z.string().optional(), logradouro: z.string().optional(),
      numero: z.string().optional(), complemento: z.string().optional(), bairro: z.string().optional(),
      cidade: z.string().optional(), uf: z.string().length(2).optional(),
    }),
    response: { 200: z.object({ success: z.literal(true), data: z.unknown() }), ...defaultErrors },
  }),

  uploadLogo: routeDoc({
    response: { 200: z.object({ success: z.literal(true), data: z.object({ logoUrl: z.string() }) }), ...defaultErrors },
  }),

  excluirLogo: routeDoc({
    response: { 200: z.object({ success: z.literal(true), data: z.object({ logoUrl: z.null() }) }), ...defaultErrors },
  }),

  historico: routeDoc({
    querystring: z.object({ limit: z.coerce.number().optional() }),
    response: { 200: z.object({ success: z.literal(true), data: z.array(z.unknown()) }), ...defaultErrors },
  }),
};
