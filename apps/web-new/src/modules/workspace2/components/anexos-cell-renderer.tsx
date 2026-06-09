import { useState } from 'react';
import { Loader2, Paperclip, Upload } from 'lucide-react';
import type { ICellRendererParams } from 'ag-grid-community';
import { useQueryClient } from '@tanstack/react-query';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/ui/popover';
import { useAnexos } from '@/modules/anexos/http';
import { AnexoCard } from '@/modules/anexos/components/anexo-card';
import { useFileUpload } from '@/core/hooks/use-file-upload';
import { Progress } from '@/core/ui/progress';
import { areaTrabalhoKeys } from '@/modules/area-trabalho/http';
import type { WorkspaceRow } from '../types';

// ─── Upload compacto ──────────────────────────────────────────────────────────

function CompactUploader({
  entidade,
  entidadeId,
  onSuccess,
}: {
  entidade: string;
  entidadeId: string;
  onSuccess?: () => void;
}) {
  const { files, getRootProps, getInputProps, isDragActive, isUploading } = useFileUpload(
    entidade,
    entidadeId,
    { maxFiles: 5, onSuccess },
  );

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`flex items-center gap-2 rounded-md border-2 border-dashed px-3 py-2 cursor-pointer transition-colors text-xs ${
          isDragActive
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="size-3.5 shrink-0" />
        <span>{isDragActive ? 'Solte aqui' : 'Arraste ou clique para anexar'}</span>
      </div>

      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div key={i} className="space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs">{f.file.name}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {f.status === 'success' ? '✓' : f.status === 'error' ? '✗' : `${f.progress}%`}
                </span>
              </div>
              {f.status === 'uploading' && <Progress value={f.progress} className="h-0.5" />}
              {f.status === 'error' && f.error && (
                <p className="text-[10px] text-destructive">{f.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Lista compacta ───────────────────────────────────────────────────────────

function CompactAnexoList({ entidade, entidadeId }: { entidade: string; entidadeId: string }) {
  const { data: anexos, isLoading } = useAnexos(entidade, entidadeId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-3">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!anexos?.length) {
    return <p className="text-center text-xs text-muted-foreground py-3">Nenhum documento anexado</p>;
  }

  return (
    <div className="space-y-1.5">
      {anexos.map((anexo) => (
        <AnexoCard key={anexo.id} anexo={anexo} contextEntidade={entidade} />
      ))}
    </div>
  );
}

// ─── Cell renderer ────────────────────────────────────────────────────────────

const SITUACOES_OCULTAS = new Set(['Renovar', 'Perdido']);

function AnexosConvertidoButton({ data }: { data: WorkspaceRow }) {
  const [open, setOpen] = useState(false);
  const docNovoId = data._renovacao?.documentoVendaNovo?.id ?? null;
  if (!docNovoId) return null;

  return (
    <div className="flex items-center h-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 h-6 px-1.5 rounded text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
            title="Ver anexos do documento gerado"
          >
            <Paperclip className="size-3.5 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end" side="left">
          <div className="border-b px-3 py-2">
            <span className="text-sm font-medium">Anexos do documento gerado</span>
          </div>
          <div className="max-h-96 overflow-y-auto p-3">
            {open && <CompactAnexoList entidade="documento_venda" entidadeId={docNovoId} />}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function AnexosCellRenderer({ data }: ICellRendererParams<WorkspaceRow>) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  if (!data) return null;
  if (data.situacao === 'Convertido') return <AnexosConvertidoButton data={data} />;
  if (SITUACOES_OCULTAS.has(data.situacao)) return null;

  const entidade = 'cotacao' as const;
  const entidadeId = data.cotacaoId ?? '';
  const canUpload = !!entidadeId;

  if (!entidadeId) return null;

  const count = data.anexosCount;

  const handleUploadSuccess = () => {
    queryClient.setQueryData<any[]>(areaTrabalhoKeys.cotacoes(), (old) =>
      Array.isArray(old)
        ? old.map((c) =>
            c.id === entidadeId ? { ...c, anexosCount: (c.anexosCount ?? 0) + 1 } : c,
          )
        : old,
    );
    queryClient.invalidateQueries({ queryKey: ['anexos', entidade, entidadeId] });
  };

  return (
    <div className="flex items-center h-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 h-6 px-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Paperclip className="size-3.5 shrink-0" />
            {count > 0 && (
              <span className="text-[10px] font-medium leading-none">{count}</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end" side="left">
          <div className="border-b px-3 py-2">
            <span className="text-sm font-medium">Documentos</span>
          </div>
          <div className="max-h-96 overflow-y-auto p-3 space-y-3">
            {open && (
              <>
                {canUpload && (
                  <CompactUploader
                    entidade={entidade}
                    entidadeId={entidadeId}
                    onSuccess={handleUploadSuccess}
                  />
                )}
                <CompactAnexoList entidade={entidade} entidadeId={entidadeId} />
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
