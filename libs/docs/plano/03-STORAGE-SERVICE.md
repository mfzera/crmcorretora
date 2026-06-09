# 03 - Storage Service (R2 Client)

## 📦 Estrutura do Módulo

```
libs/shared/storage/
├── src/
│   ├── index.ts           # Export principal + StorageService
│   ├── r2-client.ts       # Cliente R2 (SDK AWS S3)
│   ├── pdf-extractor.ts   # Extração de texto de PDFs
│   └── types.ts           # Types compartilhados
├── package.json
└── tsconfig.json
```

## 📄 Arquivo: `package.json`

```json
{
  "name": "@ecotech/storage",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.515.0",
    "@aws-sdk/s3-request-presigner": "^3.515.0",
    "pdf-parse": "^1.1.1",
    "@ecotech/shared/database": "workspace:*",
    "@ecotech/shared/utils": "workspace:*"
  }
}
```

## 🔧 Arquivo: `src/types.ts`

```typescript
export interface UploadParams {
  file: Buffer;
  fileName: string;
  mimeType: string;
  corretoraId: string;
  entidadeTipo: 'cotacao' | 'documento_venda' | 'mensagem_chat';
  entidadeId: string;
  uploadPorId: string;
}

export interface UploadResult {
  anexo: Anexo;
  urlAssinada: string;
}

export interface ExtractedPdfData {
  text: string;
  metadata: {
    totalPages: number;
    author?: string;
    title?: string;
    creationDate?: Date;
  };
}

export interface StorageUsage {
  totalFiles: number;
  totalBytes: number;
  byType: {
    cotacoes: number;
    documentos: number;
    chat: number;
  };
}

export interface LimitStatus {
  ok: boolean;
  shouldAlert: boolean;
  percentUsed: number;
  bytesUsed: number;
  bytesLimit: number;
}
```

## ☁️ Arquivo: `src/r2-client.ts`

```typescript
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@ecotech/shared/utils';

export class R2Client {
  private client: S3Client;
  private bucket: string;

  constructor() {
    // Configurar cliente S3 para R2
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });

    this.bucket = env.R2_BUCKET_NAME;
  }

  /**
   * Upload arquivo para R2
   */
  async upload(
    key: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      // Metadata adicional
      Metadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    await this.client.send(command);
  }

  /**
   * Download arquivo do R2
   */
  async download(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);

    // Converter stream para buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Gerar URL assinada para download (válida por 24h)
   */
  async getSignedDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, {
      expiresIn: 24 * 60 * 60, // 24 horas
    });
  }

  /**
   * Gerar URL assinada para upload (válida por 1h)
   */
  async getSignedUploadUrl(
    key: string,
    mimeType: string
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    });

    return await getSignedUrl(this.client, command, {
      expiresIn: 60 * 60, // 1 hora
    });
  }

  /**
   * Deletar arquivo do R2
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  /**
   * Verificar se arquivo existe
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Copiar arquivo (usado para versionamento)
   */
  async copy(sourceKey: string, destKey: string): Promise<void> {
    const command = new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `${this.bucket}/${sourceKey}`,
      Key: destKey,
    });

    await this.client.send(command);
  }

  /**
   * Obter metadata do arquivo
   */
  async getMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
  }> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);

    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'application/octet-stream',
      lastModified: response.LastModified || new Date(),
    };
  }
}
```

## 📄 Arquivo: `src/pdf-extractor.ts`

