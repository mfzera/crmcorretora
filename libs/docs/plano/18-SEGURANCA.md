# 18 - Considerações de Segurança

**Navegação**: [← 17. Custos](./17-CUSTOS.md) | [Índice](./00-INDICE.md) | [20. Ordem Implementação →](./20-ORDEM-IMPLEMENTACAO.md)

---

## 🔒 Visão Geral

Estratégias e implementações de segurança para proteger o sistema de gerenciamento de anexos.

## 🎯 Camadas de Segurança

```
┌─────────────────────────────────────────────────────┐
│  1. Autenticação (JWT, Session)                     │
├─────────────────────────────────────────────────────┤
│  2. Autorização (Permissões, Tenant Isolation)      │
├─────────────────────────────────────────────────────┤
│  3. Validações de Input (MIME, Tamanho, Path)       │
├─────────────────────────────────────────────────────┤
│  4. Rate Limiting (DDoS Protection)                 │
├─────────────────────────────────────────────────────┤
│  5. URLs Assinadas (Acesso Temporário)              │
├─────────────────────────────────────────────────────┤
│  6. Criptografia (TLS, Secrets)                     │
├─────────────────────────────────────────────────────┤
│  7. Auditoria (Logs de Acesso)                      │
├─────────────────────────────────────────────────────┤
│  8. CORS (Cross-Origin Protection)                  │
└─────────────────────────────────────────────────────┘
```

## 🔐 1. Autenticação

### JWT Tokens

```typescript
// libs/shared/utils/src/jwt.ts

import jwt from 'jsonwebtoken';
import { env } from './env';

interface JWTPayload {
  sub: string;           // userId
  corretoraId: string;
  permissoes: string[];
  tipo: 'tenant' | 'admin';
}

export class JWTService {
  /**
   * Gerar token JWT
   */
  static sign(payload: JWTPayload, expiresIn: string = '7d'): string {
    const secret = payload.tipo === 'admin' 
      ? env.ADMIN_JWT_SECRET 
      : env.JWT_SECRET;

    return jwt.sign(payload, secret, {
      expiresIn,
      issuer: 'ecotech-api',
      audience: 'ecotech-app',
    });
  }

  /**
   * Verificar token JWT
   */
  static verify(token: string, tipo: 'tenant' | 'admin'): JWTPayload {
    const secret = tipo === 'admin' 
      ? env.ADMIN_JWT_SECRET 
      : env.JWT_SECRET;

    try {
      const decoded = jwt.verify(token, secret, {
        issuer: 'ecotech-api',
        audience: 'ecotech-app',
      }) as JWTPayload;

      // Validar tipo
      if (decoded.tipo !== tipo) {
        throw new Error('Token type mismatch');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Refresh token (gerar novo com expiração estendida)
   */
  static refresh(token: string, tipo: 'tenant' | 'admin'): string {
    const payload = this.verify(token, tipo);
    
    // Remover claims padrão
    delete (payload as any).iat;
    delete (payload as any).exp;
    delete (payload as any).iss;
    delete (payload as any).aud;

    return this.sign(payload, '7d');
  }
}
```

### Secrets Management

```env
# .env (NUNCA commitar!)

# JWT Secrets (mínimo 32 caracteres)
JWT_SECRET=seu-secret-super-seguro-min-32-chars-aqui
ADMIN_JWT_SECRET=outro-secret-diferente-para-admin-32-chars

# Database (usar variáveis de ambiente)
DATABASE_URL=postgresql://user:password@host:5432/database

# R2 (rotacionar periodicamente)
R2_ACCESS_KEY_ID=seu-access-key
R2_SECRET_ACCESS_KEY=seu-secret-key

# SMTP (usar App Passwords)
SMTP_PASSWORD=sua-senha-de-app
```

**Boas Práticas:**
1. Usar `.env` local, nunca commitar
2. Usar secrets manager em produção (AWS Secrets Manager, Vault, etc.)
3. Rotacionar secrets periodicamente (a cada 90 dias)
4. Usar diferentes secrets para cada ambiente (dev, staging, prod)

## 🛡️ 2. Autorização

### Tenant Isolation Middleware

```typescript
// apps/api/src/middleware/tenant-isolation.ts

import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Valida que o usuário só acessa recursos do próprio tenant
 */
export async function tenantIsolation(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const corretoraId = request.user?.corretoraId;
  
  if (!corretoraId) {
    return reply.status(403).send({
      success: false,
      error: 'Corretora não identificada',
    });
  }

  // Validar em rotas com :id
  const resourceId = (request.params as any).id;
  
  if (resourceId) {
    // Buscar recurso e validar corretoraId
    const resource = await getResource(resourceId);
    
    if (!resource) {
      return reply.status(404).send({
        success: false,
        error: 'Recurso não encontrado',
      });
    }

    if (resource.corretoraId !== corretoraId) {
      return reply.status(403).send({
        success: false,
        error: 'Acesso negado a este recurso',
      });
    }
  }
}
```

