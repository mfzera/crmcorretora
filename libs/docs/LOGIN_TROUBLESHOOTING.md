# 🔍 Troubleshooting: Login não Funciona

## Problema: "Login não envia nada para o backend"

### Causa Provável

O frontend está configurado para enviar um `x-tenant-id: demo` no header, mas esse tenant não existe no banco de dados.

### Como Verificar

1. Abra o DevTools do navegador (F12)
2. Vá na aba Network
3. Tente fazer login
4. Procure pela requisição `/api/auth/login`
5. Verifique o header `x-tenant-id`

### Soluções

#### Opção 1: Criar uma Corretora de Teste (Recomendado)

```bash
# Use o endpoint de registro
curl -X POST http://localhost:3001/api/auth/register-corretora \
  -H "Content-Type: application/json" \
  -d '{
    "planoId": "PLANO_ID_AQUI",
    "razaoSocial": "Corretora Demo LTDA",
    "nomeFantasia": "Corretora Demo",
    "cnpj": "00000000000191",
    "subdominio": "demo",
    "nomeDono": "Admin Demo",
    "emailDono": "admin@demo.com",
    "senhaDono": "senha123",
    "telefone": "11999999999"
  }'
```

**Primeiro, você precisa descobrir o ID do plano:**

```sql
-- No banco de dados
SELECT id, nome FROM planos WHERE ativo = true;
```

#### Opção 2: Usar o ID de uma Corretora Existente

1. **Descubra o ID da corretora:**
```sql
SELECT id, nome_fantasia, subdominio FROM corretoras LIMIT 5;
```

2. **Configure no `.env.local` do frontend:**
```bash
# apps/web/.env.local
NEXT_PUBLIC_TENANT_ID=ID_DA_CORRETORA_AQUI
```

3. **Reinicie o frontend:**
```bash
pnpm dev
```

#### Opção 3: Usar Subdomínio (Multi-tenant)

O sistema foi projetado para usar subdomínios. Exemplo:

- `demo.localhost:3000` → tenant "demo"
- `empresa1.localhost:3000` → tenant "empresa1"

**Como configurar:**

1. **Adicione entrada no `/etc/hosts`:**
```bash
127.0.0.1   demo.localhost
127.0.0.1   empresa1.localhost
```

2. **Acesse via subdomínio:**
```
http://demo.localhost:3000/login
```

3. **O sistema detectará automaticamente o tenant pelo subdomínio**

## Fluxo Correto de Setup

### 1. Verificar se existe plano ativo

```sql
SELECT * FROM planos WHERE ativo = true;
```

Se não existir, crie um:

```sql
INSERT INTO planos (nome, descricao, preco_mensal, max_usuarios, max_armazenamento_gb, ativo)
VALUES ('Plano Básico', 'Plano para testes', 0, 10, 10, true)
RETURNING id;
```

### 2. Criar corretora via API

Usando o ID do plano obtido acima:

```bash
curl -X POST http://localhost:3001/api/auth/register-corretora \
  -H "Content-Type: application/json" \
  -d '{
    "planoId": "SEU_PLANO_ID",
    "razaoSocial": "Minha Corretora LTDA",
    "nomeFantasia": "Minha Corretora",
    "cnpj": "12345678000191",
    "subdominio": "minhacorretora",
    "nomeDono": "João Silva",
    "emailDono": "joao@minhacorretora.com",
    "senhaDono": "SenhaSegura123!",
    "telefone": "11999999999"
  }'
```

### 3. Configurar o frontend

**Opção A: Via variável de ambiente**

```bash
# apps/web/.env.local
NEXT_PUBLIC_TENANT_ID=ID_DA_CORRETORA_RETORNADO
```

**Opção B: Via subdomínio (melhor para produção)**

1. Configure `/etc/hosts`:
```
127.0.0.1   minhacorretora.localhost
```

2. Acesse:
```
http://minhacorretora.localhost:3000/login
```

### 4. Fazer login

Use as credenciais que você criou:
- Email: `joao@minhacorretora.com`
- Senha: `SenhaSegura123!`

## Diferença: Login Normal vs Login Admin

| Aspecto | Login Normal (`/login`) | Login Admin (`/admin/login`) |
|---------|------------------------|------------------------------|
| **Endpoint** | `/api/auth/login` | `/api/admin/auth/login` |
| **Requer tenant** | ✅ Sim | ❌ Não |
| **Tabela** | `usuarios` | `admins` |
| **Header tenant** | Obrigatório | Não usado |
| **Escopo** | Apenas sua corretora | Todo o sistema |

## Erros Comuns

### ❌ "Tenant não encontrado"

**Causa:** O `x-tenant-id` enviado não existe no banco

**Solução:** 
- Verifique o ID no banco: `SELECT id FROM corretoras;`
- Configure o `.env.local` com ID válido
- Ou crie uma nova corretora

### ❌ "Credenciais inválidas"

**Causas possíveis:**
1. Email errado (verifique no banco)
2. Senha errada
3. Usuário inativo
4. Usuário de outro tenant

**Solução:**
```sql
-- Ver usuários da corretora
SELECT id, nome, email, ativo 
FROM usuarios 
WHERE corretora_id = 'SEU_TENANT_ID';

-- Resetar senha (se necessário)
UPDATE usuarios 
SET password_hash = '$2a$10$...' -- Use bcrypt para gerar
WHERE email = 'usuario@email.com';
```

### ❌ Nada aparece no Network do DevTools

**Causa:** Erro de JavaScript antes da requisição

**Solução:**
1. Abra o Console (F12)
2. Procure por erros em vermelho
3. Verifique se há erro de CORS
4. Verifique se o backend está rodando

## Verificações Básicas

### Backend está rodando?

```bash
curl http://localhost:3001/health
# Deve retornar: {"status":"ok","timestamp":"..."}
```

### Frontend está configurado corretamente?

```bash
# apps/web/.env.local deve ter:
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_TENANT_ID=ID_VALIDO_AQUI
```

### CORS está configurado?

O backend deve ter CORS habilitado (já está em `app.ts`).

## Debug Mode

Para ver logs detalhados de API:

```bash
# apps/web/.env.local
NEXT_PUBLIC_API_DEBUG=true
```

Isso mostrará no console:
- Todas as requisições
- Headers enviados
- Respostas recebidas
- Erros detalhados

## Contatos de Emergência

Se nada funcionar, verifique:

1. ✅ Backend rodando em `localhost:3001`
2. ✅ Frontend rodando em `localhost:3000`
3. ✅ Banco de dados online
4. ✅ Pelo menos um plano ativo no banco
5. ✅ Pelo menos uma corretora criada
6. ✅ `NEXT_PUBLIC_TENANT_ID` configurado corretamente

## Scripts Úteis

Criamos um script para facilitar o setup:

```bash
# Em breve: ./scripts/setup-dev-tenant.sh
# Criará automaticamente:
# - Plano de teste
# - Corretora demo
# - Usuário admin
# - Configurará .env.local
```
