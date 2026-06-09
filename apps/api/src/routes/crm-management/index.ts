import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, and, sql, isNull, desc, inArray } from 'drizzle-orm';
import { requireGestor, authorizeAny, authorize } from '@ecotech/plugins/authorization';
import { NotFoundError, ValidationError } from '@ecotech/shared/utils';
import {
  overviewQuerySchema,
  criarOportunidadeGestorSchema,
  reatribuirOportunidadeSchema,
  atualizarConfigCrmSchema,
  oportunidadeOverviewSchema,
  vendedorComStatsSchema,
  estatisticasCompletasSchema,
  configCrmResponseSchema,
  resultadoAtualizacaoPrioridadesSchema,
} from './schemas.js';
import {
  standardErrorResponses,
  createDataResponseSchema,
  uuidParamSchema,
  successResponseSchema,
} from '../shared/schemas.js';
import { gestaoCrmDocs } from '../../docs/gestao-crm/schemas.js';
import { ok } from '../../docs/index.js';

const gestaoCrmRoutes: FastifyPluginAsyncZod = async function (fastify) {
  const { db, oportunidades, usuarios, clientes, corretoras } = await import(
    '@ecotech/shared/database'
  );

  fastify.addHook('preHandler', fastify.authenticate);

  // GET /gestao-crm/overview - Visão geral de todas oportunidades (gestores)
  fastify.get(
    '/overview',
    {
      schema: {
        tags: ['Gestão CRM'],
        summary: 'Visão geral de todas oportunidades',
        description:
          'Lista todas as oportunidades da corretora para gestores. Permite filtrar por vendedor específico e status. Retorna dados completos incluindo informações do vendedor e cliente.',
        ...gestaoCrmDocs.overview,
      },
      preHandler: [requireGestor()],
    },
    async (request, reply) => {
      const { vendedorId, status } = request.query as any;

      const conditions = [
        eq(oportunidades.corretoraId, request.corretoraId),
        isNull(oportunidades.deletedAt),
      ];

      // Filtrar por vendedor específico se fornecido
      if (vendedorId) {
        conditions.push(eq(oportunidades.vendedorId, vendedorId));
      }

      // Filtrar por status se fornecido
      if (status) {
        conditions.push(eq(oportunidades.status, status));
      }

      const results = await db.query.oportunidades.findMany({
        where: and(...conditions),
        with: {
          vendedor: {
            columns: {
              id: true,
              nome: true,
              email: true,
            },
          },
          cliente: {
            columns: {
              id: true,
              nome: true,
              razaoSocial: true,
              tipoPessoa: true,
            },
          },
        } as any,
        orderBy: [desc(oportunidades.createdAt)],
      });

      return reply.send(ok(results as any));
    },
  );

  // GET /gestao-crm/vendedores - Listar vendedores com suas estatísticas
  fastify.get(
    '/sellers',
    {
      schema: {
        tags: ['Gestão CRM'],
        summary: 'Listar vendedores com estatísticas',
        description:
          'Lista todos os vendedores ativos da corretora com suas estatísticas de oportunidades: total, por status, valores, taxa de conversão. Útil para dashboards gerenciais e análise de performance.',
        ...gestaoCrmDocs.vendedores,
      },
      preHandler: [authorize(['kanban:visualizar_todas'])],
    },
    async (request, reply) => {
      // Buscar todos os usuários ativos da corretora
      const vendedores = await db.query.usuarios.findMany({
        where: and(
          eq(usuarios.corretoraId, request.corretoraId),
          isNull(usuarios.deletedAt),
        ),
        columns: {
          id: true,
          nome: true,
          email: true,
          avatarUrl: true,
        },
      });

      const statsRows = vendedores.length > 0
        ? await db
            .select({
              vendedorId: oportunidades.vendedorId,
              total: sql<number>`COUNT(*)`,
              leads: sql<number>`COUNT(CASE WHEN ${oportunidades.status} = 'lead' THEN 1 END)`,
              contatoInicial: sql<number>`COUNT(CASE WHEN ${oportunidades.status} = 'contato_inicial' THEN 1 END)`,
              negociacao: sql<number>`COUNT(CASE WHEN ${oportunidades.status} = 'negociacao' THEN 1 END)`,
              ganhas: sql<number>`COUNT(CASE WHEN ${oportunidades.status} = 'ganha' THEN 1 END)`,
              perdidas: sql<number>`COUNT(CASE WHEN ${oportunidades.status} = 'perdida' THEN 1 END)`,
              valorTotal: sql<number>`COALESCE(SUM(CASE WHEN ${oportunidades.status} = 'ganha' THEN ${oportunidades.valorFechado} ELSE 0 END), 0)`,
              valorEstimado: sql<number>`COALESCE(SUM(CASE WHEN ${oportunidades.status} NOT IN ('ganha', 'perdida') THEN ${oportunidades.premioEstimado} ELSE 0 END), 0)`,
            })
            .from(oportunidades)
            .where(
              and(
                eq(oportunidades.corretoraId, request.corretoraId),
                inArray(oportunidades.vendedorId, vendedores.map((v) => v.id)),
                isNull(oportunidades.deletedAt),
              ),
            )
            .groupBy(oportunidades.vendedorId)
        : [];

      const statsMap = new Map(statsRows.map((s) => [s.vendedorId, s]));

      const vendedoresComStats = vendedores.map((vendedor) => {
        const s = statsMap.get(vendedor.id);
        const total = Number(s?.total ?? 0);
        const ganhas = Number(s?.ganhas ?? 0);
        return {
          id: vendedor.id,
          nome: vendedor.nome,
          email: vendedor.email,
          avatarUrl: vendedor.avatarUrl ?? null,
          stats: {
            total,
            leads: Number(s?.leads ?? 0),
            contatoInicial: Number(s?.contatoInicial ?? 0),
            negociacao: Number(s?.negociacao ?? 0),
            ganhas,
            perdidas: Number(s?.perdidas ?? 0),
            valorTotal: Number(s?.valorTotal ?? 0),
            valorEstimado: Number(s?.valorEstimado ?? 0),
            taxaConversao: total > 0 ? (ganhas / total) * 100 : 0,
          },
        };
      });

      reply.header('Cache-Control', 'private, max-age=120');
      return reply.send(ok(vendedoresComStats));
    },
  );

  // POST /gestao-crm/oportunidades - Criar oportunidade para outro vendedor
  fastify.post(
    '/opportunities',
    {
      schema: {
        tags: ['Gestão CRM'],
        summary: 'Criar oportunidade para vendedor',
        description:
          'Permite ao gestor criar uma nova oportunidade e atribuí-la diretamente a um vendedor específico. Calcula prioridade automaticamente se configurado. Envia notificação ao vendedor atribuído.',
        ...gestaoCrmDocs.criarOportunidade,
      },
      preHandler: [requireGestor()],
    },
    async (request, reply) => {
      const dados = request.body as any;

      if (!dados.vendedorId) {
        throw new ValidationError('vendedorId é obrigatório');
      }

      // Verificar se o vendedor existe e pertence à mesma corretora
      const vendedor = await db.query.usuarios.findFirst({
        where: and(
          eq(usuarios.id, dados.vendedorId),
          eq(usuarios.corretoraId, request.corretoraId),
          isNull(usuarios.deletedAt),
        ),
      });

      if (!vendedor) {
        throw new NotFoundError('Vendedor não encontrado');
      }

      // Buscar maior ordem para o status
      const [maxOrdem] = await db
        .select({
          maxOrdem: sql<number>`COALESCE(MAX(${oportunidades.ordem}), 0)`,
        })
        .from(oportunidades)
        .where(
          and(
            eq(oportunidades.corretoraId, request.corretoraId),
            eq(oportunidades.status, dados.status || 'lead'),
          ),
        );

      // Calcular prioridade automaticamente se configurado
      let prioridadeCalculada = 'baixa'; // Default

      const seguradora = await db.query.corretoras.findFirst({
        where: eq(corretoras.id, request.corretoraId),
        columns: {
          configCrm: true,
        },
      });

      const config = seguradora?.configCrm?.prioridadeAutomatica;
      if (config && config.habilitado) {
        // Nova oportunidade = 0 dias sem contato
        const { calculatePriority } = await import(
          '../../utils/oportunidade-automation.js'
        );
        prioridadeCalculada = calculatePriority(0, config);
      }

      const [novaOportunidade] = await db
        .insert(oportunidades)
        .values({
          corretoraId: request.corretoraId,
          vendedorId: dados.vendedorId,
          vendedorOriginalId: request.user.sub, // Gestor que está criando
          nomeCliente: dados.nomeCliente,
          emailCliente: dados.emailCliente,
          telefoneCliente: dados.telefoneCliente,
          clienteId: dados.clienteId,
          status: dados.status || 'lead',
          prioridade: prioridadeCalculada as any,
          temperatura: dados.temperatura || 'morno',
          premioEstimado: dados.premioEstimado,
          dataVencimento: dados.dataVencimento
            ? new Date(dados.dataVencimento)
            : undefined,
          observacoes: dados.observacoes,
          tags: dados.tags || [],
          origem: dados.origem || 'gestor',
          ordem: maxOrdem.maxOrdem + 1,
        })
        .returning();

      return reply.code(201).send(ok(novaOportunidade as any));
    },
  );

  // PATCH /gestao-crm/oportunidades/:id/reatribuir - Reatribuir oportunidade para outro vendedor
  fastify.patch(
    '/opportunities/:id/reassign',
    {
      schema: {
        tags: ['Gestão CRM'],
        summary: 'Reatribuir oportunidade para outro vendedor',
        description:
          'Permite ao gestor transferir uma oportunidade de um vendedor para outro. Envia notificação automática ao novo vendedor informando sobre a reatribuição.',
        ...gestaoCrmDocs.reatribuirOportunidade,
      },
      preHandler: [requireGestor()],
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const { novoVendedorId } = request.body as any;

      if (!novoVendedorId) {
        throw new ValidationError('novoVendedorId é obrigatório');
      }

      // Verificar se a oportunidade existe
      const oportunidadeAtual = await db.query.oportunidades.findFirst({
        where: and(
          eq(oportunidades.id, id),
          eq(oportunidades.corretoraId, request.corretoraId),
          isNull(oportunidades.deletedAt),
        ),
        with: {
          vendedor: {
            columns: {
              id: true,
              nome: true,
            },
          },
        } as any,
      });

      if (!oportunidadeAtual) {
        throw new NotFoundError('Oportunidade não encontrada');
      }

      // Verificar se o novo vendedor existe
      const novoVendedor = await db.query.usuarios.findFirst({
        where: and(
          eq(usuarios.id, novoVendedorId),
          eq(usuarios.corretoraId, request.corretoraId),
          isNull(usuarios.deletedAt),
        ),
      });

      if (!novoVendedor) {
        throw new NotFoundError('Novo vendedor não encontrado');
      }

      // Atualizar oportunidade
      const [atualizada] = await db
        .update(oportunidades)
        .set({
          vendedorId: novoVendedorId,
          updatedAt: new Date(),
        })
        .where(eq(oportunidades.id, id))
        .returning();

      return reply.send(ok(atualizada as any));
    },
  );

  // GET /gestao-crm/estatisticas - Estatísticas gerais do CRM
  fastify.get(
    '/statistics',
    {
      schema: {
        tags: ['Gestão CRM'],
        summary: 'Estatísticas gerais do CRM',
        description:
          'Retorna estatísticas consolidadas do CRM: totais por status, valores ganhos, valores em negociação, taxa de conversão, distribuição por prioridade e temperatura. Dashboard executivo completo.',
        ...gestaoCrmDocs.estatisticas,
      },
      preHandler: [requireGestor()],
    },
    async (request, reply) => {
      // Estatísticas gerais
      const [stats] = await db
        .select({
          totalOportunidades: sql<number>`COUNT(*)`,
          totalLeads: sql<number>`COUNT(CASE WHEN ${oportunidades.status} = 'lead' THEN 1 END)`,
          totalContatoInicial: sql<number>`COUNT(CASE WHEN ${oportunidades.status} = 'contato_inicial' THEN 1 END)`,
          totalNegociacao: sql<number>`COUNT(CASE WHEN ${oportunidades.status} = 'negociacao' THEN 1 END)`,
          totalGanhas: sql<number>`COUNT(CASE WHEN ${oportunidades.status} = 'ganha' THEN 1 END)`,
          totalPerdidas: sql<number>`COUNT(CASE WHEN ${oportunidades.status} = 'perdida' THEN 1 END)`,
          valorTotalGanho: sql<number>`COALESCE(SUM(CASE WHEN ${oportunidades.status} = 'ganha' THEN ${oportunidades.valorFechado} ELSE 0 END), 0)`,
          valorEmNegociacao: sql<number>`COALESCE(SUM(CASE WHEN ${oportunidades.status} IN ('contato_inicial', 'negociacao') THEN ${oportunidades.premioEstimado} ELSE 0 END), 0)`,
        })
        .from(oportunidades)
        .where(
          and(
            eq(oportunidades.corretoraId, request.corretoraId),
            isNull(oportunidades.deletedAt),
          ),
        );

      // Distribuição por prioridade
      const distribuicaoPrioridade = await db
        .select({
          prioridade: oportunidades.prioridade,
          count: sql<number>`COUNT(*)`,
        })
        .from(oportunidades)
        .where(
          and(
            eq(oportunidades.corretoraId, request.corretoraId),
            isNull(oportunidades.deletedAt),
            sql`${oportunidades.status} NOT IN ('ganha', 'perdida')`,
          ),
        )
        .groupBy(oportunidades.prioridade);

      // Distribuição por temperatura
      const distribuicaoTemperatura = await db
        .select({
          temperatura: oportunidades.temperatura,
          count: sql<number>`COUNT(*)`,
        })
        .from(oportunidades)
        .where(
          and(
            eq(oportunidades.corretoraId, request.corretoraId),
            isNull(oportunidades.deletedAt),
            sql`${oportunidades.status} NOT IN ('ganha', 'perdida')`,
          ),
        )
        .groupBy(oportunidades.temperatura);

      return reply.send(ok({
        geral: {
          totalOportunidades: Number(stats.totalOportunidades),
          totalLeads: Number(stats.totalLeads),
          totalPropostas: Number((stats as any).totalPropostas ?? 0),
          totalNegociacao: Number(stats.totalNegociacao),
          totalGanhas: Number(stats.totalGanhas),
          totalPerdidas: Number(stats.totalPerdidas),
          valorTotalGanho: Number(stats.valorTotalGanho),
          valorEmNegociacao: Number(stats.valorEmNegociacao),
          taxaConversao:
            stats.totalOportunidades > 0
              ? (Number(stats.totalGanhas) /
                  Number(stats.totalOportunidades)) *
                100
              : 0,
        },
        prioridade: distribuicaoPrioridade.map((item) => ({
          prioridade: item.prioridade,
          count: Number(item.count),
        })),
        temperatura: distribuicaoTemperatura.map((item) => ({
          temperatura: item.temperatura,
          count: Number(item.count),
        })),
      }));
    },
  );

  // DELETE /gestao-crm/oportunidades/:id - Deletar qualquer oportunidade (gestor)
  fastify.delete(
    '/opportunities/:id',
    {
      schema: {
        tags: ['Gestão CRM'],
        summary: 'Deletar oportunidade',
        description:
          'Permite ao gestor fazer soft delete de qualquer oportunidade da corretora. A oportunidade é marcada como deletada mas mantida no banco para auditoria.',
        ...gestaoCrmDocs.excluirOportunidade,
      },
      preHandler: [requireGestor()],
    },
    async (request, reply) => {
      const { id } = request.params as any;

      const [deletada] = await db
        .update(oportunidades)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(oportunidades.id, id),
            eq(oportunidades.corretoraId, request.corretoraId),
          ),
        )
        .returning();

      if (!deletada) {
        throw new NotFoundError('Oportunidade não encontrada');
      }

      return reply.code(204).send({});
    },
  );

  // GET /gestao-crm/config - Buscar configurações do CRM
  fastify.get(
    '/config',
    {
      schema: {
        tags: ['Gestão CRM'],
        summary: 'Obter configurações do CRM',
        description:
          'Retorna as configurações atuais do CRM da corretora, incluindo configuração de prioridade automática baseada em dias sem contato. Retorna valores padrão se não houver configuração.',
        ...gestaoCrmDocs.config,
      },
      preHandler: [requireGestor()],
    },
    async (request, reply) => {
      const seguradora = await db.query.corretoras.findFirst({
        where: eq(corretoras.id, request.corretoraId),
        columns: {
          configCrm: true,
        },
      });

      // Valores padrão se não houver configuração
      const configPadrao = {
        prioridadeAutomatica: {
          habilitado: false,
          diasBaixa: 2,
          diasMedia: 5,
          diasAlta: 10,
          diasUrgente: 15,
        },
      };

      return reply.send(ok(seguradora?.configCrm || configPadrao));
    },
  );

  // PATCH /gestao-crm/config - Atualizar configurações do CRM
  fastify.patch(
    '/config',
    {
      schema: {
        tags: ['Gestão CRM'],
        summary: 'Atualizar configurações do CRM',
        description:
          'Atualiza as configurações do CRM, incluindo prioridade automática. Valida que os dias estão em ordem crescente (quanto mais dias sem contato, mais urgente). Aplica regras de negócio para consistência.',
        ...gestaoCrmDocs.atualizarConfig,
      },
      preHandler: [requireGestor()],
    },
    async (request, reply) => {
      const dados = request.body as any;

      // Validar dados de prioridade automática
      if (dados.prioridadeAutomatica) {
        const { diasBaixa, diasMedia, diasAlta, diasUrgente } =
          dados.prioridadeAutomatica;

        // Validar que os dias estão em ordem crescente (baixa < media < alta < urgente)
        // Quanto mais dias, mais urgente
        if (
          diasBaixa >= diasMedia ||
          diasMedia >= diasAlta ||
          diasAlta >= diasUrgente
        ) {
          throw new ValidationError(
            'Os dias devem estar em ordem crescente: Baixa < Média < Alta < Urgente (quanto mais dias, mais urgente)',
          );
        }

        // Validar que todos os valores são positivos
        if (diasUrgente < 1 || diasAlta < 1 || diasMedia < 1 || diasBaixa < 1) {
          throw new ValidationError('Todos os valores de dias devem ser maiores que zero');
        }
      }

      // Buscar configuração atual
      const seguradora = await db.query.corretoras.findFirst({
        where: eq(corretoras.id, request.corretoraId),
        columns: {
          configCrm: true,
        },
      });

      // Mesclar configuração existente com novos dados
      const configAtual = seguradora?.configCrm || {};
      const novaConfig = {
        ...configAtual,
        ...dados,
      };

      const [atualizada] = await db
        .update(corretoras)
        .set({
          configCrm: novaConfig,
          updatedAt: new Date(),
        })
        .where(eq(corretoras.id, request.corretoraId))
        .returning({
          configCrm: corretoras.configCrm,
        });

      return reply.send(ok(atualizada.configCrm));
    },
  );

  // POST /gestao-crm/atualizar-prioridades - Executar atualização de prioridades automáticas
  fastify.post(
    '/update-priorities',
    {
      schema: {
        tags: ['Gestão CRM'],
        summary: 'Executar atualização de prioridades automáticas',
        description:
          'Executa manualmente o processo de atualização de prioridades baseado em dias sem contato. Útil para forçar recálculo após alteração de configurações. Requer prioridade automática habilitada.',
        ...gestaoCrmDocs.atualizarPrioridades,
      },
      preHandler: [requireGestor()],
    },
    async (request, reply) => {
      const { updateAutomaticPriorities } = await import(
        '../../utils/oportunidade-automation.js'
      );

      const resultado = await updateAutomaticPriorities(
        request.corretoraId,
      );

      const normalizado = {
        updated: resultado.updated,
        total: 'total' in resultado ? (resultado as any).total as number : undefined,
        skipped: 'skipped' in resultado ? (resultado as any).skipped as boolean : undefined,
      };

      if (normalizado.skipped) {
        return reply.send({
          success: true as const,
          message:
            'Prioridade automática está desabilitada. Habilite nas configurações.',
          data: normalizado,
        });
      }

      return reply.send({
        success: true as const,
        message: `${normalizado.updated} oportunidades atualizadas de ${normalizado.total} total`,
        data: normalizado,
      });
    },
  );
};

export default gestaoCrmRoutes;
