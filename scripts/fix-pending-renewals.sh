#!/bin/bash

# Script para corrigir renovações pendentes via API endpoint
# Uso:
#   ./scripts/fix-pending-renewals.sh [TOKEN]
#
# Se não fornecer o token, será solicitado

set -e

API_URL="${API_URL:-http://localhost:3000}"
ENDPOINT="/api/renovacoes/fix-pending-renewals"

echo "🔧 Script de Correção de Renovações Pendentes"
echo ""

# Check if token is provided
if [ -z "$1" ]; then
  echo "Por favor, forneça o token de autenticação:"
  echo ""
  echo "Opção 1: Como argumento"
  echo "  ./scripts/fix-pending-renewals.sh 'seu-token-aqui'"
  echo ""
  echo "Opção 2: Via variável de ambiente"
  echo "  TOKEN='seu-token-aqui' ./scripts/fix-pending-renewals.sh"
  echo ""

  # Try to get from environment
  if [ -z "$TOKEN" ]; then
    echo "❌ Token não fornecido"
    exit 1
  fi
else
  TOKEN="$1"
fi

echo "📡 Chamando API: $API_URL$ENDPOINT"
echo ""

# Make the API call
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$API_URL$ENDPOINT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

# Extract status code
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS:/d')

# Check status
if [ "$http_status" = "200" ]; then
  echo "✅ Correção concluída com sucesso!"
  echo ""
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
else
  echo "❌ Erro na requisição (Status: $http_status)"
  echo ""
  echo "$body"
  exit 1
fi
