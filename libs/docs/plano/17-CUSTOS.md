# 17 - Estimativa de Custos e Otimizações

**Navegação**: [← 16. Testes](./16-TESTES.md) | [Índice](./00-INDICE.md) | [18. Segurança →](./18-SEGURANCA.md)

---

## 🎯 Visão Geral

Análise detalhada de custos do Cloudflare R2 e estratégias de otimização para minimizar despesas.

## 💰 Pricing do Cloudflare R2

### Storage (Armazenamento)

```
$0.015 / GB / mês
```

**Exemplo:**
- 100 GB = $1.50/mês
- 500 GB = $7.50/mês
- 1 TB = $15.00/mês

### Class A Operations (Writes)

```
$4.50 / milhão de operações
$0.0000045 por operação
```

**Incluem:**
- PutObject
- CopyObject
- CompleteMultipartUpload
- CreateMultipartUpload
- ListBuckets
- ListObjects

### Class B Operations (Reads)

```
$0.36 / milhão de operações
$0.00000036 por operação
```

**Incluem:**
- GetObject
- HeadObject
- HeadBucket

### Egress (Saída de Dados)

```
GRÁTIS! 🎉
```

**Principal vantagem sobre AWS S3:**
- S3 cobra $0.09/GB após 100GB/mês
- R2 não cobra nada pela saída de dados

## 📊 Cenários de Uso e Custos

### Cenário 1: Corretora Pequena (5 GB)

```typescript
// Dados mensais
const storage = 5; // GB
const uploads = 500; // arquivos/mês
const downloads = 2000; // downloads/mês

// Cálculos
const storageCost = storage * 0.015;           // $0.075
const writesCost = (uploads / 1_000_000) * 4.50; // $0.00225
const readsCost = (downloads / 1_000_000) * 0.36; // $0.00072

const totalMensal = storageCost + writesCost + readsCost;
// Total: ~$0.08/mês
```

**Custo: ~$0.08/mês ou $0.96/ano**

### Cenário 2: Corretora Média (50 GB)

```typescript
const storage = 50; // GB
const uploads = 2000; // arquivos/mês
const downloads = 10000; // downloads/mês

const storageCost = storage * 0.015;            // $0.75
const writesCost = (uploads / 1_000_000) * 4.50;  // $0.009
const readsCost = (downloads / 1_000_000) * 0.36;  // $0.0036

const totalMensal = storageCost + writesCost + readsCost;
// Total: ~$0.76/mês
```

**Custo: ~$0.76/mês ou $9.12/ano**

### Cenário 3: Corretora Grande (200 GB)

```typescript
const storage = 200; // GB
const uploads = 10000; // arquivos/mês
const downloads = 50000; // downloads/mês

const storageCost = storage * 0.015;             // $3.00
const writesCost = (uploads / 1_000_000) * 4.50;   // $0.045
const readsCost = (downloads / 1_000_000) * 0.36;   // $0.018

const totalMensal = storageCost + writesCost + readsCost;
// Total: ~$3.06/mês
```

**Custo: ~$3.06/mês ou $36.72/ano**

### Cenário 4: Sistema com 10 Corretoras

```typescript
// Mix de corretoras
const corretoras = [
  { storage: 200, uploads: 10000, downloads: 50000 }, // Grande
  { storage: 100, uploads: 5000, downloads: 25000 },  // Média-Grande
  { storage: 50, uploads: 2000, downloads: 10000 },   // Média (x3)
  { storage: 50, uploads: 2000, downloads: 10000 },
  { storage: 50, uploads: 2000, downloads: 10000 },
  { storage: 20, uploads: 1000, downloads: 5000 },    // Pequena (x5)
  { storage: 20, uploads: 1000, downloads: 5000 },
  { storage: 20, uploads: 1000, downloads: 5000 },
  { storage: 20, uploads: 1000, downloads: 5000 },
  { storage: 20, uploads: 1000, downloads: 5000 },
];

function calcularCusto(corretora: any) {
  const storage = corretora.storage * 0.015;
  const writes = (corretora.uploads / 1_000_000) * 4.50;
  const reads = (corretora.downloads / 1_000_000) * 0.36;
  return storage + writes + reads;
}

const custoTotal = corretoras.reduce((sum, c) => sum + calcularCusto(c), 0);
// Storage total: 550 GB
// Custo total: ~$8.80/mês
```

