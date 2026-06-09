import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';

export function registerCotacaoTools(server: McpServer, api: ApiClient): void {
  server.tool(
    'listar_cotacoes',
    'Lista cotações com filtros opcionais por cliente e status',
    {
      clienteId: z.number().int().positive().optional().describe('ID do cliente (opcional)'),
      status: z.string().optional().describe('Status da cotação (opcional)'),
      limite: z.number().int().positive().optional().describe('Limite de resultados (opcional)'),
    },
    async ({ clienteId, status, limite }) => {
      try {
        const data = await api.get('/cotacoes', { clienteId, status, limite });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Erro ao listar cotações: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'detalhes_cotacao',
    'Retorna cotação completa com produto, vendedor e comissões',
    { cotacaoId: z.number().int().positive().describe('ID da cotação') },
    async ({ cotacaoId }) => {
      try {
        const data = await api.get(`/cotacoes/${cotacaoId}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Erro ao buscar cotação: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    }
  );
}
