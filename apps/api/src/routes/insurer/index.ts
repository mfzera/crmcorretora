import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { authorize } from '@ecotech/plugins/authorization';
import { updateSeguradoraSchema, seguradoraService } from '@ecotech/features/seguradora';
import { seguradoraDocs } from '../../docs/seguradora/schemas.js';
import { ok } from '../../docs/index.js';

const seguradoraRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get(
    '/',
    { schema: { tags: ['Configurações'], summary: 'Obter dados da seguradora', ...seguradoraDocs.buscar } },
    async (request) => {
      const data = await seguradoraService.getDados(request.corretoraId);
      return ok(data as any);
    },
  );

  fastify.patch(
    '/',
    {
      schema: { tags: ['Configurações'], summary: 'Atualizar dados da seguradora', ...seguradoraDocs.atualizar },
      preHandler: [authorize(['config:editar_seguradora'])],
    },
    async (request) => {
      const data = updateSeguradoraSchema.parse(request.body);
      const updated = await seguradoraService.atualizar(request.corretoraId, data);
      return ok({
        id: updated.id,
        razaoSocial: updated.razaoSocial,
        nomeFantasia: updated.nomeFantasia,
        cnpj: updated.cnpj,
        subdominio: updated.subdominio,
        emailContato: updated.emailContato,
        telefone: updated.telefone,
        cep: updated.cep,
        logradouro: updated.logradouro,
        numero: updated.numero,
        complemento: updated.complemento,
        bairro: updated.bairro,
        cidade: updated.cidade,
        uf: updated.uf,
        logoUrl: updated.logoUrl,
        coresTema: updated.coresTema,
        updatedAt: updated.updatedAt as any,
      });
    },
  );

  fastify.get(
    '/usage',
    { schema: { tags: ['Configurações'], summary: 'Obter métricas de uso', ...seguradoraDocs.uso } },
    async (request) => {
      const data = await seguradoraService.getUso(request.corretoraId);
      return ok(data);
    },
  );

  fastify.post(
    '/logo',
    {
      schema: { tags: ['Configurações'], summary: 'Atualizar logo da seguradora', ...seguradoraDocs.atualizarLogo },
      preHandler: [authorize(['config:editar_seguradora'])],
    },
    async (request) => {
      const { logoUrl } = request.body;
      const updated = await seguradoraService.atualizarLogo(request.corretoraId, logoUrl);
      return ok({ logoUrl: updated.logoUrl as string });
    },
  );
};

export default seguradoraRoutes;
