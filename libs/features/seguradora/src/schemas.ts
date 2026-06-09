import { z } from 'zod';

export const updateSeguradoraSchema = z.object({
  nomeFantasia: z.string().max(256).optional(),
  emailContato: z.string().email().optional(),
  telefone: z.string().max(20).optional(),
  cep: z.string().length(8).optional(),
  logradouro: z.string().max(256).optional(),
  numero: z.string().max(20).optional(),
  complemento: z.string().max(100).optional(),
  bairro: z.string().max(100).optional(),
  cidade: z.string().max(100).optional(),
  uf: z.string().length(2).optional(),
  coresTema: z
    .object({
      primary: z.string().optional(),
      secondary: z.string().optional(),
    })
    .optional(),
});

export type UpdateSeguradoraInput = z.infer<typeof updateSeguradoraSchema>;
