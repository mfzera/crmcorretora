# 06 - Autenticação Administrativa

## 🔐 Visão Geral

Sistema de autenticação **separado** para super-admins que acessam o painel administrativo.

**Diferenças do auth normal:**
- JWT diferente (secret diferente)
- Sem corretoraId (acesso multi-tenant)
- Permissões granulares de admin
- Login em app separado

## 📁 Estrutura de Arquivos

```
apps/api/src/routes/admin/
├── auth.ts          # Login, refresh, logout
├── index.ts         # Registro de rotas admin
└── middleware.ts    # Middleware de autenticação
```

## 🔑 JWT Admin vs JWT Normal

### JWT Normal (Tenant)
```typescript
{
  sub: userId,
  corretoraId: corretoraId,
  permissoes: ['vendas:criar_cotacao', ...],
  tipo: 'tenant'
}
```

### JWT Admin
```typescript
{
  sub: adminId,
  email: admin@email.com,
  permissoes: ['view_usage', 'manage_backups', ...],
  tipo: 'admin'
}
```

## 🛣️ Rotas de Autenticação

### 1. POST /api/admin/auth/login

Login de super-admin.

**Body:**
```typescript
{
  email: string,
  senha: string
}
```

**Response 200:**
```typescript
{
  success: true,
  data: {
    admin: {
      id: string,
      nome: string,
      email: string,
      permissoes: string[]
    },
    token: string, // JWT admin
    expiresIn: '7d'
  }
}
```

**Implementação:**

```typescript
// apps/api/src/routes/admin/auth.ts

import { FastifyPluginAsync } from 'fastify';
import { db } from '@ecotech/shared/database';
import { admins, adminAuditLogs } from '@ecotech/shared/database';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '@ecotech/shared/utils';

const adminAuthRoutes: FastifyPluginAsync = async (fastify) => {
  // Login
  fastify.post('/login', async (request, reply) => {
    const { email, senha } = request.body as {
      email: string;
      senha: string;
    };

    // Buscar admin
    const admin = await db.query.admins.findFirst({
      where: eq(admins.email, email),
    });

    if (!admin) {
      return reply.status(401).send({
        success: false,
        error: 'Email ou senha inválidos',
      });
    }

    // Verificar se está ativo
    if (!admin.ativo) {
      return reply.status(403).send({
        success: false,
        error: 'Usuário desativado',
      });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, admin.senha);

    if (!senhaValida) {
      return reply.status(401).send({
        success: false,
        error: 'Email ou senha inválidos',
      });
    }

    // Gerar JWT admin (secret diferente!)
    const token = jwt.sign(
      {
        sub: admin.id,
        email: admin.email,
        permissoes: admin.permissoes as string[],
        tipo: 'admin',
      },
      env.ADMIN_JWT_SECRET,
      {
        expiresIn: env.ADMIN_JWT_EXPIRES_IN || '7d',
      }
    );

    // Atualizar último login
    await db
      .update(admins)
      .set({ ultimoLogin: new Date() })
      .where(eq(admins.id, admin.id));

    // Log de auditoria
    await db.insert(adminAuditLogs).values({
      adminId: admin.id,
      acao: 'login',
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return {
      success: true,
      data: {
        admin: {
          id: admin.id,
          nome: admin.nome,
          email: admin.email,
          permissoes: admin.permissoes as string[],
        },
        token,
        expiresIn: '7d',
      },
    };
  });

  // Logout (opcional, JWT stateless)
  fastify.post('/logout', async (request, reply) => {
    // Em JWT stateless, logout é feito no client (remover token)
    // Mas podemos registrar no audit log

    const token = request.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return reply.status(401).send({
        success: false,
        error: 'Token não fornecido',
      });
    }

    try {
      const decoded = jwt.verify(token, env.ADMIN_JWT_SECRET) as any;

      // Log de auditoria
      await db.insert(adminAuditLogs).values({
        adminId: decoded.sub,
        acao: 'logout',
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        success: true,
        message: 'Logout realizado com sucesso',
      };
    } catch (error) {
      return reply.status(401).send({
        success: false,
        error: 'Token inválido',
      });
    }
  });

  // Me (dados do admin logado)
  fastify.get('/me', async (request, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: 'Token não fornecido',
      });
    }

    try {
      const decoded = jwt.verify(token, env.ADMIN_JWT_SECRET) as any;

      const admin = await db.query.admins.findFirst({
        where: eq(admins.id, decoded.sub),
        columns: {
          senha: false, // Não retornar senha
        },
      });

      if (!admin || !admin.ativo) {
        return reply.status(401).send({
          success: false,
          error: 'Admin não encontrado ou inativo',
        });
      }

      return {
        success: true,
        data: admin,
      };
    } catch (error) {
      return reply.status(401).send({
        success: false,
        error: 'Token inválido',
      });
    }
  });
};

export default adminAuthRoutes;
```

