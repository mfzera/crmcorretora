#!/bin/bash

# Script para testar conectividade com MinIO
# Testa upload, download e listagem de arquivos

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🧪 Testando MinIO..."
echo ""

# 1. Verificar se MinIO está rodando
echo "1️⃣  Verificando se MinIO está rodando..."
if curl -sf http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MinIO está rodando${NC}"
else
    echo -e "${RED}❌ MinIO não está rodando${NC}"
    echo "Execute: docker compose up -d minio"
    exit 1
fi
echo ""

# 2. Configurar alias local
echo "2️⃣  Configurando alias do MinIO..."
docker exec ecotech-minio mc alias set local http://localhost:9000 minioadmin minioadmin123 > /dev/null 2>&1
echo -e "${GREEN}✅ Alias configurado${NC}"
echo ""

# 3. Verificar buckets
echo "3️⃣  Verificando buckets..."
if docker exec ecotech-minio mc ls local/ecotech-anexos > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Bucket ecotech-anexos existe${NC}"
else
    echo -e "${RED}❌ Bucket ecotech-anexos não existe${NC}"
    echo "Execute: docker compose up minio-setup"
    exit 1
fi

if docker exec ecotech-minio mc ls local/ecotech-backups > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Bucket ecotech-backups existe${NC}"
else
    echo -e "${RED}❌ Bucket ecotech-backups não existe${NC}"
    echo "Execute: docker compose up minio-setup"
    exit 1
fi
echo ""

# 4. Testar upload
echo "4️⃣  Testando upload de arquivo..."
TEMP_FILE="/tmp/minio-test-$(date +%s).txt"
echo "Teste do MinIO - $(date)" > $TEMP_FILE

if docker exec -i ecotech-minio sh -c "cat > $TEMP_FILE" < $TEMP_FILE 2>/dev/null; then
    if docker exec ecotech-minio mc cp $TEMP_FILE local/ecotech-anexos/test/ > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Upload funcionando${NC}"
    else
        echo -e "${RED}❌ Erro no upload${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Erro ao copiar arquivo para container${NC}"
    exit 1
fi
echo ""

# 5. Testar listagem
echo "5️⃣  Testando listagem de arquivos..."
if docker exec ecotech-minio mc ls local/ecotech-anexos/test/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Listagem funcionando${NC}"
    FILE_COUNT=$(docker exec ecotech-minio mc ls local/ecotech-anexos/test/ | wc -l)
    echo "   Arquivos encontrados: $FILE_COUNT"
else
    echo -e "${RED}❌ Erro na listagem${NC}"
    exit 1
fi
echo ""

# 6. Testar download
echo "6️⃣  Testando download de arquivo..."
DOWNLOAD_FILE="/tmp/minio-download-$(date +%s).txt"
if docker exec ecotech-minio mc cp local/ecotech-anexos/test/$(basename $TEMP_FILE) /tmp/downloaded.txt > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Download funcionando${NC}"
else
    echo -e "${RED}❌ Erro no download${NC}"
    exit 1
fi
echo ""

# 7. Limpar arquivos de teste
echo "7️⃣  Limpando arquivos de teste..."
docker exec ecotech-minio mc rm --recursive --force local/ecotech-anexos/test/ > /dev/null 2>&1
rm -f $TEMP_FILE
echo -e "${GREEN}✅ Limpeza concluída${NC}"
echo ""

# 8. Estatísticas
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Todos os testes passaram!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Estatísticas dos buckets:"
echo ""

echo "📦 ecotech-anexos:"
ANEXOS_SIZE=$(docker exec ecotech-minio mc du local/ecotech-anexos 2>/dev/null | awk '{print $1, $2}' || echo "0 B")
ANEXOS_COUNT=$(docker exec ecotech-minio mc ls --recursive local/ecotech-anexos 2>/dev/null | wc -l || echo "0")
echo "   Tamanho: $ANEXOS_SIZE"
echo "   Arquivos: $ANEXOS_COUNT"
echo ""

echo "💾 ecotech-backups:"
BACKUPS_SIZE=$(docker exec ecotech-minio mc du local/ecotech-backups 2>/dev/null | awk '{print $1, $2}' || echo "0 B")
BACKUPS_COUNT=$(docker exec ecotech-minio mc ls --recursive local/ecotech-backups 2>/dev/null | wc -l || echo "0")
echo "   Tamanho: $BACKUPS_SIZE"
echo "   Arquivos: $BACKUPS_COUNT"
echo ""

echo "🌐 Acesse o console web: http://localhost:9001"
echo "   Username: minioadmin"
echo "   Password: minioadmin123"
echo ""
