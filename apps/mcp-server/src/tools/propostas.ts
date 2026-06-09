import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';

export function registerPropostaTools(server: McpServer, api: ApiClient): void {
  server.tool(
    'listar_propostas',
    'Lista propostas com filtros opcionais por cliente e status',
    {
      clienteId: z.number().int().positive().optional().describe('ID do cliente (opcional)'),
      status: z.string().optional().describe('Status da proposta (opcional)'),
    },
    async ({ clienteId, status }) => {
      try {
        const data = await api.get('/propostas', { clienteId, status });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Erro ao listar propostas: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    }
  );
}
