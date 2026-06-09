# Correção: Anexos em Documentos de Venda

## Problema Identificado

Quando uma cotação era confirmada como venda, os anexos eram **vinculados** ao documento de venda no banco de dados, mas os **arquivos físicos permaneciam na pasta da cotação** no R2 Storage.

### Fluxo Anterior (Incorreto)
```
1. Cotação criada → anexos em: cotacaos/{cotacaoId}/arquivo.pdf
2. Venda confirmada → 
   ✅ Banco: entidadeTipo='documento_venda', entidadeId='{docVendaId}'
   ❌ R2: arquivo ainda em cotacaos/{cotacaoId}/arquivo.pdf
3. Frontend busca anexos em: documento_vendas/{docVendaId}/
4. ❌ Resultado: anexos não aparecem no frontend
```

### Fluxo Corrigido
```
1. Cotação criada → anexos em: cotacaos/{cotacaoId}/arquivo.pdf
2. Venda confirmada → 
   ✅ Banco: entidadeTipo='documento_venda', entidadeId='{docVendaId}'
   ✅ R2: arquivo movido para documento_vendas/{docVendaId}/arquivo.pdf
   ✅ Banco: r2Key atualizado para documento_vendas/{docVendaId}/arquivo.pdf
3. Frontend busca anexos em: documento_vendas/{docVendaId}/
4. ✅ Resultado: anexos aparecem corretamente
```

## Correções Implementadas

### 1. Adicionado Método `move()` no R2Client

**Arquivo**: `libs/shared/storage/src/r2-client.ts`

```typescript
/**
 * Mover arquivo (copiar + deletar original)
 * Usado para transferir anexos entre entidades
 */
async move(sourceKey: string, destKey: string): Promise<void> {
  // Copiar para o novo local
  await this.copy(sourceKey, destKey);

  // Deletar o arquivo original
  await this.delete(sourceKey);
}
```

### 2. Atualizado Endpoint de Confirmação de Venda

**Arquivo**: `apps/api/src/routes/cotacoes/index.ts`

**Endpoint**: `POST /api/cotacoes/:id/confirmar-venda`

Agora, quando uma venda é confirmada:

1. Busca todos os anexos da cotação
2. Para cada anexo:
   - Extrai o nome do arquivo do `r2Key` original
   - Constrói o novo `r2Key` para `documento_vendas/{docVendaId}/{nomeArquivo}`
   - Move o arquivo fisicamente no R2 usando `storageClient.move()`
   - Atualiza os metadados no banco:
     - `entidadeTipo` → `'documento_venda'`
     - `entidadeId` → ID do documento de venda
     - `r2Key` → novo caminho no R2
3. Loga todo o processo para auditoria

### 3. API de Migração para Anexos Existentes

**Arquivo**: `apps/api/src/routes/admin/migrar-anexos.ts`

Para corrigir anexos existentes que já estavam com esse problema, use a API administrativa:

#### Verificar anexos que precisam migração

```bash
# Verificar quantos anexos precisam ser migrados
curl -X GET http://localhost:3001/api/admin/migrar-anexos/verificar \
  -H "Authorization: Bearer {seu-token-admin}"
```

Resposta:
```json
{
  "success": true,
  "total": 5,
  "anexos": [
    {
      "id": "uuid",
      "nomeOriginal": "proposta.pdf",
      "entidadeId": "doc-venda-id",
      "r2KeyAtual": "cotacaos/{cotacao-id}/proposta.pdf",
      "r2KeyNovo": "documento_vendas/{doc-venda-id}/proposta.pdf"
    }
  ]
}
```

#### Executar migração

```bash
# Executar a migração de todos os anexos
curl -X POST http://localhost:3001/api/admin/migrar-anexos/executar \
  -H "Authorization: Bearer {seu-token-admin}"
```

Resposta:
```json
{
  "success": true,
  "message": "Migração concluída: 5 sucessos, 0 erros",
  "resultados": {
    "sucessos": 5,
    "erros": 0,
    "total": 5,
    "detalhes": [...]
  }
}
```

**Requisitos**:
- Token de autenticação de administrador
- Permissão `admin:gerenciar_sistema`
- Acesso ao painel administrativo

## Como Testar

### 1. Testar com Nova Cotação

```bash
# 1. Criar cotação com anexos
POST /api/cotacoes
# Upload de anexos
POST /api/cotacoes/{id}/anexos

# 2. Confirmar venda
POST /api/cotacoes/{id}/confirmar-venda

# 3. Verificar logs
# Deve aparecer:
# 🔄 Movendo N anexos de cotacao/{id} para documento_vendas/{docId}
#   ✅ Anexo arquivo.pdf movido: cotacaos/{id}/... → documento_vendas/{docId}/...
# ✅ Processo de movimentação de anexos concluído

# 4. Buscar anexos no documento de venda
GET /api/documentos-venda/{docId}/anexos
# ✅ Deve listar todos os anexos corretamente
```

### 2. Verificar no R2 Storage

```bash
# Verificar estrutura de pastas
# MinIO (dev):
mc ls local/ecotech-dev/documento_vendas/{docId}/

# Cloudflare R2 (prod):
# Usar Cloudflare Dashboard ou R2 CLI
```

### 3. Verificar no Banco de Dados

```sql
-- Anexos que ainda precisam migração (deve retornar 0 após correção)
SELECT 
  id, 
  nome_original, 
  entidade_tipo, 
  entidade_id, 
  r2_key
FROM anexo
WHERE entidade_tipo = 'documento_venda'
  AND r2_key LIKE 'cotacaos/%'
  AND deleted_at IS NULL;
```

## Impacto

### Antes da Correção
- ❌ Anexos não apareciam no frontend após confirmação de venda
- ❌ Arquivos órfãos ficavam em pastas de cotações
- ❌ Usuários precisavam fazer novo upload de anexos manualmente

### Depois da Correção
- ✅ Anexos aparecem automaticamente no documento de venda
- ✅ Arquivos organizados corretamente por entidade
- ✅ Processo totalmente automático e transparente
- ✅ Logs detalhados para auditoria

## Manutenção

### Monitoramento

Adicionar query de monitoramento no dashboard admin:

```sql
-- Alertar se houver anexos em pasta errada
SELECT COUNT(*) as anexos_desorganizados
FROM anexo
WHERE (
  (entidade_tipo = 'documento_venda' AND r2_key LIKE 'cotacaos/%') OR
  (entidade_tipo = 'cotacao' AND r2_key LIKE 'documento_vendas/%')
)
AND deleted_at IS NULL;
```

Se o resultado for > 0, executar o script de migração.

## Changelog

- **2026-01-27**: Correção implementada e documentada
  - Adicionado método `move()` no R2Client
  - Atualizado endpoint de confirmação de venda
  - Criado script de migração para dados existentes
