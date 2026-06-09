import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';

export function registerOportunidadeTools(server: McpServer, api: ApiClient): void {
  server.tool(
    'listar_oportunidades',
    'Lista o pipeline CRM com oportunidades de venda',
    {
      status: z.string().optional().describe('Status da oportunidade (opcional)'),
      prioridade: z.string().optional().describe('Prioridade da oportunidade (opcional)'),
    },
    async ({ status, prioridade }) => {
      try {
        const data = await api.get('/oportunidades', { status, prioridade });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Erro ao listar oportunidades: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    }
  );
}
