
import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Textarea } from '@/core/ui/textarea';
import { Label } from '@/core/ui/label';
import { useSolicitarExclusaoRenovacao } from '@/modules/renovacoes/http';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';

interface SolicitarExclusaoRenovacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  renovacaoIds: string[];
  nomeCliente?: string;
  onSuccess?: () => void;
}

export function SolicitarExclusaoRenovacaoDialog({
  open,
  onOpenChange,
  renovacaoIds,
  nomeCliente,
  onSuccess,
}: SolicitarExclusaoRenovacaoDialogProps) {
  const [motivo, setMotivo] = useState('');
  const solicitarMutation = useSolicitarExclusaoRenovacao();

  const quantidade = renovacaoIds.length;

  const handleSubmit = async () => {
    if (!motivo.trim()) {
      toast.error('Informe o motivo da exclusão');
      return;
    }

    try {
      // Enviar uma solicitação por renovação
      await Promise.all(
        renovacaoIds.map((renovacaoId) =>
          solicitarMutation.mutateAsync({ renovacaoId, motivo: motivo.trim() }),
        ),
      );
      toast.success(
        quantidade === 1
          ? 'Solicitação de exclusão enviada. Aguardando aprovação.'
          : `${quantidade} solicitações de exclusão enviadas. Aguardando aprovação.`,
      );
      setMotivo('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const descricao =
    quantidade === 1
      ? nomeCliente
        ? `Você está solicitando a exclusão da renovação de ${nomeCliente}.`
        : 'Você está solicitando a exclusão desta renovação.'
      : `Você está solicitando a exclusão de ${quantidade} renovações.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            {quantidade === 1
              ? 'Solicitar Exclusão de Renovação'
              : `Solicitar Exclusão de ${quantidade} Renovações`}
          </DialogTitle>
          <DialogDescription>
            {descricao} Um administrador precisará aprovar a solicitação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="motivo">
              Motivo da exclusão <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="motivo"
              placeholder="Descreva o motivo para exclusão desta renovação..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {motivo.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setMotivo('');
              onOpenChange(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={solicitarMutation.isPending || !motivo.trim()}
          >
            {solicitarMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Solicitar Exclusão
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
