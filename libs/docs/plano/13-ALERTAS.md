# 13 - Sistema de Alertas

**Navegação**: [← 12. Workers/Jobs](./12-WORKERS-JOBS.md) | [Índice](./00-INDICE.md) | [16. Testes →](./16-TESTES.md)

---

## 🎯 Visão Geral

Sistema completo de alertas e notificações para eventos críticos do sistema:

1. **Limite de Storage**: Quando corretora atinge 75% ou 90% do limite
2. **Backup Falhou**: Quando backup incremental ou completo falha
3. **Integridade Comprometida**: Quando verificação de backup detecta problemas
4. **Arquivos Órfãos**: Quando detectados arquivos sem registro no DB
5. **Storage Cheio**: Quando limite é atingido e uploads são bloqueados

**Canais de Notificação:**
- Email (SMTP)
- Webhook (para integração com Slack, Discord, etc.)
- Notificações in-app (frontend admin)

## 📁 Estrutura de Arquivos

```
libs/shared/utils/src/
├── alert-service.ts          # Service principal de alertas
├── email-templates/
│   ├── storage-limit.html
│   ├── backup-failed.html
│   ├── backup-integrity.html
│   └── orphaned-files.html
└── webhook-payloads/
    ├── slack.ts
    └── discord.ts

libs/shared/database/src/schema/
└── alert.ts                  # Schema de alertas

apps/api/src/routes/
└── notificacoes/             # Endpoint de notificações in-app
    └── index.ts
```

## 🗄️ Schema de Alertas

```typescript
// libs/shared/database/src/schema/alert.ts

import { pgTable, uuid, varchar, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { corretoras } from './corretora';
import { admins } from './admin';

export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Tipo de alerta
  tipo: varchar('tipo', { length: 50 }).notNull(),
  // 'storage_limit_warning' | 'storage_limit_critical' | 'backup_failed' | 
  // 'backup_integrity' | 'orphaned_files' | 'storage_full'
  
  // Severidade
  severidade: varchar('severidade', { length: 20 }).notNull(),
  // 'info' | 'warning' | 'error' | 'critical'
  
  // Relações
  corretoraId: uuid('corretora_id').references(() => corretoras.id),
  
  // Conteúdo
  titulo: varchar('titulo', { length: 255 }).notNull(),
  mensagem: varchar('mensagem', { length: 1000 }).notNull(),
  detalhes: jsonb('detalhes'), // Dados extras específicos do alerta
  
  // Status
  lido: boolean('lido').default(false).notNull(),
  resolvido: boolean('resolvido').default(false).notNull(),
  resolvidoEm: timestamp('resolvido_em'),
  resolvidoPorId: uuid('resolvido_por_id').references(() => admins.id),
  
  // Notificações enviadas
  emailEnviado: boolean('email_enviado').default(false).notNull(),
  webhookEnviado: boolean('webhook_enviado').default(false).notNull(),
  
  // Metadata
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
}, (table) => ({
  corretoraIdIdx: index('alerts_corretora_id_idx').on(table.corretoraId),
  tipoIdx: index('alerts_tipo_idx').on(table.tipo),
  severidadeIdx: index('alerts_severidade_idx').on(table.severidade),
  criadoEmIdx: index('alerts_criado_em_idx').on(table.criadoEm),
}));

export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
```

## 🔔 Alert Service

