import '@ecotech/shared/types';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError, OwnershipError, NotFoundError, UnprocessableEntityError, AppError } from '@ecotech/shared/utils';
import {
  db,
  cotacoes,
  propostasComerciais,
  documentosVenda,
  equipes,
  usuarios,
  subscriptions,
} from '@ecotech/shared/database';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { Redis } from 'ioredis';
import { env } from '@ecotech/shared/utils/env';
import type { ModuloSlug } from '@ecotech/shared/utils';
import { PERMISSIONS } from '@ecotech/shared/types';

// ── Dev-mode permission validation ────────────────────────────────────────────
// Catches typos and unknown permission strings at server startup, not at runtime.
const KNOWN_PERMISSIONS = new Set<string>(Object.values(PERMISSIONS));

function assertKnownPermissions(permissions: string[]): void {
  if (env.NODE_ENV === 'production') return;
  for (const perm of permissions) {
    if (!KNOWN_PERMISSIONS.has(perm)) {
      throw new Error(
        `[authorization] Unknown permission: "${perm}". Add it to the PERMISSIONS constant in libs/shared/types/src/permissions.ts`,
      );
    }
  }
}

// ── Redis singleton para cache de módulos ────────────────────────────────────

let _redis: Redis | null = null;

function getModuleRedis(): Redis | null {
  if (_redis) return _redis;
  try {
    const tls = env.REDIS_URL.includes('rediss://') ? {} : undefined;
    _redis = new Redis(env.REDIS_URL, {
      enableOfflineQueue: false,
      lazyConnect: true,
      tls,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    });
    _redis.on('error', () => {});
    return _redis;
  } catch {
    return null;
  }
}

const MODULE_CACHE_TTL = 120; // segundos

async function getModulosAtivos(corretoraId: string): Promise<string[]> {
  const cacheKey = `modules:${corretoraId}`;
  try {
    const redis = getModuleRedis();
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }
  } catch {}

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.corretoraId, corretoraId),
    columns: { modulosAtivos: true },
  });

  const modulos = sub?.modulosAtivos ?? ['crm'];

  try {
    const redis = getModuleRedis();
    if (redis) await redis.set(cacheKey, JSON.stringify(modulos), 'EX', MODULE_CACHE_TTL);
  } catch {}

  return modulos;
}

/**
 * Invalida o cache de módulos de uma corretora.
 * Chamar quando modulosAtivos for alterado (upgrade, admin override).
 */
export async function invalidateModulesCache(corretoraId: string): Promise<void> {
  try {
    const redis = getModuleRedis();
    if (!redis) return;
    await redis.del(`modules:${corretoraId}`);
  } catch {}
}

/**
 * Guard de módulo: verifica se a corretora tem o módulo habilitado.
 * Admin bypass — admins acessam tudo independente de módulos.
 */
export function requireModule(modulo: ModuloSlug) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (request.user.isAdmin) return;

    const modulos = await getModulosAtivos(request.corretoraId);
    if (!modulos.includes(modulo)) {
      throw new ForbiddenError(`Módulo '${modulo}' não habilitado neste plano`, {
        modulo,
        code: 'MODULE_NOT_ENABLED',
      });
    }
  };
}

/**
 * Metadata anexada a handlers de autorização para permitir introspecção das
 * rotas (usado pelo endpoint /_manifest/permissions, que o frontend consulta
 * antes de disparar requests).
 */
export type PermissionMeta = {
  permissions: string[];
  mode: 'all' | 'any';
};

export type AuthorizeHandler = ((
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<void>) & { __permissionMeta: PermissionMeta };

/**
 * Authorization middleware factory
 * Creates a preHandler that checks if the user has the required permissions
 */
export function authorize(requiredPermissions: string[]): AuthorizeHandler {
  assertKnownPermissions(requiredPermissions);
  const handler = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    // Admin has all permissions
    if (user.isAdmin) {
      return;
    }

    if (!Array.isArray(user.permissoes)) {
      throw new ForbiddenError(
        'Erro ao verificar permissões do usuário. Por favor, faça login novamente.',
      );
    }

    const hasAllPermissions = requiredPermissions.every((perm) =>
      user.permissoes.includes(perm),
    );

    if (!hasAllPermissions) {
      request.log.warn({
        event: 'permission_denied',
        usuarioId: user.sub,
        cargoId: user.cargoId,
        required: requiredPermissions,
        mode: 'all',
        path: request.url,
        method: request.method,
      });
      throw new ForbiddenError('Permissões insuficientes', {
        permissoesNecessarias: requiredPermissions,
        permissoesUsuario: user.permissoes,
      });
    }
  };
  (handler as AuthorizeHandler).__permissionMeta = {
    permissions: requiredPermissions,
    mode: 'all',
  };
  return handler as AuthorizeHandler;
}

