import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import {
  db,
  usuarios,
  clientes,
  clienteEnderecos,
  clienteContatos,
  auditLogs,
  consentLogs,
} from '@ecotech/shared/database';
import { NotFoundError, ValidationError } from '@ecotech/shared/utils';

const registrarConsentimentoSchema = z.object({
  tipo: z.enum(['termos_uso', 'privacidade', 'cookies']),
  versao: z.string().min(1).max(20),
  aceito: z.boolean().default(true),
});

const lgpdRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  /**
   * POST /lgpd/consentimentos
   * Registra aceite de termos/cookies pelo usuário autenticado.
   */
  fastify.post(
    '/consents',
    {
      schema: {
        tags: ['LGPD'],
        summary: 'Registrar consentimento',
        description:
          'Registra o aceite ou revogação de termos/cookies pelo usuário. Obrigatório pela LGPD (Art. 7º).',
      },
    },
    async (request, reply) => {
      const data = registrarConsentimentoSchema.parse(request.body);

      await db.insert(consentLogs).values({
        usuarioId: request.user.sub,
        corretoraId: request.corretoraId,
        tipo: data.tipo,
        versao: data.versao,
        ipAddress:
          (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          request.ip,
        aceito: data.aceito,
      });

      return reply.status(201).send({
        success: true,
        message: 'Consentimento registrado com sucesso',
      });
    },
  );

  /**
   * GET /lgpd/meus-dados
   * Exporta todos os dados pessoais do usuário autenticado (portabilidade LGPD Art. 18).
   */
  fastify.get(
    '/my-data',
    {
      schema: {
        tags: ['LGPD'],
        summary: 'Exportar dados pessoais',
        description:
          'Retorna todos os dados pessoais do usuário autenticado (portabilidade LGPD Art. 18, VI).',
      },
    },
    async (request) => {
      const usuarioId = request.user.sub;

      const usuario = await db.query.usuarios.findFirst({
        where: and(eq(usuarios.id, usuarioId), isNull(usuarios.deletedAt)),
        with: {
          cargo: { columns: { nomeCargo: true } },
          equipe: { columns: { nome: true } },
        },
      });

      if (!usuario) {
        throw new NotFoundError('Usuário');
      }

      // Consentimentos do usuário
      const consentimentos = await db.query.consentLogs.findMany({
        where: eq(consentLogs.usuarioId, usuarioId),
        orderBy: (c, { desc }) => [desc(c.createdAt)],
      });

      // Últimos 90 dias de logs de auditoria (com dados não anonimizados)
      const logsAuditoria = await db.query.auditLogs.findMany({
        where: and(
          eq(auditLogs.usuarioId, usuarioId),
          eq(auditLogs.corretoraId, request.corretoraId),
        ),
        columns: {
          id: true,
          acao: true,
          entidade: true,
          entidadeId: true,
          ipAddress: true,
          createdAt: true,
        },
        orderBy: (l, { desc }) => [desc(l.createdAt)],
        limit: 500,
      });

      return {
        success: true,
        data: {
          geradoEm: new Date().toISOString(),
          usuario: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            telefone: usuario.telefone,
            cargo: usuario.cargo?.nomeCargo ?? null,
            equipe: usuario.equipe?.nome ?? null,
            ativo: usuario.ativo,
            createdAt: usuario.createdAt,
            updatedAt: usuario.updatedAt,
          },
          consentimentos: consentimentos.map((c) => ({
            tipo: c.tipo,
            versao: c.versao,
            aceito: c.aceito,
            ip: c.ipAddress,
            data: c.createdAt,
          })),
          historico_acoes: logsAuditoria,
        },
      };
    },
  );

  /**
   * GET /lgpd/dados-cliente/:clientId
   * Exporta dados de um cliente (portabilidade para o titular via corretora).
   * Requer permissão clientes:visualizar.
   */
  fastify.get(
    '/client-data/:clientId',
    {
      schema: {
        tags: ['LGPD'],
        summary: 'Exportar dados do cliente',
        description:
          'Exporta todos os dados pessoais de um cliente para portabilidade (LGPD Art. 18, V).',
      },
    },
    async (request) => {
      const { clientId } = request.params as { clientId: string };

      const hasPermission =
        request.user.isAdmin ||
        request.user.permissoes?.includes('clientes:visualizar') ||
        request.user.permissoes?.includes('clientes:visualizar_todos');

      if (!hasPermission) {
        throw new ValidationError(
          'Você não tem permissão para exportar dados de clientes',
        );
      }

      const cliente = await db.query.clientes.findFirst({
        where: and(
          eq(clientes.id, clientId),
          eq(clientes.corretoraId, request.corretoraId),
          isNull(clientes.deletedAt),
        ),
      });

      if (!cliente) {
        throw new NotFoundError('Cliente');
      }

      const [enderecos, contatos] = await Promise.all([
        db.query.clienteEnderecos.findMany({
          where: eq(clienteEnderecos.clienteId, clientId),
        }),
        db.query.clienteContatos.findMany({
          where: eq(clienteContatos.clienteId, clientId),
        }),
      ]);

      return {
        success: true,
        data: {
          geradoEm: new Date().toISOString(),
          cliente: {
            id: cliente.id,
            tipoPessoa: cliente.tipoPessoa,
            nome: cliente.nome,
            cpf: cliente.cpf,
            dataNascimento: cliente.dataNascimento,
            razaoSocial: cliente.razaoSocial,
            nomeFantasia: cliente.nomeFantasia,
            cnpj: cliente.cnpj,
            email: cliente.email,
            telefone: cliente.telefone,
            celular: cliente.celular,
            ativo: cliente.ativo,
            createdAt: cliente.createdAt,
          },
          enderecos,
          contatos,
        },
      };
    },
  );
};

export default lgpdRoutes;
