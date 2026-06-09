
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { Label } from '@/core/ui/label';
import { Separator } from '@/core/ui/separator';
import { AlertTriangle, Calendar, Clock, DollarSign, Package, User } from 'lucide-react';
import { dayjs } from '@/core/utils/date-utils';
import { cn } from '@/core/utils';
import { formatCurrency, getStatusBadgeVariant, getStatusLabel } from './metricas-utils';

function getNomeCliente(item: any): string {
  return item.cliente?.tipoPessoa === 'PF'
    ? item.cliente?.nome || 'Sem cliente'
    : item.cliente?.razaoSocial || 'Sem cliente';
}

function formatDate(date: string | undefined): string {
  if (!date) return '-';
  return dayjs(date).format('DD [de] MMMM [de] YYYY');
}

export function CotacaoDetalheDialog({
  cotacao,
  open,
  onClose,
}: {
  cotacao: any | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!cotacao) return null;

  const diasParada = dayjs().diff(dayjs(cotacao.updatedAt), 'day');
  const isParada = diasParada >= 7;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">Cotação</DialogTitle>
              {cotacao.numero && (
                <p className="text-sm text-muted-foreground mt-0.5">#{cotacao.numero}</p>
              )}
            </div>
            <Badge variant={getStatusBadgeVariant(cotacao.status)}>
              {getStatusLabel(cotacao.status)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <User className="size-3.5" />
              Cliente
            </h4>
            <p className="font-medium">{getNomeCliente(cotacao)}</p>
          </div>

          <Separator />

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <Package className="size-3.5" />
              Produto
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Produto</Label>
                <p className="font-medium text-sm mt-0.5">
                  {cotacao.produto?.nomeProduto ?? cotacao.itemDescricao ?? '-'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <p className="font-medium text-sm mt-0.5">
                  {cotacao.produto?.tipoSeguro ?? '-'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <DollarSign className="size-3.5" />
              Valores
            </h4>
            <div className="bg-muted/50 p-3 rounded-lg border">
              <Label className="text-xs text-muted-foreground">Prêmio Líquido</Label>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400 mt-0.5">
                {cotacao.premioLiquido ? formatCurrency(cotacao.premioLiquido) : '-'}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <Clock className="size-3.5" />
              Atividade
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Última atualização</Label>
                <p className="font-medium text-sm mt-0.5">{dayjs(cotacao.updatedAt).fromNow()}</p>
              </div>
              {isParada && (
                <div>
                  <Label className="text-xs text-muted-foreground">Tempo parada</Label>
                  <p className="font-medium text-sm text-red-600 dark:text-red-400 mt-0.5 flex items-center gap-1">
                    <AlertTriangle className="size-3.5" />
                    {diasParada} dias sem atualização
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RenovacaoDetalheDialog({
  renovacao,
  open,
  onClose,
}: {
  renovacao: any | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!renovacao) return null;

  const diasVencimento = dayjs(renovacao.dataVencimento).diff(dayjs(), 'day');
  const vencida = diasVencimento < 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">Renovação</DialogTitle>
            </div>
            <Badge variant={getStatusBadgeVariant(renovacao.status)}>
              {getStatusLabel(renovacao.status)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <User className="size-3.5" />
              Cliente
            </h4>
            <p className="font-medium">{getNomeCliente(renovacao)}</p>
          </div>

          <Separator />

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <Package className="size-3.5" />
              Produto
            </h4>
            <p className="font-medium text-sm">
              {renovacao.produtoDescricao ?? renovacao.produto?.nomeProduto ?? renovacao.itemDescricao ?? '-'}
            </p>
          </div>

          <Separator />

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

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <Calendar className="size-3.5" />
              Vencimento
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Data de vencimento</Label>
                <p className="font-medium text-sm mt-0.5">{formatDate(renovacao.dataVencimento)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status do prazo</Label>
                <p
                  className={cn(
                    'font-medium text-sm mt-0.5 flex items-center gap-1',
                    vencida
                      ? 'text-red-600 dark:text-red-400'
                      : diasVencimento <= 7
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-muted-foreground',
                  )}
                >
                  {(vencida || diasVencimento <= 7) && <AlertTriangle className="size-3.5" />}
                  {vencida
                    ? `Venceu há ${Math.abs(diasVencimento)} dias`
                    : `Vence em ${diasVencimento} dias`}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
