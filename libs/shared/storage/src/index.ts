import { v4 as uuidv4 } from 'uuid';
import { db } from '@ecotech/shared/database';
import { anexos } from '@ecotech/shared/database';
import { eq, and, isNull, sum, count, sql } from 'drizzle-orm';
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

    // Validar arquivo (incluindo magic bytes)
    this.validateFile(mimeType, file.length, file);

    // SEGURANÇA: Sanitizar nome do arquivo para prevenir path traversal
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Gerar nome único para o arquivo
    const fileExtension = sanitizedFileName.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;

    // Construir chave do R2
    const r2Key = this.buildR2Key(
      corretoraId,
      entidadeTipo,
      entidadeId,
      uniqueFileName,
    );

    // Upload para R2
    await this.r2.upload(r2Key, file, mimeType);

    // Extrair texto se for PDF
    let textoExtraido: string | null = null;
    let metadadosExtracao: any = null;

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

    // Criar registro no banco — se falhar, desfaz o upload do R2
    const anexoRows = await db
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
        r2Bucket:
          process.env.CLOUDFLARE_R2_BUCKET || process.env.R2_BUCKET_NAME!,
        textoExtraido,
        metadadosExtracao,
        uploadPorId,
        versao: 1,
      })
      .returning()
      .catch(async (dbError) => {
        // Rollback do R2: arquivo não deve ficar órfão
        await this.r2.delete(r2Key).catch((r2Err) => {
          console.error('[storage] rollback R2 falhou após erro no DB', { r2Key, error: r2Err });
        });
        throw dbError;
      });

    const [anexo] = anexoRows;

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
   * SEGURANÇA: Valida que anexo existe e não está deletado
   */
  async getSignedUrl(anexoId: string, corretoraId?: string): Promise<string> {
    const anexo = await db.query.anexos.findFirst({
      where: eq(anexos.id, anexoId),
    });

    if (!anexo || anexo.deletedAt) {
      throw new Error('Anexo não encontrado');
    }

    // SEGURANÇA: Validar tenant se fornecido
    if (corretoraId && anexo.corretoraId !== corretoraId) {
      throw new Error('Acesso negado ao anexo');
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
    uploadPorId: string,
  ): Promise<UploadResult> {
    const anexoAnterior = await db.query.anexos.findFirst({
      where: eq(anexos.id, anexoId),
    });

    if (!anexoAnterior) {
      throw new Error('Anexo não encontrado');
    }

    // Validar arquivo
    this.validateFile(anexoAnterior.mimeType, file.length);

    // Gerar novo nome único
    const fileExtension = anexoAnterior.nomeOriginal.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;

    // Nova chave no R2
    const r2Key = this.buildR2Key(
      anexoAnterior.corretoraId,
      anexoAnterior.entidadeTipo,
      anexoAnterior.entidadeId,
      uniqueFileName,
    );

    // Upload para R2
    await this.r2.upload(r2Key, file, anexoAnterior.mimeType);

    // Extrair texto se for PDF
    let textoExtraido: string | null = null;
    let metadadosExtracao: any = null;

    if (anexoAnterior.mimeType === 'application/pdf') {
      try {
        const extracted = await this.pdfExtractor.extract(file);
        textoExtraido = this.pdfExtractor.cleanText(extracted.text);
        metadadosExtracao = extracted.metadata;
      } catch (error) {
        console.error('Falha ao extrair PDF:', error);
      }
    }

    // Criar nova versão no banco — se falhar, desfaz o upload do R2
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
        arquivoAnteriorId: anexoId,
      })
      .returning()
      .catch(async (dbError) => {
        await this.r2.delete(r2Key).catch((r2Err) => {
          console.error('[storage] rollback R2 (nova versão) falhou após erro no DB', { r2Key, error: r2Err });
        });
        throw dbError;
      });

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
    uploadPorId: string,
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
      .where(and(eq(anexos.corretoraId, corretoraId), isNull(anexos.deletedAt)))
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
      usage.totalBytes += Number(row.totalBytes || 0);

      if (row.entidadeTipo === 'cotacao') {
        usage.byType.cotacoes = Number(row.totalBytes || 0);
      } else if (row.entidadeTipo === 'documento_venda') {
        usage.byType.documentos = Number(row.totalBytes || 0);
      } else if (row.entidadeTipo === 'mensagem_chat') {
        usage.byType.chat = Number(row.totalBytes || 0);
      }
    }

    return usage;
  }

  /**
   * Validar arquivo
   * SEGURANÇA: Valida mime type, tamanho e magic bytes
   */
  private validateFile(mimeType: string, size: number, buffer?: Buffer): void {
    const ALLOWED_MIME_TYPES = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
    ];

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`Tipo de arquivo não permitido: ${mimeType}`);
    }

    if (size > MAX_FILE_SIZE) {
      const sizeMB = (size / (1024 * 1024)).toFixed(2);
      throw new Error(`Arquivo muito grande: ${sizeMB}MB (máximo: 10MB)`);
    }

    // SEGURANÇA: Validar magic bytes para prevenir upload de arquivos maliciosos
    if (buffer && buffer.length >= 4) {
      const magicBytes = buffer.slice(0, 4);

      // Verificar assinaturas conhecidas
      const signatures: { [key: string]: string[] } = {
        'application/pdf': ['25504446'], // %PDF
        'image/jpeg': ['FFD8FFE0', 'FFD8FFE1', 'FFD8FFE2', 'FFD8FFDB'],
        'image/png': ['89504E47'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          ['504B0304'], // ZIP (DOCX é ZIP)
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
          '504B0304',
        ], // ZIP (XLSX é ZIP)
      };

      const expectedSignatures = signatures[mimeType];
      if (expectedSignatures) {
        const actualSignature = magicBytes.toString('hex').toUpperCase();
        const isValid = expectedSignatures.some((sig) =>
          actualSignature.startsWith(sig),
        );

        if (!isValid) {
          throw new Error(
            'Conteúdo do arquivo não corresponde ao tipo declarado',
          );
        }
      }
    }
  }

  /**
   * Construir chave do R2
   */
  private buildR2Key(
    corretoraId: string,
    entidadeTipo: string,
    entidadeId: string,
    fileName: string,
  ): string {
    const tipo = entidadeTipo === 'mensagem_chat' ? 'chat' : entidadeTipo + 's';
    return `${corretoraId}/${tipo}/${entidadeId}/${fileName}`;
  }
}

// Export classes
export { R2Client } from './r2-client.js';
export { PdfExtractor } from './pdf-extractor.js';
export { MetricsService } from './metrics.service.js';
export { BackupService } from './backup.service.js';
export * from './types.js';
export * from './validators.js';

// Export singleton instance for storage operations
export const storageClient = new R2Client();

/**
 * Resolve um valor armazenado em colunas como `logo_url` ou `avatar_url` para
 * uma URL utilizável pelo cliente.
 *
 * - `null`/vazio → `null`
 * - URL absoluta (http/https) → devolvida como está (compat com URLs externas legadas)
 * - Caso contrário → tratada como chave R2 e assinada (TTL curto, definido pelo R2Client)
 */
export async function resolveStoredFileUrl(
  stored: string | null | undefined,
): Promise<string | null> {
  if (!stored) return null;
  if (/^https?:\/\//i.test(stored)) return stored;
  try {
    return await storageClient.getSignedDownloadUrl(stored);
  } catch {
    return null;
  }
}
