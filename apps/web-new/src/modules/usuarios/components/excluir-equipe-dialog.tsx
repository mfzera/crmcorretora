
import { AlertCircle, Loader2 } from 'lucide-react';

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
import { useDeleteEquipe } from '@/modules/equipes/http';
import type { Equipe } from '@/types/equipe';

interface ExcluirEquipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipe: Equipe | null;
}

export function ExcluirEquipeDialog({ open, onOpenChange, equipe }: ExcluirEquipeDialogProps) {
  const deleteEquipe = useDeleteEquipe();

  const handleExcluir = async () => {
    if (!equipe) return;
    await deleteEquipe.mutateAsync(equipe.id);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Excluir Equipe
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Tem certeza que deseja excluir a equipe{' '}
                <span className="font-semibold">{equipe?.nome}</span>?
              </p>
              <p>
                Todos os membros ficarão sem equipe atribuída. Esta ação não pode ser desfeita.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteEquipe.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleExcluir}
            disabled={deleteEquipe.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteEquipe.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