**Sistema com 10 corretoras (550 GB total): ~$8.80/mês ou $105.60/ano**

### Cenário 5: Com Backups

```typescript
// Assumindo backup = 100% do storage principal
const storagePrincipal = 550; // GB
const storageBackup = 550; // GB (bucket separado)
const storageTotal = storagePrincipal + storageBackup; // 1100 GB

// Operações de backup
const backupWrites = 100000; // operações/mês (backups diários)
const backupReads = 10000; // verificações/mês

const storageCost = storageTotal * 0.015;              // $16.50
const writesCost = (backupWrites / 1_000_000) * 4.50;    // $0.45
const readsCost = (backupReads / 1_000_000) * 0.36;      // $0.0036

const totalComBackups = storageCost + writesCost + readsCost;
// Total: ~$16.95/mês
```

**Sistema completo com backups: ~$16.95/mês ou $203.40/ano**

## 📈 Projeções de Crescimento

### Crescimento Linear (1 ano)

```typescript
interface Projecao {
  mes: number;
  storage: number; // GB
  custo: number;   // USD
}

function projetarCrescimento(
  storageInicial: number,
  crescimentoMensal: number, // GB/mês
  meses: number
): Projecao[] {
  const projecoes: Projecao[] = [];
  
  for (let mes = 0; mes <= meses; mes++) {
    const storage = storageInicial + (crescimentoMensal * mes);
    const custo = storage * 0.015 * 2; // Principal + backup
    
    projecoes.push({ mes, storage, custo });
  }
  
  return projecoes;
}

// Exemplo: começar com 100GB, crescer 50GB/mês
const projecao = projetarCrescimento(100, 50, 12);

// Resultado:
// Mês 0:  100GB = $3.00/mês
// Mês 6:  400GB = $12.00/mês
// Mês 12: 700GB = $21.00/mês
```

### Cenário Otimista (Alto Uso)

```
Ano 1: 500GB → $15/mês → $180/ano
Ano 2: 1TB → $30/mês → $360/ano
Ano 3: 2TB → $60/mês → $720/ano
```

### Cenário Realista (Uso Moderado)

```
Ano 1: 300GB → $9/mês → $108/ano
Ano 2: 600GB → $18/mês → $216/ano
Ano 3: 1TB → $30/mês → $360/ano
```

### Cenário Pessimista (Baixo Uso)

```
Ano 1: 100GB → $3/mês → $36/ano
Ano 2: 200GB → $6/mês → $72/ano
Ano 3: 350GB → $10.50/mês → $126/ano
```

## 💡 Estratégias de Otimização

### 1. Compressão de Imagens

```typescript
// Antes de fazer upload, comprimir imagens
import sharp from 'sharp';

async function compressImage(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 }) // Ou webp({ quality: 85 })
    .toBuffer();
}

// Economia estimada: 40-70% no tamanho de imagens
```

**Impacto:**
- Imagem de 5MB → 1.5MB (70% de economia)
- 1000 imagens/mês = 3.5GB economizados
- **Economia: $0.05/mês por corretora**

### 2. Limpeza de Arquivos Antigos

```typescript
// Policy de retenção
const RETENTION_POLICIES = {
  cotacoes_rejeitadas: 90, // dias
  chat_temporario: 180,
  documentos_cancelados: 365,
};

async function cleanupOldFiles() {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - 90);

  // Deletar soft-deleted há mais de 90 dias
  await db.delete(anexos).where(
    and(
      isNotNull(anexos.deletedAt),
      lte(anexos.deletedAt, dataLimite)
    )
  );
}
```

**Impacto:**
- Remove 5-10% de storage a cada 3 meses
- **Economia: $0.08-$0.15/mês por 100GB**

### 3. Deduplicação de Arquivos

