import { FastifyPluginAsync } from 'fastify';
import './middleware.js'; // augment FastifyRequest
import portalAuthRoutes from './auth.js';
import portalApolicesRoutes from './apolices.js';
import portalProdutosRoutes from './produtos.js';
import portalPerfilRoutes from './perfil.js';
import portalDocumentosRoutes from './documentos.js';
import portalCotacoesRoutes from './cotacoes.js';

const portalSeguradoRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(portalAuthRoutes);
  await fastify.register(portalApolicesRoutes);
  await fastify.register(portalProdutosRoutes);
  await fastify.register(portalPerfilRoutes);
  await fastify.register(portalDocumentosRoutes);
  await fastify.register(portalCotacoesRoutes);
};

export default portalSeguradoRoutes;
