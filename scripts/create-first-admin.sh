#!/bin/bash

# Script para criar o primeiro admin do sistema
# Uso: ./scripts/create-first-admin.sh

API_URL="${API_URL:-http://localhost:3001}"

echo "🔐 Criando primeiro admin do sistema..."
echo ""

read -p "Nome: " NOME
read -p "Email: " EMAIL
read -sp "Senha (mínimo 8 caracteres): " SENHA
echo ""

# Validações básicas
if [ ${#SENHA} -lt 8 ]; then
  echo "❌ Erro: A senha deve ter no mínimo 8 caracteres"
  exit 1
fi

# Criar admin
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/admin/auth/create-first-admin" \
  -H "Content-Type: application/json" \
  -d "{
    \"nome\": \"$NOME\",
    \"email\": \"$EMAIL\",
    \"senha\": \"$SENHA\",
    \"permissoes\": [
      \"view_usage\",
      \"manage_limits\",
      \"view_all_tenants\",
      \"manage_backups\",
      \"manage_admins\",
      \"view_audit_logs\",
      \"cleanup_files\"
    ]
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ Admin criado com sucesso!"
  echo ""
  echo "Credenciais:"
  echo "  Email: $EMAIL"
  echo "  Senha: (a que você digitou)"
  echo ""
  echo "Permissões:"
  echo "  • view_usage - Visualizar uso do sistema"
  echo "  • manage_limits - Gerenciar limites de tenants"
  echo "  • view_all_tenants - Visualizar todos os tenants"
  echo "  • manage_backups - Gerenciar backups"
  echo "  • manage_admins - Gerenciar administradores"
  echo "  • view_audit_logs - Visualizar logs de auditoria"
  echo "  • cleanup_files - Limpar arquivos"
  echo ""
  echo "Acesse: http://localhost:3000/admin/login"
else
  echo "❌ Erro ao criar admin:"
  echo "$BODY"
  exit 1
fi
