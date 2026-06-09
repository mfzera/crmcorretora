import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadAnexo } from '@/modules/anexos/http';
import { toast } from 'sonner';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    '.xlsx',
  ],
};

interface FileUploadState {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function useFileUpload(
  entidade: string,
  entidadeId: string,
  options?: {
    maxFiles?: number;
    onSuccess?: () => void;
  },
) {
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const uploadMutation = useUploadAnexo();

  const handleDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Adicionar arquivos aceitos
      const newFiles: FileUploadState[] = acceptedFiles.map((file) => ({
        file,
        progress: 0,
        status: 'pending' as const,
      }));

      setFiles((prev) => [...prev, ...newFiles]);

      // Processar erros de arquivos rejeitados (um único toast para não bloquear o paint)
      if (rejectedFiles.length > 0) {
        const messages: string[] = [];
        rejectedFiles.forEach((rejection) => {
          const fileName = rejection.file.name;
          rejection.errors.forEach((error: any) => {
            switch (error.code) {
              case 'file-too-large':
                messages.push(`${fileName}: Arquivo muito grande (máx. 10MB)`);
                break;
              case 'file-invalid-type':
                messages.push(`${fileName}: Tipo não permitido. Use PDF, imagens, DOCX ou XLSX`);
                break;
              case 'too-many-files':
                messages.push(`Muitos arquivos. Limite: ${options?.maxFiles || 5} por vez`);
                break;
              default:
                messages.push(`${fileName}: ${error.message}`);
            }
          });
        });
        if (messages.length === 1) {
          toast.error(messages[0]);
        } else {
          toast.error(`${messages.length} arquivos rejeitados`, {
            description: messages.join('\n'),
          });
        }
      }

      // Iniciar uploads após o paint da UI (melhora INP)
      setTimeout(() => {
        acceptedFiles.forEach((file) => {
          uploadFile(file);
        });
      }, 0);
    },
    [entidade, entidadeId, options?.maxFiles],
  );

  const uploadFile = async (file: File) => {
    try {
      const result = await uploadMutation.mutateAsync({
        entidade,
        entidadeId,
        arquivo: file,
        onProgress: (progress) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.file === file
                ? { ...f, progress, status: 'uploading' as const }
                : f,
            ),
          );
        },
      });

      setFiles((prev) =>
        prev.map((f) =>
          f.file === file ? { ...f, status: 'success' as const } : f,
        ),
      );

      toast.success(`${file.name}: Upload concluído`);
      options?.onSuccess?.();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Erro ao fazer upload do arquivo';

      setFiles((prev) =>
        prev.map((f) =>
          f.file === file
            ? {
                ...f,
                status: 'error' as const,
                error: errorMessage,
              }
            : f,
        ),
      );

      toast.error(`${file.name}: ${errorMessage}`);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    maxFiles: options?.maxFiles,
    maxSize: MAX_FILE_SIZE,
    accept: ALLOWED_TYPES,
  });

  const clearFiles = () => setFiles([]);

  return {
    files,
    uploadFile,
    clearFiles,
    getRootProps,
    getInputProps,
    isDragActive,
    isUploading: files.some((f) => f.status === 'uploading'),
  };
}
