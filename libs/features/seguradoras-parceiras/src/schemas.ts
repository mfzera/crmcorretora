import { z } from 'zod';

export const createSeguradoraParceiraSchema = z.object({
  cnpj: z
    .string()
    .regex(
      /^(\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/,
      'CNPJ deve ter 14 dígitos ou estar no formato XX.XXX.XXX/XXXX-XX',
    ),
  razaoSocial: z
    .string()
    .min(1, 'Razão social é obrigatória')
    .max(255, 'Razão social deve ter no máximo 255 caracteres'),
  nomeFantasia: z
    .string()
    .max(255, 'Nome fantasia deve ter no máximo 255 caracteres')
    .optional(),
  telefone: z
    .string()
    .max(20, 'Telefone deve ter no máximo 20 caracteres')
    .optional(),
  email: z
    .string()
    .email('Email inválido')
    .max(255, 'Email deve ter no máximo 255 caracteres')
    .optional(),
  telefone24h: z
    .string()
    .max(20, 'Telefone 24h deve ter no máximo 20 caracteres')
    .optional(),
  whatsapp24h: z
    .string()
    .max(20, 'WhatsApp 24h deve ter no máximo 20 caracteres')
    .optional(),
  horarioAtendimento24h: z
    .string()
    .max(100, 'Horário de atendimento deve ter no máximo 100 caracteres')
    .optional(),
  status: z.enum(['ATIVA', 'INATIVA']).default('ATIVA'),
});

export const updateSeguradoraParceiraSchema = createSeguradoraParceiraSchema.partial();

export const listSeguradorasParceiraQuerySchema = z.object({
  status: z.enum(['ATIVA', 'INATIVA', 'TODAS']).optional().default('ATIVA'),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
});

export type CreateSeguradoraParceiraInput = z.infer<typeof createSeguradoraParceiraSchema>;
export type UpdateSeguradoraParceiraInput = z.infer<typeof updateSeguradoraParceiraSchema>;
export type ListSeguradorasParceiraQuery = z.infer<typeof listSeguradorasParceiraQuerySchema>;
