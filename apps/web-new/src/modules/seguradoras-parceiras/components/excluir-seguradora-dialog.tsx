
import { useState } from 'react';
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
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { useDeleteInsurancePartner, useSeguradoraParceira } from '@/modules/seguradoras-parceiras/http';

interface ExcluirSeguradoraDialogProps {
  corretoraId: string;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export function ExcluirSeguradoraDialog({
  corretoraId,
  trigger,
  onSuccess,
}: ExcluirSeguradoraDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: seguradora } = useSeguradoraParceira(corretoraId);
  const excluirSeguradora = useDeleteInsurancePartner();

  const handleExcluir = async () => {
    try {
      await excluirSeguradora.mutateAsync(corretoraId);
      toast.success('Seguradora excluída com sucesso!');
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Seguradora</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Tem certeza que deseja excluir a seguradora{' '}
              <span className="font-semibold text-foreground">
                {seguradora?.nomeFantasia || seguradora?.razaoSocial}
              </span>
              ?
            </p>
            <p className="text-sm text-muted-foreground">
              Esta ação não pode ser desfeita. A seguradora só pode ser excluída se não houver produtos vinculados a ela.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleExcluir}
            disabled={excluirSeguradora.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {excluirSeguradora.isPending ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
