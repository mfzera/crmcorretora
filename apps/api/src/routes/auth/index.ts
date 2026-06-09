import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { ok } from '../../docs/index.js';
import bcrypt from 'bcryptjs';
import { eq, and, isNull } from 'drizzle-orm';
import {
  registerSeguradoraSchema,
  loginSchema,
  changePasswordSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
} from '@ecotech/features/auth';
import { generateTokenPayload, loadUserRuntimeData } from '@ecotech/plugins/auth';
import {
  ConflictError,
  UnauthorizedError,
  ValidationError,
} from '@ecotech/shared/utils';
import {
  isValidCNPJ,
  cleanDocument,
  CARGOS_PADRAO,
  getPermissaoIdsByNames,
} from '@ecotech/shared/utils';
import { env } from '@ecotech/shared/utils/env';
import { authDocs } from '../../docs/auth/schemas.js';
import { verifyRecaptcha } from '../../utils/recaptcha';
import corretorasUsuarioRoutes from './corretoras.js';
import mcpAuthRoutes from './mcp.js';
import googleCalendarRoutes from './google-calendar.js';
import {
  db,
  corretoras,
  usuarios,
  cargos,
  cargoPermissoes,
  permissoesGlobais,
  planos,
  produtos,
  usuarioCorretora,
  passwordResetTokens,
} from '@ecotech/shared/database';

