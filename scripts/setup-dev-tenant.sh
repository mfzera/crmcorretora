#!/bin/bash

# Script para configurar tenant de desenvolvimento
# Uso: ./scripts/setup-dev-tenant.sh

set -e

API_URL="${API_URL:-http://localhost:3001}"
FRONTEND_DIR="apps/web"

echo "🚀 Setup de Tenant de Desenvolvimento"
echo "======================================"
echo ""

# Verificar se backend está rodando
echo "🔍 Verificando backend..."
if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
  echo "❌ Erro: Backend não está rodando em $API_URL"
  echo "   Execute: pnpm dev (ou inicie o backend)"
  exit 1
fi
echo "✅ Backend está online"
echo ""

# Verificar se já existe tenant demo
echo "🔍 Verificando se tenant 'demo' já existe..."
# Isso pode falhar se não existir, mas tudo bem
EXISTING_TENANT=$(curl -s "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: demo" \
  -d '{"email":"admin@demo.com","password":"demo123"}' 2>/dev/null || echo "")

if echo "$EXISTING_TENANT" | grep -q "token"; then
  echo "✅ Tenant 'demo' já existe e está funcional!"
  echo ""
  echo "Credenciais:"
  echo "  Email: admin@demo.com"
  echo "  Senha: demo123"
  echo ""
  echo "Configure o frontend:"
  echo "  cd $FRONTEND_DIR"
  echo "  echo 'NEXT_PUBLIC_TENANT_ID=demo' >> .env.local"
  echo ""
  exit 0
fi

echo "📝 Tenant 'demo' não encontrado. Vamos criar!"
echo ""

# Primeiro, precisamos descobrir o ID de um plano
echo "🔍 Buscando planos disponíveis..."
# Nota: precisaríamos de um endpoint admin ou acesso direto ao banco
# Por enquanto, vamos assumir que o usuário tem acesso ao banco

echo ""
echo "⚠️  ATENÇÃO: Este script precisa de acesso ao banco de dados"
echo ""
echo "Execute o seguinte SQL no seu banco PostgreSQL:"
echo ""
echo "-- 1. Verificar/criar plano"
echo "INSERT INTO planos (nome, descricao, preco_mensal, max_usuarios, max_armazenamento_gb, ativo)"
echo "VALUES ('Plano Demo', 'Plano para desenvolvimento', 0, 100, 100, true)"
echo "ON CONFLICT DO NOTHING"
echo "RETURNING id;"
echo ""
echo "-- 2. Copie o ID do plano retornado acima"
read -p "Cole o ID do plano aqui: " PLANO_ID

if [ -z "$PLANO_ID" ]; then
  echo "❌ ID do plano não pode estar vazio"
  exit 1
fi

echo ""
echo "🏢 Criando corretora demo..."

# Criar corretora via API
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/auth/register-corretora" \
  -H "Content-Type: application/json" \
  -d "{
    \"planoId\": \"$PLANO_ID\",
    \"razaoSocial\": \"Corretora Demo LTDA\",
    \"nomeFantasia\": \"Corretora Demo\",
    \"cnpj\": \"00000000000191\",
    \"subdominio\": \"demo\",
    \"nomeDono\": \"Admin Demo\",
    \"emailDono\": \"admin@demo.com\",
    \"senhaDono\": \"demo123\",
    \"telefone\": \"11999999999\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "201" ]; then
  echo "❌ Erro ao criar corretora:"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  exit 1
fi

echo "✅ Corretora criada com sucesso!"
echo ""

# Extrair ID da corretora
CORRETORA_ID=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['corretora']['id'])" 2>/dev/null || echo "demo")

echo "📋 Informações da Corretora:"
echo "  ID: $CORRETORA_ID"
echo "  Subdomínio: demo"
echo "  Razão Social: Corretora Demo LTDA"
echo ""

echo "👤 Credenciais de Login:"
echo "  Email: admin@demo.com"
echo "  Senha: demo123"
echo ""

# Configurar .env.local do frontend
echo "⚙️  Configurando frontend..."

ENV_FILE="$FRONTEND_DIR/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  touch "$ENV_FILE"
fi

# Remover configuração antiga de TENANT_ID se existir
sed -i '/NEXT_PUBLIC_TENANT_ID/d' "$ENV_FILE" 2>/dev/null || true

# Adicionar nova configuração
echo "NEXT_PUBLIC_TENANT_ID=$CORRETORA_ID" >> "$ENV_FILE"

echo "✅ Frontend configurado!"
echo "   Arquivo: $ENV_FILE"
echo "   Tenant ID: $CORRETORA_ID"
echo ""

echo "🎉 Setup completo!"
echo ""
echo "Próximos passos:"
echo "  1. Reinicie o frontend (se estiver rodando)"
echo "  2. Acesse: http://localhost:3000/login"
echo "  3. Use as credenciais:"
echo "     Email: admin@demo.com"
echo "     Senha: demo123"
echo ""
echo "✨ Bom desenvolvimento!"
