
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Textarea } from '@/core/ui/textarea';
import { Badge } from '@/core/ui/badge';
import { Separator } from '@/core/ui/separator';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { api } from '@/infra/http/api';
import { areaTrabalhoKeys } from '../http';
import type { Endosso } from '@/types/area-trabalho';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Paperclip,
} from 'lucide-react';
import { AnexoUploader } from '@/modules/anexos/components/anexo-uploader';
import { AnexoList } from '@/modules/anexos/components/anexo-list';
import { usePermissions } from '@/core/hooks/use-permissions';

interface EndossoApprovalDialogProps {
  endosso: Endosso;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EndossoApprovalDialog({
  endosso,
  open,
  onOpenChange,
}: EndossoApprovalDialogProps) {
  const [showRecusarForm, setShowRecusarForm] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [numeroExterno, setNumeroExterno] = useState('');
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canApprove = hasPermission('cadastro:aprovar_endosso');
  const noPermissionTitle = 'Você não tem permissão para esta ação. Entre em contato com um superior.';

  const aprovarMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/endorsements/${endosso.id}/approve`, {
        numeroEndossoExterno: numeroExterno || undefined,
      });
      return response;
    },
    onSuccess: () => {
      toast.success('Endosso aprovado', {
        description: 'As alterações foram aplicadas no documento.',
      });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.endossos() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.resumo() });
      onOpenChange(false);
      setNumeroExterno('');
    },
    onError: (error: unknown) => {
      toast.error(handleApiError(error));
    },
  });

  const recusarMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/endorsements/${endosso.id}/reject`, {
        motivoRecusa,
      });
      return response;
    },
    onSuccess: () => {
      toast.success('Endosso recusado', {
        description: 'O vendedor será notificado sobre a recusa.',
      });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.endossos() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.resumo() });
      onOpenChange(false);
      setMotivoRecusa('');
      setShowRecusarForm(false);
    },
    onError: (error: unknown) => {
      toast.error(handleApiError(error));
    },
  });

  const formatCurrency = (value: number | string | null) => {
    if (value === null || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  const formatPercentage = (value: number | string | null) => {
    if (value === null || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    return `${num.toFixed(2)}%`;
  };

  const getClienteName = () => {
    const cliente = endosso.documentoVenda.cliente;
    if (cliente.tipoPessoa === 'PF') {
      return cliente.nome || 'Sem nome';
    }
    return cliente.razaoSocial || cliente.nomeFantasia || 'Sem razão social';
  };

  const handleAprovar = () => {
    aprovarMutation.mutate();
  };

  const handleRecusar = () => {
    if (!motivoRecusa.trim()) {
      toast.error('Motivo obrigatório', {
        description: 'Informe o motivo da recusa.',
      });
      return;
    }
    recusarMutation.mutate();
  };

  if (showRecusarForm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="size-4 text-red-500" />
              Recusar Endosso {endosso.numeroEndosso}
            </DialogTitle>
            <DialogDescription>
              Informe o motivo da recusa. O vendedor será notificado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo da Recusa *</Label>
              <Textarea
                id="motivo"
                placeholder="Descreva o motivo da recusa..."
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRecusarForm(false);
                setMotivoRecusa('');
              }}
              disabled={recusarMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRecusar}
              disabled={recusarMutation.isPending || !motivoRecusa.trim() || !canApprove}
              title={!canApprove ? noPermissionTitle : undefined}
            >
              {recusarMutation.isPending ? 'Recusando...' : 'Confirmar Recusa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aprovar Endosso {endosso.numeroEndosso}</DialogTitle>
          <DialogDescription>
            Revise as alterações que serão aplicadas imediatamente no documento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <p className="font-medium">{getClienteName()}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Apólice</Label>
              <p className="font-medium">
                {endosso.documentoVenda.numeroApoliceExterna ||
                  endosso.documentoVenda.numeroDocumento}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Produto</Label>
              <p className="font-medium">
                {endosso.documentoVenda.produto.nomeProduto}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Vendedor</Label>
              <p className="font-medium">{endosso.vendedor.nome}</p>
            </div>
          </div>

          <Separator />

          {/* Descrição */}
          <div>
            <Label className="text-xs text-muted-foreground">
              Descrição do Endosso
            </Label>
            <p className="mt-1 text-sm">{endosso.descricao}</p>
          </div>

          <Separator />

          {/* Alterações */}
          <div>
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="size-4 text-yellow-600" />
              Alterações que serão aplicadas
            </h4>

            <div className="space-y-4">
              {/* Prêmio */}
              {endosso.premioNovo !== null && (
                <div className="bg-muted/50 dark:bg-muted/20 p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">
                      Prêmio Líquido
                    </Label>
                    {(endosso.diferencaPremio || 0) >= 0 ? (
                      <TrendingUp className="size-4 text-green-600 dark:text-green-500" />
                    ) : (
                      <TrendingDown className="size-4 text-red-600 dark:text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">De</p>
                      <p className="text-sm">
                        {formatCurrency(endosso.premioAnterior)}
                      </p>
                    </div>
                    <div className="text-muted-foreground">→</div>
                    <div>
                      <p className="text-xs text-muted-foreground">Para</p>
                      <p className="text-sm font-semibold">
                        {formatCurrency(endosso.premioNovo)}
                      </p>
                    </div>
                    <div className="ml-auto">
                      <p className="text-xs text-muted-foreground">Diferença</p>
                      <p
                        className={`text-sm font-semibold ${
                          (endosso.diferencaPremio || 0) >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {formatCurrency(endosso.diferencaPremio)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Comissão */}
              {endosso.percentualComissaoNovo !== null && (
                <div className="bg-muted/50 dark:bg-muted/20 p-4 rounded-lg border border-border">
                  <Label className="text-sm font-medium">Comissão</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">De</p>
                      <p className="text-sm">
                        {formatPercentage(endosso.percentualComissaoAnterior)} (
                        {formatCurrency(
                          ((endosso.premioAnterior || 0) *
                            (endosso.percentualComissaoAnterior || 0)) /
                            100,
                        )}
                        )
                      </p>
                    </div>
                    <div className="text-muted-foreground">→</div>
                    <div>
                      <p className="text-xs text-muted-foreground">Para</p>
                      <p className="text-sm font-semibold">
                        {formatPercentage(endosso.percentualComissaoNovo)} (
                        {formatCurrency(
                          ((endosso.premioNovo || 0) *
                            (endosso.percentualComissaoNovo || 0)) /
                            100,
                        )}
                        )
                      </p>
                    </div>
                    <div className="ml-auto">
                      <p className="text-xs text-muted-foreground">Diferença</p>
                      <p
                        className={`text-sm font-semibold ${
                          (endosso.diferencaComissao || 0) >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {formatCurrency(endosso.diferencaComissao)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Aviso */}
          <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4 flex items-start gap-2">
            <AlertCircle className="size-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                Atenção!
              </p>
              <p className="text-yellow-800 dark:text-yellow-200 mt-1">
                Ao aprovar, todas as alterações serão aplicadas{' '}
                <strong>imediatamente</strong> no documento. Esta ação não pode
                ser desfeita automaticamente.
              </p>
            </div>
          </div>

          <Separator />

          {/* Anexos */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Paperclip className="size-4" />
              Anexos
            </h4>
            <AnexoList entidade="endosso" entidadeId={endosso.id} />
            <AnexoUploader entidade="endosso" entidadeId={endosso.id} maxFiles={10} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={aprovarMutation.isPending || recusarMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowRecusarForm(true)}
            disabled={aprovarMutation.isPending || recusarMutation.isPending || !canApprove}
            title={!canApprove ? noPermissionTitle : undefined}
          >
            <XCircle className="mr-2 size-4" />
            Recusar
          </Button>
          <Button
            onClick={handleAprovar}
            disabled={aprovarMutation.isPending || recusarMutation.isPending || !canApprove}
            title={!canApprove ? noPermissionTitle : undefined}
          >
            <CheckCircle2 className="mr-2 size-4" />
            {aprovarMutation.isPending ? 'Aprovando...' : 'Aprovar e Aplicar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
