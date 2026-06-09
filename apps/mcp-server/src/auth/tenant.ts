export interface TenantContext {
  corretoraId: string;
}

export function resolveTenant(
  authHeader: string | undefined,
  corretoraIdHeader: string | undefined,
): TenantContext | null {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const secret = authHeader.slice(7);
  const expectedSecret = process.env.MCP_INTERNAL_SECRET;

  if (!expectedSecret || secret !== expectedSecret) return null;
  if (!corretoraIdHeader) return null;

  return { corretoraId: corretoraIdHeader };
}
