# 10 - Frontend: Componentes de Anexos (Tenant App)

**Navegação**: [← 09. API Admin](./09-API-ADMIN.md) | [Índice](./00-INDICE.md) | [11. Frontend Admin →](./11-FRONTEND-ADMIN.md)

---

## Visão Geral

Componentes React reutilizáveis para gerenciar anexos no aplicativo do tenant:

- Upload de arquivos (drag & drop + button)
- Lista de anexos com preview
- Download e visualização
- Gestão de versões
- Integração com chat
- Indicador de uso de storage

**Stack:**
- Next.js 14 App Router
- TanStack Query (React Query)
- Shadcn/UI
- Tailwind CSS

---

## Estrutura de Arquivos

```
apps/web/src/
├── components/
│   └── anexos/
│       ├── anexo-uploader.tsx        # Upload + drag & drop
│       ├── anexo-list.tsx            # Lista de anexos
│       ├── anexo-card.tsx            # Card individual
│       ├── anexo-preview.tsx         # Modal de preview
│       ├── anexo-versoes.tsx         # Histórico de versões
│       ├── storage-indicator.tsx     # Barra de uso de storage
│       └── index.ts                  # Exports
├── lib/
│   └── queries/
│       └── anexos.ts                 # React Query hooks
└── hooks/
    ├── use-file-upload.ts            # Upload logic
    └── use-storage-usage.ts          # Usage tracking
```

---

## 1. React Query Hooks

### `libs/queries/anexos.ts`

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export interface Anexo {
  id: string;
  nomeOriginal: string;
  nomeArquivo: string;
  tamanho: number;
  mimeType: string;
  entidadeTipo: string;
  entidadeId: string;
  versao: number;
  arquivoAnteriorId: string | null;
  uploadPor: {
    id: string;
    nome: string;
  };
  uploadEm: string;
  urlAssinada?: string;
}

export interface StorageUsage {
  totalFiles: number;
  totalBytes: string;
  byType: {
    cotacoes: { count: number; bytes: string };
    documentos: { count: number; bytes: string };
    chat: { count: number; bytes: string };
  };
  largestFiles: Array<{
    id: string;
    nomeOriginal: string;
    tamanho: string;
    entidadeTipo: string;
    uploadEm: string;
  }>;
}

export interface LimitStatus {
  ok: boolean;
  shouldAlert: boolean;
  shouldBlock: boolean;
  percentUsed: number;
  bytesUsed: string;
  bytesLimit: string;
  arquivosUsed: number;
  arquivosLimit: number | null;
}

// === Queries ===

/**
 * Buscar anexos de uma entidade
 */
export function useAnexos(entidadeTipo: string, entidadeId: string) {
  return useQuery({
    queryKey: ['anexos', entidadeTipo, entidadeId],
    queryFn: async () => {
      const response = await api.get(`/anexos/${entidadeTipo}/${entidadeId}`);
      return response.data.data.anexos as Anexo[];
    },
    enabled: !!entidadeTipo && !!entidadeId,
  });
}

/**
 * Buscar um anexo específico
 */
export function useAnexo(anexoId: string) {
  return useQuery({
    queryKey: ['anexo', anexoId],
    queryFn: async () => {
      const response = await api.get(`/anexos/${anexoId}`);
      return response.data.data.anexo as Anexo;
    },
    enabled: !!anexoId,
  });
}

/**
 * Buscar versões de um anexo
 */
export function useAnexoVersoes(anexoId: string) {
  return useQuery({
    queryKey: ['anexo-versoes', anexoId],
    queryFn: async () => {
      const response = await api.get(`/anexos/${anexoId}/versoes`);
      return response.data.data.versoes as Anexo[];
    },
    enabled: !!anexoId,
  });
}

/**
 * Buscar uso de storage
 */
export function useStorageUsage() {
  return useQuery({
    queryKey: ['storage-usage'],
    queryFn: async () => {
      const response = await api.get('/anexos/usage');
      return {
        usage: response.data.usage as StorageUsage,
        limits: response.data.limits as LimitStatus,
      };
    },
    // Atualizar a cada 5 minutos
    staleTime: 5 * 60 * 1000,
  });
}

