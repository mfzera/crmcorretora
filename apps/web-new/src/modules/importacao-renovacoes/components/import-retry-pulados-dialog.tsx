
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
import { Loader2, SkipForward } from 'lucide-react';

interface ImportRetryPuladosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  count: number;
}

export function ImportRetryPuladosDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  count,
}: ImportRetryPuladosDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <SkipForward className="h-5 w-5 text-yellow-600" />
            Reprocessar {count} item{count !== 1 ? 's' : ''} pulado{count !== 1 ? 's' : ''}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            O sistema irá reverificar cada item pulado usando a lógica de
            detecção de duplicatas atualizada. Itens que foram pulados
            incorretamente (ex.: cliente com dois produtos diferentes na
            mesma vigência) serão processados e criados normalmente.
            Itens que ainda forem duplicatas reais continuarão como pulados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reprocessando...
              </>
            ) : (
              <>
                <SkipForward className="h-4 w-4 mr-2" />
                Reprocessar
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
