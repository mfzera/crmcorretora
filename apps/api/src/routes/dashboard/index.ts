import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@ecotech/shared/database';
import {
  documentosVenda,
  cotacoes,
  propostasComerciais,
  renovacoesComerciais,
  clientes,
  usuarios,
  tarefas,
} from '@ecotech/shared/database';
import {
  eq,
  and,
  sql,
  gte,
  lte,
  isNull,
  count,
  countDistinct,
  lt,
  desc,
  asc,
} from 'drizzle-orm';
import { authorize, authorizeAny } from '@ecotech/plugins/authorization';
import { dashboardDocs } from '../../docs/dashboard/schemas.js';
import { ok } from '../../docs/index.js';

const periodQuerySchema = z.object({
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  vendedorId: z.string().uuid().optional(),
});

const dashboardRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // Main dashboard endpoint
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Dashboard'],
        summary: 'Dashboard principal',
        description:
          'Exibe visão geral com estatísticas, renovações urgentes e atividades recentes do usuário logado.',
        ...dashboardDocs.principal,
      },
      preHandler: [authorize(['dashboard:visualizar'])],
    },
    async (request, reply) => {
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const userId = request.user.sub;

        console.log('📊 [DASHBOARD] Carregando dashboard:', {
          userId,
          corretoraId: request.corretoraId,
          userPermissoes: request.user.permissoes?.slice(0, 5),
        });

        // Get stats - conta clientes distintos com documentos ATIVOS onde o usuário é o vendedor principal
        // Usa documentosVenda em vez de clientes para evitar contagem incorreta quando o usuário
        // cria clientes para outros vendedores (atuante ≠ vendedor principal)
        const clientesAtivos = await db
          .select({ count: countDistinct(documentosVenda.clienteId) })
          .from(documentosVenda)
          .where(
            and(
              eq(documentosVenda.corretoraId, request.corretoraId),
              eq(documentosVenda.vendedorId, userId),
              eq(documentosVenda.status, 'ATIVO'),
              isNull(documentosVenda.deletedAt),
            ),
          );

        const renovacoesPendentes = await db
          .select({ count: count() })
          .from(renovacoesComerciais)
          .where(
            and(
              eq(renovacoesComerciais.corretoraId, request.corretoraId),
              eq(renovacoesComerciais.vendedorId, userId),
              sql`${renovacoesComerciais.status} NOT IN ('RENOVADO', 'PERDIDO', 'CANCELADO')`,
            ),
          );

        const cotacoesAbertas = await db
          .select({ count: count() })
          .from(cotacoes)
          .where(
            and(
              eq(cotacoes.corretoraId, request.corretoraId),
              eq(cotacoes.vendedorId, userId),
              eq(cotacoes.status, 'EM_ELABORACAO'),
              isNull(cotacoes.deletedAt),
            ),
          );

        const prospeccoesEmCadastro = await db
          .select({ count: count() })
          .from(documentosVenda)
          .where(
            and(
              eq(documentosVenda.corretoraId, request.corretoraId),
              eq(documentosVenda.vendedorId, userId),
              eq(documentosVenda.status, 'AGUARDANDO_CADASTRO'),
              isNull(documentosVenda.deletedAt),
            ),
          );

        const vendasMes = await db
          .select({
            total: sql<string>`COALESCE(SUM(${documentosVenda.premioLiquido}::numeric), 0)`,
          })
          .from(documentosVenda)
          .where(
            and(
              eq(documentosVenda.corretoraId, request.corretoraId),
              eq(documentosVenda.vendedorId, userId),
              eq(documentosVenda.status, 'ATIVO'),
              gte(documentosVenda.createdAt, startOfMonth),
              isNull(documentosVenda.deletedAt),
            ),
          );

        const comissaoMes = await db
          .select({
            total: sql<string>`COALESCE(SUM(${documentosVenda.valorComissao}::numeric), 0)`,
            totalPremio: sql<string>`COALESCE(SUM(${documentosVenda.premioLiquido}::numeric), 0)`,
          })
          .from(documentosVenda)
          .where(
            and(
              eq(documentosVenda.corretoraId, request.corretoraId),
              eq(documentosVenda.vendedorId, userId),
              eq(documentosVenda.status, 'ATIVO'),
              gte(documentosVenda.createdAt, startOfMonth),
              isNull(documentosVenda.deletedAt),
            ),
          );

        const totalPremioMes = parseFloat(comissaoMes[0]?.totalPremio ?? '0');
        const totalComissaoMes = parseFloat(comissaoMes[0]?.total ?? '0');
        const mediaComissaoPercent =
          totalPremioMes > 0
            ? Math.round((totalComissaoMes / totalPremioMes) * 10000) / 100
            : 0;

        // Renovações urgentes (vencendo em 30 dias) - apenas do vendedor
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const renovacoesUrgentes =
          (await db.query.renovacoesComerciais.findMany({
            where: and(
              eq(renovacoesComerciais.corretoraId, request.corretoraId),
              eq(renovacoesComerciais.vendedorId, userId),
              sql`${renovacoesComerciais.status} NOT IN ('RENOVADO', 'PERDIDO', 'CANCELADO')`,
              lte(
                renovacoesComerciais.dataVencimento,
                in30Days.toISOString().split('T')[0],
              ),
            ),
            with: {
              documentoVendaAnterior: {
                with: {
                  cliente: true,
                  produto: true,
                },
              },
            } as any,
            orderBy: (r, { asc }) => [asc(r.dataVencimento)],
            limit: 5,
          })) as Array<
            typeof renovacoesComerciais.$inferSelect & {
              documentoVendaAnterior:
                | (typeof documentosVenda.$inferSelect & {
                    cliente: {
                      id: string;
                      nome: string | null;
                      razaoSocial: string | null;
                    } | null;
                    produto: { id: string; descricao: string } | null;
                  })
                | null;
            }
          >;

        // Alertas de follow-up: cotações EM_ELABORACAO sem movimento há mais de 5 dias
        const cincosDiasAtras = new Date(
          now.getTime() - 5 * 24 * 60 * 60 * 1000,
        );
        const alertasFollowUp = (await db.query.cotacoes.findMany({
          where: and(
            eq(cotacoes.corretoraId, request.corretoraId),
            eq(cotacoes.vendedorId, userId),
            eq(cotacoes.status, 'EM_ELABORACAO'),
            isNull(cotacoes.deletedAt),
            lt(cotacoes.updatedAt, cincosDiasAtras),
          ),
          with: {
            cliente: true,
            produto: true,
          } as any,
          orderBy: (c, { asc }) => [asc(c.updatedAt)],
          limit: 5,
        })) as Array<
          typeof cotacoes.$inferSelect & {
            cliente: {
              id: string;
              nome: string | null;
              razaoSocial: string | null;
            } | null;
            produto: { id: string; descricao: string } | null;
          }
        >;

        // Tarefas pendentes do usuário
        const tarefasPendentes = await db.query.tarefas.findMany({
          where: and(
            eq(tarefas.corretoraId, request.corretoraId),
            eq(tarefas.usuarioId, userId),
            eq(tarefas.concluida, false),
            isNull(tarefas.deletedAt),
          ),
          orderBy: (t, { asc, desc }) => [
            asc(t.dataVencimento),
            desc(t.createdAt),
          ],
          limit: 10,
        });

        // Atividades recentes (últimas vendas) - apenas do vendedor
        const atividadesRecentes = (await db.query.documentosVenda.findMany({
          where: and(
            eq(documentosVenda.corretoraId, request.corretoraId),
            eq(documentosVenda.vendedorId, userId),
            isNull(documentosVenda.deletedAt),
          ),
          with: {
            cliente: true,
            vendedor: true,
          } as any,
          orderBy: (d, { desc }) => [desc(d.createdAt)],
          limit: 5,
        })) as Array<
          typeof documentosVenda.$inferSelect & {
            cliente: {
              id: string;
              nome: string | null;
              razaoSocial: string | null;
            };
            vendedor: { id: string; nome: string };
          }
        >;

        return ok({
            stats: {
              clientesAtivos: Number(clientesAtivos[0]?.count ?? 0),
              renovacoesPendentes: Number(renovacoesPendentes[0]?.count ?? 0),
              cotacoesAbertas: Number(cotacoesAbertas[0]?.count ?? 0),
              prospeccoesEmCadastro: Number(
                prospeccoesEmCadastro[0]?.count ?? 0,
              ),
              premioLiquidoMes: parseFloat(vendasMes[0]?.total ?? '0'),
              comissaoMes: totalComissaoMes,
              mediaComissaoPercent,
            },
            renovacoesUrgentes: renovacoesUrgentes
              .filter((r) => r.documentoVendaAnterior) // Filter out renovations without documentoVendaAnterior
              .map((r) => {
                const dataVenc = new Date(r.dataVencimento);
                const diasRestantes = Math.ceil(
                  (dataVenc.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                );

                return {
                  id: r.id,
                  clienteNome:
                    r.documentoVendaAnterior?.cliente?.nome ||
                    r.documentoVendaAnterior?.cliente?.razaoSocial ||
                    'Cliente',
                  produto:
                    r.documentoVendaAnterior?.produto?.descricao || 'Produto',
                  dataVencimento: r.dataVencimento,
                  premioAnterior: parseFloat(r.premioAnterior ?? '0'),
                  diasRestantes,
                };
              }),
            atividadesRecentes: atividadesRecentes.map((d) => ({
              id: d.id,
              tipo: 'venda' as const,
              descricao: `${d.vendedor.nome} criou venda para ${d.cliente.nome || d.cliente.razaoSocial}`,
              data: d.createdAt?.toISOString() ?? new Date().toISOString(),
            })),
            alertasFollowUp: alertasFollowUp.map((c) => {
              const diasParados = Math.floor(
                (now.getTime() -
                  new Date(c.updatedAt ?? Date.now()).getTime()) /
                  (1000 * 60 * 60 * 24),
              );
              return {
                id: c.id,
                numeroCotacao: c.numeroCotacao,
                clienteNome:
                  c.cliente?.nome || c.cliente?.razaoSocial || 'Cliente',
                produto: c.produto?.descricao || 'Produto',
                diasSemMovimento: diasParados,
                ultimaAtualizacao: c.updatedAt?.toISOString() ?? '',
              };
            }),
            tarefasPendentes: tarefasPendentes.map((t) => ({
              id: t.id,
              titulo: t.titulo,
              descricao: t.descricao,
              prioridade: t.prioridade,
              dataVencimento: t.dataVencimento?.toISOString() ?? null,
              entidadeTipo: t.entidadeTipo,
              entidadeId: t.entidadeId,
              createdAt: t.createdAt.toISOString(),
            })),
        });
      } catch (error) {
        console.error('❌ [DASHBOARD] Erro ao carregar dashboard:', error);
        console.error(
          '❌ [DASHBOARD] Stack:',
          error instanceof Error ? error.stack : 'N/A',
        );
        console.error('❌ [DASHBOARD] User context:', {
          userId: request.user?.sub,
          corretoraId: request.corretoraId,
          hasPermissoes: !!request.user?.permissoes,
          permissoesCount: request.user?.permissoes?.length || 0,
        });

        // Re-throw to let error handler deal with it
        throw error;
      }
    },
  );

  // Sales dashboard
  fastify.get(
    '/sales',
    {
      schema: {
        tags: ['Dashboard'],
        summary: 'Dashboard de vendas',
        description:
          'Exibe estatísticas de vendas incluindo vendas novas, ativas, por status e conversão de cotações para um período.',
        ...dashboardDocs.vendas,
      },
      preHandler: [authorize(['relatorios:vendas'])],
    },
    async (request) => {
      const query = periodQuerySchema.parse(request.query);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const dataInicio =
        query.dataInicio || startOfMonth.toISOString().split('T')[0];
      const dataFim = query.dataFim || endOfMonth.toISOString().split('T')[0];

      const baseConditions = [
        eq(documentosVenda.corretoraId, request.corretoraId),
        isNull(documentosVenda.deletedAt),
      ];

      if (!request.user.isAdmin && query.vendedorId) {
        baseConditions.push(eq(documentosVenda.vendedorId, query.vendedorId));
      } else if (!request.user.isAdmin && !request.user.isGestor) {
        baseConditions.push(eq(documentosVenda.vendedorId, request.user.sub));
      }

      // Sales by status
      const salesByStatus = await db
        .select({
          status: documentosVenda.status,
          count: count(),
          totalPremio: sql<string>`COALESCE(SUM(${documentosVenda.premioLiquido}::numeric), 0)`,
          totalComissao: sql<string>`COALESCE(SUM(${documentosVenda.valorComissao}::numeric), 0)`,
        })
        .from(documentosVenda)
        .where(and(...baseConditions))
        .groupBy(documentosVenda.status);

      // New sales this period
      const newSalesConditions = [
        ...baseConditions,
        gte(documentosVenda.createdAt, new Date(dataInicio + 'T00:00:00-03:00')),
        lte(documentosVenda.createdAt, new Date(dataFim + 'T23:59:59.999-03:00')),
      ];

      const newSales = await db
        .select({
          count: count(),
          totalPremio: sql<string>`COALESCE(SUM(${documentosVenda.premioLiquido}::numeric), 0)`,
          totalComissao: sql<string>`COALESCE(SUM(${documentosVenda.valorComissao}::numeric), 0)`,
        })
        .from(documentosVenda)
        .where(and(...newSalesConditions));

      // Active sales (ATIVO status)
      const activeSales = await db
        .select({
          count: count(),
          totalPremio: sql<string>`COALESCE(SUM(${documentosVenda.premioLiquido}::numeric), 0)`,
          totalComissao: sql<string>`COALESCE(SUM(${documentosVenda.valorComissao}::numeric), 0)`,
        })
        .from(documentosVenda)
        .where(and(...baseConditions, eq(documentosVenda.status, 'ATIVO')));

      // Quotations stats
      const cotacoesStats = await db
        .select({
          status: cotacoes.status,
          count: count(),
        })
        .from(cotacoes)
        .where(
          and(
            eq(cotacoes.corretoraId, request.corretoraId),
            isNull(cotacoes.deletedAt),
            gte(cotacoes.createdAt, new Date(dataInicio + 'T00:00:00-03:00')),
            lte(cotacoes.createdAt, new Date(dataFim + 'T23:59:59.999-03:00')),
          ),
        )
        .groupBy(cotacoes.status);

      // Proposals stats
      const propostasStats = await db
        .select({
          status: propostasComerciais.status,
          count: count(),
        })
        .from(propostasComerciais)
        .where(
          and(
            eq(propostasComerciais.corretoraId, request.corretoraId),
            isNull(propostasComerciais.deletedAt),
            gte(propostasComerciais.createdAt, new Date(dataInicio + 'T00:00:00-03:00')),
            lte(propostasComerciais.createdAt, new Date(dataFim + 'T23:59:59.999-03:00')),
          ),
        )
        .groupBy(propostasComerciais.status);

      return ok({
          periodo: {
            dataInicio,
            dataFim,
          },
          vendasNovas: {
            quantidade: Number(newSales[0]?.count ?? 0),
            totalPremio: parseFloat(newSales[0]?.totalPremio ?? '0'),
            totalComissao: parseFloat(newSales[0]?.totalComissao ?? '0'),
          },
          vendasAtivas: {
            quantidade: Number(activeSales[0]?.count ?? 0),
            totalPremio: parseFloat(activeSales[0]?.totalPremio ?? '0'),
            totalComissao: parseFloat(activeSales[0]?.totalComissao ?? '0'),
          },
          vendasPorStatus: salesByStatus.map((s) => ({
            status: s.status,
            quantidade: Number(s.count),
            totalPremio: parseFloat(s.totalPremio),
            totalComissao: parseFloat(s.totalComissao),
          })),
          cotacoes: cotacoesStats.map((c) => ({
            status: c.status,
            quantidade: Number(c.count),
          })),
          propostas: propostasStats.map((p) => ({
            status: p.status,
            quantidade: Number(p.count),
          })),
      });
    },
  );

  // Pipeline dashboard
  fastify.get(
    '/pipeline',
    {
      schema: {
        tags: ['Dashboard'],
        summary: 'Dashboard de pipeline',
        description:
          'Exibe o funil de vendas com etapas do pipeline, valores totais por estágio e taxas de conversão.',
        ...dashboardDocs.pipeline,
      },
      preHandler: [
        authorizeAny([
          'relatorios:vendas',
          'vendas:visualizar_todos_documentos',
        ]),
      ],
    },
    async (request) => {
      const query = periodQuerySchema.parse(request.query);

      const baseConditions = [
        eq(documentosVenda.corretoraId, request.corretoraId),
        isNull(documentosVenda.deletedAt),
      ];

      if (query.vendedorId) {
        baseConditions.push(eq(documentosVenda.vendedorId, query.vendedorId));
      } else if (
        !request.user.isAdmin &&
        !request.user.permissoes.includes('vendas:visualizar_todos_documentos')
      ) {
        baseConditions.push(eq(documentosVenda.vendedorId, request.user.sub));
      }

      // Pipeline stages
      const pipelineStages = [
        'EM_NEGOCIACAO',
        'AGUARDANDO_CLIENTE',
        'AGUARDANDO_APROVACAO',
        'VENDA_CONFIRMADA',
        'AGUARDANDO_CADASTRO',
      ];

      const pipeline = await db
        .select({
          status: documentosVenda.status,
          count: count(),
          totalPremio: sql<string>`COALESCE(SUM(${documentosVenda.premioLiquido}::numeric), 0)`,
        })
        .from(documentosVenda)
        .where(
          and(
            ...baseConditions,
            sql`${documentosVenda.status} = ANY(ARRAY[${sql.join(pipelineStages.map((s) => sql`${s}::status_documento_venda`), sql`, `)}])`,
          ),
        )
        .groupBy(documentosVenda.status);

      // Calculate conversion rates
      const totalCotacoes = await db
        .select({ count: count() })
        .from(cotacoes)
        .where(
          and(
            eq(cotacoes.corretoraId, request.corretoraId),
            isNull(cotacoes.deletedAt),
          ),
        );

      const cotacoesConvertidas = await db
        .select({ count: count() })
        .from(cotacoes)
        .where(
          and(
            eq(cotacoes.corretoraId, request.corretoraId),
            eq(cotacoes.status, 'CONVERTIDA'),
            isNull(cotacoes.deletedAt),
          ),
        );

      const taxaConversaoCotacoes =
        Number(totalCotacoes[0]?.count) > 0
          ? (Number(cotacoesConvertidas[0]?.count) /
              Number(totalCotacoes[0]?.count)) *
            100
          : 0;

      return ok({
          pipeline: pipelineStages.map((stage) => {
            const stageData = pipeline.find((p) => p.status === stage);
            return {
              etapa: stage,
              quantidade: Number(stageData?.count ?? 0),
              valorTotal: parseFloat(stageData?.totalPremio ?? '0'),
            };
          }),
          metricas: {
            taxaConversaoCotacoes:
              Math.round(taxaConversaoCotacoes * 100) / 100,
            totalCotacoes: Number(totalCotacoes[0]?.count ?? 0),
            cotacoesConvertidas: Number(cotacoesConvertidas[0]?.count ?? 0),
          },
      });
    },
  );

  // Renewals dashboard
  fastify.get(
    '/renewals',
    {
      schema: {
        tags: ['Dashboard'],
        summary: 'Dashboard de renovações',
        description:
          'Exibe estatísticas de renovações incluindo renovações vencendo em 30/60 dias, vencidas e por status.',
        ...dashboardDocs.renovacoes,
      },
      preHandler: [authorize(['relatorios:vendas'])],
    },
    async (request) => {
      const query = periodQuerySchema.parse(request.query);

      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

      const baseConditions = [
        eq(renovacoesComerciais.corretoraId, request.corretoraId),
      ];

      if (query.vendedorId) {
        baseConditions.push(
          eq(renovacoesComerciais.vendedorId, query.vendedorId),
        );
      }

      // Renewals by status
      const byStatus = await db
        .select({
          status: renovacoesComerciais.status,
          count: count(),
          totalPremio: sql<string>`COALESCE(SUM(${renovacoesComerciais.premioAnterior}::numeric), 0)`,
        })
        .from(renovacoesComerciais)
        .where(and(...baseConditions))
        .groupBy(renovacoesComerciais.status);

      // Renewals expiring in 30 days
      const expiring30Days = await db
        .select({
          count: count(),
          totalPremio: sql<string>`COALESCE(SUM(${renovacoesComerciais.premioAnterior}::numeric), 0)`,
        })
        .from(renovacoesComerciais)
        .where(
          and(
            ...baseConditions,
            sql`${renovacoesComerciais.status} NOT IN ('RENOVADO', 'PERDIDO', 'CANCELADO')`,
            lte(
              renovacoesComerciais.dataVencimento,
              in30Days.toISOString().split('T')[0],
            ),
          ),
        );

      // Renewals expiring in 60 days
      const expiring60Days = await db
        .select({
          count: count(),
          totalPremio: sql<string>`COALESCE(SUM(${renovacoesComerciais.premioAnterior}::numeric), 0)`,
        })
        .from(renovacoesComerciais)
        .where(
          and(
            ...baseConditions,
            sql`${renovacoesComerciais.status} NOT IN ('RENOVADO', 'PERDIDO', 'CANCELADO')`,
            lte(
              renovacoesComerciais.dataVencimento,
              in60Days.toISOString().split('T')[0],
            ),
          ),
        );

      // Overdue renewals
      const overdue = await db
        .select({
          count: count(),
          totalPremio: sql<string>`COALESCE(SUM(${renovacoesComerciais.premioAnterior}::numeric), 0)`,
        })
        .from(renovacoesComerciais)
        .where(
          and(
            ...baseConditions,
            sql`${renovacoesComerciais.status} NOT IN ('RENOVADO', 'PERDIDO', 'CANCELADO')`,
            lte(
              renovacoesComerciais.dataVencimento,
              now.toISOString().split('T')[0],
            ),
          ),
        );

      return ok({
          porStatus: byStatus.map((s) => ({
            status: s.status,
            quantidade: Number(s.count),
            totalPremio: parseFloat(s.totalPremio),
          })),
          vencendo30Dias: {
            quantidade: Number(expiring30Days[0]?.count ?? 0),
            totalPremio: parseFloat(expiring30Days[0]?.totalPremio ?? '0'),
          },
          vencendo60Dias: {
            quantidade: Number(expiring60Days[0]?.count ?? 0),
            totalPremio: parseFloat(expiring60Days[0]?.totalPremio ?? '0'),
          },
          vencidas: {
            quantidade: Number(overdue[0]?.count ?? 0),
            totalPremio: parseFloat(overdue[0]?.totalPremio ?? '0'),
          },
      });
    },
  );

  // Team dashboard (for managers)
  fastify.get(
    '/team',
    {
      schema: {
        tags: ['Dashboard'],
        summary: 'Dashboard de equipe',
        description:
          'Exibe desempenho de vendedores incluindo vendas do período, vendas ativas, clientes e ranking por prêmio.',
        ...dashboardDocs.equipe,
      },
      preHandler: [authorize(['relatorios:vendas'])],
    },
    async (request) => {
      const query = periodQuerySchema.parse(request.query);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const dataInicio =
        query.dataInicio || startOfMonth.toISOString().split('T')[0];
      const dataFim = query.dataFim || endOfMonth.toISOString().split('T')[0];

      // Get all sellers
      const sellers = (await db.query.usuarios.findMany({
        where: and(
          eq(usuarios.corretoraId, request.corretoraId),
          eq(usuarios.ativo, true),
          isNull(usuarios.deletedAt),
        ),
        with: {
          cargo: true,
        } as any,
      })) as Array<
        typeof usuarios.$inferSelect & {
          cargo: {
            id: string;
            nomeCargo: string;
            isVendedor: boolean;
            isGestor: boolean;
          } | null;
        }
      >;

      const vendedores = sellers.filter((s) => s.cargo?.isVendedor);

      // Get sales per seller
      const salesPerSeller = await Promise.all(
        vendedores.map(async (vendedor) => {
          const sales = await db
            .select({
              count: count(),
              totalPremio: sql<string>`COALESCE(SUM(${documentosVenda.premioLiquido}::numeric), 0)`,
              totalComissao: sql<string>`COALESCE(SUM(${documentosVenda.valorComissao}::numeric), 0)`,
            })
            .from(documentosVenda)
            .where(
              and(
                eq(documentosVenda.corretoraId, request.corretoraId),
                eq(documentosVenda.vendedorId, vendedor.id),
                isNull(documentosVenda.deletedAt),
                gte(documentosVenda.createdAt, new Date(dataInicio + 'T00:00:00-03:00')),
                lte(documentosVenda.createdAt, new Date(dataFim + 'T23:59:59.999-03:00')),
              ),
            );

          const activeSales = await db
            .select({
              count: count(),
              totalPremio: sql<string>`COALESCE(SUM(${documentosVenda.premioLiquido}::numeric), 0)`,
            })
            .from(documentosVenda)
            .where(
              and(
                eq(documentosVenda.corretoraId, request.corretoraId),
                eq(documentosVenda.vendedorId, vendedor.id),
                eq(documentosVenda.status, 'ATIVO'),
                isNull(documentosVenda.deletedAt),
              ),
            );

          const clientCount = await db
            .select({ count: count() })
            .from(clientes)
            .where(
              and(
                eq(clientes.corretoraId, request.corretoraId),
                eq(clientes.vendedorId, vendedor.id),
                isNull(clientes.deletedAt),
              ),
            );

          return {
            vendedor: {
              id: vendedor.id,
              nome: vendedor.nome,
              email: vendedor.email,
            },
            vendasPeriodo: {
              quantidade: Number(sales[0]?.count ?? 0),
              totalPremio: parseFloat(sales[0]?.totalPremio ?? '0'),
              totalComissao: parseFloat(sales[0]?.totalComissao ?? '0'),
            },
            vendasAtivas: {
              quantidade: Number(activeSales[0]?.count ?? 0),
              totalPremio: parseFloat(activeSales[0]?.totalPremio ?? '0'),
            },
            totalClientes: Number(clientCount[0]?.count ?? 0),
          };
        }),
      );

      // Sort by total premium in the period
      salesPerSeller.sort(
        (a, b) => b.vendasPeriodo.totalPremio - a.vendasPeriodo.totalPremio,
      );

      return ok({
          periodo: {
            dataInicio,
            dataFim,
          },
          vendedores: salesPerSeller,
          resumo: {
            totalVendedores: vendedores.length,
            totalVendasPeriodo: salesPerSeller.reduce(
              (acc, v) => acc + v.vendasPeriodo.quantidade,
              0,
            ),
            totalPremioPeriodo: salesPerSeller.reduce(
              (acc, v) => acc + v.vendasPeriodo.totalPremio,
              0,
            ),
            totalComissaoPeriodo: salesPerSeller.reduce(
              (acc, v) => acc + v.vendasPeriodo.totalComissao,
              0,
            ),
          },
      });
    },
  );

  // Renovações vs Convertidos time-series chart
  fastify.get(
    '/renewals-chart',
    {
      schema: {
        tags: ['Dashboard'],
        summary: 'Gráfico renovações vs convertidos',
        description:
          'Retorna série temporal de renovações totais vs convertidas (RENOVADO) agrupadas por semana, mês ou trimestre.',
        ...dashboardDocs.renovacoesChart,
      },
      preHandler: [authorize(['dashboard:visualizar'])],
    },
    async (request) => {
      const { periodo } = request.query as {
        periodo: 'semana' | 'mes' | 'trimestre';
      };
      const userId = request.user.sub;

      let truncExpr: string;
      let monthsBack: number;

      if (periodo === 'semana') {
        truncExpr = 'week';
        monthsBack = 3; // ~12 weeks
      } else if (periodo === 'trimestre') {
        truncExpr = 'quarter';
        monthsBack = 24; // ~8 quarters
      } else {
        truncExpr = 'month';
        monthsBack = 12;
      }

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsBack);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Total renovações por período
      const totalByPeriod = await db
        .select({
          periodo: sql<string>`date_trunc(${sql.raw(`'${truncExpr}'`)}, ${renovacoesComerciais.createdAt})::date`,
          total: count(),
        })
        .from(renovacoesComerciais)
        .where(
          and(
            eq(renovacoesComerciais.corretoraId, request.corretoraId),
            eq(renovacoesComerciais.vendedorId, userId),
            gte(renovacoesComerciais.createdAt, new Date(startDateStr)),
          ),
        )
        .groupBy(
          sql`date_trunc(${sql.raw(`'${truncExpr}'`)}, ${renovacoesComerciais.createdAt})::date`,
        )
        .orderBy(
          sql`date_trunc(${sql.raw(`'${truncExpr}'`)}, ${renovacoesComerciais.createdAt})::date`,
        );

      // Convertidos (RENOVADO) por período
      const convertidosByPeriod = await db
        .select({
          periodo: sql<string>`date_trunc(${sql.raw(`'${truncExpr}'`)}, ${renovacoesComerciais.createdAt})::date`,
          convertidos: count(),
        })
        .from(renovacoesComerciais)
        .where(
          and(
            eq(renovacoesComerciais.corretoraId, request.corretoraId),
            eq(renovacoesComerciais.vendedorId, userId),
            eq(renovacoesComerciais.status, 'RENOVADO'),
            gte(renovacoesComerciais.createdAt, new Date(startDateStr)),
          ),
        )
        .groupBy(
          sql`date_trunc(${sql.raw(`'${truncExpr}'`)}, ${renovacoesComerciais.createdAt})::date`,
        )
        .orderBy(
          sql`date_trunc(${sql.raw(`'${truncExpr}'`)}, ${renovacoesComerciais.createdAt})::date`,
        );

      // Merge results
      const convertidosMap = new Map(
        convertidosByPeriod.map((c) => [c.periodo, Number(c.convertidos)]),
      );

      const chartData = totalByPeriod.map((t) => ({
        date: t.periodo,
        renovacoes: Number(t.total),
        convertidos: convertidosMap.get(t.periodo) || 0,
      }));

      return ok(chartData);
    },
  );

  // Commission report
  fastify.get(
    '/reports/commissions',
    {
      schema: {
        tags: ['Dashboard'],
        summary: 'Relatório de comissões',
        description:
          'Exibe relatório de comissões por vendedor para vendas ativas em um período específico.',
        ...dashboardDocs.relatorioComissoes,
      },
      preHandler: [authorize(['relatorios:comissoes'])],
    },
    async (request) => {
      const query = periodQuerySchema.parse(request.query);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const dataInicio =
        query.dataInicio || startOfMonth.toISOString().split('T')[0];
      const dataFim = query.dataFim || endOfMonth.toISOString().split('T')[0];

      const conditions = [
        eq(documentosVenda.corretoraId, request.corretoraId),
        eq(documentosVenda.status, 'ATIVO'),
        isNull(documentosVenda.deletedAt),
        gte(documentosVenda.createdAt, new Date(dataInicio + 'T00:00:00-03:00')),
        lte(documentosVenda.createdAt, new Date(dataFim + 'T23:59:59.999-03:00')),
      ];

      if (query.vendedorId) {
        conditions.push(eq(documentosVenda.vendedorId, query.vendedorId));
      }

      const commissions = await db
        .select({
          vendedorId: documentosVenda.vendedorId,
          vendedorNome: usuarios.nome,
          count: count(),
          totalPremio: sql<string>`COALESCE(SUM(${documentosVenda.premioLiquido}::numeric), 0)`,
          totalComissao: sql<string>`COALESCE(SUM(${documentosVenda.valorComissao}::numeric), 0)`,
        })
        .from(documentosVenda)
        .innerJoin(usuarios, eq(documentosVenda.vendedorId, usuarios.id))
        .where(and(...conditions))
        .groupBy(documentosVenda.vendedorId, usuarios.nome);

      return ok({
          periodo: {
            dataInicio,
            dataFim,
          },
          comissoes: commissions.map((c) => ({
            vendedor: {
              id: c.vendedorId,
              nome: c.vendedorNome,
            },
            quantidadeVendas: Number(c.count),
            totalPremio: parseFloat(c.totalPremio),
            totalComissao: parseFloat(c.totalComissao),
          })),
          totais: {
            quantidadeVendas: commissions.reduce(
              (acc, c) => acc + Number(c.count),
              0,
            ),
            totalPremio: commissions.reduce(
              (acc, c) => acc + parseFloat(c.totalPremio),
              0,
            ),
            totalComissao: commissions.reduce(
              (acc, c) => acc + parseFloat(c.totalComissao),
              0,
            ),
          },
      });
    },
  );
};

export default dashboardRoutes;
