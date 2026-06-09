import type { Corretora } from '@ecotech/shared/database';

declare module 'fastify' {
  interface FastifyRequest {
    corretoraId: string;
    corretora: Corretora;
    user: {
      sub: string;
      corretoraId: string;
      cargoId: string | null;
      isAdmin: boolean;
      isGestor: boolean;
      isVendedor: boolean;
      permissoes: string[];
      nome: string;
      email: string;
    };
  }
}
