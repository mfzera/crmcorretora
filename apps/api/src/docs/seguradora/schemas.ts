import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';
import { corretoras } from '@ecotech/shared/database';
import { updateSeguradoraSchema } from '@ecotech/features/seguradora';
import { routeDoc, defaultErrors } from '../index.js';
import { wireDate } from '../wire.js';

/**
 * "Seguradora" aqui é a corretora (o tenant). Mantemos o nome do endpoint
 * por compatibilidade. Selecionamos só campos públicos do tenant.
 */
const corretoraSelect = createSelectSchema(corretoras);

const seguradoraData = corretoraSelect
  .pick({
    id: true,
    razaoSocial: true,
    nomeFantasia: true,
    cnpj: true,
    subdominio: true,
    emailContato: true,
    telefone: true,
    cep: true,
    logradouro: true,
    numero: true,
    complemento: true,
    bairro: true,
    cidade: true,
    uf: true,
    logoUrl: true,
    coresTema: true,
  })
  .extend({
    updatedAt: wireDate.nullable(),
  });

export const seguradoraDocs = {
  buscar: routeDoc({
    response: {
      200: z.object({ success: z.literal(true), data: seguradoraData }),
      ...defaultErrors,
    },
  }),

  atualizar: routeDoc({
    body: updateSeguradoraSchema,
    response: {
      200: z.object({ success: z.literal(true), data: seguradoraData }),
      ...defaultErrors,
    },
  }),

  uso: routeDoc({
    response: {
      200: z.object({ success: z.literal(true), data: z.unknown() }),
      ...defaultErrors,
    },
  }),

  atualizarLogo: routeDoc({
    body: z.object({
      logoUrl: z.string().url().describe('URL pública da logo'),
    }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({ logoUrl: z.string() }),
      }),
      ...defaultErrors,
    },
  }),
};