```typescript
import pdfParse from 'pdf-parse';
import { ExtractedPdfData } from './types.js';

export class PdfExtractor {
  /**
   * Extrair texto e metadata de um PDF
   */
  async extract(buffer: Buffer): Promise<ExtractedPdfData> {
    try {
      const data = await pdfParse(buffer);

      return {
        text: data.text,
        metadata: {
          totalPages: data.numpages,
          author: data.info?.Author,
          title: data.info?.Title,
          creationDate: data.info?.CreationDate
            ? new Date(data.info.CreationDate)
            : undefined,
        },
      };
    } catch (error) {
      console.error('Erro ao extrair PDF:', error);
      throw new Error('Falha ao extrair texto do PDF');
    }
  }

  /**
   * Extrair campos específicos usando regex patterns
   * (usado para import de PDFs legados)
   */
  extractFields(text: string): Record<string, string | null> {
    const patterns = {
      numeroCotacao: /cota[çc][aã]o\s*n[°º]?\s*:?\s*(\d+[-\/]\d+)/i,
      numeroProsposta: /proposta\s*n[°º]?\s*:?\s*(\d+[-\/]\d+)/i,
      valor: /(?:valor|pr[êe]mio)\s*:?\s*r?\$?\s*([\d.,]+)/i,
      vigenciaInicio: /vig[êe]ncia\s*:?\s*(?:de\s*)?(\d{2}\/\d{2}\/\d{4})/i,
      vigenciaFim: /(?:at[ée]\s*|a\s*)(\d{2}\/\d{2}\/\d{4})/i,
      segurado: /segurado\s*:?\s*([^\n]+)/i,
      cnpjCpf: /(?:cnpj|cpf)\s*:?\s*([\d./-]+)/i,
    };

    const extracted: Record<string, string | null> = {};

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      extracted[key] = match ? match[1].trim() : null;
    }

    return extracted;
  }

  /**
   * Limpar texto extraído (remover caracteres especiais, espaços extras)
   */
  cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Múltiplos espaços -> 1 espaço
      .replace(/\n{3,}/g, '\n\n') // Múltiplas quebras -> 2 quebras
      .trim();
  }
}
```

## 🏗️ Arquivo: `src/index.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';
import { db } from '@ecotech/shared/database';
import { anexos } from '@ecotech/shared/database';
import { eq, and, isNull, sum, count } from 'drizzle-orm';
import { R2Client } from './r2-client.js';
import { PdfExtractor } from './pdf-extractor.js';
import {
  UploadParams,
  UploadResult,
  StorageUsage,
  LimitStatus,
} from './types.js';

export class StorageService {
  private r2: R2Client;
  private pdfExtractor: PdfExtractor;

  constructor() {
    this.r2 = new R2Client();
    this.pdfExtractor = new PdfExtractor();
  }

  /**
   * Upload arquivo para R2 e criar registro no banco
   */
  async uploadFile(params: UploadParams): Promise<UploadResult> {
    const {
      file,
      fileName,
      mimeType,
      corretoraId,
      entidadeTipo,
      entidadeId,
      uploadPorId,
    } = params;

    // Gerar nome único para o arquivo
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;

    // Construir chave do R2
    const r2Key = this.buildR2Key(
      corretoraId,
      entidadeTipo,
      entidadeId,
      uniqueFileName
    );

    // Upload para R2
    await this.r2.upload(r2Key, file, mimeType);

    // Extrair texto se for PDF
    let textoExtraido = null;
    let metadadosExtracao = null;

    if (mimeType === 'application/pdf') {
      try {
        const extracted = await this.pdfExtractor.extract(file);
        textoExtraido = this.pdfExtractor.cleanText(extracted.text);
        metadadosExtracao = extracted.metadata;
      } catch (error) {
        console.error('Falha ao extrair PDF:', error);
        // Não falhar o upload se extração falhar
      }
    }

    // Criar registro no banco
    const [anexo] = await db
      .insert(anexos)
      .values({
        corretoraId,
        entidadeTipo,
        entidadeId,
        nomeOriginal: fileName,
        nomeArquivo: uniqueFileName,
        mimeType,
        tamanho: file.length,
        r2Key,
        r2Bucket: process.env.R2_BUCKET_NAME!,
        textoExtraido,
        metadadosExtracao,
        uploadPorId,
        versao: 1,
      })
      .returning();

    // Gerar URL assinada para retornar ao cliente
    const urlAssinada = await this.r2.getSignedDownloadUrl(r2Key);

    return {
      anexo,
      urlAssinada,
    };
  }

