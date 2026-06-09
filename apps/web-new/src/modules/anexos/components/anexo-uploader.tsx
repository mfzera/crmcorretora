
import { useFileUpload } from '@/core/hooks/use-file-upload';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/core/ui/card';
import { Progress } from '@/core/ui/progress';
import { Button } from '@/core/ui/button';

interface AnexoUploaderProps {
  entidade: string;
  entidadeId: string;
  maxFiles?: number;
  onSuccess?: () => void;
}

export function AnexoUploader({
  entidade,
  entidadeId,
  maxFiles = 5,
  onSuccess,
}: AnexoUploaderProps) {
  const {
    files,
    getRootProps,
    getInputProps,
    isDragActive,
    clearFiles,
    isUploading,
  } = useFileUpload(entidade, entidadeId, {
    maxFiles,
    onSuccess,
  });

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={`
          border-2 border-dashed p-8 text-center cursor-pointer
          transition-colors duration-200
          ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isDragActive
                ? 'Solte os arquivos aqui'
                : 'Arraste arquivos ou clique para selecionar'}
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, Imagens, DOCX, XLSX (máx. 10MB)
            </p>
          </div>
        </div>
      </Card>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Arquivos ({files.length})</p>
            {!isUploading && (
              <Button variant="ghost" size="sm" onClick={clearFiles}>
                Limpar
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {files.map((fileState, index) => (
              <Card key={index} className="p-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {fileState.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(fileState.file.size)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {fileState.status === 'success' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {fileState.status === 'error' && (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      {fileState.status === 'pending' && (
                        <div className="h-5 w-5 rounded-full border-2 border-muted" />
                      )}
                    </div>
                  </div>

                  {fileState.status === 'uploading' && (
                    <Progress value={fileState.progress} className="h-1" />
                  )}

                  {fileState.status === 'error' && fileState.error && (
                    <p className="text-xs text-red-500">{fileState.error}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
