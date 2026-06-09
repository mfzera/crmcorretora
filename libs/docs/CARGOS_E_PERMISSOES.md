# 🔐 Estrutura de Cargos e Permissões - EcoTech

## 📋 Cargos Padrão

Quando uma nova corretora é registrada na plataforma, 4 cargos padrão são criados automaticamente com suas respectivas permissões:

---

## 1️⃣ **Dono da Corretora** (Administrador)

**Descrição:** Dono da corretora com acesso total ao sistema

**Características:**
- `isAdmin: true`
- `isGestor: false`
- `isVendedor: false`

**Permissões:** ✅ **TODAS** (acesso irrestrito)

**O que pode fazer:**
- Tudo no sistema
- Gerenciar configurações da corretora
- Criar e gerenciar cargos e permissões
- Gerenciar planos e assinaturas
- Acesso total a usuários, vendas, clientes e relatórios

---

## 2️⃣ **Gerente**

**Descrição:** Supervisiona vendas, aprova documentos e gerencia equipe

**Características:**
- `isAdmin: false`
- `isGestor: true`
- `isVendedor: false`

**Permissões:**

### 📊 Vendas (Supervisão Total)
- ✅ `vendas:criar_cotacao`
- ✅ `vendas:visualizar_cotacao`
- ✅ `vendas:editar_cotacao`
- ✅ `vendas:excluir_cotacao`
- ✅ `vendas:criar_proposta`
- ✅ `vendas:visualizar_proposta`
- ✅ `vendas:editar_proposta`
- ✅ `vendas:criar_documento_venda`
- ✅ `vendas:visualizar_documento_venda`
- ✅ `vendas:visualizar_todos_documentos` ⭐ **Diferencial**
- ✅ `vendas:editar_documento_venda`
- ✅ `vendas:cancelar_venda`
- ✅ `vendas:criar_endosso`
- ✅ `vendas:aprovar_endosso` ⭐ **Diferencial**

### 📝 Cadastro
- ✅ `cadastro:validar_documentos`
- ✅ `cadastro:aprovar_venda`
- ✅ `cadastro:rejeitar_venda`

### 👥 Clientes (Acesso Total)
- ✅ `clientes:criar`
- ✅ `clientes:visualizar`
- ✅ `clientes:visualizar_todos` ⭐ **Diferencial**
- ✅ `clientes:editar`
- ✅ `clientes:excluir`
- ✅ `clientes:transferir_carteira` ⭐ **Diferencial**

### 👤 Usuários (Gestão de Equipe)
- ✅ `usuarios:criar`
- ✅ `usuarios:visualizar`
- ✅ `usuarios:atribuir_cargo`

### 📈 Relatórios (Acesso Completo)
- ✅ `relatorios:vendas`
- ✅ `relatorios:comissoes`
- ✅ `relatorios:financeiro`
- ✅ `relatorios:exportar`

**O que NÃO pode fazer:**
- ❌ Gerenciar cargos e permissões
- ❌ Editar configurações da corretora
- ❌ Gerenciar integrações

---

## 3️⃣ **Vendedor**

**Descrição:** Cria e gerencia suas próprias vendas e clientes

**Características:**
- `isAdmin: false`
- `isGestor: false`
- `isVendedor: true`

**Permissões:**

### 📊 Vendas (Apenas as Próprias)
- ✅ `vendas:criar_cotacao`
- ✅ `vendas:visualizar_cotacao`
- ✅ `vendas:editar_cotacao`
- ✅ `vendas:excluir_cotacao`
- ✅ `vendas:criar_proposta`
- ✅ `vendas:visualizar_proposta`
- ✅ `vendas:editar_proposta`
- ✅ `vendas:criar_documento_venda`
- ✅ `vendas:visualizar_documento_venda`
- ✅ `vendas:editar_documento_venda`
- ✅ `vendas:criar_endosso`

### 👥 Clientes (Apenas os Próprios)
- ✅ `clientes:criar`
- ✅ `clientes:visualizar`
- ✅ `clientes:editar`

### 📈 Relatórios (Apenas Suas Vendas)
- ✅ `relatorios:vendas`
- ✅ `relatorios:comissoes`
- ✅ `relatorios:exportar`

**O que NÃO pode fazer:**
- ❌ Ver vendas de outros vendedores
- ❌ Aprovar/rejeitar cadastros
- ❌ Cancelar vendas
- ❌ Aprovar endossos
- ❌ Ver ou editar clientes de outros vendedores
- ❌ Transferir carteira de clientes
- ❌ Gerenciar usuários
- ❌ Acessar relatórios financeiros completos

