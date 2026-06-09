
import { X, ArrowRightLeft, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { cn } from '@/core/utils';

export function RenovacoesBarraAcoes({
  selecionados,
  onDesmarcar,
  onReatribuir,
  onExcluir,
  podeExcluir,
  isExcluindo,
}: {
  selecionados: string[];
  onDesmarcar: () => void;
  onReatribuir: () => void;
  onExcluir: () => void;
  podeExcluir: boolean;
  isExcluindo?: boolean;
}) {
  if (selecionados.length === 0) return null;

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-2.5 rounded-lg border',
      'bg-primary/5 border-primary/20 dark:bg-primary/10',
    )}>
      <Badge variant="secondary" className="font-medium">
        {selecionados.length} selecionado{selecionados.length > 1 ? 's' : ''}
      </Badge>

      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={onDesmarcar}
        >
          <X className="size-3.5" />
          Desmarcar
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={onReatribuir}
        >
          <ArrowRightLeft className="size-3.5" />
          Reatribuir
        </Button>

        {podeExcluir && (
          <Button
            variant="destructive"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={onExcluir}
            disabled={isExcluindo}
          >
            {isExcluindo ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            Excluir
          </Button>
        )}
      </div>
    </div>
  );
}