```typescript
// libs/shared/utils/src/alert-service.ts

import { db } from '@ecotech/database';
import { alerts, corretoras } from '@ecotech/database/schema';
import nodemailer from 'nodemailer';
import { eq } from 'drizzle-orm';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

interface WebhookConfig {
  url: string;
  type: 'slack' | 'discord' | 'generic';
}

interface AlertOptions {
  corretoraId?: string;
  titulo: string;
  mensagem: string;
  detalhes?: any;
  enviarEmail?: boolean;
  enviarWebhook?: boolean;
}

export class AlertService {
  private emailTransporter: nodemailer.Transporter | null = null;
  private webhookConfig: WebhookConfig | null = null;

  constructor() {
    this.initializeEmail();
    this.initializeWebhook();
  }

  /**
   * Inicializa transporter de email
   */
  private initializeEmail() {
    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || '',
      },
      from: process.env.ALERT_EMAIL_FROM || 'alerts@ecotech.com',
    };

    if (config.auth.user && config.auth.pass) {
      this.emailTransporter = nodemailer.createTransport(config);
    }
  }

  /**
   * Inicializa webhook
   */
  private initializeWebhook() {
    const url = process.env.ALERT_WEBHOOK_URL;
    const type = (process.env.ALERT_WEBHOOK_TYPE || 'generic') as WebhookConfig['type'];

    if (url) {
      this.webhookConfig = { url, type };
    }
  }

  /**
   * Alerta genérico
   */
  private async createAlert(
    tipo: string,
    severidade: 'info' | 'warning' | 'error' | 'critical',
    options: AlertOptions
  ): Promise<string> {
    const [alert] = await db.insert(alerts).values({
      tipo,
      severidade,
      corretoraId: options.corretoraId,
      titulo: options.titulo,
      mensagem: options.mensagem,
      detalhes: options.detalhes,
    }).returning();

    // Enviar email
    if (options.enviarEmail !== false && this.emailTransporter) {
      try {
        await this.sendEmail(alert);
        await db.update(alerts)
          .set({ emailEnviado: true })
          .where(eq(alerts.id, alert.id));
      } catch (error) {
        console.error('Erro ao enviar email de alerta:', error);
      }
    }

    // Enviar webhook
    if (options.enviarWebhook !== false && this.webhookConfig) {
      try {
        await this.sendWebhook(alert);
        await db.update(alerts)
          .set({ webhookEnviado: true })
          .where(eq(alerts.id, alert.id));
      } catch (error) {
        console.error('Erro ao enviar webhook de alerta:', error);
      }
    }

    return alert.id;
  }

  /**
   * Alerta: Limite de storage (warning ou critical)
   */
  async alertStorageLimit(
    corretoraId: string,
    percentUsed: number,
    level: 'warning' | 'critical'
  ): Promise<string> {
    const corretora = await db.query.corretoras.findFirst({
      where: eq(corretoras.id, corretoraId),
    });

    const titulo = level === 'warning'
      ? 'Limite de Storage Próximo'
      : 'Limite de Storage Atingido';

    const mensagem = level === 'warning'
      ? `A corretora ${corretora?.nomeFantasia} está usando ${percentUsed.toFixed(1)}% do limite de storage.`
      : `A corretora ${corretora?.nomeFantasia} atingiu ${percentUsed.toFixed(1)}% do limite. Uploads foram bloqueados.`;

    return this.createAlert(
      level === 'warning' ? 'storage_limit_warning' : 'storage_limit_critical',
      level === 'warning' ? 'warning' : 'critical',
      {
        corretoraId,
        titulo,
        mensagem,
        detalhes: {
          percentUsed,
          nomeFantasia: corretora?.nomeFantasia,
        },
      }
    );
  }

  /**
   * Alerta: Backup falhou
   */
  async alertBackupFailed(
    backupId: string,
    corretoraId: string,
    erro?: string
  ): Promise<string> {
    const corretora = await db.query.corretoras.findFirst({
      where: eq(corretoras.id, corretoraId),
    });

    return this.createAlert(
      'backup_failed',
      'error',
      {
        corretoraId,
        titulo: 'Backup Falhou',
        mensagem: `O backup da corretora ${corretora?.nomeFantasia} falhou.`,
        detalhes: {
          backupId,
          erro,
          nomeFantasia: corretora?.nomeFantasia,
        },
      }
    );
  }

  /**
   * Alerta: Integridade de backup comprometida
   */
  async alertBackupIntegrityFailed(
    backupId: string,
    erros: string[]
  ): Promise<string> {
    return this.createAlert(
      'backup_integrity',
      'critical',
      {
        titulo: 'Integridade de Backup Comprometida',
        mensagem: `Verificação de backup ${backupId} detectou ${erros.length} problema(s).`,
        detalhes: {
          backupId,
          erros,
        },
      }
    );
  }

  /**
   * Alerta: Arquivos órfãos detectados
   */
  async alertOrphanedFiles(count: number): Promise<string> {
    return this.createAlert(
      'orphaned_files',
      'warning',
      {
        titulo: 'Arquivos Órfãos Detectados',
        mensagem: `Foram encontrados ${count} arquivos no R2 sem registro no banco de dados.`,
        detalhes: { count },
      }
    );
  }

  /**
   * Alerta: Storage completamente cheio
   */
  async alertStorageFull(corretoraId: string): Promise<string> {
    const corretora = await db.query.corretoras.findFirst({
      where: eq(corretoras.id, corretoraId),
    });

    return this.createAlert(
      'storage_full',
      'critical',
      {
        corretoraId,
        titulo: 'Storage Completamente Cheio',
        mensagem: `A corretora ${corretora?.nomeFantasia} não pode mais fazer uploads. Limite atingido.`,
        detalhes: {
          nomeFantasia: corretora?.nomeFantasia,
        },
      }
    );
  }

  /**
   * Enviar email
   */
  private async sendEmail(alert: typeof alerts.$inferSelect): Promise<void> {
    if (!this.emailTransporter) {
      throw new Error('Email transporter não configurado');
    }

    const emailTo = process.env.ALERT_EMAIL_TO || 'admin@ecotech.com';
    const htmlTemplate = this.getEmailTemplate(alert);

    await this.emailTransporter.sendMail({
      from: process.env.ALERT_EMAIL_FROM,
      to: emailTo,
      subject: `[${alert.severidade.toUpperCase()}] ${alert.titulo}`,
      html: htmlTemplate,
    });
  }

  /**
   * Enviar webhook
   */
  private async sendWebhook(alert: typeof alerts.$inferSelect): Promise<void> {
    if (!this.webhookConfig) {
      throw new Error('Webhook não configurado');
    }

    const payload = this.getWebhookPayload(alert);

    const response = await fetch(this.webhookConfig.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook retornou status ${response.status}`);
    }
  }

  /**
   * Template de email HTML
   */
  private getEmailTemplate(alert: typeof alerts.$inferSelect): string {
    const severidadeColor = {
      info: '#3b82f6',
      warning: '#f59e0b',
      error: '#ef4444',
      critical: '#dc2626',
    };

    const color = severidadeColor[alert.severidade as keyof typeof severidadeColor];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${color}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 5px 5px; }
          .badge { display: inline-block; padding: 4px 8px; background: ${color}; color: white; border-radius: 3px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
          .details { background: white; padding: 15px; margin-top: 15px; border-radius: 5px; border-left: 4px solid ${color}; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">${alert.titulo}</h2>
          </div>
          <div class="content">
            <p><span class="badge">${alert.severidade}</span></p>
            <p>${alert.mensagem}</p>
            
            ${alert.detalhes ? `
              <div class="details">
                <h3 style="margin-top: 0;">Detalhes</h3>
                <pre style="background: #f3f4f6; padding: 10px; border-radius: 3px; overflow-x: auto;">${JSON.stringify(alert.detalhes, null, 2)}</pre>
              </div>
            ` : ''}
            
            <p style="margin-top: 20px;">
              <strong>Data:</strong> ${new Date(alert.criadoEm).toLocaleString('pt-BR')}<br>
              <strong>ID do Alerta:</strong> <code>${alert.id}</code>
            </p>
          </div>
          <div class="footer">
            <p>Este é um alerta automático do sistema EcoTech.<br>
            Não responda este email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Payload para webhook (Slack)
   */
  private getWebhookPayload(alert: typeof alerts.$inferSelect): any {
    if (this.webhookConfig?.type === 'slack') {
      return {
        text: `[${alert.severidade.toUpperCase()}] ${alert.titulo}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: alert.titulo,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: alert.mensagem,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `*Severidade:* ${alert.severidade} | *Data:* ${new Date(alert.criadoEm).toLocaleString('pt-BR')}`,
              },
            ],
          },
        ],
      };
    }

    if (this.webhookConfig?.type === 'discord') {
      const colorMap = {
        info: 3447003,
        warning: 16776960,
        error: 15158332,
        critical: 10038562,
      };

      return {
        embeds: [
          {
            title: alert.titulo,
            description: alert.mensagem,
            color: colorMap[alert.severidade as keyof typeof colorMap],
            fields: [
              {
                name: 'Severidade',
                value: alert.severidade,
                inline: true,
              },
              {
                name: 'Data',
                value: new Date(alert.criadoEm).toLocaleString('pt-BR'),
                inline: true,
              },
            ],
            timestamp: alert.criadoEm,
          },
        ],
      };
    }

    // Generic webhook
    return {
      tipo: alert.tipo,
      severidade: alert.severidade,
      titulo: alert.titulo,
      mensagem: alert.mensagem,
      detalhes: alert.detalhes,
      criadoEm: alert.criadoEm,
    };
  }

  /**
   * Marcar alerta como lido
   */
  async markAsRead(alertId: string): Promise<void> {
    await db.update(alerts)
      .set({ lido: true })
      .where(eq(alerts.id, alertId));
  }

  /**
   * Resolver alerta
   */
  async resolveAlert(alertId: string, adminId: string): Promise<void> {
    await db.update(alerts)
      .set({
        resolvido: true,
        resolvidoEm: new Date(),
        resolvidoPorId: adminId,
      })
      .where(eq(alerts.id, alertId));
  }
}

// Singleton
export const alertService = new AlertService();
```

## 📡 API de Notificações (Frontend)

```typescript
// apps/api/src/routes/notificacoes/index.ts

import { FastifyPluginAsync } from 'fastify';
import { db } from '@ecotech/database';
import { alerts } from '@ecotech/database/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { authorize } from '@ecotech/plugins/authorization';

const notificacoesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/notificacoes
   * Lista notificações da corretora
   */
  fastify.get('/', {
    preHandler: [authorize(['notificacoes:visualizar'])],
  }, async (request, reply) => {
    const corretoraId = request.user.corretoraId;

    const notificacoes = await db.query.alerts.findMany({
      where: eq(alerts.corretoraId, corretoraId),
      orderBy: [desc(alerts.criadoEm)],
      limit: 50,
    });

    return reply.send({
      success: true,
      data: notificacoes,
    });
  });

  /**
   * GET /api/notificacoes/nao-lidas
   * Conta notificações não lidas
   */
  fastify.get('/nao-lidas', {
    preHandler: [authorize(['notificacoes:visualizar'])],
  }, async (request, reply) => {
    const corretoraId = request.user.corretoraId;

    const count = await db.$count(alerts, and(
      eq(alerts.corretoraId, corretoraId),
      eq(alerts.lido, false)
    ));

    return reply.send({
      success: true,
      data: { count },
    });
  });

  /**
   * PATCH /api/notificacoes/:id/ler
   * Marcar notificação como lida
   */
  fastify.patch('/:id/ler', {
    preHandler: [authorize(['notificacoes:visualizar'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const corretoraId = request.user.corretoraId;

    // Verificar se notificação pertence à corretora
    const notificacao = await db.query.alerts.findFirst({
      where: and(
        eq(alerts.id, id),
        eq(alerts.corretoraId, corretoraId)
      ),
    });

    if (!notificacao) {
      return reply.status(404).send({
        success: false,
        error: 'Notificação não encontrada',
      });
    }

    await db.update(alerts)
      .set({ lido: true })
      .where(eq(alerts.id, id));

    return reply.send({
      success: true,
      message: 'Notificação marcada como lida',
    });
  });

  /**
   * PATCH /api/notificacoes/ler-todas
   * Marcar todas as notificações como lidas
   */
  fastify.patch('/ler-todas', {
    preHandler: [authorize(['notificacoes:visualizar'])],
  }, async (request, reply) => {
    const corretoraId = request.user.corretoraId;

    await db.update(alerts)
      .set({ lido: true })
      .where(and(
        eq(alerts.corretoraId, corretoraId),
        eq(alerts.lido, false)
      ));

    return reply.send({
      success: true,
      message: 'Todas as notificações marcadas como lidas',
    });
  });
};

export default notificacoesRoutes;
```

## 🎨 Frontend - Componente de Notificações

```typescript
// apps/web/src/components/layout/notifications-dropdown.tsx

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notificacao {
  id: string;
  tipo: string;
  severidade: 'info' | 'warning' | 'error' | 'critical';
  titulo: string;
  mensagem: string;
  lido: boolean;
  criadoEm: Date;
}

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notificacoes } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: async () => {
      const response = await api.get('/notificacoes');
      return response.data as Notificacao[];
    },
  });

  const { data: countData } = useQuery({
    queryKey: ['notificacoes', 'nao-lidas'],
    queryFn: async () => {
      const response = await api.get('/notificacoes/nao-lidas');
      return response.data as { count: number };
    },
    refetchInterval: 30000, // Atualizar a cada 30s
  });

  const marcarComoLidaMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notificacoes/${id}/ler`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });

  const marcarTodasComoLidasMutation = useMutation({
    mutationFn: () => api.patch('/notificacoes/ler-todas'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });

  const getSeveridadeColor = (severidade: string) => {
    switch (severidade) {
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'critical':
        return 'bg-red-200 text-red-900';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const naoLidas = countData?.count || 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs"
            >
              {naoLidas > 9 ? '9+' : naoLidas}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h3 className="font-semibold">Notificações</h3>
          {naoLidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => marcarTodasComoLidasMutation.mutate()}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {!notificacoes || notificacoes.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            notificacoes.map((notificacao) => (
              <DropdownMenuItem
                key={notificacao.id}
                className={`flex flex-col items-start gap-1 p-4 ${
                  !notificacao.lido ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  if (!notificacao.lido) {
                    marcarComoLidaMutation.mutate(notificacao.id);
                  }
                }}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{notificacao.titulo}</span>
                      {!notificacao.lido && (
                        <div className="h-2 w-2 rounded-full bg-blue-600" />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {notificacao.mensagem}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={getSeveridadeColor(notificacao.severidade)}
                  >
                    {notificacao.severidade}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notificacao.criadoEm), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## 🧪 Testes

### Testar Alertas

```typescript
// scripts/test-alerts.ts

import { alertService } from '@ecotech/utils';

async function testAlerts() {
  const corretoraId = 'sua-corretora-id';

  // 1. Storage limit warning
  console.log('1. Testando alerta de limite (warning)...');
  const alert1 = await alertService.alertStorageLimit(corretoraId, 78, 'warning');
  console.log('Alert ID:', alert1);

  // 2. Storage limit critical
  console.log('\n2. Testando alerta de limite (critical)...');
  const alert2 = await alertService.alertStorageLimit(corretoraId, 92, 'critical');
  console.log('Alert ID:', alert2);

  // 3. Backup failed
  console.log('\n3. Testando alerta de backup falhou...');
  const alert3 = await alertService.alertBackupFailed(
    'backup-id-123',
    corretoraId,
    'Erro de conexão com R2'
  );
  console.log('Alert ID:', alert3);

  // 4. Backup integrity
  console.log('\n4. Testando alerta de integridade...');
  const alert4 = await alertService.alertBackupIntegrityFailed('backup-id-456', [
    'Checksum mismatch: arquivo1.pdf',
    'Arquivo não encontrado: arquivo2.pdf',
  ]);
  console.log('Alert ID:', alert4);

  // 5. Orphaned files
  console.log('\n5. Testando alerta de arquivos órfãos...');
  const alert5 = await alertService.alertOrphanedFiles(125);
  console.log('Alert ID:', alert5);

  console.log('\nTodos os alertas foram criados e enviados!');
}

testAlerts().catch(console.error);
```

## 📧 Configuração de Email

### Gmail (App Password)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-de-app

ALERT_EMAIL_FROM=alerts@ecotech.com
ALERT_EMAIL_TO=admin@ecotech.com
```

**Nota**: Para Gmail, você precisa criar uma senha de app em https://myaccount.google.com/apppasswords

### SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=sua-api-key-sendgrid

ALERT_EMAIL_FROM=alerts@ecotech.com
ALERT_EMAIL_TO=admin@ecotech.com
```

## 🔗 Configuração de Webhook

### Slack

```env
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
ALERT_WEBHOOK_TYPE=slack
```

### Discord

```env
ALERT_WEBHOOK_URL=https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz
ALERT_WEBHOOK_TYPE=discord
```

## 📝 Checklist de Implementação

- [ ] Criar schema de alertas no banco
- [ ] Implementar AlertService
  - [ ] Storage limit warnings
  - [ ] Backup failed alerts
  - [ ] Backup integrity alerts
  - [ ] Orphaned files alerts
  - [ ] Storage full alerts
- [ ] Configurar email (SMTP)
  - [ ] Templates HTML
  - [ ] Testar envio
- [ ] Configurar webhook (Slack/Discord)
  - [ ] Payloads específicos
  - [ ] Testar envio
- [ ] Implementar API de notificações
  - [ ] Listar notificações
  - [ ] Marcar como lida
  - [ ] Contar não lidas
- [ ] Criar componente frontend
  - [ ] Dropdown de notificações
  - [ ] Badge de contador
  - [ ] Auto-refresh
- [ ] Integrar com jobs
  - [ ] Check limits job
  - [ ] Backup jobs
  - [ ] Orphaned files job
- [ ] Testar todos os alertas
- [ ] Documentar configuração

## 📝 Próximo Documento

Continue com **[16-TESTES.md](./16-TESTES.md)** para implementar testes automatizados.

---

**Navegação**: [← 12. Workers/Jobs](./12-WORKERS-JOBS.md) | [Índice](./00-INDICE.md) | [16. Testes →](./16-TESTES.md)
