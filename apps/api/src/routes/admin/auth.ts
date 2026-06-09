import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { AdminAuditService } from '@ecotech/plugins/admin-auth';
import { verifyRecaptcha } from '../../utils/recaptcha';

// Schemas de validação
const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
});


const adminAuthRoutes: FastifyPluginAsyncZod = async function (fastify) {
  const { db, admins } = await import('@ecotech/shared/database');

  /**
   * POST /api/admin/auth/login
   * Login de admin
   */
  fastify.post(
    '/login',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Login admin',
        description: 'Autenticação de usuário administrativo',
        body: loginSchema,
      },
    },
    async (request, reply) => {
      const body = request.body as {
        email: string;
        senha: string;
        recaptchaToken?: string;
      };

      if (
        body.recaptchaToken &&
        !(await verifyRecaptcha(body.recaptchaToken))
      ) {
        return reply
          .status(400)
          .send({ error: 'Verificação de segurança falhou. Tente novamente.' });
      }

      const { email, senha } = loginSchema.parse(body);

      // Verificar credenciais
      const admin = await fastify.verifyAdminPassword(email, senha);

      if (!admin) {
        return reply.status(401).send({
          error: 'Email ou senha inválidos',
        });
      }

      // Se 2FA estiver ativado, retornar temp token em vez do token completo
      if (admin.totpEnabled) {
        const tempToken = fastify.createAdminTempToken(admin.id);
        return reply.send({ requiresTwoFactor: true, tempToken });
      }

      // Atualizar último login
      await db
        .update(admins)
        .set({ ultimoLogin: new Date() })
        .where(eq(admins.id, admin.id));

      // Criar token
      const token = fastify.createAdminToken({
        id: admin.id,
        email: admin.email,
        nome: admin.nome,
        permissoes: admin.permissoes as string[],
      });

      // Log de auditoria
      await AdminAuditService.logLogin(admin.id, admin.email, request);

      let avatarUrl: string | null = null;
      if (admin.avatarR2Key) {
        try {
          const { storageClient } = await import('@ecotech/shared/storage');
          avatarUrl = await storageClient.getSignedDownloadUrl(admin.avatarR2Key);
        } catch {}
      }

      return reply.send({
        admin: {
          id: admin.id,
          email: admin.email,
          nome: admin.nome,
          permissoes: admin.permissoes,
          avatarUrl,
        },
        token,
      });
    },
  );

  /**
   * GET /api/admin/auth/me
   * Obter dados do admin logado
   */
  fastify.get(
    '/me',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Dados do admin',
        description: 'Retorna dados do admin autenticado',
      },
      preHandler: [fastify.authenticateAdmin],
    },
    async (request, reply) => {
      const admin = await db.query.admins.findFirst({
        where: eq(admins.id, request.adminId!),
      });

      if (!admin) {
        return reply.status(404).send({
          error: 'Admin não encontrado',
        });
      }

      let avatarUrl: string | null = null;
      if (admin.avatarR2Key) {
        try {
          const { storageClient } = await import('@ecotech/shared/storage');
          avatarUrl = await storageClient.getSignedDownloadUrl(admin.avatarR2Key);
        } catch {}
      }

      return reply.send({
        id: admin.id,
        email: admin.email,
        nome: admin.nome,
        permissoes: admin.permissoes,
        ultimoLogin: admin.ultimoLogin,
        ativo: admin.ativo,
        avatarUrl,
      });
    },
  );

  /**
   * PATCH /api/admin/auth/profile
   * Atualizar perfil do admin logado (nome e/ou senha)
   */
  fastify.patch(
    '/profile',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Atualizar perfil',
        description: 'Atualiza nome e/ou senha do admin autenticado',
        body: z.object({
          nome: z.string().min(3).optional(),
          senhaAtual: z.string().min(6).optional(),
          novaSenha: z.string().min(8).optional(),
        }),
      },
      preHandler: [fastify.authenticateAdmin],
    },
    async (request, reply) => {
      const body = request.body as {
        nome?: string;
        senhaAtual?: string;
        novaSenha?: string;
      };

      const admin = await db.query.admins.findFirst({
        where: eq(admins.id, request.adminId!),
      });

      if (!admin) {
        return reply.status(404).send({ error: 'Admin não encontrado' });
      }

      const updates: { nome?: string; senha?: string; updatedAt: Date } = {
        updatedAt: new Date(),
      };

      if (body.nome) {
        updates.nome = body.nome;
      }

      if (body.novaSenha) {
        if (!body.senhaAtual) {
          return reply.status(400).send({ error: 'Informe a senha atual para trocar a senha' });
        }
        const senhaValida = await fastify.verifyAdminPassword(admin.email, body.senhaAtual);
        if (!senhaValida) {
          return reply.status(400).send({ error: 'Senha atual incorreta' });
        }
        updates.senha = await fastify.hashAdminPassword(body.novaSenha);
      }

      const [updated] = await db
        .update(admins)
        .set(updates)
        .where(eq(admins.id, admin.id))
        .returning();

      let avatarUrl: string | null = null;
      if (updated.avatarR2Key) {
        try {
          const { storageClient } = await import('@ecotech/shared/storage');
          avatarUrl = await storageClient.getSignedDownloadUrl(updated.avatarR2Key);
        } catch {}
      }

      return reply.send({
        admin: {
          id: updated.id,
          email: updated.email,
          nome: updated.nome,
          permissoes: updated.permissoes,
          avatarUrl,
        },
        message: 'Perfil atualizado com sucesso',
      });
    },
  );

  /**
   * POST /api/admin/auth/avatar
   * Upload de foto de perfil do admin
   */
  fastify.post(
    '/avatar',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Upload de foto de perfil',
        description: 'Faz upload da foto de perfil do admin autenticado',
      },
      preHandler: [fastify.authenticateAdmin],
    },
    async (request, reply) => {
      const admin = await db.query.admins.findFirst({
        where: eq(admins.id, request.adminId!),
      });

      if (!admin) {
        return reply.status(404).send({ error: 'Admin não encontrado' });
      }

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'Nenhum arquivo enviado' });
      }

      const buffer = await data.toBuffer();

      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(data.mimetype)) {
        return reply.status(400).send({ error: 'Formato inválido. Envie JPG, PNG ou WebP' });
      }

      const maxSize = 2 * 1024 * 1024;
      if (buffer.length > maxSize) {
        return reply.status(400).send({ error: 'Arquivo muito grande. Máximo: 2MB' });
      }

      const { storageClient } = await import('@ecotech/shared/storage');
      const { v4: uuidv4 } = await import('uuid');
      const ext = data.filename.split('.').pop() || 'jpg';
      const r2Key = `admin/avatars/${admin.id}/${uuidv4()}.${ext}`;

      if (admin.avatarR2Key) {
        try { await storageClient.delete(admin.avatarR2Key); } catch {}
      }

      await storageClient.upload(r2Key, buffer, data.mimetype);

      const [updated] = await db
        .update(admins)
        .set({ avatarR2Key: r2Key, updatedAt: new Date() })
        .where(eq(admins.id, admin.id))
        .returning();

      const avatarUrl = await storageClient.getSignedDownloadUrl(updated.avatarR2Key!);

      return reply.send({ avatarUrl });
    },
  );

  /**
   * DELETE /api/admin/auth/avatar
   * Remove foto de perfil do admin
   */
  fastify.delete(
    '/avatar',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Remover foto de perfil',
        description: 'Remove a foto de perfil do admin autenticado',
      },
      preHandler: [fastify.authenticateAdmin],
    },
    async (request, reply) => {
      const admin = await db.query.admins.findFirst({
        where: eq(admins.id, request.adminId!),
      });

      if (!admin) {
        return reply.status(404).send({ error: 'Admin não encontrado' });
      }

      if (admin.avatarR2Key) {
        const { storageClient } = await import('@ecotech/shared/storage');
        try { await storageClient.delete(admin.avatarR2Key); } catch {}
      }

      await db
        .update(admins)
        .set({ avatarR2Key: null, updatedAt: new Date() })
        .where(eq(admins.id, admin.id));

      return reply.send({ message: 'Foto removida com sucesso' });
    },
  );

  /**
   * POST /api/admin/auth/logout
   * Logout de admin (apenas registra no log)
   */
  fastify.post(
    '/logout',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Logout admin',
        description: 'Registra logout do admin',
      },
      preHandler: [fastify.authenticateAdmin],
    },
    async (request, reply) => {
      // Log de auditoria
      await AdminAuditService.logLogout(request.adminId!, request);

      return reply.send({
        message: 'Logout realizado com sucesso',
      });
    },
  );
};

export default adminAuthRoutes;
