import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { ok } from '../../docs/index.js';
import { eq, and, isNull, isNotNull, ne, sql, or, inArray } from 'drizzle-orm';
import { authorize, authorizeAny } from '@ecotech/plugins/authorization';
import { buildHierarchyWhere } from '@ecotech/shared/utils';
import {
  createClienteSchema,
  updateClienteSchema,
  listClientesQuerySchema,
  transferirCarteiraSchema,
  addEnderecoSchema,
  addContatoSchema,
} from '@ecotech/features/clientes';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  OwnershipError,
} from '@ecotech/shared/utils';
import {
  isValidCPF,
  isValidCNPJ,
  cleanDocument,
  getPaginationParams,
  createPaginatedResult,
} from '@ecotech/shared/utils';
import {
  db,
  clientes,
  clienteEnderecos,
  clienteContatos,
  usuarios,
  documentosVenda,
  renovacoesComerciais,
  cotacoes,
  equipes,
} from '@ecotech/shared/database';
import { resolveVendedorPrincipal } from '../../utils/resolve-vendedor.js';
import { clientesDocs } from '../../docs/clientes/schemas.js';

const clientesRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // Create client
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Clientes'],
        summary: 'Criar novo cliente',
        description:
          'Cria um novo cliente (pessoa física ou jurídica) na corretora. Requer permissão de criação de clientes.',
        ...clientesDocs.criar,
      },
      preHandler: [authorize(['clientes:criar'])],
    },
    async (request, reply) => {
      const data = createClienteSchema.parse(request.body);

      // Validate quota
      await fastify.validateQuota(request.corretoraId, 'cliente');

      // Validate document
      if (data.tipoPessoa === 'PF') {
        const cpfClean = cleanDocument(data.cpf);
        if (!isValidCPF(cpfClean)) {
          throw new ValidationError('CPF inválido');
        }

        // Check if CPF already exists
        const existing = await db.query.clientes.findFirst({
          where: and(
            eq(clientes.corretoraId, request.corretoraId),
            eq(clientes.cpf, cpfClean),
            isNull(clientes.deletedAt),
          ),
        });

        if (existing) {
          throw new ConflictError('CPF já cadastrado nesta corretora');
        }
      } else {
        const cnpjClean = cleanDocument(data.cnpj);
        if (!isValidCNPJ(cnpjClean)) {
          throw new ValidationError('CNPJ inválido');
        }

        // Check if CNPJ already exists
        const existing = await db.query.clientes.findFirst({
          where: and(
            eq(clientes.corretoraId, request.corretoraId),
            eq(clientes.cnpj, cnpjClean),
            isNull(clientes.deletedAt),
          ),
        });

        if (existing) {
          throw new ConflictError('CNPJ já cadastrado nesta corretora');
        }
      }

      // Create client with transaction
      const result = await db.transaction(async (tx) => {
        const [cliente] = await tx
          .insert(clientes)
          .values({
            corretoraId: request.corretoraId,
            tipoPessoa: data.tipoPessoa,
            nome: data.tipoPessoa === 'PF' ? data.nome : null,
            cpf: data.tipoPessoa === 'PF' ? cleanDocument(data.cpf) : null,
            dataNascimento:
              data.tipoPessoa === 'PF' && data.dataNascimento
                ? data.dataNascimento
                : null,
            razaoSocial: data.tipoPessoa === 'PJ' ? data.razaoSocial : null,
            nomeFantasia: data.tipoPessoa === 'PJ' ? data.nomeFantasia : null,
            cnpj: data.tipoPessoa === 'PJ' ? cleanDocument(data.cnpj) : null,
            email: data.email || null,
            telefone: data.telefone || null,
            celular: data.celular || null,
            vendedorId: resolveVendedorPrincipal(data.vendedorId, null, request.user.sub).vendedorId,
            ativo: true,
          })
          .returning();

        // Add addresses
        if (data.enderecos && data.enderecos.length > 0) {
          await tx.insert(clienteEnderecos).values(
            data.enderecos.map((e) => ({
              clienteId: cliente.id,
              ...e,
            })),
          );
        }

        // Add contacts
        if (data.contatos && data.contatos.length > 0) {
          await tx.insert(clienteContatos).values(
            data.contatos.map((c) => ({
              clienteId: cliente.id,
              ...c,
            })),
          );
        }

        // Mesclar stubs sem documento com mesmo nome — stubs criados pelo import
        // antes do CPF ser cadastrado ficam com renovações e documentos vinculados.
        // Transferimos esses vínculos para o cliente real e soft-deletamos os stubs.
        const nomeNorm = (
          data.tipoPessoa === 'PF' ? data.nome : (data.razaoSocial || '')
        ).trim().toLowerCase();
        if (nomeNorm) {
          const stubs = await tx.query.clientes.findMany({
            where: and(
              eq(clientes.corretoraId, request.corretoraId),
              data.tipoPessoa === 'PF' ? sql`LOWER(TRIM(${clientes.nome})) = ${nomeNorm}` : sql`LOWER(TRIM(${clientes.razaoSocial})) = ${nomeNorm}`,
              isNull(clientes.cpf),
              isNull(clientes.cnpj),
              isNull(clientes.deletedAt),
            ),
            columns: { id: true },
          });
          if (stubs.length > 0) {
            const stubIds = stubs.map((s) => s.id);
            await Promise.all([
              tx.update(renovacoesComerciais)
                .set({ clienteId: cliente.id, updatedAt: new Date() })
                .where(inArray(renovacoesComerciais.clienteId, stubIds)),
              tx.update(documentosVenda)
                .set({ clienteId: cliente.id, updatedAt: new Date() })
                .where(and(inArray(documentosVenda.clienteId, stubIds), isNull(documentosVenda.deletedAt))),
              tx.update(cotacoes)
                .set({ clienteId: cliente.id, updatedAt: new Date() })
                .where(and(inArray(cotacoes.clienteId, stubIds), isNull(cotacoes.deletedAt))),
            ]);
            await tx.update(clientes)
              .set({ deletedAt: new Date(), updatedAt: new Date() })
              .where(inArray(clientes.id, stubIds));
          }
        }

        return cliente;
      });

      // Increment quota
      await fastify.incrementQuota(request.corretoraId, 'cliente');

      return reply.status(201).send(ok(result as any));
    },
  );

  // Batch create clients (used by import flow to avoid rate limiting)
  fastify.post(
    '/batch',
    {
      schema: {
        tags: ['Clientes'],
        summary: 'Criar múltiplos clientes de uma vez',
        ...clientesDocs.criarLote,
      },
      preHandler: [authorize(['clientes:criar'])],
    },
    async (request, reply) => {
      const body = request.body as { clientes: any[] };
      if (!Array.isArray(body?.clientes) || body.clientes.length === 0) {
        return reply.send(ok({ criados: 0, jaExistiam: 0, erros: [] }));
      }

      const itens = body.clientes.slice(0, 500); // limite de segurança
      let criados = 0;
      let jaExistiam = 0;
      const erros: { documento: string; motivo: string }[] = [];

      for (const item of itens) {
        try {
          const data = createClienteSchema.parse(item);
          await fastify.validateQuota(request.corretoraId, 'cliente');

          if (data.tipoPessoa === 'PF') {
            const cpfClean = cleanDocument(data.cpf);
            if (!isValidCPF(cpfClean)) { erros.push({ documento: data.cpf, motivo: 'CPF inválido' }); continue; }
            const existing = await db.query.clientes.findFirst({
              where: and(eq(clientes.corretoraId, request.corretoraId), eq(clientes.cpf, cpfClean), isNull(clientes.deletedAt)),
              columns: { id: true },
            });
            if (existing) { jaExistiam++; continue; }
            await db.insert(clientes).values({
              corretoraId: request.corretoraId,
              tipoPessoa: 'PF',
              nome: data.nome,
              cpf: cpfClean,
              dataNascimento: data.dataNascimento || null,
              email: data.email || null,
              telefone: data.telefone || null,
              vendedorId: resolveVendedorPrincipal(data.vendedorId, null, request.user.sub).vendedorId,
              ativo: true,
            });
          } else {
            const cnpjClean = cleanDocument(data.cnpj);
            if (!isValidCNPJ(cnpjClean)) { erros.push({ documento: data.cnpj, motivo: 'CNPJ inválido' }); continue; }
            const existing = await db.query.clientes.findFirst({
              where: and(eq(clientes.corretoraId, request.corretoraId), eq(clientes.cnpj, cnpjClean), isNull(clientes.deletedAt)),
              columns: { id: true },
            });
            if (existing) { jaExistiam++; continue; }
            await db.insert(clientes).values({
              corretoraId: request.corretoraId,
              tipoPessoa: 'PJ',
              razaoSocial: data.razaoSocial,
              nomeFantasia: data.nomeFantasia || null,
              cnpj: cnpjClean,
              email: data.email || null,
              telefone: data.telefone || null,
              vendedorId: resolveVendedorPrincipal(data.vendedorId, null, request.user.sub).vendedorId,
              ativo: true,
            });
          }
          await fastify.incrementQuota(request.corretoraId, 'cliente');
          criados++;
        } catch (err: any) {
          const doc = (item as any)?.cpf || (item as any)?.cnpj || '?';
          erros.push({ documento: doc, motivo: err.message || 'Erro desconhecido' });
        }
      }

      return reply.send(ok({ criados, jaExistiam, erros }));
    },
  );

  // Search clients (autocomplete)
  fastify.get(
    '/search',
    {
      schema: {
        tags: ['Clientes'],
        summary: 'Buscar clientes',
        description:
          'Busca clientes por nome, razão social, email ou documento. Usado para autocomplete.',
        ...clientesDocs.buscarAutocomplete,
      },
      preHandler: [
        authorizeAny(['clientes:visualizar', 'clientes:visualizar_todos']),
      ],
    },
    async (request) => {
      const { q } = request.query as { q?: string };

      if (!q || q.length < 3) {
        return ok([]);
      }

      const searchTerm = `%${q.toLowerCase()}%`;

      const conditions = [
        eq(clientes.corretoraId, request.corretoraId),
        isNull(clientes.deletedAt),
        or(
          sql`LOWER(${clientes.nome}) LIKE ${searchTerm}`,
          sql`LOWER(${clientes.razaoSocial}) LIKE ${searchTerm}`,
          sql`LOWER(${clientes.email}) LIKE ${searchTerm}`,
          sql`${clientes.cpf} LIKE ${searchTerm}`,
          sql`${clientes.cnpj} LIKE ${searchTerm}`,
        ),
      ];

      // Filter by vendedor if not authorized to see all
      if (!request.user.isAdmin && !request.user.permissoes.includes('clientes:visualizar_todos')) {
        conditions.push(eq(clientes.vendedorId, request.user.sub));
      }

      const results = await db.query.clientes.findMany({
        where: and(...conditions),
        columns: {
          id: true,
          nome: true,
          razaoSocial: true,
          tipoPessoa: true,
          email: true,
          telefone: true,
          cpf: true,
          cnpj: true,
          createdAt: true,
        },
        orderBy: (c, { asc, desc }) => [desc(c.cpf), desc(c.cnpj), asc(c.nome), asc(c.razaoSocial)],
      });

      // Deduplicar stubs sem documento: quando existe cliente com CPF/CNPJ de mesmo
      // nome, o stub é redundante. Quando só existem stubs, manter o mais recente.
      const nomesComDoc = new Set(
        results
          .filter((r) => r.cpf || r.cnpj)
          .map((r) => (r.nome || r.razaoSocial || '').toLowerCase().trim()),
      );
      const melhorStubPorNome = new Map<string, typeof results[0]>();
      for (const r of results) {
        if (r.cpf || r.cnpj) continue;
        const nomeNorm = (r.nome || r.razaoSocial || '').toLowerCase().trim();
        if (nomesComDoc.has(nomeNorm)) continue;
        const prev = melhorStubPorNome.get(nomeNorm);
        if (!prev || (r.createdAt ?? '') > (prev.createdAt ?? '')) {
          melhorStubPorNome.set(nomeNorm, r);
        }
      }
      const stubIdsValidos = new Set([...melhorStubPorNome.values()].map((s) => s.id));
      const deduplicated = results.filter((r) => r.cpf || r.cnpj || stubIdsValidos.has(r.id));

      return ok(deduplicated);
    },
  );

  // List clients
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Clientes'],
        summary: 'Listar clientes',
        description:
          'Retorna a lista de clientes da corretora com paginação. Vendedores veem apenas seus clientes, gerentes veem todos.',
        ...clientesDocs.listar,
      },
      preHandler: [
        authorizeAny(['clientes:visualizar', 'clientes:visualizar_todos']),
      ],
    },
    async (request) => {
      const query = listClientesQuerySchema.parse(request.query);
      const { offset, limit, page } = getPaginationParams(query);

      const conditions = [
        eq(clientes.corretoraId, request.corretoraId),
        isNull(clientes.deletedAt),
      ];

      // Apply hierarchy filter
      if (!request.user.isAdmin && !request.user.permissoes.includes('clientes:visualizar_todos')) {
        if (request.user.isGestor) {
          // Gestor vê clientes de sua equipe + próprios (modelo equipeId)
          const equipeLiderada = await db.query.equipes.findFirst({
            where: and(
              eq(equipes.corretoraId, request.corretoraId),
              eq(equipes.gestorId, request.user.sub),
              isNull(equipes.deletedAt),
            ),
            columns: { id: true },
          });

          let vendedorIds = [request.user.sub];
          if (equipeLiderada) {
            const membros = await db.query.usuarios.findMany({
              where: and(
                eq(usuarios.equipeId, equipeLiderada.id),
                isNull(usuarios.deletedAt),
                eq(usuarios.ativo, true),
              ),
              columns: { id: true },
            });
            vendedorIds = [...new Set([request.user.sub, ...membros.map((m) => m.id)])];
          }

          if (vendedorIds.length > 1) {
            conditions.push(inArray(clientes.vendedorId, vendedorIds));
          } else {
            conditions.push(eq(clientes.vendedorId, request.user.sub));
          }
        } else {
          // Vendedor vê apenas seus clientes
          conditions.push(eq(clientes.vendedorId, request.user.sub));
        }
      } else if (query.vendedorId) {
        conditions.push(eq(clientes.vendedorId, query.vendedorId));
      }

      if (query.search) {
        const searchPattern = `%${query.search}%`;
        conditions.push(
          or(
            sql`${clientes.nome} ILIKE ${searchPattern}`,
            sql`${clientes.razaoSocial} ILIKE ${searchPattern}`,
            sql`${clientes.nomeFantasia} ILIKE ${searchPattern}`,
            sql`${clientes.cpf} LIKE ${searchPattern}`,
            sql`${clientes.cnpj} LIKE ${searchPattern}`,
          )!,
        );
      }

      if (query.tipoPessoa) {
        conditions.push(eq(clientes.tipoPessoa, query.tipoPessoa));
      }

      if (query.ativo !== undefined) {
        conditions.push(eq(clientes.ativo, query.ativo === 'true'));
      }

      if (query.soTransferidos === 'true') {
        conditions.push(isNotNull(clientes.vendedorOriginalId));
        conditions.push(ne(clientes.vendedorOriginalId, clientes.vendedorId));
      }

      if (query.isActiveCliente === 'true') {
        conditions.push(
          sql`EXISTS (SELECT 1 FROM ${documentosVenda} WHERE ${documentosVenda.clienteId} = ${clientes.id} AND ${documentosVenda.status} = 'ATIVO' AND ${documentosVenda.deletedAt} IS NULL)`,
        );
      } else if (query.isActiveCliente === 'false') {
        conditions.push(
          sql`NOT EXISTS (SELECT 1 FROM ${documentosVenda} WHERE ${documentosVenda.clienteId} = ${clientes.id} AND ${documentosVenda.status} = 'ATIVO' AND ${documentosVenda.deletedAt} IS NULL)`,
        );
      }

      const [clientesResult, countResult] = await Promise.all([
        db.query.clientes.findMany({
          where: and(...conditions),
          with: {
            vendedor: {
              columns: {
                id: true,
                nome: true,
              },
            },
            vendedorOriginal: {
              columns: {
                id: true,
                nome: true,
              },
            },
          } as any,
          limit,
          offset,
          orderBy: (clientes, { desc }) => [desc(clientes.createdAt)],
        }),
        db
          .select({ count: sql<number>`count(*)` })
          .from(clientes)
          .where(and(...conditions)),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      // Enriquecer com flag isActiveCliente
      const clienteIds = clientesResult.map((c) => c.id);
      let carteiraAtivaSet = new Set<string>();
      if (clienteIds.length > 0) {
        const docsAtivos = await db
          .select({ clienteId: documentosVenda.clienteId })
          .from(documentosVenda)
          .where(
            and(
              inArray(documentosVenda.clienteId, clienteIds),
              eq(documentosVenda.status, 'ATIVO'),
              isNull(documentosVenda.deletedAt),
            ),
          )
          .groupBy(documentosVenda.clienteId);
        carteiraAtivaSet = new Set(docsAtivos.map((d) => d.clienteId));
      }

      const clientesComCarteira = clientesResult.map((c) => ({
        ...c,
        isActiveCliente: carteiraAtivaSet.has(c.id),
      }));

      const paged = createPaginatedResult(clientesComCarteira, total, page, limit);
      return { success: true as const, data: paged.data as any, meta: paged.meta };
    },
  );

  // Get client by ID
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Clientes'],
        summary: 'Obter detalhes do cliente',
        description:
          'Retorna os detalhes completos de um cliente, incluindo endereços e contatos.',
        ...clientesDocs.buscar,
      },
      preHandler: [
        authorizeAny(['clientes:visualizar', 'clientes:visualizar_todos']),
      ],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const cliente = (await db.query.clientes.findFirst({
        where: and(
          eq(clientes.id, id),
          eq(clientes.corretoraId, request.corretoraId),
          isNull(clientes.deletedAt),
        ),
        with: {
          vendedor: { columns: { id: true, nome: true, email: true } },
          enderecos: true,
          contatos: true,
        } as any,
      })) as
        | (typeof clientes.$inferSelect & {
            vendedor: { id: string; nome: string; email: string } | null;
            enderecos: Array<any>;
            contatos: Array<any>;
          })
        | undefined;

      if (!cliente) {
        throw new NotFoundError('Cliente');
      }

      // Check access
      if (
        !request.user.isAdmin &&
        !request.user.permissoes.includes('clientes:visualizar_todos') &&
        cliente.vendedorId !== request.user.sub
      ) {
        throw new OwnershipError('Você não tem acesso a este cliente');
      }

      return ok({
          id: cliente.id,
          tipoPessoa: cliente.tipoPessoa,
          nome: cliente.nome,
          cpf: cliente.cpf,
          dataNascimento: cliente.dataNascimento,
          razaoSocial: cliente.razaoSocial,
          nomeFantasia: cliente.nomeFantasia,
          cnpj: cliente.cnpj,
          ativo: cliente.ativo,
          vendedor: cliente.vendedor,
          enderecos: cliente.enderecos,
          contatos: cliente.contatos,
          createdAt: cliente.createdAt,
          updatedAt: cliente.updatedAt,
      } as any);
    },
  );

  // Update client
  fastify.patch(
    '/:id',
    {
      schema: {
        tags: ['Clientes'],
        summary: 'Atualizar cliente',
        description:
          'Atualiza as informações de um cliente existente. Requer permissão de edição de clientes.',
        ...clientesDocs.atualizar,
      },
      preHandler: [authorize(['clientes:editar'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const data = updateClienteSchema.parse(request.body);

      const cliente = await db.query.clientes.findFirst({
        where: and(
          eq(clientes.id, id),
          eq(clientes.corretoraId, request.corretoraId),
          isNull(clientes.deletedAt),
        ),
      });

      if (!cliente) {
        throw new NotFoundError('Cliente');
      }

      // Check access if not admin
      if (
        !request.user.isAdmin &&
        !request.user.permissoes.includes('clientes:visualizar_todos') &&
        cliente.vendedorId !== request.user.sub
      ) {
        throw new OwnershipError('Você não tem acesso a este cliente');
      }

      // Criar objeto explícito apenas com os campos que existem no schema
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Correção de classificação PF↔PJ.
      // Casos como MEI/ME (nome de pessoa, mas documento é CNPJ) às vezes
      // entram cadastrados como PF. Permitimos corrigir o tipo, mas apenas
      // enquanto o cliente NÃO tiver documento consolidado — uma vez que CPF
      // ou CNPJ válido foi gravado, o tipo passa a ser imutável (igual à regra
      // de imutabilidade do próprio documento).
      const cpfAtualConsolidado = cleanDocument(cliente.cpf || '').length === 11;
      const cnpjAtualConsolidado = cleanDocument(cliente.cnpj || '').length === 14;
      const tipoPessoaFinal: 'PF' | 'PJ' =
        data.tipoPessoa ?? (cliente.tipoPessoa as 'PF' | 'PJ');

      if (data.tipoPessoa !== undefined && data.tipoPessoa !== cliente.tipoPessoa) {
        if (cpfAtualConsolidado || cnpjAtualConsolidado) {
          throw new ValidationError(
            'Não é possível alterar o tipo de pessoa de um cliente que já possui CPF/CNPJ cadastrado.',
          );
        }
        updateData.tipoPessoa = data.tipoPessoa;
        if (tipoPessoaFinal === 'PJ') {
          // Vira PJ: limpa campos exclusivos de PF e garante razão social.
          updateData.cpf = null;
          updateData.dataNascimento = null;
          updateData.razaoSocial =
            data.razaoSocial ?? cliente.razaoSocial ?? cliente.nome;
        } else {
          // Vira PF: limpa campos exclusivos de PJ e garante nome.
          updateData.cnpj = null;
          updateData.razaoSocial = null;
          updateData.nomeFantasia = null;
          updateData.nome =
            data.nome ?? cliente.nome ?? cliente.razaoSocial;
        }
      }

      // CPF: imutável depois de preenchido corretamente.
      // Reenvio do mesmo valor é no-op (não quebra edits que reenviam o campo).
      // Cliente com CPF ausente ou parcial (len < 11) é tratado como "sem documento"
      // e pode receber o CPF correto via PATCH.
      if (data.cpf !== undefined && tipoPessoaFinal === 'PF') {
        const cpfClean = cleanDocument(data.cpf);
        const cpfAtualClean = cleanDocument(cliente.cpf || '');
        const atualPreenchido = cpfAtualClean.length === 11;
        if (atualPreenchido && cpfClean !== cpfAtualClean) {
          throw new ValidationError(
            'CPF já cadastrado para este cliente e não pode ser alterado.',
          );
        }
        if (!atualPreenchido) {
          if (!isValidCPF(cpfClean)) {
            throw new ValidationError('CPF inválido');
          }
          const existing = await db.query.clientes.findFirst({
            where: and(
              eq(clientes.corretoraId, request.corretoraId),
              eq(clientes.cpf, cpfClean),
              ne(clientes.id, id),
              isNull(clientes.deletedAt),
            ),
          });
          if (existing) {
            throw new ConflictError('CPF já cadastrado nesta corretora');
          }
          updateData.cpf = cpfClean;
        }
      }

      // CNPJ: mesma regra
      if (data.cnpj !== undefined && tipoPessoaFinal === 'PJ') {
        const cnpjClean = cleanDocument(data.cnpj);
        const cnpjAtualClean = cleanDocument(cliente.cnpj || '');
        const atualPreenchido = cnpjAtualClean.length === 14;
        if (atualPreenchido && cnpjClean !== cnpjAtualClean) {
          throw new ValidationError(
            'CNPJ já cadastrado para este cliente e não pode ser alterado.',
          );
        }
        if (!atualPreenchido) {
          if (!isValidCNPJ(cnpjClean)) {
            throw new ValidationError('CNPJ inválido');
          }
          const existing = await db.query.clientes.findFirst({
            where: and(
              eq(clientes.corretoraId, request.corretoraId),
              eq(clientes.cnpj, cnpjClean),
              ne(clientes.id, id),
              isNull(clientes.deletedAt),
            ),
          });
          if (existing) {
            throw new ConflictError('CNPJ já cadastrado nesta corretora');
          }
          updateData.cnpj = cnpjClean;
        }
      }

      // Adicionar demais campos condicionalmente
      if (data.nome !== undefined) updateData.nome = data.nome;
      if (data.dataNascimento !== undefined)
        updateData.dataNascimento = data.dataNascimento;
      if (data.razaoSocial !== undefined)
        updateData.razaoSocial = data.razaoSocial;
      if (data.nomeFantasia !== undefined)
        updateData.nomeFantasia = data.nomeFantasia;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.telefone !== undefined) updateData.telefone = data.telefone;
      if (data.celular !== undefined) updateData.celular = data.celular;
      if (data.ativo !== undefined) updateData.ativo = data.ativo;

      const [updated] = await db
        .update(clientes)
        .set(updateData)
        .where(eq(clientes.id, id))
        .returning();

      return ok(updated as any);
    },
  );

  // Delete client (soft delete + anonymization LGPD)
  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['Clientes'],
        summary: 'Excluir cliente',
        description:
          'Exclui e anonimiza um cliente (LGPD Art. 18). Bloqueado se houver apólices ativas. Requer permissão de exclusão de clientes.',
        ...clientesDocs.excluir,
      },
      preHandler: [authorize(['clientes:excluir'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const cliente = await db.query.clientes.findFirst({
        where: and(
          eq(clientes.id, id),
          eq(clientes.corretoraId, request.corretoraId),
          isNull(clientes.deletedAt),
        ),
      });

      if (!cliente) {
        throw new NotFoundError('Cliente');
      }

      // Check access if not admin
      if (
        !request.user.isAdmin &&
        !request.user.permissoes.includes('clientes:visualizar_todos') &&
        cliente.vendedorId !== request.user.sub
      ) {
        throw new OwnershipError('Você não tem acesso a este cliente');
      }

      // Verificar obrigação legal: bloquear exclusão se houver apólices ativas
      const apolicesAtivas = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.clienteId, id),
          eq(documentosVenda.status, 'ATIVO'),
          isNull(documentosVenda.deletedAt),
        ),
        columns: { id: true },
      });

      if (apolicesAtivas) {
        throw new ValidationError(
          'Este cliente possui apólices ativas. Cancele ou transfira as apólices antes de excluir.',
        );
      }

      const agora = new Date();

      // Soft delete + anonimização de PII (LGPD Art. 18)
      await db
        .update(clientes)
        .set({
          nome: cliente.tipoPessoa === 'PF' ? 'Cliente Removido' : null,
          cpf: null,
          dataNascimento: null,
          razaoSocial: cliente.tipoPessoa === 'PJ' ? 'Empresa Removida' : null,
          nomeFantasia: null,
          cnpj: null,
          email: null,
          telefone: null,
          celular: null,
          deletedAt: agora,
          anonimizadoEm: agora,
          ativo: false,
          updatedAt: agora,
        })
        .where(eq(clientes.id, id));

      // Anonimizar endereços e contatos
      await db
        .update(clienteEnderecos)
        .set({
          cep: null,
          logradouro: null,
          numero: null,
          complemento: null,
          bairro: null,
          cidade: null,
          uf: null,
        })
        .where(eq(clienteEnderecos.clienteId, id));

      await db
        .update(clienteContatos)
        .set({ valor: 'anonimizado' })
        .where(eq(clienteContatos.clienteId, id));

      await fastify.decrementQuota(request.corretoraId, 'cliente');

      return { success: true as const, message: 'Cliente excluído e dados anonimizados com sucesso' };
    },
  );

  // Transfer client to another seller
  fastify.post(
    '/:id/transfer-portfolio',
    {
      schema: {
        tags: ['Clientes'],
        summary: 'Transferir cliente para outro vendedor',
        description:
          'Transfere a propriedade de um cliente para outro vendedor da corretora. O vendedor original será mantido como quem transferiu o cliente. Requer permissão de transferência de carteira.',
        ...clientesDocs.transferirCarteira,
      },
      preHandler: [authorize(['clientes:transferir_carteira'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { novoVendedorId } = transferirCarteiraSchema.parse(request.body);

      const cliente = await db.query.clientes.findFirst({
        where: and(
          eq(clientes.id, id),
          eq(clientes.corretoraId, request.corretoraId),
          isNull(clientes.deletedAt),
          eq(clientes.ativo, true),
        ),
      });

      if (!cliente) {
        throw new NotFoundError('Cliente ativo');
      }

      // Validate new seller exists and belongs to this tenant
      const novoVendedor = await db.query.usuarios.findFirst({
        where: and(
          eq(usuarios.id, novoVendedorId),
          eq(usuarios.corretoraId, request.corretoraId),
          eq(usuarios.ativo, true),
          isNull(usuarios.deletedAt),
        ),
      });

      if (!novoVendedor) {
        throw new NotFoundError('Novo vendedor');
      }

      // Set vendedorOriginalId to current vendedorId if not already set
      const vendedorOriginalId =
        cliente.vendedorOriginalId || cliente.vendedorId;

      await db
        .update(clientes)
        .set({
          vendedorId: novoVendedorId,
          vendedorOriginalId: vendedorOriginalId,
          updatedAt: new Date(),
        })
        .where(eq(clientes.id, id));

      return { success: true as const, message: 'Cliente transferido com sucesso' };
    },
  );

  // Add address to client
  fastify.post(
    '/:id/addresses',
    {
      schema: {
        tags: ['Clientes'],
        summary: 'Adicionar endereço ao cliente',
        description:
          'Adiciona um novo endereço ao cliente. Requer permissão de edição de clientes.',
        ...clientesDocs.adicionarEndereco,
      },
      preHandler: [authorize(['clientes:editar'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = addEnderecoSchema.parse(request.body);

      const cliente = await db.query.clientes.findFirst({
        where: and(
          eq(clientes.id, id),
          eq(clientes.corretoraId, request.corretoraId),
          isNull(clientes.deletedAt),
        ),
      });

      if (!cliente) {
        throw new NotFoundError('Cliente');
      }

      // Check access if not admin
      if (
        !request.user.isAdmin &&
        !request.user.permissoes.includes('clientes:visualizar_todos') &&
        cliente.vendedorId !== request.user.sub
      ) {
        throw new OwnershipError('Você não tem acesso a este cliente');
      }

      // If this is set as principal, unset others
      if (data.principal) {
        await db
          .update(clienteEnderecos)
          .set({ principal: false })
          .where(eq(clienteEnderecos.clienteId, id));
      }

      const [endereco] = await db
        .insert(clienteEnderecos)
        .values({
          clienteId: id,
          ...data,
        })
        .returning();

      return reply.status(201).send(ok(endereco as any));
    },
  );

  // Add contact to client
  fastify.post(
    '/:id/contacts',
    {
      schema: {
        tags: ['Clientes'],
        summary: 'Adicionar contato ao cliente',
        description:
          'Adiciona um novo contato (telefone, email, etc) ao cliente. Requer permissão de edição de clientes.',
        ...clientesDocs.adicionarContato,
      },
      preHandler: [authorize(['clientes:editar'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = addContatoSchema.parse(request.body);

      const cliente = await db.query.clientes.findFirst({
        where: and(
          eq(clientes.id, id),
          eq(clientes.corretoraId, request.corretoraId),
          isNull(clientes.deletedAt),
        ),
      });

      if (!cliente) {
        throw new NotFoundError('Cliente');
      }

      // Check access if not admin
      if (
        !request.user.isAdmin &&
        !request.user.permissoes.includes('clientes:visualizar_todos') &&
        cliente.vendedorId !== request.user.sub
      ) {
        throw new OwnershipError('Você não tem acesso a este cliente');
      }

      // If this is set as principal for this type, unset others
      if (data.principal) {
        await db
          .update(clienteContatos)
          .set({ principal: false })
          .where(
            and(
              eq(clienteContatos.clienteId, id),
              eq(clienteContatos.tipo, data.tipo),
            ),
          );
      }

      const [contato] = await db
        .insert(clienteContatos)
        .values({
          clienteId: id,
          ...data,
        })
        .returning();

      return reply.status(201).send(ok(contato as any));
    },
  );

  // Delete address
  fastify.delete(
    '/:id/addresses/:addressId',
    {
      schema: {
        tags: ['Clientes'],
        summary: 'Remover endereço do cliente',
        description:
          'Remove um endereço específico de um cliente. Requer permissão de edição de clientes.',
        ...clientesDocs.removerEndereco,
        params: z.object({ id: z.string().uuid(), addressId: z.string().uuid() }),
      },
      preHandler: [authorize(['clientes:editar'])],
    },
    async (request) => {
      const { id, addressId } = request.params;

      const cliente = await db.query.clientes.findFirst({
        where: and(
          eq(clientes.id, id),
          eq(clientes.corretoraId, request.corretoraId),
          isNull(clientes.deletedAt),
        ),
      });

      if (!cliente) {
        throw new NotFoundError('Cliente');
      }

      await db
        .delete(clienteEnderecos)
        .where(
          and(
            eq(clienteEnderecos.id, addressId),
            eq(clienteEnderecos.clienteId, id),
          ),
        );

      return { success: true as const, message: 'Endereço removido com sucesso' };
    },
  );

  // Delete contact
  fastify.delete(
    '/:id/contacts/:contactId',
    {
      schema: {
        tags: ['Clientes'],
        summary: 'Remover contato do cliente',
        description:
          'Remove um contato específico de um cliente. Requer permissão de edição de clientes.',
        ...clientesDocs.removerContato,
        params: z.object({ id: z.string().uuid(), contactId: z.string().uuid() }),
      },
      preHandler: [authorize(['clientes:editar'])],
    },
    async (request) => {
      const { id, contactId } = request.params;

      const cliente = await db.query.clientes.findFirst({
        where: and(
          eq(clientes.id, id),
          eq(clientes.corretoraId, request.corretoraId),
          isNull(clientes.deletedAt),
        ),
      });

      if (!cliente) {
        throw new NotFoundError('Cliente');
      }

      await db
        .delete(clienteContatos)
        .where(
          and(
            eq(clienteContatos.id, contactId),
            eq(clienteContatos.clienteId, id),
          ),
        );

      return { success: true as const, message: 'Contato removido com sucesso' };
    },
  );
};

export default clientesRoutes;
