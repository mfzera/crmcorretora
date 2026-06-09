import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq, and, isNull, gte, lte } from 'drizzle-orm';
import {
  db,
  documentosVenda,
  produtos,
  seguradorasParceiras,
  usuarios,
} from '@ecotech/shared/database';
import { authenticatePortal } from './auth.js';
import type { PortalCliente } from './middleware.js';

const portalApolicesRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', async (request, reply) => {
    await authenticatePortal(fastify, request, reply);
  });

  // GET /api/portal/policies — lista apólices ativas do segurado
  fastify.get(
    '/policies',
    {
      schema: {
        tags: ['Portal Segurado'],
        summary: 'Listar apólices do segurado',
        description: 'Retorna as apólices ativas do segurado autenticado.',
      },
    },
    async (request) => {
      const { clienteId, corretoraId } = request.portalCliente;

      const apolices = await db
        .select({
          id: documentosVenda.id,
          numeroDocumento: documentosVenda.numeroDocumento,
          numeroApoliceExterna: documentosVenda.numeroApoliceExterna,
          status: documentosVenda.status,
          vigenciaInicio: documentosVenda.vigenciaInicio,
          vigenciaFim: documentosVenda.vigenciaFim,
          coberturas: documentosVenda.coberturas,
          valorSegurado: documentosVenda.valorSegurado,
          produto: {
            id: produtos.id,
            nomeProduto: produtos.nomeProduto,
            tipoSeguro: produtos.tipoSeguro,
          },
          seguradora: {
            id: seguradorasParceiras.id,
            razaoSocial: seguradorasParceiras.razaoSocial,
            nomeFantasia: seguradorasParceiras.nomeFantasia,
            telefone: seguradorasParceiras.telefone,
            email: seguradorasParceiras.email,
            telefone24h: seguradorasParceiras.telefone24h,
            whatsapp24h: seguradorasParceiras.whatsapp24h,
            horarioAtendimento24h: seguradorasParceiras.horarioAtendimento24h,
          },
        })
        .from(documentosVenda)
        .innerJoin(produtos, eq(documentosVenda.produtoId, produtos.id))
        .leftJoin(
          seguradorasParceiras,
          eq(documentosVenda.seguradoraParceiraId, seguradorasParceiras.id),
        )
        .where(
          and(
            eq(documentosVenda.clienteId, clienteId),
            eq(documentosVenda.corretoraId, corretoraId),
            eq(documentosVenda.status, 'ATIVO'),
            isNull(documentosVenda.deletedAt),
          ),
        )
        .orderBy(documentosVenda.vigenciaFim);

      const hoje = new Date();
      const apolicesComDias = apolices.map((a) => {
        const vencimento = new Date(a.vigenciaFim);
        const diasParaVencer = Math.ceil(
          (vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
        );
        return { ...a, diasParaVencer };
      });

      return { success: true, data: apolicesComDias };
    },
  );

  // GET /api/portal/policies/vencimentos — agrupado por prazo
  fastify.get(
    '/policies/vencimentos',
    {
      schema: {
        tags: ['Portal Segurado'],
        summary: 'Vencimentos das apólices',
        description:
          'Retorna apólices agrupadas por urgência de vencimento: vencidas, 30 dias, 60 dias, 90 dias.',
      },
    },
    async (request) => {
      const { clienteId, corretoraId } = request.portalCliente;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const em90dias = new Date(hoje);
      em90dias.setDate(hoje.getDate() + 90);

      const em30diasAtras = new Date(hoje);
      em30diasAtras.setDate(hoje.getDate() - 30);

      const apolices = await db
        .select({
          id: documentosVenda.id,
          numeroDocumento: documentosVenda.numeroDocumento,
          numeroApoliceExterna: documentosVenda.numeroApoliceExterna,
          vigenciaInicio: documentosVenda.vigenciaInicio,
          vigenciaFim: documentosVenda.vigenciaFim,
          produto: {
            nomeProduto: produtos.nomeProduto,
            tipoSeguro: produtos.tipoSeguro,
          },
          seguradora: {
            nomeFantasia: seguradorasParceiras.nomeFantasia,
            razaoSocial: seguradorasParceiras.razaoSocial,
            telefone: seguradorasParceiras.telefone,
            email: seguradorasParceiras.email,
            telefone24h: seguradorasParceiras.telefone24h,
            whatsapp24h: seguradorasParceiras.whatsapp24h,
            horarioAtendimento24h: seguradorasParceiras.horarioAtendimento24h,
          },
        })
        .from(documentosVenda)
        .innerJoin(produtos, eq(documentosVenda.produtoId, produtos.id))
        .leftJoin(
          seguradorasParceiras,
          eq(documentosVenda.seguradoraParceiraId, seguradorasParceiras.id),
        )
        .where(
          and(
            eq(documentosVenda.clienteId, clienteId),
            eq(documentosVenda.corretoraId, corretoraId),
            eq(documentosVenda.status, 'ATIVO'),
            isNull(documentosVenda.deletedAt),
            gte(documentosVenda.vigenciaFim, em30diasAtras.toISOString().split('T')[0]),
            lte(documentosVenda.vigenciaFim, em90dias.toISOString().split('T')[0]),
          ),
        )
        .orderBy(documentosVenda.vigenciaFim);

      const hojeStr = hoje.toISOString().split('T')[0];
      const em30dias = new Date(hoje);
      em30dias.setDate(hoje.getDate() + 30);
      const em60dias = new Date(hoje);
      em60dias.setDate(hoje.getDate() + 60);

      const resultado = {
        vencidas: [] as typeof apolices,
        em30dias: [] as typeof apolices,
        em60dias: [] as typeof apolices,
        em90dias: [] as typeof apolices,
      };

      for (const a of apolices) {
        if (a.vigenciaFim < hojeStr) {
          resultado.vencidas.push(a);
        } else if (a.vigenciaFim <= em30dias.toISOString().split('T')[0]) {
          resultado.em30dias.push(a);
        } else if (a.vigenciaFim <= em60dias.toISOString().split('T')[0]) {
          resultado.em60dias.push(a);
        } else {
          resultado.em90dias.push(a);
        }
      }

      return { success: true, data: resultado };
    },
  );

  // GET /api/portal/policies/:id — detalhe de uma apólice
  fastify.get(
    '/policies/:id',
    {
      schema: {
        tags: ['Portal Segurado'],
        summary: 'Detalhe de apólice',
      },
    },
    async (request) => {
      const { clienteId, corretoraId } = request.portalCliente;
      const { id } = request.params as { id: string };

      const [apolice] = await db
        .select({
          id: documentosVenda.id,
          numeroDocumento: documentosVenda.numeroDocumento,
          numeroApoliceExterna: documentosVenda.numeroApoliceExterna,
          numeroPropostaExterna: documentosVenda.numeroPropostaExterna,
          status: documentosVenda.status,
          vigenciaInicio: documentosVenda.vigenciaInicio,
          vigenciaFim: documentosVenda.vigenciaFim,
          coberturas: documentosVenda.coberturas,
          valorSegurado: documentosVenda.valorSegurado,
          franquia: documentosVenda.franquia,
          observacoes: documentosVenda.observacoes,
          vendedorId: documentosVenda.vendedorId,
          produto: {
            id: produtos.id,
            nomeProduto: produtos.nomeProduto,
            tipoSeguro: produtos.tipoSeguro,
            descricao: produtos.descricao,
          },
          seguradora: {
            id: seguradorasParceiras.id,
            razaoSocial: seguradorasParceiras.razaoSocial,
            nomeFantasia: seguradorasParceiras.nomeFantasia,
            cnpj: seguradorasParceiras.cnpj,
            telefone: seguradorasParceiras.telefone,
            email: seguradorasParceiras.email,
            telefone24h: seguradorasParceiras.telefone24h,
            whatsapp24h: seguradorasParceiras.whatsapp24h,
            horarioAtendimento24h: seguradorasParceiras.horarioAtendimento24h,
          },
          vendedor: {
            id: usuarios.id,
            nome: usuarios.nome,
            email: usuarios.email,
            telefone: usuarios.telefone,
          },
        })
        .from(documentosVenda)
        .innerJoin(produtos, eq(documentosVenda.produtoId, produtos.id))
        .leftJoin(
          seguradorasParceiras,
          eq(documentosVenda.seguradoraParceiraId, seguradorasParceiras.id),
        )
        .leftJoin(usuarios, eq(documentosVenda.vendedorId, usuarios.id))
        .where(
          and(
            eq(documentosVenda.id, id),
            eq(documentosVenda.clienteId, clienteId),
            eq(documentosVenda.corretoraId, corretoraId),
            isNull(documentosVenda.deletedAt),
          ),
        );

      if (!apolice) {
        return { success: false, error: 'Apólice não encontrada' };
      }

      const hoje = new Date();
      const diasParaVencer = Math.ceil(
        (new Date(apolice.vigenciaFim).getTime() - hoje.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      return { success: true, data: { ...apolice, diasParaVencer } };
    },
  );
};

export default portalApolicesRoutes;