### Permission Decorator

```typescript
// libs/plugins/authorization/src/decorators.ts

import { FastifyRequest, FastifyReply } from 'fastify';

export function authorize(permissions: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userPermissions = request.user?.permissoes || [];

    const hasPermission = permissions.some((p) => 
      userPermissions.includes(p)
    );

    if (!hasPermission) {
      return reply.status(403).send({
        success: false,
        error: 'Permissão insuficiente',
        required: permissions,
      });
    }
  };
}

// Uso:
fastify.get('/api/anexos', {
  preHandler: [authorize(['anexos:visualizar'])],
}, async (request, reply) => {
  // ...
});
```

## ✅ 3. Validações de Input

### MIME Type Whitelist

```typescript
// libs/shared/utils/src/validations.ts

const ALLOWED_MIME_TYPES = [
  // Documentos
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  
  // Imagens
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  
  // Texto
  'text/plain',
  'text/csv',
] as const;

export function validateMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType as any);
}

export function getMimeTypeError(mimeType: string): string {
  return `Tipo de arquivo não permitido: ${mimeType}. ` +
         `Tipos permitidos: PDF, Word, Excel, imagens (JPG, PNG, GIF, WebP)`;
}
```

### File Size Validation

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB padrão

export function validateFileSize(size: number, maxSize: number = MAX_FILE_SIZE): boolean {
  return size <= maxSize;
}

export function getFileSizeError(size: number, maxSize: number): string {
  const sizeMB = (size / (1024 * 1024)).toFixed(2);
  const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
  
  return `Arquivo muito grande: ${sizeMB}MB. Tamanho máximo: ${maxSizeMB}MB`;
}
```

### Filename Sanitization

```typescript
export function sanitizeFilename(filename: string): string {
  // Remover caracteres perigosos
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // Substituir caracteres especiais
    .replace(/\.{2,}/g, '.')            // Remover múltiplos pontos (..)
    .replace(/^\./, '')                 // Remover ponto inicial
    .slice(0, 255);                     // Limitar tamanho
}

// Testes:
sanitizeFilename('../../etc/passwd')         // => '__etc_passwd'
sanitizeFilename('arquivo com espaços.pdf')  // => 'arquivo_com_espaços.pdf'
sanitizeFilename('<script>alert()</script>') // => '_script_alert___script_'
```

### Path Traversal Protection

```typescript
export function validatePath(path: string): boolean {
  // Rejeitar qualquer tentativa de path traversal
  const dangerous = ['..', '~', '//'];
  
  return !dangerous.some((d) => path.includes(d));
}

// Uso:
if (!validatePath(userInput)) {
  throw new Error('Invalid path');
}
```

## 🚦 4. Rate Limiting

### Global Rate Limiting

```typescript
// apps/api/src/plugins/rate-limit.ts

import rateLimit from '@fastify/rate-limit';

export async function registerRateLimit(fastify: FastifyInstance) {
  await fastify.register(rateLimit, {
    global: true,
    max: 100,                    // 100 requests
    timeWindow: '1 minute',      // por minuto
    cache: 10000,                // Cache de IPs
    allowList: ['127.0.0.1'],    // Whitelist
    redis: redisClient,          // Usar Redis para cluster
    keyGenerator: (request) => {
      // Rate limit por IP + userId (se autenticado)
      const ip = request.ip;
      const userId = request.user?.sub;
      return userId ? `${ip}:${userId}` : ip;
    },
    errorResponseBuilder: (request, context) => ({
      success: false,
      error: 'Muitas requisições. Tente novamente em alguns minutos.',
      retryAfter: context.after,
    }),
  });
}
```

### Endpoint-Specific Rate Limiting

```typescript
// Upload mais restritivo
fastify.post('/api/anexos/upload', {
  config: {
    rateLimit: {
      max: 10,                  // 10 uploads
      timeWindow: '1 minute',   // por minuto
    },
  },
}, async (request, reply) => {
  // ...
});

// Login ainda mais restritivo
fastify.post('/api/auth/login', {
  config: {
    rateLimit: {
      max: 5,                   // 5 tentativas
      timeWindow: '15 minutes', // por 15 minutos
      keyGenerator: (request) => {
        // Rate limit por email (prevenir brute force)
        return request.body.email;
      },
    },
  },
}, async (request, reply) => {
  // ...
});
```

## 🔗 5. URLs Assinadas

### Geração Segura

```typescript
// libs/shared/storage/src/signed-urls.ts

