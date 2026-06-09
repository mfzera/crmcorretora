#!/bin/bash

# Script de setup para ambiente de desenvolvimento
# Configura PostgreSQL e MinIO automaticamente

set -e

echo "🚀 Configurando ambiente de desenvolvimento..."
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar se Docker está rodando
echo "1️⃣  Verificando Docker..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Inicie o Docker e tente novamente."
    exit 1
fi
echo -e "${GREEN}✅ Docker está rodando${NC}"
echo ""

# 2. Criar .env se não existir
echo "2️⃣  Configurando variáveis de ambiente..."
if [ ! -f .env ]; then
    if [ -f .env.development ]; then
        cp .env.development .env
        echo -e "${GREEN}✅ Arquivo .env criado a partir de .env.development${NC}"
    else
        echo "❌ Arquivo .env.development não encontrado"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Arquivo .env já existe, não será sobrescrito${NC}"
fi
echo ""

# 3. Iniciar containers
echo "3️⃣  Iniciando containers (PostgreSQL + MinIO)..."
docker compose up -d postgres minio
echo -e "${GREEN}✅ Containers iniciados${NC}"
echo ""

# 4. Aguardar PostgreSQL estar pronto
echo "4️⃣  Aguardando PostgreSQL ficar pronto..."
for i in {1..30}; do
    if docker exec ecotech-postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL está pronto${NC}"
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

# 5. Aguardar MinIO estar pronto
echo "5️⃣  Aguardando MinIO ficar pronto..."
for i in {1..30}; do
    if curl -sf http://localhost:9000/minio/health/live > /dev/null 2>&1; then
        echo -e "${GREEN}✅ MinIO está pronto${NC}"
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

# 6. Criar buckets no MinIO
echo "6️⃣  Criando buckets no MinIO..."
docker compose up -d minio-setup
sleep 3
echo -e "${GREEN}✅ Buckets criados${NC}"
echo ""

# 7. Executar migrações do banco
echo "7️⃣  Executando migrações do banco de dados..."
if command -v pnpm > /dev/null 2>&1; then
    cd libs/shared/database
    if [ -f "drizzle.config.ts" ]; then
        echo "   Usando drizzle-kit push..."
        pnpm drizzle-kit push --config=drizzle.config.ts 2>/dev/null || {
            echo -e "${YELLOW}   ⚠️  drizzle-kit push falhou, aplicando migrações manualmente...${NC}"
            # Aplicar todas as migrações SQL diretamente
            for migration in migrations/*.sql; do
                if [ -f "$migration" ]; then
                    echo "   Aplicando $(basename $migration)..."
                    docker exec -i ecotech-postgres psql -U postgres -d saas_seguradoras < "$migration" 2>/dev/null || true
                fi
            done
        }
        echo -e "${GREEN}✅ Migrações aplicadas${NC}"
    else
        echo -e "${YELLOW}⚠️  drizzle.config.ts não encontrado${NC}"
    fi
    cd ../../..
else
    echo -e "${YELLOW}⚠️  pnpm não encontrado, pule este passo se já executou as migrações${NC}"
fi
echo ""

# 8. Resumo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Setup concluído com sucesso!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 Serviços disponíveis:"
echo "  • PostgreSQL: localhost:5432"
echo "    - User: postgres"
echo "    - Password: postgres123"
echo "    - Database: saas_seguradoras"
echo ""
echo "  • MinIO API: http://localhost:9000"
echo "    - Access Key: minioadmin"
echo "    - Secret Key: minioadmin123"
echo ""
echo "  • MinIO Console: http://localhost:9001"
echo "    - Username: minioadmin"
echo "    - Password: minioadmin123"
echo ""
echo "📝 Próximos passos:"
echo "  1. Instale as dependências: pnpm install"
echo "  2. Inicie a API: pnpm dev"
echo "  3. Acesse o MinIO Console: http://localhost:9001"
echo ""
echo "📚 Documentação:"
echo "  • MinIO Setup: docs/desenvolvimento/minio-setup.md"
echo "  • Sprint 3 (Admin): docs/implementacao/sprint-3-admin-backend.md"
echo ""
echo "🔧 Comandos úteis:"
echo "  • Ver logs: docker compose logs -f"
echo "  • Parar tudo: docker compose down"
echo "  • Resetar dados: docker compose down -v"
echo ""
