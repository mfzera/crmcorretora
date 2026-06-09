import { z } from 'zod';
import { routeDoc, defaultErrors } from '../index.js';

const periodQuery = z.object({
  dataInicio: z.string().optional().describe('Formato YYYY-MM-DD'),
  dataFim: z.string().optional().describe('Formato YYYY-MM-DD'),
  vendedorId: z.string().uuid().optional(),
});

export const dashboardDocs = {
  principal: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          stats: z.object({
            clientesAtivos: z.number(),
            renovacoesPendentes: z.number(),
            cotacoesAbertas: z.number(),
            prospeccoesEmCadastro: z.number(),
            premioLiquidoMes: z.number(),
            comissaoMes: z.number(),
            mediaComissaoPercent: z.number(),
          }),
          renovacoesUrgentes: z.array(z.object({
            id: z.string().uuid(),
            clienteNome: z.string(),
            produto: z.string(),
            dataVencimento: z.string(),
            premioAnterior: z.number(),
            diasRestantes: z.number(),
          })),
          atividadesRecentes: z.array(z.object({ id: z.string().uuid(), tipo: z.string(), descricao: z.string(), data: z.string() })),
          alertasFollowUp: z.array(z.object({
            id: z.string().uuid(),
            numeroCotacao: z.string(),
            clienteNome: z.string(),
            produto: z.string(),
            diasSemMovimento: z.number(),
            ultimaAtualizacao: z.string(),
          })),
          tarefasPendentes: z.array(z.unknown()),
        }),
      }),
      ...defaultErrors,
    },
  }),

  vendas: routeDoc({
    querystring: periodQuery,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          periodo: z.object({ dataInicio: z.string(), dataFim: z.string() }),
          vendasNovas: z.object({ quantidade: z.number(), totalPremio: z.number(), totalComissao: z.number() }),
          vendasAtivas: z.object({ quantidade: z.number(), totalPremio: z.number(), totalComissao: z.number() }),
          vendasPorStatus: z.array(z.object({ status: z.string(), quantidade: z.number(), totalPremio: z.number(), totalComissao: z.number() })),
          cotacoes: z.array(z.object({ status: z.string(), quantidade: z.number() })),
          propostas: z.array(z.object({ status: z.string(), quantidade: z.number() })),
        }),
      }),
      ...defaultErrors,
    },
  }),

  pipeline: routeDoc({
    querystring: periodQuery,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          pipeline: z.array(z.object({ etapa: z.string(), quantidade: z.number(), valorTotal: z.number() })),
          metricas: z.object({ taxaConversaoCotacoes: z.number(), totalCotacoes: z.number(), cotacoesConvertidas: z.number() }),
        }),
      }),
      ...defaultErrors,
    },
  }),

  renovacoes: routeDoc({
    querystring: periodQuery,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          porStatus: z.array(z.object({ status: z.string(), quantidade: z.number(), totalPremio: z.number() })),
          vencendo30Dias: z.object({ quantidade: z.number(), totalPremio: z.number() }),
          vencendo60Dias: z.object({ quantidade: z.number(), totalPremio: z.number() }),
          vencidas: z.object({ quantidade: z.number(), totalPremio: z.number() }),
        }),
      }),
      ...defaultErrors,
    },
  }),

  equipe: routeDoc({
    querystring: periodQuery,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          periodo: z.object({ dataInicio: z.string(), dataFim: z.string() }),
          vendedores: z.array(z.object({
            vendedor: z.object({ id: z.string().uuid(), nome: z.string(), email: z.string() }),
            vendasPeriodo: z.object({ quantidade: z.number(), totalPremio: z.number(), totalComissao: z.number() }),
            vendasAtivas: z.object({ quantidade: z.number(), totalPremio: z.number() }),
            totalClientes: z.number(),
          })),
          resumo: z.object({ totalVendedores: z.number(), totalVendasPeriodo: z.number(), totalPremioPeriodo: z.number(), totalComissaoPeriodo: z.number() }),
        }),
      }),
      ...defaultErrors,
    },
  }),

  renovacoesChart: routeDoc({
    querystring: z.object({ periodo: z.enum(['semana', 'mes', 'trimestre']).default('mes') }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(z.object({ date: z.string(), renovacoes: z.number(), convertidos: z.number() })),
      }),
      ...defaultErrors,
    },
  }),

  relatorioComissoes: routeDoc({
    querystring: periodQuery,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          periodo: z.object({ dataInicio: z.string(), dataFim: z.string() }),
          comissoes: z.array(z.object({
            vendedor: z.object({ id: z.string().uuid(), nome: z.string() }),
            quantidadeVendas: z.number(),
            totalPremio: z.number(),
            totalComissao: z.number(),
          })),
          totais: z.object({ quantidadeVendas: z.number(), totalPremio: z.number(), totalComissao: z.number() }),
        }),
      }),
      ...defaultErrors,
    },
  }),
};