import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export class SignedUrlService {
  private s3Client: S3Client;

  /**
   * Gera URL assinada com expiração
   */
  async generateDownloadUrl(
    r2Key: string,
    expiresIn: number = 86400 // 24h padrão
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: r2Key,
    });

    // Máximo de 7 dias (604800 segundos)
    const maxExpiration = 604800;
    const expiration = Math.min(expiresIn, maxExpiration);

    return await getSignedUrl(this.s3Client, command, {
      expiresIn: expiration,
    });
  }

  /**
   * Gera URL assinada para upload direto (menos comum)
   */
  async generateUploadUrl(
    r2Key: string,
    mimeType: string,
    maxSize: number
  ): Promise<{ url: string; fields: Record<string, string> }> {
    // Validar MIME type
    if (!validateMimeType(mimeType)) {
      throw new Error('MIME type não permitido');
    }

    // Gerar presigned POST
    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: r2Key,
      ContentType: mimeType,
    });

    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600, // 1 hora para upload
    });

    return { url, fields: {} };
  }
}
```

### Validação de URLs

```typescript
// Nunca confiar em URLs do client
export function validateSignedUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Verificar domínio
    if (!urlObj.hostname.endsWith('.r2.cloudflarestorage.com')) {
      return false;
    }

    // Verificar assinatura presente
    if (!urlObj.searchParams.has('X-Amz-Signature')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
```

## 🔐 6. Criptografia

### TLS/HTTPS

```typescript
// apps/api/src/app.ts

import fs from 'fs';

const app = fastify({
  https: process.env.NODE_ENV === 'production' ? {
    key: fs.readFileSync('/path/to/private-key.pem'),
    cert: fs.readFileSync('/path/to/certificate.pem'),
  } : undefined,
});
```

**Em Produção:**
- Usar certificado SSL válido (Let's Encrypt, CloudFlare, etc.)
- Forçar HTTPS (redirecionar HTTP → HTTPS)
- Usar HSTS header

```typescript
// Helmet para headers de segurança
import helmet from '@fastify/helmet';

await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});
```

### Encryption at Rest (R2)

```typescript
// R2 criptografa automaticamente, mas pode usar KMS
const s3Client = new S3Client({
  // ...
  // Cloudflare R2 encrypts by default (AES-256)
});

// Para criptografia adicional do lado do cliente:
import crypto from 'crypto';

function encryptFile(buffer: Buffer, key: string): Buffer {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  
  // Retornar IV + encrypted
  return Buffer.concat([iv, encrypted]);
}

function decryptFile(buffer: Buffer, key: string): Buffer {
  const iv = buffer.slice(0, 16);
  const encrypted = buffer.slice(16);
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
```

## 📝 7. Auditoria

### Audit Log Schema

```typescript
// libs/shared/database/src/schema/audit-log.ts

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Quem
  userId: uuid('user_id').references(() => usuarios.id),
  adminId: uuid('admin_id').references(() => admins.id),
  ip: varchar('ip', { length: 45 }).notNull(), // IPv6
  userAgent: varchar('user_agent', { length: 500 }),
  
  // O quê
  acao: varchar('acao', { length: 100 }).notNull(),
  recurso: varchar('recurso', { length: 100 }),
  recursoId: varchar('recurso_id', { length: 100 }),
  
  // Detalhes
  detalhes: jsonb('detalhes'),
  resultado: varchar('resultado', { length: 20 }), // 'sucesso' | 'falha'
  
  // Quando
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
  acaoIdx: index('audit_logs_acao_idx').on(table.acao),
  timestampIdx: index('audit_logs_timestamp_idx').on(table.timestamp),
}));
```

### Audit Service

```typescript
// libs/shared/utils/src/audit-service.ts

export class AuditService {
  /**
   * Registra ação no audit log
   */
  static async log(data: {
    userId?: string;
    adminId?: string;
    ip: string;
    userAgent?: string;
    acao: string;
    recurso?: string;
    recursoId?: string;
    detalhes?: any;
    resultado: 'sucesso' | 'falha';
  }): Promise<void> {
    await db.insert(auditLogs).values(data);
  }

  /**
   * Middleware de auditoria automática
   */
  static middleware(fastify: FastifyInstance) {
    fastify.addHook('onResponse', async (request, reply) => {
      // Ignorar rotas de health check
      if (request.url === '/health') return;

      await this.log({
        userId: request.user?.sub,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        acao: `${request.method} ${request.url}`,
        resultado: reply.statusCode < 400 ? 'sucesso' : 'falha',
        detalhes: {
          statusCode: reply.statusCode,
          method: request.method,
          url: request.url,
        },
      });
    });
  }
}
```

## 🌐 8. CORS

```typescript
// apps/api/src/plugins/cors.ts