  /**
   * Download arquivo do R2
   */
  async downloadFile(anexoId: string): Promise<Buffer> {
    const anexo = await db.query.anexos.findFirst({
      where: eq(anexos.id, anexoId),
    });

    if (!anexo || anexo.deletedAt) {
      throw new Error('Anexo não encontrado');
    }

    return await this.r2.download(anexo.r2Key);
  }

  /**
   * Gerar URL assinada para download
   */
  async getSignedUrl(anexoId: string): Promise<string> {
    const anexo = await db.query.anexos.findFirst({
      where: eq(anexos.id, anexoId),
    });

    if (!anexo || anexo.deletedAt) {
      throw new Error('Anexo não encontrado');
    }

    return await this.r2.getSignedDownloadUrl(anexo.r2Key);
  }

  /**
   * Deletar arquivo (soft delete no DB + remover do R2)
   */
  async deleteFile(anexoId: string, deletedPorId: string): Promise<void> {
    const anexo = await db.query.anexos.findFirst({
      where: eq(anexos.id, anexoId),
    });

    if (!anexo) {
      throw new Error('Anexo não encontrado');
    }

    // Soft delete no banco
    await db
      .update(anexos)
      .set({
        deletedAt: new Date(),
        deletedPorId,
      })
      .where(eq(anexos.id, anexoId));

    // Remover do R2 (opcional: pode manter para auditoria)
    try {
      await this.r2.delete(anexo.r2Key);
    } catch (error) {
      console.error('Falha ao remover do R2:', error);
      // Não falhar se não conseguir remover do R2
    }
  }

  /**
   * Upload de nova versão de arquivo
   */
  async uploadNewVersion(
    anexoId: string,
    file: Buffer,
    uploadPorId: string
  ): Promise<UploadResult> {
    const anexoAnterior = await db.query.anexos.findFirst({
      where: eq(anexos.id, anexoId),
    });

    if (!anexoAnterior) {
      throw new Error('Anexo não encontrado');
    }

    // Gerar novo nome único
    const fileExtension = anexoAnterior.nomeOriginal.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;

    // Nova chave no R2
    const r2Key = this.buildR2Key(
      anexoAnterior.corretoraId,
      anexoAnterior.entidadeTipo,
      anexoAnterior.entidadeId,
      uniqueFileName
    );

    // Upload para R2
    await this.r2.upload(r2Key, file, anexoAnterior.mimeType);

    // Extrair texto se for PDF
    let textoExtraido = null;
    let metadadosExtracao = null;

    if (anexoAnterior.mimeType === 'application/pdf') {
      try {
        const extracted = await this.pdfExtractor.extract(file);
        textoExtraido = this.pdfExtractor.cleanText(extracted.text);
        metadadosExtracao = extracted.metadata;
      } catch (error) {
        console.error('Falha ao extrair PDF:', error);
      }
    }

    // Criar nova versão no banco
    const [novaVersao] = await db
      .insert(anexos)
      .values({
        corretoraId: anexoAnterior.corretoraId,
        entidadeTipo: anexoAnterior.entidadeTipo,
        entidadeId: anexoAnterior.entidadeId,
        nomeOriginal: anexoAnterior.nomeOriginal,
        nomeArquivo: uniqueFileName,
        mimeType: anexoAnterior.mimeType,
        tamanho: file.length,
        r2Key,
        r2Bucket: anexoAnterior.r2Bucket,
        textoExtraido,
        metadadosExtracao,
        uploadPorId,
        versao: anexoAnterior.versao + 1,
        arquivoAnteriorId: anexoId, // Link para versão anterior
      })
      .returning();

    const urlAssinada = await this.r2.getSignedDownloadUrl(r2Key);

    return {
      anexo: novaVersao,
      urlAssinada,
    };
  }

