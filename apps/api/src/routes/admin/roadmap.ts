import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@ecotech/shared/database';
import {
  roadmapPhases,
  roadmapItems,
  insertRoadmapPhaseSchema,
  updateRoadmapPhaseSchema,
  insertRoadmapItemSchema,
  updateRoadmapItemSchema,
} from '@ecotech/shared/database';
import { eq, asc, isNull, and } from 'drizzle-orm';
import type { RoadmapPhase, RoadmapItem } from '@ecotech/shared/database';

function mapPhase(phase: RoadmapPhase) {
  return {
    id: phase.id,
    name: phase.name,
    estimatedDate: phase.estimatedDate,
    isPublished: phase.isPublished,
    publishedAt: phase.publishedAt,
    publishedBy: phase.publishedBy,
    order: phase.order,
    createdAt: phase.createdAt,
    updatedAt: phase.updatedAt,
  };
}

function mapItem(item: RoadmapItem) {
  return {
    id: item.id,
    phaseId: item.phaseId,
    title: item.title,
    description: item.description,
    status: item.status,
    order: item.order,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

const idParams = z.object({ id: z.string().uuid() });
const roadmapItemStatusEnum = z.enum(['done', 'in_progress', 'planned']);

const roadmapRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /api/admin/roadmap/phases - Listar todas as fases (incluindo não publicadas)
  fastify.get(
    '/roadmap/phases',
    {
      schema: {
        tags: ['Admin', 'Roadmap'],
        summary: 'Listar fases do roadmap',
        response: {
          200: z.object({
            phases: z.array(z.unknown()),
            total: z.number(),
          }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_roadmap']),
    },
    async () => {
      const allPhases = await db
        .select()
        .from(roadmapPhases)
        .where(isNull(roadmapPhases.deletedAt))
        .orderBy(asc(roadmapPhases.estimatedDate), asc(roadmapPhases.order));

      const phasesWithItems = await Promise.all(
        allPhases.map(async (phase) => {
          const items = await db
            .select()
            .from(roadmapItems)
            .where(
              and(
                eq(roadmapItems.phaseId, phase.id),
                isNull(roadmapItems.deletedAt),
              ),
            )
            .orderBy(asc(roadmapItems.order));
          return {
            id: phase.id,
            name: phase.name,
            estimatedDate: phase.estimatedDate,
            isPublished: phase.isPublished,
            publishedAt: phase.publishedAt,
            publishedBy: phase.publishedBy,
            order: phase.order,
            createdAt: phase.createdAt,
            updatedAt: phase.updatedAt,
            items: items.map((item) => ({
              id: item.id,
              phaseId: item.phaseId,
              title: item.title,
              description: item.description,
              status: item.status,
              order: item.order,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            })),
          };
        }),
      );

      return { phases: phasesWithItems, total: phasesWithItems.length };
    },
  );

  // GET /api/admin/roadmap/phases/:id - Obter fase específica
  fastify.get(
    '/roadmap/phases/:id',
    {
      schema: {
        tags: ['Admin', 'Roadmap'],
        summary: 'Obter fase do roadmap',
        params: idParams,
        response: {
          200: z.unknown(),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_roadmap']),
    },
    async (request, reply) => {
      const { id } = request.params;

      const [phase] = await db
        .select()
        .from(roadmapPhases)
        .where(and(eq(roadmapPhases.id, id), isNull(roadmapPhases.deletedAt)));

      if (!phase) {
        return reply.status(404).send({ error: 'Fase não encontrada' });
      }

      const items = await db
        .select()
        .from(roadmapItems)
        .where(
          and(eq(roadmapItems.phaseId, id), isNull(roadmapItems.deletedAt)),
        )
        .orderBy(asc(roadmapItems.order));

      return {
        id: phase.id,
        name: phase.name,
        estimatedDate: phase.estimatedDate,
        isPublished: phase.isPublished,
        publishedAt: phase.publishedAt,
        publishedBy: phase.publishedBy,
        order: phase.order,
        createdAt: phase.createdAt,
        updatedAt: phase.updatedAt,
        items: items.map((item) => ({
          id: item.id,
          phaseId: item.phaseId,
          title: item.title,
          description: item.description,
          status: item.status,
          order: item.order,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      };
    },
  );

  // POST /api/admin/roadmap/phases - Criar nova fase
  fastify.post(
    '/roadmap/phases',
    {
      schema: {
        tags: ['Admin', 'Roadmap'],
        summary: 'Criar fase do roadmap',
        body: z.object({
          name: z.string().min(1),
          estimatedDate: z.string().regex(/^\d{4}-\d{2}$/),
          isPublished: z.boolean().default(false),
          order: z.string().optional(),
        }),
        response: {
          201: z.object({ phase: z.unknown(), message: z.string() }),
          400: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_roadmap']),
    },
    async (request, reply) => {
      const validatedData = insertRoadmapPhaseSchema.parse({
        ...request.body,
        publishedAt: request.body.isPublished ? new Date() : null,
        publishedBy: request.body.isPublished ? request.admin!.email : null,
      });

      const [newPhase] = await db
        .insert(roadmapPhases)
        .values(validatedData)
        .returning();

      return reply.status(201).send({
        phase: mapPhase(newPhase),
        message: 'Fase criada com sucesso',
      });
    },
  );

  // PATCH /api/admin/roadmap/phases/:id - Atualizar fase
  fastify.patch(
    '/roadmap/phases/:id',
    {
      schema: {
        tags: ['Admin', 'Roadmap'],
        summary: 'Atualizar fase do roadmap',
        params: idParams,
        body: z.object({
          name: z.string().optional(),
          estimatedDate: z.string().regex(/^\d{4}-\d{2}$/).optional(),
          order: z.string().optional(),
        }),
        response: {
          200: z.object({ phase: z.unknown(), message: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_roadmap']),
    },
    async (request, reply) => {
      const { id } = request.params;

      const [existing] = await db
        .select()
        .from(roadmapPhases)
        .where(and(eq(roadmapPhases.id, id), isNull(roadmapPhases.deletedAt)));

      if (!existing) {
        return reply.status(404).send({ error: 'Fase não encontrada' });
      }

      const validatedData = updateRoadmapPhaseSchema.parse(request.body);

      const [updated] = await db
        .update(roadmapPhases)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(roadmapPhases.id, id))
        .returning();

      return { phase: mapPhase(updated), message: 'Fase atualizada com sucesso' };
    },
  );

  // POST /api/admin/roadmap/phases/:id/publish - Publicar fase
  fastify.post(
    '/roadmap/phases/:id/publish',
    {
      schema: {
        tags: ['Admin', 'Roadmap'],
        summary: 'Publicar fase do roadmap',
        params: idParams,
        response: {
          200: z.object({ phase: z.unknown(), message: z.string() }),
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_roadmap']),
    },
    async (request, reply) => {
      const { id } = request.params;

      const [phase] = await db
        .select()
        .from(roadmapPhases)
        .where(and(eq(roadmapPhases.id, id), isNull(roadmapPhases.deletedAt)));

      if (!phase) {
        return reply.status(404).send({ error: 'Fase não encontrada' });
      }

      if (phase.isPublished) {
        return reply.status(400).send({ error: 'Fase já está publicada' });
      }

      const [updated] = await db
        .update(roadmapPhases)
        .set({
          isPublished: true,
          publishedAt: new Date(),
          publishedBy: request.admin!.email,
          updatedAt: new Date(),
        })
        .where(eq(roadmapPhases.id, id))
        .returning();

      return { phase: mapPhase(updated), message: 'Fase publicada com sucesso' };
    },
  );

  // POST /api/admin/roadmap/phases/:id/unpublish - Despublicar fase
  fastify.post(
    '/roadmap/phases/:id/unpublish',
    {
      schema: {
        tags: ['Admin', 'Roadmap'],
        summary: 'Despublicar fase do roadmap',
        params: idParams,
        response: {
          200: z.object({ phase: z.unknown(), message: z.string() }),
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_roadmap']),
    },
    async (request, reply) => {
      const { id } = request.params;

      const [phase] = await db
        .select()
        .from(roadmapPhases)
        .where(and(eq(roadmapPhases.id, id), isNull(roadmapPhases.deletedAt)));

      if (!phase) {
        return reply.status(404).send({ error: 'Fase não encontrada' });
      }

      if (!phase.isPublished) {
        return reply.status(400).send({ error: 'Fase já está despublicada' });
      }

      const [updated] = await db
        .update(roadmapPhases)
        .set({ isPublished: false, updatedAt: new Date() })
        .where(eq(roadmapPhases.id, id))
        .returning();

      return { phase: mapPhase(updated), message: 'Fase despublicada com sucesso' };
    },
  );

  // DELETE /api/admin/roadmap/phases/:id - Deletar fase (soft delete)
  fastify.delete(
    '/roadmap/phases/:id',
    {
      schema: {
        tags: ['Admin', 'Roadmap'],
        summary: 'Deletar fase do roadmap',
        params: idParams,
        response: {
          200: z.object({ message: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_roadmap']),
    },
    async (request, reply) => {
      const { id } = request.params;

      const [phase] = await db
        .select()
        .from(roadmapPhases)
        .where(and(eq(roadmapPhases.id, id), isNull(roadmapPhases.deletedAt)));

      if (!phase) {
        return reply.status(404).send({ error: 'Fase não encontrada' });
      }

      await db
        .update(roadmapPhases)
        .set({ deletedAt: new Date() })
        .where(eq(roadmapPhases.id, id));

      await db
        .update(roadmapItems)
        .set({ deletedAt: new Date() })
        .where(eq(roadmapItems.phaseId, id));

      return { message: 'Fase deletada com sucesso' };
    },
  );

  // POST /api/admin/roadmap/phases/:id/items - Criar item na fase
  fastify.post(
    '/roadmap/phases/:id/items',
    {
      schema: {
        tags: ['Admin', 'Roadmap'],
        summary: 'Criar item do roadmap',
        params: idParams,
        body: z.object({
          title: z.string(),
          description: z.string().optional(),
          status: roadmapItemStatusEnum.optional(),
          order: z.string().optional(),
        }),
        response: {
          201: z.object({ item: z.unknown(), message: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_roadmap']),
    },
    async (request, reply) => {
      const { id } = request.params;

      const [phase] = await db
        .select()
        .from(roadmapPhases)
        .where(and(eq(roadmapPhases.id, id), isNull(roadmapPhases.deletedAt)));

      if (!phase) {
        return reply.status(404).send({ error: 'Fase não encontrada' });
      }

      const validatedData = insertRoadmapItemSchema.parse({
        ...request.body,
        phaseId: id,
      });

      const [newItem] = await db
        .insert(roadmapItems)
        .values(validatedData)
        .returning();

      return reply
        .status(201)
        .send({ item: mapItem(newItem), message: 'Item adicionado com sucesso' });
    },
  );

  // PATCH /api/admin/roadmap/items/:id - Atualizar item
  fastify.patch(
    '/roadmap/items/:id',
    {
      schema: {
        tags: ['Admin', 'Roadmap'],
        summary: 'Atualizar item do roadmap',
        params: idParams,
        body: z.object({
          title: z.string().optional(),
          description: z.string().optional(),
          status: roadmapItemStatusEnum.optional(),
          order: z.string().optional(),
        }),
        response: {
          200: z.object({ item: z.unknown(), message: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_roadmap']),
    },
    async (request, reply) => {
      const { id } = request.params;

      const [existing] = await db
        .select()
        .from(roadmapItems)
        .where(and(eq(roadmapItems.id, id), isNull(roadmapItems.deletedAt)));

      if (!existing) {
        return reply.status(404).send({ error: 'Item não encontrado' });
      }

      const validatedData = updateRoadmapItemSchema.parse(request.body);

      const [updated] = await db
        .update(roadmapItems)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(roadmapItems.id, id))
        .returning();

      return { item: mapItem(updated), message: 'Item atualizado com sucesso' };
    },
  );

  // DELETE /api/admin/roadmap/items/:id - Deletar item (soft delete)
  fastify.delete(
    '/roadmap/items/:id',
    {
      schema: {
        tags: ['Admin', 'Roadmap'],
        summary: 'Deletar item do roadmap',
        params: idParams,
        response: {
          200: z.object({ message: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_roadmap']),
    },
    async (request, reply) => {
      const { id } = request.params;

      const [item] = await db
        .select()
        .from(roadmapItems)
        .where(and(eq(roadmapItems.id, id), isNull(roadmapItems.deletedAt)));

      if (!item) {
        return reply.status(404).send({ error: 'Item não encontrado' });
      }

      await db
        .update(roadmapItems)
        .set({ deletedAt: new Date() })
        .where(eq(roadmapItems.id, id));

      return { message: 'Item deletado com sucesso' };
    },
  );
};

export default roadmapRoutes;
