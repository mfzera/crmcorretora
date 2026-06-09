# Vercel Setup Checklist - Monorepo Nx

## ✅ Configuração Correta para Evitar NOT_FOUND Error

### 1. Estrutura de Arquivos

```
ecotech-sys/                           (monorepo root)
├── apps/
│   └── web/
│       ├── vercel.json                ✓ DEVE EXISTIR
│       ├── next.config.js             ✓ Já existe
│       ├── package.json               ✓ Já existe
│       └── src/
├── package.json                       ✓ Root package.json
├── pnpm-workspace.yaml                ✓ Para workspace
└── nx.json                            ✓ Configuração Nx
```

### 2. Arquivo vercel.json (apps/web/vercel.json)

**Status:** ✅ CRIADO

```json
{
  "buildCommand": "cd ../.. && pnpm nx build web",
  "devCommand": "cd ../.. && pnpm nx dev web",
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

**Por que precisa do `cd ../..`?**
- Vercel define o working directory como `apps/web` (Root Directory configurado)
- Mas Nx precisa rodar da raiz do monorepo para acessar workspace packages
- `cd ../..` volta 2 níveis: `apps/web` → `apps` → `ecotech-sys`

### 3. Configuração no Vercel Dashboard

Acesse: https://vercel.com/[seu-time]/[seu-projeto]/settings/general

```yaml
Framework Preset: Next.js
Root Directory: apps/web        # ← IMPORTANTE: Define como apps/web
Node.js Version: 20.x
```

**NOTA:** Com `vercel.json` presente, os comandos Build/Install são opcionais no dashboard.

### 4. Variáveis de Ambiente no Vercel

Acesse: https://vercel.com/[seu-time]/[seu-projeto]/settings/environment-variables

```bash
# Produção (Production)
NEXT_PUBLIC_API_URL=https://api.seu-dominio.com
NEXT_PUBLIC_WS_URL=wss://api.seu-dominio.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
NEXT_PUBLIC_APP_URL=https://seu-dominio.com

# Preview (para branches)
NEXT_PUBLIC_API_URL=https://api-staging.seu-dominio.com
# ... etc

# Development (local)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
# ... etc
```

### 5. Deploy via Git (Recomendado)

```bash
# 1. Commit o vercel.json
git add apps/web/vercel.json
git commit -m "fix: add vercel.json for monorepo Nx configuration"

# 2. Push para branch principal
git push origin main

# 3. Vercel detecta automaticamente e faz deploy
# Aguarde em: https://vercel.com/[seu-time]/[seu-projeto]/deployments
```

### 6. Deploy via Vercel CLI (Alternativo)

```bash
# No diretório apps/web:
cd apps/web

# Login (primeira vez)
vercel login

# Deploy para preview
vercel

# Deploy para produção
vercel --prod

# Ver logs
vercel logs
```

### 7. Verificação do Build

**Build logs devem mostrar:**

```
✓ Resolved installation command: cd ../.. && pnpm install --frozen-lockfile
✓ Installing dependencies...
✓ Resolved build command: cd ../.. && pnpm nx build web
✓ Building...
✓ Creating an optimized production build...
✓ Compiled successfully
✓ Build completed
```

**❌ Erros comuns a evitar:**

```
✗ Cannot find module '@ecotech/...'  → build não rodou da raiz
✗ Module not found in 'libs/...'      → workspace packages inacessíveis
✗ ENOENT: no such file or directory   → outputDirectory incorreto
```

### 8. Teste do Deployment

```bash
# 1. Obter URL do deployment
# Exemplo: https://ecotech-web-abc123.vercel.app

# 2. Testar endpoints:
curl https://ecotech-web-abc123.vercel.app
# Deve retornar HTML da página principal

# 3. Verificar carregamento no browser
# - Abrir no navegador
# - Verificar console (F12) - não deve ter erros de módulos
# - Verificar Network - recursos devem carregar
```

### 9. Monitoramento

**Vercel Dashboard:**
- **Deployments:** https://vercel.com/[seu-time]/[seu-projeto]/deployments
- **Build Logs:** Clique no deployment → "Building" → Ver logs completos
- **Runtime Logs:** Deployment → "Functions" → Ver logs de execução
- **Analytics:** Deployment → "Analytics"

**CLI:**
```bash
# Status do projeto
vercel ls

# Logs em tempo real
vercel logs --follow

# Inspecionar deployment específico
vercel inspect [deployment-url]
```

### 10. Troubleshooting Quick Guide

#### Problema: NOT_FOUND ao acessar URL

**Checklist:**
- [ ] `apps/web/vercel.json` existe?
- [ ] Root Directory = `apps/web` no dashboard?
- [ ] Build completou sem erros?
- [ ] Deployment está com status "Ready"?

**Fix:**
```bash
# 1. Verificar arquivo
ls -la apps/web/vercel.json

# 2. Se não existir, foi criado neste setup
# Commit e push novamente

# 3. Forçar redeploy
vercel --force --prod
```

#### Problema: Build falha com "Cannot find module"

**Causa:** Comandos não estão rodando da raiz do monorepo

**Fix:**
```json
// apps/web/vercel.json - Verificar "cd ../.." está presente
{
  "buildCommand": "cd ../.. && pnpm nx build web",  ← Deve ter "cd ../.."
  "installCommand": "cd ../.. && pnpm install ..."  ← Deve ter "cd ../.."
}
```

#### Problema: Deployment criado mas página em branco

**Causa:** Output directory incorreto

**Fix:**
```json
// apps/web/vercel.json
{
  "outputDirectory": ".next"  ← Relativo a apps/web (correto)
  // NÃO usar: "dist/apps/web/.next" (isso é para builds locais)
}
```

### 11. Domínio Customizado (Após Deploy Funcionar)

```bash
# Via Dashboard:
# Settings > Domains > Add Domain
# Adicionar: seu-dominio.com

# Configurar DNS (no seu provedor):
# Tipo A:
# Host: @
# Value: 76.76.21.21

# Tipo CNAME:
# Host: www
# Value: cname.vercel-dns.com

# Aguardar propagação (até 48h, geralmente < 1h)
```

### 12. CI/CD com GitHub Actions (Opcional)

Se quiser automatizar ainda mais, já temos workflow configurado em `.github/workflows/deploy.yml`.

**Secrets necessários no GitHub:**
- `VERCEL_TOKEN` (obter em: https://vercel.com/account/tokens)
- `VERCEL_ORG_ID` (obter em: Settings → General)
- `VERCEL_PROJECT_ID` (obter em: Settings → General)

## 🎯 Resumo

**Configuração mínima necessária:**

1. ✅ `apps/web/vercel.json` criado (FEITO neste setup)
2. ✅ Root Directory = `apps/web` no Vercel Dashboard
3. ✅ Variáveis de ambiente configuradas
4. ✅ Git push → Vercel auto-deploy

**Comando de emergência (se algo der errado):**

```bash
# Redesploiar do zero
cd apps/web
vercel --force --prod --debug

# Ver logs em tempo real
vercel logs --follow
```

## 📚 Referências

- **Vercel Monorepo Guide:** https://vercel.com/docs/monorepos
- **Nx + Vercel:** https://nx.dev/recipes/deploying/deploy-nextjs-to-vercel
- **Vercel CLI Docs:** https://vercel.com/docs/cli

---

**Status:** ✅ Configuração completa
**Última atualização:** 2026-02-06
**Arquivo criado:** VERCEL_SETUP_CHECKLIST.md