---

## 🛡️ Middleware de Autenticação

```typescript
// apps/api/src/routes/admin/middleware.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { db } from '@ecotech/shared/database';
import { admins } from '@ecotech/shared/database';
import { eq } from 'drizzle-orm';
import { env } from '@ecotech/shared/utils';

export interface AdminUser {
  sub: string;
  email: string;
  permissoes: string[];
  tipo: 'admin';
}

declare module 'fastify' {
  interface FastifyRequest {
    admin?: AdminUser;
  }
}

/**
 * Middleware de autenticação para rotas admin
 */
export async function authenticateAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const token = request.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return reply.status(401).send({
      success: false,
      error: 'Token não fornecido',
    });
  }

  try {
    // Verificar JWT (secret diferente do tenant!)
    const decoded = jwt.verify(token, env.ADMIN_JWT_SECRET) as any;

    // Validar tipo
    if (decoded.tipo !== 'admin') {
      return reply.status(401).send({
        success: false,
        error: 'Token inválido para acesso admin',
      });
    }

    // Buscar admin no banco
    const admin = await db.query.admins.findFirst({
      where: eq(admins.id, decoded.sub),
    });

    if (!admin || !admin.ativo) {
      return reply.status(401).send({
        success: false,
        error: 'Admin não encontrado ou inativo',
      });
    }

    // Anexar admin ao request
    request.admin = {
      sub: admin.id,
      email: admin.email,
      permissoes: admin.permissoes as string[],
      tipo: 'admin',
    };
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: 'Token inválido ou expirado',
    });
  }
}

/**
 * Middleware de autorização (verificar permissões)
 */
export function requireAdminPermission(permission: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.admin) {
      return reply.status(401).send({
        success: false,
        error: 'Não autenticado',
      });
    }

    const hasPermission = request.admin.permissoes.includes(permission);

    if (!hasPermission) {
      return reply.status(403).send({
        success: false,
        error: `Permissão necessária: ${permission}`,
      });
    }
  };
}

/**
 * Middleware de autorização (qualquer permissão)
 */
export function requireAnyAdminPermission(permissions: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.admin) {
      return reply.status(401).send({
        success: false,
        error: 'Não autenticado',
      });
    }

    const hasAnyPermission = permissions.some((p) =>
      request.admin!.permissoes.includes(p)
    );

    if (!hasAnyPermission) {
      return reply.status(403).send({
        success: false,
        error: `Permissões necessárias: ${permissions.join(' ou ')}`,
      });
    }
  };
}
```

---

## 🔐 Permissões Admin

