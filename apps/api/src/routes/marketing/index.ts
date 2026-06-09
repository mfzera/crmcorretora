import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { ok } from '../../docs/index.js';
import { eq, and, isNull, desc } from 'drizzle-orm';
import {
  db,
  seguradorasParceiras,
  produtos,
  portalCotacaoSolicitacoes,
  usuarios,
  clientes,
} from '@ecotech/shared/database';
import { NotFoundError } from '@ecotech/shared/utils';
import { authorize } from '@ecotech/plugins/authorization';
import { marketingDocs } from '../../docs/marketing/schemas.js';

const marketingRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // ─── Suporte 24h das Seguradoras ────────────────────────────────────────

  // GET /api/marketing/seguradoras-suporte — lista seguradoras com campos 24h
  fastify.get('/support-insurers', { schema: { tags: ['Marketing'], summary: 'Listar seguradoras com atendimento 24h', description: 'Retorna seguradoras parceiras ativas com campos de suporte 24h: telefone, WhatsApp e horário de atendimento.', ...marketingDocs.listarSeguradorasSuporte }, preHandler: [authorize(['marketing:acessar'])] }, async (request) => {
    const lista = await db.query.seguradorasParceiras.findMany({
      where: and(
        eq(seguradorasParceiras.corretoraId, request.corretoraId),
        isNull(seguradorasParceiras.deletedAt),
        eq(seguradorasParceiras.status, 'ATIVA'),
      ),
      columns: {
        id: true,
        razaoSocial: true,
        nomeFantasia: true,
        telefone: true,
        email: true,
        telefone24h: true,
        whatsapp24h: true,
        horarioAtendimento24h: true,
      },
      orderBy: (t, { asc }) => [asc(t.razaoSocial)],
    });

    return ok(lista);
  });

  // PATCH /api/marketing/seguradoras-suporte/:id — atualiza campos 24h
  fastify.patch('/seguradoras-suporte/:id', { schema: { tags: ['Marketing'], summary: 'Atualizar suporte 24h da seguradora', description: 'Atualiza telefone24h, whatsapp24h e horarioAtendimento24h de uma seguradora parceira.', ...marketingDocs.atualizarSeguradoraSuporte }, preHandler: [authorize(['marketing:acessar'])] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      telefone24h?: string | null;
      whatsapp24h?: string | null;
      horarioAtendimento24h?: string | null;
    };

    const seguradora = await db.query.seguradorasParceiras.findFirst({
      where: and(
        eq(seguradorasParceiras.id, id),
        eq(seguradorasParceiras.corretoraId, request.corretoraId),
        isNull(seguradorasParceiras.deletedAt),
      ),
      columns: { id: true },
    });

    if (!seguradora) throw new NotFoundError('Seguradora parceira');

    const [updated] = await db
      .update(seguradorasParceiras)
      .set({
        telefone24h: body.telefone24h ?? null,
        whatsapp24h: body.whatsapp24h ?? null,
        horarioAtendimento24h: body.horarioAtendimento24h ?? null,
        updatedAt: new Date(),
      })
      .where(eq(seguradorasParceiras.id, id))
      .returning({
        id: seguradorasParceiras.id,
        telefone24h: seguradorasParceiras.telefone24h,
        whatsapp24h: seguradorasParceiras.whatsapp24h,
        horarioAtendimento24h: seguradorasParceiras.horarioAtendimento24h,
      });

    return ok(updated);
  });

  // ─── Roteamento de Cotações (Produto → Vendedor) ─────────────────────────

  // GET /api/marketing/vendedores — lista vendedores ativos para select
  fastify.get('/sellers', { schema: { tags: ['Marketing'], summary: 'Listar vendedores ativos', description: 'Retorna id, nome e email dos usuários ativos para uso em selects de roteamento de cotações.', ...marketingDocs.listarVendedores }, preHandler: [authorize(['marketing:acessar'])] }, async (request) => {
    const lista = await db.query.usuarios.findMany({
      where: and(
        eq(usuarios.corretoraId, request.corretoraId),
        eq(usuarios.ativo, true),
        isNull(usuarios.deletedAt),
      ),
      columns: { id: true, nome: true, email: true },
      orderBy: (t, { asc }) => [asc(t.nome)],
    });

    return ok(lista);
  });

  // GET /api/marketing/products-routing — produtos com vendedor portal configurado
  fastify.get('/products-routing', { schema: { tags: ['Marketing'], summary: 'Listar produtos com roteamento configurado', description: 'Retorna produtos ativos com o vendedor do portal associado, usado para roteamento automático de solicitações de cotação.', ...marketingDocs.listarProdutosRouting }, preHandler: [authorize(['marketing:acessar'])] }, async (request) => {
    const lista = await db
      .select({
        id: produtos.id,
        nomeProduto: produtos.nomeProduto,
        tipoSeguro: produtos.tipoSeguro,
        vendedorPortalId: produtos.vendedorPortalId,
        vendedorPortal: {
          id: usuarios.id,
          nome: usuarios.nome,
        },
      })
      .from(produtos)
      .leftJoin(usuarios, eq(produtos.vendedorPortalId, usuarios.id))
      .where(
        and(
          eq(produtos.corretoraId, request.corretoraId),
          eq(produtos.ativo, true),
          isNull(produtos.deletedAt),
        ),
      )
      .orderBy(produtos.nomeProduto);

    return ok(lista);
  });

  // PATCH /api/marketing/products-routing/:id — define vendedor para produto
  fastify.patch('/products-routing/:id', { schema: { tags: ['Marketing'], summary: 'Definir vendedor do produto', description: 'Associa ou remove o vendedor responsável pelo produto no portal público de cotações. Envie vendedorPortalId como null para desassociar.', ...marketingDocs.atualizarProdutoRouting }, preHandler: [authorize(['marketing:acessar'])] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as { vendedorPortalId: string | null };

    const produto = await db.query.produtos.findFirst({
      where: and(
        eq(produtos.id, id),
        eq(produtos.corretoraId, request.corretoraId),
        isNull(produtos.deletedAt),
      ),
      columns: { id: true },
    });

    if (!produto) throw new NotFoundError('Produto');

    // Valida vendedor se informado
    if (body.vendedorPortalId) {
      const vendedor = await db.query.usuarios.findFirst({
        where: and(
          eq(usuarios.id, body.vendedorPortalId),
          eq(usuarios.corretoraId, request.corretoraId),
          eq(usuarios.ativo, true),
        ),
        columns: { id: true },
      });
      if (!vendedor) throw new NotFoundError('Vendedor');
    }

    await db
      .update(produtos)
      .set({ vendedorPortalId: body.vendedorPortalId, updatedAt: new Date() })
      .where(eq(produtos.id, id));

    return { success: true as const };
  });

  // ─── Solicitações de Cotação recebidas via portal ────────────────────────

  // GET /api/marketing/cotacoes — lista solicitações
  fastify.get('/quotes', { schema: { tags: ['Marketing'], summary: 'Listar solicitações de cotação do portal', description: 'Retorna solicitações de cotação recebidas via portal público. Filtre por status: PENDENTE, ATENDIDO, CANCELADO ou omita para ver todas.', ...marketingDocs.listarCotacoes }, preHandler: [authorize(['marketing:acessar'])] }, async (request) => {
    const query = request.query as { status?: string };

    const conditions = [
      eq(portalCotacaoSolicitacoes.corretoraId, request.corretoraId),
    ];

    if (query.status && query.status !== 'TODAS') {
      conditions.push(eq(portalCotacaoSolicitacoes.status, query.status));
    }

    const lista = await db
      .select({
        id: portalCotacaoSolicitacoes.id,
        status: portalCotacaoSolicitacoes.status,
        mensagem: portalCotacaoSolicitacoes.mensagem,
        createdAt: portalCotacaoSolicitacoes.createdAt,
        updatedAt: portalCotacaoSolicitacoes.updatedAt,
        cliente: {
          id: clientes.id,
          nome: clientes.nome,
          razaoSocial: clientes.razaoSocial,
          tipoPessoa: clientes.tipoPessoa,
          email: clientes.email,
          celular: clientes.celular,
          telefone: clientes.telefone,
        },
        produto: {
          id: produtos.id,
          nomeProduto: produtos.nomeProduto,
          tipoSeguro: produtos.tipoSeguro,
        },
        vendedor: {
          id: usuarios.id,
          nome: usuarios.nome,
          email: usuarios.email,
        },
      })
      .from(portalCotacaoSolicitacoes)
      .leftJoin(clientes, eq(portalCotacaoSolicitacoes.clienteId, clientes.id))
      .leftJoin(produtos, eq(portalCotacaoSolicitacoes.produtoId, produtos.id))
      .leftJoin(usuarios, eq(portalCotacaoSolicitacoes.vendedorId, usuarios.id))
      .where(and(...conditions))
      .orderBy(desc(portalCotacaoSolicitacoes.createdAt))
      .limit(100);

    return ok(lista);
  });

  // PATCH /api/marketing/cotacoes/:id — atualiza status + vendedor
  fastify.patch('/cotacoes/:id', { schema: { tags: ['Marketing'], summary: 'Atualizar solicitação de cotação', description: 'Altera o status (PENDENTE / ATENDIDO / CANCELADO) e/ou o vendedor responsável de uma solicitação de cotação recebida via portal.', ...marketingDocs.atualizarCotacao }, preHandler: [authorize(['marketing:acessar'])] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      status?: 'PENDENTE' | 'ATENDIDO' | 'CANCELADO';
      vendedorId?: string | null;
    };

    const solicitacao = await db.query.portalCotacaoSolicitacoes.findFirst({
      where: and(
        eq(portalCotacaoSolicitacoes.id, id),
        eq(portalCotacaoSolicitacoes.corretoraId, request.corretoraId),
      ),
      columns: { id: true },
    });

    if (!solicitacao) throw new NotFoundError('Solicitação');

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status) updateData.status = body.status;
    if (body.vendedorId !== undefined) updateData.vendedorId = body.vendedorId;

    await db
      .update(portalCotacaoSolicitacoes)
      .set(updateData)
      .where(eq(portalCotacaoSolicitacoes.id, id));

    return { success: true as const };
  });
};

export default marketingRoutes;
