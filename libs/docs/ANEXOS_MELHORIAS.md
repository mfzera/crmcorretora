# Melhorias no Sistema de Anexos

## 🎨 Melhorias Visuais

### 1. Modal de Cotação Aumentado
- **Antes**: `max-w-3xl` (limitado a ~768px)
- **Depois**: `max-w-[95vw]` (95% da largura da tela)
- **Benefício**: Mais espaço para visualizar todas as abas (valores, anexos, vendedores, etc.)

### 2. Modal de Preview de Anexos
- **Tamanho**: `max-w-[90vw]` (90% da largura da tela)
- **Altura**: Até `90vh` (90% da altura da tela)
- **Preview de PDF**: `75vh` de altura
- **Preview de Imagem**: Até `75vh` de altura

### 3. Novos Recursos de Visualização
- ✅ **Botão "Abrir em Nova Janela"**: Abre o anexo em uma janela popup separada
- ✅ **Botão "Baixar"**: Download direto do arquivo
- ✅ **Preview otimizado**: Melhor aproveitamento do espaço disponível

## 🔒 Melhorias de Segurança

### 1. Correção de Bugs Críticos
- ✅ Corrigido erro `request.userId` → `request.user.sub` em 6 arquivos
- ✅ Criada tabela `anexo` no banco de dados (migration executada)
- ✅ Corrigido erro `response.data.url` no frontend

### 2. Validação de Acesso (Authorization)
```typescript
// Validação de tenant em todas as rotas
const urlAssinada = await storageService.getSignedUrl(
  anexo.id,
  request.corretoraId, // NOVO: valida tenant
);
```

**Implementado em:**
- GET /api/anexos/:id
- GET /api/anexos/:id/download
- GET /api/anexos/entidade/:tipo/:id

### 3. Validação de Arquivos

#### Magic Bytes Validation
Verifica a assinatura real do arquivo (primeiros bytes) para garantir que o tipo corresponde ao declarado:

```typescript
// Assinaturas conhecidas
const signatures = {
  'application/pdf': ['25504446'], // %PDF
  'image/jpeg': ['FFD8FFE0', 'FFD8FFE1', 'FFD8FFE2', 'FFD8FFDB'],
  'image/png': ['89504E47'],
  'application/vnd...docx': ['504B0304'], // ZIP
  'application/vnd...xlsx': ['504B0304'], // ZIP
};
```

**Benefício**: Impede upload de executáveis maliciosos disfarçados como PDF/imagens.

#### Sanitização de Nomes
```typescript
// Remove caracteres perigosos
const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
```

**Benefício**: Previne path traversal attacks (`../../etc/passwd`).

### 4. Rate Limiting
```typescript
// Máximo de 10 uploads por minuto por usuário
if (uploads.count > 10) {
  return reply.status(429).send({
    error: 'Limite de uploads excedido. Máximo de 10 uploads por minuto.',
  });
}
```

**Benefício**: Previne abuse e DoS attacks.

### 5. URLs Assinadas Seguras
- **Antes**: 24 horas de validade
- **Depois**: 1 hora de validade (máximo)
- **Benefício**: Reduz janela de exposição se URL vazar

```typescript
async getSignedDownloadUrl(key: string, expiresIn: number = 60 * 60): Promise<string> {
  // Máximo de 1 hora para segurança
  const safeExpiresIn = Math.min(expiresIn, 60 * 60);
  return await getSignedUrl(this.client, command, { expiresIn: safeExpiresIn });
}
```

### 6. Proteção de Dados
- ✅ **Soft Delete**: Arquivos não são removidos permanentemente
- ✅ **Auditoria completa**: 
  - `upload_por_id`: quem fez upload
  - `upload_em`: quando foi feito
  - `deleted_por_id`: quem deletou
  - `deleted_at`: quando foi deletado
- ✅ **Versionamento**: Histórico completo de versões

## 📊 Estrutura da Tabela

