import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';

export function registerRenovacaoTools(server: McpServer, api: ApiClient): void {
  server.tool(
    'listar_renovacoes',
    'Lista renovações pendentes ou próximas do vencimento',
    {
      clienteId: z.number().int().positive().optional().describe('ID do cliente (opcional)'),
      proximosMeses: z.number().int().positive().optional().describe('Filtrar renovações dos próximos N meses (opcional)'),
    },
    async ({ clienteId, proximosMeses }) => {
      try {
        const data = await api.get('/renovacoes', { clienteId, proximosMeses });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Erro ao listar renovações: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    }
  );
}
