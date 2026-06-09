import { z } from 'zod';
import { routeDoc, defaultErrors, defaultErrorsWithNotFound } from '../index.js';

export const publicDocs = {
  changelogs: routeDoc({
    response: {
      200: z.object({
        changelogs: z.array(z.object({
          id: z.string().uuid(),
          version: z.string(),
          title: z.string(),
          description: z.string().nullable(),
          releaseDate: z.string(),
          publishedAt: z.string().nullable(),
          publishedBy: z.string().nullable(),
          items: z.array(z.object({
            id: z.string().uuid(), type: z.string(), title: z.string(), description: z.string(), metadata: z.unknown().nullable(), order: z.union([z.string(), z.number()]),
          })),
        })),
        total: z.number(),
      }),
      ...defaultErrors,
    },
  }),

  roadmapFases: routeDoc({
    response: {
      200: z.object({
        phases: z.array(z.object({
          id: z.string().uuid(), name: z.string(), estimatedDate: z.string(), order: z.union([z.string(), z.number()]),
          items: z.array(z.object({ id: z.string().uuid(), title: z.string(), description: z.string().nullable(), status: z.string(), order: z.union([z.string(), z.number()]) })),
        })),
        total: z.number(),
      }),
      ...defaultErrors,
    },
  }),

  corretora: routeDoc({
    querystring: z.object({ subdominio: z.string().describe('Subdomínio da corretora') }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          nomeFantasia: z.string(), razaoSocial: z.string(), cnpj: z.string(),
          cidade: z.string().nullable(), uf: z.string().nullable(),
          logoUrl: z.string().nullable(), coresTema: z.unknown().nullable(),
          emailContato: z.string().nullable(), telefone: z.string().nullable(),
        }),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),
};
