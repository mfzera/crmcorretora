# ✅ Integração de Templates de Cargos Concluída

## 📋 Resumo da Implementação

A integração dos **templates fixos de cargos** foi concluída com sucesso na página `/usuarios`. Agora você tem templates pré-configurados (Gerente, Vendedor, Cadastro) que **não ficam no banco de dados** e servem como base para criar cargos rapidamente.

---

## 🎯 O que foi feito

### 1. **Templates Fixos em Código** (`libs/shared/utils/src/cargos-padrao.ts`)

Criamos 3 templates fixos:

| Template | Cor | Permissões | Flags |
|----------|-----|------------|-------|
| 🟢 **GERENTE** | Verde `#10b981` | ~80 permissões | `isGestor: true` |
| 🔵 **VENDEDOR** | Azul `#3b82f6` | ~50 permissões | `isVendedor: true` |
| 🟠 **CADASTRO** | Laranja `#f59e0b` | ~30 permissões | Operacional |

**Funções disponíveis:**
```typescript
// Obter todos os templates
const templates = getCargoTemplateOptions();

// Obter template específico
const gerente = getCargoTemplate('GERENTE');

// Buscar por nome
const result = findCargoTemplateByName('vendedor');

// Converter permissões para IDs do DB
const ids = getPermissaoIdsByNames(template.permissoes, permissoesGlobais);
```

### 2. **Dialog de Seleção de Templates** (`template-selector-dialog.tsx`)

Modificamos o dialog para mostrar os templates fixos:

**Fluxo:**
1. **Tela de Seleção**: Mostra botão "Criar do Zero" + 3 templates fixos
2. **Tela de Personalização**: Permite editar nome, descrição e cor
3. **Criação**: Cria o cargo no DB com as permissões do template

**Características:**
- ✅ Exibe ícones personalizados para cada template (Shield, Users, FileText)
- ✅ Mostra quantidade de permissões de cada template
- ✅ Indica se é perfil Gestor/Vendedor/Admin
- ✅ Cores visuais com bordas laterais coloridas
- ✅ Permite personalizar nome, descrição e cor antes de criar

### 3. **Hook de Permissões** (`lib/queries/permissoes.ts`)

Adicionamos `usePermissoesGlobais()` que retorna array flat de permissões:

```typescript
const { data: permissoesGlobaisArray = [] } = usePermissoesGlobais();

// Usado para converter nomes de permissões em IDs
const ids = getPermissaoIdsByNames(
  template.permissoes,
  permissoesGlobaisArray
);
```

---

## 🚀 Como Usar

### Na UI (`/usuarios`)

1. Acesse `/usuarios` (rota: `apps/web/src/app/(app)/usuarios/page.tsx`)
2. Vá na aba **"Cargos"**
3. Clique no botão **"+ Novo Cargo"**
4. Escolha uma das opções:
   - **"Criar do Zero"** → Abre o modal antigo com seleção manual de permissões
   - **"GERENTE"** → Cria cargo baseado no template Gerente
   - **"VENDEDOR"** → Cria cargo baseado no template Vendedor
   - **"CADASTRO"** → Cria cargo baseado no template Cadastro

5. Na tela de personalização:
   - Edite o **nome** (ex: "Gerente de Vendas Regional")
   - Edite a **descrição** (opcional)
   - Escolha uma **cor** diferente (opcional)
   - Clique em **"Criar Cargo"**

6. O sistema:
   - Cria o cargo no DB
   - Converte as permissões do template em IDs
   - Associa automaticamente as permissões ao cargo
   - Mostra toast de sucesso

### No Código

```typescript
import {
  getCargoTemplate,
  getPermissaoIdsByNames,
} from '@ecotech/shared/utils';

// 1. Obter template
const template = getCargoTemplate('GERENTE');

// 2. Criar cargo
const cargo = await criarCargo({
  nomeCargo: 'Gerente Regional',
  descricao: template.descricao,
  cor: template.cor,
  isGestor: template.isGestor,
  isVendedor: template.isVendedor,
});

// 3. Converter permissões
const permissaoIds = getPermissaoIdsByNames(
  template.permissoes,
  permissoesGlobais
);

// 4. Atribuir permissões
await atribuirPermissoes({
  cargoId: cargo.id,
  permissaoIds,
});
```

---

## 📂 Arquivos Modificados/Criados

```
libs/shared/utils/src/
├── cargos-padrao.ts                    # ✨ Templates fixos e funções utilitárias
├── cargos-padrao.examples.md          # ✨ Guia de uso completo
└── index.ts                            # ✅ Export dos templates

apps/web/src/
├── components/usuarios/
│   └── template-selector-dialog.tsx   # ✅ Integração dos templates fixos
└── lib/queries/
    └── permissoes.ts                   # ✅ Hook usePermissoesGlobais()
```

---

## 🎨 Visual da Interface

### Tela 1: Seleção de Template

