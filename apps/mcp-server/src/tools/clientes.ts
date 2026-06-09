import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';

export function registerClienteTools(server: McpServer, api: ApiClient): void {
  server.tool(
    'buscar_cliente',
    'Busca clientes por nome, CPF, CNPJ ou telefone',
    { termo: z.string().describe('Termo de busca: nome, CPF, CNPJ ou telefone') },
    async ({ termo }) => {
      try {
        const data = await api.get('/clientes', { search: termo });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Erro ao buscar clientes: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'detalhes_cliente',
    'Retorna dados completos de um cliente incluindo endereços, contatos e histórico',
    { clienteId: z.number().int().positive().describe('ID do cliente') },
    async ({ clienteId }) => {
      try {
        const data = await api.get(`/clientes/${clienteId}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Erro ao buscar cliente: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    }
  );
}
