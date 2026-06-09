import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { authorize } from '@ecotech/plugins/authorization';
import { ValidationError, NotFoundError } from '@ecotech/shared/utils';
import { success } from '@ecotech/shared/utils/api-helpers';

const transferirRenovacoesSchema = z.object({
  renovacaoIds: z
    .array(z.string().uuid())
    .min(1, 'Selecione ao menos uma renovação'),
  novoVendedorId: z.string().uuid('ID do vendedor inválido'),
});

const transferirRenovacoesRoute: FastifyPluginAsyncZod = async function (fastify) {
  const { db, renovacoesComerciais, usuarios, cotacoes } =
    await import('@ecotech/shared/database');

  console.log('[ROUTE REGISTERED] POST /renovacoes/transferir');

  fastify.post(
    '/transferir',
    {
      preHandler: [authorize(['vendas:visualizar_documento_venda'])],
    },
    async (request, reply) => {
      console.log('[ROUTE CALLED] POST /transferir');
      const { renovacaoIds, novoVendedorId } = transferirRenovacoesSchema.parse(
        request.body,
      );
      const vendedorAtualId = request.user.sub;

      // Validação 1: Não pode transferir para si mesmo
      if (novoVendedorId === vendedorAtualId) {
        throw new ValidationError('Não é possível transferir para si mesmo');
      }

      // Validação 2: Novo vendedor existe e pertence à mesma corretora
      const { usuarioCorretora } = await import('@ecotech/shared/database');

      // Verificar se o novo vendedor está vinculado a esta corretora
      const vinculo = await db.query.usuarioCorretora.findFirst({
        where: and(
          eq(usuarioCorretora.usuarioId, novoVendedorId),
          eq(usuarioCorretora.corretoraId, request.corretoraId),
          eq(usuarioCorretora.ativo, true),
        ),
      });

      if (!vinculo) {
        throw new NotFoundError(
          'Vendedor destinatário não encontrado nesta corretora',
        );
      }

      // Buscar dados do vendedor
      const novoVendedor = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, novoVendedorId),
      });

      if (!novoVendedor) {
        throw new NotFoundError('Vendedor destinatário não encontrado');
      }

      // Validação 3: Buscar renovações do vendedor atual
      const renovacoes = await db.query.renovacoesComerciais.findMany({
        where: and(
          inArray(renovacoesComerciais.id, renovacaoIds),
          eq(renovacoesComerciais.corretoraId, request.corretoraId),
          eq(renovacoesComerciais.vendedorId, vendedorAtualId),
        ),
      });

      if (renovacoes.length === 0) {
        throw new NotFoundError('Nenhuma renovação encontrada para transferir');
      }

      if (renovacoes.length !== renovacaoIds.length) {
        throw new ValidationError('Algumas renovações não pertencem a você');
      }

      // Validação 4: Verificar status (não permitir finalizadas)
      const statusBloqueados = ['RENOVADO', 'PERDIDO', 'CANCELADO'];
      const renovacoesFinalizadas = renovacoes.filter((r) =>
        statusBloqueados.includes(r.status),
      );

      if (renovacoesFinalizadas.length > 0) {
        throw new ValidationError(
          `Não é possível transferir renovações finalizadas (${renovacoesFinalizadas.length} encontradas)`,
        );
      }

      // Transação para transferir
      await db.transaction(async (tx) => {
        // Atualizar renovações
        await tx
          .update(renovacoesComerciais)
          .set({
            vendedorId: novoVendedorId,
            vendedorSecundarioNovoId: vendedorAtualId,
            transferidaPorId: vendedorAtualId,
            transferidaEm: new Date(),
            vendedorOriginalId: vendedorAtualId,
            updatedAt: new Date(),
          })
          .where(inArray(renovacoesComerciais.id, renovacaoIds));

        // Atualizar cotações em elaboração vinculadas às renovações transferidas.
        // Só trocar vendedor quando ele ainda é o vendedor original — se houver
        // split comercial (vendedor != vendedor original), preservar o split.
        // atuanteId NUNCA é sobrescrito: quem está operando continua operando.
        await tx
          .update(cotacoes)
          .set({
            vendedorId: novoVendedorId,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(cotacoes.corretoraId, request.corretoraId),
              eq(cotacoes.status, 'EM_ELABORACAO'),
              eq(cotacoes.vendedorId, vendedorAtualId),
              sql`${cotacoes.detalhesRisco}->>'renovacaoId' IN (${sql.join(renovacaoIds.map((id) => sql`${id}`), sql`, `)})`,
            ),
          );
      });

      return success({
        message: `${renovacoes.length} renovação(ões) transferida(s) com sucesso`,
        transferidas: renovacoes.length,
      });
    },
  );
};

export default transferirRenovacoesRoute;
