# Quick Start - Sistema de Anexos

## ⚡ Setup Rápido (5 minutos)

### 1. Variáveis de Ambiente (.env)

Já configurado com placeholders:
```env
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=ecotech-anexos
R2_BACKUP_BUCKET_NAME=ecotech-backups
```

### 2. Migration (Já executada ✅)

```bash
# Migration já rodada com sucesso
# Tabela 'anexo' criada no PostgreSQL
```

### 3. Testar Localmente (Sem R2)

**IMPORTANTE:** Para testar sem configurar R2, você receberá erros ao tentar upload. Configure o R2 primeiro.

---

## 🚀 Configurar Cloudflare R2

### Passo 1: Criar Conta Cloudflare (3 min)

1. Acesse: https://dash.cloudflare.com/sign-up
2. Crie conta gratuita
3. Vá para R2 Storage no menu lateral
4. Aceite os termos de serviço

### Passo 2: Criar Bucket (1 min)

1. Clique em "Create bucket"
2. Nome: `ecotech-anexos`
3. Location: Automatic
4. Clique em "Create bucket"

### Passo 3: Gerar API Tokens (2 min)

1. Vá para R2 > Manage R2 API Tokens
2. Clique em "Create API token"
3. Nome: `ecotech-production`
4. Permissions: Object Read & Write
5. Clique em "Create API token"
6. **COPIE AGORA** (só aparece uma vez):
   - Access Key ID → R2_ACCESS_KEY_ID
   - Secret Access Key → R2_SECRET_ACCESS_KEY
   - Account ID (no topo) → R2_ACCOUNT_ID

### Passo 4: Atualizar .env

```bash
# Abra o .env e substitua os placeholders:
R2_ACCOUNT_ID=abc123def456          # Account ID copiado
R2_ACCESS_KEY_ID=xyz789             # Access Key copiado
R2_SECRET_ACCESS_KEY=super-secret   # Secret copiado
R2_BUCKET_NAME=ecotech-anexos       # Nome do bucket
```

---

## 🧪 Testar Sistema

### Teste 1: Iniciar API

```bash
pnpm dev:api
# API deve iniciar em http://localhost:3001
```

### Teste 2: Login

```bash
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "admin@corretora.com",
  "senha": "senha123"
}

# Copie o token JWT da resposta
```

### Teste 3: Upload de Arquivo

**Via cURL:**
```bash
curl -X POST \
  http://localhost:3001/api/anexos/upload \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -F "file=@/caminho/para/arquivo.pdf" \
  -F "entidadeTipo=cotacao" \
  -F "entidadeId=ID_DA_COTACAO"
```

**Via Postman/Insomnia:**
1. Método: POST
2. URL: `http://localhost:3001/api/anexos/upload`
3. Headers: `Authorization: Bearer SEU_TOKEN_JWT`
4. Body: form-data
   - file: [selecione arquivo]
   - entidadeTipo: cotacao
   - entidadeId: [UUID de uma cotação]

### Teste 4: Verificar Upload no R2

1. Acesse Cloudflare Dashboard
2. Vá para R2 > ecotech-anexos
3. Você deve ver a estrutura:
   ```
   {corretoraId}/cotacaos/{cotacaoId}/{uuid}.pdf
   ```

### Teste 5: Download via URL Assinada

```bash
# Use a URL retornada no upload
curl "URL_ASSINADA_RETORNADA" -o downloaded.pdf

# Ou abra no navegador
```

---

## 📋 Endpoints Principais

### Upload Geral
```
POST /api/anexos/upload
Body: file, entidadeTipo, entidadeId
```

### Upload em Cotação
```
POST /api/cotacoes/:id/anexos/upload
Body: file
```

### Upload em Documento
```
POST /api/documentos-venda/:id/anexos/upload
Body: file
```

### Upload no Chat
```
POST /api/chat/canais/:canalId/anexos/upload
Body: file, mensagem (opcional)
```

### Listar Anexos
```
GET /api/cotacoes/:id/anexos
GET /api/documentos-venda/:id/anexos
GET /api/chat/canais/:id/anexos
```

---

## 🐛 Troubleshooting

### Erro: "Cannot find module '@ecotech/storage'"

```bash
# Reinstalar dependências
pnpm install
```

### Erro: "R2_ACCOUNT_ID não configurado"

```bash
# Verificar .env
cat .env | grep R2_

# Atualizar com credenciais reais
```

### Erro: "Access Denied" no R2

```bash
# Verificar permissões do token:
# 1. Vá para R2 > Manage R2 API Tokens
# 2. Verifique se token tem "Object Read & Write"
# 3. Gere novo token se necessário
```

### Erro: "Anexo não encontrado"

```bash
# Verificar tenant isolation:
# 1. Usuário está logado na corretora correta?
# 2. Cotação/documento pertence à mesma corretora?
```

### Upload muito lento

```bash
# Normal na primeira vez (criando estrutura R2)
# Uploads subsequentes são mais rápidos
```

---

## 📊 Monitorar Uso do R2

### Via Dashboard Cloudflare

1. R2 > ecotech-anexos > Metrics
2. Veja:
   - Total de objetos
   - Storage usado (GB)
   - Operations (leituras/escritas)

### Via API (Futuro - Sprint 3)

```bash
GET /api/admin/storage/overview
# Retorna métricas de todas as corretoras
```

---

## 💰 Custos Estimados

### Free Tier Cloudflare R2

- **Storage**: 10 GB/mês grátis
- **Class A Operations**: 1 milhão/mês grátis (write)
- **Class B Operations**: 10 milhões/mês grátis (read)

### Após Free Tier

- **Storage**: $0.015/GB/mês
- **Class A**: $4.50/milhão operações
- **Class B**: $0.36/milhão operações
- **Egress**: $0 (GRÁTIS!)

### Exemplo (10 corretoras, 5GB cada)

- Storage: 50GB × $0.015 = **$0.75/mês**
- Operations: ~**$0.50/mês**
- **Total: ~$1.25/mês**

---

## ✅ Checklist de Produção

Antes de ir para produção:

- [ ] R2 configurado com credenciais reais
- [ ] Bucket criado com nome correto
- [ ] Variáveis .env atualizadas
- [ ] Migration executada
- [ ] Teste de upload realizado
- [ ] Teste de download realizado
- [ ] Teste de delete realizado
- [ ] Permissões de usuários configuradas
- [ ] Rate limiting configurado
- [ ] Backup agendado (Sprint 3)

---

## 📚 Documentação Completa

- **SPRINT_1_IMPLEMENTADO.md** - Detalhes técnicos Sprint 1
- **SPRINT_2_IMPLEMENTADO.md** - Detalhes técnicos Sprint 2
- **RESUMO_SPRINTS_1_2.md** - Visão geral completa
- **plano/** - Documentação completa do plano original

---

## 🆘 Precisa de Ajuda?

1. Verifique logs da API: `pnpm dev:api`
2. Verifique console do navegador (frontend)
3. Verifique Cloudflare Dashboard > R2 > Logs
4. Consulte documentação acima

---

**Pronto para usar! 🚀**
