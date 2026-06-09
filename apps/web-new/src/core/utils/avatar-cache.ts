const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const cache = new Map<string, { url: string; resolvedAt: number }>();

/**
 * Returns a stable avatar URL for a user. If a cached URL exists and is fresh
 * (< 30 min), it is returned instead of the new signed URL. This prevents
 * image flicker caused by signed URLs changing on every API response.
 */
export function getStableAvatarUrl(
  usuarioId: string,
  newUrl: string | undefined | null,
): string | undefined {
  if (!newUrl) return undefined;

  const cached = cache.get(usuarioId);
  if (cached && Date.now() - cached.resolvedAt < CACHE_TTL_MS) {
    return cached.url;
  }

  cache.set(usuarioId, { url: newUrl, resolvedAt: Date.now() });
  return newUrl;
}

/** Stabilize avatar URLs in a user object (mutates nothing, returns new ref). */
export function stabilizeUsuarioAvatar<
  T extends { id?: string; avatarUrl?: string | null },
>(usuario: T): T {
  if (!usuario?.id || !usuario.avatarUrl) return usuario;
  return {
    ...usuario,
    avatarUrl: getStableAvatarUrl(usuario.id, usuario.avatarUrl),
  };
}
