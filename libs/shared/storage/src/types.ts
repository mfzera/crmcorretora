import type { Anexo } from '@ecotech/shared/database';

export interface UploadParams {
  file: Buffer;
  fileName: string;
  mimeType: string;
  corretoraId: string;
  entidadeTipo: 'cotacao' | 'documento_venda' | 'mensagem_chat' | 'endosso' | 'sinistro';
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
  shouldBlock: boolean;
  percentUsed: number;
  bytesUsed: number;
  bytesLimit: number | null;
  arquivosUsados: number;
  arquivosLimit: number | null;
}
