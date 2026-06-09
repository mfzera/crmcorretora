
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
import { Loader2, RotateCcw } from 'lucide-react';

interface ImportRollbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  count: number;
}

export function ImportRollbackDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  count,
}: ImportRollbackDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-destructive" />
            Reverter {count} item{count !== 1 ? 's' : ''}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Esta ação irá deletar permanentemente as renovações e/ou documentos
              criados pelos itens selecionados.
            </span>
            <span className="block font-medium text-foreground">
              Somente itens com status <em>Não Trabalhado</em> podem ser
              revertidos. Itens já trabalhados serão ignorados.
            </span>
            <span className="block text-destructive">
              Esta ação não pode ser desfeita.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Revertendo...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reverter
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