```typescript
// Calcular hash SHA256 antes de upload
import crypto from 'crypto';

async function calculateHash(buffer: Buffer): Promise<string> {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function uploadWithDedup(file: Buffer, corretoraId: string) {
  const hash = await calculateHash(file);
  
  // Verificar se já existe
  const existente = await db.query.anexos.findFirst({
    where: and(
      eq(anexos.corretoraId, corretoraId),
      eq(anexos.sha256, hash)
    ),
  });

  if (existente) {
    // Reusar arquivo existente (criar novo registro, mesma r2Key)
    return { ...existente, deduplicado: true };
  }

  // Upload normal
  return uploadToR2(file);
}
```

**Impacto:**
- Em sistemas com muitos documentos padrão (formulários, templates)
- Pode economizar 10-20% de storage
- **Economia: $0.15-$0.30/mês por 100GB**

### 4. Lifecycle Policies (R2 Auto-Cleanup)

```typescript
// Configurar via Cloudflare Dashboard ou API
// Mover arquivos antigos para tier mais barato (quando disponível)

const lifecyclePolicy = {
  rules: [
    {
      action: 'Delete',
      filter: {
        prefix: 'temp/',
      },
      expiration: {
        days: 1, // Deletar temp files após 1 dia
      },
    },
    {
      action: 'Delete',
      filter: {
        prefix: 'backups/incremental/',
      },
      expiration: {
        days: 30, // Deletar backups incrementais após 30 dias
      },
    },
  ],
};
```

**Impacto:**
- Automático, sem código
- Remove backups antigos automaticamente
- **Economia: Variável, depende do volume de backups**

### 5. Limites por Tenant

```typescript
// Implementar limites para evitar crescimento descontrolado
const STORAGE_LIMITS = {
  plano_basico: 10 * 1024 * 1024 * 1024,      // 10GB
  plano_profissional: 50 * 1024 * 1024 * 1024, // 50GB
  plano_enterprise: 200 * 1024 * 1024 * 1024,  // 200GB
};

// Bloquear upload se limite atingido
async function checkLimit(corretoraId: string) {
  const usage = await metricsService.calculateUsage(corretoraId);
  const limit = await getCorretoraLimit(corretoraId);
  
  if (usage.totalBytes >= limit) {
    throw new Error('Limite de storage atingido');
  }
}
```

**Impacto:**
- Evita surpresas de custo
- Incentiva gestão consciente de arquivos
- **Proteção contra crescimento descontrolado**

### 6. Conversão de PDFs para WebP (Thumbnails)

```typescript
// Gerar thumbnails leves para preview
import { fromPath } from 'pdf2pic';

async function generateThumbnail(pdfPath: string): Promise<Buffer> {
  const convert = fromPath(pdfPath, {
    density: 100,
    saveFilename: 'thumbnail',
    savePath: '/tmp',
    format: 'webp',
    width: 300,
    height: 400,
  });

  const result = await convert(1); // Primeira página
  return fs.readFileSync(result.path);
}
```

**Impacto:**
- Thumbnail de 50KB vs PDF completo de 5MB
- Melhora performance de listagem
- **Economia indireta: menos operações GetObject**

## 📊 Comparação com AWS S3

### Mesma Configuração (500GB + Backups)

**Cloudflare R2:**
```
Storage: 1TB × $0.015 = $15.00
Writes: 100k × $0.0000045 = $0.45
Reads: 50k × $0.00000036 = $0.018
Egress: GRÁTIS
---
Total: $15.47/mês
```

**AWS S3 Standard:**
```
Storage: 1TB × $0.023 = $23.00
PUT: 100k × $0.000005 = $0.50
GET: 50k × $0.0000004 = $0.02
Egress (1TB): 1024GB × $0.09 = $92.16
---
Total: $115.68/mês
```

**Economia com R2: $100.21/mês ou $1,202.52/ano (87% mais barato!)**

## 🎯 Estimativa Final por Tenant

### Calculadora de Custo

