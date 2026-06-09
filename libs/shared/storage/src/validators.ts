/**
 * Validações de segurança para uploads
 */

export const ALLOWED_MIME_TYPES = [
  // PDFs
  'application/pdf',

  // Imagens
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',

  // Documentos Office
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
  'application/msword', // DOC
  'application/vnd.ms-excel', // XLS

  // Texto
  'text/plain',
  'text/csv',

  // Compactados (com cuidado)
  'application/zip',
  'application/x-rar-compressed',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const MAX_FILE_SIZE_BY_TYPE: Record<string, number> = {
  'image/jpeg': 5 * 1024 * 1024, // 5MB para imagens
  'image/jpg': 5 * 1024 * 1024,
  'image/png': 5 * 1024 * 1024,
  'image/gif': 2 * 1024 * 1024, // 2MB para GIFs
  'application/pdf': 10 * 1024 * 1024, // 10MB para PDFs
  'application/zip': 20 * 1024 * 1024, // 20MB para ZIPs
};

/**
 * Validar MIME type do arquivo
 */
export function validateMimeType(mimeType: string): void {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(
      `Tipo de arquivo não permitido: ${mimeType}. Tipos aceitos: PDF, imagens (JPEG, PNG, GIF), documentos Office (DOCX, XLSX, PPTX), texto (TXT, CSV) e compactados (ZIP, RAR)`,
    );
  }
}

/**
 * Validar tamanho do arquivo
 */
export function validateFileSize(size: number, mimeType: string): void {
  const maxSize = MAX_FILE_SIZE_BY_TYPE[mimeType] || MAX_FILE_SIZE;

  if (size > maxSize) {
    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
    throw new Error(
      `Arquivo muito grande: ${sizeMB}MB (máximo: ${maxSizeMB}MB para ${mimeType})`,
    );
  }

  if (size === 0) {
    throw new Error('Arquivo vazio não pode ser enviado');
  }
}

/**
 * Validar nome do arquivo (prevenir path traversal)
 */
export function validateFileName(fileName: string): void {
  // Remover path traversal attempts
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    throw new Error('Nome de arquivo inválido: não pode conter caracteres de caminho');
  }

  // Validar caracteres permitidos (alfanuméricos, hífen, underscore, ponto)
  const validNamePattern = /^[\w\-. ]+$/;
  if (!validNamePattern.test(fileName)) {
    throw new Error(
      'Nome de arquivo inválido: apenas letras, números, espaços, hífen, underscore e ponto são permitidos',
    );
  }

  // Validar extensão existe
  if (!fileName.includes('.')) {
    throw new Error('Arquivo deve ter uma extensão válida');
  }

  // Limitar tamanho do nome
  if (fileName.length > 255) {
    throw new Error('Nome de arquivo muito longo (máximo: 255 caracteres)');
  }
}

/**
 * Sanitizar nome do arquivo
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.\-_ ]/g, '_') // Substituir caracteres inválidos
    .replace(/\s+/g, '_') // Substituir espaços por underscore
    .replace(/_{2,}/g, '_') // Remover underscores duplos
    .substring(0, 255); // Limitar tamanho
}

/**
 * Detectar MIME type baseado na extensão (fallback)
 */
export function detectMimeTypeFromExtension(fileName: string): string | null {
  const extension = fileName.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    doc: 'application/msword',
    xls: 'application/vnd.ms-excel',
    txt: 'text/plain',
    csv: 'text/csv',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
  };

  return extension ? mimeTypes[extension] || null : null;
}

/**
 * Verificar se arquivo é imagem
 */
export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Verificar se arquivo é PDF
 */
export function isPDF(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

/**
 * Verificar se arquivo é documento Office
 */
export function isOfficeDocument(mimeType: string): boolean {
  return (
    mimeType.includes('officedocument') ||
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.ms-excel'
  );
}

/**
 * Validação completa de arquivo
 */
export function validateFile(
  fileName: string,
  mimeType: string,
  size: number,
): void {
  validateFileName(fileName);
  validateMimeType(mimeType);
  validateFileSize(size, mimeType);
}
