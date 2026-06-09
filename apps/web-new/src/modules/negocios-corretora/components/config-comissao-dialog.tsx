import { useState, useEffect } from 'react';
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
import { Label } from '@/core/ui/label';
import { Input } from '@/core/ui/input';
import { Separator } from '@/core/ui/separator';
import { Badge } from '@/core/ui/badge';
import { Progress } from '@/core/ui/progress';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { api } from '@/infra/http/api';
import { negociosKeys } from '../http';
import type { Cotacao } from '@/types/area-trabalho';
import { DollarSign, Users, ChevronRight, ChevronLeft, TrendingUp, Loader2 } from 'lucide-react';
import { formatCurrencyBR } from '@/core/utils/format-currency';

interface ConfigComissaoDialogProps {
  cotacao: Cotacao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfigComissaoDialog({
  cotacao,
  open,
  onOpenChange,
}: ConfigComissaoDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [percentualCorretora, setPercentualCorretora] = useState('');
  const [percentualPrincipal, setPercentualPrincipal] = useState('');
  const [percentualSecundario, setPercentualSecundario] = useState('');

  const temVendedorSecundario = !!cotacao?.vendedorSecundarioId;

  useEffect(() => {
    if (cotacao && open) {
      setPercentualCorretora(cotacao.percentualCorretora?.toString() ?? '30');
      if (temVendedorSecundario) {
        setPercentualPrincipal(cotacao.percentualComissaoPrincipal?.toString() ?? '50');
        setPercentualSecundario(cotacao.percentualComissaoSecundario?.toString() ?? '50');
      } else {
        setPercentualPrincipal('100');
        setPercentualSecundario('0');
      }
    }
  }, [cotacao, open, temVendedorSecundario]);

  // Reset step when dialog closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => setStep(1), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const percCorretora = parseFloat(percentualCorretora) || 0;
  const percPrincipal = parseFloat(percentualPrincipal) || 0;
  const percSecundario = parseFloat(percentualSecundario) || 0;

  const valorComissaoTotal = cotacao?.valorComissao ?? 0;
  const valorCorretora = (valorComissaoTotal * percCorretora) / 100;
  const valorRestante = valorComissaoTotal - valorCorretora;
  const valorPrincipal = (valorRestante * percPrincipal) / 100;
  const valorSecundario = (valorRestante * percSecundario) / 100;

  const step1Valid = percCorretora >= 0 && percCorretora <= 100;
  const step2Valid = temVendedorSecundario
    ? Math.abs(percPrincipal + percSecundario - 100) < 0.01
    : true;
  const somaDois = percPrincipal + percSecundario;

  const salvarMutation = useMutation({
    mutationFn: async () => {
      if (!cotacao) return;

      const payload: any = {
        percentualCorretora: percCorretora,
        valorComissaoCorretora: valorCorretora,
      };

      if (temVendedorSecundario) {
        payload.percentualComissaoPrincipal = percPrincipal;
        payload.percentualComissaoSecundario = percSecundario;
        payload.valorComissaoPrincipal = valorPrincipal;
        payload.valorComissaoSecundario = valorSecundario;
      }

      await api.patch(`/quotes/${cotacao.id}`, payload);
    },
    onSuccess: () => {
      toast.success('Comissão configurada com sucesso!');
      queryClient.invalidateQueries({ queryKey: negociosKeys.all });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast.error(handleApiError(error));
    },
  });

  if (!cotacao) return null;

  const nomeCliente =
    cotacao.cliente.tipoPessoa === 'PF' ? cotacao.cliente.nome : cotacao.cliente.razaoSocial;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="size-5 text-blue-600" />
            Configurar Comissão
          </DialogTitle>
          <DialogDescription>
            {cotacao.numero || cotacao.numeroCotacao} — {nomeCliente}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className={step === 1 ? 'font-semibold text-foreground' : ''}>
              1. Participação da Corretora
            </span>
            <span className={step === 2 ? 'font-semibold text-foreground' : ''}>
              2. Divisão entre Vendedores
            </span>
          </div>
          <Progress value={step === 1 ? 50 : 100} className="h-1.5" />
        </div>

        {/* Comissão total info */}
        <div className="rounded-lg border bg-muted/50 p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Produto</p>
            <p className="text-sm font-medium">{cotacao.produto.nomeProduto}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Comissão Total</p>
            <p className="text-base font-bold text-green-700 dark:text-green-400">
              {formatCurrencyBR(valorComissaoTotal)}
            </p>
          </div>
        </div>

        {/* Step 1: Corretora % */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="percCorretora">Percentual da Corretora (%)</Label>
              <Input
                id="percCorretora"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={percentualCorretora}
                onChange={(e) => setPercentualCorretora(e.target.value)}
                placeholder="30"
                autoFocus
              />
              {!step1Valid && (
                <p className="text-xs text-destructive">Deve ser entre 0 e 100</p>
              )}
            </div>

            {/* Live preview */}
            <div className="rounded-lg border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3 space-y-1.5 text-sm">
              <div className="flex items-center gap-1.5 font-semibold text-blue-900 dark:text-blue-100 mb-2">
                <TrendingUp className="size-4" />
                Preview da distribuição
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Comissão Total</span>
                <span className="font-medium">{formatCurrencyBR(valorComissaoTotal)}</span>
              </div>
              <div className="flex justify-between text-blue-700 dark:text-blue-300">
                <span>Corretora ({percentualCorretora || '0'}%)</span>
                <span className="font-semibold">{formatCurrencyBR(valorCorretora)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Restante p/ vendedor(es)</span>
                <span className="font-medium">{formatCurrencyBR(valorRestante)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Vendor split */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Users className="size-4" />
              {temVendedorSecundario ? 'Divisão entre 2 Vendedores' : 'Vendedor Único'}
              <Badge variant="secondary" className="ml-auto">
                Disponível: {formatCurrencyBR(valorRestante)}
              </Badge>
            </div>

            {temVendedorSecundario ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="percPrincipal">
                      {cotacao.vendedor?.nome || 'Vendedor Principal'} (%)
                    </Label>
                    <Input
                      id="percPrincipal"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={percentualPrincipal}
                      onChange={(e) => setPercentualPrincipal(e.target.value)}
                      placeholder="50"
                    />
                    <p className="text-xs text-muted-foreground">{formatCurrencyBR(valorPrincipal)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="percSecundario">
                      {cotacao.vendedorSecundario?.nome || 'Vendedor Secundário'} (%)
                    </Label>
                    <Input
                      id="percSecundario"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={percentualSecundario}
                      onChange={(e) => setPercentualSecundario(e.target.value)}
                      placeholder="50"
                    />
                    <p className="text-xs text-muted-foreground">{formatCurrencyBR(valorSecundario)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Soma atual</span>
                  <span className={Math.abs(somaDois - 100) < 0.01 ? 'text-green-600 font-semibold' : 'text-destructive font-semibold'}>
                    {somaDois.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                    {Math.abs(somaDois - 100) < 0.01 ? ' ✓' : ' (deve ser 100%)'}
                  </span>
                </div>
              </>
            ) : (
              <div className="rounded-lg border bg-muted/50 p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{cotacao.vendedor?.nome || 'Vendedor'}</p>
                  <p className="text-sm text-muted-foreground">Recebe 100% do restante</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="font-semibold text-green-700 dark:text-green-400">
                    {formatCurrencyBR(valorRestante)}
                  </p>
                </div>
              </div>
            )}

            {/* Final summary */}
            <div className="rounded-lg border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3 space-y-1.5 text-sm">
              <p className="font-semibold text-blue-900 dark:text-blue-100">Resumo Final</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Comissão Total</span>
                <span className="font-medium">{formatCurrencyBR(valorComissaoTotal)}</span>
              </div>
              <div className="flex justify-between text-blue-700 dark:text-blue-300">
                <span>Corretora ({percentualCorretora}%)</span>
                <span className="font-semibold">{formatCurrencyBR(valorCorretora)}</span>
              </div>
              <Separator />
              {temVendedorSecundario ? (
                <>
                  <div className="flex justify-between text-muted-foreground pl-3">
                    <span>• {cotacao.vendedor?.nome || 'Principal'} ({percentualPrincipal}%)</span>
                    <span>{formatCurrencyBR(valorPrincipal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground pl-3">
                    <span>• {cotacao.vendedorSecundario?.nome || 'Secundário'} ({percentualSecundario}%)</span>
                    <span>{formatCurrencyBR(valorSecundario)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-muted-foreground pl-3">
                  <span>• {cotacao.vendedor?.nome || 'Vendedor'} (100%)</span>
                  <span>{formatCurrencyBR(valorRestante)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {step === 1 ? (
            <Button
              onClick={() => setStep(2)}
              disabled={!step1Valid}
              className="gap-1.5"
            >
              Próximo
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep(1)} className="gap-1.5">
                <ChevronLeft className="size-4" />
                Voltar
              </Button>
              <Button
                onClick={() => salvarMutation.mutate()}
                disabled={salvarMutation.isPending || !step2Valid}
                className="gap-1.5"
              >
                {salvarMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                Salvar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