// === Mutations ===

/**
 * Upload de arquivo
 */
export function useUploadAnexo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      entidadeTipo,
      entidadeId,
      descricao,
      onProgress,
    }: {
      file: File;
      entidadeTipo: string;
      entidadeId: string;
      descricao?: string;
      onProgress?: (progress: number) => void;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entidadeTipo', entidadeTipo);
      formData.append('entidadeId', entidadeId);
      if (descricao) formData.append('descricao', descricao);

      const response = await api.post('/anexos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(progress);
          }
        },
      });

      return response.data.data.anexo as Anexo;
    },
    onSuccess: (_, variables) => {
      // Invalidar cache de anexos da entidade
      queryClient.invalidateQueries({
        queryKey: ['anexos', variables.entidadeTipo, variables.entidadeId],
      });

      // Invalidar cache de uso de storage
      queryClient.invalidateQueries({
        queryKey: ['storage-usage'],
      });

      toast.success('Arquivo enviado com sucesso!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Erro ao enviar arquivo';
      toast.error(message);
    },
  });
}

/**
 * Upload de nova versão
 */
export function useUploadNovaVersao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      anexoId,
      file,
      onProgress,
    }: {
      anexoId: string;
      file: File;
      onProgress?: (progress: number) => void;
    }) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(`/anexos/${anexoId}/nova-versao`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(progress);
          }
        },
      });

      return response.data.data.anexo as Anexo;
    },
    onSuccess: (data, variables) => {
      // Invalidar cache do anexo e suas versões
      queryClient.invalidateQueries({
        queryKey: ['anexo', variables.anexoId],
      });
      queryClient.invalidateQueries({
        queryKey: ['anexo-versoes', variables.anexoId],
      });
      queryClient.invalidateQueries({
        queryKey: ['storage-usage'],
      });

      toast.success('Nova versão enviada!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Erro ao enviar versão';
      toast.error(message);
    },
  });
}

/**
 * Deletar anexo
 */
export function useDeleteAnexo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (anexoId: string) => {
      await api.delete(`/anexos/${anexoId}`);
    },
    onSuccess: () => {
      // Invalidar todas as queries de anexos
      queryClient.invalidateQueries({
        queryKey: ['anexos'],
      });
      queryClient.invalidateQueries({
        queryKey: ['storage-usage'],
      });

      toast.success('Arquivo removido com sucesso!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Erro ao remover arquivo';
      toast.error(message);
    },
  });
}

/**
 * Gerar URL de download
 */
export async function getDownloadUrl(anexoId: string): Promise<string> {
  const response = await api.get(`/anexos/${anexoId}/download`);
  return response.data.data.urlAssinada;
}
```

---

## 2. Hook de Upload

### `hooks/use-file-upload.ts`

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadAnexo } from '@/lib/queries/anexos';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
];

export interface FileUploadState {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function useFileUpload(
  entidadeTipo: string,
  entidadeId: string,
  options?: {
    maxFiles?: number;
    maxSize?: number;
    allowedTypes?: string[];
  }
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

      // Upload automático
      acceptedFiles.forEach((file) => {
        uploadFile(file);
      });

      // Mostrar erros dos rejeitados
      rejectedFiles.forEach((rejected) => {
        const errors = rejected.errors
          .map((e: any) => e.message)
          .join(', ');
        
        setFiles((prev) => [
          ...prev,
          {
            file: rejected.file,
            progress: 0,
            status: 'error',
            error: errors,
          },
        ]);
      });
    },
    [entidadeTipo, entidadeId]
  );

  const uploadFile = async (file: File) => {
    try {
      await uploadMutation.mutateAsync({
        file,
        entidadeTipo,
        entidadeId,
        onProgress: (progress) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.file === file
                ? { ...f, progress, status: 'uploading' as const }
                : f
            )
          );
        },
      });

      // Sucesso
      setFiles((prev) =>
        prev.map((f) =>
          f.file === file ? { ...f, status: 'success' as const } : f
        )
      );

      // Remover da lista após 2s
      setTimeout(() => {
        setFiles((prev) => prev.filter((f) => f.file !== file));
      }, 2000);
    } catch (error: any) {
      setFiles((prev) =>
        prev.map((f) =>
          f.file === file
            ? {
                ...f,
                status: 'error' as const,
                error: error.message || 'Erro ao enviar arquivo',
              }
            : f
        )
      );
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    maxFiles: options?.maxFiles,
    maxSize: options?.maxSize || MAX_FILE_SIZE,
    accept: (options?.allowedTypes || ALLOWED_TYPES).reduce(
      (acc, type) => ({ ...acc, [type]: [] }),
      {}
    ),
  });

  const clearFiles = () => setFiles([]);

  return {
    files,
    getRootProps,
    getInputProps,
    isDragActive,
    isUploading: files.some((f) => f.status === 'uploading'),
    clearFiles,
  };
}
```

