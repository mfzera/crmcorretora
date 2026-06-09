/**
 * Manifesto de permissões: tabela com (método, caminho, permissões) de cada
 * endpoint protegido pelo backend. O cliente consulta antes de disparar uma
 * requisição e bloqueia chamadas que seriam rejeitadas com 403.
 *
 * Fonte da verdade: backend (GET /_manifest/permissions). O cliente nunca
 * mantém strings de permissão hard-coded em JSX/hooks — elas vêm daqui.
 */

import type { ApiResponse } from '@ecotech/shared/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const STORAGE_KEY = 'permission-manifest';
const MANIFEST_STALE_MS = 5 * 60 * 1000; // 5 minutos

export type ManifestEntry = {
  method: string;
  path: string;
  permissions: string[];
  mode: 'all' | 'any';
};

type CompiledEntry = ManifestEntry & { pattern: RegExp };

type ManifestState = {
  entries: CompiledEntry[];
  loaded: boolean;
  fetchedAt: number | null;
  etag: string | null;
};

const state: ManifestState = {
  entries: [],
  loaded: false,
  fetchedAt: null,
  etag: null,
};

function pathToRegExp(path: string): RegExp {
  // Fastify: `:param` casa com qualquer segmento que não contenha `/`.
  // `*` no fim do path casa com o resto (catch-all).
  const escaped = path
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:[^/]+/g, '[^/]+')
    .replace(/\*$/, '.*');
  return new RegExp(`^${escaped}$`);
}

function compile(entries: ManifestEntry[]): CompiledEntry[] {
  return entries.map((e) => ({ ...e, pattern: pathToRegExp(e.path) }));
}

type StoredManifest = { entries: ManifestEntry[]; fetchedAt: number; etag?: string };

function loadFromStorage(): StoredManifest | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Suporte a formato legado (array direto)
    if (Array.isArray(parsed)) return { entries: parsed, fetchedAt: 0 };
    if (parsed && Array.isArray(parsed.entries)) return parsed as StoredManifest;
    return null;
  } catch {
    return null;
  }
}

function saveToStorage(entries: ManifestEntry[], fetchedAt: number, etag?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, fetchedAt, etag }));
  } catch {
    // localStorage cheio ou indisponível — segue sem cache persistente
  }
}

/** Retorna true se o manifesto em cache está desatualizado (> 5 min). */
export function isManifestStale(): boolean {
  if (!state.fetchedAt) return true;
  return Date.now() - state.fetchedAt > MANIFEST_STALE_MS;
}

/**
 * Tenta hidratar o cache em memória a partir do localStorage, para que
 * `checkAccess` funcione já no primeiro render sem depender do fetch async.
 */
export function hydrateManifest(): void {
  if (state.loaded) return;
  const stored = loadFromStorage();
  if (stored && stored.entries.length > 0) {
    state.entries = compile(stored.entries);
    state.loaded = true;
    state.fetchedAt = stored.fetchedAt;
    state.etag = stored.etag ?? null;
  }
}

/**
 * Busca o manifesto do servidor e atualiza o cache. Seguro chamar várias
 * vezes — idempotente. Não lança em caso de falha de rede (apenas loga);
 * fallback é deixar as requests passarem e o backend validar.
 *
 * Usa ETag para evitar re-download quando o manifesto não mudou (304).
 * Só faz o fetch se o cache estiver desatualizado (> 5 min).
 */
export async function fetchManifest(force = false): Promise<void> {
  if (!force && !isManifestStale()) return;
  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (state.etag) headers['If-None-Match'] = state.etag;

    const response = await fetch(`${API_URL}/_manifest/permissions`, { method: 'GET', headers });

    if (response.status === 304) {
      // Manifesto não mudou — só atualiza o timestamp
      state.fetchedAt = Date.now();
      const stored = loadFromStorage();
      if (stored) saveToStorage(stored.entries, state.fetchedAt, state.etag ?? undefined);
      return;
    }
    if (!response.ok) return;

    const newEtag = response.headers.get('ETag') ?? undefined;
    const body = (await response.json()) as ApiResponse<{ routes: ManifestEntry[] }>;
    const routes = body?.data?.routes;
    if (!Array.isArray(routes)) return;

    state.entries = compile(routes);
    state.loaded = true;
    state.fetchedAt = Date.now();
    state.etag = newEtag ?? null;
    saveToStorage(routes, state.fetchedAt, newEtag);
  } catch {
    // Sem manifesto fresco: mantemos o que já estava em memória/localStorage
  }
}

/**
 * Retorna as permissões exigidas para um dado método+path conforme o manifesto.
 * Retorna `null` se o endpoint não está no manifesto (rota pública ou desconhecida).
 * Usado para montar mensagens de acesso negado no FORBIDDEN_LOCAL path.
 */
export function getRequiredPermissions(
  method: string,
  path: string,
): { permissions: string[]; mode: 'all' | 'any' } | null {
  if (!state.loaded || state.entries.length === 0) return null;
  const normalizedMethod = method.toUpperCase();
  const pathOnly = path.split('?')[0] ?? path;
  const match = state.entries.find(
    (e) => e.method === normalizedMethod && e.pattern.test(pathOnly),
  );
  if (!match) return null;
  return { permissions: match.permissions, mode: match.mode };
}

/**
 * Verifica se o usuário (dado seu conjunto de permissões e flag de admin) pode
 * acessar `method path`. Retorna `true` também quando o endpoint não consta no
 * manifesto (rota pública, contextual por ownership, ou manifesto ainda não
 * carregado) — nesses casos deixamos a request seguir e o backend decide.
 */
export function checkAccess(
  method: string,
  path: string,
  userPermissions: string[] | undefined,
  isAdmin: boolean | undefined,
): boolean {
  if (isAdmin) return true;
  if (!state.loaded || state.entries.length === 0) return true;

  const normalizedMethod = method.toUpperCase();
  const pathOnly = path.split('?')[0] ?? path;

  const match = state.entries.find(
    (e) => e.method === normalizedMethod && e.pattern.test(pathOnly),
  );
  if (!match) return true;

  const perms = userPermissions ?? [];
  if (match.mode === 'all') {
    return match.permissions.every((p) => perms.includes(p));
  }
  return match.permissions.some((p) => perms.includes(p));
}

/**
 * Limpa o manifesto em memória e localStorage. Usado no logout para evitar
 * que um usuário diferente herde o estado compilado do anterior (o manifesto
 * em si é o mesmo, mas zerar simplifica o ciclo de vida).
 */
export function clearManifest(): void {
  state.entries = [];
  state.loaded = false;
  state.fetchedAt = null;
  state.etag = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
