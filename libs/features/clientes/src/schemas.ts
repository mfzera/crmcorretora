import { z } from 'zod';

const enderecoSchema = z.object({
  cep: z.string().length(8).optional(),
  logradouro: z.string().max(256).optional(),
  numero: z.string().max(20).optional(),
  complemento: z.string().max(100).optional(),
  bairro: z.string().max(100).optional(),
  cidade: z.string().max(100).optional(),
  uf: z.string().length(2).optional(),
  principal: z.boolean().default(false),
});

const contatoSchema = z.object({
  tipo: z.enum(['EMAIL', 'TELEFONE', 'CELULAR', 'WHATSAPP']),
  valor: z.string().max(256),
  principal: z.boolean().default(false),
});

export const createClientePFSchema = z.object({
  tipoPessoa: z.literal('PF'),
  vendedorId: z.string().uuid().optional(), // vendedor principal; se omitido, usa o usuário logado
  nome: z.string().min(2).max(256),
  cpf: z.string().length(11).regex(/^\d+$/, 'CPF deve conter apenas números'),
  dataNascimento: z.string().optional(),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
  celular: z.string().optional(),
  enderecos: z.array(enderecoSchema).optional(),
  contatos: z.array(contatoSchema).optional(),
});

export const createClientePJSchema = z.object({
  tipoPessoa: z.literal('PJ'),
  vendedorId: z.string().uuid().optional(), // vendedor principal; se omitido, usa o usuário logado
  razaoSocial: z.string().min(2).max(256),
  nomeFantasia: z.string().max(256).optional(),
  cnpj: z.string().length(14).regex(/^\d+$/, 'CNPJ deve conter apenas números'),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
  celular: z.string().optional(),
  enderecos: z.array(enderecoSchema).optional(),
  contatos: z.array(contatoSchema).optional(),
});

export const createClienteSchema = z.discriminatedUnion('tipoPessoa', [
  createClientePFSchema,
  createClientePJSchema,
]);

export const updateClienteSchema = z
  .object({
    tipoPessoa: z.enum(['PF', 'PJ']).optional(),
    nome: z.string().optional(),
    cpf: z.string().optional(),
    rg: z.string().optional(),
    razaoSocial: z.string().optional(),
    nomeFantasia: z.string().optional().nullable(),
    cnpj: z.string().optional(),
    dataNascimento: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    telefone: z.string().optional().nullable(),
    celular: z.string().optional().nullable(),
    ativo: z.boolean().optional(),
  })
  .passthrough();

export const listClientesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).optional(),
  search: z.string().optional(),
  tipoPessoa: z.enum(['PF', 'PJ']).optional(),
  vendedorId: z.string().uuid().optional(),
  ativo: z.enum(['true', 'false']).optional(),
  soTransferidos: z.enum(['true', 'false']).optional(),
  isActiveCliente: z.enum(['true', 'false']).optional(),
});

export const transferirCarteiraSchema = z.object({
  novoVendedorId: z.string().uuid(),
});

export const addEnderecoSchema = enderecoSchema;
export const addContatoSchema = contatoSchema;

export type CreateClienteInput = z.infer<typeof createClienteSchema>;
export type UpdateClienteInput = z.infer<typeof updateClienteSchema>;
export type ListClientesQuery = z.infer<typeof listClientesQuerySchema>;
export type TransferirCarteiraInput = z.infer<typeof transferirCarteiraSchema>;
export type AddEnderecoInput = z.infer<typeof addEnderecoSchema>;
export type AddContatoInput = z.infer<typeof addContatoSchema>;
