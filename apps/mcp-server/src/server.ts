import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from './api-client.js';
import { registerClienteTools } from './tools/clientes.js';
import { registerCotacaoTools } from './tools/cotacoes.js';
import { registerPropostaTools } from './tools/propostas.js';
import { registerDocumentoTools } from './tools/documentos.js';
import { registerRenovacaoTools } from './tools/renovacoes.js';
import { registerOportunidadeTools } from './tools/oportunidades.js';

export function createMcpServer(corretoraId: string): McpServer {
  const apiClient = new ApiClient(corretoraId);

  const server = new McpServer({
    name: 'ecotech-mcp',
    version: '1.0.0',
  });

  registerClienteTools(server, apiClient);
  registerCotacaoTools(server, apiClient);
  registerPropostaTools(server, apiClient);
  registerDocumentoTools(server, apiClient);
  registerRenovacaoTools(server, apiClient);
  registerOportunidadeTools(server, apiClient);

  return server;
}
