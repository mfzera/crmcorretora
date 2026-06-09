import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';

const corretorasUsuarioRoutes: FastifyPluginAsyncZod = async function (fastify) {
  const { db, usuarios, usuarioCorretora, corretoras, cargos } = await import(
    '@ecotech/shared/database'
  );
  const { NotFoundError } = await import('@ecotech/shared/utils');
  const { generateTokenPayload } = await import('@ecotech/plugins/auth');
  const { resolveStoredFileUrl } = await import('@ecotech/shared/storage');

  fastify.addHook('preHandler', fastify.authenticate);

  // GET /auth/corretoras
  fastify.get(
    '/corretoras',
    {
      schema: {
        tags: ['Autenticação'],
        summary: 'Listar corretoras do usuário',
        description:
          'Retorna todas as corretoras que o usuário autenticado tem acesso',
      },
    },
    async (request, reply) => {
      const usuarioId = request.user.sub;

      // P2-A: query única com JOIN em vez de N queries individuais por corretora/cargo
      const [rows, [usuario]] = await Promise.all([
        db
          .select({
            dataVinculo: usuarioCorretora.dataVinculo,
            corretoraId: corretoras.id,
            razaoSocial: corretoras.razaoSocial,
            nomeFantasia: corretoras.nomeFantasia,
            cnpj: corretoras.cnpj,
            logoUrl: corretoras.logoUrl,
            status: corretoras.status,
            cargoId: cargos.id,
            nomeCargo: cargos.nomeCargo,
            isAdmin: cargos.isAdmin,
            isGestor: cargos.isGestor,
            isVendedor: cargos.isVendedor,
          })
          .from(usuarioCorretora)
          .innerJoin(corretoras, eq(usuarioCorretora.corretoraId, corretoras.id))
          .leftJoin(cargos, eq(usuarioCorretora.cargoId, cargos.id))
          .where(
            and(
              eq(usuarioCorretora.usuarioId, usuarioId),
              eq(usuarioCorretora.ativo, true),
            ),
          ),
        db
          .select({ corretoraAtivaId: usuarios.corretoraAtivaId })
          .from(usuarios)
          .where(eq(usuarios.id, usuarioId))
          .limit(1),
      ]);

      // Resolve logos em paralelo (signed URLs do R2)
      const logos = await Promise.all(
        rows.map((r) => resolveStoredFileUrl(r.logoUrl)),
      );

      const corretorasComDetalhes = rows.map((r, i) => ({
        id: r.corretoraId,
        razaoSocial: r.razaoSocial,
        nomeFantasia: r.nomeFantasia,
        cnpj: r.cnpj,
        logoUrl: logos[i],
        status: r.status,
        cargo: r.cargoId
          ? {
              id: r.cargoId,
              nome: r.nomeCargo,
              isAdmin: r.isAdmin,
              isGestor: r.isGestor,
              isVendedor: r.isVendedor,
            }
          : null,
        ativa: r.corretoraId === usuario?.corretoraAtivaId,
        dataVinculo: r.dataVinculo,
      }));

      return reply.send({ success: true, data: corretorasComDetalhes });
    },
  );

  // POST /auth/corretoras/switch
  const { loadUserRuntimeData } = await import('@ecotech/plugins/auth');

  fastify.post(
    '/corretoras/switch',
    {
      schema: {
        tags: ['Autenticação'],
        summary: 'Trocar corretora ativa',
        description:
          'Altera qual corretora o usuário está usando no momento. Retorna um novo token JWT.',
        body: z.object({ corretoraId: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const usuarioId = request.user.sub;
      const { corretoraId } = request.body as { corretoraId: string };

      const [vinculo] = await db
        .select()
        .from(usuarioCorretora)
        .where(
          and(
            eq(usuarioCorretora.usuarioId, usuarioId),
            eq(usuarioCorretora.corretoraId, corretoraId),
            eq(usuarioCorretora.ativo, true),
          ),
        )
        .limit(1);

      if (!vinculo) {
        throw new NotFoundError(
          'Corretora não encontrada ou você não tem acesso a ela',
        );
      }

      // Busca corretora e cargo em paralelo
      const [corretora, cargo] = await Promise.all([
        db.query.corretoras.findFirst({ where: eq(corretoras.id, corretoraId) }),
        vinculo.cargoId
          ? db.query.cargos.findFirst({ where: eq(cargos.id, vinculo.cargoId) })
          : Promise.resolve(null),
      ]);

      // P2-C: UPDATE com RETURNING evita um SELECT extra após o update
      // corretoraId (principal) NÃO é atualizado — seria violação de UNIQUE(corretora_id, email)
      const [usuario] = await db
        .update(usuarios)
        .set({
          corretoraAtivaId: corretoraId,
          cargoId: vinculo.cargoId || null,
          updatedAt: new Date(),
        })
        .where(eq(usuarios.id, usuarioId))
        .returning({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email });

      if (!usuario) {
        throw new NotFoundError('Usuário não encontrado');
      }

      const tokenPayload = await generateTokenPayload(usuarioId);
      const token = fastify.jwt.sign(tokenPayload);

      // loadUserRuntimeData retorna null só se inativo — generateTokenPayload acima já teria lançado
      const { permissoes } = (await loadUserRuntimeData(
        usuarioId,
        tokenPayload.isAdmin,
        tokenPayload.cargoId,
      ))!;

      return reply.send({
        success: true,
        data: {
          token,
          permissoes,
          usuario: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            corretoraId: corretoraId,
            corretoraAtiva: corretora
              ? {
                  id: corretora.id,
                  razaoSocial: corretora.razaoSocial,
                  nomeFantasia: corretora.nomeFantasia,
                }
              : null,
            cargo: cargo
              ? {
                  id: cargo.id,
                  nome: cargo.nomeCargo,
                  isAdmin: cargo.isAdmin,
                  isGestor: cargo.isGestor,
                  isVendedor: cargo.isVendedor,
                }
              : null,
          },
        },
        message: `Corretora alterada para ${corretora?.nomeFantasia ?? corretoraId}`,
      });
    },
  );
};

export default corretorasUsuarioRoutes;
