import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db, corretoras } from '@ecotech/shared/database';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '@ecotech/shared/utils';

const publicCorretoraRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /api/public/corretora?subdominio=X — Branding da corretora para o portal do segurado
  fastify.get(
    '/corretora',
    {
      schema: {
        tags: ['Public'],
        summary: 'Dados públicos da corretora',
        description:
          'Retorna dados públicos de uma corretora pelo subdomínio. Usado pelo portal do segurado para exibir o branding correto.',
        security: [],
        querystring: z.object({
          subdominio: z.string(),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              nomeFantasia: z.string().nullable(),
              razaoSocial: z.string(),
              cnpj: z.string(),
              cidade: z.string().nullable(),
              uf: z.string().nullable(),
              logoUrl: z.string().nullable(),
              coresTema: z.unknown().nullable(),
              emailContato: z.string().nullable(),
              telefone: z.string().nullable(),
            }),
          }),
        },
      },
    },
    async (request) => {
      const { subdominio } = request.query;

      const corretora = await db.query.corretoras.findFirst({
        where: eq(corretoras.subdominio, subdominio.toLowerCase()),
        columns: {
          id: true,
          nomeFantasia: true,
          razaoSocial: true,
          cnpj: true,
          cidade: true,
          uf: true,
          logoUrl: true,
          coresTema: true,
          emailContato: true,
          telefone: true,
          status: true,
        },
      });

      if (!corretora || corretora.status === 'INATIVO') {
        throw new NotFoundError('Corretora não encontrada');
      }

      const { resolveStoredFileUrl } = await import('@ecotech/shared/storage');
      const logoUrl = await resolveStoredFileUrl(corretora.logoUrl);

      return {
        success: true as const,
        data: {
          nomeFantasia: corretora.nomeFantasia,
          razaoSocial: corretora.razaoSocial,
          cnpj: corretora.cnpj,
          cidade: corretora.cidade,
          uf: corretora.uf,
          logoUrl,
          coresTema: corretora.coresTema,
          emailContato: corretora.emailContato,
          telefone: corretora.telefone,
        },
      };
    },
  );
};

export default publicCorretoraRoutes;
