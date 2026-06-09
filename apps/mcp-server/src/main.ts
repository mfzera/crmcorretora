import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { resolveTenant } from './auth/tenant.js';
import { createMcpServer } from './server.js';

const PORT = parseInt(process.env.PORT ?? '3002', 10);

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk as Uint8Array));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const httpServer = createServer(async (req, res) => {
  try {
    const url = new URL(req.url!, `http://localhost:${PORT}`);

    if (url.pathname === '/health') {
      return sendJson(res, 200, { ok: true });
    }

    if (url.pathname !== '/mcp') {
      return sendJson(res, 404, { error: 'Not found' });
    }

    const tenant = resolveTenant(
      req.headers.authorization,
      req.headers['x-corretora-id'] as string | undefined,
    );

    if (!tenant) {
      return sendJson(res, 401, { error: 'Unauthorized' });
    }

    const mcpServer = createMcpServer(tenant.corretoraId);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });

    await mcpServer.connect(transport);

    let body: unknown = undefined;
    if (req.method === 'POST') {
      try {
        body = await readBody(req);
      } catch {
        return sendJson(res, 400, { error: 'Invalid JSON' });
      }
    }

    await transport.handleRequest(req, res, body);
  } catch (err) {
    console.error('Unhandled error:', err);
    if (!res.headersSent) {
      sendJson(res, 500, { error: 'Internal server error' });
    }
  }
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`EcoTech MCP Server running on port ${PORT}`);
});
