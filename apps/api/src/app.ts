import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import compress from '@fastify/compress';
import swagger from '@fastify/swagger';
import scalarApiReference from '@scalar/fastify-api-reference';
import { z } from 'zod';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

import { env } from '@ecotech/shared/utils/env';

// Plugins
import errorHandler from '@ecotech/plugins/error-handler';
import tenantIsolation from '@ecotech/plugins/tenant-isolation';
import auth from '@ecotech/plugins/auth';
import quotaValidator from '@ecotech/plugins/quota-validator';
import chatPlugin from '@ecotech/plugins/chat';
import adminAuth from '@ecotech/plugins/admin-auth';
import httpMetrics from './plugins/http-metrics.js';
import neonRowsSampler from './plugins/neon-rows-sampler.js';
import requestId from './plugins/request-id.js';

// Routes
import authRoutes from './routes/auth/index.js';
import usersRoutes from './routes/users/index.js';
import rolesRoutes from './routes/roles/index.js';
import clientsRoutes from './routes/clients/index.js';
import productsRoutes from './routes/products/index.js';
import quotesRoutes from './routes/quotes/index.js';
import cotacaoTagsRoutes, { cotacaoTagsManagementRoutes } from './routes/quotes/tags.js';
import proposalsRoutes from './routes/proposals/index.js';
import salesDocumentsRoutes from './routes/sales-documents/index.js';
import endorsementsRoutes from './routes/endorsements/index.js';
import claimsRoutes from './routes/claims/index.js';
import renewalsRoutes from './routes/renewals/index.js';
import dashboardRoutes from './routes/dashboard/index.js';
import insurerRoutes from './routes/insurer/index.js';
import workspaceRoutes from './routes/workspace/index.js';
import partnerInsurersRoutes from './routes/partner-insurers/index.js';
import notificationsRoutes from './routes/notifications/index.js';
import chatRoutes from './routes/chat/index.js';
import opportunitiesRoutes from './routes/opportunities/index.js';
import kpisRoutes from './routes/kpis/index.js';
import metricsRoutes from './routes/metrics/index.js';
import crmManagementRoutes from './routes/crm-management/index.js';
import attachmentsRoutes from './routes/attachments/index.js';
import tasksRoutes from './routes/tasks/index.js';
import calendarRoutes from './routes/calendar/index.js';
import teamsRoutes from './routes/teams/index.js';
import adminRoutes from './routes/admin/index.js';
import publicRoutes from './routes/public/index.js';
import insuredPortalRoutes from './routes/insured-portal/index.js';
import marketingRoutes from './routes/marketing/index.js';
import gdprRoutes from './routes/gdpr/index.js';
import goalsRoutes from './routes/goals/index.js';
import missionsRoutes from './routes/missions/index.js';
import campaignsRoutes from './routes/campaigns/index.js';
import badgesRoutes from './routes/badges/index.js';
import gamificationRankingRoutes from './routes/gamification/ranking.js';
import gamificationRecognitionRoutes from './routes/gamification/recognition.js';
import asaasRoutes from './routes/asaas/index.js';
import renewalImportsRoutes from './routes/renewal-imports/index.js';
import commissionSettingsRoutes from './routes/commission-settings/index.js';
import brokerConfigRoutes from './routes/broker-config/index.js';
import vendedoresRoutes from './routes/vendedores/index.js';
import kanbanConfigRoutes from './routes/kanban-config/index.js';
import workspace2PrefsRoutes from './routes/workspace2-prefs/index.js';
import { setupPermissionManifest } from './routes/_manifest/index.js';

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== 'production',
    trustProxy: true,
    ajv: {
      customOptions: {
        useDefaults: true,
        strictSchema: false,
      },
    },
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const allowedOrigins = new Set([
    env.APP_URL,
    ...(env.APP_EXTRA_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ?? []),
  ]);

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        // Requests server-to-server sem Origin header — negar credentials
        return callback(null, false);
      }
      if (
        allowedOrigins.has(origin) ||
        (env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin))
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-ID',
      'ngrok-skip-browser-warning',
    ],
    exposedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Server-Timing'],
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  });

  /* v8 ignore start */
  if (env.NODE_ENV !== 'test') {
    await app.register(rateLimit, {
      max: env.RATE_LIMIT_MAX,
      timeWindow: env.RATE_LIMIT_WINDOW_MS,
      skipOnError: true,
      keyGenerator: (req) => {
        // Use JWT sub (user ID) when available so all requests from the same
        // user share one bucket regardless of IP (e.g. Vercel SSR servers).
        // Falls back to IP for unauthenticated requests (login, public routes).
        try {
          const auth = req.headers.authorization;
          if (auth?.startsWith('Bearer ')) {
            const payload = JSON.parse(
              Buffer.from(auth.slice(7).split('.')[1], 'base64url').toString(),
            );
            // Valida que sub é uma string simples (UUID) antes de usar como chave Redis
            if (
              payload?.sub &&
              typeof payload.sub === 'string' &&
              payload.sub.length <= 64
            ) {
              return `user:${payload.sub}`;
            }
          }
        } catch {
          // malformed token — fall through to IP
        }
        return req.ip;
      },
      allowList: (req) => {
        // Skip rate limiting for WebSocket connections
        return req.url?.startsWith('/api/chat/ws');
      },
      errorResponseBuilder: (_req, context) => {
        const err = new Error(
          context.after
            ? `Muitas requisições. Tente novamente em ${context.after}.`
            : 'Muitas requisições. Tente novamente mais tarde.',
        ) as Error & { statusCode: number; error: string };
        err.statusCode = context.statusCode;
        err.error = err.message;
        return err;
      },
    });
  }
  /* v8 ignore stop */

  // Compress responses (gzip/deflate/brotli)
  await app.register(compress, { global: true });

  // Multipart support for file uploads
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
  });

  // Swagger documentation
  await app.register(swagger, {
    transform: jsonSchemaTransform,
    openapi: {
      info: {
        title: 'SaaS Seguradoras API',
        description:
          'Plataforma SaaS Multi-Tenant para gestão de vendas de seguros. API completa com autenticação JWT, RBAC e gestão de quotas.',
        version: '1.0.0',
        contact: {
          name: 'Suporte técnico',
          email: 'suporte@saasseguradoras.com',
        },
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Servidor de desenvolvimento',
        },
      ],
      tags: [
        // ── Autenticação ───────────────────────────────────────────────
        { name: 'Autenticação', description: 'Login, refresh de token, reset de senha e gestão de sessão' },
        { name: 'Google Calendar', description: 'Integração OAuth com Google Calendar: vincular conta, listar e sincronizar eventos' },

        // ── Usuários & Estrutura ───────────────────────────────────────
        { name: 'Usuários', description: 'Gestão de usuários da corretora: cadastro, perfil, avatar e reset de senha' },
        { name: 'Cargos e Permissões', description: 'Configuração de cargos, templates e controle granular de acesso (RBAC)' },
        { name: 'Equipes', description: 'Criação e gestão de equipes de vendas: líder, membros e hierarquia' },

        // ── Configurações ──────────────────────────────────────────────
        { name: 'Configurações', description: 'Dados cadastrais, logo e métricas de uso da corretora' },
        { name: 'Configurações - Corretora', description: 'Configurações avançadas da corretora: integrações, preferências e histórico de alterações' },
        { name: 'Configurações de Comissões', description: 'Regras de comissão por produto, vendedor e cargo; extrato, lançamentos e projeção' },
        { name: 'Seguradoras Parceiras', description: 'Cadastro das seguradoras parceiras com logotipo, contatos e suporte 24h' },
        { name: 'Produtos', description: 'Catálogo de produtos de seguro da corretora' },

        // ── Ciclo de Vendas ────────────────────────────────────────────
        { name: 'Clientes', description: 'Cadastro e gestão de clientes PF e PJ: endereços, contatos e transferência de carteira' },
        { name: 'Oportunidades', description: 'Pipeline de oportunidades (funil CRM): criação, movimentação e histórico' },
        { name: 'Gestão CRM', description: 'Visão gerencial do CRM: overview de carteira, distribuição e configurações do pipeline' },
        { name: 'Cotações', description: 'Ciclo de vida completo de cotações: criação, aprovação, comentários e anexos' },
        { name: 'Propostas', description: 'Gestão de propostas comerciais: envio, aprovação e confirmação de venda' },
        { name: 'Documentos de Venda', description: 'Apólices, endossos avulsos e controle de validação cadastral' },
        { name: 'Endossos', description: 'Gestão de alterações em apólices vigentes' },
        { name: 'Renovações', description: 'Acompanhamento de renovações: pendentes, vencidas, status e valores' },
        { name: 'Importações Renovações', description: 'Importação em lote de apólices para fila de renovação via planilha Excel' },
        { name: 'Sinistros', description: 'Abertura, acompanhamento e pagamento de sinistros' },

        // ── Análise & Indicadores ──────────────────────────────────────
        { name: 'Dashboard', description: 'Métricas e indicadores de vendas: pipeline, equipe e relatórios de comissão' },
        { name: 'Métricas', description: 'Evolução de vendas, uso de storage, comissões por tipo de seguro e papel do vendedor' },
        { name: 'KPIs', description: 'Indicadores-chave de performance e visão Kanban do pipeline de vendas' },
        { name: 'Workspace', description: 'Área de trabalho: resumo operacional, endossos pendentes e planilha de acompanhamento' },

        // ── Comunicação & Produtividade ────────────────────────────────
        { name: 'Chat', description: 'Sistema de chat em tempo real da equipe: canais, mensagens diretas e anexos' },
        { name: 'Notificações', description: 'Centro de notificações: listagem, contagem não-lidas e marcação como lida' },
        { name: 'Tarefas', description: 'Gestão de tarefas da equipe: criação, atualização e conclusão' },
        { name: 'Calendario', description: 'Eventos e compromissos do calendário: criação e integração com Google Calendar' },

        // ── Engajamento & Marketing ────────────────────────────────────
        { name: 'Gamificação', description: 'Metas, missões, campanhas, badges e ranking para engajamento da equipe de vendas' },
        { name: 'Marketing', description: 'Portal de vendas: suporte 24h de seguradoras, roteamento de produtos e solicitações de cotação recebidas' },

        // ── Portal & Compliance ────────────────────────────────────────
        { name: 'Portal Segurado', description: 'API do portal de auto-atendimento do segurado: apólices, documentos, perfil e cotações' },
        { name: 'LGPD', description: 'Conformidade com a LGPD: exportação e exclusão de dados pessoais sob solicitação' },

        // ── Sistema ────────────────────────────────────────────────────
        { name: 'Anexos', description: 'Gestão de arquivos e anexos em cotações, documentos e chat' },
        { name: 'Sistema', description: 'Manifesto de permissões e endpoints internos de sistema' },
        { name: 'Public', description: 'Endpoints públicos sem autenticação: changelogs, roadmap e dados de corretora' },
        { name: 'Asaas', description: 'Checkout público, assinaturas e webhooks de pagamento via Asaas' },

        // ── Admin ──────────────────────────────────────────────────────
        { name: 'Admin', description: 'Painel administrativo: métricas globais, assinaturas, backups, auditoria e analytics de infraestrutura' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Token JWT obtido após autenticação',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });

  await app.register(scalarApiReference, {
    routePrefix: '/docs',
    configuration: {
      theme: 'alternate',
    },
  });

  // Custom plugins
  await app.register(requestId);
  await app.register(errorHandler);
  await app.register(httpMetrics);
  await app.register(neonRowsSampler);
  await app.register(tenantIsolation);
  await app.register(auth);
  await app.register(adminAuth);
  await app.register(quotaValidator);
  await app.register(chatPlugin);

  // Health check route (no auth required)
  app.get(
    '/health',
    {
      schema: {
        tags: ['Sistema'],
        summary: 'Verificar saúde da API',
        description:
          'Endpoint público para verificar se a API está operacional. Não requer autenticação.',
        response: {
          200: z.object({ status: z.string(), timestamp: z.string() }),
        },
        security: [],
      },
    },
    async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    },
  );

  // Manifesto de permissões: instala hook onRoute antes de registrar as rotas,
  // para que colete metadata de authorize()/authorizeAny() de todas elas.
  setupPermissionManifest(app);

  // API routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(rolesRoutes, { prefix: '/api/roles' });
  await app.register(clientsRoutes, { prefix: '/api/clients' });
  await app.register(productsRoutes, { prefix: '/api/products' });
  await app.register(quotesRoutes, { prefix: '/api/quotes' });
  await app.register(cotacaoTagsRoutes, { prefix: '/api/cotacao-tags' });
  await app.register(cotacaoTagsManagementRoutes, { prefix: '/api/quotes' });
  await app.register(proposalsRoutes, { prefix: '/api/proposals' });
  await app.register(salesDocumentsRoutes, {
    prefix: '/api/sales-documents',
  });
  await app.register(endorsementsRoutes, { prefix: '/api/endorsements' });
  await app.register(claimsRoutes, { prefix: '/api/claims' });
  await app.register(renewalsRoutes, { prefix: '/api/renewals' });
  await app.register(renewalImportsRoutes, {
    prefix: '/api/renewal-imports',
  });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await app.register(insurerRoutes, { prefix: '/api/insurer' });
  await app.register(workspaceRoutes, { prefix: '/api/workspace' });
  await app.register(partnerInsurersRoutes, {
    prefix: '/api/partner-insurers',
  });
  await app.register(notificationsRoutes, { prefix: '/api/notifications' });
  await app.register(chatRoutes, { prefix: '/api/chat' });
  await app.register(opportunitiesRoutes, { prefix: '/api/opportunities' });
  await app.register(kpisRoutes, { prefix: '/api/kpis' });
  await app.register(metricsRoutes, { prefix: '/api/metrics' });
  await app.register(crmManagementRoutes, { prefix: '/api/crm-management' });
  await app.register(attachmentsRoutes, { prefix: '/api/attachments' });
  await app.register(tasksRoutes, { prefix: '/api/tasks' });
  await app.register(calendarRoutes, { prefix: '/api/calendar' });
  await app.register(teamsRoutes, { prefix: '/api/teams' });

  await app.register(marketingRoutes, { prefix: '/api/marketing' });

  await app.register(gdprRoutes, { prefix: '/api/gdpr' });
  await app.register(goalsRoutes, { prefix: '/api/goals' });
  await app.register(missionsRoutes, { prefix: '/api/missions' });
  await app.register(campaignsRoutes, { prefix: '/api/campaigns' });
  await app.register(badgesRoutes, { prefix: '/api/badges' });
  await app.register(gamificationRankingRoutes, {
    prefix: '/api/gamification/ranking',
  });
  await app.register(gamificationRecognitionRoutes, {
    prefix: '/api/gamification/recognition',
  });

  // Asaas billing routes
  await app.register(asaasRoutes, { prefix: '/api/asaas' });

  await app.register(commissionSettingsRoutes, {
    prefix: '/api/settings/commissions',
  });
  await app.register(brokerConfigRoutes, {
    prefix: '/api/settings/broker',
  });
  await app.register(vendedoresRoutes, { prefix: '/api/vendedores' });
  await app.register(kanbanConfigRoutes, { prefix: '/api/kanban-config' });
  await app.register(workspace2PrefsRoutes, { prefix: '/api/workspace2-prefs' });

  // Admin routes (separate authentication namespace)
  await app.register(adminRoutes, { prefix: '/api/admin' });

  // Public routes (no authentication required)
  await app.register(publicRoutes, { prefix: '/api/public' });

  // Portal do segurado (autenticação própria, isolada do staff)
  await app.register(insuredPortalRoutes, { prefix: '/api/portal' });

  return app;
}
