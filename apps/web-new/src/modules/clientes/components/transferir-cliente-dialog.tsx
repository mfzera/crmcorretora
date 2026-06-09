
import { useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Label } from '@/core/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { useTransferirCliente } from '../http';
import { useUsuarios } from '@/modules/usuarios/http';
import type { Cliente } from '@/types/cliente';
import { getNomeCliente } from '@/types/cliente';

interface TransferirClienteDialogProps {
  cliente: Cliente;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function TransferirClienteDialog({
  cliente,
  trigger,
  onSuccess
}: TransferirClienteDialogProps) {
  const [open, setOpen] = useState(false);
  const [novoVendedorId, setNovoVendedorId] = useState<string>('');

  const transferirCliente = useTransferirCliente();
  const { data: usuariosData, isLoading: loadingUsuarios } = useUsuarios(
    { ativo: 'true' },
    { enabled: open }
  );

  const vendedores = usuariosData?.data || [];

  const handleTransferir = async () => {
    if (!novoVendedorId) {
      toast.error('Selecione um vendedor para transferir o cliente');
      return;
    }

    if (novoVendedorId === cliente.vendedorId) {
      toast.error('O vendedor selecionado já é o responsável por este cliente');
      return;
    }

    try {
      await transferirCliente.mutateAsync({
        id: cliente.id,
        novoVendedorId,
      });

      toast.success('Cliente transferido com sucesso!');
      setOpen(false);
      setNovoVendedorId('');
      onSuccess?.();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setNovoVendedorId('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-primary/10 p-3">
              <ArrowRightLeft className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle>Transferir Cliente</DialogTitle>
              <DialogDescription className="mt-1">
                Selecione o novo vendedor responsável
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="my-4 rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground mb-2">Cliente:</p>
          <p className="text-base font-semibold">{getNomeCliente(cliente)}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {cliente.tipoPessoa === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vendedor">Novo Vendedor Responsável</Label>
            <Select
              value={novoVendedorId}
              onValueChange={setNovoVendedorId}
              disabled={loadingUsuarios || transferirCliente.isPending}
            >
              <SelectTrigger id="vendedor">
                <SelectValue placeholder="Selecione um vendedor" />
              </SelectTrigger>
              <SelectContent>
                {vendedores
                  .filter((vendedor) => vendedor.id !== cliente.vendedorId)
                  .map((vendedor) => (
                    <SelectItem key={vendedor.id} value={vendedor.id}>
                      {vendedor.nome} {vendedor.email && `(${vendedor.email})`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O vendedor original será mantido como quem transferiu o cliente
            </p>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={transferirCliente.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleTransferir}
            disabled={!novoVendedorId || transferirCliente.isPending}
          >
            {transferirCliente.isPending ? 'Transferindo...' : 'Transferir Cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
