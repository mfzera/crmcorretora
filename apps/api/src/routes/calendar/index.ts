import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@ecotech/shared/database';
import {
  tarefas,
  renovacoesComerciais,
  documentosVenda,
  oportunidades,
} from '@ecotech/shared/database';
import { eq, and, sql, gte, lte, isNull } from 'drizzle-orm';
import { authorize } from '@ecotech/plugins/authorization';
import { fetchGoogleCalendarEvents, fetchGoogleTasksEvents } from '../../utils/google-calendar.js';

const calendarioQuerySchema = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}$/),
  tipos: z.string().default('tarefas,renovacoes,documentos,oportunidades'),
});

interface CalendarioEvento {
  id: string;
  tipo: 'tarefa' | 'renovacao' | 'documento' | 'oportunidade' | 'google';
  titulo: string;
  data: string;
  meta: Record<string, unknown>;
}

const calendarioRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get(
    '/',
    {
      schema: {
        tags: ['Calendario'],
        summary: 'Eventos do calendario mensal',
        description:
          'Retorna eventos agrupados por dia para um mes especifico.',
      },
      preHandler: [authorize(['dashboard:visualizar'])],
    },
    async (request) => {
      const { mes, tipos } = calendarioQuerySchema.parse(request.query);
      const tiposArray = tipos.split(',').concat(['google']); // sempre inclui google se conectado
      const userId = request.user.sub;
      const corretoraId = request.corretoraId;

      const [year, month] = mes.split('-').map(Number);
      const startDate = `${mes}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${mes}-${String(lastDay).padStart(2, '0')}`;

      // For timestamp columns, we need actual Date objects
      const startDateTime = new Date(startDate + 'T00:00:00.000Z');
      const endDateTime = new Date(endDate + 'T23:59:59.999Z');

      const eventos: Record<string, CalendarioEvento[]> = {};
      let countTarefas = 0;
      let countRenovacoes = 0;
      let countDocumentos = 0;
      let countOportunidades = 0;
      let countGoogle = 0;

      function addEvento(dateStr: string, evento: CalendarioEvento) {
        if (!eventos[dateStr]) eventos[dateStr] = [];
        eventos[dateStr].push(evento);
      }

      // Run queries in parallel
      const promises: Promise<void>[] = [];

      // 1. TAREFAS
      if (tiposArray.includes('tarefas')) {
        promises.push(
          (async () => {
            try {
              const items = await db.query.tarefas.findMany({
                where: and(
                  eq(tarefas.corretoraId, corretoraId),
                  eq(tarefas.usuarioId, userId),
                  isNull(tarefas.deletedAt),
                  gte(tarefas.dataVencimento, startDateTime),
                  lte(tarefas.dataVencimento, endDateTime),
                ),
              });

              for (const t of items) {
                const dateStr = t.dataVencimento!.toISOString().split('T')[0];
                addEvento(dateStr, {
                  id: t.id,
                  tipo: 'tarefa',
                  titulo: t.titulo,
                  data: dateStr,
                  meta: {
                    prioridade: t.prioridade,
                    concluida: t.concluida,
                    entidadeTipo: t.entidadeTipo,
                  },
                });
                countTarefas++;
              }
            } catch (error) {
              // Table might not exist yet - silently skip tarefas
              request.log.warn(
                { error },
                'Tarefas table query failed (table might not exist yet)',
              );
            }
          })(),
        );
      }

      // 2. RENOVACOES
      if (tiposArray.includes('renovacoes')) {
        promises.push(
          (async () => {
            const items = (await db.query.renovacoesComerciais.findMany({
              where: and(
                eq(renovacoesComerciais.corretoraId, corretoraId),
                eq(renovacoesComerciais.vendedorId, userId),
                sql`${renovacoesComerciais.status} NOT IN ('RENOVADO', 'PERDIDO', 'CANCELADO')`,
                gte(renovacoesComerciais.dataVencimento, startDate),
                lte(renovacoesComerciais.dataVencimento, endDate),
              ),
              with: {
                cliente: {
                  columns: { id: true, nome: true, razaoSocial: true },
                },
              } as any,
            })) as Array<
              typeof renovacoesComerciais.$inferSelect & {
                cliente: {
                  id: string;
                  nome: string | null;
                  razaoSocial: string | null;
                } | null;
              }
            >;

            for (const r of items) {
              const dateStr = r.dataVencimento;
              addEvento(dateStr, {
                id: r.id,
                tipo: 'renovacao',
                titulo: r.itemDescricao || r.produtoDescricao || 'Renovacao',
                data: dateStr,
                meta: {
                  status: r.status,
                  clienteNome: r.cliente?.nome || r.cliente?.razaoSocial || '',
                  premioAnterior: r.premioAnterior
                    ? parseFloat(r.premioAnterior)
                    : undefined,
                },
              });
              countRenovacoes++;
            }
          })(),
        );
      }

      // 3. DOCUMENTOS DE VENDA (vencimento de apolice)
      if (tiposArray.includes('documentos')) {
        promises.push(
          (async () => {
            const items = (await db.query.documentosVenda.findMany({
              where: and(
                eq(documentosVenda.corretoraId, corretoraId),
                eq(documentosVenda.vendedorId, userId),
                eq(documentosVenda.status, 'ATIVO'),
                isNull(documentosVenda.deletedAt),
                gte(documentosVenda.vigenciaFim, startDate),
                lte(documentosVenda.vigenciaFim, endDate),
              ),
              with: {
                cliente: {
                  columns: { id: true, nome: true, razaoSocial: true },
                },
              } as any,
            })) as Array<
              typeof documentosVenda.$inferSelect & {
                cliente: {
                  id: string;
                  nome: string | null;
                  razaoSocial: string | null;
                } | null;
              }
            >;

            for (const d of items) {
              const dateStr = d.vigenciaFim;
              addEvento(dateStr, {
                id: d.id,
                tipo: 'documento',
                titulo: `Vencimento: ${d.numeroDocumento}`,
                data: dateStr,
                meta: {
                  tipoDocumento: d.tipoDocumento,
                  statusDocumento: d.status,
                  clienteNome: d.cliente?.nome || d.cliente?.razaoSocial || '',
                  numeroDocumento: d.numeroDocumento,
                },
              });
              countDocumentos++;
            }
          })(),
        );
      }

      // 4. OPORTUNIDADES (dataVencimento)
      if (tiposArray.includes('oportunidades')) {
        promises.push(
          (async () => {
            const items = await db.query.oportunidades.findMany({
              where: and(
                eq(oportunidades.corretoraId, corretoraId),
                eq(oportunidades.vendedorId, userId),
                sql`${oportunidades.status} NOT IN ('ganha', 'perdida')`,
                isNull(oportunidades.deletedAt),
                gte(oportunidades.dataVencimento, startDateTime),
                lte(oportunidades.dataVencimento, endDateTime),
              ),
            });

            for (const o of items) {
              const dateStr = o.dataVencimento!.toISOString().split('T')[0];
              addEvento(dateStr, {
                id: o.id,
                tipo: 'oportunidade',
                titulo: o.nomeCliente,
                data: dateStr,
                meta: {
                  status: o.status,
                  prioridade: o.prioridade,
                  premioEstimado: o.premioEstimado
                    ? parseFloat(o.premioEstimado)
                    : undefined,
                },
              });
              countOportunidades++;
            }
          })(),
        );
      }

      // 5. GOOGLE CALENDAR + GOOGLE TASKS
      promises.push(
        (async () => {
          try {
            const [googleEventos, googleTarefas] = await Promise.all([
              fetchGoogleCalendarEvents(userId, startDateTime, endDateTime),
              fetchGoogleTasksEvents(userId, startDateTime, endDateTime),
            ]);
            for (const evento of [...googleEventos, ...googleTarefas]) {
              addEvento(evento.data, evento);
              countGoogle++;
            }
          } catch (error) {
            request.log.warn({ error }, 'Google fetch failed');
          }
        })(),
      );

      await Promise.all(promises);

      return {
        success: true,
        data: {
          eventos,
          resumo: {
            tarefas: countTarefas,
            renovacoes: countRenovacoes,
            documentos: countDocumentos,
            oportunidades: countOportunidades,
            google: countGoogle,
          },
        },
      };
    },
  );
};

export default calendarioRoutes;
