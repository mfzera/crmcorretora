import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { ok } from '../../docs/index.js';
import { db } from '@ecotech/shared/database';
import { vendedores } from '@ecotech/shared/database';
import { eq, and, ilike, or, sql } from 'drizzle-orm';
import { authorize, authorizeAny } from '@ecotech/plugins/authorization';
import {
  createVendedorSchema,
  updateVendedorSchema,
  listVendedoresQuerySchema,
} from '@ecotech/features/vendedores';
import { NotFoundError, ConflictError } from '@ecotech/shared/utils';
import {
  getPaginationParams,
  createPaginatedResult,
} from '@ecotech/shared/utils';

const vendedoresRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // List vendedores
  fastify.get(
    '/',
    {
      preHandler: [authorizeAny(['vendedores:visualizar', 'workspace:acessar'])],
    },
    async (request) => {
      const query = listVendedoresQuerySchema.parse(request.query);

      if (query.select) {
        const results = await db
          .select({ id: vendedores.id, nome: vendedores.nome, tipo: vendedores.tipo })
          .from(vendedores)
          .where(
            and(
              eq(vendedores.corretoraId, request.corretoraId),
              eq(vendedores.ativo, true),
            ),
          )
          .orderBy(vendedores.nome);
        return ok(results);
      }

      const { limit: rawLimit, offset } = getPaginationParams(query);
      const limit = rawLimit ?? 20;

      const conditions = [eq(vendedores.corretoraId, request.corretoraId)];

      if (query.search) {
        conditions.push(
          or(
            ilike(vendedores.nome, `%${query.search}%`),
            ilike(vendedores.email, `%${query.search}%`),
          ) as ReturnType<typeof eq>,
        );
      }

      if (query.tipo) {
        conditions.push(eq(vendedores.tipo, query.tipo));
      }

      if (query.ativo !== undefined) {
        conditions.push(eq(vendedores.ativo, query.ativo === 'true'));
      }

      const where = and(...conditions);

      const [data, [countRow]] = await Promise.all([
        db
          .select()
          .from(vendedores)
          .where(where)
          .orderBy(vendedores.nome)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(vendedores)
          .where(where),
      ]);

      return ok(
        createPaginatedResult(data, countRow.count, query.page, query.limit),
      );
    },
  );

  // Create vendedor
  fastify.post(
    '/',
    {
      preHandler: [authorize(['vendedores:gerenciar'])],
    },
    async (request, reply) => {
      const data = createVendedorSchema.parse(request.body);

      if (data.email) {
        const existing = await db.query.vendedores.findFirst({
          where: and(
            eq(vendedores.corretoraId, request.corretoraId),
            eq(vendedores.email, data.email),
          ),
        });
        if (existing) {
          throw new ConflictError(
            'Já existe um vendedor com este email nesta corretora',
          );
        }
      }

      const [vendedor] = await db
        .insert(vendedores)
        .values({
          corretoraId: request.corretoraId,
          nome: data.nome,
          email: data.email || null,
          telefone: data.telefone || null,
          tipo: data.tipo,
          observacoes: data.observacoes || null,
        })
        .returning();

      return reply.status(201).send(ok(vendedor));
    },
  );

  // Get single vendedor
  fastify.get(
    '/:id',
    {
      preHandler: [authorize(['vendedores:visualizar'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const vendedor = await db.query.vendedores.findFirst({
        where: and(
          eq(vendedores.id, id),
          eq(vendedores.corretoraId, request.corretoraId),
        ),
      });

      if (!vendedor) throw new NotFoundError('Vendedor não encontrado');

      return ok(vendedor);
    },
  );

  // Update vendedor
  fastify.patch(
    '/:id',
    {
      preHandler: [authorize(['vendedores:gerenciar'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const data = updateVendedorSchema.parse(request.body);

      const existing = await db.query.vendedores.findFirst({
        where: and(
          eq(vendedores.id, id),
          eq(vendedores.corretoraId, request.corretoraId),
        ),
      });

      if (!existing) throw new NotFoundError('Vendedor não encontrado');

      if (data.email && data.email !== existing.email) {
        const emailConflict = await db.query.vendedores.findFirst({
          where: and(
            eq(vendedores.corretoraId, request.corretoraId),
            eq(vendedores.email, data.email),
          ),
        });
        if (emailConflict) {
          throw new ConflictError(
            'Já existe um vendedor com este email nesta corretora',
          );
        }
      }

      const [updated] = await db
        .update(vendedores)
        .set({
          ...data,
          email: data.email === null ? null : (data.email ?? existing.email),
          telefone: data.telefone === null ? null : (data.telefone ?? existing.telefone),
          observacoes: data.observacoes === null ? null : (data.observacoes ?? existing.observacoes),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(vendedores.id, id),
            eq(vendedores.corretoraId, request.corretoraId),
          ),
        )
        .returning();

      return ok(updated);
    },
  );

  // Delete (deactivate) vendedor
  fastify.delete(
    '/:id',
    {
      preHandler: [authorize(['vendedores:gerenciar'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const existing = await db.query.vendedores.findFirst({
        where: and(
          eq(vendedores.id, id),
          eq(vendedores.corretoraId, request.corretoraId),
        ),
      });

      if (!existing) throw new NotFoundError('Vendedor não encontrado');

      await db
        .delete(vendedores)
        .where(
          and(
            eq(vendedores.id, id),
            eq(vendedores.corretoraId, request.corretoraId),
          ),
        );

      return reply.status(204).send();
    },
  );
};

export default vendedoresRoutes;
