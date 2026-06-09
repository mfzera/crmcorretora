#!/bin/bash

# Script para configurar ambiente de desenvolvimento
# Este script copia o .env.development para os locais necessários

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_SOURCE="$PROJECT_ROOT/.env.development"

echo "🔧 Configurando ambiente de desenvolvimento..."
echo ""

# Verificar se .env.development existe
if [ ! -f "$ENV_SOURCE" ]; then
    echo "❌ Erro: Arquivo .env.development não encontrado!"
    echo "   Copie .env.exemple para .env.development e configure."
    exit 1
fi

# 1. Copiar para raiz do projeto
echo "📄 Copiando para raiz do projeto (.env)..."
cp "$ENV_SOURCE" "$PROJECT_ROOT/.env"

# 2. Copiar para apps/worker
echo "📄 Copiando para apps/worker (.env)..."
mkdir -p "$PROJECT_ROOT/apps/worker"
cp "$ENV_SOURCE" "$PROJECT_ROOT/apps/worker/.env"

# 3. Remover .env.local do web se existir (Next.js lê da raiz)
if [ -f "$PROJECT_ROOT/apps/web/.env.local" ]; then
    echo "🧹 Removendo apps/web/.env.local (não necessário)..."
    rm "$PROJECT_ROOT/apps/web/.env.local"
fi

echo ""
echo "✅ Ambiente configurado com sucesso!"
echo ""
echo "📋 Arquivos criados:"
echo "   - ./.env (usado por API e Next.js)"
echo "   - ./apps/worker/.env (worker específico)"
echo ""
echo "ℹ️  O Next.js (apps/web) lê automaticamente da raiz (.env)"
echo ""
echo "⚠️  Lembre-se de reiniciar os serviços para aplicar as mudanças:"
echo "   pnpm dev"
echo ""
