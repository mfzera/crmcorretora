import type { FastifyInstance } from 'fastify';

export interface TestJwtPayload {
  sub: string;
  corretoraId: string;
  cargoId: string | null;
  isAdmin: boolean;
  isGestor: boolean;
  isVendedor: boolean;
  permissoes: string[];
  nome: string;
  email: string;
  avatarUrl: null;
}

export function generateTestToken(
  app: FastifyInstance,
  payload: TestJwtPayload,
): string {
  return app.jwt.sign(payload);
}

export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}
