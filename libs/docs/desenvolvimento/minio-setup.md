# MinIO - Setup para Desenvolvimento

MinIO é um servidor de armazenamento de objetos S3-compatible que roda localmente, perfeito para desenvolvimento e testes.

## Por que usar MinIO?

- ✅ 100% compatível com S3 API (funciona igual ao Cloudflare R2)
- ✅ Roda localmente (sem custos, sem internet)
- ✅ Interface web para visualizar arquivos
- ✅ Fácil de configurar e resetar
- ✅ Mesma API do AWS SDK que usamos no código

## Instalação e Configuração

### 1. Iniciar MinIO via Docker

```bash
# Iniciar todos os serviços (PostgreSQL + MinIO)
docker compose up -d

# Verificar se está rodando
docker ps | grep minio

# Verificar logs
docker logs ecotech-minio
docker logs ecotech-minio-setup
```

O `minio-setup` cria automaticamente os buckets:
- `ecotech-anexos` - Bucket principal de arquivos
- `ecotech-backups` - Bucket de backups

### 2. Configurar Variáveis de Ambiente

Copie `.env.development` para `.env`:

```bash
cp .env.development .env
```

As configurações já estão prontas para usar MinIO:

```env
CLOUDFLARE_R2_ENDPOINT=http://localhost:9000
CLOUDFLARE_R2_ACCESS_KEY_ID=minioadmin
CLOUDFLARE_R2_SECRET_ACCESS_KEY=minioadmin123
CLOUDFLARE_R2_BUCKET=ecotech-anexos
CLOUDFLARE_R2_BACKUP_BUCKET=ecotech-backups
CLOUDFLARE_R2_REGION=us-east-1
```

### 3. Acessar Console Web

Abra no navegador: **http://localhost:9001**

**Credenciais:**
- Username: `minioadmin`
- Password: `minioadmin123`

## Usando o MinIO

### Via Interface Web

1. Acesse http://localhost:9001
2. Faça login com `minioadmin` / `minioadmin123`
3. Navegue pelos buckets:
   - **Object Browser** → `ecotech-anexos` ou `ecotech-backups`
4. Você pode:
   - Visualizar arquivos enviados
   - Fazer download de arquivos
   - Upload manual de arquivos para teste
   - Ver metadados e tags
   - Deletar arquivos

### Via API (seu código)

Seu código já funciona! O R2Client usa AWS SDK v3, que é 100% compatível com MinIO:

```typescript
// Isso funciona automaticamente com MinIO
const storageService = new StorageService();

await storageService.uploadFile(
  corretoraId,
  'cotacao',
  cotacaoId,
  buffer,
  'documento.pdf',
  'application/pdf'
);
```

### Via CLI do MinIO (mc)

```bash
# Entrar no container do MinIO
docker exec -it ecotech-minio sh

# Ou usar mc do host (instalar separadamente)
mc alias set local http://localhost:9000 minioadmin minioadmin123

# Listar buckets
mc ls local

# Listar arquivos em um bucket
mc ls local/ecotech-anexos

# Copiar arquivo para o bucket
mc cp arquivo.pdf local/ecotech-anexos/teste/

# Download de arquivo
mc cp local/ecotech-anexos/teste/arquivo.pdf ./downloads/
```

## Testando Upload/Download

### Teste Manual via cURL

**Upload:**
```bash
# Criar arquivo de teste
echo "Teste de conteúdo" > teste.txt

# Upload usando AWS S3 CLI (compatível com MinIO)
aws s3 cp teste.txt s3://ecotech-anexos/teste/ \
  --endpoint-url http://localhost:9000 \
  --profile minio
```

**Download:**
```bash
aws s3 cp s3://ecotech-anexos/teste/teste.txt ./download.txt \
  --endpoint-url http://localhost:9000 \
  --profile minio
```

### Teste via sua API

```bash
# 1. Fazer login
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@corretora.com","senha":"senha123"}' \
  | jq -r '.token')

# 2. Upload de arquivo
curl -X POST http://localhost:3000/api/anexos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "arquivo=@/path/to/file.pdf" \
  -F "entidadeTipo=cotacao" \
  -F "entidadeId=uuid-da-cotacao"

# 3. Verificar no MinIO Console
# Abra http://localhost:9001 e veja o arquivo em ecotech-anexos
```

## Resetar Dados

### Limpar todos os arquivos

```bash
# Via console web
# Object Browser → ecotech-anexos → Select All → Delete

# Via CLI
docker exec ecotech-minio mc rm --recursive --force myminio/ecotech-anexos
docker exec ecotech-minio mc rm --recursive --force myminio/ecotech-backups

# Recriar buckets
docker exec ecotech-minio mc mb myminio/ecotech-anexos --ignore-existing
docker exec ecotech-minio mc mb myminio/ecotech-backups --ignore-existing
```

