
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/core/ui/alert-dialog';
import { Loader2, RefreshCw } from 'lucide-react';

interface ImportRetryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  count: number;
}

export function ImportRetryDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  count,
}: ImportRetryDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Retentar {count} item{count !== 1 ? 's' : ''} com erro?
          </AlertDialogTitle>
          <AlertDialogDescription>
            O sistema irá reprocessar os itens com erro usando os dados originais
            da planilha. Itens que dependiam de clientes não cadastrados serão
            automaticamente processados se os clientes já tiverem sido
            cadastrados desde a última tentativa.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Retentando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retentar
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
