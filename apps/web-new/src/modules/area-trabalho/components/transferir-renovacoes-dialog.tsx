
import { useState } from 'react';
import { Check, Loader2, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { ScrollArea } from '@/core/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { cn } from '@/core/utils';
import { useVendedores } from '@/modules/usuarios/http';
import { useTransferirRenovacoes } from '@/modules/renovacoes/http';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';

interface TransferirRenovacoesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  renovacaoIds: string[];
  vendedorAtualId: string;
  onSuccess?: () => void;
}

export function TransferirRenovacoesDialog({
  open,
  onOpenChange,
  renovacaoIds,
  vendedorAtualId,
  onSuccess,
}: TransferirRenovacoesDialogProps) {
  const [selectedVendedorId, setSelectedVendedorId] = useState<string | null>(
    null,
  );

  const { data: vendedores, isLoading: loadingVendedores } = useVendedores();
  const transferirMutation = useTransferirRenovacoes();

  // Filtrar vendedores (remover o vendedor atual)
  // Nota: endpoint /sellers já retorna apenas ativos
  const vendedoresDisponiveis =
    vendedores?.filter((v) => v.id !== vendedorAtualId) || [];

  const handleTransferir = async () => {
    if (!selectedVendedorId) {
      toast.error('Selecione um vendedor');
      return;
    }

    try {
      await transferirMutation.mutateAsync({
        renovacaoIds,
        novoVendedorId: selectedVendedorId,
      });

      toast.success(
        `${renovacaoIds.length} renovação(ões) transferida(s) com sucesso`,
      );

      onOpenChange(false);
      setSelectedVendedorId(null);
      onSuccess?.();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transferir Renovações</DialogTitle>
          <DialogDescription>
            Selecione o vendedor que receberá {renovacaoIds.length} renovação
            {renovacaoIds.length !== 1 ? 'ões' : ''}. Você será adicionado como
            vendedor secundário.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loadingVendedores ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : vendedoresDisponiveis.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhum vendedor disponível para transferência
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {vendedoresDisponiveis.map((vendedor) => (
                  <button
                    key={vendedor.id}
                    onClick={() => setSelectedVendedorId(vendedor.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all',
                      'hover:border-primary hover:bg-accent',
                      selectedVendedorId === vendedor.id &&
                        'border-primary bg-accent',
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(vendedor.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{vendedor.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {vendedor.email}
                      </p>
                    </div>
                    {selectedVendedorId === vendedor.id && (
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={transferirMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleTransferir}
            disabled={
              !selectedVendedorId ||
              transferirMutation.isPending ||
              vendedoresDisponiveis.length === 0
            }
          >
            {transferirMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transferindo...
              </>
            ) : (
              <>
                <ArrowRight className="mr-2 h-4 w-4" />
                Transferir
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
