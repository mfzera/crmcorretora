# Como Corrigir Renovações Pendentes

Este documento explica como corrigir renovações que ficaram presas em status pendente após serem concluídas.

## Problema

Renovações que completaram todo o fluxo (cotação → proposta → documento de venda → aprovação) podem ter ficado com status pendente (`EM_PROSPECCAO`, `EM_NEGOCIACAO`, etc.) ao invés de `RENOVADO`.

Isso foi corrigido no código, mas renovações antigas precisam ser atualizadas manualmente.

## Como Usar

### Opção 1: Via API Endpoint (Recomendado)

O jeito mais simples é chamar o endpoint da API que já está implementado.

#### 1. Certifique-se de que a API está rodando:

```bash
cd /home/mf/Área\ de\ trabalho/ecotech/ecotech-sys
pnpm nx serve api
```

#### 2. Obtenha um token de autenticação:

Faça login no sistema web e obtenha um token de admin (com permissão `admin:manage_system`).

Você pode pegar o token do navegador:
1. Abra as DevTools (F12)
2. Vá em Application/Storage → Local Storage
3. Copie o valor do `auth_token` ou `access_token`

#### 3. Execute o endpoint:

```bash
curl -X POST http://localhost:3000/api/renovacoes/fix-pending-renewals \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" | jq
```

Se não tiver `jq` instalado, remova o `| jq` do final.

### Opção 2: Via Script Node.js

Se preferir não usar a API, você pode executar o script diretamente conectando ao banco.

#### Método A: Através de uma rota temporária no servidor

Adicione temporariamente uma rota admin-only no servidor que chama a função de correção.

#### Método B: Usando o endpoint da API

A forma mais segura é usar o endpoint `/api/renovacoes/fix-pending-renewals` que já está implementado e registrado nas rotas.

## O que o Script Faz

1. **Busca todas as renovações pendentes:**
   - Status: `NAO_TRABALHADO`, `EM_PROSPECCAO`, `EM_NEGOCIACAO`, `AGUARDANDO_CLIENTE`

2. **Para cada renovação, verifica:**
   - Se existe uma cotação vinculada (via `detalhesRisco.renovacaoId`)
   - Se a cotação gerou uma proposta
   - Se a proposta gerou um documento de venda
   - Se o documento foi aprovado (status `ATIVO`)

3. **Atualiza a renovação:**
   - Muda status para `RENOVADO`
   - Vincula o documento de venda novo (`documentoVendaNovoId`)
   - Registra prêmio, comissão e datas finais
   - Marca data de finalização e quem aprovou

## Resultado Esperado

```json
{
  "success": true,
  "message": "Correção de renovações pendentes concluída",
  "data": {
    "total": 25,
    "atualizadas": 12,
    "semDocumento": 8,
    "documentoNaoAprovado": 4,
    "erros": 0,
    "detalhes": [
      {
        "renovacaoId": "123e4567-e89b-12d3-a456-426614174000",
        "statusAnterior": "EM_PROSPECCAO",
        "statusNovo": "RENOVADO",
        "documentoNumero": "DOC-2025-001",
        "mensagem": "Atualizada com sucesso"
      }
    ]
  }
}
```

## Categorias de Resultado

### ✅ Atualizadas
Renovações que tinham documento de venda aprovado e foram corrigidas com sucesso.

### ⚠️ Sem fluxo completo
Renovações que não têm cotação, proposta ou documento de venda vinculados. Podem ser:
- Renovações importadas mas nunca trabalhadas
- Renovações criadas manualmente sem seguir o fluxo
- Renovações que ainda estão em processo

**Ação:** Estas renovações continuarão aparecendo no workspace até serem trabalhadas ou marcadas como perdidas.

### ℹ️ Documento não aprovado
Renovações com fluxo completo, mas o documento de venda ainda não foi aprovado.

**Ação:** Aguardar aprovação do documento. Quando aprovado, a automação agora funcionará automaticamente.

### ❌ Erros
Erros inesperados durante o processamento.

**Ação:** Verificar logs e corrigir manualmente se necessário.

## Automação Futura

Após aplicar este script de correção, **novas renovações serão atualizadas automaticamente** quando o documento for aprovado. O script só é necessário para corrigir dados históricos.

## Exemplo Prático com Postman/Insomnia

1. **Método:** POST
2. **URL:** `http://localhost:3000/api/renovacoes/fix-pending-renewals`
3. **Headers:**
   ```
   Authorization: Bearer SEU_TOKEN_AQUI
   Content-Type: application/json
   ```
4. **Body:** (vazio)

## Troubleshooting

### Erro 401 Unauthorized
- Certifique-se de que o token está correto
- Verifique se o token não expirou
- Confirme que está usando "Bearer " antes do token

### Erro 403 Forbidden
- Seu usuário não tem a permissão `admin:manage_system`
- Use um usuário administrador

### Erro 404 Not Found
- Certifique-se de que a API está rodando
- Verifique se a URL está correta
- Confirme que a rota foi registrada corretamente

### Nenhuma renovação foi atualizada
- Verifique se realmente existem renovações pendentes no banco
- Certifique-se de que as renovações passaram pelo fluxo completo
- Verifique os logs do servidor para mais detalhes

## Scripts Relacionados

### limpar-bugadas
Endpoint: `POST /api/renovacoes/limpar-bugadas`

Este script mais antigo verifica renovações de outra forma:
- Se o documento ANTERIOR está ativo, marca como renovado
- Se a data de vencimento passou há mais de 30 dias, marca como perdido

**Diferença:** O script antigo não rastreia o novo documento através do fluxo de cotação/proposta. Use o novo endpoint `fix-pending-renewals` para casos onde o fluxo completo foi seguido.

## Código do Endpoint

O código está em:
- **API Route:** `apps/api/src/routes/renovacoes/fix-pending-renewals.ts`
- **Registrado em:** `apps/api/src/routes/renovacoes/index.ts`

## Suporte

Em caso de problemas:
1. Verifique os logs do servidor API
2. Teste com Postman/Insomnia para ver o erro detalhado
3. Consulte a equipe de desenvolvimento
