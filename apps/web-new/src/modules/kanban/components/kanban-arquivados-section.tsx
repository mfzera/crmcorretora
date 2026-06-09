import { memo, useCallback } from 'react';
import { toast } from 'sonner';
import { Archive, RotateCcw } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { handleApiError } from '@/core/utils/handle-api-error';
import { useMoverOportunidade, useOportunidades } from '../http';
import { KanbanCard } from './kanban-card';

interface KanbanArquivadosSectionProps {
  produtoId?: string;
}

/**
 * Carrega e exibe as oportunidades arquivadas. Tem seu próprio fetch — só
 * acontece quando esta seção é montada (showArquivados=true no board).
 */
export const KanbanArquivadosSection = memo(function KanbanArquivadosSection({
  produtoId,
}: KanbanArquivadosSectionProps) {
  const { data: arquivadas = [] } = useOportunidades({
    status: 'arquivada',
    produtoId: produtoId || undefined,
  });
  const moverOportunidade = useMoverOportunidade();

  const handleReativar = useCallback(
    (id: string) => {
      moverOportunidade.mutate(
        { id, data: { novoStatus: 'lead', novaOrdem: 0 } },
        {
          onSuccess: () => toast.success('Oportunidade reativada como Lead'),
          onError: (error: unknown) => toast.error(handleApiError(error)),
        },
      );
    },
    [moverOportunidade],
  );

  return (
    <div className="px-4 pt-2 pb-4 border-t mt-2">
      <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
        <Archive className="h-3.5 w-3.5" />
        Arquivados ({arquivadas.length})
      </p>
      {arquivadas.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma oportunidade arquivada.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {arquivadas.map((op) => (
            <div key={op.id} className="relative group">
              <KanbanCard oportunidade={op} />
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2 h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                title="Reativar para Lead"
                onClick={() => handleReativar(op.id)}
              >
                <RotateCcw className="h-3 w-3" />
                Reativar
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
