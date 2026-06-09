
import { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/core/ui/alert-dialog';
import { useDeleteCargo } from '@/modules/cargos/http';
import type { Cargo } from '@/types/cargo';

interface ExcluirCargoDialogProps {
  cargo: Cargo;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ExcluirCargoDialog({
  cargo,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: ExcluirCargoDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const excluirCargo = useDeleteCargo();

  const isAdmin = cargo.isAdmin;

  const handleExcluir = async () => {
    if (isAdmin) {
      toast.error('Não é possível excluir o cargo de Administrador');
      return;
    }

    try {
      await excluirCargo.mutateAsync(cargo.id);
      toast.success('Cargo excluído com sucesso');
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Excluir Cargo
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              {isAdmin ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                  <p className="text-sm font-medium text-destructive">
                    O cargo de Administrador não pode ser excluído.
                  </p>
                </div>
              ) : (
                <>
                  <p>
                    Tem certeza que deseja excluir o cargo{' '}
                    <span className="font-semibold">{cargo.nomeCargo}</span>?
                  </p>
                  <p className="text-sm">
                    Esta ação não pode ser desfeita. Se houver usuários com este
                    cargo, a exclusão falhará e você precisará reatribuí-los
                    antes.
                  </p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={excluirCargo.isPending}>
            Cancelar
          </AlertDialogCancel>
          {!isAdmin && (
            <AlertDialogAction
              onClick={handleExcluir}
              disabled={excluirCargo.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {excluirCargo.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Excluir
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
