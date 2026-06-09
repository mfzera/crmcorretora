# Templates de Cargos - Guia de Uso

Este arquivo contém exemplos de como usar os templates fixos de cargos do sistema EcoTech.

## 📋 Templates Disponíveis

Os templates são definidos em `cargos-padrao.ts` e **não ficam no banco de dados**. São definições fixas em código que servem como base para criar cargos nas corretoras.

### Templates atuais:

1. **GERENTE** (verde `#10b981`)
   - Supervisiona vendas, aprova documentos e gerencia equipe
   - `isGestor: true`, `isVendedor: false`
   - Acesso completo a métricas, relatórios e gestão de equipe

2. **VENDEDOR** (azul `#3b82f6`)
   - Cria e gerencia suas próprias vendas e clientes
   - `isGestor: false`, `isVendedor: true`
   - Acesso apenas aos seus próprios dados

3. **CADASTRO** (laranja `#f59e0b`)
   - Valida documentação e ativa apólices
   - `isGestor: false`, `isVendedor: false`
   - Foco em validação e aprovação de documentos

---

## 🔧 Como Usar

### 1. Listar todos os templates

```typescript
import { getAllCargoTemplates, getCargoTemplateOptions } from '@ecotech/shared/utils';

// Obter array de templates completos
const templates = getAllCargoTemplates();
templates.forEach(t => {
  console.log(`${t.nomeCargo}: ${t.permissoes.length} permissões`);
});

// Obter opções formatadas para select/combobox
const options = getCargoTemplateOptions();
// [
//   { value: 'GERENTE', label: 'Gerente', description: '...', cor: '#10b981' },
//   { value: 'VENDEDOR', label: 'Vendedor', description: '...', cor: '#3b82f6' },
//   ...
// ]
```

### 2. Obter um template específico

```typescript
import { getCargoTemplate } from '@ecotech/shared/utils';

const gerenteTemplate = getCargoTemplate('GERENTE');

console.log(gerenteTemplate.nomeCargo); // "Gerente"
console.log(gerenteTemplate.descricao);
console.log(gerenteTemplate.isGestor); // true
console.log(gerenteTemplate.permissoes.length); // ~80 permissões
```

### 3. Buscar template pelo nome

```typescript
import { findCargoTemplateByName } from '@ecotech/shared/utils';

const result = findCargoTemplateByName('vendedor');

if (result) {
  console.log(result.key); // 'VENDEDOR'
  console.log(result.template.nomeCargo); // 'Vendedor'
}
```

### 4. Criar cargo a partir de template

```typescript
import { getCargoTemplate, getPermissaoIdsByNames } from '@ecotech/shared/utils';
import { db } from '@ecotech/shared/database';

async function criarCargoDeTemplate(
  corretoraId: string,
  templateKey: CargosPadraoKeys,
  permissoesGlobais: Array<{ id: string; nomePermissao: string }>,
) {
  const template = getCargoTemplate(templateKey);

  // 1. Criar o cargo
  const [novoCargo] = await db.insert(cargos).values({
    corretoraId,
    nomeCargo: template.nomeCargo,
    descricao: template.descricao,
    cor: template.cor,
    isGestor: template.isGestor,
    isVendedor: template.isVendedor,
  }).returning();

  // 2. Converter nomes de permissões em IDs
  const permissaoIds = getPermissaoIdsByNames(
    template.permissoes,
    permissoesGlobais,
  );

  // 3. Associar permissões ao cargo
  if (permissaoIds.length > 0) {
    await db.insert(cargoPermissoes).values(
      permissaoIds.map(permissaoId => ({
        cargoId: novoCargo.id,
        permissaoGlobalId: permissaoId,
      })),
    );
  }

  return novoCargo;
}

// Uso:
const permissoes = await db.select().from(permissoesGlobais);
const cargo = await criarCargoDeTemplate(
  'corretora-123',
  'GERENTE',
  permissoes,
);
```

### 5. Validar permissões de template

```typescript
import { validateTemplatePermissions, getCargoTemplate } from '@ecotech/shared/utils';

const template = getCargoTemplate('GERENTE');
const permissoesGlobais = await db.select({
  nomePermissao: permissoesGlobais.nomePermissao
}).from(permissoesGlobais);

const missing = validateTemplatePermissions(template, permissoesGlobais);

if (missing.length > 0) {
  console.error('⚠️ Permissões faltando no banco:', missing);
  // Essas permissões estão no template mas não existem em permissoesGlobais
}
```

