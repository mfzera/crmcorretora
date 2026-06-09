
import { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/core/ui/alert-dialog';
import { Button } from '@/core/ui/button';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { useDeleteClient } from '../http';
import type { Cliente } from '@/types/cliente';
import { getNomeCliente } from '@/types/cliente';

interface ExcluirClienteDialogProps {
  cliente: Cliente;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function ExcluirClienteDialog({ cliente, trigger, onSuccess }: ExcluirClienteDialogProps) {
  const [open, setOpen] = useState(false);
  const excluirCliente = useDeleteClient();

  const handleExcluir = async () => {
    try {
      await excluirCliente.mutateAsync(cliente.id);
      toast.success('Cliente excluído com sucesso!');
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                Esta ação não pode ser desfeita
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="my-4 rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground mb-2">Você está prestes a excluir:</p>
          <p className="text-base font-semibold">{getNomeCliente(cliente)}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {cliente.tipoPessoa === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Todos os dados relacionados a este cliente serão permanentemente removidos do sistema.
          Tem certeza que deseja continuar?
        </p>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={excluirCliente.isPending}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleExcluir}
            disabled={excluirCliente.isPending}
          >
            {excluirCliente.isPending ? 'Excluindo...' : 'Sim, Excluir Cliente'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