### Resetar MinIO completamente

```bash
# Para e remove containers
docker compose down

# Remove volume (ATENÇÃO: apaga TODOS os dados)
docker volume rm ecotech-sys_minio_data

# Sobe novamente (cria buckets vazios)
docker compose up -d
```

## Diferenças MinIO vs Cloudflare R2

### Compatibilidades
✅ Upload/Download de objetos
✅ GetObject, PutObject, DeleteObject
✅ CopyObject
✅ Signed URLs (presigned URLs)
✅ Buckets e prefixos (pastas)
✅ Metadata e Content-Type

### Diferenças Menores
⚠️ **Endpoint:** MinIO usa `http://localhost:9000`, R2 usa URL da Cloudflare
⚠️ **Region:** MinIO aceita qualquer região, R2 geralmente usa `auto`
⚠️ **Pricing:** MinIO é grátis localmente, R2 cobra por storage

### Para Produção
Ao fazer deploy, basta alterar as variáveis de ambiente para usar Cloudflare R2:

```env
# Produção - Cloudflare R2
CLOUDFLARE_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=<seu-access-key>
CLOUDFLARE_R2_SECRET_ACCESS_KEY=<seu-secret-key>
CLOUDFLARE_R2_BUCKET=ecotech-anexos-prod
CLOUDFLARE_R2_BACKUP_BUCKET=ecotech-backups-prod
CLOUDFLARE_R2_REGION=auto
```

**Nenhuma mudança no código é necessária!** 🎉

## Troubleshooting

### MinIO não inicia
```bash
# Verificar logs
docker logs ecotech-minio

# Verificar se a porta está em uso
lsof -i :9000
lsof -i :9001

# Reiniciar
docker compose restart minio
```

### Buckets não foram criados
```bash
# Executar setup manualmente
docker compose up minio-setup

# Ou criar via CLI
docker exec ecotech-minio mc mb myminio/ecotech-anexos --ignore-existing
docker exec ecotech-minio mc mb myminio/ecotech-backups --ignore-existing
```

### Erro de conexão no código
```bash
# Verificar se MinIO está rodando
curl http://localhost:9000/minio/health/live

# Verificar variáveis de ambiente
cat .env | grep CLOUDFLARE_R2

# Verificar se o endpoint está correto (http, não https)
echo $CLOUDFLARE_R2_ENDPOINT
```

### Permissões negadas
```bash
# Verificar credenciais
docker exec ecotech-minio mc admin info myminio

# Recriar alias com credenciais corretas
docker exec ecotech-minio mc alias set myminio http://localhost:9000 minioadmin minioadmin123
```

## Scripts Úteis

### Script para popular com arquivos de teste

```bash
#!/bin/bash
# populate-minio.sh

echo "Populando MinIO com arquivos de teste..."

# Criar estrutura de pastas
docker exec ecotech-minio mc mb myminio/ecotech-anexos/corretora-1 --ignore-existing
docker exec ecotech-minio mc mb myminio/ecotech-anexos/corretora-2 --ignore-existing

# Criar arquivos de teste
for i in {1..10}; do
  echo "Arquivo de teste $i" > /tmp/teste-$i.txt
  docker exec -i ecotech-minio sh -c "cat > /tmp/teste-$i.txt" < /tmp/teste-$i.txt
  docker exec ecotech-minio mc cp /tmp/teste-$i.txt myminio/ecotech-anexos/corretora-1/
done

echo "✅ 10 arquivos criados em ecotech-anexos/corretora-1/"
```

### Script para backup local

```bash
#!/bin/bash
# backup-minio.sh

BACKUP_DIR="./backups/minio-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR

echo "Fazendo backup do MinIO para $BACKUP_DIR..."

docker exec ecotech-minio mc mirror myminio/ecotech-anexos /tmp/backup-anexos
docker exec ecotech-minio mc mirror myminio/ecotech-backups /tmp/backup-backups

docker cp ecotech-minio:/tmp/backup-anexos $BACKUP_DIR/anexos
docker cp ecotech-minio:/tmp/backup-backups $BACKUP_DIR/backups

echo "✅ Backup concluído em $BACKUP_DIR"
```

## Recursos Adicionais

- **Documentação MinIO:** https://min.io/docs/minio/linux/
- **AWS SDK v3 (usado no código):** https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/
- **MinIO Client (mc):** https://min.io/docs/minio/linux/reference/minio-mc.html

---

**Pronto para começar!** 🚀

Execute `docker compose up -d` e acesse http://localhost:9001 para ver a interface do MinIO.
