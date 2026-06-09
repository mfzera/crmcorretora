import type { ApiResponse, ApiErrorDetails } from '@ecotech/shared/types';
import { checkAccess, getRequiredPermissions } from './permission-manifest';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  silent403?: boolean;
}

class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
    public requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Type guard to check if response is a standard ApiResponse
 */
function isApiResponse<T>(data: unknown): data is ApiResponse<T> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    'data' in data
  );
}

type AuthSnapshot = {
  token: string | null;
  permissoes: string[] | undefined;
  isAdmin: boolean | undefined;
};

function readAuthSnapshot(): AuthSnapshot {
  if (typeof window === 'undefined') {
    return { token: null, permissoes: undefined, isAdmin: undefined };
  }
  try {
    const stored = localStorage.getItem('auth-storage');
    if (!stored) return { token: null, permissoes: undefined, isAdmin: undefined };
    const parsed = JSON.parse(stored);
    const s = parsed.state ?? {};
    return {
      token: s.token ?? null,
      permissoes: s.user?.permissoes,
      isAdmin: s.user?.isAdmin,
    };
  } catch {
    return { token: null, permissoes: undefined, isAdmin: undefined };
  }
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, body, headers: customHeaders, silent403, ...init } = options;

  let url = `${API_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const { token, permissoes, isAdmin } = readAuthSnapshot();
  const method = (init.method ?? 'GET').toUpperCase();

  // Gate local contra o manifesto: evita disparar request que o backend
  // rejeitaria com 403 por falta de permissão. Admin e rotas fora do manifesto
  // (públicas ou contextuais por ownership) passam. Antes do login (sem
  // token) também deixa passar — o próprio login/refresh é público.
  if (token && !checkAccess(method, endpoint, permissoes, isAdmin)) {
    if (typeof window !== 'undefined') {
      const required = getRequiredPermissions(method, endpoint);
      const perms = required?.permissions ?? [];
      const isMutation = method !== 'GET';
      window.dispatchEvent(new CustomEvent(
        isMutation ? 'api:mutation-forbidden' : 'api:forbidden',
        { detail: { permissoesNecessarias: perms } },
      ));
    }
    throw new ApiError(
      403,
      'FORBIDDEN_LOCAL',
      'Bloqueado pelo manifesto de permissões (request não disparada)',
    );
  }

  const reqId = crypto.randomUUID();

  const isNgrok = API_URL.includes('ngrok');
  const headers: HeadersInit = {
    'X-Request-ID': reqId,
    ...(isNgrok && { 'ngrok-skip-browser-warning': '1' }),
    ...customHeaders,
  };

  // Só adiciona Content-Type se houver body e não for FormData
  if (body !== undefined && body !== null && !(body instanceof FormData)) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...init,
      method,
      headers,
      body: body
        ? body instanceof FormData
          ? body
          : JSON.stringify(body)
        : undefined,
    });

    // Se for 204 No Content, não há corpo para parsear
    const data =
      response.status === 204
        ? {}
        : await response.json().catch(() => {
            return {};
          });

    const responseReqId = response.headers.get('x-request-id') ?? reqId;

    if (!response.ok) {
      // Sessão expirada (401 Unauthorized)
      if (response.status === 401 && typeof window !== 'undefined') {
        const { useAuthStore } = await import('@/infra/auth/auth-store');
        useAuthStore.getState().triggerSessionExpired();
      }

      // Sinalizar 403 via eventos desacoplados.
      // Usamos CustomEvent em vez de window.location.href para evitar race condition
      // quando múltiplas queries paralelas recebem 403 simultaneamente.
      const isOwnershipDenied = data.error?.code === 'OWNERSHIP_DENIED';
      const isMutation = method !== 'GET';
      if (response.status === 403 && !silent403 && typeof window !== 'undefined') {
        if (isOwnershipDenied) {
          // Ownership denied: toast no componente (não redireciona)
          window.dispatchEvent(new CustomEvent('api:ownership-denied'));
        } else if (!isMutation) {
          // GET proibido: redireciona para /sem-permissao
          const perms = (data.error?.details as { permissoesNecessarias?: string[] } | undefined)?.permissoesNecessarias;
          window.dispatchEvent(new CustomEvent('api:forbidden', {
            detail: { permissoesNecessarias: perms ?? [] },
          }));
        } else {
          // Mutation proibida: toast global com a permissão faltante
          const perms = (data.error?.details as { permissoesNecessarias?: string[] } | undefined)?.permissoesNecessarias;
          window.dispatchEvent(new CustomEvent('api:mutation-forbidden', {
            detail: { permissoesNecessarias: perms ?? [] },
          }));
        }
      }

      throw new ApiError(
        response.status,
        data.error?.code || 'UNKNOWN_ERROR',
        data.error?.message || 'Ocorreu um erro inesperado',
        data.error?.details,
        responseReqId,
      );
    }

    // Handle standardized ApiResponse format
    if (isApiResponse<T>(data)) {
      // Se tiver meta (paginação), retorna data + meta
      if ('meta' in data && data.meta) {
        return { data: data.data, meta: data.meta } as T;
      }
      return data.data;
    }

    // Fallback for non-standard responses (backward compatibility)
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Silencia erros de rede (servidor não disponível)
    //
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Erro de conexão com o servidor',
      error,
    );
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

export { ApiError };
