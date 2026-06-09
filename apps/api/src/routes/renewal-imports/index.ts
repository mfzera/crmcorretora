import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq, and, sql, desc, gte, lte, inArray, ilike, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { authorize } from '@ecotech/plugins/authorization';
import {
  NotFoundError,
  ValidationError,
  getPaginationParams,
  createPaginatedResult,
  parseVigencia,
  findProdutoId,
  parsePercentualPlanilha,
  parsePremioLiquido,
} from '@ecotech/shared/utils';
import { success } from '@ecotech/shared/utils/api-helpers';

const importacoesRenovacoesRoutes: FastifyPluginAsyncZod = async function (fastify) {
  const {
    db,
    importacaoRenovacoes,
    importacaoRenovacaoItens,
    renovacoesComerciais,
    documentosVenda,
    clientes,
    cotacoes,
    auditLogs,
    usuarios: usuariosTable,
  } = await import('@ecotech/shared/database');

  fastify.addHook('preHandler', fastify.authenticate);

  // 1. Listar histórico de importações
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Importações Renovações'],
        summary: 'Listar histórico de importações',
      },
      preHandler: [authorize(['importar_renovacoes:acessar'])],
    },
    async (request, reply) => {
      const query = request.query as Record<string, string>;
      const { page = 1, limit = 20 } = getPaginationParams(query);
      const statusFilter = query.status;
      const dataInicio = query.dataInicio;
      const dataFim = query.dataFim;
      const busca = query.busca?.trim();

      const conditions = [
        eq(importacaoRenovacoes.corretoraId, request.corretoraId),
      ];

      if (statusFilter) {
        conditions.push(eq(importacaoRenovacoes.status, statusFilter as any));
      }
      if (busca) {
        conditions.push(ilike(importacaoRenovacoes.nomeArquivo, `%${busca}%`));
      }
      if (dataInicio) {
        conditions.push(
          gte(importacaoRenovacoes.createdAt, new Date(dataInicio)),
        );
      }
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        conditions.push(lte(importacaoRenovacoes.createdAt, fim));
      }

      const whereClause = and(...conditions);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(importacaoRenovacoes)
        .where(whereClause);

      const total = Number(countResult.count);

      const vendedoresAlias = alias(usuariosTable, 'vendedor');

      const importacoes = await db
        .select({
          id: importacaoRenovacoes.id,
          nomeArquivo: importacaoRenovacoes.nomeArquivo,
          status: importacaoRenovacoes.status,
          totalLinhas: importacaoRenovacoes.totalLinhas,
          totalSucesso: importacaoRenovacoes.totalSucesso,
          totalErros: importacaoRenovacoes.totalErros,
          totalPulados: importacaoRenovacoes.totalPulados,
          totalPendentes: importacaoRenovacoes.totalPendentes,
          usuarioNome: usuariosTable.nome,
          vendedorId: importacaoRenovacoes.vendedorId,
          vendedorNome: vendedoresAlias.nome,
          concluidoEm: importacaoRenovacoes.concluidoEm,
          createdAt: importacaoRenovacoes.createdAt,
        })
        .from(importacaoRenovacoes)
        .leftJoin(
          usuariosTable,
          eq(importacaoRenovacoes.usuarioId, usuariosTable.id),
        )
        .leftJoin(
          vendedoresAlias,
          eq(importacaoRenovacoes.vendedorId, vendedoresAlias.id),
        )
        .where(whereClause)
        .orderBy(desc(importacaoRenovacoes.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      return reply.send(
        success(
          createPaginatedResult(importacoes, total, page, limit),
        ),
      );
    },
  );

  // 2. Detalhe de uma importação + itens paginados
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Importações Renovações'],
        summary: 'Detalhe de uma importação com itens',
      },
      preHandler: [authorize(['importar_renovacoes:acessar'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const query = request.query as Record<string, string>;
      const { page = 1, limit = 50 } = getPaginationParams(query);
      const statusItem = query.statusItem;
      const busca = query.busca?.trim();

      const importacao = await db.query.importacaoRenovacoes.findFirst({
        where: and(
          eq(importacaoRenovacoes.id, id),
          eq(importacaoRenovacoes.corretoraId, request.corretoraId),
        ),
      });

      if (!importacao) {
        throw new NotFoundError('Importação não encontrada');
      }

      // Buscar nomes do usuario e vendedor
      const [usuario, vendedor] = await Promise.all([
        db.query.usuarios.findFirst({
          where: eq(usuariosTable.id, importacao.usuarioId),
          columns: { nome: true },
        }),
        db.query.usuarios.findFirst({
          where: eq(usuariosTable.id, importacao.vendedorId),
          columns: { nome: true },
        }),
      ]);

      // Itens paginados com filtro opcional
      const itemConditions = [
        eq(importacaoRenovacaoItens.importacaoId, id),
      ];

      if (statusItem) {
        itemConditions.push(
          eq(importacaoRenovacaoItens.status, statusItem as any),
        );
      }
      if (busca) {
        itemConditions.push(
          ilike(importacaoRenovacaoItens.nomeCliente, `%${busca}%`),
        );
      }

      const itemWhereClause = and(...itemConditions);

      const [itemCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(importacaoRenovacaoItens)
        .where(itemWhereClause);

      const totalItens = Number(itemCountResult.count);

      const itens = await db
        .select()
        .from(importacaoRenovacaoItens)
        .where(itemWhereClause)
        .orderBy(importacaoRenovacaoItens.linhaNumero)
        .limit(limit)
        .offset((page - 1) * limit);

      const [revertidosResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(importacaoRenovacaoItens)
        .where(
          and(
            eq(importacaoRenovacaoItens.importacaoId, id),
            eq(importacaoRenovacaoItens.status, 'REVERTIDO'),
          ),
        );

      return reply.send(
        success({
          importacao: {
            ...importacao,
            usuarioNome: usuario?.nome || null,
            vendedorNome: vendedor?.nome || null,
            totalRevertidos: Number(revertidosResult.count),
          },
          itens: createPaginatedResult(itens, totalItens, page, limit),
        }),
      );
    },
  );

  // 3. Retry de itens com erro
  fastify.post(
    '/:id/retry',
    {
      schema: {
        tags: ['Importações Renovações'],
        summary: 'Reprocessar itens com erro',
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request, reply) => {
      const {
        clientes: clientesTable,
        produtos: produtosTable,
      } = await import('@ecotech/shared/database');

      const { id } = request.params as { id: string };
      const body = (request.body || {}) as { itemIds?: string[] };

      const importacao = await db.query.importacaoRenovacoes.findFirst({
        where: and(
          eq(importacaoRenovacoes.id, id),
          eq(importacaoRenovacoes.corretoraId, request.corretoraId),
        ),
      });

      if (!importacao) {
        throw new NotFoundError('Importação não encontrada');
      }

      // Buscar itens com erro
      const errorConditions = [
        eq(importacaoRenovacaoItens.importacaoId, id),
        eq(importacaoRenovacaoItens.status, 'ERRO'),
      ];

      if (body.itemIds && body.itemIds.length > 0) {
        errorConditions.push(
          inArray(importacaoRenovacaoItens.id, body.itemIds),
        );
      }

      const itensComErro = await db
        .select()
        .from(importacaoRenovacaoItens)
        .where(and(...errorConditions));

      if (itensComErro.length === 0) {
        return reply.send(success({ message: 'Nenhum item com erro encontrado', retried: 0 }));
      }

      // Pré-carregar caches (mesma estratégia do import original)
      const todosClientes = await db.query.clientes.findMany({
        where: and(
          eq(clientesTable.corretoraId, request.corretoraId),
          isNull(clientesTable.deletedAt),
        ),
        columns: { id: true, nome: true, cpf: true, cnpj: true },
      });
      const clientesPorCpf = new Map(
        todosClientes.filter((c) => c.cpf).map((c) => [c.cpf!.replace(/[.\-/]/g, ''), c]),
      );
      const clientesPorCnpj = new Map(
        todosClientes.filter((c) => c.cnpj).map((c) => [c.cnpj!.replace(/[.\-/]/g, ''), c]),
      );

      const todosProdutos = await db.query.produtos.findMany({
        where: eq(produtosTable.corretoraId, request.corretoraId),
        columns: { id: true, nomeProduto: true },
      });

      // Sequencial IMP
      const now = new Date();
      const anoMes = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const prefixoImp = `IMP-${anoMes}`;
      const maxImpResult = await db
        .select({ max: sql<string>`MAX(numero_documento)` })
        .from(documentosVenda)
        .where(
          and(
            eq(documentosVenda.corretoraId, request.corretoraId),
            sql`numero_documento LIKE ${`${prefixoImp}-%`}`,
          ),
        );
      let nextImpSeq =
        (maxImpResult[0]?.max
          ? parseInt(maxImpResult[0].max.split('-').pop() ?? '0', 10)
          : 0) + 1;

      // Helper para re-ler o MAX — usado no retry loop contra race condition no número IMP
      const getMaxImpSeqRetry = async (): Promise<number> => {
        const [row] = await db
          .select({ max: sql<string>`MAX(numero_documento)` })
          .from(documentosVenda)
          .where(
            and(
              eq(documentosVenda.corretoraId, request.corretoraId),
              sql`numero_documento LIKE ${`${prefixoImp}-%`}`,
            ),
          );
        return row?.max ? parseInt(row.max.split('-').pop() ?? '0', 10) : 0;
      };

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const limiteRenovacao = new Date(hoje);
      limiteRenovacao.setDate(limiteRenovacao.getDate() + 60);

      // Pré-carregar documentos de venda ativos para eliminar N+1 queries no loop
      const clienteIdsRetry = new Set<string>();
      for (const item of itensComErro) {
        const row = item.dadosLinha as Record<string, any>;
        const docRaw = row?.['DOCUMENTO DO CLIENTE'];
        if (!docRaw) continue;
        const docLimpo = docRaw.toString().replace(/[.\-/\s]/g, '');
        const cli = clientesPorCpf.get(docLimpo) || clientesPorCnpj.get(docLimpo);
        if (cli) clienteIdsRetry.add(cli.id);
      }
      const batchRetry = [...clienteIdsRetry];
      const docsVendaRetry =
        batchRetry.length > 0
          ? await db.query.documentosVenda.findMany({
              where: and(
                eq(documentosVenda.corretoraId, request.corretoraId),
                inArray(documentosVenda.clienteId, batchRetry),
                eq(documentosVenda.status, 'ATIVO'),
              ),
              columns: {
                id: true,
                clienteId: true,
                produtoId: true,
                vigenciaFim: true,
                premioLiquido: true,
                percentualComissao: true,
                valorComissao: true,
              },
            })
          : [];
      // Chave clienteId|produtoId para não descartar documentos de produtos distintos do mesmo cliente
      const docVendaMapRetry = new Map(docsVendaRetry.map((d) => [`${d.clienteId}|${d.produtoId ?? ''}`, d]));
      // Set para dedup: impede criar documento ativo duplicado em retries consecutivos
      const docsAtivosKeysRetry = new Set(
        docsVendaRetry.map((d) => `${d.clienteId}|${d.vigenciaFim}|${d.produtoId ?? ''}`),
      );

      let retried = 0;
      let newSucesso = 0;
      let newErros = 0;

      for (const item of itensComErro) {
        const row = item.dadosLinha as Record<string, any>;
        if (!row) {
          await db
            .update(importacaoRenovacaoItens)
            .set({
              mensagem: 'Dados da linha original não disponíveis para retry',
              retentativas: (item.retentativas || 0) + 1,
              updatedAt: new Date(),
            })
            .where(eq(importacaoRenovacaoItens.id, item.id));
          newErros++;
          retried++;
          continue;
        }

        try {
          const vigenciaFinal = row['VIGÊNCIA FINAL'] || row['VIGENCIA FINAL'];
          const documentoCliente = row['DOCUMENTO DO CLIENTE'];
          const nomeCliente = row['CLIENTE'];
          const itemDesc = row['ITEM'];
          const produto = row['PRODUTO'];
          const seguradora = row['SEGURADORA'];
          const premioLiquido = row['PRÊMIO LÍQUIDO'] || row['PREMIO LIQUIDO'];
          const comissao = row['COMISSÃO'] || row['COMISSAO'];
          const statusPlanilha = row['STATUS'];

          if (!documentoCliente || !vigenciaFinal) {
            await db
              .update(importacaoRenovacaoItens)
              .set({
                mensagem: 'Campos obrigatórios ausentes (DOCUMENTO DO CLIENTE ou VIGÊNCIA FINAL)',
                retentativas: (item.retentativas || 0) + 1,
                updatedAt: new Date(),
              })
              .where(eq(importacaoRenovacaoItens.id, item.id));
            newErros++;
            retried++;
            continue;
          }

          const documentoLimpo = documentoCliente.toString().replace(/[.\-/\s]/g, '');
          if (documentoLimpo.length !== 11 && documentoLimpo.length !== 14) {
            await db
              .update(importacaoRenovacaoItens)
              .set({
                mensagem: `Documento inválido: ${documentoLimpo.length} dígitos`,
                retentativas: (item.retentativas || 0) + 1,
                updatedAt: new Date(),
              })
              .where(eq(importacaoRenovacaoItens.id, item.id));
            newErros++;
            retried++;
            continue;
          }

          // Parse vigencia
          const dataVencimento = parseVigencia(vigenciaFinal.toString());

          const cliente =
            clientesPorCpf.get(documentoLimpo) ||
            clientesPorCnpj.get(documentoLimpo) ||
            null;

          if (!cliente) {
            await db
              .update(importacaoRenovacaoItens)
              .set({
                status: 'PENDENTE',
                mensagem: `Cliente não encontrado (${documentoLimpo.length === 11 ? 'CPF' : 'CNPJ'}: ${documentoCliente})`,
                retentativas: (item.retentativas || 0) + 1,
                updatedAt: new Date(),
              })
              .where(eq(importacaoRenovacaoItens.id, item.id));
            retried++;
            continue;
          }

          // Determinar produtoId cedo — necessário para a chave de dedup e para o lookup correto do doc anterior
          const nomeProdutoEarly = (produto || itemDesc || '').toString().trim();
          const produtoIdEarly = findProdutoId(nomeProdutoEarly, todosProdutos);

          // Buscar documento de venda ativo via cache pré-carregado (sem N+1), chave clienteId|produtoId
          const documentoVenda = docVendaMapRetry.get(`${cliente.id}|${produtoIdEarly ?? ''}`) ?? null;

          let premioAnterior: string | null = null;
          let percentualComissaoAnterior: string | null = null;
          let valorComissaoAnterior: string | null = null;

          if (premioLiquido) {
            premioAnterior = parsePremioLiquido(premioLiquido);
          } else if (documentoVenda?.premioLiquido) {
            premioAnterior = documentoVenda.premioLiquido;
          }
          if (comissao) {
            percentualComissaoAnterior = parsePercentualPlanilha(comissao);
          } else if (documentoVenda?.percentualComissao) {
            percentualComissaoAnterior = documentoVenda.percentualComissao;
          }
          if (documentoVenda?.valorComissao) {
            valorComissaoAnterior = documentoVenda.valorComissao;
          }

          const vencimento = new Date(dataVencimento + 'T00:00:00');
          const precisaRenovacaoAgora = vencimento <= limiteRenovacao;

          if (!precisaRenovacaoAgora) {
            const produtoId = produtoIdEarly;

            if (produtoId) {
              // Dedup: evita criar documento ativo duplicado se o retry for executado mais de uma vez
              const dedupKeyRetry = `${cliente.id}|${dataVencimento}|${produtoId}`;
              if (docsAtivosKeysRetry.has(dedupKeyRetry)) {
                await db
                  .update(importacaoRenovacaoItens)
                  .set({
                    status: 'PULADO',
                    mensagem: 'Documento ativo já existe para este cliente/vigência/produto (duplicata ignorada)',
                    retentativas: (item.retentativas || 0) + 1,
                    updatedAt: new Date(),
                  })
                  .where(eq(importacaoRenovacaoItens.id, item.id));
                retried++;
                continue;
              }

              const [anoV, mesV, diaV] = dataVencimento.split('-').map(Number);
              const vigenciaInicio = `${anoV - 1}-${String(mesV).padStart(2, '0')}-${String(diaV).padStart(2, '0')}`;
              let impSeq = nextImpSeq++;
              const insertValuesDoc = {
                corretoraId: request.corretoraId,
                clienteId: cliente.id,
                vendedorId: importacao.vendedorId,
                produtoId,
                numeroDocumento: `${prefixoImp}-${String(impSeq).padStart(5, '0')}`,
                tipoDocumento: 'VENDA_EXPRESSA' as const,
                status: 'ATIVO' as const,
                vigenciaInicio,
                vigenciaFim: dataVencimento,
                premioLiquido: premioAnterior,
                percentualComissao: percentualComissaoAnterior,
                observacoes: `Importado da planilha - Status original: ${statusPlanilha || 'N/A'}`,
                importacaoId: importacao.id,
              };

              // Retry loop contra race condition no número IMP
              let inserted: { id: string } | undefined;
              for (let attempt = 0; attempt < 10; attempt++) {
                try {
                  const [res] = await db
                    .insert(documentosVenda)
                    .values(insertValuesDoc)
                    .returning({ id: documentosVenda.id });
                  inserted = res;
                  break;
                } catch (err: any) {
                  if (err?.code === '23505') {
                    impSeq = (await getMaxImpSeqRetry()) + 1;
                    insertValuesDoc.numeroDocumento = `${prefixoImp}-${String(impSeq).padStart(5, '0')}`;
                    continue;
                  }
                  throw err;
                }
              }
              if (!inserted) throw new Error('Não foi possível alocar número IMP após 10 tentativas');

              // Registrar no set para evitar duplicata caso outro item no mesmo retry aponte para o mesmo doc
              docsAtivosKeysRetry.add(dedupKeyRetry);

              await db
                .update(importacaoRenovacaoItens)
                .set({
                  status: 'SUCESSO',
                  mensagem: 'Documento ativo criado (vigência > 60 dias) — via retry',
                  documentoVendaId: inserted.id,
                  retentativas: (item.retentativas || 0) + 1,
                  updatedAt: new Date(),
                })
                .where(eq(importacaoRenovacaoItens.id, item.id));
              newSucesso++;
              retried++;
              continue;
            }
          }

          // Criar renovação
          const [insertedRenovacao] = await db
            .insert(renovacoesComerciais)
            .values({
              corretoraId: request.corretoraId,
              clienteId: cliente.id,
              documentoVendaAnteriorId: documentoVenda?.id || null,
              vendedorId: importacao.vendedorId,
              premioAnterior,
              percentualComissaoAnterior,
              valorComissaoAnterior,
              dataVencimento,
              status: 'NAO_TRABALHADO',
              itemDescricao: itemDesc || null,
              produtoDescricao: produto || itemDesc || null,
              seguradoraAnterior: seguradora || null,
              observacoes: `Importado da planilha - Status original: ${statusPlanilha || 'N/A'}`,
              importacaoId: importacao.id,
            })
            .returning({ id: renovacoesComerciais.id });

          await db
            .update(importacaoRenovacaoItens)
            .set({
              status: 'SUCESSO',
              mensagem: precisaRenovacaoAgora
                ? 'Renovação criada (vencimento ≤ 60 dias) — via retry'
                : 'Renovação criada (produto não encontrado, fallback) — via retry',
              renovacaoId: insertedRenovacao.id,
              retentativas: (item.retentativas || 0) + 1,
              updatedAt: new Date(),
            })
            .where(eq(importacaoRenovacaoItens.id, item.id));
          newSucesso++;
          retried++;
        } catch (err: any) {
          await db
            .update(importacaoRenovacaoItens)
            .set({
              mensagem: `Retry falhou: ${err.message || 'Erro desconhecido'}`,
              erroDetalhes: err.stack || null,
              retentativas: (item.retentativas || 0) + 1,
              updatedAt: new Date(),
            })
            .where(eq(importacaoRenovacaoItens.id, item.id));
          newErros++;
          retried++;
        }
      }

      // Atualizar contadores da importação
      const updatedCounts = await db
        .select({
          sucesso: sql<number>`count(*) filter (where status = 'SUCESSO')`,
          erros: sql<number>`count(*) filter (where status = 'ERRO')`,
          pulados: sql<number>`count(*) filter (where status = 'PULADO')`,
          pendentes: sql<number>`count(*) filter (where status = 'PENDENTE')`,
        })
        .from(importacaoRenovacaoItens)
        .where(eq(importacaoRenovacaoItens.importacaoId, id));

      const counts = updatedCounts[0];

      await db
        .update(importacaoRenovacoes)
        .set({
          totalSucesso: Number(counts.sucesso),
          totalErros: Number(counts.erros),
          totalPulados: Number(counts.pulados),
          totalPendentes: Number(counts.pendentes),
          status: (Number(counts.erros) > 0 || Number(counts.pendentes) > 0) ? 'CONCLUIDO_COM_ERROS' : 'CONCLUIDO',
          updatedAt: new Date(),
        })
        .where(eq(importacaoRenovacoes.id, id));

      return reply.send(
        success({
          retried,
          newSucesso,
          newErros,
        }),
      );
    },
  );

  // 4. Rollback seletivo de itens
  fastify.post(
    '/:id/rollback',
    {
      schema: {
        tags: ['Importações Renovações'],
        summary: 'Reverter itens importados selecionados',
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { itemIds: string[] };

      if (!body.itemIds || body.itemIds.length === 0) {
        throw new ValidationError('itemIds é obrigatório e deve conter ao menos um ID');
      }
      if (body.itemIds.length > 500) {
        throw new ValidationError('Máximo de 500 itens por rollback');
      }
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (body.itemIds.some((id) => !uuidRegex.test(id))) {
        throw new ValidationError('itemIds contém IDs inválidos');
      }

      const importacao = await db.query.importacaoRenovacoes.findFirst({
        where: and(
          eq(importacaoRenovacoes.id, id),
          eq(importacaoRenovacoes.corretoraId, request.corretoraId),
        ),
      });

      if (!importacao) {
        throw new NotFoundError('Importação não encontrada');
      }

      // Buscar itens com sucesso para rollback
      const itensParaReverter = await db
        .select()
        .from(importacaoRenovacaoItens)
        .where(
          and(
            eq(importacaoRenovacaoItens.importacaoId, id),
            eq(importacaoRenovacaoItens.status, 'SUCESSO'),
            inArray(importacaoRenovacaoItens.id, body.itemIds),
          ),
        );

      if (itensParaReverter.length === 0) {
        return reply.send(success({ message: 'Nenhum item elegível para rollback', reverted: 0 }));
      }

      let reverted = 0;
      let blocked = 0;

      await db.transaction(async (tx) => {
        for (const item of itensParaReverter) {
          let clienteIdParaChecar: string | null = null;

          // Rollback de renovação
          if (item.renovacaoId) {
            const renovacao = await tx.query.renovacoesComerciais.findFirst({
              where: and(
                eq(renovacoesComerciais.id, item.renovacaoId),
                eq(renovacoesComerciais.corretoraId, request.corretoraId),
              ),
            });

            if (!renovacao || renovacao.status !== 'NAO_TRABALHADO') {
              blocked++;
              continue;
            }

            clienteIdParaChecar = renovacao.clienteId ?? null;

            // Registrar audit log
            await tx.insert(auditLogs).values({
              corretoraId: request.corretoraId,
              usuarioId: request.user.sub,
              acao: 'ROLLBACK_IMPORTACAO',
              entidade: 'renovacao_comercial',
              entidadeId: item.renovacaoId,
              dadosAnteriores: renovacao as any,
            });

            await tx
              .delete(renovacoesComerciais)
              .where(eq(renovacoesComerciais.id, item.renovacaoId));
          }

          // Rollback de documento de venda
          if (item.documentoVendaId) {
            const documento = await tx.query.documentosVenda.findFirst({
              where: and(
                eq(documentosVenda.id, item.documentoVendaId),
                eq(documentosVenda.corretoraId, request.corretoraId),
              ),
            });

            if (!documento || documento.status !== 'ATIVO') {
              blocked++;
              continue;
            }

            clienteIdParaChecar = clienteIdParaChecar ?? documento.clienteId ?? null;

            // Registrar audit log
            await tx.insert(auditLogs).values({
              corretoraId: request.corretoraId,
              usuarioId: request.user.sub,
              acao: 'ROLLBACK_IMPORTACAO',
              entidade: 'documento_venda',
              entidadeId: item.documentoVendaId,
              dadosAnteriores: documento as any,
            });

            await tx
              .delete(documentosVenda)
              .where(eq(documentosVenda.id, item.documentoVendaId));
          }

          // Marcar item como revertido
          await tx
            .update(importacaoRenovacaoItens)
            .set({
              status: 'REVERTIDO',
              mensagem: 'Item revertido pelo usuário',
              renovacaoId: null,
              documentoVendaId: null,
              updatedAt: new Date(),
            })
            .where(eq(importacaoRenovacaoItens.id, item.id));

          // Limpar stub órfão: se o cliente vinculado não tem CPF/CNPJ (foi criado
          // pelo import) e ficou sem nenhum registro após o rollback, soft-delete.
          if (clienteIdParaChecar) {
            const stub = await tx.query.clientes.findFirst({
              where: and(
                eq(clientes.id, clienteIdParaChecar),
                eq(clientes.corretoraId, request.corretoraId),
                isNull(clientes.cpf),
                isNull(clientes.cnpj),
                isNull(clientes.deletedAt),
              ),
            });
            if (stub) {
              const [semRenovacoes, semDocumentos, semCotacoes] = await Promise.all([
                tx.select({ count: sql<number>`count(*)` }).from(renovacoesComerciais)
                  .where(eq(renovacoesComerciais.clienteId, stub.id)),
                tx.select({ count: sql<number>`count(*)` }).from(documentosVenda)
                  .where(and(eq(documentosVenda.clienteId, stub.id), isNull(documentosVenda.deletedAt))),
                tx.select({ count: sql<number>`count(*)` }).from(cotacoes)
                  .where(and(eq(cotacoes.clienteId, stub.id), isNull(cotacoes.deletedAt))),
              ]);
              const estaOrfao =
                Number(semRenovacoes[0].count) === 0 &&
                Number(semDocumentos[0].count) === 0 &&
                Number(semCotacoes[0].count) === 0;
              if (estaOrfao) {
                await tx.update(clientes)
                  .set({ deletedAt: new Date(), updatedAt: new Date() })
                  .where(eq(clientes.id, stub.id));
              }
            }
          }

          reverted++;
        }
      });

      // Atualizar contadores da importação
      const updatedCounts = await db
        .select({
          sucesso: sql<number>`count(*) filter (where status = 'SUCESSO')`,
          erros: sql<number>`count(*) filter (where status = 'ERRO')`,
          pulados: sql<number>`count(*) filter (where status = 'PULADO')`,
          pendentes: sql<number>`count(*) filter (where status = 'PENDENTE')`,
          revertidos: sql<number>`count(*) filter (where status = 'REVERTIDO')`,
        })
        .from(importacaoRenovacaoItens)
        .where(eq(importacaoRenovacaoItens.importacaoId, id));

      const counts = updatedCounts[0];
      const hasRevertidos = Number(counts.revertidos) > 0;

      await db
        .update(importacaoRenovacoes)
        .set({
          totalSucesso: Number(counts.sucesso),
          totalErros: Number(counts.erros),
          totalPulados: Number(counts.pulados),
          totalPendentes: Number(counts.pendentes),
          status: hasRevertidos ? 'REVERTIDO_PARCIAL' : (Number(counts.erros) > 0 ? 'CONCLUIDO_COM_ERROS' : 'CONCLUIDO'),
          updatedAt: new Date(),
        })
        .where(eq(importacaoRenovacoes.id, id));

      return reply.send(
        success({
          reverted,
          blocked,
          message: blocked > 0
            ? `${reverted} item(ns) revertido(s). ${blocked} item(ns) não puderam ser revertidos (já foram trabalhados).`
            : `${reverted} item(ns) revertido(s) com sucesso.`,
        }),
      );
    },
  );

  // 5. Processar pendentes vinculados a uma importação
  fastify.post(
    '/:id/process-pending',
    {
      schema: {
        tags: ['Importações Renovações'],
        summary: 'Processar itens pendentes de uma importação',
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request, reply) => {
      const {
        clientes: clientesTable,
        produtos: produtosTable,
      } = await import('@ecotech/shared/database');

      const { id } = request.params as { id: string };
      const body = (request.body || {}) as {
        itemIds?: string[];
        clienteId?: string;
      };

      const importacao = await db.query.importacaoRenovacoes.findFirst({
        where: and(
          eq(importacaoRenovacoes.id, id),
          eq(importacaoRenovacoes.corretoraId, request.corretoraId),
        ),
      });

      if (!importacao) {
        throw new NotFoundError('Importação não encontrada');
      }

      // Atribuição direta a um cliente existente (override do match por documento).
      // Usado quando o vendedor identifica que o pendente é um cliente já cadastrado
      // — evita criar duplicata quando o CPF/CNPJ da planilha está errado.
      let clienteOverride:
        | { id: string; cpf: string | null; cnpj: string | null; tipoPessoa: 'PF' | 'PJ' }
        | null = null;
      if (body.clienteId) {
        if (!body.itemIds || body.itemIds.length === 0) {
          throw new ValidationError(
            'Ao atribuir a um cliente existente, é necessário informar os itens a processar (itemIds).',
          );
        }
        const found = await db.query.clientes.findFirst({
          where: and(
            eq(clientesTable.id, body.clienteId),
            eq(clientesTable.corretoraId, request.corretoraId),
          ),
          columns: { id: true, cpf: true, cnpj: true, tipoPessoa: true, deletedAt: true },
        });
        if (!found || found.deletedAt) {
          throw new NotFoundError('Cliente alvo');
        }
        clienteOverride = {
          id: found.id,
          cpf: found.cpf,
          cnpj: found.cnpj,
          tipoPessoa: found.tipoPessoa as 'PF' | 'PJ',
        };
      }

      // Buscar itens pendentes
      const pendingConditions = [
        eq(importacaoRenovacaoItens.importacaoId, id),
        eq(importacaoRenovacaoItens.status, 'PENDENTE'),
      ];

      if (body.itemIds && body.itemIds.length > 0) {
        pendingConditions.push(
          inArray(importacaoRenovacaoItens.id, body.itemIds),
        );
      }

      const itensPendentes = await db
        .select()
        .from(importacaoRenovacaoItens)
        .where(and(...pendingConditions));

      if (itensPendentes.length === 0) {
        return reply.send(success({ message: 'Nenhum item pendente encontrado', processed: 0 }));
      }

      // Pré-carregar caches
      const todosClientes = await db.query.clientes.findMany({
        where: and(
          eq(clientesTable.corretoraId, request.corretoraId),
          isNull(clientesTable.deletedAt),
        ),
        columns: { id: true, cpf: true, cnpj: true, tipoPessoa: true },
      });
      const clientesPorDoc = new Map<string, (typeof todosClientes)[0]>([
        ...todosClientes.filter((c) => c.cpf).map((c) => [c.cpf!.replace(/[.\-/]/g, ''), c] as const),
        ...todosClientes.filter((c) => c.cnpj).map((c) => [c.cnpj!.replace(/[.\-/]/g, ''), c] as const),
      ]);

      const todosProdutos = await db.query.produtos.findMany({
        where: eq(produtosTable.corretoraId, request.corretoraId),
        columns: { id: true, nomeProduto: true },
      });

      // Pré-carregar documentos e renovações para eliminar N+1 e checar duplicatas
      const clienteIdsPendentes = new Set<string>();
      if (clienteOverride) {
        clienteIdsPendentes.add(clienteOverride.id);
      }
      for (const item of itensPendentes) {
        const docRaw =
          item.documentoCliente ||
          (item.dadosLinha as any)?.['DOCUMENTO DO CLIENTE'];
        if (!docRaw) continue;
        const docLimpo = docRaw.toString().replace(/[.\-/\s]/g, '');
        const cli = clientesPorDoc.get(docLimpo);
        if (cli) clienteIdsPendentes.add(cli.id);
      }
      const batchPendentes = [...clienteIdsPendentes];

      const renovacoesExPendentes =
        batchPendentes.length > 0
          ? await db.query.renovacoesComerciais.findMany({
              where: and(
                eq(renovacoesComerciais.corretoraId, request.corretoraId),
                inArray(renovacoesComerciais.clienteId, batchPendentes),
              ),
              columns: {
                id: true,
                clienteId: true,
                dataVencimento: true,
                itemDescricao: true,
              },
            })
          : [];
      const renovacoesExMap = new Map(
        renovacoesExPendentes.map((r) => [
          `${r.clienteId}|${r.dataVencimento}|${(r.itemDescricao ?? '').toLowerCase().trim()}`,
          r.id,
        ]),
      );

      const docsVendaPendentes =
        batchPendentes.length > 0
          ? await db.query.documentosVenda.findMany({
              where: and(
                eq(documentosVenda.corretoraId, request.corretoraId),
                inArray(documentosVenda.clienteId, batchPendentes),
                eq(documentosVenda.status, 'ATIVO'),
              ),
              columns: {
                id: true,
                clienteId: true,
                vigenciaFim: true,
                produtoId: true,
                premioLiquido: true,
                percentualComissao: true,
                valorComissao: true,
              },
            })
          : [];
      // Chave inclui produtoId para permitir dois produtos diferentes com mesma vigência
      const docsAtivosMap = new Map(
        docsVendaPendentes.map((d) => [`${d.clienteId}|${d.vigenciaFim}|${d.produtoId ?? ''}`, d.id]),
      );
      // Ordena por vigenciaFim DESC antes de construir o Map para garantir que,
      // em caso de múltiplos documentos ATIVO para o mesmo cliente, fique o mais recente.
      const docsVendaOrdenados = [...docsVendaPendentes].sort((a, b) =>
        (b.vigenciaFim ?? '').localeCompare(a.vigenciaFim ?? ''),
      );
      // Chave clienteId|produtoId garante que a renovação linka ao documento do mesmo produto
      const docVendaMapPendentes = new Map(
        docsVendaOrdenados.map((d) => [`${d.clienteId}|${d.produtoId ?? ''}`, d]),
      );

      // Sequencial IMP
      const now = new Date();
      const anoMes = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const prefixoImp = `IMP-${anoMes}`;
      const maxImpResult = await db
        .select({ max: sql<string>`MAX(numero_documento)` })
        .from(documentosVenda)
        .where(
          and(
            eq(documentosVenda.corretoraId, request.corretoraId),
            sql`numero_documento LIKE ${`${prefixoImp}-%`}`,
          ),
        );
      let nextImpSeq =
        (maxImpResult[0]?.max
          ? parseInt(maxImpResult[0].max.split('-').pop() ?? '0', 10)
          : 0) + 1;

      // Helper para re-ler o MAX — retry loop contra race condition no número IMP
      const getMaxImpSeqPendentes = async (): Promise<number> => {
        const [row] = await db
          .select({ max: sql<string>`MAX(numero_documento)` })
          .from(documentosVenda)
          .where(
            and(
              eq(documentosVenda.corretoraId, request.corretoraId),
              sql`numero_documento LIKE ${`${prefixoImp}-%`}`,
            ),
          );
        return row?.max ? parseInt(row.max.split('-').pop() ?? '0', 10) : 0;
      };

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const limiteRenovacao = new Date(hoje);
      limiteRenovacao.setDate(limiteRenovacao.getDate() + 60);

      let processed = 0;
      let newSucesso = 0;
      let newErros = 0;

      for (const item of itensPendentes) {
        const row = item.dadosLinha as Record<string, any>;
        if (!row) {
          await db
            .update(importacaoRenovacaoItens)
            .set({
              status: 'ERRO',
              mensagem: 'Dados da linha original não disponíveis',
              updatedAt: new Date(),
            })
            .where(eq(importacaoRenovacaoItens.id, item.id));
          newErros++;
          processed++;
          continue;
        }

        try {
          const documentoCliente = item.documentoCliente || row['DOCUMENTO DO CLIENTE'];
          if (!documentoCliente) {
            await db
              .update(importacaoRenovacaoItens)
              .set({ status: 'ERRO', mensagem: 'Documento do cliente não disponível', updatedAt: new Date() })
              .where(eq(importacaoRenovacaoItens.id, item.id));
            newErros++;
            processed++;
            continue;
          }

          const documentoLimpo = documentoCliente.toString().replace(/[.\-/\s]/g, '');

          // Se o vendedor atribuiu a um cliente existente, usa ele direto.
          // Caso contrário, tenta casar pelo documento (fluxo padrão).
          let cliente: { id: string; tipoPessoa?: 'PF' | 'PJ' } | undefined;
          if (clienteOverride) {
            // Garante compatibilidade de tipoPessoa: documento com 11 dígitos → PF, 14 → PJ
            const tipoEsperado: 'PF' | 'PJ' | null =
              documentoLimpo.length === 11
                ? 'PF'
                : documentoLimpo.length === 14
                  ? 'PJ'
                  : null;
            if (tipoEsperado && clienteOverride.tipoPessoa !== tipoEsperado) {
              await db
                .update(importacaoRenovacaoItens)
                .set({
                  status: 'ERRO',
                  mensagem: `Cliente selecionado é ${clienteOverride.tipoPessoa}, mas a linha tem documento ${tipoEsperado}. Selecione um cliente compatível.`,
                  updatedAt: new Date(),
                })
                .where(eq(importacaoRenovacaoItens.id, item.id));
              newErros++;
              processed++;
              continue;
            }
            cliente = {
              id: clienteOverride.id,
              tipoPessoa: clienteOverride.tipoPessoa,
            };
          } else {
            cliente = clientesPorDoc.get(documentoLimpo) as any;
          }

          if (!cliente) {
            // Ainda não cadastrado
            processed++;
            continue;
          }

          const vigenciaFinal = row['VIGÊNCIA FINAL'] || row['VIGENCIA FINAL'];
          const itemDesc = row['ITEM'];
          const produto = row['PRODUTO'];
          const seguradora = row['SEGURADORA'];
          const premioLiquido = row['PRÊMIO LÍQUIDO'] || row['PREMIO LIQUIDO'];
          const comissaoVal = row['COMISSÃO'] || row['COMISSAO'];
          const statusPlanilha = row['STATUS'];

          // Parse vigencia com validação completa
          let dataVencimento: string;
          try {
            dataVencimento = parseVigencia(vigenciaFinal?.toString() ?? '');
          } catch (e: any) {
            await db
              .update(importacaoRenovacaoItens)
              .set({
                status: 'ERRO',
                mensagem: `Vigência final inválida: ${e.message}`,
                erroDetalhes: e.stack || null,
                updatedAt: new Date(),
              })
              .where(eq(importacaoRenovacaoItens.id, item.id));
            newErros++;
            processed++;
            continue;
          }

          // Checar duplicata antes de criar
          const itemNorm = ((row['ITEM'] as string) || '').toLowerCase().trim();
          const produtoIdCheck = findProdutoId((produto || itemDesc || '').toString().trim(), todosProdutos) ?? '';
          const produtoDiscriminatorP = produtoIdCheck || (itemDesc || produto || '').toString().trim().toLowerCase();
          const dupRenovKey = `${cliente.id}|${dataVencimento}|${itemNorm}`;
          const dupDocKey = `${cliente.id}|${dataVencimento}|${produtoDiscriminatorP}`;
          if (renovacoesExMap.has(dupRenovKey) || docsAtivosMap.has(dupDocKey)) {
            await db
              .update(importacaoRenovacaoItens)
              .set({
                status: 'PULADO',
                mensagem: 'Duplicata — já existe registro para este cliente/vigência',
                renovacaoId: renovacoesExMap.get(dupRenovKey) || null,
                documentoVendaId: docsAtivosMap.get(dupDocKey) || null,
                updatedAt: new Date(),
              })
              .where(eq(importacaoRenovacaoItens.id, item.id));
            processed++;
            continue;
          }

          // Documento de venda do mesmo produto via cache pré-carregado (sem N+1)
          const documentoVenda = docVendaMapPendentes.get(`${cliente.id}|${produtoIdCheck}`) ?? null;

          let premioAnterior: string | null = null;
          let percentualComissaoAnterior: string | null = null;
          let valorComissaoAnterior: string | null = null;

          if (premioLiquido) {
            premioAnterior = parsePremioLiquido(premioLiquido);
          } else if (documentoVenda?.premioLiquido) {
            premioAnterior = documentoVenda.premioLiquido;
          }
          if (comissaoVal) {
            percentualComissaoAnterior = parsePercentualPlanilha(comissaoVal);
          } else if (documentoVenda?.percentualComissao) {
            percentualComissaoAnterior = documentoVenda.percentualComissao;
          }
          if (documentoVenda?.valorComissao) {
            valorComissaoAnterior = documentoVenda.valorComissao;
          }

          const vencimento = new Date(dataVencimento + 'T00:00:00');
          const precisaRenovacaoAgora = vencimento <= limiteRenovacao;

          if (!precisaRenovacaoAgora) {
            const nomeProduto = (produto || itemDesc || '').toString().trim();
            const produtoId = findProdutoId(nomeProduto, todosProdutos);

            if (produtoId) {
              const [anoV, mesV, diaV] = dataVencimento.split('-').map(Number);
              const vigenciaInicio = `${anoV - 1}-${String(mesV).padStart(2, '0')}-${String(diaV).padStart(2, '0')}`;
              let impSeq = nextImpSeq++;
              const insertValuesDoc = {
                corretoraId: request.corretoraId,
                clienteId: cliente.id,
                vendedorId: importacao.vendedorId,
                produtoId,
                numeroDocumento: `${prefixoImp}-${String(impSeq).padStart(5, '0')}`,
                tipoDocumento: 'VENDA_EXPRESSA' as const,
                status: 'ATIVO' as const,
                vigenciaInicio,
                vigenciaFim: dataVencimento,
                premioLiquido: premioAnterior,
                percentualComissao: percentualComissaoAnterior,
                observacoes: `Importado da planilha - Status original: ${statusPlanilha || 'N/A'}`,
                importacaoId: importacao.id,
              };

              // Retry loop contra race condition no número IMP
              let inserted: { id: string } | undefined;
              for (let attempt = 0; attempt < 10; attempt++) {
                try {
                  const [res] = await db
                    .insert(documentosVenda)
                    .values(insertValuesDoc)
                    .returning({ id: documentosVenda.id });
                  inserted = res;
                  break;
                } catch (err: any) {
                  if (err?.code === '23505') {
                    impSeq = (await getMaxImpSeqPendentes()) + 1;
                    insertValuesDoc.numeroDocumento = `${prefixoImp}-${String(impSeq).padStart(5, '0')}`;
                    continue;
                  }
                  throw err;
                }
              }
              if (!inserted) throw new Error('Não foi possível alocar número IMP após 10 tentativas');

              await db
                .update(importacaoRenovacaoItens)
                .set({
                  status: 'SUCESSO',
                  mensagem: 'Documento ativo criado (vigência > 60 dias) — cliente cadastrado',
                  documentoVendaId: inserted.id,
                  updatedAt: new Date(),
                })
                .where(eq(importacaoRenovacaoItens.id, item.id));
              // Atualizar maps para evitar duplicata intra-batch (chave inclui produtoId)
              docsAtivosMap.set(`${cliente.id}|${dataVencimento}|${produtoId}`, inserted!.id);
              newSucesso++;
              processed++;
              continue;
            }
          }

          // Criar renovação
          const [insertedRenovacao] = await db
            .insert(renovacoesComerciais)
            .values({
              corretoraId: request.corretoraId,
              clienteId: cliente.id,
              documentoVendaAnteriorId: documentoVenda?.id || null,
              vendedorId: importacao.vendedorId,
              premioAnterior,
              percentualComissaoAnterior,
              valorComissaoAnterior,
              dataVencimento,
              status: 'NAO_TRABALHADO',
              itemDescricao: itemDesc || null,
              produtoDescricao: produto || itemDesc || null,
              seguradoraAnterior: seguradora || null,
              observacoes: `Importado da planilha - Status original: ${statusPlanilha || 'N/A'}`,
              importacaoId: importacao.id,
            })
            .returning({ id: renovacoesComerciais.id });

          await db
            .update(importacaoRenovacaoItens)
            .set({
              status: 'SUCESSO',
              mensagem: precisaRenovacaoAgora
                ? 'Renovação criada (vencimento ≤ 60 dias) — cliente cadastrado'
                : 'Renovação criada (produto não encontrado) — cliente cadastrado',
              renovacaoId: insertedRenovacao.id,
              updatedAt: new Date(),
            })
            .where(eq(importacaoRenovacaoItens.id, item.id));
          // Atualizar maps para evitar duplicata intra-batch
          renovacoesExMap.set(`${cliente.id}|${dataVencimento}|${itemNorm}`, insertedRenovacao.id);
          newSucesso++;
          processed++;
        } catch (err: any) {
          await db
            .update(importacaoRenovacaoItens)
            .set({
              status: 'ERRO',
              mensagem: `Erro ao processar: ${err.message || 'Erro desconhecido'}`,
              erroDetalhes: err.stack || null,
              updatedAt: new Date(),
            })
            .where(eq(importacaoRenovacaoItens.id, item.id));
          newErros++;
          processed++;
        }
      }

      // Atualizar contadores
      const updatedCounts = await db
        .select({
          sucesso: sql<number>`count(*) filter (where status = 'SUCESSO')`,
          erros: sql<number>`count(*) filter (where status = 'ERRO')`,
          pulados: sql<number>`count(*) filter (where status = 'PULADO')`,
          pendentes: sql<number>`count(*) filter (where status = 'PENDENTE')`,
        })
        .from(importacaoRenovacaoItens)
        .where(eq(importacaoRenovacaoItens.importacaoId, id));

      const counts = updatedCounts[0];
      await db
        .update(importacaoRenovacoes)
        .set({
          totalSucesso: Number(counts.sucesso),
          totalErros: Number(counts.erros),
          totalPulados: Number(counts.pulados),
          totalPendentes: Number(counts.pendentes),
          status: (Number(counts.erros) > 0 || Number(counts.pendentes) > 0) ? 'CONCLUIDO_COM_ERROS' : 'CONCLUIDO',
          updatedAt: new Date(),
        })
        .where(eq(importacaoRenovacoes.id, id));

      return reply.send(
        success({
          processed,
          newSucesso,
          newErros,
        }),
      );
    },
  );

  // 6. Reprocessar itens pulados (false-positives de dedup)
  fastify.post(
    '/:id/retry-skipped',
    {
      schema: {
        tags: ['Importações Renovações'],
        summary: 'Reprocessar itens pulados (verificar se ainda são duplicatas)',
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request, reply) => {
      const {
        clientes: clientesTable,
        produtos: produtosTable,
      } = await import('@ecotech/shared/database');

      const { id } = request.params as { id: string };
      const body = (request.body || {}) as { itemIds?: string[] };

      const importacao = await db.query.importacaoRenovacoes.findFirst({
        where: and(
          eq(importacaoRenovacoes.id, id),
          eq(importacaoRenovacoes.corretoraId, request.corretoraId),
        ),
      });

      if (!importacao) {
        throw new NotFoundError('Importação não encontrada');
      }

      // Buscar itens pulados
      const puladoConditions = [
        eq(importacaoRenovacaoItens.importacaoId, id),
        eq(importacaoRenovacaoItens.status, 'PULADO'),
      ];

      if (body.itemIds && body.itemIds.length > 0) {
        puladoConditions.push(
          inArray(importacaoRenovacaoItens.id, body.itemIds),
        );
      }

      const itensPulados = await db
        .select()
        .from(importacaoRenovacaoItens)
        .where(and(...puladoConditions));

      if (itensPulados.length === 0) {
        return reply.send(success({ message: 'Nenhum item pulado encontrado', retried: 0, newSucesso: 0, stillPulados: 0 }));
      }

      // Pré-carregar caches
      const todosClientes = await db.query.clientes.findMany({
        where: and(
          eq(clientesTable.corretoraId, request.corretoraId),
          isNull(clientesTable.deletedAt),
        ),
        columns: { id: true, nome: true, cpf: true, cnpj: true },
      });
      const clientesPorDoc = new Map<string, (typeof todosClientes)[0]>([
        ...todosClientes.filter((c) => c.cpf).map((c) => [c.cpf!.replace(/[.\-/]/g, ''), c] as const),
        ...todosClientes.filter((c) => c.cnpj).map((c) => [c.cnpj!.replace(/[.\-/]/g, ''), c] as const),
      ]);

      const todosProdutos = await db.query.produtos.findMany({
        where: eq(produtosTable.corretoraId, request.corretoraId),
        columns: { id: true, nomeProduto: true },
      });

      // Coletar clienteIds dos itens pulados
      const clienteIdsPulados = new Set<string>();
      for (const item of itensPulados) {
        const docRaw =
          item.documentoCliente ||
          (item.dadosLinha as any)?.['DOCUMENTO DO CLIENTE'];
        if (!docRaw) continue;
        const docLimpo = docRaw.toString().replace(/[.\-/\s]/g, '');
        const cli = clientesPorDoc.get(docLimpo);
        if (cli) clienteIdsPulados.add(cli.id);
      }
      const batchPulados = [...clienteIdsPulados];

      // Pré-carregar renovações existentes
      const renovacoesExPulados =
        batchPulados.length > 0
          ? await db.query.renovacoesComerciais.findMany({
              where: and(
                eq(renovacoesComerciais.corretoraId, request.corretoraId),
                inArray(renovacoesComerciais.clienteId, batchPulados),
              ),
              columns: {
                id: true,
                clienteId: true,
                dataVencimento: true,
                itemDescricao: true,
              },
            })
          : [];
      const renovacoesExMap = new Map(
        renovacoesExPulados.map((r) => [
          `${r.clienteId}|${r.dataVencimento}|${(r.itemDescricao ?? '').toLowerCase().trim()}`,
          r.id,
        ]),
      );

      // Pré-carregar documentos ativos (chave com produtoId — lógica corrigida)
      const docsVendaPulados =
        batchPulados.length > 0
          ? await db.query.documentosVenda.findMany({
              where: and(
                eq(documentosVenda.corretoraId, request.corretoraId),
                inArray(documentosVenda.clienteId, batchPulados),
                eq(documentosVenda.status, 'ATIVO'),
              ),
              columns: {
                id: true,
                clienteId: true,
                vigenciaFim: true,
                produtoId: true,
                premioLiquido: true,
                percentualComissao: true,
                valorComissao: true,
              },
            })
          : [];

      // Chave inclui produtoId para permitir dois produtos diferentes com mesma vigência
      const docsAtivosMap = new Map(
        docsVendaPulados.map((d) => [`${d.clienteId}|${d.vigenciaFim}|${d.produtoId ?? ''}`, d.id]),
      );

      // Para referenciar o documento de venda anterior ao criar renovação
      const docsVendaOrdenados = [...docsVendaPulados].sort((a, b) =>
        (b.vigenciaFim ?? '').localeCompare(a.vigenciaFim ?? ''),
      );
      const docVendaMapPulados = new Map(
        docsVendaOrdenados.map((d) => [`${d.clienteId}|${d.produtoId ?? ''}`, d]),
      );

      // Sequencial IMP
      const now = new Date();
      const anoMes = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const prefixoImp = `IMP-${anoMes}`;
      const maxImpResult = await db
        .select({ max: sql<string>`MAX(numero_documento)` })
        .from(documentosVenda)
        .where(
          and(
            eq(documentosVenda.corretoraId, request.corretoraId),
            sql`numero_documento LIKE ${`${prefixoImp}-%`}`,
          ),
        );
      let nextImpSeq =
        (maxImpResult[0]?.max
          ? parseInt(maxImpResult[0].max.split('-').pop() ?? '0', 10)
          : 0) + 1;

      const getMaxImpSeqPulados = async (): Promise<number> => {
        const [row] = await db
          .select({ max: sql<string>`MAX(numero_documento)` })
          .from(documentosVenda)
          .where(
            and(
              eq(documentosVenda.corretoraId, request.corretoraId),
              sql`numero_documento LIKE ${`${prefixoImp}-%`}`,
            ),
          );
        return row?.max ? parseInt(row.max.split('-').pop() ?? '0', 10) : 0;
      };

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const limiteRenovacao = new Date(hoje);
      limiteRenovacao.setDate(limiteRenovacao.getDate() + 60);

      let retried = 0;
      let newSucesso = 0;
      let stillPulados = 0;

      for (const item of itensPulados) {
        const row = item.dadosLinha as Record<string, any>;
        if (!row) {
          // Sem dados da linha original — manter como PULADO
          stillPulados++;
          retried++;
          continue;
        }

        try {
          const documentoCliente =
            item.documentoCliente || row['DOCUMENTO DO CLIENTE'];
          if (!documentoCliente) {
            stillPulados++;
            retried++;
            continue;
          }

          const documentoLimpo = documentoCliente.toString().replace(/[.\-/\s]/g, '');
          const cliente = clientesPorDoc.get(documentoLimpo);

          if (!cliente) {
            stillPulados++;
            retried++;
            continue;
          }

          const vigenciaFinal = row['VIGÊNCIA FINAL'] || row['VIGENCIA FINAL'];
          const itemDesc = row['ITEM'];
          const produto = row['PRODUTO'];
          const seguradora = row['SEGURADORA'];
          const premioLiquido = row['PRÊMIO LÍQUIDO'] || row['PREMIO LIQUIDO'];
          const comissaoVal = row['COMISSÃO'] || row['COMISSAO'];
          const statusPlanilha = row['STATUS'];

          let dataVencimento: string;
          try {
            dataVencimento = parseVigencia(vigenciaFinal?.toString() ?? '');
          } catch {
            stillPulados++;
            retried++;
            continue;
          }

          const nomeProduto = (produto || itemDesc || '').toString().trim();
          const produtoIdCheck = findProdutoId(nomeProduto, todosProdutos) ?? '';
          const itemNorm = ((row['ITEM'] as string) || '').toLowerCase().trim();
          const produtoDiscriminatorPul = produtoIdCheck || nomeProduto.toLowerCase();
          const dupDocKey = `${cliente.id}|${dataVencimento}|${produtoDiscriminatorPul}`;
          const dupRenovKey = `${cliente.id}|${dataVencimento}|${itemNorm}`;

          if (docsAtivosMap.has(dupDocKey) || renovacoesExMap.has(dupRenovKey)) {
            // Ainda é duplicata — manter PULADO, atualizar link se disponível
            await db
              .update(importacaoRenovacaoItens)
              .set({
                mensagem: 'Pulado — duplicata confirmada na reverificação',
                renovacaoId: renovacoesExMap.get(dupRenovKey) || item.renovacaoId,
                documentoVendaId: docsAtivosMap.get(dupDocKey) ? String(docsAtivosMap.get(dupDocKey)) : item.documentoVendaId,
                retentativas: (item.retentativas || 0) + 1,
                updatedAt: new Date(),
              })
              .where(eq(importacaoRenovacaoItens.id, item.id));
            stillPulados++;
            retried++;
            continue;
          }

          // Não é mais duplicata — processar
          const documentoVenda = docVendaMapPulados.get(`${cliente.id}|${produtoIdCheck}`) ?? null;

          let premioAnterior: string | null = null;
          let percentualComissaoAnterior: string | null = null;
          let valorComissaoAnterior: string | null = null;

          if (premioLiquido) {
            premioAnterior = parsePremioLiquido(premioLiquido);
          } else if (documentoVenda?.premioLiquido) {
            premioAnterior = documentoVenda.premioLiquido;
          }
          if (comissaoVal) {
            percentualComissaoAnterior = parsePercentualPlanilha(comissaoVal);
          } else if (documentoVenda?.percentualComissao) {
            percentualComissaoAnterior = documentoVenda.percentualComissao;
          }
          if (documentoVenda?.valorComissao) {
            valorComissaoAnterior = documentoVenda.valorComissao;
          }

          const vencimento = new Date(dataVencimento + 'T00:00:00');
          const precisaRenovacaoAgora = vencimento <= limiteRenovacao;

          if (!precisaRenovacaoAgora && produtoIdCheck) {
            const [anoV, mesV, diaV] = dataVencimento.split('-').map(Number);
            const vigenciaInicio = `${anoV - 1}-${String(mesV).padStart(2, '0')}-${String(diaV).padStart(2, '0')}`;
            let impSeq = nextImpSeq++;
            const insertValuesDoc = {
              corretoraId: request.corretoraId,
              clienteId: cliente.id,
              vendedorId: importacao.vendedorId,
              produtoId: produtoIdCheck,
              numeroDocumento: `${prefixoImp}-${String(impSeq).padStart(5, '0')}`,
              tipoDocumento: 'VENDA_EXPRESSA' as const,
              status: 'ATIVO' as const,
              vigenciaInicio,
              vigenciaFim: dataVencimento,
              premioLiquido: premioAnterior,
              percentualComissao: percentualComissaoAnterior,
              observacoes: `Importado da planilha - Status original: ${statusPlanilha || 'N/A'}`,
              importacaoId: importacao.id,
            };

            let inserted: { id: string } | undefined;
            for (let attempt = 0; attempt < 10; attempt++) {
              try {
                const [res] = await db
                  .insert(documentosVenda)
                  .values(insertValuesDoc)
                  .returning({ id: documentosVenda.id });
                inserted = res;
                break;
              } catch (err: any) {
                if (err?.code === '23505') {
                  impSeq = (await getMaxImpSeqPulados()) + 1;
                  insertValuesDoc.numeroDocumento = `${prefixoImp}-${String(impSeq).padStart(5, '0')}`;
                  continue;
                }
                throw err;
              }
            }
            if (!inserted) throw new Error('Não foi possível alocar número IMP após 10 tentativas');

            await db
              .update(importacaoRenovacaoItens)
              .set({
                status: 'SUCESSO',
                mensagem: 'Documento ativo criado (vigência > 60 dias) — via reprocessamento de pulados',
                documentoVendaId: inserted.id,
                renovacaoId: null,
                retentativas: (item.retentativas || 0) + 1,
                updatedAt: new Date(),
              })
              .where(eq(importacaoRenovacaoItens.id, item.id));
            docsAtivosMap.set(`${cliente.id}|${dataVencimento}|${produtoIdCheck}`, inserted.id);
            newSucesso++;
            retried++;
            continue;
          }

          // Criar renovação
          const [insertedRenovacao] = await db
            .insert(renovacoesComerciais)
            .values({
              corretoraId: request.corretoraId,
              clienteId: cliente.id,
              documentoVendaAnteriorId: documentoVenda?.id || null,
              vendedorId: importacao.vendedorId,
              premioAnterior,
              percentualComissaoAnterior,
              valorComissaoAnterior,
              dataVencimento,
              status: 'NAO_TRABALHADO',
              itemDescricao: itemDesc || null,
              produtoDescricao: produto || itemDesc || null,
              seguradoraAnterior: seguradora || null,
              observacoes: `Importado da planilha - Status original: ${statusPlanilha || 'N/A'}`,
              importacaoId: importacao.id,
            })
            .returning({ id: renovacoesComerciais.id });

          await db
            .update(importacaoRenovacaoItens)
            .set({
              status: 'SUCESSO',
              mensagem: precisaRenovacaoAgora
                ? 'Renovação criada (vencimento ≤ 60 dias) — via reprocessamento de pulados'
                : 'Renovação criada (produto não encontrado, fallback) — via reprocessamento de pulados',
              renovacaoId: insertedRenovacao.id,
              documentoVendaId: null,
              retentativas: (item.retentativas || 0) + 1,
              updatedAt: new Date(),
            })
            .where(eq(importacaoRenovacaoItens.id, item.id));
          renovacoesExMap.set(`${cliente.id}|${dataVencimento}|${itemNorm}`, insertedRenovacao.id);
          newSucesso++;
          retried++;
        } catch (err: any) {
          await db
            .update(importacaoRenovacaoItens)
            .set({
              mensagem: `Reprocessamento falhou: ${err.message || 'Erro desconhecido'}`,
              erroDetalhes: err.stack || null,
              retentativas: (item.retentativas || 0) + 1,
              updatedAt: new Date(),
            })
            .where(eq(importacaoRenovacaoItens.id, item.id));
          stillPulados++;
          retried++;
        }
      }

      // Atualizar contadores da importação
      const updatedCounts = await db
        .select({
          sucesso: sql<number>`count(*) filter (where status = 'SUCESSO')`,
          erros: sql<number>`count(*) filter (where status = 'ERRO')`,
          pulados: sql<number>`count(*) filter (where status = 'PULADO')`,
          pendentes: sql<number>`count(*) filter (where status = 'PENDENTE')`,
        })
        .from(importacaoRenovacaoItens)
        .where(eq(importacaoRenovacaoItens.importacaoId, id));

      const counts = updatedCounts[0];
      await db
        .update(importacaoRenovacoes)
        .set({
          totalSucesso: Number(counts.sucesso),
          totalErros: Number(counts.erros),
          totalPulados: Number(counts.pulados),
          totalPendentes: Number(counts.pendentes),
          status: (Number(counts.erros) > 0 || Number(counts.pendentes) > 0) ? 'CONCLUIDO_COM_ERROS' : 'CONCLUIDO',
          updatedAt: new Date(),
        })
        .where(eq(importacaoRenovacoes.id, id));

      return reply.send(
        success({
          retried,
          newSucesso,
          stillPulados,
        }),
      );
    },
  );
};

export default importacoesRenovacoesRoutes;
