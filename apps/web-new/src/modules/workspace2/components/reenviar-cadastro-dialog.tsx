import { useState } from 'react';
import { Send, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { useSolicitarValidacaoCadastro, areaTrabalhoKeys } from '@/modules/area-trabalho/http';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';

export interface ReenviarCadastroRow {
  clienteNome: string;
  documentoVendaId: string;
  motivoRejeicao: string | null | undefined;
}

interface Props {
  row: ReenviarCadastroRow | null;
  open: boolean;
  onClose: () => void;
}

export function ReenviarCadastroDialog({ row, open, onClose }: Props) {
  const queryClient = useQueryClient();
  const solicitarMutation = useSolicitarValidacaoCadastro();

  const handleReenviar = async () => {
    if (!row) return;
    try {
      await solicitarMutation.mutateAsync(row.documentoVendaId);
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.all });
      toast.success('Reenviado para o cadastro com sucesso!');
      onClose();
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="size-5 text-orange-500" />
            Reenviar para Cadastro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {row?.clienteNome && (
            <p className="text-sm text-muted-foreground">
              Cliente: <span className="font-medium text-foreground">{row.clienteNome}</span>
            </p>
          )}

          {row?.motivoRejeicao && (
            <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wide">Motivo da Rejeição</span>
              </div>
              <p className="text-sm text-rose-700 dark:text-rose-300 leading-relaxed">
                {row.motivoRejeicao}
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Deseja reenviar este documento para aprovação pelo cadastro?
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={solicitarMutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleReenviar}
            disabled={solicitarMutation.isPending}
            className="bg-orange-600 hover:bg-orange-700 gap-2"
          >
            <Send className="size-4" />
            {solicitarMutation.isPending ? 'Enviando...' : 'Reenviar para Cadastro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
