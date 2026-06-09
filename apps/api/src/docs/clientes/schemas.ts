import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';
import {
  clientes,
  clienteEnderecos,
  clienteContatos,
} from '@ecotech/shared/database';
import {
  createClienteSchema,
  updateClienteSchema,
  listClientesQuerySchema,
  transferirCarteiraSchema,
  addEnderecoSchema,
  addContatoSchema,
} from '@ecotech/features/clientes';
import {
  routeDoc,
  defaultErrors,
  defaultErrorsWithNotFound,
  uuidParam,
  r409,
  r422,
  metaSchema,
} from '../index.js';
import { wireDate } from '../wire.js';

const vendedorRef = z.object({ id: z.string().uuid(), nome: z.string() });

/**
 * Bases derivadas das tabelas (drizzle-zod). Tipos e nullability vêm do schema
 * do DB; overrides explícitos só onde o handler transforma o valor cru
 * (timestamps Date → ISO string via JSON.stringify).
 */
const clienteSelect = createSelectSchema(clientes);
const clienteEnderecoSelect = createSelectSchema(clienteEnderecos);
const clienteContatoSelect = createSelectSchema(clienteContatos);

const clienteBase = clienteSelect.extend({
  createdAt: wireDate.nullable(),
  updatedAt: wireDate.nullable(),
  deletedAt: wireDate.nullable(),
  anonimizadoEm: wireDate.nullable(),
});

const enderecoBase = clienteEnderecoSelect.extend({
  createdAt: wireDate.nullable(),
  updatedAt: wireDate.nullable(),
});

const contatoBase = clienteContatoSelect.extend({
  createdAt: wireDate.nullable(),
});

const clienteDetalhado = clienteBase.extend({
  vendedor: vendedorRef.nullable(),
  vendedorOriginal: vendedorRef.nullable(),
  enderecos: z.array(enderecoBase),
  contatos: z.array(contatoBase),
});

const msgSuccess = z.object({ success: z.literal(true), message: z.string() });

export const clientesDocs = {
  criar: routeDoc({
    body: createClienteSchema,
    response: {
      201: z.object({ success: z.literal(true), data: clienteBase }),
      ...defaultErrors,
      409: r409,
      422: r422,
    },
  }),

  criarLote: routeDoc({
    body: z.object({ clientes: z.array(z.unknown()) }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          criados: z.number(),
          jaExistiam: z.number(),
          erros: z.array(
            z.object({ documento: z.string(), motivo: z.string() }),
          ),
        }),
      }),
      ...defaultErrors,
    },
  }),

  buscarAutocomplete: routeDoc({
    querystring: z.object({
      q: z.string().optional().describe('Termo de busca'),
    }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(
          clienteSelect.pick({
            id: true,
            nome: true,
            razaoSocial: true,
            tipoPessoa: true,
            email: true,
            telefone: true,
            cpf: true,
            cnpj: true,
          }),
        ),
      }),
      ...defaultErrors,
    },
  }),

  listar: routeDoc({
    querystring: listClientesQuerySchema,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(
          clienteBase.extend({
            vendedor: vendedorRef.nullable(),
            isActiveCliente: z.boolean(),
          }),
        ),
        meta: metaSchema,
      }),
      ...defaultErrors,
    },
  }),

  buscar: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: clienteDetalhado }),
      ...defaultErrorsWithNotFound,
    },
  }),

  atualizar: routeDoc({
    params: uuidParam,
    body: updateClienteSchema,
    response: {
      200: z.object({ success: z.literal(true), data: clienteBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  excluir: routeDoc({
    params: uuidParam,
    response: { 200: msgSuccess, ...defaultErrorsWithNotFound },
  }),

  transferirCarteira: routeDoc({
    params: uuidParam,
    body: transferirCarteiraSchema,
    response: { 200: msgSuccess, ...defaultErrorsWithNotFound },
  }),

  adicionarEndereco: routeDoc({
    params: uuidParam,
    body: addEnderecoSchema,
    response: {
      201: z.object({ success: z.literal(true), data: enderecoBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  adicionarContato: routeDoc({
    params: uuidParam,
    body: addContatoSchema,
    response: {
      201: z.object({ success: z.literal(true), data: contatoBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  removerEndereco: routeDoc({
    params: z.object({
      id: z.string().uuid(),
      enderecoId: z.string().uuid(),
    }),
    response: { 200: msgSuccess, ...defaultErrorsWithNotFound },
  }),

  removerContato: routeDoc({
    params: z.object({
      id: z.string().uuid(),
      contatoId: z.string().uuid(),
    }),
    response: { 200: msgSuccess, ...defaultErrorsWithNotFound },
  }),
};