---

## 4️⃣ **Cadastro**

**Descrição:** Valida documentação e ativa apólices

**Características:**
- `isAdmin: false`
- `isGestor: false`
- `isVendedor: false`

**Permissões:**

### 📝 Cadastro (Função Principal)
- ✅ `cadastro:validar_documentos`
- ✅ `cadastro:aprovar_venda`
- ✅ `cadastro:rejeitar_venda`

### 📊 Vendas (Visualização e Edição de Apólices)
- ✅ `vendas:visualizar_documento_venda`
- ✅ `vendas:visualizar_todos_documentos` ⭐ **Precisa ver todos para cadastrar**
- ✅ `vendas:editar_documento_venda` ⭐ **Para adicionar número de apólice**

### 👥 Clientes (Apenas Visualização)
- ✅ `clientes:visualizar`
- ✅ `clientes:visualizar_todos`

**O que NÃO pode fazer:**
- ❌ Criar vendas
- ❌ Criar/editar/excluir clientes
- ❌ Cancelar vendas
- ❌ Criar endossos
- ❌ Gerenciar usuários
- ❌ Acessar relatórios

---

## 🔄 Fluxo de Trabalho Típico

```
1. VENDEDOR cria cotação e proposta
   ↓
2. VENDEDOR confirma venda (status: AGUARDANDO_CADASTRO)
   ↓
3. CADASTRO valida documentação
   ↓
4. CADASTRO aprova cadastro e adiciona nº da apólice (status: ATIVO)
   ↓
5. Sistema cria RENOVAÇÃO automaticamente
   ↓
6. GERENTE supervisiona todo o processo e pode intervir
   ↓
7. DONO DA CORRETORA tem visão completa e controle total
```

---

## 🛠️ Personalização de Cargos

### Cargos Personalizados
O **Dono da Corretora** pode:
- Criar cargos personalizados via API
- Atribuir permissões específicas a cada cargo
- Editar descrições e configurações dos cargos

### Modificar Cargos Padrão
- ✅ Gerente, Vendedor e Cadastro: **podem ser editados**
- ❌ Administrador: **não pode ser editado** (proteção do sistema)

---

## 📝 Referência Técnica

### Arquivo de Definições
- **Código:** `libs/shared/utils/src/cargos-padrao.ts`
- **Criação:** `apps/api/src/routes/auth/index.ts` (registro de seguradora)

### Como Adicionar Nova Permissão

1. Adicione a permissão em `libs/shared/database/src/seed.ts`:
```typescript
{
  nomePermissao: 'modulo:acao',
  descricao: 'Descrição da ação',
  grupo: 'nome_do_grupo',
}
```

2. Adicione aos cargos apropriados em `cargos-padrao.ts`:
```typescript
GERENTE: {
  permissoes: [
    // ... permissões existentes
    'modulo:acao',
  ],
}
```

3. Execute o seed novamente (afeta apenas novas corretoras):
```bash
npm run seed
```

---

## ⚠️ Importante

- As permissões são atribuídas **no momento do registro** da corretora
- Corretoras já existentes **não são afetadas** por mudanças nas definições
- Para atualizar permissões de corretoras existentes, use o endpoint:
  - `POST /cargos/:id/permissoes`

---

## 📊 Matriz de Permissões

| Permissão | Admin | Gerente | Vendedor | Cadastro |
|-----------|-------|---------|----------|----------|
| **Criar Vendas** | ✅ | ✅ | ✅ | ❌ |
| **Ver Todas Vendas** | ✅ | ✅ | ❌ | ✅ |
| **Aprovar Cadastro** | ✅ | ✅ | ❌ | ✅ |
| **Cancelar Vendas** | ✅ | ✅ | ❌ | ❌ |
| **Ver Todos Clientes** | ✅ | ✅ | ❌ | ✅ |
| **Criar Clientes** | ✅ | ✅ | ✅ | ❌ |
| **Transferir Carteira** | ✅ | ✅ | ❌ | ❌ |
| **Gerenciar Usuários** | ✅ | ✅ | ❌ | ❌ |
| **Relatórios Completos** | ✅ | ✅ | ❌ | ❌ |
| **Gerenciar Cargos** | ✅ | ❌ | ❌ | ❌ |
| **Configurações** | ✅ | ❌ | ❌ | ❌ |

---

**Última Atualização:** 2025-12-30