const authRoutes: FastifyPluginAsyncZod = async function (fastify) {
  await fastify.register(corretorasUsuarioRoutes);
  await fastify.register(mcpAuthRoutes);
  await fastify.register(googleCalendarRoutes);
  // Register new corretora (no auth required, no tenant required)
  fastify.post(
    '/register-corretora',
    {
      schema: {
        tags: ['Autenticação'],
        summary: 'Registrar nova corretora',
        description:
          'Cria uma nova corretora na plataforma. Este endpoint não requer autenticação. A corretora será criada com um usuário admin padrão.',
        ...authDocs.registerCorretora,
      },
    },
    async (request, reply) => {
      const data = registerSeguradoraSchema.parse(request.body);

      // Validate CNPJ
      const cnpjClean = cleanDocument(data.cnpj);
      if (!isValidCNPJ(cnpjClean)) {
        throw new ValidationError('CNPJ inválido');
      }

      // Check if plan exists
      const plano = await db.query.planos.findFirst({
        where: and(eq(planos.id, data.planoId), eq(planos.ativo, true)),
      });

      if (!plano) {
        throw new ValidationError('Plano não encontrado ou inativo');
      }

      // Check if CNPJ already exists
      const cnpjExists = await db.query.corretoras.findFirst({
        where: eq(corretoras.cnpj, cnpjClean),
      });

      if (cnpjExists) {
        throw new ConflictError('CNPJ já cadastrado');
      }

      // Check if subdomain already exists
      const subdominioExists = await db.query.corretoras.findFirst({
        where: eq(corretoras.subdominio, data.subdominio.toLowerCase()),
      });

      if (subdominioExists) {
        throw new ConflictError('Subdomínio já em uso');
      }

      // Create corretora with transaction
      const result = await db.transaction(async (tx) => {
        // 1. Create corretora
        const [corretora] = await tx
          .insert(corretoras)
          .values({
            planoId: data.planoId,
            razaoSocial: data.razaoSocial,
            nomeFantasia: data.nomeFantasia,
            cnpj: cnpjClean,
            subdominio: data.subdominio.toLowerCase(),
            emailContato: data.emailDono,
            telefone: data.telefone,
            status: 'TRIAL',
            dataInicioTrial: new Date(),
            dataFimTrial: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            usuariosAtivos: 1,
            vendedoresAtivos: 0,
            clientesCadastrados: 0,
            vendasMesAtual: 0,
          })
          .returning();

        // 2. Get all permissions for assignment
        const allPermissions = await tx.select().from(permissoesGlobais);

        // 3. Create default roles with proper permissions
        // Admin role
        const [cargoAdmin] = await tx
          .insert(cargos)
          .values({
            corretoraId: corretora.id,
            nomeCargo: 'Administrador',
            descricao: 'Dono da corretora - acesso total ao sistema',
            isAdmin: true,
            isGestor: false,
            isVendedor: false,
          })
          .returning();

        // Assign all permissions to admin
        if (allPermissions.length > 0) {
          await tx.insert(cargoPermissoes).values(
            allPermissions.map((p) => ({
              cargoId: cargoAdmin.id,
              permissaoGlobalId: p.id,
            })),
          );
        }

        // Gerente role
        const gerenteDefinition = CARGOS_PADRAO.GERENTE;
        const [cargoGerente] = await tx
          .insert(cargos)
          .values({
            corretoraId: corretora.id,
            nomeCargo: gerenteDefinition.nomeCargo,
            descricao: gerenteDefinition.descricao,
            isAdmin: false,
            isGestor: gerenteDefinition.isGestor,
            isVendedor: gerenteDefinition.isVendedor,
          })
          .returning();

        const gerentePermissaoIds = getPermissaoIdsByNames(
          gerenteDefinition.permissoes,
          allPermissions,
        );
        if (gerentePermissaoIds.length > 0) {
          await tx.insert(cargoPermissoes).values(
            gerentePermissaoIds.map((permissaoId) => ({
              cargoId: cargoGerente.id,
              permissaoGlobalId: permissaoId,
            })),
          );
        }

        // Vendedor role
        const vendedorDefinition = CARGOS_PADRAO.VENDEDOR;
        const [cargoVendedor] = await tx
          .insert(cargos)
          .values({
            corretoraId: corretora.id,
            nomeCargo: vendedorDefinition.nomeCargo,
            descricao: vendedorDefinition.descricao,
            isAdmin: false,
            isGestor: vendedorDefinition.isGestor,
            isVendedor: vendedorDefinition.isVendedor,
          })
          .returning();

        const vendedorPermissaoIds = getPermissaoIdsByNames(
          vendedorDefinition.permissoes,
          allPermissions,
        );
        if (vendedorPermissaoIds.length > 0) {
          await tx.insert(cargoPermissoes).values(
            vendedorPermissaoIds.map((permissaoId) => ({
              cargoId: cargoVendedor.id,
              permissaoGlobalId: permissaoId,
            })),
          );
        }

        // Cadastro role
        const cadastroDefinition = CARGOS_PADRAO.CADASTRO;
        const [cargoCadastro] = await tx
          .insert(cargos)
          .values({
            corretoraId: corretora.id,
            nomeCargo: cadastroDefinition.nomeCargo,
            descricao: cadastroDefinition.descricao,
            isAdmin: false,
            isGestor: cadastroDefinition.isGestor,
            isVendedor: cadastroDefinition.isVendedor,
          })
          .returning();

        const cadastroPermissaoIds = getPermissaoIdsByNames(
          cadastroDefinition.permissoes,
          allPermissions,
        );
        if (cadastroPermissaoIds.length > 0) {
          await tx.insert(cargoPermissoes).values(
            cadastroPermissaoIds.map((permissaoId) => ({
              cargoId: cargoCadastro.id,
              permissaoGlobalId: permissaoId,
            })),
          );
        }

        // 4. Create owner user
        const passwordHash = await bcrypt.hash(data.senhaDono, 10);
        const [dono] = await tx
          .insert(usuarios)
          .values({
            corretoraId: corretora.id,
            cargoId: cargoAdmin.id,
            nome: data.nomeDono,
            email: data.emailDono.toLowerCase(),
            passwordHash,
            ativo: true,
            primeiroAcesso: true,
          })
          .returning();

        // 5. Link owner to corretora in usuario_corretora
        await tx.insert(usuarioCorretora).values({
          usuarioId: dono.id,
          corretoraId: corretora.id,
          cargoId: cargoAdmin.id,
          ativo: true,
          dataVinculo: new Date(),
        });

        // 6. Create default products
        await tx.insert(produtos).values([
          {
            corretoraId: corretora.id,
            nomeProduto: 'Seguro Auto',
            tipoSeguro: 'AUTO',
            percentualComissaoPadrao: '20.00',
            ativo: true,
          },
          {
            corretoraId: corretora.id,
            nomeProduto: 'Seguro Residencial',
            tipoSeguro: 'RESIDENCIAL',
            percentualComissaoPadrao: '15.00',
            ativo: true,
          },
          {
            corretoraId: corretora.id,
            nomeProduto: 'Seguro Vida',
            tipoSeguro: 'VIDA',
            percentualComissaoPadrao: '25.00',
            ativo: true,
          },
        ]);

        return { corretora, dono };
      });

      return reply.status(201).send(ok({
          corretora: {
            id: result.corretora.id,
            razaoSocial: result.corretora.razaoSocial,
            subdominio: result.corretora.subdominio,
            status: result.corretora.status ?? '',
            dataFimTrial: result.corretora.dataFimTrial?.toISOString() ?? null,
          },
          usuario: {
            id: result.dono.id,
            nome: result.dono.nome,
            email: result.dono.email,
          },
          accessUrl: env.APP_URL,
      }));
    },
  );

  // Login
  fastify.post(
    '/login',
    {
      schema: {
        tags: ['Autenticação'],
        summary: 'Autenticar usuário',
        description:
          'Realiza login do usuário com email e senha. Retorna tokens JWT para acesso à API.',
        ...authDocs.login,
      },
    },
    async (request, reply) => {
      const { email, password, recaptchaToken } = request.body as {
        email: string;
        password: string;
        recaptchaToken?: string;
      };

      if (recaptchaToken && !(await verifyRecaptcha(recaptchaToken))) {
        return reply
          .status(400)
          .send({ success: false as const, error: { code: 'AUTH_ERROR', message: 'Verificação de segurança falhou. Tente novamente.' } });
      }

      const { email: parsedEmail, password: parsedPassword } =
        loginSchema.parse({ email, password });

      const usuario = await db.query.usuarios.findFirst({
        where: eq(usuarios.email, parsedEmail.toLowerCase()),
      });

      if (!usuario) {
        throw new UnauthorizedError('Credenciais inválidas');
      }

      if (!usuario.ativo) {
        throw new UnauthorizedError('Usuário inativo');
      }

      const passwordValid = await bcrypt.compare(
        parsedPassword,
        usuario.passwordHash,
      );
      if (!passwordValid) {
        throw new UnauthorizedError('Credenciais inválidas');
      }

      // Resolve tenant (validates corretora status)
      await fastify.resolveTenant(request, usuario.corretoraId);

      // Update last login
      await db
        .update(usuarios)
        .set({ ultimoLogin: new Date() })
        .where(eq(usuarios.id, usuario.id));

      const payload = await generateTokenPayload(usuario.id);
      const token = fastify.jwt.sign(payload);
      const { permissoes } = (await loadUserRuntimeData(
        usuario.id,
        payload.isAdmin,
        payload.cargoId,
      ))!;

      // Generate refresh token with longer expiry
      const refreshToken = fastify.jwt.sign(
        {
          sub: usuario.id,
          type: 'refresh',
          corretoraId: usuario.corretoraId,
          cargoId: usuario.cargoId,
          isAdmin: false,
          isGestor: false,
          isVendedor: false,
        } as any,
        { expiresIn: env.JWT_REFRESH_EXPIRES_IN },
      );

      // Buscar todas as corretoras vinculadas ao usuário
      const vinculos = (await db.query.usuarioCorretora.findMany({
        where: and(
          eq(usuarioCorretora.usuarioId, usuario.id),
          eq(usuarioCorretora.ativo, true),
        ),
        with: {
          corretora: {
            columns: {
              id: true,
              razaoSocial: true,
              nomeFantasia: true,
              logoUrl: true,
              status: true,
              subdominio: true,
            },
          },
          cargo: {
            columns: {
              id: true,
              nomeCargo: true,
              isAdmin: true,
              isGestor: true,
              isVendedor: true,
            },
          },
        } as any,
      })) as Array<
        typeof usuarioCorretora.$inferSelect & {
          corretora: {
            id: string;
            razaoSocial: string;
            nomeFantasia: string | null;
            logoUrl: string | null;
            status: string;
            subdominio: string;
          };
          cargo: {
            id: string;
            nomeCargo: string;
            isAdmin: boolean | null;
            isGestor: boolean | null;
            isVendedor: boolean | null;
          } | null;
        }
      >;

      const { resolveStoredFileUrl, storageClient } = await import(
        '@ecotech/shared/storage'
      );

      const corretoras = await Promise.all(
        vinculos.map(async (v) => ({
          id: v.corretora.id,
          razaoSocial: v.corretora.razaoSocial,
          nomeFantasia: v.corretora.nomeFantasia,
          logoUrl: await resolveStoredFileUrl(v.corretora.logoUrl),
          status: v.corretora.status,
          subdominio: v.corretora.subdominio,
          cargo: v.cargo
            ? {
                id: v.cargo.id,
                nome: v.cargo.nomeCargo,
                isAdmin: v.cargo.isAdmin ?? false,
                isGestor: v.cargo.isGestor ?? false,
                isVendedor: v.cargo.isVendedor ?? false,
              }
            : null,
          ativa: v.corretora.id === (usuario.corretoraAtivaId ?? usuario.corretoraId),
        })),
      );

      // Generate fresh avatar URL if user has one
      let avatarUrl: string | null = null;
      if (usuario.avatarR2Key) {
        try {
          avatarUrl = await storageClient.getSignedDownloadUrl(usuario.avatarR2Key);
        } catch {
          // non-fatal
        }
      }

      return ok({
          token,
          refreshToken,
          usuario: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            avatarUrl,
            primeiroAcesso: usuario.primeiroAcesso ?? false,
          },
          permissoes,
          corretora: {
            id: request.corretora.id,
            nomeFantasia: request.corretora.nomeFantasia,
            razaoSocial: request.corretora.razaoSocial,
            subdominio: request.corretora.subdominio,
          },
          corretoras, // Lista de todas as corretoras disponíveis
      });
    },
  );

  // Refresh token
  fastify.post(
    '/refresh',
    {
      schema: {
        tags: ['Autenticação'],
        summary: 'Renovar token de acesso',
        description:
          'Usa um refresh token válido para obter um novo token de acesso.',
        ...authDocs.refresh,
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body as { refreshToken: string };

      try {
        const decoded = fastify.jwt.verify<{ sub: string; type: string }>(
          refreshToken,
        );

        if (decoded.type !== 'refresh') {
          throw new UnauthorizedError('Token inválido');
        }

        // Verify user still exists and is active
        const usuario = await db.query.usuarios.findFirst({
          where: and(eq(usuarios.id, decoded.sub), eq(usuarios.ativo, true)),
        });

        if (!usuario) {
          throw new UnauthorizedError('Usuário não encontrado ou inativo');
        }

        const payload = await generateTokenPayload(usuario.id);
        const token = fastify.jwt.sign(payload);
        const { permissoes } = (await loadUserRuntimeData(
          usuario.id,
          payload.isAdmin,
          payload.cargoId,
        ))!;
        const newRefreshToken = fastify.jwt.sign(
          {
            sub: usuario.id,
            type: 'refresh',
            corretoraId: usuario.corretoraId,
            cargoId: usuario.cargoId,
            isAdmin: false,
            isGestor: false,
            isVendedor: false,
          } as any,
          { expiresIn: env.JWT_REFRESH_EXPIRES_IN },
        );

        return ok({
            token,
            refreshToken: newRefreshToken,
            permissoes,
        });
      } catch {
        throw new UnauthorizedError('Token de refresh inválido ou expirado');
      }
    },
  );

  // Get current user profile
  fastify.get(
    '/me',
    {
      schema: {
        tags: ['Autenticação'],
        summary: 'Obter dados do usuário autenticado',
        description:
          'Retorna as informações do usuário autenticado, incluindo seus papéis e permissões.',
        ...authDocs.me,
      },
      preHandler: [fastify.authenticate],
    },
    async (request) => {
      const usuario = (await db.query.usuarios.findFirst({
        where: eq(usuarios.id, request.user.sub),
        with: {
          cargo: true,
          equipe: true,
        } as any,
      })) as
        | (typeof usuarios.$inferSelect & {
            cargo: { id: string; nomeCargo: string } | null;
            equipe: { id: string; nome: string } | null;
          })
        | undefined;

      // Generate fresh signed URL from R2 key if available
      const { storageClient, resolveStoredFileUrl } = await import(
        '@ecotech/shared/storage'
      );
      let avatarUrl = null;
      if (usuario!.avatarR2Key) {
        try {
          avatarUrl = await storageClient.getSignedDownloadUrl(
            usuario!.avatarR2Key,
          );
        } catch (error) {
          console.error('Erro ao gerar URL do avatar:', error);
        }
      }
      const corretoraLogoUrl = await resolveStoredFileUrl(
        request.corretora.logoUrl,
      );

      return ok({
          usuario: {
            id: usuario!.id,
            nome: usuario!.nome,
            email: usuario!.email,
            telefone: usuario!.telefone,
            avatarUrl,
            primeiroAcesso: usuario!.primeiroAcesso ?? false,
            cargo: usuario!.cargo
              ? {
                  id: usuario!.cargo.id,
                  nome: usuario!.cargo.nomeCargo,
                }
              : null,
            equipe: usuario!.equipe
              ? {
                  id: usuario!.equipe.id,
                  nome: usuario!.equipe.nome,
                }
              : null,
          },
          permissoes: request.user.permissoes,
          corretora: {
            id: request.corretora.id,
            nomeFantasia: request.corretora.nomeFantasia,
            razaoSocial: request.corretora.razaoSocial,
            logoUrl: corretoraLogoUrl,
            subdominio: request.corretora.subdominio,
          },
      });
    },
  );

  // Change password
  fastify.post(
    '/change-password',
    {
      schema: {
        tags: ['Autenticação'],
        summary: 'Alterar senha do usuário',
        description: 'Permite que o usuário autenticado altere sua senha.',
        ...authDocs.changePassword,
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { senhaAtual, novaSenha } = changePasswordSchema.parse(
        request.body,
      );

      const usuario = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, request.user.sub),
      });

      if (!usuario) {
        throw new UnauthorizedError('Usuário não encontrado');
      }

      const passwordValid = await bcrypt.compare(
        senhaAtual,
        usuario.passwordHash,
      );
      if (!passwordValid) {
        throw new ValidationError('Senha atual incorreta');
      }

      const newPasswordHash = await bcrypt.hash(novaSenha, 10);

      await db
        .update(usuarios)
        .set({
          passwordHash: newPasswordHash,
          primeiroAcesso: false,
          updatedAt: new Date(),
        })
        .where(eq(usuarios.id, request.user.sub));

      return { success: true as const, message: 'Senha alterada com sucesso' };
    },
  );

  // Logout (optional - just for documentation)
  fastify.post(
    '/logout',
    {
      schema: {
        tags: ['Autenticação'],
        summary: 'Realizar logout',
        description:
          'Em uma configuração com JWT stateless, o logout é realizado no cliente. Este endpoint é fornecido para documentação.',
        ...authDocs.logout,
      },
      preHandler: [fastify.authenticate],
    },
    async () => {
      // In a stateless JWT setup, logout is handled client-side
      // Here we could blacklist the token if needed
      return { success: true as const, message: 'Logout realizado com sucesso' };
    },
  );

  // Request password reset
  fastify.post(
    '/request-password-reset',
    {
      schema: {
        tags: ['Autenticação'],
        summary: 'Solicitar recuperação de senha',
        description: 'Envia um email com link para redefinir a senha.',
        ...authDocs.requestPasswordReset,
      },
    },
    async (request, reply) => {
      const { email } = resetPasswordRequestSchema.parse(request.body);
      const { emailService } = await import(
        '@ecotech/shared/utils/email.service'
      );
      const crypto = await import('crypto');

      // Find user by email
      const usuario = await db.query.usuarios.findFirst({
        where: eq(usuarios.email, email.toLowerCase()),
      });

      // Always return success to prevent email enumeration
      if (!usuario) {
        return reply.status(200).send({ success: true as const, message: 'Se o email existir, um link de recuperação será enviado.' });
      }

      if (!usuario.ativo) {
        return reply.status(200).send({ success: true as const, message: 'Se o email existir, um link de recuperação será enviado.' });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save token to database
      await db.insert(passwordResetTokens).values({
        usuarioId: usuario.id,
        token: resetToken,
        expiresAt,
      });

      // Send email
      try {
        await emailService.sendPasswordResetEmail(
          usuario.email,
          resetToken,
          usuario.nome,
        );
      } catch (error) {
        console.error('Error sending password reset email:', error);
        // Don't expose email sending errors to the user
      }

      return reply.status(200).send({ success: true as const, message: 'Se o email existir, um link de recuperação será enviado.' });
    },
  );

  // Reset password with token
  fastify.post(
    '/reset-password',
    {
      schema: {
        tags: ['Autenticação'],
        summary: 'Redefinir senha com token',
        description:
          'Redefine a senha do usuário usando um token válido recebido por email.',
        ...authDocs.resetPassword,
      },
    },
    async (request, reply) => {
      const { token, novaSenha } = resetPasswordSchema.parse(request.body);

      // Find valid token
      const resetToken = await db.query.passwordResetTokens.findFirst({
        where: and(
          eq(passwordResetTokens.token, token),
          isNull(passwordResetTokens.usedAt),
        ),
        with: {
          usuario: true,
        },
      });

      if (!resetToken) {
        throw new ValidationError('Token inválido ou expirado');
      }

      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        throw new ValidationError('Token inválido ou expirado');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(novaSenha, 10);

      // Update password and mark token as used
      await db.transaction(async (tx) => {
        await tx
          .update(usuarios)
          .set({
            passwordHash: newPasswordHash,
            updatedAt: new Date(),
          })
          .where(eq(usuarios.id, resetToken.usuarioId));

        await tx
          .update(passwordResetTokens)
          .set({
            usedAt: new Date(),
          })
          .where(eq(passwordResetTokens.id, resetToken.id));
      });

      return reply.status(200).send({ success: true as const, message: 'Senha redefinida com sucesso' });
    },
  );
};

export default authRoutes;
