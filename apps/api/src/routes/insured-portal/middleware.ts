// Tipo que representa o segurado autenticado no portal
export interface PortalCliente {
  clienteId: string;
  corretoraId: string;
  tokenId: string;
  nome: string;
  tipoPessoa: 'PF' | 'PJ';
}

// Augment FastifyRequest para incluir portalCliente
declare module 'fastify' {
  interface FastifyRequest {
    portalCliente: PortalCliente;
  }
}
