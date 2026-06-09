import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq, and, isNull, isNotNull, sql, desc, or, notInArray, inArray } from 'drizzle-orm';
import {
  authorize,
  authorizeAny,
  requireOwnership,
  requireStatus,
} from '@ecotech/plugins/authorization';
import {
  createCotacaoSchema,
  updateCotacaoSchema,
  listCotacoesQuerySchema,
  marcarPerdidaSchema,
} from '@ecotech/features/cotacoes';
import { createProspectoSchema } from './schemas.js';
import {
  db,
  cotacoes,
  clientes,
  produtos,
  cotacaoVendedores,
  usuarios,
  documentosVenda,
  anexos,
  renovacoesComerciais,
  historicoDocumentoVenda,
  NotificacaoService,
  corretoraComissaoConfigs,
  cargoComissaoConfigs,
  usuarioComissaoConfigs,
  comentarios,
  cotacaoTagRelacoes,
  cotacaoTags,
} from '@ecotech/shared/database';
import { ok } from '../../docs/index.js';
import { getAvatarUrl, withCacheGeneric } from '../../utils/cache.js';
import cotacoesAnexosRoutes from './anexos.js';
import { cotacoesDocs, mapCotacao } from '../../docs/cotacoes/schemas.js';

const cotacoesRoutes: FastifyPluginAsyncZod = async function (fastify) {
  // Registrar sub-rotas de anexos
  await fastify.register(cotacoesAnexosRoutes);

  fastify.addHook('preHandler', fastify.authenticate);

  // Create quotation
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Cotações'],
        summary: 'Criar nova cotação',
        description:
          'Cria uma nova cotação de seguro para um cliente. Requer permissão de criação de cotações.',
        ...cotacoesDocs.criar,
      },
      preHandler: [authorize(['vendas:criar_cotacao'])],
    },
    async (request, reply) => {
      const { NotFoundError, generateNumeroCotacao } = await import(
        '@ecotech/shared/utils'
      );
      const data = createCotacaoSchema.parse(request.body);

      // Validate client and product in parallel
      const [cliente, produto] = await Promise.all([
        db.query.clientes.findFirst({
          where: and(
            eq(clientes.id, data.clienteId),
            eq(clientes.corretoraId, request.corretoraId),
            isNull(clientes.deletedAt),
          ),
        }),
        db.query.produtos.findFirst({
          where: and(
            eq(produtos.id, data.produtoId),
            eq(produtos.corretoraId, request.corretoraId),
            eq(produtos.ativo, true),
            isNull(produtos.deletedAt),
          ),
        }),
      ]);

      if (!cliente) {
        throw new NotFoundError('Cliente');
      }

      if (!produto) {
        throw new NotFoundError('Produto');
      }

      // Vendedor principal: usa o informado no body ou o usuário logado
      // (resolução antecipada para usar na busca de config de comissão)
      const vendedorPrincipalId = data.vendedorId ?? request.user.sub;

      // Resolve percentual de participação: usuário > cargo > global
      // Para cada nível: tenta match com tipoNegocio específico, depois fallback NULL
      let percentualParticipacaoAutoFill: number | undefined;
      if (!data.percentualComissaoPrincipal && produto.tipoSeguro) {
        const tipoNormalizado = produto.tipoSeguro.toUpperCase();
        const situacao = (data.situacao ?? 'NOVO') as 'NOVO' | 'RENOVACAO';

        const resolveConfig = async (
          baseConditions: any[],
          tipoNegocioCol: any,
          queryKey: 'usuarioComissaoConfigs' | 'cargoComissaoConfigs' | 'corretoraComissaoConfigs',
        ) => {
          const especifico = await (db.query[queryKey] as any).findFirst({
            where: and(...baseConditions, eq(tipoNegocioCol, situacao)),
          });
          if (especifico) return especifico;
          return (db.query[queryKey] as any).findFirst({
            where: and(...baseConditions, isNull(tipoNegocioCol)),
          });
        };

        const commissionCacheKey = `comissao:${request.corretoraId}:${vendedorPrincipalId}:${tipoNormalizado}:${situacao}`;
        const percentualResolvido = await withCacheGeneric(commissionCacheKey, 300, async () => {
          // Batch 1: user config + vendedor.cargoId (parallel)
          const [configUsuario, vendedor] = await Promise.all([
            resolveConfig(
              [
                eq(usuarioComissaoConfigs.corretoraId, request.corretoraId),
                eq(usuarioComissaoConfigs.usuarioId, vendedorPrincipalId),
                eq(usuarioComissaoConfigs.tipoSeguro, tipoNormalizado),
              ],
              usuarioComissaoConfigs.tipoNegocio,
              'usuarioComissaoConfigs',
            ),
            db.query.usuarios.findFirst({
              where: eq(usuarios.id, vendedorPrincipalId),
              columns: { cargoId: true },
            }),
          ]);

          if (configUsuario) return Number(configUsuario.percentualParticipacao);

          // Batch 2: cargo config + global config (parallel)
          const [configCargo, configGlobal] = await Promise.all([
            vendedor?.cargoId
              ? resolveConfig(
                  [
                    eq(cargoComissaoConfigs.corretoraId, request.corretoraId),
                    eq(cargoComissaoConfigs.cargoId, vendedor.cargoId),
                    eq(cargoComissaoConfigs.tipoSeguro, tipoNormalizado),
                  ],
                  cargoComissaoConfigs.tipoNegocio,
                  'cargoComissaoConfigs',
                )
              : Promise.resolve(null),
            resolveConfig(
              [
                eq(corretoraComissaoConfigs.corretoraId, request.corretoraId),
                eq(corretoraComissaoConfigs.tipoSeguro, tipoNormalizado),
              ],
              corretoraComissaoConfigs.tipoNegocio,
              'corretoraComissaoConfigs',
            ),
          ]);

          if (configCargo) return Number(configCargo.percentualParticipacao);
          if (configGlobal) return Number(configGlobal.percentualParticipacao);
          return null;
        });

        if (percentualResolvido != null) {
          percentualParticipacaoAutoFill = percentualResolvido;
        }
      }

      // Generate quotation number
      const now = new Date();
      const anoMes = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const maxResult = await db
        .select({ max: sql<string>`MAX(numero_cotacao)` })
        .from(cotacoes)
        .where(
          and(
            eq(cotacoes.corretoraId, request.corretoraId),
            sql`numero_cotacao LIKE ${'COT-' + anoMes + '-%'}`,
          ),
        );

      const lastNum = maxResult[0]?.max
        ? parseInt(maxResult[0].max.split('-').pop() ?? '0', 10)
        : 0;
      const sequencial = lastNum + 1;
      const numeroCotacao = generateNumeroCotacao(
        request.corretoraId,
        sequencial,
      );

      // Calculate commission values
      const { calculateComissaoSplit, calculateComissaoSimples } = await import(
        '@ecotech/shared/utils'
      );

      const premioLiquido = data.premioLiquido ?? 0;
      const percentualComissao = data.percentualComissao ?? 0;

      // Handle commission split if provided
      let comissaoData: any = {};

      // Aplicar auto-fill do percentual principal se resolvido por config
      const percentualComissaoPrincipalFinal =
        data.percentualComissaoPrincipal ?? percentualParticipacaoAutoFill;
      const percentualCorretoraFinal =
        data.percentualCorretora ??
        (percentualParticipacaoAutoFill !== undefined
          ? 100 - percentualParticipacaoAutoFill
          : undefined);

      // Verificar se há percentuais significativos definidos
      const hasSignificantPercentages =
        (percentualComissaoPrincipalFinal &&
          percentualComissaoPrincipalFinal > 0) ||
        (data.percentualComissaoSecundario &&
          data.percentualComissaoSecundario > 0) ||
        (data.percentualComissaoTerceiro &&
          data.percentualComissaoTerceiro > 0) ||
        (percentualCorretoraFinal && percentualCorretoraFinal > 0);

      if (data.vendedorSecundarioId || data.vendedorTerceiroId || hasSignificantPercentages) {
        const splitResult = calculateComissaoSplit({
          premioLiquido: premioLiquido,
          percentualComissaoPrincipal: percentualComissaoPrincipalFinal,
          percentualComissaoSecundario:
            data.percentualComissaoSecundario ?? undefined,
          percentualComissaoTerceiro:
            data.percentualComissaoTerceiro ?? undefined,
          percentualCorretora: percentualCorretoraFinal,
          negocioCorretora: data.negocioCorretora,
        });

        // Apenas validar se houver percentuais definidos
        // Para rascunhos sem percentuais, permitir salvar
        if (hasSignificantPercentages && !splitResult.valid) {
          const { ValidationError } = await import('@ecotech/shared/utils');
          throw new ValidationError(splitResult.errors.join(', '));
        }

        comissaoData = {
          percentualComissao: percentualComissao.toString(),
          valorComissao: splitResult.valorComissaoTotal.toString(),
          vendedorSecundarioId: data.vendedorSecundarioId || null,
          vendedorTerceiroId: data.vendedorTerceiroId || null,
          percentualComissaoPrincipal:
            percentualComissaoPrincipalFinal?.toString() || null,
          percentualComissaoSecundario:
            data.percentualComissaoSecundario?.toString() || null,
          percentualComissaoTerceiro:
            data.percentualComissaoTerceiro?.toString() || null,
          valorComissaoPrincipal:
            splitResult.valorComissaoPrincipal?.toString() || null,
          valorComissaoSecundario:
            splitResult.valorComissaoSecundario?.toString() || null,
          valorComissaoTerceiro:
            splitResult.valorComissaoTerceiro?.toString() || null,
          negocioCorretora: data.negocioCorretora ?? true, // Sempre ativo por padrão
          percentualCorretora: percentualCorretoraFinal?.toString() || null,
          valorComissaoCorretora:
            splitResult.valorComissaoCorretora?.toString() || null,
        };
      } else {
        // Legacy single vendor mode
        const valorComissao = calculateComissaoSimples(
          premioLiquido,
          percentualComissao,
        );
        comissaoData = {
          percentualComissao: percentualComissao.toString(),
          valorComissao: valorComissao.toString(),
          negocioCorretora: data.negocioCorretora ?? true, // Sempre ativo por padrão
        };
      }

      // Use transaction to create cotacao and vendedor record together
      const result = await db.transaction(async (tx) => {
        const [cotacao] = await tx
          .insert(cotacoes)
          .values({
            corretoraId: request.corretoraId,
            clienteId: data.clienteId,
            vendedorId: vendedorPrincipalId,
            atuanteId: request.user.sub,
            produtoId: data.produtoId,
            seguradoraParceiraId: data.seguradoraParceiraId ?? null,
            numeroCotacao,
            status: 'EM_ELABORACAO',
            vigenciaInicio: data.vigenciaInicio,
            vigenciaFim: data.vigenciaFim,
            premioLiquido: data.premioLiquido?.toString() ?? null,
            situacao: data.situacao ?? 'NOVO',
            origem: data.origem ?? 'MANUAL',
            itemDescricao: data.itemDescricao,
            coberturas: data.coberturas,
            detalhesRisco: data.detalhesRisco,
            documentoVendaId: data.documentoVendaId ?? null,
            ...comissaoData,
          })
          .returning();

        // Create initial vendor record (tracks the principal vendor)
        await tx.insert(cotacaoVendedores).values({
          cotacaoId: cotacao.id,
          vendedorId: vendedorPrincipalId,
          atribuidoPor: request.user.sub,
          ativo: true,
        });

        return cotacao;
      });

      // Notificar vendedor se cotação foi atribuída por outra pessoa
      if (vendedorPrincipalId !== request.user.sub) {
        NotificacaoService.notificarCotacaoAtribuida({
          corretoraId: request.corretoraId,
          cotacaoId: result.id,
          clienteNome: cliente.nome ?? '',
          atribuidoPorNome: request.user.nome,
          vendedorId: vendedorPrincipalId,
        }).catch((err) => {
          console.error('Erro ao criar notificação de cotação atribuída:', err);
        });
      }

      // Verificar metas/missões/reconhecimento do vendedor após nova cotação
      import('../../utils/progresso-metrica.js').then(({ checkPendingGoals, checkPendingMissions }) => {
        Promise.all([
          checkPendingGoals(request.corretoraId, request.user.sub),
          checkPendingMissions(request.corretoraId, request.user.sub),
        ]).catch((err) => {
          console.error('Erro ao verificar metas/missões após cotação:', err);
        });
      });
      import('../../utils/reconhecimento.js').then(({ checkAllRecognitions }) => {
        checkAllRecognitions(request.corretoraId, request.user.sub).catch((err) => {
          console.error('Erro ao verificar reconhecimentos após cotação:', err);
        });
      });

      return reply.status(201).send(ok(mapCotacao(result) as any));
    },
  );

  // List quotations
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Cotações'],
        summary: 'Listar cotações',
        description:
          'Retorna a lista de cotações da seguradora com paginação. Vendedores veem apenas suas cotações, gerentes veem todas.',
        ...cotacoesDocs.listar,
      },
      preHandler: [
        authorizeAny([
          'vendas:visualizar_cotacao',
          'vendas:visualizar_todos_documentos',
        ]),
      ],
    },
    async (request) => {
      const { getPaginationParams, createPaginatedResult } = await import(
        '@ecotech/shared/utils'
      );
      const query = request.query;
      const { offset, limit, page } = getPaginationParams(query);

      const archivedOnly = (query as any).archivedOnly === 'true';

      const conditions = [
        eq(cotacoes.corretoraId, request.corretoraId),
        archivedOnly ? isNotNull(cotacoes.deletedAt) : isNull(cotacoes.deletedAt),
      ];

      // Admins, gestores e usuários com visualizar_todos_documentos veem todas as cotações
      const podeVerTodos =
        request.user.isAdmin ||
        request.user.isGestor ||
        (Array.isArray(request.user.permissoes) &&
          request.user.permissoes.includes('vendas:visualizar_todos_documentos'));

      if (!podeVerTodos) {
        // Vendedor (comissão) e atuante (operação) são conceitos distintos —
        // ambos devem ver a cotação na própria lista.
        conditions.push(
          or(
            eq(cotacoes.atuanteId, request.user.sub),
            eq(cotacoes.vendedorId, request.user.sub),
          )!,
        );
      }

      if (query.clienteId) {
        conditions.push(eq(cotacoes.clienteId, query.clienteId));
      }

      if (query.produtoId) {
        conditions.push(eq(cotacoes.produtoId, query.produtoId));
      }

      if (query.status) {
        conditions.push(eq(cotacoes.status, query.status));
      }

      if (query.negocioCorretora !== undefined) {
        conditions.push(eq(cotacoes.negocioCorretora, query.negocioCorretora));
      }

      const [cotacoesResult, countResult] = await Promise.all([
        db.query.cotacoes.findMany({
          where: and(...conditions),
          with: {
            cliente: {
              columns: {
                id: true,
                nome: true,
                razaoSocial: true,
                tipoPessoa: true,
              },
            },
            vendedor: {
              columns: {
                id: true,
                nome: true,
                email: true,
              },
            },
            vendedorSecundario: {
              columns: {
                id: true,
                nome: true,
                email: true,
              },
            },
            vendedorTerceiro: {
              columns: {
                id: true,
                nome: true,
                email: true,
              },
            },
            atuante: {
              columns: {
                id: true,
                nome: true,
                email: true,
              },
            },
            produto: {
              columns: {
                id: true,
                nomeProduto: true,
                tipoSeguro: true,
              },
            },
            seguradoraParceira: {
              columns: {
                id: true,
                razaoSocial: true,
                nomeFantasia: true,
              },
            },
          } as any,
          limit,
          offset,
          orderBy: (cotacoes, { desc }) => [desc(cotacoes.createdAt)],
        }) as unknown as Promise<
          Array<
            typeof cotacoes.$inferSelect & {
              cliente: {
                id: string;
                nome: string | null;
                razaoSocial: string | null;
                tipoPessoa: string;
              } | null;
              vendedor: { id: string; nome: string; email: string } | null;
              vendedorSecundario: {
                id: string;
                nome: string;
                email: string;
              } | null;
              produto: {
                id: string;
                nomeProduto: string;
                tipoSeguro: string;
              } | null;
              seguradoraParceira: {
                id: string;
                razaoSocial: string;
                nomeFantasia: string | null;
              } | null;
            }
          >
        >,
        db
          .select({ count: sql<number>`count(*)` })
          .from(cotacoes)
          .where(and(...conditions)),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      const cotacaoIds = cotacoesResult.map((c) => c.id);

      const rankedComentarios = cotacaoIds.length > 0
        ? db
            .select({
              entidadeId: comentarios.entidadeId,
              texto: comentarios.texto,
              autorId: comentarios.autorId,
              createdAt: comentarios.createdAt,
              rn: sql<number>`row_number() over (partition by ${comentarios.entidadeId} order by ${comentarios.createdAt} desc)`.as('rn'),
            })
            .from(comentarios)
            .where(
              and(
                eq(comentarios.entidadeTipo, 'cotacao'),
                inArray(comentarios.entidadeId, cotacaoIds),
                isNull(comentarios.parentId),
              ),
            )
            .as('ranked_comentarios')
        : null;

      const [commentCounts, tagsResult, lastCommentResult, rejeicaoResult, anexoCounts] = await Promise.all([
        cotacaoIds.length > 0
          ? db
              .select({
                entidadeId: comentarios.entidadeId,
                count: sql<number>`count(*)::int`,
              })
              .from(comentarios)
              .where(
                and(
                  eq(comentarios.entidadeTipo, 'cotacao'),
                  inArray(comentarios.entidadeId, cotacaoIds),
                ),
              )
              .groupBy(comentarios.entidadeId)
          : Promise.resolve([]),
        cotacaoIds.length > 0
          ? db
              .select({
                cotacaoId: cotacaoTagRelacoes.cotacaoId,
                tagId: cotacaoTags.id,
                nome: cotacaoTags.nome,
                cor: cotacaoTags.cor,
              })
              .from(cotacaoTagRelacoes)
              .innerJoin(cotacaoTags, eq(cotacaoTagRelacoes.tagId, cotacaoTags.id))
              .where(
                and(
                  inArray(cotacaoTagRelacoes.cotacaoId, cotacaoIds),
                  isNull(cotacaoTags.deletedAt),
                ),
              )
          : Promise.resolve([]),
        rankedComentarios
          ? db
              .select({
                entidadeId: rankedComentarios.entidadeId,
                texto: rankedComentarios.texto,
                autorNome: usuarios.nome,
                autorAvatarUrl: usuarios.avatarUrl,
                createdAt: rankedComentarios.createdAt,
              })
              .from(rankedComentarios)
              .innerJoin(usuarios, eq(rankedComentarios.autorId, usuarios.id))
              .where(eq(rankedComentarios.rn, 1))
          : Promise.resolve([]),
        cotacaoIds.length > 0
          ? db
              .select({
                cotacaoId: cotacoes.id,
                documentoVendaId: documentosVenda.id,
                status: documentosVenda.status,
                dataRejeicaoCadastro: documentosVenda.dataRejeicaoCadastro,
                motivoRejeicao: documentosVenda.motivoRejeicao,
                rejeitadoPorId: documentosVenda.rejeitadoPorId,
              })
              .from(cotacoes)
              .innerJoin(documentosVenda, eq(documentosVenda.id, cotacoes.documentoVendaId))
              .where(
                and(
                  inArray(cotacoes.id, cotacaoIds),
                  or(
                    isNotNull(documentosVenda.dataRejeicaoCadastro),
                    eq(documentosVenda.status, 'AGUARDANDO_CADASTRO'),
                  ),
                ),
              )
          : Promise.resolve([]),
        cotacaoIds.length > 0
          ? db
              .select({
                entidadeId: anexos.entidadeId,
                count: sql<number>`count(*)::int`,
              })
              .from(anexos)
              .where(
                and(
                  eq(anexos.entidadeTipo, 'cotacao'),
                  inArray(anexos.entidadeId, cotacaoIds),
                  isNull(anexos.deletedAt),
                ),
              )
              .groupBy(anexos.entidadeId)
          : Promise.resolve([]),
      ]);
      const commentCountMap = new Map(
        commentCounts.map((r) => [r.entidadeId, r.count]),
      );
      const anexoCountMap = new Map(
        anexoCounts.map((r) => [r.entidadeId, r.count]),
      );
      const lastCommentMap = new Map(
        lastCommentResult.map((r) => [r.entidadeId, {
          texto: r.texto,
          autorNome: r.autorNome,
          autorAvatarUrl: r.autorAvatarUrl ?? null,
          createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
        }]),
      );
      const tagsMap = new Map<string, Array<{ id: string; nome: string; cor: string }>>();
      for (const t of tagsResult) {
        const list = tagsMap.get(t.cotacaoId) ?? [];
        list.push({ id: t.tagId, nome: t.nome, cor: t.cor });
        tagsMap.set(t.cotacaoId, list);
      }
      const rejeicaoMap = new Map<string, { data: string | null; motivo: string | null; documentoVendaId: string; status: string }>(
        rejeicaoResult
          .map((r: any) => [
            r.cotacaoId,
            {
              data: r.dataRejeicaoCadastro
                ? (r.dataRejeicaoCadastro instanceof Date
                    ? r.dataRejeicaoCadastro.toISOString()
                    : String(r.dataRejeicaoCadastro))
                : null,
              motivo: r.motivoRejeicao ?? null,
              documentoVendaId: r.documentoVendaId,
              status: r.status,
            },
          ]),
      );

      return {
        success: true as const,
        ...createPaginatedResult(
          cotacoesResult.map((c) => ({
            id: c.id,
            numero: c.numeroCotacao,
            numeroCotacao: c.numeroCotacao,
            status: c.status,
            etapa: c.etapa,
            situacao: c.situacao,
            origem: c.origem,
            vigenciaInicio: c.vigenciaInicio,
            vigenciaFim: c.vigenciaFim,
            premioLiquido: c.premioLiquido ? parseFloat(c.premioLiquido) : null,
            percentualComissao: c.percentualComissao
              ? parseFloat(c.percentualComissao)
              : null,
            valorComissao: c.valorComissao ? parseFloat(c.valorComissao) : null,
            // Commission split fields
            vendedorSecundarioId: c.vendedorSecundarioId,
            vendedorTerceiroId: (c as any).vendedorTerceiroId,
            percentualComissaoPrincipal: c.percentualComissaoPrincipal
              ? parseFloat(c.percentualComissaoPrincipal)
              : null,
            percentualComissaoSecundario: c.percentualComissaoSecundario
              ? parseFloat(c.percentualComissaoSecundario)
              : null,
            percentualComissaoTerceiro: (c as any).percentualComissaoTerceiro
              ? parseFloat((c as any).percentualComissaoTerceiro)
              : null,
            valorComissaoPrincipal: c.valorComissaoPrincipal
              ? parseFloat(c.valorComissaoPrincipal)
              : null,
            valorComissaoSecundario: c.valorComissaoSecundario
              ? parseFloat(c.valorComissaoSecundario)
              : null,
            valorComissaoTerceiro: (c as any).valorComissaoTerceiro
              ? parseFloat((c as any).valorComissaoTerceiro)
              : null,
            negocioCorretora: c.negocioCorretora,
            percentualCorretora: c.percentualCorretora
              ? parseFloat(c.percentualCorretora)
              : null,
            valorComissaoCorretora: c.valorComissaoCorretora
              ? parseFloat(c.valorComissaoCorretora)
              : null,
            itemDescricao: c.itemDescricao,
            clienteId: c.clienteId,
            cliente: c.cliente,
            vendedorId: c.vendedorId,
            vendedor: c.vendedor,
            vendedorSecundario: c.vendedorSecundario,
            vendedorTerceiro: (c as any).vendedorTerceiro,
            atuanteId: (c as any).atuanteId,
            atuante: (c as any).atuante,
            produtoId: c.produtoId,
            produto: c.produto,
            seguradoraParceiraId: c.seguradoraParceiraId,
            seguradoraParceira: c.seguradoraParceira,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            deletedAt: c.deletedAt ? (c.deletedAt instanceof Date ? c.deletedAt.toISOString() : String(c.deletedAt)) : null,
            deletedByNome: (c.detalhesRisco as any)?._softDeleted?.userName ?? null,
            comentariosCount: commentCountMap.get(c.id) ?? 0,
            anexosCount: anexoCountMap.get(c.id) ?? 0,
            ultimoComentario: lastCommentMap.get(c.id) ?? null,
            tags: tagsMap.get(c.id) ?? [],
            renovacaoId: (c.detalhesRisco as any)?.renovacaoId ?? null,
            dataRejeicaoCadastroDoc: rejeicaoMap.get(c.id)?.data ?? null,
            motivoRejeicaoCadastroDoc: rejeicaoMap.get(c.id)?.motivo ?? null,
            documentoVendaIdDoc: rejeicaoMap.get(c.id)?.documentoVendaId ?? null,
            documentoVendaStatusDoc: rejeicaoMap.get(c.id)?.status ?? null,
          })),
          total,
          page,
          limit,
        ),
      };
    },
  );

  // Get quotation by ID
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Cotações'],
        summary: 'Obter detalhes da cotação',
        description: 'Retorna os detalhes completos de uma cotação.',
        ...cotacoesDocs.buscar,
      },
      preHandler: [
        authorizeAny([
          'vendas:visualizar_cotacao',
          'vendas:visualizar_todos_documentos',
        ]),
      ],
    },
    async (request) => {
      const { NotFoundError, OwnershipError } = await import(
        '@ecotech/shared/utils'
      );
      const { id } = request.params as { id: string };

      const cotacao = (await db.query.cotacoes.findFirst({
        where: and(
          eq(cotacoes.id, id),
          eq(cotacoes.corretoraId, request.corretoraId),
          isNull(cotacoes.deletedAt),
        ),
        with: {
          cliente: {
            columns: {
              id: true,
              tipoPessoa: true,
              nome: true,
              cpf: true,
              dataNascimento: true,
              razaoSocial: true,
              nomeFantasia: true,
              cnpj: true,
              email: true,
              telefone: true,
              celular: true,
              ativo: true,
            },
          },
          vendedor: {
            columns: {
              id: true,
              nome: true,
              email: true,
            },
          },
          vendedorSecundario: {
            columns: {
              id: true,
              nome: true,
              email: true,
            },
          },
          vendedorTerceiro: {
            columns: {
              id: true,
              nome: true,
              email: true,
            },
          },
          atuante: {
            columns: {
              id: true,
              nome: true,
              email: true,
            },
          },
          produto: true,
          seguradoraParceira: {
            columns: {
              id: true,
              razaoSocial: true,
              nomeFantasia: true,
            },
          },
        } as any,
      })) as
        | (typeof cotacoes.$inferSelect & {
            cliente: Record<string, unknown> | null;
            vendedor: { id: string; nome: string; email: string } | null;
            vendedorSecundario: {
              id: string;
              nome: string;
              email: string;
            } | null;
            vendedorTerceiro: {
              id: string;
              nome: string;
              email: string;
            } | null;
            atuante: { id: string; nome: string; email: string } | null;
            produto: Record<string, unknown> | null;
            seguradoraParceira: {
              id: string;
              razaoSocial: string;
              nomeFantasia: string | null;
            } | null;
          })
        | undefined;

      if (!cotacao) {
        throw new NotFoundError('Cotação');
      }

      // Acesso: atuante ou vendedor principal são owners legítimos; ou mesma equipe.
      const podeVerTodos =
        request.user.isAdmin ||
        request.user.isGestor ||
        request.user.permissoes.includes('vendas:visualizar_todos_documentos');
      const isAtuanteOuVendedor =
        cotacao.atuanteId === request.user.sub ||
        cotacao.vendedorId === request.user.sub;

      if (!podeVerTodos && !isAtuanteOuVendedor) {
        // Verificar se são da mesma equipe (do atuante OU do vendedor)
        const { usuarios } = await import('@ecotech/shared/database');
        const donoIds = [cotacao.atuanteId, cotacao.vendedorId].filter(
          Boolean,
        ) as string[];
        const [meUsuario, ...donos] = await Promise.all([
          db.query.usuarios.findFirst({
            where: eq(usuarios.id, request.user.sub),
            columns: { equipeId: true },
          }),
          ...donoIds.map((donoId) =>
            db.query.usuarios.findFirst({
              where: eq(usuarios.id, donoId),
              columns: { equipeId: true },
            }),
          ),
        ]);
        const mesmaEquipe =
          !!meUsuario?.equipeId &&
          donos.some(
            (d) => d?.equipeId && d.equipeId === meUsuario.equipeId,
          );

        if (!mesmaEquipe) {
          throw new OwnershipError('Você não tem acesso a esta cotação');
        }
      }

      // If it's a renewal, fetch previous data
      let dadosRenovacao = null;
      if (cotacao.situacao === 'RENOVACAO') {
        // Try to get renovacaoId from detalhesRisco (new cotacoes)
        const detalhesRisco = cotacao.detalhesRisco as any;
        const renovacaoId = detalhesRisco?.renovacaoId;

        let renovacao = null;

        if (renovacaoId) {
          // Direct lookup using renovacaoId
          renovacao = (await db.query.renovacoesComerciais.findFirst({
            where: and(
              eq(renovacoesComerciais.id, renovacaoId),
              eq(renovacoesComerciais.corretoraId, request.corretoraId),
            ),
            with: {
              documentoVendaAnterior: {
                columns: {
                  id: true,
                  premioLiquido: true,
                  percentualComissao: true,
                  valorComissao: true,
                },
              },
            } as any,
          })) as
            | (typeof renovacoesComerciais.$inferSelect & {
                documentoVendaAnterior: {
                  id: string;
                  premioLiquido: string | null;
                  percentualComissao: string | null;
                  valorComissao: string | null;
                } | null;
              })
            | undefined;
        } else {
          // Fallback: find by vendedor and recent date (for old cotacoes)
          renovacao = (await db.query.renovacoesComerciais.findFirst({
            where: and(
              eq(renovacoesComerciais.corretoraId, request.corretoraId),
              eq(renovacoesComerciais.vendedorId, cotacao.vendedorId),
            ),
            with: {
              documentoVendaAnterior: {
                columns: {
                  id: true,
                  premioLiquido: true,
                  percentualComissao: true,
                  valorComissao: true,
                },
              },
            } as any,
            orderBy: (r, { desc }) => [desc(r.createdAt)],
          })) as
            | (typeof renovacoesComerciais.$inferSelect & {
                documentoVendaAnterior: {
                  id: string;
                  premioLiquido: string | null;
                  percentualComissao: string | null;
                  valorComissao: string | null;
                } | null;
              })
            | undefined;
        }

        if (renovacao?.documentoVendaAnterior) {
          dadosRenovacao = {
            premioLiquidoAnterior:
              renovacao.premioAnterior ||
              renovacao.documentoVendaAnterior.premioLiquido,
            percentualComissaoAnterior:
              renovacao.percentualComissaoAnterior ||
              renovacao.documentoVendaAnterior.percentualComissao,
            valorComissaoAnterior:
              renovacao.valorComissaoAnterior ||
              renovacao.documentoVendaAnterior.valorComissao,
          };
        }
      }

      const [cotacaoTagsData, docVendaRejeicao] = await Promise.all([
        db
          .select({
            id: cotacaoTags.id,
            nome: cotacaoTags.nome,
            cor: cotacaoTags.cor,
          })
          .from(cotacaoTagRelacoes)
          .innerJoin(cotacaoTags, eq(cotacaoTagRelacoes.tagId, cotacaoTags.id))
          .where(
            and(
              eq(cotacaoTagRelacoes.cotacaoId, id),
              isNull(cotacaoTags.deletedAt),
            ),
          ),
        cotacao.documentoVendaId
          ? db
              .select({
                dataRejeicaoCadastro: documentosVenda.dataRejeicaoCadastro,
                motivoRejeicao: documentosVenda.motivoRejeicao,
              })
              .from(documentosVenda)
              .where(eq(documentosVenda.id, cotacao.documentoVendaId))
              .then((rows) => rows[0] ?? null)
          : Promise.resolve(null),
      ]);

      return ok({
        ...mapCotacao(cotacao),
        ...(dadosRenovacao && { dadosRenovacao }),
        tags: cotacaoTagsData,
        dataRejeicaoCadastroDoc: docVendaRejeicao?.dataRejeicaoCadastro
          ? (docVendaRejeicao.dataRejeicaoCadastro instanceof Date
              ? docVendaRejeicao.dataRejeicaoCadastro.toISOString()
              : String(docVendaRejeicao.dataRejeicaoCadastro))
          : null,
        motivoRejeicaoCadastroDoc: docVendaRejeicao?.motivoRejeicao ?? null,
        documentoVendaIdDoc: cotacao.documentoVendaId ?? null,
      } as any);
    },
  );

  // Update quotation
  fastify.patch(
    '/:id',
    {
      schema: {
        tags: ['Cotações'],
        summary: 'Atualizar cotação',
        description:
          'Atualiza as informações de uma cotação. Requer permissão de edição de cotações.',
        ...cotacoesDocs.atualizar,
      },
      preHandler: [
        authorize(['vendas:editar_cotacao']),
        requireOwnership('cotacao'),
        requireStatus('cotacao', ['EM_ELABORACAO']),
      ],
    },
    async (request) => {
      const { NotFoundError } = await import('@ecotech/shared/utils');
      const { id } = request.params as { id: string };

      console.log(
        '🔵 [PATCH /cotacoes/:id] Request body recebido:',
        request.body,
      );

      const data = updateCotacaoSchema.parse(request.body);

      console.log('🟢 [PATCH /cotacoes/:id] Dados parseados:', data);

      const cotacao = await db.query.cotacoes.findFirst({
        where: and(
          eq(cotacoes.id, id),
          eq(cotacoes.corretoraId, request.corretoraId),
          isNull(cotacoes.deletedAt),
        ),
      });

      if (!cotacao) {
        throw new NotFoundError('Cotação');
      }

      // Ownership and status já foram validados pelos middlewares

      // Recalculate commission if any commission-related field changed
      const { calculateComissaoSplit, calculateComissaoSimples } = await import(
        '@ecotech/shared/utils'
      );

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      // Registrar atuante apenas se ainda não houver (preserva quem iniciou)
      if (!cotacao.atuanteId) {
        updateData.atuanteId = request.user.sub;
      }

      // Check if commission split fields are being updated
      const hasSplitUpdate =
        data.vendedorSecundarioId !== undefined ||
        data.vendedorTerceiroId !== undefined ||
        data.percentualComissaoPrincipal !== undefined ||
        data.percentualComissaoSecundario !== undefined ||
        data.percentualComissaoTerceiro !== undefined ||
        data.percentualCorretora !== undefined ||
        data.negocioCorretora !== undefined;

      if (
        hasSplitUpdate ||
        data.premioLiquido !== undefined ||
        data.percentualComissao !== undefined
      ) {
        const premio =
          data.premioLiquido ?? parseFloat(cotacao.premioLiquido || '0');

        // Check if we're using split mode with actual values
        const percPrincipal =
          data.percentualComissaoPrincipal !== undefined
            ? (data.percentualComissaoPrincipal ?? 0)
            : parseFloat(cotacao.percentualComissaoPrincipal || '0');
        const percSecundario =
          data.percentualComissaoSecundario !== undefined
            ? (data.percentualComissaoSecundario ?? 0)
            : parseFloat(cotacao.percentualComissaoSecundario || '0');
        const percTerceiro =
          data.percentualComissaoTerceiro !== undefined
            ? (data.percentualComissaoTerceiro ?? 0)
            : parseFloat((cotacao as any).percentualComissaoTerceiro || '0');
        const percCorretora =
          data.percentualCorretora !== undefined
            ? (data.percentualCorretora ?? 0)
            : parseFloat(cotacao.percentualCorretora || '0');

        const usingSplit =
          (data.vendedorSecundarioId !== undefined
            ? data.vendedorSecundarioId
            : cotacao.vendedorSecundarioId) ||
          (data.vendedorTerceiroId !== undefined
            ? data.vendedorTerceiroId
            : (cotacao as any).vendedorTerceiroId) ||
          (percPrincipal ?? 0) > 0 ||
          (percCorretora ?? 0) > 0;

        if (usingSplit) {
          const splitResult = calculateComissaoSplit({
            premioLiquido: premio,
            percentualComissaoPrincipal: percPrincipal,
            percentualComissaoSecundario: percSecundario,
            percentualComissaoTerceiro: percTerceiro,
            percentualCorretora: percCorretora,
            negocioCorretora:
              data.negocioCorretora !== undefined
                ? data.negocioCorretora
                : cotacao.negocioCorretora || false,
          });

          // Apenas validar se houver percentuais definidos significativos
          // Para rascunhos, permitir salvar sem validação de soma 100%
          const hasSignificantPercentages =
            (percPrincipal ?? 0) > 0 ||
            (percSecundario ?? 0) > 0 ||
            (percTerceiro ?? 0) > 0 ||
            (percCorretora ?? 0) > 0;

          console.log('📊 [Validação Comissão]', {
            percPrincipal,
            percSecundario,
            percTerceiro,
            percCorretora,
            hasSignificantPercentages,
            splitResultValid: splitResult.valid,
            splitResultErrors: splitResult.errors,
            negocioCorretora: data.negocioCorretora,
          });

          if (hasSignificantPercentages && !splitResult.valid) {
            const { ValidationError } = await import('@ecotech/shared/utils');
            console.error(
              '❌ [Validação Comissão] Erro:',
              splitResult.errors.join(', '),
            );
            throw new ValidationError(splitResult.errors.join(', '));
          }

          // Se tem percentuais válidos, calcular os valores
          if (splitResult.valid && hasSignificantPercentages) {
            updateData.valorComissao =
              splitResult.valorComissaoTotal.toString();
            updateData.valorComissaoPrincipal =
              splitResult.valorComissaoPrincipal?.toString() || null;
            updateData.valorComissaoSecundario =
              splitResult.valorComissaoSecundario?.toString() || null;
            updateData.valorComissaoTerceiro =
              splitResult.valorComissaoTerceiro?.toString() || null;
            updateData.valorComissaoCorretora =
              splitResult.valorComissaoCorretora?.toString() || null;
          }
        } else {
          // Legacy single vendor mode
          const percentual =
            data.percentualComissao ??
            parseFloat(cotacao.percentualComissao || '0');
          updateData.valorComissao = calculateComissaoSimples(
            premio,
            percentual,
          ).toString();
        }
      }

      if (data.vigenciaInicio !== undefined)
        updateData.vigenciaInicio = data.vigenciaInicio;
      if (data.vigenciaFim !== undefined)
        updateData.vigenciaFim = data.vigenciaFim;
      if (data.premioLiquido !== undefined)
        updateData.premioLiquido = data.premioLiquido?.toString() ?? null;
      if (data.percentualComissao !== undefined)
        updateData.percentualComissao =
          data.percentualComissao?.toString() ?? null;
      if (data.produtoId !== undefined) updateData.produtoId = data.produtoId;
      if (data.seguradoraParceiraId !== undefined)
        updateData.seguradoraParceiraId = data.seguradoraParceiraId;
      // Vendedor principal é decisão comercial (quem recebe comissão) —
      // independente de atuante (quem opera). Não sincronizar: senão quem edita
      // "rouba" o atuante quando troca o vendedor principal.
      if (data.vendedorId !== undefined) {
        updateData.vendedorId = data.vendedorId;
      }

      // Commission split fields
      if (data.vendedorSecundarioId !== undefined)
        updateData.vendedorSecundarioId = data.vendedorSecundarioId;
      if (data.vendedorTerceiroId !== undefined)
        updateData.vendedorTerceiroId = data.vendedorTerceiroId;
      if (data.percentualComissaoPrincipal !== undefined)
        updateData.percentualComissaoPrincipal =
          data.percentualComissaoPrincipal?.toString() ?? null;
      if (data.percentualComissaoSecundario !== undefined)
        updateData.percentualComissaoSecundario =
          data.percentualComissaoSecundario?.toString() ?? null;
      if (data.percentualComissaoTerceiro !== undefined)
        updateData.percentualComissaoTerceiro =
          data.percentualComissaoTerceiro?.toString() ?? null;
      if (data.percentualCorretora !== undefined)
        updateData.percentualCorretora =
          data.percentualCorretora?.toString() ?? null;
      if (data.negocioCorretora !== undefined)
        updateData.negocioCorretora = data.negocioCorretora;
      if (data.isFechado !== undefined)
        updateData.isFechado = data.isFechado;

      if (data.clienteId !== undefined) {
        const clienteNovo = await db.query.clientes.findFirst({
          where: and(
            eq(clientes.id, data.clienteId),
            eq(clientes.corretoraId, request.corretoraId),
            isNull(clientes.deletedAt),
          ),
        });
        if (!clienteNovo) {
          throw new NotFoundError('Cliente não encontrado');
        }
        updateData.clienteId = data.clienteId;
      }

      if (data.situacao !== undefined)
        updateData.situacao = data.situacao;
      if (data.itemDescricao !== undefined)
        updateData.itemDescricao = data.itemDescricao;
      if (data.coberturas !== undefined)
        updateData.coberturas = data.coberturas;
      if (data.detalhesRisco !== undefined)
        updateData.detalhesRisco = data.detalhesRisco;
      if (data.status !== undefined)
        updateData.status = data.status;
      if (data.etapa !== undefined)
        updateData.etapa = data.etapa;

      const [updated] = await db
        .update(cotacoes)
        .set(updateData)
        .where(eq(cotacoes.id, id))
        .returning();

      return ok(mapCotacao(updated) as any);
    },
  );

  // Delete quotation
  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['Cotações'],
        summary: 'Excluir cotação',
        description:
          'Exclui uma cotação da seguradora. Requer permissão de exclusão de cotações. Só é possível excluir cotações em elaboração.',
        ...cotacoesDocs.excluir,
      },
      preHandler: [
        authorize(['vendas:excluir_cotacao']),
        requireOwnership('cotacao'),
        requireStatus('cotacao', ['EM_ELABORACAO']),
      ],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      // Ownership e status já foram validados pelos middlewares

      await db
        .update(cotacoes)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(cotacoes.id, id));

      return { success: true as const, message: 'Cotação excluída com sucesso' };
    },
  );

  // Archive quotation (soft delete visível na planilha)
  fastify.patch(
    '/:id/archive',
    {
      schema: { tags: ['Cotações'], summary: 'Arquivar cotação (soft delete)' },
      preHandler: [authorize(['vendas:excluir_cotacao'])],
    },
    async (request) => {
      const { NotFoundError, UnprocessableEntityError } = await import('@ecotech/shared/utils');
      const { id } = request.params as { id: string };

      const cotacao = await db.query.cotacoes.findFirst({
        where: and(eq(cotacoes.id, id), eq(cotacoes.corretoraId, request.corretoraId), isNull(cotacoes.deletedAt)),
      });

      if (!cotacao) throw new NotFoundError('Cotação');
      if (cotacao.status === 'CONVERTIDA')
        throw new UnprocessableEntityError('Cotações convertidas em documento de venda não podem ser arquivadas');

      const dr = (cotacao.detalhesRisco as any) ?? {};
      await db.update(cotacoes).set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        detalhesRisco: { ...dr, _softDeleted: { userId: request.user.sub, userName: request.user.nome, at: new Date().toISOString() } },
      }).where(eq(cotacoes.id, id));

      return ok({ message: 'Cotação arquivada com sucesso' } as any);
    },
  );

  // Restore archived quotation
  fastify.post(
    '/:id/restore',
    {
      schema: { tags: ['Cotações'], summary: 'Restaurar cotação arquivada' },
      preHandler: [authorize(['vendas:excluir_cotacao'])],
    },
    async (request) => {
      const { NotFoundError } = await import('@ecotech/shared/utils');
      const { id } = request.params as { id: string };

      const cotacao = await db.query.cotacoes.findFirst({
        where: and(eq(cotacoes.id, id), eq(cotacoes.corretoraId, request.corretoraId), isNotNull(cotacoes.deletedAt)),
      });

      if (!cotacao) throw new NotFoundError('Cotação');

      const dr = (cotacao.detalhesRisco as any) ?? {};
      const { _softDeleted, ...drClean } = dr;
      await db.update(cotacoes).set({
        deletedAt: null,
        updatedAt: new Date(),
        detalhesRisco: Object.keys(drClean).length > 0 ? drClean : null,
      }).where(eq(cotacoes.id, id));

      return ok({ message: 'Cotação restaurada com sucesso' } as any);
    },
  );

  // Mark quotation as lost
  fastify.post(
    '/:id/mark-as-lost',
    {
      schema: {
        tags: ['Cotações'],
        summary: 'Marcar cotação como perdida',
        description:
          'Marca uma cotação como perdida com rastreamento de motivo. Requer permissão de edição de cotações.',
        ...cotacoesDocs.marcarPerdida,
      },
      preHandler: [authorize(['vendas:editar_cotacao'])],
    },
    async (request) => {
      const { NotFoundError, ValidationError, UnprocessableEntityError } = await import(
        '@ecotech/shared/utils'
      );
      const { id } = request.params as { id: string };

      let data;
      try {
        data = marcarPerdidaSchema.parse(request.body);
      } catch (error: any) {
        fastify.log.error(
          { body: request.body, error: error.message, issues: error.issues },
          'Erro na validação do schema marcar perdida',
        );
        throw error;
      }

      const cotacao = await db.query.cotacoes.findFirst({
        where: and(
          eq(cotacoes.id, id),
          eq(cotacoes.corretoraId, request.corretoraId),
          isNull(cotacoes.deletedAt),
        ),
      });

      if (!cotacao) {
        throw new NotFoundError('Cotação');
      }

      if (cotacao.status !== 'EM_ELABORACAO') {
        throw new UnprocessableEntityError(
          'Só é possível marcar como perdida cotações em elaboração',
        );
      }

      const { generateNumeroDocumentoVenda } = await import(
        '@ecotech/shared/utils'
      );

      const { updated, documentoVenda } = await db.transaction(async (tx) => {
        const now = new Date();
        const ano = now.getFullYear();
        const mes = now.getMonth() + 1;
        const prefix = 'VD-PERD';
        const anoMes = `${ano}${String(mes).padStart(2, '0')}`;

        // Busca o maior sequencial já usado para VD-PERD neste mês/corretora
        const maxResult = await tx
          .select({ max: sql<string>`MAX(numero_documento)` })
          .from(documentosVenda)
          .where(
            and(
              eq(documentosVenda.corretoraId, request.corretoraId),
              sql`numero_documento LIKE ${`${prefix}-${anoMes}-%`}`,
            ),
          );

        const lastNum = maxResult[0]?.max
          ? parseInt(maxResult[0].max.split('-').pop() ?? '0', 10)
          : 0;
        const sequencial = lastNum + 1;
        const numeroDocumento = generateNumeroDocumentoVenda(
          'COTACAO_PERDIDA',
          sequencial,
        );

        const [updated] = await tx
          .update(cotacoes)
          .set({
            status: 'PERDIDA',
            motivoPerda: data.motivoPerda,
            detalhesPerda: data.detalhesPerda,
            concorrenteGanhou: data.concorrenteGanhou,
            dataMarcadaPerdida: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(cotacoes.id, id))
          .returning();

        const [documentoVenda] = await tx
          .insert(documentosVenda)
          .values({
            corretoraId: request.corretoraId,
            clienteId: cotacao.clienteId,
            vendedorId: cotacao.vendedorId,
            produtoId: cotacao.produtoId,
            numeroDocumento,
            tipoDocumento: 'COTACAO_PERDIDA',
            status: 'PERDIDO',
            vigenciaInicio: cotacao.vigenciaInicio,
            vigenciaFim: cotacao.vigenciaFim,
            moeda: 'BRL',
            premioLiquido: cotacao.premioLiquido,
            percentualComissao: cotacao.percentualComissao,
            valorComissao: cotacao.valorComissao,
            negocioCorretora: cotacao.negocioCorretora,
            percentualCorretora: cotacao.percentualCorretora,
            valorComissaoCorretora: cotacao.valorComissaoCorretora,
            coberturas: cotacao.coberturas,
            itemDescricao: cotacao.itemDescricao ?? null,
            motivoPerda: data.motivoPerda,
            detalhesPerda: data.detalhesPerda,
            concorrenteGanhou: data.concorrenteGanhou,
            dataPerda: new Date(),
            metadata: {
              cotacaoId: id,
              numeroCotacao: cotacao.numeroCotacao,
              aguardandoAprovacaoPerda: true,
            },
          })
          .returning();

        await tx
          .update(cotacoes)
          .set({ documentoVendaId: documentoVenda.id, updatedAt: new Date() })
          .where(eq(cotacoes.id, id));

        // Se a cotação é de uma renovação, marcar a renovação como PERDIDO também
        if (cotacao.situacao === 'RENOVACAO') {
          const detalhesRisco = cotacao.detalhesRisco as any;
          const renovacaoId = detalhesRisco?.renovacaoId;

          const updateRenovacaoPayload = {
            status: 'PERDIDO' as const,
            motivoPerda: data.motivoPerda.substring(0, 50),
            detalhesPerda: data.detalhesPerda,
            concorrenteGanhou: data.concorrenteGanhou,
            dataPerda: new Date(),
            updatedAt: new Date(),
          };

          if (renovacaoId) {
            await tx
              .update(renovacoesComerciais)
              .set(updateRenovacaoPayload)
              .where(eq(renovacoesComerciais.id, renovacaoId));

            fastify.log.info(
              `Renovação ${renovacaoId} marcada como PERDIDA junto com a cotação ${id}`,
            );
          } else if (cotacao.clienteId) {
            // Fallback para cotações antigas que não têm renovacaoId em detalhes_risco
            const renovacoesAtivas = await tx
              .select({ id: renovacoesComerciais.id })
              .from(renovacoesComerciais)
              .where(
                and(
                  eq(renovacoesComerciais.corretoraId, request.corretoraId),
                  eq(renovacoesComerciais.clienteId, cotacao.clienteId),
                  notInArray(renovacoesComerciais.status, ['RENOVADO', 'PERDIDO', 'CANCELADO']),
                ),
              );

            if (renovacoesAtivas.length > 0) {
              await tx
                .update(renovacoesComerciais)
                .set(updateRenovacaoPayload)
                .where(inArray(renovacoesComerciais.id, renovacoesAtivas.map((r) => r.id)));

              fastify.log.info(
                `${renovacoesAtivas.length} renovação(ões) marcada(s) como PERDIDA via fallback junto com a cotação ${id}`,
              );
            }
          }
        }

        return { updated, documentoVenda };
      });

      return { ...ok({ cotacao: mapCotacao(updated) as any, documentoVenda }), message: 'Cotação marcada como perdida e enviada para aprovação do cadastro' };
    },
  );

  // Reabrir cotação perdida
  fastify.post(
    '/:id/reopen',
    {
      schema: {
        tags: ['Cotações'],
        summary: 'Reabrir cotação perdida',
        description:
          'Reverte a cotação de PERDIDA para EM_ELABORACAO e cancela o documento de venda gerado. Se houver renovação vinculada em PERDIDO, ela também é revertida.',
        ...cotacoesDocs.reabrir,
      },
      preHandler: [authorize(['vendas:editar_todos_documentos'])],
    },
    async (request) => {
      const { NotFoundError, UnprocessableEntityError } = await import('@ecotech/shared/utils');
      const { id } = request.params as { id: string };

      const cotacao = await db.query.cotacoes.findFirst({
        where: and(
          eq(cotacoes.id, id),
          eq(cotacoes.corretoraId, request.corretoraId),
          isNull(cotacoes.deletedAt),
        ),
      });

      if (!cotacao) throw new NotFoundError('Cotação');
      if (cotacao.status !== 'PERDIDA')
        throw new UnprocessableEntityError('Apenas cotações com status PERDIDA podem ser reabertas');

      await db.transaction(async (tx) => {
        // Cancela o documento de venda COTACAO_PERDIDA vinculado
        if (cotacao.documentoVendaId) {
          await tx
            .update(documentosVenda)
            .set({ status: 'CANCELADO', updatedAt: new Date() })
            .where(eq(documentosVenda.id, cotacao.documentoVendaId));
        }

        // Reverte a cotação para EM_ELABORACAO
        await tx
          .update(cotacoes)
          .set({
            status: 'EM_ELABORACAO',
            documentoVendaId: null,
            dataMarcadaPerdida: null,
            motivoPerda: null,
            detalhesPerda: null,
            concorrenteGanhou: null,
            updatedAt: new Date(),
          })
          .where(eq(cotacoes.id, id));

        // Se havia renovação vinculada e está PERDIDA, reverte também
        if (cotacao.situacao === 'RENOVACAO') {
          const detalhesRisco = cotacao.detalhesRisco as any;
          const renovacaoId = detalhesRisco?.renovacaoId;
          if (renovacaoId) {
            const renovacao = await tx.query.renovacoesComerciais.findFirst({
              where: eq(renovacoesComerciais.id, renovacaoId),
              columns: { status: true, statusAntesPerda: true },
            });
            if (renovacao?.status === 'PERDIDO') {
              const statusAnterior = renovacao.statusAntesPerda ?? 'NAO_TRABALHADO';
              await tx
                .update(renovacoesComerciais)
                .set({
                  status: statusAnterior,
                  statusAntesPerda: null,
                  dataPerda: null,
                  motivoPerda: null,
                  concorrenteGanhou: null,
                  detalhesPerda: null,
                  updatedAt: new Date(),
                })
                .where(eq(renovacoesComerciais.id, renovacaoId));
            }
          }
        }
      });

      const cotacaoAtualizada = await db.query.cotacoes.findFirst({
        where: eq(cotacoes.id, id),
      });

      if (!cotacaoAtualizada) throw new NotFoundError('Cotação');

      return ok(mapCotacao(cotacaoAtualizada) as any);
    },
  );

  // Add/change vendor for quotation
  fastify.post(
    '/:id/sellers',
    {
      schema: {
        tags: ['Cotações'],
        summary: 'Adicionar/trocar vendedor',
        description:
          'Adiciona ou troca o vendedor responsável pela cotação. Mantém histórico completo de mudanças.',
        ...cotacoesDocs.adicionarVendedor,
      },
      preHandler: [authorize(['vendas:editar_cotacao'])],
    },
    async (request) => {
      const { NotFoundError } = await import('@ecotech/shared/utils');
      const { id } = request.params as { id: string };
      const { vendedorId } = request.body as { vendedorId: string };

      const cotacao = await db.query.cotacoes.findFirst({
        where: and(
          eq(cotacoes.id, id),
          eq(cotacoes.corretoraId, request.corretoraId),
          isNull(cotacoes.deletedAt),
        ),
      });

      if (!cotacao) {
        throw new NotFoundError('Cotação');
      }

      // Verify new vendor exists and belongs to tenant
      const vendedor = await db.query.usuarios.findFirst({
        where: and(
          eq(usuarios.id, vendedorId),
          eq(usuarios.corretoraId, request.corretoraId),
          eq(usuarios.ativo, true),
          isNull(usuarios.deletedAt),
        ),
      });

      if (!vendedor) {
        throw new NotFoundError('Vendedor');
      }

      await db.transaction(async (tx) => {
        // Deactivate current vendor
        await tx
          .update(cotacaoVendedores)
          .set({ ativo: false })
          .where(
            and(
              eq(cotacaoVendedores.cotacaoId, id),
              eq(cotacaoVendedores.ativo, true),
            ),
          );

        // Add new vendor
        await tx.insert(cotacaoVendedores).values({
          cotacaoId: id,
          vendedorId,
          atribuidoPor: request.user.sub,
          ativo: true,
        });

        // Update main cotacao table
        await tx
          .update(cotacoes)
          .set({
            vendedorId,
            updatedAt: new Date(),
          })
          .where(eq(cotacoes.id, id));
      });

      // Notificar vendedor se foi atribuído por outra pessoa
      if (vendedorId !== request.user.sub) {
        const clienteAtribuicao = await db.query.clientes.findFirst({
          where: eq(clientes.id, cotacao.clienteId),
          columns: { nome: true },
        });

        NotificacaoService.notificarCotacaoAtribuida({
          corretoraId: request.corretoraId,
          cotacaoId: id,
          clienteNome: clienteAtribuicao?.nome ?? 'Cliente',
          atribuidoPorNome: request.user.nome,
          vendedorId,
        }).catch((err) => {
          console.error('Erro ao criar notificação de cotação atribuída:', err);
        });
      }

      return { success: true as const, message: 'Vendedor atualizado com sucesso' };
    },
  );

  // Get vendor history for quotation
  fastify.get(
    '/:id/sellers',
    {
      schema: {
        tags: ['Cotações'],
        summary: 'Obter histórico de vendedores',
        description:
          'Retorna o histórico completo de vendedores atribuídos à cotação.',
        ...cotacoesDocs.listarVendedores,
      },
      preHandler: [
        authorizeAny([
          'vendas:visualizar_cotacao',
          'vendas:visualizar_todos_documentos',
        ]),
      ],
    },
    async (request) => {
      const { NotFoundError } = await import('@ecotech/shared/utils');
      const { id } = request.params as { id: string };

      const cotacao = await db.query.cotacoes.findFirst({
        where: and(
          eq(cotacoes.id, id),
          eq(cotacoes.corretoraId, request.corretoraId),
          isNull(cotacoes.deletedAt),
        ),
      });

      if (!cotacao) {
        throw new NotFoundError('Cotação');
      }

      const vendedoresHistorico = await db
        .select({
          id: cotacaoVendedores.id,
          cotacaoId: cotacaoVendedores.cotacaoId,
          vendedorId: cotacaoVendedores.vendedorId,
          vendedor: {
            id: usuarios.id,
            nome: usuarios.nome,
            email: usuarios.email,
          },
          dataAtribuicao: cotacaoVendedores.dataAtribuicao,
          atribuidoPor: cotacaoVendedores.atribuidoPor,
          ativo: cotacaoVendedores.ativo,
        })
        .from(cotacaoVendedores)
        .leftJoin(usuarios, eq(cotacaoVendedores.vendedorId, usuarios.id))
        .where(eq(cotacaoVendedores.cotacaoId, id))
        .orderBy(desc(cotacaoVendedores.dataAtribuicao));

      return ok(vendedoresHistorico);
    },
  );

  // Confirm sale - creates sale document with AGUARDANDO_CADASTRO status
  fastify.post(
    '/:id/confirm-sale',
    {
      schema: {
        tags: ['Cotações'],
        summary: 'Confirmar venda',
        description:
          'Confirma a venda da cotação aprovada, criando automaticamente um documento de venda com status AGUARDANDO_CADASTRO.',
        ...cotacoesDocs.confirmarVenda,
      },
      preHandler: [authorize(['vendas:criar_documento_venda'])],
    },
    async (request) => {
      const { NotFoundError, UnprocessableEntityError } = await import(
        '@ecotech/shared/utils'
      );
      const { id } = request.params as { id: string };

      const cotacao = await db.query.cotacoes.findFirst({
        where: and(
          eq(cotacoes.id, id),
          eq(cotacoes.corretoraId, request.corretoraId),
          isNull(cotacoes.deletedAt),
        ),
      });

      if (!cotacao) {
        throw new NotFoundError('Cotação');
      }

      if (cotacao.status !== 'EM_ELABORACAO') {
        throw new UnprocessableEntityError(
          'Só é possível confirmar vendas de cotações em elaboração',
        );
      }

      const body = (request.body as any) ?? {};
      const skipAnexosCheck = body.skipAnexosCheck === true;
      const fechadorId: string | undefined = body.fechadorId ?? undefined;
      const bodyVigenciaInicio: string | undefined = body.vigenciaInicio ?? undefined;
      const bodyVigenciaFim: string | undefined = body.vigenciaFim ?? undefined;

      if (!bodyVigenciaInicio || !bodyVigenciaFim) {
        throw new UnprocessableEntityError(
          'Informe a vigência da nova apólice antes de confirmar a venda',
        );
      }

      if (bodyVigenciaFim <= bodyVigenciaInicio) {
        throw new UnprocessableEntityError(
          'A data de fim da vigência deve ser posterior à data de início',
        );
      }

      if (fechadorId) {
        const fechador = await db.query.usuarios.findFirst({
          where: and(
            eq(usuarios.id, fechadorId),
            eq(usuarios.corretoraId, request.corretoraId),
          ),
        });
        if (!fechador) {
          const { NotFoundError: NF } = await import('@ecotech/shared/utils');
          throw new NF('Fechador');
        }
      }

      // Verificar se há pelo menos um anexo (opcional via skipAnexosCheck)
      const anexosCotacao = await db.query.anexos.findMany({
        where: and(
          eq(anexos.entidadeTipo, 'cotacao'),
          eq(anexos.entidadeId, id),
          isNull(anexos.deletedAt),
        ),
      });

      if (!skipAnexosCheck && anexosCotacao.length === 0) {
        throw new UnprocessableEntityError(
          'É obrigatório anexar pelo menos um documento antes de confirmar a venda',
        );
      }

      // Generate document number and create doc + convert cotação in transaction
      const { generateNumeroDocumentoVenda } = await import(
        '@ecotech/shared/utils'
      );

      const documentoVenda = await db.transaction(async (tx) => {
        const now = new Date();
        const prefix = 'VD-COT';
        const anoMes = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Lock to prevent race condition: two concurrent confirm-sale calls computing
        // the same MAX and hitting the unique constraint on numero_documento.
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${request.corretoraId + ':vd-cot'}))`);

        const maxResult = await tx
          .select({ max: sql<string>`MAX(numero_documento)` })
          .from(documentosVenda)
          .where(
            and(
              eq(documentosVenda.corretoraId, request.corretoraId),
              sql`numero_documento LIKE ${`${prefix}-${anoMes}-%`}`,
            ),
          );
        const lastNum = maxResult[0]?.max
          ? parseInt(maxResult[0].max.split('-').pop() ?? '0', 10)
          : 0;
        const sequencial = lastNum + 1;
        const numeroDocumento = generateNumeroDocumentoVenda(
          'COTACAO_DIRETA',
          sequencial,
        );

        // Create sale document
        const [doc] = await tx
          .insert(documentosVenda)
          .values({
            corretoraId: request.corretoraId,
            clienteId: cotacao.clienteId,
            vendedorId: cotacao.vendedorId,
            vendedorSecundarioId: (cotacao as any).vendedorSecundarioId ?? null,
            vendedorTerceiroId: (cotacao as any).vendedorTerceiroId ?? null,
            atuanteId: (cotacao as any).atuanteId ?? cotacao.vendedorId,
            produtoId: cotacao.produtoId,
            seguradoraParceiraId: cotacao.seguradoraParceiraId,
            numeroDocumento,
            tipoDocumento: 'COTACAO_DIRETA',
            status: 'AGUARDANDO_CADASTRO',
            vigenciaInicio: bodyVigenciaInicio,
            vigenciaFim: bodyVigenciaFim,
            moeda: 'BRL',
            premioLiquido: cotacao.premioLiquido,
            percentualComissao: cotacao.percentualComissao,
            valorComissao: cotacao.valorComissao,
            // Commission split fields (only fields that exist in documentosVenda schema)
            negocioCorretora: cotacao.negocioCorretora,
            percentualCorretora: cotacao.percentualCorretora,
            valorComissaoCorretora: cotacao.valorComissaoCorretora,
            coberturas: cotacao.coberturas,
            itemDescricao: cotacao.itemDescricao ?? null,
            metadata: {
              cotacaoId: id,
              numeroCotacao: cotacao.numeroCotacao,
              ...((cotacao.detalhesRisco as any)?.renovacaoId ? { renovacaoId: (cotacao.detalhesRisco as any).renovacaoId } : {}),
            },
          })
          .returning();

        // Mark quotation as converted
        await tx
          .update(cotacoes)
          .set({
            status: 'CONVERTIDA',
            documentoVendaId: doc.id,
            updatedAt: new Date(),
          })
          .where(eq(cotacoes.id, id));

        // Register fechador if provided
        if (fechadorId) {
          await tx.insert(cotacaoVendedores).values({
            cotacaoId: id,
            vendedorId: fechadorId,
            atribuidoPor: request.user.sub,
            ativo: true,
            papel: 'FECHADOR',
          });
        }

        // Reassociate attachments to the new document inside the transaction so
        // they are never lost even if the R2 rename below fails.
        if (anexosCotacao.length > 0) {
          await tx
            .update(anexos)
            .set({ entidadeTipo: 'documento_venda', entidadeId: doc.id })
            .where(
              and(
                eq(anexos.entidadeTipo, 'cotacao'),
                eq(anexos.entidadeId, id),
                isNull(anexos.deletedAt),
              ),
            );
        }

        // Atualizar renovação vinculada dentro da TX — garante atomicidade com a criação do documento.
        // WHERE inclui EM_NEGOCIACAO para idempotência (double-submit ou status já avançado).
        const detalhesRiscoTx = cotacao.detalhesRisco as any;
        const renovacaoIdTx = detalhesRiscoTx?.renovacaoId;
        if (renovacaoIdTx) {
          const [renovacaoAtualizada] = await tx
            .update(renovacoesComerciais)
            .set({
              documentoVendaNovoId: doc.id,
              novaVigenciaInicio: bodyVigenciaInicio,
              novaVigenciaFim: bodyVigenciaFim,
              status: 'EM_NEGOCIACAO',
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(renovacoesComerciais.id, renovacaoIdTx),
                eq(renovacoesComerciais.corretoraId, request.corretoraId),
                sql`${renovacoesComerciais.status} IN ('NAO_TRABALHADO', 'EM_PROSPECCAO', 'EM_NEGOCIACAO')`,
              ),
            )
            .returning({ id: renovacoesComerciais.id });
          if (!renovacaoAtualizada) {
            fastify.log.warn(
              `confirm-sale: renovação ${renovacaoIdTx} não encontrada ou em status inesperado — ` +
              `documento ${doc.id} criado sem vínculo na renovação.`,
            );
          } else {
            fastify.log.info(
              `confirm-sale: renovação ${renovacaoIdTx} vinculada ao documento ${doc.id} (EM_NEGOCIACAO).`,
            );
          }
        }

        return doc;
      });

      // Best-effort: rename R2 keys to match new entity path (cosmetic only — DB is already updated above)
      if (anexosCotacao.length > 0) {
        try {
          const { storageClient } = await import('@ecotech/shared/storage');

          fastify.log.info(
            `🔄 Renomeando ${anexosCotacao.length} keys R2 de cotacao/${id} para documento_vendas/${documentoVenda.id}`,
          );

          const resultados = await Promise.allSettled(
            anexosCotacao.map(async (anexo) => {
              const partes = anexo.r2Key.split('/');
              const nomeArquivo = partes.pop();
              const corretoraId = partes[0];

              if (!corretoraId || !nomeArquivo) {
                throw new Error(`r2Key inválido: ${anexo.r2Key}`);
              }

              const novoR2Key = `${corretoraId}/documento_vendas/${documentoVenda.id}/${nomeArquivo}`;
              await storageClient.move(anexo.r2Key, novoR2Key);
              return { id: anexo.id, nomeOriginal: anexo.nomeOriginal, novoR2Key };
            }),
          );

          const movimentosSucesso: { id: string; novoR2Key: string }[] = [];
          for (const [i, resultado] of resultados.entries()) {
            if (resultado.status === 'fulfilled') {
              fastify.log.info(`  ✅ ${resultado.value.nomeOriginal} renomeado`);
              movimentosSucesso.push({ id: resultado.value.id, novoR2Key: resultado.value.novoR2Key });
            } else {
              const fileError = resultado.reason as any;
              fastify.log.error(`  ❌ Erro ao renomear ${anexosCotacao[i]?.nomeOriginal}: ${fileError.message}`);
              if (fileError.Code) fastify.log.error(`     AWS Error Code: ${fileError.Code}`);
            }
          }

          if (movimentosSucesso.length > 0) {
            await db.execute(sql`
              UPDATE anexo SET
                r2_key = CASE id
                  ${sql.join(
                    movimentosSucesso.map((m) => sql`WHEN ${m.id}::uuid THEN ${m.novoR2Key}`),
                    sql` `,
                  )}
                END
              WHERE id IN (${sql.join(movimentosSucesso.map((m) => sql`${m.id}::uuid`), sql`, `)})
            `);
          }

          fastify.log.info(`✅ Renomeação de keys R2 concluída para documento ${documentoVenda.id}`);
        } catch (error) {
          fastify.log.error({ error }, '❌ Erro ao renomear keys R2 (anexos já vinculados ao documento)');
        }
      }

      // Notificar equipe de cadastro sobre nova venda aguardando aprovação
      const cliente = await db.query.clientes.findFirst({
        where: eq(clientes.id, documentoVenda.clienteId),
        columns: { nome: true },
      });

      NotificacaoService.notificarAprovacaoPendente({
        corretoraId: request.corretoraId,
        documentoId: documentoVenda.id,
        numeroDocumento: documentoVenda.numeroDocumento,
        clienteNome: cliente?.nome || 'Cliente',
        vendedorNome: request.user.nome,
      }).catch((err) => {
        console.error('Erro ao criar notificação de aprovação pendente:', err);
      });

      // Registrar histórico: criação + envio ao cadastro
      const corretoresSnapshot = {
        vendedorId: documentoVenda.vendedorId,
        vendedorSecundarioId: documentoVenda.vendedorSecundarioId,
        vendedorTerceiroId: documentoVenda.vendedorTerceiroId,
        atuanteId: documentoVenda.atuanteId,
        cotacaoId: id,
        numeroCotacao: cotacao.numeroCotacao,
      };
      try {
        await db.insert(historicoDocumentoVenda).values([
          {
            documentoVendaId: documentoVenda.id,
            tipoEvento: 'CRIACAO',
            usuarioId: request.user.sub,
            usuarioNome: request.user.nome,
            statusNovo: 'AGUARDANDO_CADASTRO',
            descricao: `Documento criado a partir da cotação ${cotacao.numeroCotacao}`,
            dadosAlterados: corretoresSnapshot,
          },
          {
            documentoVendaId: documentoVenda.id,
            tipoEvento: 'SOLICITACAO_CADASTRO',
            usuarioId: request.user.sub,
            usuarioNome: request.user.nome,
            statusAnterior: 'AGUARDANDO_CADASTRO',
            statusNovo: 'AGUARDANDO_CADASTRO',
            descricao: 'Venda confirmada e enviada automaticamente para cadastro',
            dadosAlterados: corretoresSnapshot,
          },
        ]);
      } catch (histError) {
        // Histórico é auditoria — não deve reverter uma venda já confirmada.
        fastify.log.error({ histError }, `Erro ao registrar histórico do documento ${documentoVenda.id}`);
      }

      return { ...ok(documentoVenda), message: 'Venda confirmada! Documento enviado para cadastro.' };
    },
  );

  // --- COMENTÁRIOS ---

  // Listar comentários de uma cotação (retorna threaded: top-level com replies aninhadas)
  fastify.get(
    '/:id/comments',
    {
      schema: { tags: ['Cotações'], summary: 'Listar comentários de uma cotação', ...cotacoesDocs.listarComentarios },
      preHandler: [authorize(['vendas:visualizar_cotacao'])],
    },
    async (request) => {
      const { comentarios } = await import('@ecotech/shared/database');
      const { id } = request.params as { id: string };

      const cotacao = await db.query.cotacoes.findFirst({
        where: and(eq(cotacoes.id, id), eq(cotacoes.corretoraId, request.corretoraId)),
      });
      if (!cotacao) {
        const { NotFoundError } = await import('@ecotech/shared/utils');
        throw new NotFoundError('Cotação não encontrada');
      }

      const rows = await db
        .select({
          id: comentarios.id,
          parentId: comentarios.parentId,
          texto: comentarios.texto,
          createdAt: comentarios.createdAt,
          autor: { id: usuarios.id, nome: usuarios.nome, avatarR2Key: usuarios.avatarR2Key },
        })
        .from(comentarios)
        .innerJoin(usuarios, eq(comentarios.autorId, usuarios.id))
        .where(and(eq(comentarios.entidadeId, id), eq(comentarios.entidadeTipo, 'cotacao'), eq(comentarios.corretoraId, request.corretoraId)))
        .orderBy(comentarios.createdAt);

      const withAvatars = await Promise.all(
        rows.map(async (c) => ({
          ...c,
          autor: { id: c.autor.id, nome: c.autor.nome, avatarUrl: await getAvatarUrl(c.autor.avatarR2Key) },
        })),
      );

      const map = new Map(withAvatars.map((c) => [c.id, { ...c, replies: [] as typeof withAvatars }]));
      const tree: typeof withAvatars = [];
      for (const c of map.values()) {
        if (c.parentId && map.has(c.parentId)) {
          map.get(c.parentId)!.replies.push(c);
        } else {
          tree.push(c as any);
        }
      }

      return ok(tree as any);
    },
  );

  // Adicionar comentário (ou resposta) a uma cotação
  fastify.post(
    '/:id/comments',
    {
      schema: {
        tags: ['Cotações'],
        summary: 'Adicionar comentário a uma cotação',
        ...cotacoesDocs.adicionarComentario,
      },
      preHandler: [authorize(['vendas:visualizar_cotacao'])],
    },
    async (request, reply) => {
      const { comentarios } = await import('@ecotech/shared/database');
      const { id } = request.params as { id: string };
      const { texto, parentId } = request.body as { texto: string; parentId?: string | null };

      const cotacao = await db.query.cotacoes.findFirst({
        where: and(eq(cotacoes.id, id), eq(cotacoes.corretoraId, request.corretoraId)),
      });
      if (!cotacao) {
        const { NotFoundError } = await import('@ecotech/shared/utils');
        throw new NotFoundError('Cotação não encontrada');
      }

      const [inserted] = await db
        .insert(comentarios)
        .values({ corretoraId: request.corretoraId, entidadeTipo: 'cotacao', entidadeId: id, autorId: request.user.sub, parentId: parentId ?? null, texto: texto.trim() })
        .returning();

      const autor = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, request.user.sub),
        columns: { id: true, nome: true, avatarR2Key: true },
      });

      return reply.status(201).send(ok({ ...inserted, replies: [], autor: { id: autor?.id ?? '', nome: autor?.nome ?? '', avatarUrl: await getAvatarUrl(autor?.avatarR2Key) } } as any));
    },
  );
  // Prospecto rápido: cria cliente stub + cotação sem dados completos
  fastify.post(
    '/prospecto',
    { preHandler: [authorize(['vendas:criar_cotacao'])] },
    async (request, reply) => {
      const { NotFoundError, generateNumeroCotacao } = await import('@ecotech/shared/utils');
      const data = createProspectoSchema.parse(request.body);

      const produto = await db.query.produtos.findFirst({
        where: and(
          eq(produtos.id, data.produtoId),
          eq(produtos.corretoraId, request.corretoraId),
          eq(produtos.ativo, true),
          isNull(produtos.deletedAt),
        ),
      });
      if (!produto) throw new NotFoundError('Produto');

      const hoje = new Date();
      const vigenciaInicio = hoje.toISOString().slice(0, 10);
      const vigenciaFim = new Date(hoje.getFullYear() + 1, hoje.getMonth(), hoje.getDate())
        .toISOString()
        .slice(0, 10);

      const [clienteStub] = await db
        .insert(clientes)
        .values({
          corretoraId: request.corretoraId,
          vendedorId: request.user.sub,
          tipoPessoa: 'PF',
          nome: data.nome,
          ativo: true,
        } as any)
        .returning({ id: clientes.id });

      const now = new Date();
      const anoMes = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const maxResult = await db
        .select({ max: sql<string>`MAX(numero_cotacao)` })
        .from(cotacoes)
        .where(and(eq(cotacoes.corretoraId, request.corretoraId), sql`numero_cotacao LIKE ${'COT-' + anoMes + '-%'}`));
      const lastNum = maxResult[0]?.max ? parseInt(maxResult[0].max.split('-').pop() ?? '0', 10) : 0;
      const numeroCotacao = generateNumeroCotacao(request.corretoraId, lastNum + 1);

      const [cotacao] = await db
        .insert(cotacoes)
        .values({
          corretoraId: request.corretoraId,
          clienteId: clienteStub.id,
          vendedorId: request.user.sub,
          produtoId: data.produtoId,
          numeroCotacao,
          vigenciaInicio,
          vigenciaFim,
          situacao: 'NOVO',
          origem: 'MANUAL',
        } as any)
        .returning();

      return reply.status(201).send(ok(cotacao));
    },
  );
};

export default cotacoesRoutes;
