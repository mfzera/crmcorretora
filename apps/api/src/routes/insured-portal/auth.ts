import { FastifyInstance } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { randomBytes } from 'crypto';
import { eq, and, isNull, gt } from 'drizzle-orm';
import {
  db,
  corretoras,
  clientes,
  portalSeguradoTokens,
} from '@ecotech/shared/database';
import { UnauthorizedError, NotFoundError } from '@ecotech/shared/utils';
import { cleanDocument } from '@ecotech/shared/utils';
import type { PortalCliente } from './middleware.js';

const portalAuthRoutes: FastifyPluginAsyncZod = async function (fastify) {
  // POST /api/portal/auth/login
  fastify.post(
    '/auth/login',
    {
      schema: {
        tags: ['Portal Segurado'],
        summary: 'Login do segurado',
        description:
          'Autentica o segurado com CPF/CNPJ e data de nascimento. Retorna um token JWT para acesso ao portal.',
        security: [],
      },
    },
    async (request, reply) => {
      const { subdominio, documento, dataNascimento } = request.body as {
        subdominio: string;
        documento: string;
        dataNascimento: string; // YYYY-MM-DD
      };

      if (!subdominio || !documento || !dataNascimento) {
        throw new UnauthorizedError('Credenciais inválidas');
      }

      // Resolve corretora pelo subdomínio
      const corretora = await db.query.corretoras.findFirst({
        where: eq(corretoras.subdominio, subdominio.toLowerCase()),
        columns: { id: true, status: true, nomeFantasia: true, razaoSocial: true },
      });

      if (!corretora || corretora.status === 'INATIVO') {
        throw new UnauthorizedError('Credenciais inválidas');
      }

      const docLimpo = cleanDocument(documento);
      const isPF = docLimpo.length === 11;
      const isPJ = docLimpo.length === 14;

      if (!isPF && !isPJ) {
        throw new UnauthorizedError('Credenciais inválidas');
      }

      // Busca cliente pelo documento + corretora
      const cliente = await db.query.clientes.findFirst({
        where: and(
          eq(clientes.corretoraId, corretora.id),
          isPF
            ? eq(clientes.cpf, docLimpo)
            : eq(clientes.cnpj, docLimpo),
          eq(clientes.ativo, true),
          isNull(clientes.deletedAt),
        ),
        columns: {
          id: true,
          nome: true,
          razaoSocial: true,
          nomeFantasia: true,
          tipoPessoa: true,
          dataNascimento: true,
          corretoraId: true,
        },
      });

      // Valida data de nascimento — erro genérico para evitar enumeração
      if (!cliente || cliente.dataNascimento !== dataNascimento) {
        throw new UnauthorizedError('Credenciais inválidas');
      }

      // Cria token de sessão
      const tokenRaw = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 horas

      const [tokenRecord] = await db
        .insert(portalSeguradoTokens)
        .values({
          clienteId: cliente.id,
          corretoraId: corretora.id,
          token: tokenRaw,
          expiresAt,
        })
        .returning({ id: portalSeguradoTokens.id });

      // Assina JWT com type: 'portal' para isolamento de staff
      const jwt = fastify.jwt.sign(
        {
          sub: cliente.id,
          corretoraId: corretora.id,
          type: 'portal',
          tokenId: tokenRecord.id,
        } as any,
        { expiresIn: '8h' },
      );

      const nomeDisplay =
        cliente.nome ??
        cliente.nomeFantasia ??
        cliente.razaoSocial ??
        'Segurado';

      return reply.send({
        success: true,
        data: {
          token: jwt,
          cliente: {
            id: cliente.id,
            nome: nomeDisplay,
            tipoPessoa: cliente.tipoPessoa,
          },
          corretora: {
            nomeFantasia: corretora.nomeFantasia ?? corretora.razaoSocial,
          },
        },
      });
    },
  );

  // POST /api/portal/auth/logout
  fastify.post(
    '/auth/logout',
    {
      schema: {
        tags: ['Portal Segurado'],
        summary: 'Logout do segurado',
      },
      preHandler: [async (request, reply) => {
        await authenticatePortal(fastify, request, reply);
      }],
    },
    async (request, reply) => {
      const portalCliente = (request as any).portalCliente as PortalCliente;

      await db
        .update(portalSeguradoTokens)
        .set({ usedAt: new Date() })
        .where(eq(portalSeguradoTokens.id, portalCliente.tokenId));

      return reply.send({ success: true });
    },
  );

  // GET /api/portal/auth/me
  fastify.get(
    '/auth/me',
    {
      schema: {
        tags: ['Portal Segurado'],
        summary: 'Dados do segurado autenticado',
      },
      preHandler: [async (request, reply) => {
        await authenticatePortal(fastify, request, reply);
      }],
    },
    async (request) => {
      const portalCliente = (request as any).portalCliente as PortalCliente;

      return {
        success: true,
        data: {
          clienteId: portalCliente.clienteId,
          nome: portalCliente.nome,
          tipoPessoa: portalCliente.tipoPessoa,
          corretoraId: portalCliente.corretoraId,
        },
      };
    },
  );
}

// Middleware de autenticação do portal — separado do fastify.authenticate (staff)
export async function authenticatePortal(
  fastify: FastifyInstance,
  request: any,
  reply: any,
) {
  const authHeader = request.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token não fornecido');
  }

  const token = authHeader.slice(7);
  let decoded: any;
  try {
    decoded = fastify.jwt.verify(token);
  } catch {
    throw new UnauthorizedError('Token inválido ou expirado');
  }

  if (decoded.type !== 'portal') {
    throw new UnauthorizedError('Token inválido');
  }

  // Valida o registro de token no banco (permite logout real)
  const tokenRecord = await db.query.portalSeguradoTokens.findFirst({
    where: and(
      eq(portalSeguradoTokens.id, decoded.tokenId),
      isNull(portalSeguradoTokens.usedAt),
      gt(portalSeguradoTokens.expiresAt, new Date()),
    ),
  });

  if (!tokenRecord) {
    throw new UnauthorizedError('Sessão expirada ou encerrada');
  }

  // Valida isolamento de tenant
  if (tokenRecord.corretoraId !== decoded.corretoraId) {
    throw new UnauthorizedError('Token inválido');
  }

  // Busca dados do cliente
  const cliente = await db.query.clientes.findFirst({
    where: and(
      eq(clientes.id, tokenRecord.clienteId),
      eq(clientes.ativo, true),
      isNull(clientes.deletedAt),
    ),
    columns: {
      id: true,
      nome: true,
      razaoSocial: true,
      nomeFantasia: true,
      tipoPessoa: true,
      corretoraId: true,
    },
  });

  if (!cliente) {
    throw new UnauthorizedError('Segurado não encontrado');
  }

  request.portalCliente = {
    clienteId: cliente.id,
    corretoraId: cliente.corretoraId,
    tokenId: tokenRecord.id,
    nome: cliente.nome ?? cliente.nomeFantasia ?? cliente.razaoSocial ?? 'Segurado',
    tipoPessoa: cliente.tipoPessoa,
  } satisfies PortalCliente;
};

export default portalAuthRoutes;