import cors from '@fastify/cors';

export async function registerCors(fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Permitir origins específicas
      const allowedOrigins = [
        'https://app.ecotech.com',
        'https://admin.ecotech.com',
        ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3001', 'http://localhost:3002'] : []),
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}
```

## 🔍 9. Prevenção de Ataques Comuns

### SQL Injection

```typescript
// ✅ SEMPRE usar parametrized queries (Drizzle ORM)
const user = await db.query.usuarios.findFirst({
  where: eq(usuarios.email, userInput), // Seguro
});

// ❌ NUNCA concatenar strings
const query = `SELECT * FROM usuarios WHERE email = '${userInput}'`; // INSEGURO!
```

### XSS (Cross-Site Scripting)

```typescript
// Frontend: sanitizar inputs
import DOMPurify from 'dompurify';

function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty);
}

// Backend: validar e escapar
import validator from 'validator';

function validateInput(input: string): boolean {
  return validator.isAlphanumeric(input, 'pt-BR', { ignore: ' -_' });
}
```

### CSRF (Cross-Site Request Forgery)

```typescript
// Usar CSRF tokens
import csrf from '@fastify/csrf-protection';

await fastify.register(csrf, {
  cookieOpts: { signed: true },
});

// Em forms:
<input type="hidden" name="_csrf" value={csrfToken} />
```

### Command Injection

```typescript
// ❌ NUNCA usar exec/spawn com input do usuário
const { exec } = require('child_process');
exec(`convert ${userInput} output.jpg`); // INSEGURO!

// ✅ Usar bibliotecas específicas
import sharp from 'sharp';
await sharp(userInput).toFile('output.jpg'); // Seguro
```

## 📋 Security Checklist

### Autenticação
- [ ] JWT com secrets fortes (>32 chars)
- [ ] Tokens com expiração (max 7 dias)
- [ ] Refresh token implementado
- [ ] Rate limiting em login (5 tentativas/15min)
- [ ] Passwords com bcrypt (10+ rounds)

### Autorização
- [ ] Tenant isolation em todas as rotas
- [ ] Permissões granulares implementadas
- [ ] Admin auth separado do tenant auth
- [ ] Middleware de autorização testado

### Validações
- [ ] MIME type whitelist
- [ ] File size limits
- [ ] Filename sanitization
- [ ] Path traversal protection
- [ ] Input validation em todos os endpoints

### Infraestrutura
- [ ] HTTPS/TLS em produção
- [ ] CORS configurado corretamente
- [ ] Helmet headers de segurança
- [ ] Rate limiting global e por endpoint
- [ ] Secrets em variáveis de ambiente

### Monitoring
- [ ] Audit logs implementados
- [ ] Alertas de ações suspeitas
- [ ] Logs estruturados (não expor secrets)
- [ ] Monitoramento de tentativas de login

### Backups
- [ ] Backups criptografados
- [ ] Acesso restrito a backups
- [ ] Testes de restore periódicos
- [ ] Retenção de backups documentada

## 🚨 Incident Response Plan

### 1. Detecção

```typescript
// Alertas automáticos
if (failedLoginAttempts > 10) {
  await alertService.alertSuspiciousActivity(userId, 'multiple_failed_logins');
}

if (unusualUploadVolume > threshold) {
  await alertService.alertUnusualActivity(corretoraId, 'high_upload_volume');
}
```

### 2. Contenção

```typescript
// Bloquear usuário suspeito
await db.update(usuarios)
  .set({ bloqueado: true })
  .where(eq(usuarios.id, suspiciousUserId));

// Revogar tokens
await revokeAllTokens(suspiciousUserId);
```

### 3. Investigação

```typescript
// Buscar logs de auditoria
const logs = await db.query.auditLogs.findMany({
  where: and(
    eq(auditLogs.userId, suspiciousUserId),
    gte(auditLogs.timestamp, incidentDate)
  ),
  orderBy: [desc(auditLogs.timestamp)],
});
```

### 4. Recuperação

```typescript
// Restaurar de backup
await backupService.restoreBackup(lastGoodBackupId);

// Rotacionar secrets
await rotateJWTSecret();
```

## 📝 Próximo Documento

Continue com **[20-ORDEM-IMPLEMENTACAO.md](./20-ORDEM-IMPLEMENTACAO.md)** para o roadmap de implementação.

---

**Navegação**: [← 17. Custos](./17-CUSTOS.md) | [Índice](./00-INDICE.md) | [20. Ordem Implementação →](./20-ORDEM-IMPLEMENTACAO.md)
