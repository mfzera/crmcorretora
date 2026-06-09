
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/core/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/core/ui/alert-dialog';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { Label } from '@/core/ui/label';
import { Separator } from '@/core/ui/separator';
import {
  AlertTriangle,
  Calendar,
  DollarSign,
  Loader2,
  Package,
  User,
  UserCheck,
} from 'lucide-react';
import { dayjs } from '@/core/utils/date-utils';
import { cn } from '@/core/utils';
import { formatCurrency, getStatusBadgeVariant, getStatusLabel } from '../metricas-utils';
import type { RenovacaoGestao } from '@/modules/renovacoes/http';
import {
  useDesfazerPerdaRenovacao,
  useReativarRenovacao,
} from '@/modules/renovacoes/http';
import { usePermissions } from '@/core/hooks/use-permissions';
import { handleApiError } from '@/core/utils/handle-api-error';

function getNomeCliente(r: RenovacaoGestao): string {
  const c = r.cliente ?? r.documentoVendaAnterior?.cliente ?? null;
  if (!c) return 'Sem cliente';
  return c.tipoPessoa === 'PF'
    ? c.nome ?? 'Sem cliente'
    : c.razaoSocial ?? 'Sem cliente';
}

export function RenovacaoGestaoDetalheDialog({
  renovacao,
  open,
  onClose,
}: {
  renovacao: RenovacaoGestao | null;
  open: boolean;
  onClose: () => void;
}) {
  const [showDesfazerConfirm, setShowDesfazerConfirm] = useState(false);
  const [showReativarConfirm, setShowReativarConfirm] = useState(false);
  const { hasPermission } = usePermissions();
  const { mutate: desfazerPerda, isPending: isDesfazendo } = useDesfazerPerdaRenovacao();
  const { mutate: reativar, isPending: isReativando } = useReativarRenovacao();

  if (!renovacao) return null;

  const dias = dayjs(renovacao.dataVencimento).diff(dayjs(), 'day');
  const vencida = dias < 0;
  const urgente = dias >= 0 && dias <= 7;

  const podeDesfazerPerda = renovacao.status === 'PERDIDO' && hasPermission('vendas:editar_todos_documentos');
  const podeReativar = renovacao.status === 'CANCELADO' && hasPermission('aceitar_exclusao:renovacao');

  const handleDesfazerPerda = () => {
    desfazerPerda(renovacao.id, {
      onSuccess: () => {
        toast.success('Renovação revertida para o status anterior');
        setShowDesfazerConfirm(false);
        onClose();
      },
      onError: (err: any) => handleApiError(err),
    });
  };

  const handleReativar = () => {
    reativar(renovacao.id, {
      onSuccess: () => {
        toast.success('Renovação reativada com sucesso');
        setShowReativarConfirm(false);
        onClose();
      },
      onError: (err: any) => handleApiError(err),
    });
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-xl">Renovação</DialogTitle>
            <Badge variant={getStatusBadgeVariant(renovacao.status)}>
              {getStatusLabel(renovacao.status)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Alerta de prazo */}
          {(vencida || urgente) && (
            <div className={cn(
              'flex items-center gap-2 p-3 rounded-lg text-sm font-medium',
              vencida
                ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
            )}>
              <AlertTriangle className="size-4 shrink-0" />
              {vencida
                ? `Venceu há ${Math.abs(dias)} dias`
                : `Vence em ${dias} dia${dias === 1 ? '' : 's'}`}
            </div>
          )}

          {/* Cliente */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <User className="size-3.5" />
              Cliente
            </h4>
            <p className="font-medium">{getNomeCliente(renovacao)}</p>
            {renovacao.cliente && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {renovacao.cliente.tipoPessoa === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
              </p>
            )}
          </div>

          <Separator />

          {/* Vendedor */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <UserCheck className="size-3.5" />
              Vendedor
            </h4>
            <p className="font-medium">{renovacao.vendedor?.nome ?? '-'}</p>
          </div>

          <Separator />

          {/* Produto */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <Package className="size-3.5" />
              Produto / Risco
            </h4>
            <p className="font-medium text-sm">
              {renovacao.produtoDescricao ?? renovacao.itemDescricao ?? '-'}
            </p>
            {renovacao.seguradoraAnterior && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Seguradora anterior: {renovacao.seguradoraAnterior}
              </p>
            )}
          </div>

          <Separator />

          {/* Valores */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <DollarSign className="size-3.5" />
              Valores
            </h4>
            <div className="bg-muted/50 p-3 rounded-lg border">
              <Label className="text-xs text-muted-foreground">Prêmio Anterior</Label>
              <p className="text-lg font-semibold mt-0.5">
                {renovacao.premioAnterior ? formatCurrency(renovacao.premioAnterior) : '-'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Vencimento */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <Calendar className="size-3.5" />
              Vencimento
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Data de vencimento</Label>
                <p className="font-medium text-sm mt-0.5">
                  {dayjs(renovacao.dataVencimento).format('DD [de] MMMM [de] YYYY')}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status do prazo</Label>
                <p className={cn(
                  'font-medium text-sm mt-0.5 flex items-center gap-1',
                  vencida ? 'text-red-600 dark:text-red-400' : urgente ? 'text-amber-600 dark:text-amber-400' : '',
                )}>
                  {(vencida || urgente) && <AlertTriangle className="size-3.5" />}
                  {vencida ? `Venceu há ${Math.abs(dias)} dias` : `Vence em ${dias} dias`}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          {podeDesfazerPerda && (
            <Button
              variant="outline"
              onClick={() => setShowDesfazerConfirm(true)}
              disabled={isDesfazendo}
            >
              {isDesfazendo ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Desfazer Perda
            </Button>
          )}
          {podeReativar && (
            <Button
              variant="outline"
              onClick={() => setShowReativarConfirm(true)}
              disabled={isReativando}
            >
              {isReativando ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Reativar Renovação
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showDesfazerConfirm} onOpenChange={setShowDesfazerConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desfazer perda?</AlertDialogTitle>
          <AlertDialogDescription>
            A renovação voltará ao status anterior à perda. Os dados de motivo e concorrente serão apagados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDesfazendo}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDesfazerPerda} disabled={isDesfazendo}>
            {isDesfazendo ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={showReativarConfirm} onOpenChange={setShowReativarConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reativar renovação?</AlertDialogTitle>
          <AlertDialogDescription>
            A renovação voltará ao status que tinha antes de ser cancelada e poderá ser trabalhada novamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isReativando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleReativar} disabled={isReativando}>
            {isReativando ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