### 6. Usar em componente React

```tsx
import { getCargoTemplateOptions } from '@ecotech/shared/utils';
import { Select, SelectItem } from '@/components/ui/select';

function NovoCargoDialog() {
  const [templateSelecionado, setTemplateSelecionado] = useState<string>('');
  const templates = getCargoTemplateOptions();

  return (
    <Select value={templateSelecionado} onValueChange={setTemplateSelecionado}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione um template" />
      </SelectTrigger>
      <SelectContent>
        {templates.map((template) => (
          <SelectItem key={template.value} value={template.value}>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: template.cor }}
              />
              <div>
                <div className="font-medium">{template.label}</div>
                <div className="text-xs text-muted-foreground">
                  {template.description}
                </div>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

---

## 🎨 Acessar Cores dos Templates

```typescript
import { CARGO_TEMPLATE_CORES } from '@ecotech/shared/utils';

console.log(CARGO_TEMPLATE_CORES.GERENTE);   // '#10b981'
console.log(CARGO_TEMPLATE_CORES.VENDEDOR);  // '#3b82f6'
console.log(CARGO_TEMPLATE_CORES.CADASTRO);  // '#f59e0b'
```

---

## ➕ Como Adicionar Novos Templates

Para adicionar um novo template de cargo:

1. Abra `libs/shared/utils/src/cargos-padrao.ts`

2. Adicione o novo template ao objeto `CARGOS_PADRAO`:

```typescript
export const CARGOS_PADRAO = {
  // ... templates existentes ...

  ASSISTENTE: {
    nomeCargo: 'Assistente',
    descricao: 'Auxilia vendedores e gerentes nas operações diárias',
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

4. Pronto! O TypeScript automaticamente reconhecerá o novo template.

---

## 🔍 TypeScript: Tipos Disponíveis

```typescript
import type {
  CargoTemplate,        // Interface do template
  CargosPadraoKeys,     // 'GERENTE' | 'VENDEDOR' | 'CADASTRO'
} from '@ecotech/shared/utils';

// Uso com type-safety
function processarCargo(key: CargosPadraoKeys) {
  const template = getCargoTemplate(key); // ✅ type-safe
  // ...
}

processarCargo('GERENTE');  // ✅ OK
processarCargo('INVALIDO'); // ❌ Erro do TypeScript
```

---

## 📝 Notas Importantes

1. **Templates não são persistidos**: São apenas definições em código
2. **Cargos no DB são criados a partir dos templates**: Cada corretora tem seus próprios cargos no banco
3. **Permissões são strings**: Devem corresponder aos `nomePermissao` em `permissoesGlobais`
4. **Cores são opcionais**: Mas ajudam na identificação visual
5. **Use `getCargoTemplate()` ao invés de `getCargoPadraoDefinition()`**: Funções antigas estão deprecated

---

## 🧪 Testes

```typescript
import { describe, it, expect } from '@jest/globals';
import {
  getCargoTemplate,
  getAllCargoTemplates,
  findCargoTemplateByName,
  CARGO_TEMPLATE_KEYS,
} from '@ecotech/shared/utils';

describe('Templates de Cargos', () => {
  it('deve retornar todos os templates', () => {
    const templates = getAllCargoTemplates();
    expect(templates).toHaveLength(3);
    expect(templates[0]).toHaveProperty('nomeCargo');
    expect(templates[0]).toHaveProperty('permissoes');
  });

  it('deve retornar template específico', () => {
    const gerente = getCargoTemplate('GERENTE');
    expect(gerente.nomeCargo).toBe('Gerente');
    expect(gerente.isGestor).toBe(true);
    expect(gerente.permissoes.length).toBeGreaterThan(0);
  });

  it('deve encontrar template por nome', () => {
    const result = findCargoTemplateByName('vendedor');
    expect(result).not.toBeNull();
    expect(result?.key).toBe('VENDEDOR');
  });

  it('deve ter todas as chaves esperadas', () => {
    expect(CARGO_TEMPLATE_KEYS).toContain('GERENTE');
    expect(CARGO_TEMPLATE_KEYS).toContain('VENDEDOR');
    expect(CARGO_TEMPLATE_KEYS).toContain('CADASTRO');
  });
});
```