```typescript
// libs/shared/types/src/admin-permissions.ts

export const ADMIN_PERMISSIONS = {
  // Visualização
  VIEW_USAGE: 'view_usage',
  VIEW_ALL_TENANTS: 'view_all_tenants',
  VIEW_AUDIT_LOGS: 'view_audit_logs',

  // Gestão de limites
  MANAGE_LIMITS: 'manage_limits',

  // Backups
  MANAGE_BACKUPS: 'manage_backups',

  // Gestão de admins
  MANAGE_ADMINS: 'manage_admins',

  // Limpeza
  CLEANUP_FILES: 'cleanup_files',
} as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS];

export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, string> = {
  view_usage: 'Visualizar uso de storage',
  view_all_tenants: 'Visualizar todos os tenants',
  view_audit_logs: 'Visualizar logs de auditoria',
  manage_limits: 'Gerenciar limites de storage',
  manage_backups: 'Gerenciar backups',
  manage_admins: 'Gerenciar administradores',
  cleanup_files: 'Limpar arquivos órfãos',
};
```

---

## 📝 Registrar Rotas Admin

```typescript
// apps/api/src/routes/admin/index.ts

import { FastifyPluginAsync } from 'fastify';
import adminAuthRoutes from './auth.js';
import tenantsRoutes from './tenants.js';
import backupsRoutes from './backups.js';
import auditRoutes from './audit.js';
import { authenticateAdmin } from './middleware.js';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // Auth (público, sem middleware)
  await fastify.register(adminAuthRoutes, { prefix: '/auth' });

  // Rotas protegidas
  fastify.addHook('preHandler', authenticateAdmin);

  await fastify.register(tenantsRoutes, { prefix: '/tenants' });
  await fastify.register(backupsRoutes, { prefix: '/backups' });
  await fastify.register(auditRoutes, { prefix: '/audit' });
};

export default adminRoutes;
```

```typescript
// apps/api/src/app.ts

import adminRoutes from './routes/admin/index.js';

// ...

await app.register(adminRoutes, { prefix: '/api/admin' });
```

---

## 🧪 Testes

### Criar Primeiro Admin

```bash
# Script: scripts/create-admin.ts
pnpm tsx scripts/create-admin.ts
```

### Testar Login

```bash
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ecotech.com",
    "senha": "senha-segura"
  }'

# Response:
{
  "success": true,
  "data": {
    "admin": {
      "id": "uuid",
      "nome": "Admin Principal",
      "email": "admin@ecotech.com",
      "permissoes": ["view_usage", "manage_backups", ...]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d"
  }
}
```

### Testar Rota Protegida

```bash
curl http://localhost:3000/api/admin/tenants \
  -H "Authorization: Bearer {admin-token}"
```

---

## 🔒 Segurança

### Senhas

```typescript
// Hash ao criar admin
import bcrypt from 'bcryptjs';

const senha = 'senha-do-admin';
const senhaHash = await bcrypt.hash(senha, 10);

await db.insert(admins).values({
  email: 'admin@email.com',
  senha: senhaHash, // Sempre armazenar hash
  // ...
});
```

### Secrets

```env
# .env
ADMIN_SECRET_KEY=chave-super-secreta-min-32-caracteres
ADMIN_JWT_SECRET=outro-secret-para-jwt-min-32-caracteres
```

**Gerar secrets seguros:**

```bash
# Linux/Mac
openssl rand -base64 32
```

### Rate Limiting

```typescript
// Limitar tentativas de login
await fastify.register(rateLimit, {
  max: 5, // 5 tentativas
  timeWindow: '15 minutes',
  skipOnError: false,
  keyGenerator: (request) => {
    return request.body.email || request.ip;
  },
});
```

---

## 📝 Checklist

- [ ] Criar tabela `admins`
- [ ] Criar tabela `admin_audit_logs`
- [ ] Implementar rota de login
- [ ] Implementar middleware de autenticação
- [ ] Configurar JWT com secret separado
- [ ] Criar script para primeiro admin
- [ ] Testar login e acesso a rotas protegidas
- [ ] Implementar logs de auditoria
- [ ] Configurar rate limiting

---

## 📝 Próximo Documento

Continue com **[07-METRICS-SERVICE.md](./07-METRICS-SERVICE.md)** para o serviço de métricas.