---

## 3. Componente de Upload

### `components/anexos/anexo-uploader.tsx`

```typescript
'use client';

import { useFileUpload } from '@/hooks/use-file-upload';
import { Upload, File, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface AnexoUploaderProps {
  entidadeTipo: string;
  entidadeId: string;
  maxFiles?: number;
  className?: string;
}

export function AnexoUploader({
  entidadeTipo,
  entidadeId,
  maxFiles = 10,
  className,
}: AnexoUploaderProps) {
  const { files, getRootProps, getInputProps, isDragActive, isUploading } =
    useFileUpload(entidadeTipo, entidadeId, { maxFiles });

  return (
    <div className={cn('space-y-4', className)}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          'hover:border-primary hover:bg-accent/50',
          isDragActive && 'border-primary bg-accent',
          isUploading && 'pointer-events-none opacity-50'
        )}
      >
        <input {...getInputProps()} />

        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />

        {isDragActive ? (
          <p className="text-sm font-medium">Solte os arquivos aqui...</p>
        ) : (
          <div>
            <p className="text-sm font-medium mb-1">
              Arraste arquivos ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, DOCX, XLSX, JPG, PNG (máx. 10MB por arquivo)
            </p>
          </div>
        )}
      </div>

      {/* Lista de uploads em progresso */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileState, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 border rounded-lg"
            >
              {/* Ícone de status */}
              {fileState.status === 'pending' && (
                <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
              {fileState.status === 'uploading' && (
                <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
              )}
              {fileState.status === 'success' && (
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              )}
              {fileState.status === 'error' && (
                <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              )}

              {/* Info do arquivo */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {fileState.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(fileState.file.size)}
                </p>

                {/* Erro */}
                {fileState.error && (
                  <p className="text-xs text-destructive mt-1">
                    {fileState.error}
                  </p>
                )}

                {/* Progresso */}
                {fileState.status === 'uploading' && (
                  <Progress value={fileState.progress} className="h-1 mt-2" />
                )}
              </div>

              {/* Percentual */}
              {fileState.status === 'uploading' && (
                <span className="text-xs text-muted-foreground">
                  {fileState.progress}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
```

---

## 4. Lista de Anexos

### `components/anexos/anexo-list.tsx`

```typescript
'use client';

import { useAnexos } from '@/lib/queries/anexos';
import { AnexoCard } from './anexo-card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileX } from 'lucide-react';

interface AnexoListProps {
  entidadeTipo: string;
  entidadeId: string;
}

export function AnexoList({ entidadeTipo, entidadeId }: AnexoListProps) {
  const { data: anexos, isLoading, error } = useAnexos(entidadeTipo, entidadeId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Erro ao carregar anexos
      </div>
    );
  }

  if (!anexos || anexos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileX className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum anexo encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {anexos.map((anexo) => (
        <AnexoCard key={anexo.id} anexo={anexo} />
      ))}
    </div>
  );
}
```

---

## 5. Card de Anexo

### `components/anexos/anexo-card.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Anexo, useDeleteAnexo, getDownloadUrl } from '@/lib/queries/anexos';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Download,
  Trash2,
  MoreVertical,
  Eye,
  History,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnexoPreview } from './anexo-preview';
