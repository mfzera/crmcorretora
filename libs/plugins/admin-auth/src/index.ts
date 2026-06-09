import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '@ecotech/shared/database';
import { admins } from '@ecotech/shared/database';
import { eq } from 'drizzle-orm';

declare module 'fastify' {
  interface FastifyRequest {
    adminId?: string;
    admin?: {
      id: string;
      email: string;
      nome: string;
      permissoes: string[];
    };
  }
}

export interface AdminAuthPluginOptions {
  jwtSecret?: string;
}

async function adminAuthPlugin(fastify: FastifyInstance, options: AdminAuthPluginOptions): Promise<void> {
  const adminJwtSecret =
    options.jwtSecret ||
    process.env.ADMIN_JWT_SECRET ||
    process.env.JWT_ADMIN_SECRET ||
    process.env.JWT_SECRET + '_admin';

  /**
   * Decorator: Autenticar admin via JWT
   */
  fastify.decorate(
    'authenticateAdmin',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({
            error: 'Token admin não fornecido',
          });
        }

        const token = authHeader.substring(7);
        const decoded = (fastify as any).adminJwtVerify(token);

        request.adminId = decoded.sub;
        request.admin = {
          id: decoded.sub,
          email: decoded.email,
          nome: decoded.nome,
          permissoes: decoded.permissoes || [],
        };
      } catch (error) {
        return reply.status(401).send({
          error: 'Token admin inválido ou expirado',
        });
      }
    },
  );

  /**
   * Decorator: Autorizar admin por permissões
   */
  fastify.decorate('authorizeAdmin', (requiredPermissions: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.admin) {
        return reply.status(401).send({
          error: 'Autenticação admin necessária',
        });
      }

      const hasPermission = requiredPermissions.some((permission) =>
        request.admin!.permissoes.includes(permission),
      );

      if (!hasPermission) {
        return reply.status(403).send({
          error: 'Permissão admin insuficiente',
          required: requiredPermissions,
          current: request.admin.permissoes,
        });
      }
    };
  });

  /**
   * Helper: Verificar senha de admin
   */
  fastify.decorate(
    'verifyAdminPassword',
    async (email: string, senha: string) => {
      const admin = await db.query.admins.findFirst({
        where: eq(admins.email, email),
      });

      if (!admin) {
        return null;
      }

      if (!admin.ativo) {
        return null;
      }

      const isValid = await bcrypt.compare(senha, admin.senha);

      if (!isValid) {
        return null;
      }

      return admin;
    },
  );

  /**
   * Helper: Criar admin JWT
   */
  // Criar os decoradores para sign/verify com secret específico
  fastify.decorate('adminJwtSign', (payload: any): string => {
    return jwt.sign(payload, adminJwtSecret as jwt.Secret, {
      expiresIn: (process.env.ADMIN_JWT_EXPIRES_IN || '7d') as any,
    });
  });

  fastify.decorate('adminJwtVerify', (token: string): any => {
    try {
      return jwt.verify(token, adminJwtSecret as jwt.Secret);
    } catch (error) {
      throw error;
    }
  });

  fastify.decorate('createAdminTempToken', (adminId: string): string => {
    return jwt.sign(
      { sub: adminId, type: 'pre2fa' },
      adminJwtSecret as jwt.Secret,
      { expiresIn: '5m' },
    );
  });

  fastify.decorate('verifyAdminTempToken', (token: string): string => {
    const decoded = jwt.verify(token, adminJwtSecret as jwt.Secret) as any;
    if (decoded.type !== 'pre2fa') {
      throw new Error('Token inválido');
    }
    return decoded.sub as string;
  });

  const createAdminToken = (admin: {
    id: string;
    email: string;
    nome: string;
    permissoes: string[];
  }): string => {
    return (fastify as any).adminJwtSign({
      sub: admin.id,
      email: admin.email,
      nome: admin.nome,
      permissoes: admin.permissoes,
    });
  };
  fastify.decorate('createAdminToken', createAdminToken);

  /**
   * Helper: Hash de senha
   */
  fastify.decorate('hashAdminPassword', async (senha: string) => {
    return await bcrypt.hash(senha, 10);
  });

  /**
   * Decorator: Audit Service
   */
  const { AdminAuditService } = await import('./audit.service.js');
  fastify.decorate('auditService', AdminAuditService);
};

// Export audit service
export { AdminAuditService } from './audit.service.js';

declare module 'fastify' {
  interface FastifyInstance {
    adminJwtSign(payload: any): string;
    adminJwtVerify(token: string): any;
    createAdminTempToken(adminId: string): string;
    verifyAdminTempToken(token: string): string;
    authenticateAdmin: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    authorizeAdmin: (
      requiredPermissions: string[],
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    verifyAdminPassword: (email: string, senha: string) => Promise<any>;
    createAdminToken: (admin: {
      id: string;
      email: string;
      nome: string;
      permissoes: string[];
    }) => string;
    hashAdminPassword: (senha: string) => Promise<string>;
    auditService: typeof import('./audit.service.js').AdminAuditService;
  }
}

// Cast needed: @scalar/fastify-api-reference pulls fastify-plugin@4.5.1 which creates a
// dual Fastify type context. This cast is safe — the module augmentations still apply globally.
export default fp(adminAuthPlugin as any, {
  name: 'admin-auth',
  dependencies: [],
});
