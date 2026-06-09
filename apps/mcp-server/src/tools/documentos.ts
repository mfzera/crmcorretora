import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';

export function registerDocumentoTools(server: McpServer, api: ApiClient): void {
  server.tool(
    'listar_documentos_venda',
    'Lista apólices ativas com valores e vencimentos',
    {
      clienteId: z.number().int().positive().optional().describe('ID do cliente (opcional)'),
    },
    async ({ clienteId }) => {
      try {
        const data = await api.get('/documentos-venda', { clienteId });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Erro ao listar documentos: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    }
  );
}
