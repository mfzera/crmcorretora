import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq, and, sql, isNull, inArray, or, desc } from 'drizzle-orm';
import { authorize, authorizeAny } from '@ecotech/plugins/authorization';
import { z } from 'zod';
import {
  getPaginationParams,
  createPaginatedResult,
} from '@ecotech/shared/utils';
import { withCacheGeneric, getAvatarUrl } from '../../utils/cache.js';
import { workspaceDocs } from '../../docs/workspace/schemas.js';
import { ok } from '../../docs/index.js';

const paginationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).optional(),
});

const workspaceRoutes: FastifyPluginAsyncZod = async function (fastify) {
  const {
    db,
    renovacoesComerciais,
    cotacoes,
    propostasComerciais,
    documentosVenda,
    historicoDocumentoVenda,
    endossos,
    clientes,
    produtos,
    usuarios,
    equipes,
  } = await import('@ecotech/shared/database');

  fastify.addHook('preHandler', fastify.authenticate);

  // Get workspace summary
  fastify.get(
    '/summary',
    {
      schema: {
        tags: ['Workspace'],
        summary: 'Resumo da área de trabalho',
        description:
          'Exibe resumo da área de trabalho incluindo estatísticas e itens pendentes.',
        ...workspaceDocs.resumo,
      },
      preHandler: [authorize(['workspace:acessar'])],
    },
    async (request) => {
      const query = paginationQuerySchema.parse(request.query);
      const { offset, limit, page } = getPaginationParams(query);

      const cacheKey = `workspace:resumo:${request.corretoraId}:${request.user.sub}:p${page}:l${limit}`;
      return withCacheGeneric(cacheKey, 60, async () => {

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Resolver IDs relevantes: se gestor, incluir membros da equipe
      let vendedorIds = [request.user.sub];
      if (request.user.isGestor) {
        // Buscar equipe liderada
        const equipeLiderada = await db.query.equipes.findFirst({
          where: and(
            eq(equipes.corretoraId, request.corretoraId),
            eq(equipes.gestorId, request.user.sub),
            isNull(equipes.deletedAt),
          ),
          columns: { id: true },
        });
        if (equipeLiderada) {
          const membros = await db.query.usuarios.findMany({
            where: and(
              eq(usuarios.equipeId, equipeLiderada.id),
              isNull(usuarios.deletedAt),
              eq(usuarios.ativo, true),
            ),
            columns: { id: true },
          });
          const membroIds = membros.map((m) => m.id);
          vendedorIds = [...new Set([request.user.sub, ...membroIds])];
        }
      }

      // Get renovacoes pendentes (próximas a vencer)
      const expiryDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

      const renovacoesConditions = and(
        eq(renovacoesComerciais.corretoraId, request.corretoraId),
        vendedorIds.length > 1
          ? or(inArray(renovacoesComerciais.vendedorId, vendedorIds), inArray(renovacoesComerciais.vendedorSecundarioAnteriorId, vendedorIds))
          : or(eq(renovacoesComerciais.vendedorId, request.user.sub), eq(renovacoesComerciais.vendedorSecundarioAnteriorId, request.user.sub)),
        inArray(renovacoesComerciais.status, [
          'NAO_TRABALHADO',
          'EM_PROSPECCAO',
          'EM_NEGOCIACAO',
          'AGUARDANDO_CLIENTE',
        ]),
        sql`${renovacoesComerciais.dataVencimento} <= ${expiryDate.toISOString().slice(0, 10)}`,
      );

      const [renovacoesPendentes, renovacoesCount] = await Promise.all([
        db.query.renovacoesComerciais.findMany({
          where: renovacoesConditions,
          with: {
            produto: {
              columns: { id: true, nomeProduto: true, tipoSeguro: true },
            },
            vendedor: {
              columns: {
                id: true,
                nome: true,
                email: true,
              },
            },
            documentoVendaAnterior: {
              with: {
                cliente: {
                  columns: {
                    id: true,
                    nome: true,
                    razaoSocial: true,
                    tipoPessoa: true,
                  },
                },
                produto: {
                  columns: {
                    id: true,
                    nomeProduto: true,
                  },
                },
                vendedor: {
                  columns: {
                    id: true,
                    nome: true,
                    email: true,
                  },
                },
                seguradoraParceira: {
                  columns: {
                    id: true,
                    razaoSocial: true,
                    nomeFantasia: true,
                  },
                },
              },
            },
          },
          limit,
          offset,
          orderBy: (r, { asc }) => [asc(r.dataVencimento)],
        }),
        db
          .select({ count: sql<number>`count(*)` })
          .from(renovacoesComerciais)
          .where(renovacoesConditions),
      ]);

      // Get cotações ativas — se tem atuante, só aparece para o atuante; sem atuante, para o vendedor
      const cotacoesConditions = and(
        eq(cotacoes.corretoraId, request.corretoraId),
        or(
          and(isNull(cotacoes.atuanteId), eq(cotacoes.vendedorId, request.user.sub)),
          eq(cotacoes.atuanteId, request.user.sub),
        ),
        isNull(cotacoes.deletedAt),
        eq(cotacoes.status, 'EM_ELABORACAO'),
      );

      const [cotacoesAtivas, cotacoesCount] = await Promise.all([
        db.query.cotacoes.findMany({
          where: cotacoesConditions,
          with: {
            cliente: {
              columns: {
                id: true,
                nome: true,
                razaoSocial: true,
                tipoPessoa: true,
              },
            },
            produto: {
              columns: {
                id: true,
                nomeProduto: true,
              },
            },
            seguradoraParceira: {
              columns: {
                id: true,
                razaoSocial: true,
                nomeFantasia: true,
              },
            },
            documentoVenda: {
              columns: {
                id: true,
                status: true,
                motivoRejeicao: true,
                dataRejeicaoCadastro: true,
              },
            },
          },
          limit,
          offset,
          orderBy: (c, { desc }) => [desc(c.createdAt)],
        }),
        db
          .select({ count: sql<number>`count(*)` })
          .from(cotacoes)
          .where(cotacoesConditions),
      ]);

      // Get propostas ativas
      const propostasConditions = and(
        eq(propostasComerciais.corretoraId, request.corretoraId),
        vendedorIds.length > 1
          ? inArray(propostasComerciais.vendedorId, vendedorIds)
          : eq(propostasComerciais.vendedorId, request.user.sub),
        isNull(propostasComerciais.deletedAt),
        inArray(propostasComerciais.status, [
          'AGUARDANDO_ENVIO',
          'ENVIADA',
          'EM_ANALISE',
          'PENDENTE_DOCUMENTACAO',
          'APROVADA',
        ]),
      );

      const [propostasAtivas, propostasCount] = await Promise.all([
        db.query.propostasComerciais.findMany({
          where: propostasConditions,
          with: {
            cliente: {
              columns: {
                id: true,
                nome: true,
                razaoSocial: true,
                tipoPessoa: true,
              },
            },
            produto: {
              columns: {
                id: true,
                nomeProduto: true,
              },
            },
            seguradoraParceira: {
              columns: {
                id: true,
                razaoSocial: true,
                nomeFantasia: true,
              },
            },
          },
          limit,
          offset,
          orderBy: (p, { desc }) => [desc(p.createdAt)],
        }),
        db
          .select({ count: sql<number>`count(*)` })
          .from(propostasComerciais)
          .where(propostasConditions),
      ]);

      // Get vendas do mês atual
      const vendasMes = await db
        .select({
          totalPremio: sql<string>`COALESCE(SUM(${documentosVenda.premioLiquido}::numeric), 0)`,
        })
        .from(documentosVenda)
        .where(
          and(
            eq(documentosVenda.corretoraId, request.corretoraId),
            isNull(documentosVenda.deletedAt),
            sql`${documentosVenda.createdAt} >= ${startOfMonth}`,
            sql`${documentosVenda.createdAt} <= ${endOfMonth}`,
          ),
        );

      // Get endossos pendentes
      const [endossosPendentesCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(endossos)
        .where(
          and(
            eq(endossos.corretoraId, request.corretoraId),
            isNull(endossos.deletedAt),
            eq(endossos.status, 'SOLICITADO'),
          ),
        );

      // Get documentos cancelados no mês
      const [canceladosMesCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(documentosVenda)
        .where(
          and(
            eq(documentosVenda.corretoraId, request.corretoraId),
            isNull(documentosVenda.deletedAt),
            eq(documentosVenda.status, 'CANCELADO'),
            sql`${documentosVenda.dataCancelamento} >= ${startOfMonth}`,
            sql`${documentosVenda.dataCancelamento} <= ${endOfMonth}`,
          ),
        );

      const totalRenovacoes = Number(renovacoesCount[0]?.count ?? 0);
      const totalCotacoes = Number(cotacoesCount[0]?.count ?? 0);
      const totalPropostas = Number(propostasCount[0]?.count ?? 0);

      // Estatísticas
      const estatisticas = {
        totalRenovacoesPendentes: totalRenovacoes,
        totalCotacoesAtivas: totalCotacoes,
        totalPropostasAtivas: totalPropostas,
        totalEndossosPendentes: Number(endossosPendentesCount?.count ?? 0),
        totalCanceladosMes: Number(canceladosMesCount?.count ?? 0),
        metaMensal: 50000, // Valor fixo por enquanto - pode ser configurável depois
        vendidoMes: parseFloat(vendasMes[0]?.totalPremio ?? '0'),
      };

      return ok({
        estatisticas,
        ...createPaginatedResult(
          renovacoesPendentes,
          totalRenovacoes,
          page,
          limit,
        ),
        renovacoes: renovacoesPendentes,
        cotacoes: cotacoesAtivas,
        propostas: propostasAtivas,
      });
      }); // fecha withCacheGeneric
    },
  );

  // Get endorsements awaiting approval
  fastify.get(
    '/endorsements',
    {
      schema: {
        tags: ['Workspace'],
        summary: 'Listar endossos aguardando aprovação',
        description:
          'Retorna endossos com status SOLICITADO aguardando aprovação do cadastro.',
        ...workspaceDocs.endossos,
      },
      preHandler: [authorizeAny(['workspace:acessar', 'cadastro:acessar'])],
    },
    async (request) => {
      const query = paginationQuerySchema.parse(request.query);
      const { offset, limit, page } = getPaginationParams(query);

      const podVerTodos =
        request.user.isAdmin || request.user.permissoes.includes('vendas:aprovar_endosso');

      const endossosConditions = and(
        eq(endossos.corretoraId, request.corretoraId),
        isNull(endossos.deletedAt),
        eq(endossos.status, 'SOLICITADO'),
        podVerTodos ? undefined : eq(endossos.vendedorId, request.user.sub),
      );

      const [endossosPendentes, countResult] = await Promise.all([
        db.query.endossos.findMany({
          where: endossosConditions,
          with: {
            documentoVenda: {
              columns: {
                id: true,
                numeroDocumento: true,
                numeroApoliceExterna: true,
              },
              with: {
                cliente: {
                  columns: {
                    id: true,
                    nome: true,
                    razaoSocial: true,
                    tipoPessoa: true,
                  },
                },
                produto: {
                  columns: {
                    id: true,
                    nomeProduto: true,
                  },
                },
              },
            },
            vendedor: {
              columns: {
                id: true,
                nome: true,
              },
            },
          },
          limit,
          offset,
          orderBy: (e, { desc }) => [desc(e.createdAt)],
        }),
        db
          .select({ count: sql<number>`count(*)` })
          .from(endossos)
          .where(endossosConditions),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      const pagedEndossos = createPaginatedResult(endossosPendentes, total, page, limit);
      return { success: true as const, data: pagedEndossos.data, meta: pagedEndossos.meta };
    },
  );

  // Get team workspace (renovacoes + cotacoes de toda a equipe)
  fastify.get(
    '/team',
    {
      schema: {
        tags: ['Workspace'],
        summary: 'Visão de equipe',
        description:
          'Retorna renovações pendentes e cotações ativas de todos os membros da equipe do usuário logado.',
        ...workspaceDocs.equipe,
      },
      preHandler: [authorize(['workspace:acessar'])],
    },
    async (request) => {
      const cacheKey = `workspace:team:${request.corretoraId}:${request.user.sub}`;
      const result = await withCacheGeneric(cacheKey, 60, async () => {
      const { db, usuarios, equipes, renovacoesComerciais, cotacoes } =
        await import('@ecotech/shared/database');

      // Buscar equipeId do usuário atual
      const usuarioAtual = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, request.user.sub),
        columns: { id: true, equipeId: true },
      });

      // Descobrir o equipeId relevante:
      // - se o usuário é gestor, busca equipe onde equipes.gestorId == user.sub
      // - senão usa o equipeId do próprio usuário
      let equipeId: string | null = usuarioAtual?.equipeId ?? null;

      if (!equipeId) {
        // Pode ser gestor sem equipeId no próprio registro — busca pela tabela equipes
        const equipeLiderada = await db.query.equipes.findFirst({
          where: and(
            eq(equipes.corretoraId, request.corretoraId),
            eq(equipes.gestorId, request.user.sub),
            isNull(equipes.deletedAt),
          ),
          columns: { id: true },
        });
        equipeId = equipeLiderada?.id ?? null;
      }

      if (!equipeId) {
        return { renovacoesPendentes: [], renovacoesVencidas: [], cotacoes: [], membros: [] };
      }

      // Buscar todos os membros da equipe (quem tem equipeId == equipeId)
      const membrosEquipe = await db.query.usuarios.findMany({
        where: and(
          eq(usuarios.corretoraId, request.corretoraId),
          eq(usuarios.equipeId, equipeId),
          isNull(usuarios.deletedAt),
          eq(usuarios.ativo, true),
        ),
        columns: { id: true, nome: true, avatarR2Key: true },
      });

      // Incluir o gestor da equipe se não for membro registrado
      const equipe = await db.query.equipes.findFirst({
        where: eq(equipes.id, equipeId),
        columns: { gestorId: true },
      });

      let membroIds = membrosEquipe.map((u) => u.id);
      const membrosRaw: { id: string; nome: string; avatarR2Key: string | null }[] = [...membrosEquipe];

      if (equipe?.gestorId && !membroIds.includes(equipe.gestorId)) {
        const gestor = await db.query.usuarios.findFirst({
          where: eq(usuarios.id, equipe.gestorId),
          columns: { id: true, nome: true, avatarR2Key: true },
        });
        if (gestor) {
          membrosRaw.push(gestor);
          membroIds.push(gestor.id);
        }
      }

      // Incluir o próprio usuário se não estiver na lista
      if (!membroIds.includes(request.user.sub)) {
        const usuarioSelf = await db.query.usuarios.findFirst({
          where: eq(usuarios.id, request.user.sub),
          columns: { id: true, nome: true, avatarR2Key: true },
        });
        if (usuarioSelf) {
          membrosRaw.push(usuarioSelf);
          membroIds.push(usuarioSelf.id);
        }
      }

      // Gerar URLs assinadas para todos os membros em paralelo (com cache Redis 2h)
      const membros = await Promise.all(
        membrosRaw.map(async (m) => ({
          id: m.id,
          nome: m.nome,
          avatarUrl: await getAvatarUrl(m.avatarR2Key),
        })),
      );

      if (membroIds.length === 0) {
        return { renovacoesPendentes: [], renovacoesVencidas: [], cotacoes: [], membros: [] };
      }

      const now = new Date();
      const expiryDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

      const statusCondition = inArray(renovacoesComerciais.status, [
        'NAO_TRABALHADO',
        'EM_PROSPECCAO',
        'EM_NEGOCIACAO',
        'AGUARDANDO_CLIENTE',
      ]);
      const today = now.toISOString().slice(0, 10);

      const renovacoesPendentesConditions = and(
        eq(renovacoesComerciais.corretoraId, request.corretoraId),
        or(inArray(renovacoesComerciais.vendedorId, membroIds), inArray(renovacoesComerciais.vendedorSecundarioAnteriorId, membroIds)),
        statusCondition,
        sql`${renovacoesComerciais.dataVencimento} >= ${today}`,
        sql`${renovacoesComerciais.dataVencimento} <= ${expiryDate.toISOString().slice(0, 10)}`,
      );

      const renovacoesVencidasConditions = and(
        eq(renovacoesComerciais.corretoraId, request.corretoraId),
        or(inArray(renovacoesComerciais.vendedorId, membroIds), inArray(renovacoesComerciais.vendedorSecundarioAnteriorId, membroIds)),
        statusCondition,
        sql`${renovacoesComerciais.dataVencimento} < ${today}`,
      );

      const cotacoesConditions = and(
        eq(cotacoes.corretoraId, request.corretoraId),
        or(
          and(isNull(cotacoes.atuanteId), inArray(cotacoes.vendedorId, membroIds)),
          inArray(cotacoes.atuanteId, membroIds),
        ),
        isNull(cotacoes.deletedAt),
        eq(cotacoes.status, 'EM_ELABORACAO'),
      );

      // Mapa userId → avatarUrl assinada (já gerado acima)
      const avatarMap = new Map(membros.map((m) => [m.id, m.avatarUrl]));

      const renovacaoWith = {
        produto: {
          columns: { id: true, nomeProduto: true, tipoSeguro: true } as const,
        },
        vendedor: {
          columns: { id: true, nome: true, email: true, avatarR2Key: true } as const,
        },
        cliente: {
          columns: {
            id: true,
            nome: true,
            razaoSocial: true,
            nomeFantasia: true,
            tipoPessoa: true,
            cpf: true,
            cnpj: true,
            email: true,
            telefone: true,
            ativo: true,
          } as const,
        },
        documentoVendaAnterior: {
          with: {
            cliente: {
              columns: {
                id: true,
                nome: true,
                razaoSocial: true,
                nomeFantasia: true,
                tipoPessoa: true,
                cpf: true,
                cnpj: true,
                email: true,
                telefone: true,
                ativo: true,
              } as const,
            },
            produto: { columns: { id: true, nomeProduto: true } as const },
            seguradoraParceira: {
              columns: {
                id: true,
                razaoSocial: true,
                nomeFantasia: true,
              } as const,
            },
          },
        },
      };

      const [renovacoesPendentes, renovacoesVencidas, cotacoesAtivas] = await Promise.all([
        db.query.renovacoesComerciais.findMany({
          where: renovacoesPendentesConditions,
          with: renovacaoWith,
          orderBy: (r, { asc }) => [asc(r.dataVencimento)],
        }),
        db.query.renovacoesComerciais.findMany({
          where: renovacoesVencidasConditions,
          with: renovacaoWith,
          orderBy: (r, { desc }) => [desc(r.dataVencimento)],
        }),
        db.query.cotacoes.findMany({
          where: cotacoesConditions,
          with: {
            vendedor: {
              columns: { id: true, nome: true, email: true, avatarR2Key: true },
            },
            cliente: {
              columns: {
                id: true,
                nome: true,
                razaoSocial: true,
                tipoPessoa: true,
              },
            },
            produto: { columns: { id: true, nomeProduto: true } },
            seguradoraParceira: {
              columns: { id: true, razaoSocial: true, nomeFantasia: true },
            },
          },
          orderBy: (c, { desc }) => [desc(c.createdAt)],
        }),
      ]);

      // Substituir avatarR2Key pelo avatarUrl assinado em cada item
      const injectAvatar = (item: any) => {
        if (item.vendedor) {
          item.vendedor = {
            ...item.vendedor,
            avatarUrl: avatarMap.get(item.vendedor.id) ?? null,
          };
        }
        return item;
      };

      return {
        renovacoesPendentes: renovacoesPendentes.map(injectAvatar),
        renovacoesVencidas: renovacoesVencidas.map(injectAvatar),
        cotacoes: cotacoesAtivas.map(injectAvatar),
        membros,
      };
      }); // fecha withCacheGeneric
      return ok(result);
    },
  );

  // Planilha de renovações
  fastify.get(
    '/spreadsheet',
    {
      schema: {
        tags: ['Workspace'],
        summary: 'Planilha de renovações',
        description:
          'Retorna renovações em formato de planilha com comparação de prêmio líquido.',
        ...workspaceDocs.planilha,
      },
      preHandler: [authorize(['workspace:visualizar_planilha'])],
    },
    async (request) => {
      const querySchema = z.object({
        vigenciaInicio: z.string().optional(),
        vigenciaFim: z.string().optional(),
      });

      const { vigenciaInicio, vigenciaFim } = querySchema.parse(request.query);

      const cacheKey = `workspace:spreadsheet:${request.corretoraId}:${request.user.sub}:${vigenciaInicio ?? ''}:${vigenciaFim ?? ''}`;
      const renovacoes = await withCacheGeneric(cacheKey, 30, async () => {
      const { db, usuarios, equipes, renovacoesComerciais } =
        await import('@ecotech/shared/database');

      // Verificar se o usuário é gestor de alguma equipe
      const usuarioAtual = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, request.user.sub),
        columns: { id: true, equipeId: true },
      });

      let equipeId: string | null = usuarioAtual?.equipeId ?? null;

      if (!equipeId) {
        const equipeLiderada = await db.query.equipes.findFirst({
          where: and(
            eq(equipes.corretoraId, request.corretoraId),
            eq(equipes.gestorId, request.user.sub),
            isNull(equipes.deletedAt),
          ),
          columns: { id: true, gestorId: true },
        });
        equipeId = equipeLiderada?.id ?? null;
      }

      const podeVerTodos =
        request.user.isAdmin ||
        (Array.isArray(request.user.permissoes) &&
          request.user.permissoes.includes('metricas:acessar'));

      // Determinar quais vendedores buscar
      let vendedorIds: string[] = podeVerTodos ? [] : [request.user.sub];

      if (!podeVerTodos && equipeId) {
        const membros = await db.query.usuarios.findMany({
          where: and(
            eq(usuarios.corretoraId, request.corretoraId),
            eq(usuarios.equipeId, equipeId),
            isNull(usuarios.deletedAt),
            eq(usuarios.ativo, true),
          ),
          columns: { id: true },
        });
        vendedorIds = [
          ...new Set([...membros.map((m) => m.id), request.user.sub]),
        ];
      }

      const vendedorCondition =
        vendedorIds.length === 0
          ? undefined
          : vendedorIds.length === 1
            ? or(eq(renovacoesComerciais.vendedorId, vendedorIds[0]), eq(renovacoesComerciais.vendedorSecundarioAnteriorId, vendedorIds[0]))
            : or(inArray(renovacoesComerciais.vendedorId, vendedorIds), inArray(renovacoesComerciais.vendedorSecundarioAnteriorId, vendedorIds));

      const baseConditions = [
        eq(renovacoesComerciais.corretoraId, request.corretoraId),
        ...(vendedorCondition ? [vendedorCondition] : []),
      ];

      if (vigenciaInicio) {
        baseConditions.push(
          sql`${renovacoesComerciais.dataVencimento} >= ${vigenciaInicio}`,
        );
      }

      if (vigenciaFim) {
        baseConditions.push(
          sql`${renovacoesComerciais.dataVencimento} <= ${vigenciaFim}`,
        );
      }

      const renovacoesRaw = await db.query.renovacoesComerciais.findMany({
        where: and(...baseConditions),
        columns: {
          id: true,
          status: true,
          dataVencimento: true,
          novaVigenciaInicio: true,
          novaVigenciaFim: true,
          premioAnterior: true,
          premioNovo: true,
          percentualComissaoNovo: true,
          valorComissaoNovo: true,
          observacoes: true,
          dataPerda: true,
          motivoPerda: true,
          concorrenteGanhou: true,
          detalhesPerda: true,
          dataCancelamento: true,
          motivoCancelamento: true,
          documentoVendaAnteriorId: true,
          documentoVendaNovoId: true,
          produtoId: true,
          produtoDescricao: true,
          itemDescricao: true,
          seguradoraAnterior: true,
        },
        with: {
          produto: {
            columns: { id: true, nomeProduto: true, tipoSeguro: true },
          },
          cliente: {
            columns: {
              id: true,
              nome: true,
              razaoSocial: true,
              tipoPessoa: true,
              cpf: true,
              cnpj: true,
              email: true,
              telefone: true,
              celular: true,
            },
          },
          vendedor: {
            columns: { id: true, nome: true, avatarR2Key: true },
          },
          documentoVendaAnterior: {
            columns: {
              id: true,
              status: true,
              premioLiquido: true,
              percentualComissao: true,
              valorComissao: true,
              vigenciaInicio: true,
              vigenciaFim: true,
              numeroApoliceExterna: true,
            },
            with: {
              cliente: {
                columns: {
                  id: true,
                  nome: true,
                  razaoSocial: true,
                  tipoPessoa: true,
                  cpf: true,
                  cnpj: true,
                  email: true,
                  telefone: true,
                  celular: true,
                },
              },
              produto: {
                columns: { id: true, nomeProduto: true },
              },
              seguradoraParceira: {
                columns: {
                  id: true,
                  razaoSocial: true,
                  nomeFantasia: true,
                },
              },
            },
          },
          documentoVendaNovo: {
            columns: {
              id: true,
              status: true,
              premioLiquido: true,
              percentualComissao: true,
              valorComissao: true,
              numeroApoliceExterna: true,
              vigenciaInicio: true,
              vigenciaFim: true,
              dataSolicitacaoCadastro: true,
              dataAprovacaoCadastro: true,
              dataRejeicaoCadastro: true,
              motivoRejeicao: true,
              dataCancelamento: true,
              motivoCancelamento: true,
              dataPerda: true,
              motivoPerda: true,
              concorrenteGanhou: true,
            },
            with: {
              aprovadoPor: {
                columns: { id: true, nome: true },
              },
              rejeitadoPor: {
                columns: { id: true, nome: true },
              },
              canceladoPor: {
                columns: { id: true, nome: true },
              },
            },
          },
        },
        orderBy: (r, { asc }) => [asc(r.dataVencimento)],
      });

      // Injetar avatarUrl assinado nos vendedores (com cache Redis 50min)
      return Promise.all(
        renovacoesRaw.map(async (r) => {
          if (!r.vendedor) return r;
          const { avatarR2Key, ...vendedor } = r.vendedor as any;
          return { ...r, vendedor: { ...vendedor, avatarUrl: await getAvatarUrl(avatarR2Key) } };
        }),
      );
      }); // fecha withCacheGeneric

      return ok(renovacoes);
    },
  );

  // Get recently cancelled documents
  fastify.get(
    '/cancelled',
    {
      schema: {
        tags: ['Workspace'],
        summary: 'Listar documentos cancelados recentes',
        description:
          'Retorna documentos de venda cancelados nos últimos 30 dias.',
        ...workspaceDocs.cancelados,
      },
      preHandler: [authorize(['workspace:acessar'])],
    },
    async (request) => {
      const query = paginationQuerySchema.parse(request.query);
      const { offset, limit, page } = getPaginationParams(query);

      const treintaDiasAtras = new Date();
      treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);

      const canceladosConditions = and(
        eq(documentosVenda.corretoraId, request.corretoraId),
        isNull(documentosVenda.deletedAt),
        eq(documentosVenda.status, 'CANCELADO'),
        sql`${documentosVenda.dataCancelamento} >= ${treintaDiasAtras}`,
      );

      const [documentosCancelados, countResult] = await Promise.all([
        db.query.documentosVenda.findMany({
          where: canceladosConditions,
          with: {
            cliente: {
              columns: {
                id: true,
                nome: true,
                razaoSocial: true,
                tipoPessoa: true,
              },
            },
            produto: {
              columns: {
                id: true,
                nomeProduto: true,
              },
            },
            canceladoPor: {
              columns: {
                id: true,
                nome: true,
              },
            },
          },
          limit,
          offset,
          orderBy: (d, { desc }) => [desc(d.dataCancelamento)],
        }),
        db
          .select({ count: sql<number>`count(*)` })
          .from(documentosVenda)
          .where(canceladosConditions),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      const pagedCancelados = createPaginatedResult(documentosCancelados, total, page, limit);
      return { success: true as const, data: pagedCancelados.data, meta: pagedCancelados.meta };
    },
  );

  // Activity feed — all historico events for the user's documents (team-aware)
  fastify.get(
    '/activity',
    {
      schema: {
        tags: ['Workspace'],
        summary: 'Feed de atividades',
        description: 'Retorna histórico de todos os eventos dos documentos da carteira do usuário ou equipe.',
      },
      preHandler: [authorize(['workspace:acessar'])],
    },
    async (request) => {
      const CATEGORY_EVENTS: Record<string, string[]> = {
        cadastro:      ['SOLICITACAO_CADASTRO', 'APROVACAO_CADASTRO', 'REJEICAO_CADASTRO'],
        endossos:      ['ENDOSSO_CRIADO', 'ENDOSSO_APROVADO', 'ENDOSSO_RECUSADO'],
        inclusoes:     ['CRIACAO', 'CONFIRMACAO_VENDA'],
        cancelamentos: ['CANCELAMENTO'],
        perdas:        ['PERDA', 'CONFIRMACAO_PERDA', 'REJEICAO_PERDA'],
      };

      const querySchema = z.object({
        page:       z.coerce.number().min(1).default(1),
        limit:      z.coerce.number().min(1).max(50).default(30),
        categorias: z.string().optional(),
        q:          z.string().optional(),
        dataInicio: z.string().optional(),
        dataFim:    z.string().optional(),
      });
      const { page, limit, categorias, q, dataInicio, dataFim } = querySchema.parse(request.query);
      const offset = (page - 1) * limit;

      // Resolve team members — same logic as /spreadsheet
      const usuarioAtual = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, request.user.sub),
        columns: { id: true, equipeId: true },
      });

      let equipeId: string | null = usuarioAtual?.equipeId ?? null;
      if (!equipeId) {
        const equipeLiderada = await db.query.equipes.findFirst({
          where: and(
            eq(equipes.corretoraId, request.corretoraId),
            eq(equipes.gestorId, request.user.sub),
            isNull(equipes.deletedAt),
          ),
          columns: { id: true },
        });
        equipeId = equipeLiderada?.id ?? null;
      }

      let vendedorIds: string[] = [request.user.sub];
      if (equipeId) {
        const membros = await db.query.usuarios.findMany({
          where: and(
            eq(usuarios.corretoraId, request.corretoraId),
            eq(usuarios.equipeId, equipeId),
            isNull(usuarios.deletedAt),
            eq(usuarios.ativo, true),
          ),
          columns: { id: true },
        });
        vendedorIds = [...new Set([...membros.map((m) => m.id), request.user.sub])];
      }

      const vendedorCondition = vendedorIds.length === 1
        ? or(eq(documentosVenda.vendedorId, vendedorIds[0]), eq(documentosVenda.vendedorSecundarioId, vendedorIds[0]))
        : or(inArray(documentosVenda.vendedorId, vendedorIds), inArray(documentosVenda.vendedorSecundarioId, vendedorIds));

      // Build extra filter conditions
      const extraConditions = [];

      if (categorias) {
        const cats = categorias.split(',').map((c) => c.trim()).filter(Boolean);
        const eventTypes = cats.flatMap((c) => CATEGORY_EVENTS[c] ?? []);
        if (eventTypes.length > 0) {
          extraConditions.push(inArray(historicoDocumentoVenda.tipoEvento, eventTypes as any[]));
        }
      }

      if (q) {
        const term = `%${q}%`;
        extraConditions.push(
          or(
            sql`${clientes.nome} ILIKE ${term}`,
            sql`${clientes.razaoSocial} ILIKE ${term}`,
            sql`${clientes.nomeFantasia} ILIKE ${term}`,
            sql`${documentosVenda.numeroDocumento} ILIKE ${term}`,
          ),
        );
      }

      if (dataInicio) {
        extraConditions.push(sql`DATE(${historicoDocumentoVenda.createdAt}) >= ${dataInicio}`);
      }
      if (dataFim) {
        extraConditions.push(sql`DATE(${historicoDocumentoVenda.createdAt}) <= ${dataFim}`);
      }

      const whereCondition = and(
        eq(documentosVenda.corretoraId, request.corretoraId),
        isNull(documentosVenda.deletedAt),
        vendedorCondition,
        ...extraConditions,
      );

      const vendedorAlias = usuarios;

      const [eventos, countResult] = await Promise.all([
        db
          .select({
            id: historicoDocumentoVenda.id,
            tipoEvento: historicoDocumentoVenda.tipoEvento,
            usuarioNome: historicoDocumentoVenda.usuarioNome,
            descricao: historicoDocumentoVenda.descricao,
            statusAnterior: historicoDocumentoVenda.statusAnterior,
            statusNovo: historicoDocumentoVenda.statusNovo,
            createdAt: historicoDocumentoVenda.createdAt,
            documentoVendaId: historicoDocumentoVenda.documentoVendaId,
            dadosAlterados: historicoDocumentoVenda.dadosAlterados,
            documentoNumero: documentosVenda.numeroDocumento,
            documentoStatus: documentosVenda.status,
            motivoRejeicao: documentosVenda.motivoRejeicao,
            clienteNome: clientes.nome,
            clienteRazaoSocial: clientes.razaoSocial,
            clienteNomeFantasia: clientes.nomeFantasia,
            clienteTipoPessoa: clientes.tipoPessoa,
            produtoNome: produtos.nomeProduto,
            vendedorNome: vendedorAlias.nome,
          })
          .from(historicoDocumentoVenda)
          .innerJoin(documentosVenda, eq(historicoDocumentoVenda.documentoVendaId, documentosVenda.id))
          .innerJoin(clientes, eq(documentosVenda.clienteId, clientes.id))
          .innerJoin(produtos, eq(documentosVenda.produtoId, produtos.id))
          .leftJoin(vendedorAlias, eq(documentosVenda.vendedorId, vendedorAlias.id))
          .where(whereCondition)
          .orderBy(desc(historicoDocumentoVenda.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(historicoDocumentoVenda)
          .innerJoin(documentosVenda, eq(historicoDocumentoVenda.documentoVendaId, documentosVenda.id))
          .innerJoin(clientes, eq(documentosVenda.clienteId, clientes.id))
          .where(whereCondition),
      ]);

      // Batch-fetch tentativas de rejeição para os docs que aparecem como REJEICAO_CADASTRO
      const rejeicaoDocIds = [...new Set(
        eventos.filter((e) => e.tipoEvento === 'REJEICAO_CADASTRO').map((e) => e.documentoVendaId),
      )];

      const tentativasMap = new Map<string, number>();
      if (rejeicaoDocIds.length > 0) {
        const tentativas = await db
          .select({
            documentoVendaId: historicoDocumentoVenda.documentoVendaId,
            count: sql<number>`count(*)`,
          })
          .from(historicoDocumentoVenda)
          .where(
            and(
              inArray(historicoDocumentoVenda.documentoVendaId, rejeicaoDocIds),
              eq(historicoDocumentoVenda.tipoEvento, 'REJEICAO_CADASTRO'),
            ),
          )
          .groupBy(historicoDocumentoVenda.documentoVendaId);

        for (const t of tentativas) {
          tentativasMap.set(t.documentoVendaId, Number(t.count));
        }
      }

      const total = Number(countResult[0]?.count ?? 0);
      const totalPages = Math.ceil(total / limit);

      return ok({
        data: eventos.map((e) => ({
          id: e.id,
          tipoEvento: e.tipoEvento,
          usuarioNome: e.usuarioNome,
          descricao: e.descricao,
          statusAnterior: e.statusAnterior,
          statusNovo: e.statusNovo,
          createdAt: e.createdAt,
          documentoVendaId: e.documentoVendaId,
          documentoNumero: e.documentoNumero,
          documentoStatus: e.documentoStatus,
          motivoRejeicao: e.motivoRejeicao,
          tentativasRejeicao: tentativasMap.get(e.documentoVendaId) ?? null,
          clienteNome: e.clienteTipoPessoa === 'PF'
            ? e.clienteNome
            : e.clienteNomeFantasia || e.clienteRazaoSocial || e.clienteNome,
          produtoNome: e.produtoNome,
          vendedorNome: e.vendedorNome,
        })),
        total,
        page,
        totalPages,
      });
    },
  );
};

export default workspaceRoutes;