```typescript
interface TenantCostEstimate {
  storageGB: number;
  uploadsPerMonth: number;
  downloadsPerMonth: number;
  backupEnabled: boolean;
  custoMensal: number;
  custoAnual: number;
}

function estimateTenantCost(
  storageGB: number,
  uploadsPerMonth: number,
  downloadsPerMonth: number,
  backupEnabled: boolean = true
): TenantCostEstimate {
  // Storage (principal + backup se habilitado)
  const storageFactor = backupEnabled ? 2 : 1;
  const storageCost = storageGB * 0.015 * storageFactor;

  // Operações
  const writesCost = (uploadsPerMonth / 1_000_000) * 4.50;
  const readsCost = (downloadsPerMonth / 1_000_000) * 0.36;

  // Backup operations (se habilitado)
  let backupOperationsCost = 0;
  if (backupEnabled) {
    const backupWrites = (storageGB * 100) / 1_000_000 * 4.50; // Estimativa
    const backupReads = (storageGB * 10) / 1_000_000 * 0.36;
    backupOperationsCost = backupWrites + backupReads;
  }

  const custoMensal = storageCost + writesCost + readsCost + backupOperationsCost;
  const custoAnual = custoMensal * 12;

  return {
    storageGB,
    uploadsPerMonth,
    downloadsPerMonth,
    backupEnabled,
    custoMensal: parseFloat(custoMensal.toFixed(2)),
    custoAnual: parseFloat(custoAnual.toFixed(2)),
  };
}

// Exemplos de uso:
console.log(estimateTenantCost(10, 500, 2000, true));
// { storageGB: 10, custoMensal: 0.30, custoAnual: 3.60 }

console.log(estimateTenantCost(100, 5000, 20000, true));
// { storageGB: 100, custoMensal: 3.03, custoAnual: 36.36 }

console.log(estimateTenantCost(500, 20000, 100000, true));
// { storageGB: 500, custoMensal: 15.18, custoAnual: 182.16 }
```

## 💰 ROI (Return on Investment)

### Custo de Desenvolvimento vs Economias

**Investimento Inicial:**
- Desenvolvimento: ~80h de trabalho
- Custo estimado: $4,000 - $8,000 (dependendo da taxa horária)

**Economias Anuais (comparado a S3):**
- 10 corretoras (500GB): ~$1,200/ano economizados
- 50 corretoras (2TB): ~$4,800/ano economizados
- 100 corretoras (5TB): ~$12,000/ano economizados

**Payback Period:**
- Com 10 corretoras: 4-7 meses
- Com 50 corretoras: 1-2 meses
- Com 100 corretoras: < 1 mês

## 📋 Checklist de Otimização

- [ ] Implementar compressão de imagens
- [ ] Configurar lifecycle policies no R2
- [ ] Implementar deduplicação de arquivos
- [ ] Criar job de limpeza de arquivos antigos
- [ ] Definir limites por tenant
- [ ] Monitorar custos mensalmente
- [ ] Gerar relatórios de uso por corretora
- [ ] Implementar alertas de custo anormal
- [ ] Revisar retenção de backups
- [ ] Otimizar thumbnails e previews

## 📊 Dashboard de Custos

```typescript
// libs/shared/database/src/services/cost-tracking.service.ts

export class CostTrackingService {
  /**
   * Calcula custo estimado de uma corretora
   */
  async calculateCorretoraMonthlyCost(corretoraId: string): Promise<number> {
    const usage = await metricsService.calculateUsage(corretoraId);
    
    // Storage cost (com backup)
    const storageGB = Number(usage.totalBytes) / (1024 ** 3);
    const storageCost = storageGB * 0.015 * 2;

    // Operations cost (estimado)
    const operationsCost = (usage.totalArquivos * 2) / 1_000_000 * 4.50;

    return storageCost + operationsCost;
  }

  /**
   * Relatório mensal de custos
   */
  async generateMonthlyCostReport(): Promise<{
    total: number;
    porCorretora: Array<{ corretoraId: string; custo: number }>;
  }> {
    const corretoras = await db.query.corretoras.findMany();
    
    const custos = await Promise.all(
      corretoras.map(async (c) => ({
        corretoraId: c.id,
        nomeFantasia: c.nomeFantasia,
        custo: await this.calculateCorretoraMonthlyCount(c.id),
      }))
    );

    const total = custos.reduce((sum, c) => sum + c.custo, 0);

    return { total, porCorretora: custos };
  }
}
```

## 📝 Próximo Documento

Continue com **[18-SEGURANCA.md](./18-SEGURANCA.md)** para considerações de segurança.

---

**Navegação**: [← 16. Testes](./16-TESTES.md) | [Índice](./00-INDICE.md) | [18. Segurança →](./18-SEGURANCA.md)
