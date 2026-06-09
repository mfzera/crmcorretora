import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq, and } from 'drizzle-orm';
import { db, usuarios, cargos } from '@ecotech/shared/database';
import { generateTokenPayload } from '@ecotech/plugins/auth';
import { UnauthorizedError, ValidationError } from '@ecotech/shared/utils';
import { env } from '@ecotech/shared/utils/env';

const mcpAuthRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.post(
    '/mcp-token',
    {
      schema: {
        tags: ['Autenticação'],
        summary: 'Obter token de serviço para o MCP Server',
        description:
          'Endpoint interno — valida o secret do MCP Server e retorna um JWT para uma corretora específica.',
        security: [],
      },
    },
    async (request) => {
      const secret = (request.headers as Record<string, string>)['x-mcp-secret'];

      if (!env.MCP_INTERNAL_SECRET) {
        throw new ValidationError('MCP não configurado neste servidor');
      }

      if (secret !== env.MCP_INTERNAL_SECRET) {
        throw new UnauthorizedError('Secret inválido');
      }

      const { corretoraId } = request.body as { corretoraId: string };

      if (!corretoraId) {
        throw new ValidationError('corretoraId é obrigatório');
      }

      // Busca o usuário admin da corretora
      const adminUser = await db
        .select({ id: usuarios.id })
        .from(usuarios)
        .innerJoin(cargos, eq(usuarios.cargoId, cargos.id))
        .where(
          and(
            eq(usuarios.corretoraId, corretoraId),
            eq(usuarios.ativo, true),
            eq(cargos.isAdmin, true),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (!adminUser) {
        throw new ValidationError('Nenhum usuário admin encontrado para esta corretora');
      }

      const payload = await generateTokenPayload(adminUser.id);
      const token = fastify.jwt.sign(payload, { expiresIn: '1h' } as any);

      return {
        success: true,
        data: { token, expiresIn: 3600 },
      };
    },
  );
};

export default mcpAuthRoutes;