```
┌─────────────────────────────────────────┐
│  ✨ Criar Novo Cargo                   │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  + Criar do Zero                  │ │
│  │  Configure todas as permissões    │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ───── Templates Fixos ─────           │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 🟢 🛡️  GERENTE                   → │
│  │    Supervisiona vendas, aprova    │ │
│  │    🔑 80 permissões | Gestor      │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 🔵 👥  VENDEDOR                   → │
│  │    Cria e gerencia suas vendas    │ │
│  │    🔑 50 permissões | Vendedor    │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 🟠 📄  CADASTRO                   → │
│  │    Valida documentação            │ │
│  │    🔑 30 permissões               │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Tela 2: Personalizar Cargo

```
┌─────────────────────────────────────────┐
│  Personalizar Cargo                     │
│  Baseado no template: Gerente           │
├─────────────────────────────────────────┤
│                                         │
│  Nome do Cargo *                        │
│  ┌───────────────────────────────────┐ │
│  │ Gerente de Vendas Regional        │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Descrição                              │
│  ┌───────────────────────────────────┐ │
│  │ Responsável por vendas...         │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Cor do Cargo                           │
│  🟦 🟩 🟪 🟧 🟥 🟨 🟦 🟧 🟩 🔵        │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 📋 Incluído neste template:       │ │
│  │ • 80 permissões pré-configuradas  │ │
│  │ • Perfil: Gestor de equipe        │ │
│  │                                   │ │
│  │ Você poderá ajustar permissões    │ │
│  │ após a criação.                   │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [ Voltar ]  [ Criar Cargo ]           │
└─────────────────────────────────────────┘
```

---

## ➕ Como Adicionar Novos Templates

Para criar um novo template (ex: **ASSISTENTE**):

1. Abra `libs/shared/utils/src/cargos-padrao.ts`

2. Adicione ao objeto `CARGOS_PADRAO`:

```typescript
export const CARGOS_PADRAO = {
  // ... templates existentes

  ASSISTENTE: {
    nomeCargo: 'Assistente',
    descricao: 'Auxilia vendedores nas operações diárias',
    cor: '#8b5cf6', // roxo
    isGestor: false,
    isVendedor: false,
    permissoes: [
      'dashboard:visualizar',
      'clientes:visualizar',
      'vendas:visualizar_cotacao',
      // ... outras permissões
    ],
  },
} as const satisfies Record<string, CargoTemplate>;
```

3. Atualize o mapa de cores:

```typescript
export const CARGO_TEMPLATE_CORES = {
  GERENTE: '#10b981',
  VENDEDOR: '#3b82f6',
  CADASTRO: '#f59e0b',
  ASSISTENTE: '#8b5cf6', // 👈 adicione aqui
} as const;
```

4. Adicione o ícone em `template-selector-dialog.tsx`:

```typescript
import { HelpCircle } from 'lucide-react';

const TEMPLATE_ICONS: Record<CargosPadraoKeys, React.ComponentType<any>> = {
  GERENTE: Shield,
  VENDEDOR: Users,
  CADASTRO: FileText,
  ASSISTENTE: HelpCircle, // 👈 adicione aqui
};
```

5. Compile o pacote:

```bash
npx nx build utils
```

6. Pronto! O novo template aparecerá automaticamente na UI.

---

## 🧪 Como Testar

1. **Inicie o servidor:**
   ```bash
   npx nx serve api
   npx nx serve web
   ```

2. **Acesse:** http://localhost:4200/usuarios

3. **Teste o fluxo:**
   - Clique na aba "Cargos"
   - Clique em "+ Novo Cargo"
   - Selecione um template (ex: VENDEDOR)
   - Personalize o nome: "Vendedor Sênior"
   - Escolha uma cor diferente
   - Clique em "Criar Cargo"
   - ✅ Verifique se o cargo foi criado com as permissões corretas

4. **Validar permissões:**
   - Clique no cargo criado
   - Vá em "Permissões"
   - Verifique se todas as permissões do template foram atribuídas

---

## 🔍 Troubleshooting

### Erro: "Cannot find module '@ecotech/shared/utils'"

**Solução:**
```bash
npx nx build utils
```

### Permissões não são atribuídas

**Causa:** Nomes de permissões no template não correspondem aos do DB

**Solução:** Use a função de validação:
```typescript
import { validateTemplatePermissions } from '@ecotech/shared/utils';

const missing = validateTemplatePermissions(template, permissoesGlobais);
if (missing.length > 0) {
  console.error('Permissões faltando:', missing);
}
```

### Templates não aparecem na UI

**Checklist:**
1. ✅ Pacote `utils` foi compilado?
2. ✅ Export em `libs/shared/utils/src/index.ts` está correto?
3. ✅ Import no componente está usando `@ecotech/shared/utils`?
4. ✅ Dev server foi reiniciado após modificações?

---

## 📚 Documentação Adicional

- **Guia completo de uso:** `libs/shared/utils/src/cargos-padrao.examples.md`
- **Código dos templates:** `libs/shared/utils/src/cargos-padrao.ts`
- **Componente do dialog:** `apps/web/src/components/usuarios/template-selector-dialog.tsx`

---

## ✨ Próximos Passos (Opcionais)

- [ ] Adicionar mais templates (Assistente, Coordenador, etc)
- [ ] Criar testes unitários para os templates
- [ ] Adicionar preview de permissões antes de criar
- [ ] Permitir editar templates após criação
- [ ] Exportar/importar templates personalizados

---

**🎉 Integração concluída com sucesso!** 

Os templates fixos agora estão totalmente integrados na página `/usuarios` e prontos para uso.
