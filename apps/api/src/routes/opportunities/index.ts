import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, and, sql, isNull, ne, desc, count } from 'drizzle-orm';
import { authorize, authorizeAny } from '@ecotech/plugins/authorization';
import { NotFoundError, ValidationError, todayInSP, addCalendarDays } from '@ecotech/shared/utils';
import {
  listOportunidadesQuerySchema,
  createOportunidadeSchema,
  updateOportunidadeSchema,
  atualizarStatusSchema,
  atualizarOrdemSchema,
  transferirOportunidadeSchema,
  adicionarInteracaoSchema,
  vincularClienteSchema,
  oportunidadeResponseSchema,
  oportunidadeComRelacoesResponseSchema,
  interacaoComUsuarioResponseSchema,
  estatisticasKanbanResponseSchema,
} from './schemas.js';
import {
  standardErrorResponses,
  createDataResponseSchema,
  uuidParamSchema,
  successResponseSchema,
} from '../shared/schemas.js';
import { oportunidadesDocs } from '../../docs/oportunidades/schemas.js';

const oportunidadesRoutes: FastifyPluginAsyncZod = async function (fastify) {
  const {
    db,
    oportunidades,
    usuarios,
    clientes,
    tarefas,
    produtos,
    documentosVenda,
    renovacoesComerciais,
    oportunidadesHistorico,
    cotacoes,
    cotacaoVendedores,
  } = await import('@ecotech/shared/database');

  const { generateNumeroDocumentoVenda, generateNumeroCotacao } = await import('@ecotech/shared/utils');

  fastify.addHook('preHandler', fastify.authenticate);

  // GET /oportunidades - Listar
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Oportunidades'],
        summary: 'Listar oportunidades do Kanban',
        description:
          'Lista oportunidades do quadro Kanban. Usuários com permissão "kanban:visualizar_todas" veem todas as oportunidades da corretora. Outros veem apenas oportunidades que criaram ou foram transferidas para eles.',
        ...oportunidadesDocs.listar,
      },
      preHandler: [
        authorizeAny(['kanban:acessar', 'kanban:visualizar', 'kanban:visualizar_todas']),
      ],
    },
    async (request, reply) => {
      const { status, produtoId, vendedorId: vendedorIdFiltro, limit, offset } = request.query as any;
      const { or } = await import('drizzle-orm');

      // Arquivar automaticamente ganha/perdida com mais de 30 dias
      const trintaDiasAtras = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
      await db
        .update(oportunidades)
        .set({ status: 'arquivada', updatedAt: new Date() })
        .where(
          and(
            eq(oportunidades.corretoraId, request.corretoraId),
            isNull(oportunidades.deletedAt),
            or(
              and(
                eq(oportunidades.status, 'ganha'),
                sql`${oportunidades.dataFechamento} IS NOT NULL AND ${oportunidades.dataFechamento} < ${trintaDiasAtras}`,
              ),
              and(
                eq(oportunidades.status, 'perdida'),
                sql`${oportunidades.updatedAt} < ${trintaDiasAtras}`,
              ),
            )!,
          ),
        );

      const podeVerTodas =
        request.user.isAdmin ||
        request.user.permissoes?.includes('kanban:visualizar_todas');

      const conditions = [
        eq(oportunidades.corretoraId, request.corretoraId),
        isNull(oportunidades.deletedAt),
      ];

      // Se não pode ver todas, filtra por:
      // 1. Oportunidades que o usuário criou (vendedorOriginalId)
      // 2. Oportunidades transferidas para ele (vendedorId)
      if (!podeVerTodas) {
        conditions.push(
          or(
            eq(oportunidades.vendedorOriginalId, request.user.sub),
            eq(oportunidades.vendedorId, request.user.sub),
          )!,
        );
      }

      // Filtro por status — se não especificado, exclui arquivadas do board principal
      if (status) {
        conditions.push(eq(oportunidades.status, status));
      } else {
        conditions.push(ne(oportunidades.status, 'arquivada'));
      }

      // Filtro por produto
      if (produtoId) {
        conditions.push(eq(oportunidades.produtoId, produtoId));
      }

      // Filtro por vendedor (apenas para quem pode ver todas)
      if (vendedorIdFiltro && podeVerTodas) {
        conditions.push(eq(oportunidades.vendedorId, vendedorIdFiltro));
      }

      const results = await db.query.oportunidades.findMany({
        where: and(...conditions),
        with: {
          vendedor: {
            columns: {
              id: true,
              nome: true,
              email: true,
              avatarUrl: true,
            },
          },
          vendedorOriginal: {
            columns: {
              id: true,
              nome: true,
              email: true,
              avatarUrl: true,
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
          produto: {
            columns: {
              id: true,
              nomeProduto: true,
            },
          },
        },
        extras: {
          dataRecontato: sql<string | null>`(
            SELECT MIN(t.data_vencimento)::date
            FROM tarefa t
            WHERE t.entidade_id = ${oportunidades.id}
              AND t.entidade_tipo = 'oportunidade'
              AND t.concluida = false
              AND t.deleted_at IS NULL
          )`.as('dataRecontato'),
        },
        orderBy: [oportunidades.ordem, desc(oportunidades.createdAt)],
        ...(limit ? { limit: Number(limit) } : {}),
        ...(offset ? { offset: Number(offset) } : {}),
      });

      return reply.send({
        success: true,
        data: results,
      });
    },
  );

  // GET /oportunidades/ganhas-sem-cliente - Oportunidades ganhas aguardando vinculação de cliente
  fastify.get(
    '/won-without-client',
    {
      schema: {
        tags: ['Oportunidades'],
        summary: 'Oportunidades ganhas aguardando vínculo de cliente',
        ...oportunidadesDocs.listarGanhasSemCliente,
      },
      preHandler: [
        authorizeAny(['kanban:acessar', 'kanban:visualizar', 'kanban:visualizar_todas']),
      ],
    },
    async (request, reply) => {
      const { or } = await import('drizzle-orm');
      const podeVerTodas =
        request.user.isAdmin ||
        request.user.permissoes?.includes('kanban:visualizar_todas');

      const conditions: any[] = [
        eq(oportunidades.corretoraId, request.corretoraId),
        eq(oportunidades.status, 'ganha'),
        isNull(oportunidades.clienteId),
        isNull(oportunidades.deletedAt),
      ];

      if (!podeVerTodas) {
        conditions.push(
          or(
            eq(oportunidades.vendedorOriginalId, request.user.sub),
            eq(oportunidades.vendedorId, request.user.sub),
          )!,
        );
      }

      const lista = await db
        .select()
        .from(oportunidades)
        .where(and(...conditions))
        .orderBy(desc(oportunidades.dataFechamento));

      return reply.send({ success: true, data: lista });
    },
  );

  // GET /oportunidades/:id - Buscar por ID
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Oportunidades'],
        summary: 'Obter detalhes de uma oportunidade',
        description:
          'Retorna informações detalhadas de uma oportunidade específica, incluindo dados do vendedor, cliente e histórico. Respeita permissões de visualização.',
        ...oportunidadesDocs.buscar,
      },
      preHandler: [
        authorizeAny(['kanban:acessar', 'kanban:visualizar', 'kanban:visualizar_todas']),
      ],
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const { or } = await import('drizzle-orm');

      const podeVerTodas =
        request.user.isAdmin ||
        request.user.permissoes?.includes('kanban:visualizar_todas');

      const conditions = [
        eq(oportunidades.id, id),
        eq(oportunidades.corretoraId, request.corretoraId),
        isNull(oportunidades.deletedAt),
      ];

      if (!podeVerTodas) {
        conditions.push(
          or(
            eq(oportunidades.vendedorOriginalId, request.user.sub),
            eq(oportunidades.vendedorId, request.user.sub),
          )!,
        );
      }

      const result = await db.query.oportunidades.findFirst({
        where: and(...conditions),
        with: {
          vendedor: {
            columns: {
              id: true,
              nome: true,
              email: true,
              avatarUrl: true,
            },
          },
          vendedorOriginal: {
            columns: {
              id: true,
              nome: true,
              email: true,
              avatarUrl: true,
            },
          },
          cliente: {
            columns: {
              id: true,
              nome: true,
              razaoSocial: true,
              tipoPessoa: true,
              email: true,
              telefone: true,
            },
          },
        },
      });

      if (!result) {
        throw new NotFoundError('Oportunidade');
      }

      return reply.send({
        success: true,
        data: result,
      });
    },
  );

  // POST /oportunidades - Criar
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Oportunidades'],
        summary: 'Criar nova oportunidade',
        description:
          'Cria uma nova oportunidade no quadro Kanban. Calcula automaticamente a prioridade se configurado. Define ordem no status inicial e registra o vendedor original.',
        ...oportunidadesDocs.criar,
      },
      preHandler: [authorize(['kanban:criar'])],
    },
    async (request, reply) => {
      const dados = request.body as any;
      const { corretoras } = await import('@ecotech/shared/database');

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
      let prioridadeCalculada: 'baixa' | 'media' | 'alta' | 'urgente' = 'baixa';

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

      const vendedorId = dados.vendedorId || request.user.sub;

      const [novaOportunidade] = await db
        .insert(oportunidades)
        .values({
          corretoraId: request.corretoraId,
          vendedorId: vendedorId,
          vendedorOriginalId: request.user.sub, // Sempre o usuário que está criando
          nomeCliente: dados.nomeCliente,
          emailCliente: dados.emailCliente,
          telefoneCliente: dados.telefoneCliente,
          clienteId: dados.clienteId,
          status: dados.status || 'lead',
          prioridade: prioridadeCalculada,
          temperatura: dados.temperatura || 'morno',
          premioEstimado: dados.premioEstimado,
          dataVencimento: dados.dataVencimento
            ? new Date(dados.dataVencimento)
            : undefined,
          produtoId: dados.produtoId || null,
          observacoes: dados.observacoes,
          tags: dados.tags || [],
          origem: dados.origem,
          ordem: maxOrdem.maxOrdem + 1,
        })
        .returning();

      // Log histórico
      await db.insert(oportunidadesHistorico).values({
        oportunidadeId: novaOportunidade.id,
        usuarioId: request.user.sub,
        tipo: 'criacao',
        statusNovo: novaOportunidade.status,
      });

      return reply.code(201).send({
        success: true,
        data: novaOportunidade,
      });
    },
  );

  // PATCH /oportunidades/:id - Atualizar
  fastify.patch(
    '/:id',
    {
      schema: {
        tags: ['Oportunidades'],
        summary: 'Atualizar oportunidade',
        description:
          'Atualiza informações de uma oportunidade do Kanban. Permite editar dados do cliente, vendedor, valores e configurações. A prioridade é calculada automaticamente pelo sistema.',
        ...oportunidadesDocs.atualizar,
      },
      preHandler: [authorize(['kanban:editar'])],
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const dados = request.body as any;

      // Construir objeto de atualização apenas com campos permitidos
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Adicionar apenas campos que foram enviados
      if (dados.nomeCliente !== undefined)
        updateData.nomeCliente = dados.nomeCliente;
      if (dados.emailCliente !== undefined)
        updateData.emailCliente = dados.emailCliente;
      if (dados.telefoneCliente !== undefined)
        updateData.telefoneCliente = dados.telefoneCliente;
      if (dados.vendedorId !== undefined)
        updateData.vendedorId = dados.vendedorId;
      // Prioridade não pode ser editada manualmente - é calculada automaticamente
      if (dados.temperatura !== undefined)
        updateData.temperatura = dados.temperatura;
      if (dados.premioEstimado !== undefined)
        updateData.premioEstimado = dados.premioEstimado;
      if (dados.observacoes !== undefined)
        updateData.observacoes = dados.observacoes;
      if (dados.dataVencimento !== undefined)
        updateData.dataVencimento = new Date(dados.dataVencimento);
      if (dados.tags !== undefined) updateData.tags = dados.tags;
      if (dados.origem !== undefined) updateData.origem = dados.origem;
      if (dados.produtoId !== undefined) updateData.produtoId = dados.produtoId || null;

      const [atualizada] = await db
        .update(oportunidades)
        .set(updateData)
        .where(
          and(
            eq(oportunidades.id, id),
            eq(oportunidades.corretoraId, request.corretoraId),
          ),
        )
        .returning();

      if (!atualizada) {
        throw new NotFoundError('Oportunidade');
      }

      return reply.send({
        success: true,
        data: atualizada,
      });
    },
  );

  // PATCH /oportunidades/:id/mover - Mover entre colunas
  fastify.patch(
    '/:id/move',
    {
      schema: {
        tags: ['Oportunidades'],
        summary: 'Mover oportunidade entre colunas do Kanban',
        description:
          'Move uma oportunidade para outra coluna/status do quadro Kanban, atualizando a ordem relativa das oportunidades. Gerencia automaticamente a reordenação nas colunas de origem e destino.',
        ...oportunidadesDocs.mover,
      },
      preHandler: [authorize(['kanban:editar'])],
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const { novoStatus, novaOrdem } = request.body as any;

      // Buscar oportunidade atual
      const [atual] = await db
        .select()
        .from(oportunidades)
        .where(
          and(
            eq(oportunidades.id, id),
            eq(oportunidades.corretoraId, request.corretoraId),
          ),
        );

      if (!atual) {
        throw new NotFoundError('Oportunidade');
      }

      const statusAnterior = atual.status;

      // Se mudou de coluna
      if (statusAnterior !== novoStatus) {
        // Decrementar ordem das oportunidades no status anterior
        await db
          .update(oportunidades)
          .set({
            ordem: sql`${oportunidades.ordem} - 1`,
          })
          .where(
            and(
              eq(oportunidades.corretoraId, request.corretoraId),
              eq(oportunidades.status, statusAnterior),
              sql`${oportunidades.ordem} > ${atual.ordem}`,
            ),
          );

        // Incrementar ordem das oportunidades no novo status
        await db
          .update(oportunidades)
          .set({
            ordem: sql`${oportunidades.ordem} + 1`,
          })
          .where(
            and(
              eq(oportunidades.corretoraId, request.corretoraId),
              eq(oportunidades.status, novoStatus),
              sql`${oportunidades.ordem} >= ${novaOrdem}`,
            ),
          );
      }

      // Se estava perdida e está sendo reativada (não arquivada), conclui tarefas de recontato pendentes
      if (statusAnterior === 'perdida' && novoStatus !== 'perdida' && novoStatus !== 'arquivada') {
        await db
          .update(tarefas)
          .set({ concluida: true, updatedAt: new Date() })
          .where(
            and(
              eq(tarefas.entidadeId, id),
              eq(tarefas.entidadeTipo, 'oportunidade'),
              eq(tarefas.concluida, false),
              isNull(tarefas.deletedAt),
            ),
          );
      }

      // Atualizar a oportunidade
      const [atualizada] = await db
        .update(oportunidades)
        .set({
          status: novoStatus,
          ordem: novaOrdem,
          updatedAt: new Date(),
        })
        .where(eq(oportunidades.id, id))
        .returning();

      // Log histórico de mudança de status
      if (statusAnterior !== novoStatus) {
        await db.insert(oportunidadesHistorico).values({
          oportunidadeId: id,
          usuarioId: request.user.sub,
          tipo: 'mudanca_status',
          statusAnterior,
          statusNovo: novoStatus,
        });
      }

      return reply.send({
        success: true,
        data: atualizada,
      });
    },
  );

  // POST /oportunidades/:id/fechar - Marcar como ganha
  fastify.post(
    '/:id/close',
    {
      schema: {
        tags: ['Oportunidades'],
        summary: 'Fechar oportunidade como ganha',
        description:
          'Marca uma oportunidade como ganha (venda concretizada), registrando o valor final e data de fechamento. Move automaticamente para a coluna "ganha" do Kanban.',
        ...oportunidadesDocs.fechar,
      },
      preHandler: [authorize(['kanban:fechar'])],
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const {
        valorFechado,
        observacoes,
        gerarDocumento,
        produtoId,
        seguradoraParceiraId,
        situacao,
        numeroProposta,
        dataVigenciaInicio,
        dataVigenciaFim,
        premioFinal,
        criarRenovacao,
      } = request.body as any;

      // Buscar status e clienteId atual para validações
      const [atual] = await db
        .select({ status: oportunidades.status, clienteId: oportunidades.clienteId })
        .from(oportunidades)
        .where(and(eq(oportunidades.id, id), eq(oportunidades.corretoraId, request.corretoraId)));
      const statusAnteriorFechar = atual?.status;

      if (!atual) {
        throw new NotFoundError('Oportunidade');
      }

      // Pré-busca counts em paralelo para geração de numeração sequencial
      const countNow = new Date();
      const countYear = countNow.getFullYear();
      const countMonth = countNow.getMonth() + 1;
      const hasClienteParaCriar = !!atual.clienteId && !!produtoId && !!dataVigenciaInicio && !!dataVigenciaFim;

      const [[cotacaoCountRow], [docCountRow]] = await Promise.all([
        hasClienteParaCriar
          ? db.select({ count: count() }).from(cotacoes).where(
              and(
                eq(cotacoes.corretoraId, request.corretoraId),
                sql`EXTRACT(YEAR FROM ${cotacoes.createdAt}) = ${countYear}`,
                sql`EXTRACT(MONTH FROM ${cotacoes.createdAt}) = ${countMonth}`,
              ),
            )
          : Promise.resolve([{ count: 0 }]),
        hasClienteParaCriar && gerarDocumento
          ? db.select({ count: count() }).from(documentosVenda).where(
              and(
                eq(documentosVenda.corretoraId, request.corretoraId),
                sql`EXTRACT(YEAR FROM ${documentosVenda.createdAt}) = ${countYear}`,
                sql`EXTRACT(MONTH FROM ${documentosVenda.createdAt}) = ${countMonth}`,
              ),
            )
          : Promise.resolve([{ count: 0 }]),
      ]);

      const result = await db.transaction(async (tx) => {
        const [atualizada] = await tx
          .update(oportunidades)
          .set({
            status: 'ganha',
            valorFechado,
            observacoes,
            dataFechamento: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(oportunidades.id, id),
              eq(oportunidades.corretoraId, request.corretoraId),
            ),
          )
          .returning();

        if (!atualizada) return null;

        let documentoVendaId: string | undefined;
        let renovacaoId: string | undefined;

        let cotacaoId: string | undefined;

        // Sem cliente vinculado: salvar dados da cotação no metadata para criar depois
        if (!atualizada.clienteId && produtoId && dataVigenciaInicio && dataVigenciaFim) {
          const novoMetadata = {
            ...(atualizada.metadata ?? {}),
            pendenteCadastroCliente: {
              produtoId,
              dataVigenciaInicio,
              dataVigenciaFim,
              situacao: situacao || 'NOVO',
              seguradoraParceiraId: seguradoraParceiraId || null,
              premioFinal: premioFinal || null,
              gerarDocumento: gerarDocumento || false,
              numeroProposta: numeroProposta || null,
              criarRenovacao: criarRenovacao || false,
            },
          };
          await tx
            .update(oportunidades)
            .set({ metadata: novoMetadata, updatedAt: new Date() })
            .where(eq(oportunidades.id, id));
          atualizada.metadata = novoMetadata;
          return { atualizada, documentoVendaId: undefined, renovacaoId: undefined, cotacaoId: undefined };
        }

        // Criar cotação automaticamente apenas quando produtoId, datas e clienteId estiverem presentes
        if (produtoId && dataVigenciaInicio && dataVigenciaFim && atualizada.clienteId) {
          const cotacaoSequencial = Number(cotacaoCountRow?.count ?? 0) + 1;
          const numeroCotacao = generateNumeroCotacao(request.corretoraId, cotacaoSequencial);

          const [novaCotacao] = await tx
            .insert(cotacoes)
            .values({
              corretoraId: request.corretoraId,
              clienteId: atualizada.clienteId!,
              vendedorId: atualizada.vendedorId,
              atuanteId: request.user.sub,
              produtoId,
              seguradoraParceiraId: seguradoraParceiraId || null,
              numeroCotacao,
              status: 'EM_ELABORACAO',
              situacao: situacao || 'NOVO',
              vigenciaInicio: dataVigenciaInicio,
              vigenciaFim: dataVigenciaFim,
              premioLiquido: premioFinal || null,
              oportunidadeId: id,
            })
            .returning();

          await tx.insert(cotacaoVendedores).values({
            cotacaoId: novaCotacao.id,
            vendedorId: atualizada.vendedorId,
            atribuidoPor: request.user.sub,
            ativo: true,
          });

          cotacaoId = novaCotacao.id;
        }

        if (gerarDocumento && produtoId && dataVigenciaInicio && dataVigenciaFim && atualizada.clienteId) {
          const sequencial = Number(docCountRow?.count ?? 0) + 1;
          const numeroDocumento = generateNumeroDocumentoVenda('PROPOSTA_FORMAL', sequencial);

          const [novoDoc] = await tx
            .insert(documentosVenda)
            .values({
              corretoraId: request.corretoraId,
              clienteId: atualizada.clienteId,
              vendedorId: atualizada.vendedorId,
              produtoId,
              seguradoraParceiraId: seguradoraParceiraId || null,
              numeroDocumento,
              tipoDocumento: 'PROPOSTA_FORMAL',
              status: 'VENDA_CONFIRMADA',
              numeroPropostaExterna: numeroProposta || null,
              vigenciaInicio: dataVigenciaInicio,
              vigenciaFim: dataVigenciaFim,
              premioLiquido: premioFinal || null,
            })
            .returning();

          documentoVendaId = novoDoc.id;

          if (criarRenovacao) {
            const [novaRenovacao] = await tx
              .insert(renovacoesComerciais)
              .values({
                corretoraId: request.corretoraId,
                clienteId: atualizada.clienteId,
                vendedorId: atualizada.vendedorId,
                documentoVendaAnteriorId: novoDoc.id,
                status: 'NAO_TRABALHADO',
                premioAnterior: premioFinal || null,
                dataVencimento: dataVigenciaFim,
              })
              .returning();

            renovacaoId = novaRenovacao.id;
          }

          // Salvar IDs no metadata para exibição de badges no frontend
          const novoMetadata = {
            ...(atualizada.metadata ?? {}),
            cotacaoId,
            documentoVendaId,
            renovacaoId: renovacaoId || null,
            renovacaoMes: renovacaoId ? dataVigenciaFim?.substring(0, 7) : null,
          };
          await tx
            .update(oportunidades)
            .set({ metadata: novoMetadata, updatedAt: new Date() })
            .where(eq(oportunidades.id, id));

          atualizada.metadata = novoMetadata;
        } else {
          // Sem gerarDocumento, salvar apenas cotacaoId no metadata
          const novoMetadata = {
            ...(atualizada.metadata ?? {}),
            cotacaoId,
          };
          await tx
            .update(oportunidades)
            .set({ metadata: novoMetadata, updatedAt: new Date() })
            .where(eq(oportunidades.id, id));

          atualizada.metadata = novoMetadata;
        }

        return { atualizada, documentoVendaId, renovacaoId, cotacaoId };
      });

      if (!result) {
        throw new NotFoundError('Oportunidade');
      }

      const { atualizada, documentoVendaId, renovacaoId, cotacaoId } = result;

      // Log histórico
      await db.insert(oportunidadesHistorico).values({
        oportunidadeId: id,
        usuarioId: request.user.sub,
        tipo: 'fechamento',
        statusAnterior: statusAnteriorFechar,
        statusNovo: 'ganha',
      });


      return reply.send({
        success: true,
        data: {
          ...atualizada,
          cotacaoId: cotacaoId || null,
          documentoVendaId: documentoVendaId || null,
          renovacaoId: renovacaoId || null,
        },
      });
    },
  );

  // POST /oportunidades/:id/perder - Marcar como perdida
  fastify.post(
    '/:id/mark-as-lost',
    {
      schema: {
        tags: ['Oportunidades'],
        summary: 'Marcar oportunidade como perdida',
        description:
          'Marca uma oportunidade como perdida, registrando motivo e detalhes da perda. Útil para análise de perdas e melhoria de processos comerciais.',
        ...oportunidadesDocs.perder,
      },
      preHandler: [authorize(['kanban:perder'])],
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const { motivoPerda, detalhesPerda, dataRecontato, observacaoRecontato } =
        request.body as any;

      // Buscar status atual para o log
      const [atualPerder] = await db
        .select({ status: oportunidades.status })
        .from(oportunidades)
        .where(and(eq(oportunidades.id, id), eq(oportunidades.corretoraId, request.corretoraId)));

      const [atualizada] = await db
        .update(oportunidades)
        .set({
          status: 'perdida',
          motivoPerda,
          detalhesPerda,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(oportunidades.id, id),
            eq(oportunidades.corretoraId, request.corretoraId),
          ),
        )
        .returning();

      if (!atualizada) {
        throw new NotFoundError('Oportunidade');
      }

      // Log histórico
      await db.insert(oportunidadesHistorico).values({
        oportunidadeId: id,
        usuarioId: request.user.sub,
        tipo: 'perda',
        statusAnterior: atualPerder?.status,
        statusNovo: 'perdida',
        descricao: motivoPerda || null,
      });

      if (dataRecontato) {
        await db.insert(tarefas).values({
          corretoraId: request.corretoraId,
          usuarioId: request.user.sub,
          titulo: `Recontato: ${atualizada.nomeCliente}`,
          descricao: observacaoRecontato || null,
          prioridade: 'media',
          dataVencimento: new Date(dataRecontato + 'T09:00:00.000Z'),
          entidadeTipo: 'oportunidade',
          entidadeId: id,
        });
      }

      return reply.send({
        success: true,
        data: atualizada,
      });
    },
  );

  // DELETE /oportunidades/:id - Soft delete
  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['Oportunidades'],
        summary: 'Deletar oportunidade',
        description:
          'Remove uma oportunidade do Kanban usando soft delete (marcação lógica). A oportunidade continua no banco de dados mas não é mais exibida.',
        ...oportunidadesDocs.excluir,
      },
      preHandler: [authorize(['kanban:deletar'])],
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
        throw new NotFoundError('Oportunidade');
      }

      return reply.code(204).send({});
    },
  );

  // GET /oportunidades/:id/historico - Buscar histórico de eventos
  fastify.get(
    '/:id/history',
    {
      schema: {
        tags: ['Oportunidades'],
        summary: 'Buscar histórico de eventos da oportunidade',
        description:
          'Retorna o log completo de eventos da oportunidade: criação, mudanças de status, fechamento e perda. Ordenado do mais recente para o mais antigo.',
        ...oportunidadesDocs.historico,
      },
      preHandler: [
        authorizeAny(['kanban:acessar', 'kanban:visualizar', 'kanban:visualizar_todas']),
      ],
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const { or } = await import('drizzle-orm');

      const podeVerTodas =
        request.user.isAdmin ||
        request.user.permissoes?.includes('kanban:visualizar_todas');

      const conditions = [
        eq(oportunidades.id, id),
        eq(oportunidades.corretoraId, request.corretoraId),
        isNull(oportunidades.deletedAt),
      ];

      if (!podeVerTodas) {
        conditions.push(
          or(
            eq(oportunidades.vendedorOriginalId, request.user.sub),
            eq(oportunidades.vendedorId, request.user.sub),
          )!,
        );
      }

      const oportunidade = await db.query.oportunidades.findFirst({
        where: and(...conditions),
      });

      if (!oportunidade) {
        throw new NotFoundError('Oportunidade');
      }

      const historico = await db.query.oportunidadesHistorico.findMany({
        where: eq(oportunidadesHistorico.oportunidadeId, id),
        with: {
          usuario: {
            columns: {
              id: true,
              nome: true,
              email: true,
            },
          },
        },
        orderBy: [desc(oportunidadesHistorico.createdAt)],
      });

      return reply.send({
        success: true,
        data: historico,
      });
    },
  );

  // POST /oportunidades/:id/vincular-cliente - Vincular cliente a uma oportunidade
  fastify.post(
    '/:id/link-client',
    {
      schema: {
        tags: ['Oportunidades'],
        summary: 'Vincular cliente à oportunidade',
        ...oportunidadesDocs.vincularCliente,
      },
      preHandler: [authorize(['kanban:acessar'])],
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const { clienteId } = vincularClienteSchema.parse(request.body);

      const [clienteExiste] = await db
        .select({ id: clientes.id })
        .from(clientes)
        .where(and(eq(clientes.id, clienteId), eq(clientes.corretoraId, request.corretoraId)));

      if (!clienteExiste) {
        throw new NotFoundError('Cliente');
      }

      const [atualizada] = await db
        .update(oportunidades)
        .set({ clienteId, updatedAt: new Date() })
        .where(and(eq(oportunidades.id, id), eq(oportunidades.corretoraId, request.corretoraId)))
        .returning();

      if (!atualizada) {
        throw new NotFoundError('Oportunidade');
      }

      return reply.send({ success: true, data: atualizada });
    },
  );

  // POST /oportunidades/:id/transferir - Transferir oportunidade para outro vendedor
  fastify.post(
    '/:id/transfer',
    {
      schema: {
        tags: ['Oportunidades'],
        summary: 'Transferir oportunidade para outro vendedor',
        description:
          'Transfere a propriedade de uma oportunidade para outro vendedor da equipe. Registra a transferência no histórico com motivo e responsável pela ação. Mantém vendedor original para rastreabilidade.',
        ...oportunidadesDocs.transferir,
      },
      preHandler: [authorize(['kanban:editar'])],
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const { vendedorDestinoId, motivo } = request.body as any;
      const { oportunidadesTransferencias } = await import(
        '@ecotech/shared/database'
      );

      if (!vendedorDestinoId) {
        throw new ValidationError('vendedorDestinoId é obrigatório');
      }

      // Buscar oportunidade atual
      const [atual] = await db
        .select()
        .from(oportunidades)
        .where(
          and(
            eq(oportunidades.id, id),
            eq(oportunidades.corretoraId, request.corretoraId),
            isNull(oportunidades.deletedAt),
          ),
        );

      if (!atual) {
        throw new NotFoundError('Oportunidade');
      }

      // Verificar se está tentando transferir para o mesmo vendedor
      if (atual.vendedorId === vendedorDestinoId) {
        throw new ValidationError('A oportunidade já pertence a este vendedor');
      }

      // Iniciar transação
      await db.transaction(async (tx) => {
        // Registrar transferência no histórico
        await tx.insert(oportunidadesTransferencias).values({
          oportunidadeId: id,
          vendedorOrigemId: atual.vendedorId,
          vendedorDestinoId: vendedorDestinoId,
          motivo: motivo || null,
          transferidoPorId: request.user.sub,
        });

        // Atualizar vendedor da oportunidade
        await tx
          .update(oportunidades)
          .set({
            vendedorId: vendedorDestinoId,
            updatedAt: new Date(),
          })
          .where(eq(oportunidades.id, id));
      });

      // Buscar oportunidade atualizada
      const atualizada = await db.query.oportunidades.findFirst({
        where: eq(oportunidades.id, id),
        with: {
          vendedor: {
            columns: {
              id: true,
              nome: true,
              email: true,
              avatarUrl: true,
            },
          },
          vendedorOriginal: {
            columns: {
              id: true,
              nome: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });

      if (!atualizada) {
        throw new NotFoundError('Oportunidade');
      }

      return reply.send({
        success: true,
        data: atualizada,
        message: 'Oportunidade transferida com sucesso',
      });
    },
  );

  // GET /oportunidades/:id/historico-transferencias - Buscar histórico de transferências
  fastify.get(
    '/:id/transfer-history',
    {
      schema: {
        tags: ['Oportunidades'],
        summary: 'Buscar histórico de transferências da oportunidade',
        description:
          'Retorna histórico completo de todas as transferências da oportunidade entre vendedores, incluindo data, origem, destino, motivo e quem executou a transferência. Ordenado da mais recente para a mais antiga.',
        ...oportunidadesDocs.historicoTransferencias,
      },
      preHandler: [
        authorizeAny(['kanban:acessar', 'kanban:visualizar', 'kanban:visualizar_todas']),
      ],
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const { oportunidadesTransferencias } = await import(
        '@ecotech/shared/database'
      );

      // Verificar se o usuário tem acesso à oportunidade
      const { or } = await import('drizzle-orm');
      const podeVerTodas =
        request.user.isAdmin ||
        request.user.permissoes?.includes('kanban:visualizar_todas');

      const conditions = [
        eq(oportunidades.id, id),
        eq(oportunidades.corretoraId, request.corretoraId),
        isNull(oportunidades.deletedAt),
      ];

      if (!podeVerTodas) {
        conditions.push(
          or(
            eq(oportunidades.vendedorOriginalId, request.user.sub),
            eq(oportunidades.vendedorId, request.user.sub),
          )!,
        );
      }

      const oportunidade = await db.query.oportunidades.findFirst({
        where: and(...conditions),
      });

      if (!oportunidade) {
        throw new NotFoundError('Oportunidade');
      }

      // Buscar histórico de transferências
      const historico = await db.query.oportunidadesTransferencias.findMany({
        where: eq(oportunidadesTransferencias.oportunidadeId, id),
        with: {
          vendedorOrigem: {
            columns: {
              id: true,
              nome: true,
              email: true,
            },
          },
          vendedorDestino: {
            columns: {
              id: true,
              nome: true,
              email: true,
            },
          },
          transferidoPor: {
            columns: {
              id: true,
              nome: true,
              email: true,
            },
          },
        },
        orderBy: [desc(oportunidadesTransferencias.dataTransferencia)],
      });

      return reply.send({
        success: true,
        data: historico,
      });
    },
  );

  // POST /oportunidades/:id/confirmar-cliente - Vincular cliente e criar cotação para oportunidade ganha sem cliente
  fastify.post(
    '/:id/confirm-client',
    {
      schema: {
        tags: ['Oportunidades'],
        summary: 'Vincular cliente e criar cotação para oportunidade ganha',
        ...oportunidadesDocs.confirmarCliente,
      },
      preHandler: [authorize(['kanban:acessar'])],
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const { clienteId } = request.body as { clienteId: string };

      const [clienteExiste] = await db
        .select({ id: clientes.id })
        .from(clientes)
        .where(and(eq(clientes.id, clienteId), eq(clientes.corretoraId, request.corretoraId)));

      if (!clienteExiste) {
        throw new NotFoundError('Cliente');
      }

      const [oportunidade] = await db
        .select()
        .from(oportunidades)
        .where(
          and(
            eq(oportunidades.id, id),
            eq(oportunidades.corretoraId, request.corretoraId),
            eq(oportunidades.status, 'ganha'),
            isNull(oportunidades.clienteId),
          ),
        );

      if (!oportunidade) {
        throw new NotFoundError('Oportunidade');
      }

      let pendente = oportunidade.metadata?.pendenteCadastroCliente as any;

      // Fallback: oportunidades ganhas direto no kanban não carregam
      // pendenteCadastroCliente, mas têm produtoId e valor próprios. Sem isso o
      // vínculo apenas associava o cliente e não gerava cotação alguma, apesar de o
      // card "Aguardando Cadastro de Cliente" prometer "gerar a cotação". Geramos a
      // cotação a partir dos campos da própria oportunidade, com vigência padrão de
      // 1 ano a partir de hoje (SP) — o vendedor ajusta depois se necessário.
      if (!pendente?.produtoId && oportunidade.produtoId) {
        const vigenciaInicio = todayInSP();
        pendente = {
          produtoId: oportunidade.produtoId,
          dataVigenciaInicio: vigenciaInicio,
          dataVigenciaFim: addCalendarDays(vigenciaInicio, 365),
          premioFinal: oportunidade.valorFechado ?? oportunidade.premioEstimado ?? null,
          situacao: 'NOVO',
        };
      }

      const result = await db.transaction(async (tx) => {
        const [atualizada] = await tx
          .update(oportunidades)
          .set({ clienteId, updatedAt: new Date() })
          .where(eq(oportunidades.id, id))
          .returning();

        let cotacaoId: string | undefined;
        let documentoVendaId: string | undefined;
        let renovacaoId: string | undefined;

        if (pendente?.produtoId && pendente?.dataVigenciaInicio && pendente?.dataVigenciaFim) {
          const cotacaoNow = new Date();
          const [cotacaoCountResult] = await tx
            .select({ count: count() })
            .from(cotacoes)
            .where(
              and(
                eq(cotacoes.corretoraId, request.corretoraId),
                sql`EXTRACT(YEAR FROM ${cotacoes.createdAt}) = ${cotacaoNow.getFullYear()}`,
                sql`EXTRACT(MONTH FROM ${cotacoes.createdAt}) = ${cotacaoNow.getMonth() + 1}`,
              ),
            );
          const cotacaoSequencial = Number(cotacaoCountResult?.count ?? 0) + 1;
          const numeroCotacao = generateNumeroCotacao(request.corretoraId, cotacaoSequencial);

          const [novaCotacao] = await tx
            .insert(cotacoes)
            .values({
              corretoraId: request.corretoraId,
              clienteId,
              vendedorId: atualizada.vendedorId,
              produtoId: pendente.produtoId,
              seguradoraParceiraId: pendente.seguradoraParceiraId || null,
              numeroCotacao,
              status: 'EM_ELABORACAO',
              situacao: pendente.situacao || 'NOVO',
              vigenciaInicio: pendente.dataVigenciaInicio,
              vigenciaFim: pendente.dataVigenciaFim,
              premioLiquido: pendente.premioFinal || null,
              oportunidadeId: id,
            })
            .returning();

          await tx.insert(cotacaoVendedores).values({
            cotacaoId: novaCotacao.id,
            vendedorId: atualizada.vendedorId,
            atribuidoPor: request.user.sub,
            ativo: true,
          });

          cotacaoId = novaCotacao.id;

          if (pendente.gerarDocumento) {
            const now = new Date();
            const [countResult] = await tx
              .select({ count: count() })
              .from(documentosVenda)
              .where(
                and(
                  eq(documentosVenda.corretoraId, request.corretoraId),
                  sql`EXTRACT(YEAR FROM ${documentosVenda.createdAt}) = ${now.getFullYear()}`,
                  sql`EXTRACT(MONTH FROM ${documentosVenda.createdAt}) = ${now.getMonth() + 1}`,
                ),
              );
            const sequencial = Number(countResult?.count ?? 0) + 1;
            const numeroDocumento = generateNumeroDocumentoVenda('PROPOSTA_FORMAL', sequencial);

            const [novoDoc] = await tx
              .insert(documentosVenda)
              .values({
                corretoraId: request.corretoraId,
                clienteId,
                vendedorId: atualizada.vendedorId,
                produtoId: pendente.produtoId,
                seguradoraParceiraId: pendente.seguradoraParceiraId || null,
                numeroDocumento,
                tipoDocumento: 'PROPOSTA_FORMAL',
                status: 'VENDA_CONFIRMADA',
                numeroPropostaExterna: pendente.numeroProposta || null,
                vigenciaInicio: pendente.dataVigenciaInicio,
                vigenciaFim: pendente.dataVigenciaFim,
                premioLiquido: pendente.premioFinal || null,
              })
              .returning();

            documentoVendaId = novoDoc.id;

            if (pendente.criarRenovacao) {
              const [novaRenovacao] = await tx
                .insert(renovacoesComerciais)
                .values({
                  corretoraId: request.corretoraId,
                  clienteId,
                  vendedorId: atualizada.vendedorId,
                  documentoVendaAnteriorId: novoDoc.id,
                  status: 'NAO_TRABALHADO',
                  premioAnterior: pendente.premioFinal || null,
                  dataVencimento: pendente.dataVigenciaFim,
                })
                .returning();
              renovacaoId = novaRenovacao.id;
            }
          }
        }

        const novoMetadata = {
          ...(atualizada.metadata ?? {}),
          pendenteCadastroCliente: null,
          cotacaoId,
          documentoVendaId: documentoVendaId || null,
          renovacaoId: renovacaoId || null,
        };
        await tx
          .update(oportunidades)
          .set({ metadata: novoMetadata, updatedAt: new Date() })
          .where(eq(oportunidades.id, id));

        return { atualizada: { ...atualizada, metadata: novoMetadata }, cotacaoId, documentoVendaId, renovacaoId };
      });

      await db.insert(oportunidadesHistorico).values({
        oportunidadeId: id,
        usuarioId: request.user.sub,
        tipo: 'mudanca_status',
        statusAnterior: 'ganha',
        statusNovo: 'ganha',
        descricao: result.cotacaoId
          ? 'Cliente vinculado e cotação criada'
          : 'Cliente vinculado',
      });

      return reply.send({ success: true, data: result });
    },
  );
};

export default oportunidadesRoutes;