```sql
CREATE TABLE anexo (
  id UUID PRIMARY KEY,
  corretora_id UUID NOT NULL REFERENCES seguradora(id),
  
  -- Relacionamento polimórfico
  entidade_tipo entidade_tipo_anexo NOT NULL,
  entidade_id UUID NOT NULL,
  
  -- Metadados
  nome_original VARCHAR(256) NOT NULL,
  nome_arquivo VARCHAR(256) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  tamanho BIGINT NOT NULL,
  
  -- Storage R2/MinIO
  r2_key VARCHAR(512) NOT NULL,
  r2_bucket VARCHAR(100) NOT NULL,
  
  -- Versionamento
  versao INTEGER NOT NULL DEFAULT 1,
  arquivo_anterior_id UUID REFERENCES anexo(id),
  
  -- Extração de conteúdo (PDFs)
  texto_extraido TEXT,
  metadados_extracao JSONB,
  
  -- Auditoria
  upload_por_id UUID NOT NULL REFERENCES usuario(id),
  upload_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_por_id UUID REFERENCES usuario(id)
);
```

## 🎯 Tipos de Arquivo Permitidos

1. **PDF** (`application/pdf`)
2. **JPEG** (`image/jpeg`, `image/jpg`)
3. **PNG** (`image/png`)
4. **DOCX** (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`)
5. **XLSX** (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)

**Limite de tamanho**: 10 MB por arquivo

## 🚀 Como Usar

### Upload de Anexo
1. Abra uma cotação
2. Clique na aba "Anexos"
3. Arraste arquivos ou clique para selecionar
4. Aguarde o upload completar

### Visualizar Anexo
1. Na lista de anexos, clique no arquivo
2. O preview abrirá em um modal grande
3. Use os botões:
   - 🔗 **Abrir em Nova Janela**: Abre em popup separado
   - ⬇️ **Baixar**: Download direto

### Download Direto
- URLs de download expiram em 1 hora
- Após expirar, basta clicar novamente para gerar nova URL

## 📝 Notas Técnicas

### Storage
- **Desenvolvimento**: MinIO (S3-compatible)
- **Produção**: Cloudflare R2
- **Path**: `{corretoraId}/{tipo}s/{entidadeId}/{arquivo}.{ext}`
  - Exemplo: `abc123/cotacaos/def456/789.pdf`

### Segurança
- Todas as rotas validam tenant (multi-tenancy)
- URLs são assinadas (pre-signed URLs)
- Rate limiting em memória (produção: usar Redis)
- Magic bytes validation impede uploads maliciosos

## 🔄 Próximas Melhorias Sugeridas

1. **Scan de vírus**: Integrar ClamAV ou similar
2. **Compressão**: Comprimir imagens automaticamente
3. **Thumbnails**: Gerar miniaturas para preview rápido
4. **OCR**: Extrair texto de imagens (não só PDFs)
5. **Tags**: Sistema de tags para organização
6. **Busca**: Busca por texto extraído de PDFs
7. **Redis Rate Limit**: Mover rate limiting para Redis (multi-servidor)
8. **Quotas por tenant**: Limitar espaço por corretora

## 🐛 Bugs Corrigidos

1. ✅ `request.userId` undefined → usar `request.user.sub`
2. ✅ Tabela `anexo` não existia → migration executada
3. ✅ `response.data.url` undefined → corrigir acesso direto
4. ✅ Modal muito pequeno → aumentado para 90-95vw
5. ✅ Preview de PDF pequeno → aumentado para 75vh
6. ✅ Faltava botão para nova janela → adicionado

## 📚 Referências

- [AWS S3 Pre-Signed URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [File Signatures (Magic Bytes)](https://en.wikipedia.org/wiki/List_of_file_signatures)
- [OWASP File Upload](https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload)
- [Rate Limiting Best Practices](https://blog.logrocket.com/rate-limiting-node-js/)
