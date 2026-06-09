
import { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/core/ui/alert';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { useExcluirProduto, useProduto } from '@/modules/produtos/http';

interface ExcluirProdutoDialogProps {
  produtoId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function ExcluirProdutoDialog({
  produtoId,
  trigger,
  onSuccess,
}: ExcluirProdutoDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: produto } = useProduto(open ? produtoId : null);
  const excluirProduto = useExcluirProduto();

  const handleExcluir = async () => {
    try {
      await excluirProduto.mutateAsync(produtoId);
      toast.success('Produto excluído com sucesso!');
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Excluir Produto
          </DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir este produto?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {produto && (
            <div className="rounded-lg border p-4 space-y-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Nome do Produto
                </p>
                <p className="font-medium">{produto.nomeProduto}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Tipo de Seguro
                </p>
                <p>{produto.tipoSeguro}</p>
              </div>
            </div>
          )}

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Esta ação não pode ser desfeita. O produto será marcado como excluído
              e não estará mais disponível para seleção em novos registros. Os
              registros existentes que já usam este produto não serão afetados.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={excluirProduto.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleExcluir}
            disabled={excluirProduto.isPending}
          >
            {excluirProduto.isPending ? 'Excluindo...' : 'Sim, Excluir Produto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