/**
 * Authorization middleware that requires ANY of the permissions
 */
export function authorizeAny(requiredPermissions: string[]): AuthorizeHandler {
  assertKnownPermissions(requiredPermissions);
  const handler = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    // Admin has all permissions
    if (user.isAdmin) {
      return;
    }

    if (!Array.isArray(user.permissoes)) {
      throw new ForbiddenError(
        'Erro ao verificar permissões do usuário. Por favor, faça login novamente.',
      );
    }

    const hasAnyPermission = requiredPermissions.some((perm) =>
      user.permissoes.includes(perm),
    );

    if (!hasAnyPermission) {
      request.log.warn({
        event: 'permission_denied',
        usuarioId: user.sub,
        cargoId: user.cargoId,
        required: requiredPermissions,
        mode: 'any',
        path: request.url,
        method: request.method,
      });
      throw new ForbiddenError('Permissões insuficientes', {
        permissoesNecessarias: requiredPermissions,
        permissoesUsuario: user.permissoes,
      });
    }
  };
  (handler as AuthorizeHandler).__permissionMeta = {
    permissions: requiredPermissions,
    mode: 'any',
  };
  return handler as AuthorizeHandler;
}

/**
 * Extrai metadata de autorização de um preHandler (ou array deles), se houver.
 * Usado pela introspecção de rotas.
 */
export function getPermissionMeta(
  preHandler: unknown,
): PermissionMeta | undefined {
  if (!preHandler) return undefined;
  const candidates = Array.isArray(preHandler) ? preHandler : [preHandler];
  for (const fn of candidates) {
    const meta = (fn as Partial<AuthorizeHandler>)?.__permissionMeta;
    if (meta) return meta;
  }
  return undefined;
}

/**
 * Check if user is a manager (gestor)
 */
export function requireGestor() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    if (!user.isAdmin && !user.isGestor) {
      throw new ForbiddenError('Acesso restrito a gestores');
    }
  };
}

/**
 * Check if user is an admin
 */
export function requireAdmin() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    if (!user.isAdmin) {
      throw new ForbiddenError('Acesso restrito a administradores');
    }
  };
}

/**
 * Check if user owns the resource (cotacao, proposta, documento)
 * Admin and Gestor bypass this check
 */
