import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface R2ClientOptions {
  bucketOverride?: string;
}

let _storageLoggedOnce = false;

export class R2Client {
  private client: S3Client;
  private bucket: string;

  private internalEndpoint: string | undefined;
  private publicEndpoint: string | undefined;

  constructor(options?: R2ClientOptions) {
    // Suporta tanto CLOUDFLARE_R2_* quanto R2_* para compatibilidade
    const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
    const accessKeyId =
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey =
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
      process.env.R2_SECRET_ACCESS_KEY;
    const bucketName =
      process.env.CLOUDFLARE_R2_BUCKET || process.env.R2_BUCKET_NAME;
    const region = process.env.CLOUDFLARE_R2_REGION || 'auto';
    const accountId = process.env.R2_ACCOUNT_ID;

    // Validação detalhada das variáveis de ambiente
    const missingVars: string[] = [];

    if (!accessKeyId) {
      missingVars.push('CLOUDFLARE_R2_ACCESS_KEY_ID ou R2_ACCESS_KEY_ID');
    }
    if (!secretAccessKey) {
      missingVars.push(
        'CLOUDFLARE_R2_SECRET_ACCESS_KEY ou R2_SECRET_ACCESS_KEY',
      );
    }
    if (!bucketName) {
      missingVars.push('CLOUDFLARE_R2_BUCKET ou R2_BUCKET_NAME');
    }

    if (missingVars.length > 0) {
      throw new Error(
        `❌ Variáveis de storage não configuradas!\n\n` +
          `Faltando:\n${missingVars.map((v) => `  - ${v}`).join('\n')}\n\n` +
          `Configuração necessária no .env:\n` +
          `  R2_ACCESS_KEY_ID=seu-access-key\n` +
          `  R2_SECRET_ACCESS_KEY=sua-secret-key\n` +
          `  R2_BUCKET_NAME=ecotech-anexos\n` +
          `  R2_ACCOUNT_ID=seu-account-id (necessário para Cloudflare R2)\n\n` +
          `Ou use as variáveis com prefixo CLOUDFLARE_R2_*`,
      );
    }

    // Após validação, garantimos que as variáveis existem
    const validAccessKeyId = accessKeyId as string;
    const validSecretAccessKey = secretAccessKey as string;
    const validBucketName = bucketName as string;

    // Detectar se é MinIO (endpoint localhost) ou Cloudflare R2
    const isMinIO =
      endpoint &&
      (endpoint.includes('localhost') || endpoint.includes('127.0.0.1'));

    if (isMinIO) {
      if (!_storageLoggedOnce) {
        console.log(`📦 Storage: MinIO em ${endpoint}`);
        _storageLoggedOnce = true;
      }

      this.client = new S3Client({
        region: region === 'auto' ? 'us-east-1' : region,
        endpoint,
        credentials: {
          accessKeyId: validAccessKeyId,
          secretAccessKey: validSecretAccessKey,
        },
        forcePathStyle: true, // Necessário para MinIO
      });
    } else if (accountId) {
      if (!_storageLoggedOnce) {
        console.log('📦 Storage: Cloudflare R2');
        _storageLoggedOnce = true;
      }

      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: validAccessKeyId,
          secretAccessKey: validSecretAccessKey,
        },
      });
    } else {
      throw new Error(
        `❌ R2_ACCOUNT_ID não configurado!\n\n` +
          `Para usar Cloudflare R2 em produção, você precisa configurar:\n` +
          `  R2_ACCOUNT_ID=seu-account-id\n\n` +
          `Encontre seu Account ID:\n` +
          `  1. Acesse Cloudflare Dashboard → R2\n` +
          `  2. Account ID está no topo da página\n\n` +
          `OU configure CLOUDFLARE_R2_ENDPOINT para usar MinIO:\n` +
          `  CLOUDFLARE_R2_ENDPOINT=http://localhost:9000`,
      );
    }

    this.bucket = options?.bucketOverride || validBucketName;
    this.internalEndpoint = endpoint;
    // STORAGE_PUBLIC_ENDPOINT: use when internal endpoint differs from browser-accessible URL
    // e.g. API connects to "http://minio:9000" but browser must reach "http://localhost:9000"
    this.publicEndpoint = process.env.STORAGE_PUBLIC_ENDPOINT;
  }

  private async withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        const transient =
          error?.name === 'RequestTimeout' ||
          error?.name === 'NetworkingError' ||
          error?.name === 'TimeoutError' ||
          (error?.$metadata?.httpStatusCode ?? 0) >= 500;
        if (attempt === attempts || !transient) throw error;
        await new Promise((r) => setTimeout(r, 100 * Math.pow(3, attempt - 1)));
      }
    }
    throw new Error('unreachable');
  }

  /**
   * Upload arquivo para R2
   */
  async upload(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      Metadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    await this.withRetry(() => this.client.send(command));
  }

  /**
   * Download arquivo do R2
   */
  async download(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.withRetry(() => this.client.send(command));

    // Converter stream para buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Gerar URL assinada para download (válida por 1h)
   * SEGURANÇA: Reduzido de 24h para 1h para limitar janela de exposição
   */
  async getSignedDownloadUrl(
    key: string,
    expiresIn: number = 60 * 60,
    disposition: 'inline' | 'attachment' = 'inline',
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: disposition,
    });

    // Máximo de 1 hora para segurança
    const safeExpiresIn = Math.min(expiresIn, 60 * 60);

    let url = await getSignedUrl(this.client, command, {
      expiresIn: safeExpiresIn,
    });

    // Replace internal hostname with public-facing URL (e.g. minio:9000 → localhost:9000)
    if (this.publicEndpoint && this.internalEndpoint && this.internalEndpoint !== this.publicEndpoint) {
      url = url.replace(this.internalEndpoint, this.publicEndpoint);
    }

    return url;
  }

  /**
   * Gerar URL assinada para upload (válida por 1h)
   */
  async getSignedUploadUrl(key: string, mimeType: string): Promise<string> {
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

    await this.withRetry(() => this.client.send(command));
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
    // URL encode o sourceKey para lidar com caracteres especiais
    const encodedSourceKey = sourceKey
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');

    const command = new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `${this.bucket}/${encodedSourceKey}`,
      Key: destKey,
    });

    await this.withRetry(() => this.client.send(command));
  }

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

  /**
   * Copiar arquivo deste bucket para outro bucket (cross-bucket copy)
   */
  async copyToOtherBucket(sourceKey: string, destBucket: string, destKey: string): Promise<void> {
    const encodedSourceKey = sourceKey
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');

    const command = new CopyObjectCommand({
      Bucket: destBucket,
      CopySource: `${this.bucket}/${encodedSourceKey}`,
      Key: destKey,
    });

    await this.client.send(command);
  }

  /**
   * Listar objetos por prefixo (retorna todas as keys)
   */
  async listObjectsByPrefix(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      const response = await this.client.send(command);

      for (const obj of response.Contents || []) {
        if (obj.Key) keys.push(obj.Key);
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return keys;
  }

  /**
   * Deletar múltiplos objetos de uma vez (batch delete)
   */
  async deleteBatch(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    // S3 permite no máximo 1000 objetos por request
    const chunks: string[][] = [];
    for (let i = 0; i < keys.length; i += 1000) {
      chunks.push(keys.slice(i, i + 1000));
    }

    for (const chunk of chunks) {
      const command = new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: chunk.map((key) => ({ Key: key })),
          Quiet: true,
        },
      });

      await this.client.send(command);
    }
  }
}
