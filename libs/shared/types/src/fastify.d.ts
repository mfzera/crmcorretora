// Minimal fields stored in the JWT token
export interface JWTTokenPayload {
  sub: string;
  corretoraId: string;
  cargoId: string | null;
  isAdmin: boolean;
  isGestor: boolean;
  isVendedor: boolean;
  /** true quando o usuário é gestorId de alguma equipe, independente do cargo */
  isLiderEquipe: boolean;
}

// Full runtime user type — minimal token fields + data loaded by authenticate middleware
export interface JWTPayload extends JWTTokenPayload {
  permissoes: string[]; // loaded from DB by authenticate middleware
  nome: string;        // loaded from DB by authenticate middleware
}

declare module 'fastify' {
  // NOTE: Using 'any' here to avoid circular dependency with database package
  // If you need the full Corretora type, import it where needed:
  // import type { Corretora } from '@ecotech/shared/database';

  interface FastifyInstance {
    resolveTenant: (
      request: FastifyRequest,
      corretoraId: string,
    ) => Promise<void>;
  }

  interface FastifyRequest {
    corretoraId: string;
    corretora: any; // Corretora type
    user: JWTPayload;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTTokenPayload;
    user: JWTPayload;
  }
}

export {};
