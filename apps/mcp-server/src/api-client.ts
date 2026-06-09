type QueryParams = Record<string, string | number | boolean | undefined | null>;

interface TokenCache {
  token: string;
  expiresAt: number;
}

// Cache de JWT por corretoraId — compartilhado entre requests
const tokenCache = new Map<string, TokenCache>();

async function fetchServiceToken(corretoraId: string): Promise<string> {
  const apiUrl = (process.env.ECOTECH_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
  const secret = process.env.MCP_INTERNAL_SECRET;

  if (!secret) throw new Error('MCP_INTERNAL_SECRET não configurado');

  const res = await fetch(`${apiUrl}/api/auth/mcp-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-mcp-secret': secret,
    },
    body: JSON.stringify({ corretoraId }),
  });

  const json = (await res.json()) as {
    success: boolean;
    data?: { token: string; expiresIn: number };
    error?: string;
  };

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? `Falha ao obter token: HTTP ${res.status}`);
  }

  return json.data.token;
}

async function getToken(corretoraId: string): Promise<string> {
  const cached = tokenCache.get(corretoraId);
  // Renova se faltar menos de 5 minutos para expirar
  if (cached && cached.expiresAt - Date.now() > 5 * 60 * 1000) {
    return cached.token;
  }

  const token = await fetchServiceToken(corretoraId);
  tokenCache.set(corretoraId, {
    token,
    expiresAt: Date.now() + 55 * 60 * 1000, // 55min (token dura 1h)
  });

  return token;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly corretoraId: string;

  constructor(corretoraId: string) {
    this.baseUrl = (process.env.ECOTECH_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
    this.corretoraId = corretoraId;
  }

  async get<T = unknown>(path: string, params?: QueryParams): Promise<T> {
    const token = await getToken(this.corretoraId);

    const url = new URL(this.baseUrl + path);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value != null) url.searchParams.set(key, String(value));
      }
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Token expirado — invalida cache e tenta uma vez
    if (res.status === 401) {
      tokenCache.delete(this.corretoraId);
      const freshToken = await getToken(this.corretoraId);
      const retry = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${freshToken}` },
      });
      const retryJson = (await retry.json()) as { success: boolean; data?: T; error?: string };
      if (!retry.ok || !retryJson.success) throw new Error(retryJson.error ?? `HTTP ${retry.status}`);
      return retryJson.data as T;
    }

    const json = (await res.json()) as { success: boolean; data?: T; error?: string };
    if (!res.ok || !json.success) throw new Error(json.error ?? `HTTP ${res.status}`);
    return json.data as T;
  }
}