  /**
   * Restaurar versão anterior (cria nova versão como cópia)
   */
  async restoreVersion(
    anexoId: string,
    versaoId: string,
    uploadPorId: string
  ): Promise<UploadResult> {
    const versaoARestaurar = await db.query.anexos.findFirst({
      where: eq(anexos.id, versaoId),
    });

    if (!versaoARestaurar) {
      throw new Error('Versão não encontrada');
    }

    // Download da versão antiga
    const buffer = await this.r2.download(versaoARestaurar.r2Key);

    // Upload como nova versão
    return await this.uploadNewVersion(anexoId, buffer, uploadPorId);
  }

  /**
   * Calcular uso de storage de uma corretora
   */
  async getStorageUsage(corretoraId: string): Promise<StorageUsage> {
    const result = await db
      .select({
        totalFiles: count(),
        totalBytes: sum(anexos.tamanho),
        entidadeTipo: anexos.entidadeTipo,
      })
      .from(anexos)
      .where(
        and(
          eq(anexos.corretoraId, corretoraId),
          isNull(anexos.deletedAt)
        )
      )
      .groupBy(anexos.entidadeTipo);

    const usage: StorageUsage = {
      totalFiles: 0,
      totalBytes: 0,
      byType: {
        cotacoes: 0,
        documentos: 0,
        chat: 0,
      },
    };

    for (const row of result) {
      usage.totalFiles += Number(row.totalFiles);
      usage.totalBytes += Number(row.totalBytes);

      if (row.entidadeTipo === 'cotacao') {
        usage.byType.cotacoes = Number(row.totalBytes);
      } else if (row.entidadeTipo === 'documento_venda') {
        usage.byType.documentos = Number(row.totalBytes);
      } else if (row.entidadeTipo === 'mensagem_chat') {
        usage.byType.chat = Number(row.totalBytes);
      }
    }

    return usage;
  }

  /**
   * Construir chave do R2
   */
  private buildR2Key(
    corretoraId: string,
    entidadeTipo: string,
    entidadeId: string,
    fileName: string
  ): string {
    const tipo = entidadeTipo === 'mensagem_chat' ? 'chat' : entidadeTipo + 's';
    return `${corretoraId}/${tipo}/${entidadeId}/${fileName}`;
  }
}

// Export classes
export { R2Client } from './r2-client.js';
export { PdfExtractor } from './pdf-extractor.js';
export * from './types.js';
```

## 🔐 Validações de Segurança

```typescript
// Adicionar ao StorageService

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

validateFile(mimeType: string, size: number): void {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Tipo de arquivo não permitido: ${mimeType}`);
  }

  if (size > MAX_FILE_SIZE) {
    throw new Error(
      `Arquivo muito grande: ${size} bytes (máximo: ${MAX_FILE_SIZE} bytes)`
    );
  }
}
```

## 🧪 Como Testar

```typescript
// Test script: test-storage.ts
import { StorageService } from './src/index.js';
import fs from 'fs';

async function test() {
  const storage = new StorageService();

  // 1. Upload de arquivo
  const pdfBuffer = fs.readFileSync('./test.pdf');
  const result = await storage.uploadFile({
    file: pdfBuffer,
    fileName: 'test.pdf',
    mimeType: 'application/pdf',
    corretoraId: 'uuid-corretora',
    entidadeTipo: 'cotacao',
    entidadeId: 'uuid-cotacao',
    uploadPorId: 'uuid-usuario',
  });

  console.log('Upload:', result.anexo.id);

  // 2. Gerar URL assinada
  const url = await storage.getSignedUrl(result.anexo.id);
  console.log('URL:', url);

  // 3. Download
  const downloaded = await storage.downloadFile(result.anexo.id);
  console.log('Downloaded:', downloaded.length, 'bytes');

  // 4. Calcular uso
  const usage = await storage.getStorageUsage('uuid-corretora');
  console.log('Usage:', usage);
}

test();
```

## 📝 Próximo Documento

Continue com **[04-API-ANEXOS.md](./04-API-ANEXOS.md)** para ver as rotas da API.