export function requireOwnership(
  resourceType: 'cotacao' | 'proposta' | 'documento',
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    const { id } = request.params as { id: string };

    // Admin e Gestor têm acesso total
    if (user.isAdmin || user.isGestor) {
      return;
    }

    // Usuários de Cadastro podem editar qualquer cotação ou documento de venda
    if (
      (resourceType === 'documento' || resourceType === 'cotacao') &&
      Array.isArray(user.permissoes) &&
      user.permissoes.includes('cadastro:editar_apolice')
    ) {
      return;
    }

    // Buscar o recurso no banco
    let resource: any;

    switch (resourceType) {
      case 'cotacao':
        [resource] = await db
          .select({
            id: cotacoes.id,
            usuarioId: cotacoes.atuanteId,
            vendedorId: cotacoes.vendedorId,
          })
          .from(cotacoes)
          .where(
            and(
              eq(cotacoes.id, id),
              eq(cotacoes.corretoraId, user.corretoraId),
            ),
          )
          .limit(1);
        // atuanteId é o "operador" (quem trabalha); vendedorId é quem recebe
        // comissão. Ambos têm acesso legítimo à cotação.
        if (resource) {
          resource.usuarioId = resource.usuarioId ?? resource.vendedorId;
        }
        break;

      case 'proposta':
        [resource] = await db
          .select({
            id: propostasComerciais.id,
            usuarioId: propostasComerciais.vendedorId,
          })
          .from(propostasComerciais)
          .where(
            and(
              eq(propostasComerciais.id, id),
              eq(propostasComerciais.corretoraId, user.corretoraId),
            ),
          )
          .limit(1);
        break;

      case 'documento':
        [resource] = await db
          .select({
            id: documentosVenda.id,
            usuarioId: documentosVenda.atuanteId,
            vendedorId: documentosVenda.vendedorId,
          })
          .from(documentosVenda)
          .where(
            and(
              eq(documentosVenda.id, id),
              eq(documentosVenda.corretoraId, user.corretoraId),
            ),
          )
          .limit(1);
        // Mesma semântica da cotação: atuante (operação) e vendedor
        // principal (comissão) são ambos owners legítimos.
        if (resource) {
          resource.usuarioId = resource.usuarioId ?? resource.vendedorId;
        }
        break;
    }

    if (!resource) {
      throw new NotFoundError('Recurso não encontrado');
    }

    // Cotação e documento têm split vendedor/atuante — ambos são owners.
    const temSplit = resourceType === 'cotacao' || resourceType === 'documento';
    const isVendedorComSplit =
      temSplit && resource.vendedorId === user.sub;

    if (resource.usuarioId !== user.sub && !isVendedorComSplit) {
      // Verificar se são da mesma equipe — buscar equipeId do usuário atual e dos donos em paralelo
      const candidateOwnerIds: string[] = [];
      if (resource.usuarioId) candidateOwnerIds.push(resource.usuarioId);
      if (temSplit && resource.vendedorId) {
        candidateOwnerIds.push(resource.vendedorId);
      }

      const [meUsuario, donoUsuariosRows] = await Promise.all([
        db.query.usuarios.findFirst({
          where: eq(usuarios.id, user.sub),
          columns: { equipeId: true },
        }),
        candidateOwnerIds.length > 0
          ? db
              .select({ id: usuarios.id, equipeId: usuarios.equipeId })
              .from(usuarios)
              .where(inArray(usuarios.id, candidateOwnerIds))
          : Promise.resolve([]),
      ]);

      const mesmaEquipe =
        !!meUsuario?.equipeId &&
        donoUsuariosRows.some(
          (dono) => dono?.equipeId && dono.equipeId === meUsuario.equipeId,
        );

      if (!mesmaEquipe) {
        throw new OwnershipError(
          'Você não tem permissão para acessar este recurso',
          { recurso: resourceType, id },
        );
      }
    }
  };
}

/**
 * Validate that resource is in one of the allowed statuses
 */
export function requireStatus(
  resourceType: 'cotacao' | 'proposta' | 'documento',
  allowedStatuses: string[],
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = request.user;

    // Buscar o recurso no banco
    let resource: any;

    switch (resourceType) {
      case 'cotacao':
        [resource] = await db
          .select({
            id: cotacoes.id,
            status: cotacoes.status,
          })
          .from(cotacoes)
          .where(
            and(
              eq(cotacoes.id, id),
              eq(cotacoes.corretoraId, user.corretoraId),
            ),
          )
          .limit(1);
        break;

      case 'proposta':
        [resource] = await db
          .select({
            id: propostasComerciais.id,
            status: propostasComerciais.status,
          })
          .from(propostasComerciais)
          .where(
            and(
              eq(propostasComerciais.id, id),
              eq(propostasComerciais.corretoraId, user.corretoraId),
            ),
          )
          .limit(1);
        break;

      case 'documento':
        [resource] = await db
          .select({
            id: documentosVenda.id,
            status: documentosVenda.status,
          })
          .from(documentosVenda)
          .where(
            and(
              eq(documentosVenda.id, id),
              eq(documentosVenda.corretoraId, user.corretoraId),
            ),
          )
          .limit(1);
        break;
    }

    if (!resource) {
      throw new NotFoundError('Recurso não encontrado');
    }

    // Validar status
    if (!allowedStatuses.includes(resource.status)) {
      throw new UnprocessableEntityError(
        `Ação não permitida para status ${resource.status}`,
        {
          statusAtual: resource.status,
          statusPermitidos: allowedStatuses,
        },
      );
    }
  };
}

/**
 * Check if user has access to a specific equipe
 * Admin bypass; 'manage' requires being the gestor of the equipe
 */
export function requireEquipeAccess(accessLevel: 'manage' | 'view' = 'view') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    const { id } = request.params as { id: string };

    if (user.isAdmin) return;

    const [equipe] = await db
      .select({ gestorId: equipes.gestorId })
      .from(equipes)
      .where(and(eq(equipes.id, id), eq(equipes.corretoraId, user.corretoraId), isNull(equipes.deletedAt)))
      .limit(1);

    if (!equipe) throw new NotFoundError('Equipe');

    if (accessLevel === 'manage' && equipe.gestorId !== user.sub) {
      throw new ForbiddenError('Acesso restrito ao gestor da equipe');
    }
  };
}
