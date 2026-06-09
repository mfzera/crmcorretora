import { useState } from 'react';
import { Settings, X, Loader2 } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import { toast } from 'sonner';
import { negociosKeys } from '../http';

interface NegociosBulkActionBarProps {
  selectedIds: Set<string>;
  documentos: any[];
  onClearSelection: () => void;
  defaultPercentualCorretora?: number;
}

export function NegociosBulkActionBar({
  selectedIds,
  documentos,
  onClearSelection,
  defaultPercentualCorretora = 30,
}: NegociosBulkActionBarProps) {
  const qc = useQueryClient();
  const [isApplying, setIsApplying] = useState(false);

  const count = selectedIds.size;

  const applyBulkMutation = useMutation({
    mutationFn: async (percCorretora: number) => {
      const ids = Array.from(selectedIds);
      const results = await Promise.allSettled(
        ids.map((id) => {
          const doc = documentos.find((d) => d.id === id);
          const valorComissaoTotal = parseFloat(doc?.valorComissao ?? '0') || 0;
          const valorCorretora = (valorComissaoTotal * percCorretora) / 100;
          return api.patch(`/quotes/${id}`, {
            percentualCorretora: percCorretora,
            valorComissaoCorretora: valorCorretora,
          });
        }),
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;
      return { succeeded, failed, total: ids.length };
    },
    onSuccess: ({ succeeded, failed }) => {
      qc.invalidateQueries({ queryKey: negociosKeys.all });
      if (failed === 0) {
        toast.success(`${succeeded} negócio${succeeded > 1 ? 's' : ''} configurado${succeeded > 1 ? 's' : ''} com sucesso!`);
      } else {
        toast.warning(`${succeeded} configurado${succeeded > 1 ? 's' : ''}, ${failed} falha${failed > 1 ? 's' : ''}`);
      }
      onClearSelection();
    },
    onError: () => {
      toast.error('Erro ao aplicar comissão em lote');
    },
  });

  if (count === 0) return null;

  async function handleApplyBulk() {
    setIsApplying(true);
    try {
      await applyBulkMutation.mutateAsync(defaultPercentualCorretora);
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 hidden sm:flex items-center gap-3 bg-card border rounded-full px-4 py-2 shadow-xl animate-in slide-in-from-bottom-4">
      <span className="text-sm font-medium tabular-nums whitespace-nowrap">
        {count} selecionado{count > 1 ? 's' : ''}
      </span>
      <div className="h-4 w-px bg-border" />
      <Button
        size="sm"
        variant="default"
        className="h-7 gap-1.5 rounded-full text-xs"
        onClick={handleApplyBulk}
        disabled={isApplying || applyBulkMutation.isPending}
      >
        {isApplying ? <Loader2 className="size-3 animate-spin" /> : <Settings className="size-3" />}
        Aplicar comissão padrão ({defaultPercentualCorretora}%)
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 gap-1 rounded-full text-xs"
        onClick={onClearSelection}
        disabled={isApplying}
      >
        <X className="size-3" />
        Desmarcar
      </Button>
    </div>
  );
}
