
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AnexoUploader } from './anexo-uploader';
import { AnexoList } from './anexo-list';
import { StorageIndicator } from './storage-indicator';
import { Separator } from '@/core/ui/separator';

interface AnexosTabProps {
  entidade: string;
  entidadeId: string;
  isActive: boolean;
  readOnly?: boolean;
}

export function AnexosTab({ entidade, entidadeId, isActive, readOnly }: AnexosTabProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isActive) return;
    // Defer para depois do paint inicial da aba (melhora INP)
    const id = setTimeout(() => {
      queryClient.invalidateQueries({
        queryKey: ['anexos', entidade, entidadeId],
      });
    }, 0);
    return () => clearTimeout(id);
  }, [isActive, entidade, entidadeId, queryClient]);

  if (!isActive) return null;

  return (
    <div className="space-y-6">
      {!readOnly && <StorageIndicator />}

      {!readOnly && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Upload de Arquivos</h3>
          <AnexoUploader
            entidade={entidade}
            entidadeId={entidadeId}
            maxFiles={10}
          />
        </div>
      )}

      {!readOnly && <Separator />}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Arquivos Anexados</h3>
        <AnexoList entidade={entidade} entidadeId={entidadeId} readOnly={readOnly} />
      </div>
    </div>
  );
}
