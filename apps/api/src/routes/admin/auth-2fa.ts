import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import qrcode from 'qrcode';
import { eq } from 'drizzle-orm';
import { AdminAuditService } from '@ecotech/plugins/admin-auth';

const totp = new TOTP({
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin(),
});

const adminAuth2faRoutes: FastifyPluginAsyncZod = async function (fastify) {
  const { db, admins } = await import('@ecotech/shared/database');

  /**
   * POST /api/admin/auth/2fa/validate
   * Valida código TOTP durante o login (com tempToken)
   */
  fastify.post(
    '/validate',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Validar código 2FA no login',
        body: z.object({ tempToken: z.string(), code: z.string().min(6).max(6) }),
      },
    },
    async (request, reply) => {
      const { tempToken, code } = request.body as {
        tempToken: string;
        code: string;
      };

      let adminId: string;
      try {
        adminId = fastify.verifyAdminTempToken(tempToken);
      } catch {
        return reply.status(401).send({ error: 'Token expirado ou inválido' });
      }

      const admin = await db.query.admins.findFirst({
        where: eq(admins.id, adminId),
      });

      if (!admin || !admin.ativo || !admin.totpEnabled || !admin.totpSecret) {
        return reply.status(401).send({ error: 'Autenticação inválida' });
      }

      const result = await totp.verify(code, { secret: admin.totpSecret });
      if (!result.valid) {
        return reply.status(401).send({ error: 'Código inválido ou expirado' });
      }

      await db
        .update(admins)
        .set({ ultimoLogin: new Date() })
        .where(eq(admins.id, admin.id));

      const token = fastify.createAdminToken({
        id: admin.id,
        email: admin.email,
        nome: admin.nome,
        permissoes: admin.permissoes as string[],
      });

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
   * POST /api/admin/auth/2fa/setup
   * Inicia configuração do 2FA: gera secret e QR code
   */
  fastify.post(
    '/setup',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Iniciar configuração 2FA',
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

      if (admin.totpEnabled) {
        return reply
          .status(400)
          .send({ error: '2FA já está ativado. Desative antes de reconfigurar.' });
      }

      const secret = totp.generateSecret();
      const uri = totp.toURI({
        issuer: 'EcoTech Admin',
        label: admin.email,
        secret,
      });
      const qrCodeDataUrl = await qrcode.toDataURL(uri);

      // Salva o secret temporariamente (totpEnabled ainda false)
      await db
        .update(admins)
        .set({ totpSecret: secret })
        .where(eq(admins.id, admin.id));

      return reply.send({ secret, qrCode: qrCodeDataUrl });
    },
  );

  /**
   * POST /api/admin/auth/2fa/enable
   * Confirma código TOTP e ativa o 2FA
   */
  fastify.post(
    '/enable',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Ativar 2FA',
        body: z.object({ code: z.string().min(6).max(6) }),
      },
      preHandler: [fastify.authenticateAdmin],
    },
    async (request, reply) => {
      const { code } = request.body as { code: string };

      const admin = await db.query.admins.findFirst({
        where: eq(admins.id, request.adminId!),
      });

      if (!admin || !admin.totpSecret) {
        return reply
          .status(400)
          .send({ error: 'Execute /2fa/setup antes de ativar' });
      }

      if (admin.totpEnabled) {
        return reply.status(400).send({ error: '2FA já está ativado' });
      }

      const result = await totp.verify(code, { secret: admin.totpSecret });
      if (!result.valid) {
        return reply
          .status(400)
          .send({ error: 'Código inválido. Verifique o app autenticador.' });
      }

      await db
        .update(admins)
        .set({ totpEnabled: true })
        .where(eq(admins.id, admin.id));

      return reply.send({ message: '2FA ativado com sucesso' });
    },
  );

  /**
   * POST /api/admin/auth/2fa/disable
   * Desativa o 2FA (requer código TOTP atual)
   */
  fastify.post(
    '/disable',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Desativar 2FA',
        body: z.object({ code: z.string().min(6).max(6) }),
      },
      preHandler: [fastify.authenticateAdmin],
    },
    async (request, reply) => {
      const { code } = request.body as { code: string };

      const admin = await db.query.admins.findFirst({
        where: eq(admins.id, request.adminId!),
      });

      if (!admin) {
        return reply.status(404).send({ error: 'Admin não encontrado' });
      }

      if (!admin.totpEnabled || !admin.totpSecret) {
        return reply.status(400).send({ error: '2FA não está ativado' });
      }

      const result = await totp.verify(code, { secret: admin.totpSecret });
      if (!result.valid) {
        return reply.status(400).send({ error: 'Código inválido' });
      }

      await db
        .update(admins)
        .set({ totpEnabled: false, totpSecret: null })
        .where(eq(admins.id, admin.id));

      return reply.send({ message: '2FA desativado com sucesso' });
    },
  );

  /**
   * GET /api/admin/auth/2fa/status
   * Retorna se o 2FA está ativado para o admin logado
   */
  fastify.get(
    '/status',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Status do 2FA',
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

      return reply.send({ enabled: admin.totpEnabled });
    },
  );
};

export default adminAuth2faRoutes;
