import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq, and, isNull } from 'drizzle-orm';
import { db, clientes } from '@ecotech/shared/database';
import { authenticatePortal } from './auth.js';

const portalPerfilRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', async (request, reply) => {
    await authenticatePortal(fastify, request, reply);
  });

  // GET /api/portal/perfil
  fastify.get(
    '/profile',
    {
      schema: {
        tags: ['Portal Segurado'],
        summary: 'Dados do perfil do segurado',
      },
    },
    async (request) => {
      const { clienteId } = request.portalCliente;

      const cliente = await db.query.clientes.findFirst({
        where: and(
          eq(clientes.id, clienteId),
          eq(clientes.ativo, true),
          isNull(clientes.deletedAt),
        ),
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
        },
      });

      if (!cliente) {
        return { success: false, error: 'Segurado não encontrado' };
      }

      return { success: true, data: cliente };
    },
  );

  // PATCH /api/portal/perfil — atualiza email e telefones
  fastify.patch(
    '/profile',
    {
      schema: {
        tags: ['Portal Segurado'],
        summary: 'Atualizar contato do segurado',
      },
    },
    async (request) => {
      const { clienteId } = request.portalCliente;
      const body = request.body as {
        email?: string;
        telefone?: string;
        celular?: string;
      };

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (body.email !== undefined) updateData.email = body.email || null;
      if (body.telefone !== undefined) updateData.telefone = body.telefone || null;
      if (body.celular !== undefined) updateData.celular = body.celular || null;

      const [updated] = await db
        .update(clientes)
        .set(updateData)
        .where(eq(clientes.id, clienteId))
        .returning({
          id: clientes.id,
          email: clientes.email,
          telefone: clientes.telefone,
          celular: clientes.celular,
        });

      return { success: true, data: updated };
    },
  );
};

export default portalPerfilRoutes;
