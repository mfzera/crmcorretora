
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
import { useDeleteUser } from '@/modules/usuarios/http';
import { useAuthStore } from '@/infra/auth/auth-store';
import type { Usuario } from '@/types/usuario';

interface ExcluirUsuarioDialogProps {
  usuario: Usuario;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ExcluirUsuarioDialog({
  usuario,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: ExcluirUsuarioDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const { user } = useAuthStore();
  const excluirUsuario = useDeleteUser();

  const isSelf = user?.id === usuario.id;

  const handleExcluir = async () => {
    if (isSelf) {
      toast.error('Você não pode excluir sua própria conta');
      return;
    }

    try {
      await excluirUsuario.mutateAsync(usuario.id);
      toast.success('Usuário excluído com sucesso');
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
            Excluir Usuário
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {isSelf ? (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                <p className="text-sm font-medium text-destructive">
                  Você não pode excluir sua própria conta.
                </p>
              </div>
            ) : (
              <>
                <p>
                  Tem certeza que deseja excluir o usuário{' '}
                  <span className="font-semibold">{usuario.nome}</span>?
                </p>
                <p className="text-sm">
                  Esta ação não pode ser desfeita. O usuário será desativado e
                  não poderá mais acessar o sistema.
                </p>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={excluirUsuario.isPending}>
            Cancelar
          </AlertDialogCancel>
          {!isSelf && (
            <AlertDialogAction
              onClick={handleExcluir}
              disabled={excluirUsuario.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {excluirUsuario.isPending && (
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