import { AnexoVersoes } from './anexo-versoes';

interface AnexoCardProps {
  anexo: Anexo;
}

export function AnexoCard({ anexo }: AnexoCardProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [showVersoes, setShowVersoes] = useState(false);
  const deleteMutation = useDeleteAnexo();

  const handleDownload = async () => {
    const url = await getDownloadUrl(anexo.id);
    window.open(url, '_blank');
  };

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja remover este arquivo?')) {
      await deleteMutation.mutateAsync(anexo.id);
    }
  };

  const getFileIcon = () => {
    if (anexo.mimeType.startsWith('image/')) {
      return <ImageIcon className="h-8 w-8" />;
    }
    if (anexo.mimeType === 'application/pdf') {
      return <FileText className="h-8 w-8" />;
    }
    return <FileIcon className="h-8 w-8" />;
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="text-muted-foreground">{getFileIcon()}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate" title={anexo.nomeOriginal}>
                  {anexo.nomeOriginal}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(anexo.tamanho)}
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowPreview(true)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowVersoes(true)}>
                  <History className="h-4 w-4 mr-2" />
                  Versões
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          {anexo.versao > 1 && (
            <Badge variant="secondary" className="text-xs">
              v{anexo.versao}
            </Badge>
          )}
        </CardContent>

        <CardFooter className="text-xs text-muted-foreground pt-3 border-t">
          <div className="flex items-center justify-between w-full">
            <span>Por {anexo.uploadPor.nome}</span>
            <span>
              {formatDistanceToNow(new Date(anexo.uploadEm), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
        </CardFooter>
      </Card>

      {/* Modals */}
      <AnexoPreview
        anexo={anexo}
        open={showPreview}
        onOpenChange={setShowPreview}
      />

      <AnexoVersoes
        anexoId={anexo.id}
        open={showVersoes}
        onOpenChange={setShowVersoes}
      />
    </>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
```

---

## 6. Indicador de Storage

### `components/anexos/storage-indicator.tsx`

```typescript
'use client';

import { useStorageUsage } from '@/lib/queries/anexos';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HardDrive, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function StorageIndicator() {
  const { data, isLoading } = useStorageUsage();

  if (isLoading) {
    return <Skeleton className="h-20" />;
  }

  if (!data) return null;

  const { usage, limits } = data;
  const percentUsed = limits.percentUsed;
  const shouldAlert = limits.shouldAlert;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Armazenamento</span>
        </div>
        <span className="text-muted-foreground">
          {formatBytes(BigInt(usage.totalBytes))} de{' '}
          {formatBytes(BigInt(limits.bytesLimit))}
        </span>
      </div>

      <Progress
        value={percentUsed}
        className="h-2"
        indicatorClassName={
          percentUsed >= 95
            ? 'bg-destructive'
            : percentUsed >= 80
            ? 'bg-yellow-500'
            : 'bg-primary'
        }
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{usage.totalFiles} arquivos</span>
        <span>{percentUsed.toFixed(1)}% usado</span>
      </div>

      {shouldAlert && (
        <Alert variant={limits.shouldBlock ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {limits.shouldBlock
              ? 'Limite de armazenamento atingido! Não é possível fazer novos uploads.'
              : 'Você está próximo do limite de armazenamento.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function formatBytes(bytes: bigint): string {
  const num = Number(bytes);
  if (num === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return `${(num / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
```

---

## 7. Preview de Anexo

### `components/anexos/anexo-preview.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Anexo, getDownloadUrl } from '@/lib/queries/anexos';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

interface AnexoPreviewProps {
  anexo: Anexo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnexoPreview({ anexo, open, onOpenChange }: AnexoPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && !url) {
      loadUrl();
    }
  }, [open]);

  const loadUrl = async () => {
    setLoading(true);
    try {
      const downloadUrl = await getDownloadUrl(anexo.id);
      setUrl(downloadUrl);
    } catch (error) {
      console.error('Erro ao carregar preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const renderPreview = () => {
    if (loading || !url) {
      return (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    // Imagens
    if (anexo.mimeType.startsWith('image/')) {
      return (
        <img
          src={url}
          alt={anexo.nomeOriginal}
          className="max-w-full max-h-[70vh] mx-auto"
        />
      );
    }

    // PDF
    if (anexo.mimeType === 'application/pdf') {
      return (
        <iframe
          src={url}
          className="w-full h-[70vh] border-0"
          title={anexo.nomeOriginal}
        />
      );
    }

    // Outros tipos - apenas botão de download
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <p className="text-muted-foreground">
          Preview não disponível para este tipo de arquivo
        </p>
        <Button onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{anexo.nomeOriginal}</DialogTitle>
        </DialogHeader>

        {renderPreview()}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleDownload} disabled={!url}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 8. Histórico de Versões

### `components/anexos/anexo-versoes.tsx`

```typescript
'use client';

import { useAnexoVersoes } from '@/lib/queries/anexos';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getDownloadUrl } from '@/lib/queries/anexos';

interface AnexoVersoesProps {
  anexoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnexoVersoes({ anexoId, open, onOpenChange }: AnexoVersoesProps) {
  const { data: versoes, isLoading } = useAnexoVersoes(anexoId);

  const handleDownload = async (versionAnexoId: string) => {
    const url = await getDownloadUrl(versionAnexoId);
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Histórico de Versões</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !versoes || versoes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma versão anterior encontrada
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {versoes.map((versao, index) => (
              <div
                key={versao.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={index === 0 ? 'default' : 'secondary'}>
                      v{versao.versao}
                    </Badge>
                    {index === 0 && (
                      <Badge variant="outline">Atual</Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">
                    {versao.nomeOriginal}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(versao.tamanho)} • {versao.uploadPor.nome} •{' '}
                    {formatDistanceToNow(new Date(versao.uploadEm), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(versao.id)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
```

---

## 9. Exports

### `components/anexos/index.ts`

```typescript
export { AnexoUploader } from './anexo-uploader';
export { AnexoList } from './anexo-list';
export { AnexoCard } from './anexo-card';
export { AnexoPreview } from './anexo-preview';
export { AnexoVersoes } from './anexo-versoes';
export { StorageIndicator } from './storage-indicator';
```

---

## 10. Exemplo de Uso

### Página de Cotação

```typescript
// app/(app)/cotacoes/[id]/page.tsx

'use client';

import { useParams } from 'next/navigation';
import {
  AnexoUploader,
  AnexoList,
  StorageIndicator,
} from '@/components/anexos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CotacaoDetalhesPage() {
  const params = useParams();
  const cotacaoId = params.id as string;

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Cotação #{cotacaoId}</h1>
      </div>

      {/* Storage Indicator */}
      <StorageIndicator />

      {/* Tabs */}
      <Tabs defaultValue="detalhes">
        <TabsList>
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          <TabsTrigger value="anexos">Anexos</TabsTrigger>
        </TabsList>

        <TabsContent value="detalhes">
          {/* Detalhes da cotação */}
        </TabsContent>

        <TabsContent value="anexos" className="space-y-6">
          {/* Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Enviar Anexos</CardTitle>
            </CardHeader>
            <CardContent>
              <AnexoUploader
                entidadeTipo="cotacao"
                entidadeId={cotacaoId}
              />
            </CardContent>
          </Card>

          {/* Lista */}
          <Card>
            <CardHeader>
              <CardTitle>Anexos da Cotação</CardTitle>
            </CardHeader>
            <CardContent>
              <AnexoList entidadeTipo="cotacao" entidadeId={cotacaoId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## Próximos Passos

- [11. Frontend Admin →](./11-FRONTEND-ADMIN.md) - Aplicação administrativa
- [05. Integração Chat →](./05-INTEGRACAO-CHAT.md) - Anexos no chat
- [16. Testes →](./16-TESTES.md) - Testes dos componentes

---

**Navegação**: [← 09. API Admin](./09-API-ADMIN.md) | [Índice](./00-INDICE.md) | [11. Frontend Admin →](./11-FRONTEND-ADMIN.md)
