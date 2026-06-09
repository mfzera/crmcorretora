
import { useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { type Control, useController } from 'react-hook-form';
import { usePermissions } from '@/core/hooks/use-permissions';
import { CurrencyInput } from '@/core/ui/currency-input';
import { PercentageInput } from '@/core/ui/percentage-input';
import { Label } from '@/core/ui/label';
import type { DadosRenovacao } from '@/types/area-trabalho';

interface ValoresTabProps {
  mode: 'view' | 'edit';

  // Edit mode: bind inputs directly to react-hook-form
  control?: Control<any>;

  // View mode values
  premioLiquido?: string | number | null;
  percentualComissao?: string | number | null;
  valorComissao?: string | number | null;

  // Renewal data (if applicable)
  dadosRenovacao?: DadosRenovacao;

  // When embedded in the new dialog layout, o valor calculado é exibido na sidebar —
  // suprime a duplicação desse card aqui.
  hideValorComissaoCard?: boolean;
}

export function ValoresTab(props: ValoresTabProps) {
  if (props.mode === 'view') {
    return <ValoresTabView {...props} />;
  }
  if (!props.control) {
    throw new Error('ValoresTab: control is required in edit mode');
  }
  return (
    <ValoresTabEdit
      control={props.control}
      dadosRenovacao={props.dadosRenovacao}
      hideValorComissaoCard={props.hideValorComissaoCard}
    />
  );
}

function computeValorComissao(
  premioLiquido: string | number | null | undefined,
  percentualComissao: string | number | null | undefined,
): number | null {
  if (
    percentualComissao === null ||
    percentualComissao === undefined ||
    percentualComissao === ''
  )
    return null;
  const premio = parseFloat(String(premioLiquido || '0'));
  const percentual = parseFloat(String(percentualComissao));
  if (isNaN(percentual)) return null;
  return (premio * percentual) / 100;
}

function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '—';
  return numValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatPercentage(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '—';
  return `${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function calculateDiferenca(
  atual: number | string | null | undefined,
  anterior: number | string | null | undefined,
) {
  const atualNum = parseFloat(String(atual || '0'));
  const anteriorNum = parseFloat(String(anterior || '0'));
  return atualNum - anteriorNum;
}

function getDiferencaDisplay(diferenca: number, isPercentage = false) {
  if (diferenca === 0) {
    return {
      icon: Minus,
      color: 'text-gray-500',
      text: isPercentage ? '0,00%' : 'R$ 0,00',
    };
  }

  const formatted = isPercentage
    ? formatPercentage(Math.abs(diferenca))
    : formatCurrency(Math.abs(diferenca));

  return {
    icon: diferenca > 0 ? TrendingUp : TrendingDown,
    color:
      diferenca > 0
        ? 'text-green-600 dark:text-green-400'
        : 'text-red-600 dark:text-red-400',
    text: `${diferenca > 0 ? '+' : '-'}${formatted}`,
  };
}

function ValoresTabView({
  premioLiquido,
  percentualComissao,
  dadosRenovacao,
  hideValorComissaoCard,
}: ValoresTabProps) {
  const isRenovacao = !!dadosRenovacao;
  const { hasPermission } = usePermissions();
  const podeVerComissao =
    hasPermission('vendas:gerenciar_comissoes') && !hideValorComissaoCard;

  const valorComissaoCalculado = useMemo(
    () => computeValorComissao(premioLiquido, percentualComissao),
    [premioLiquido, percentualComissao],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="size-5 text-primary" />
        <h3 className="font-semibold text-lg">
          Valores {isRenovacao && '- Renovação'}
        </h3>
      </div>

      {isRenovacao && dadosRenovacao ? (
        <>
          {/* Prêmio Líquido */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Prêmio Líquido
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 p-4">
                <p className="text-xs text-muted-foreground mb-1">Atual</p>
                <p className="font-medium text-xl">
                  {formatCurrency(premioLiquido)}
                </p>
              </div>
              <div className="rounded-lg border bg-gray-50/50 dark:bg-gray-900/20 p-4">
                <p className="text-xs text-muted-foreground mb-1">Anterior</p>
                <p className="font-medium text-xl">
                  {formatCurrency(dadosRenovacao.premioLiquidoAnterior)}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground mb-1">Diferença</p>
                {(() => {
                  const diff = calculateDiferenca(
                    premioLiquido,
                    dadosRenovacao.premioLiquidoAnterior,
                  );
                  const display = getDiferencaDisplay(diff);
                  const Icon = display.icon;
                  return (
                    <div className="flex items-center gap-1">
                      <Icon className={`size-4 ${display.color}`} />
                      <p className={`font-medium text-lg ${display.color}`}>
                        {display.text}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Percentual de Comissão */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Percentual de Comissão
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 p-4">
                <p className="text-xs text-muted-foreground mb-1">Atual</p>
                <p className="font-medium text-xl">
                  {formatPercentage(percentualComissao)}
                </p>
              </div>
              <div className="rounded-lg border bg-gray-50/50 dark:bg-gray-900/20 p-4">
                <p className="text-xs text-muted-foreground mb-1">Anterior</p>
                <p className="font-medium text-xl">
                  {formatPercentage(dadosRenovacao.percentualComissaoAnterior)}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground mb-1">Diferença</p>
                {(() => {
                  const diff = calculateDiferenca(
                    percentualComissao,
                    dadosRenovacao.percentualComissaoAnterior,
                  );
                  const display = getDiferencaDisplay(diff, true);
                  const Icon = display.icon;
                  return (
                    <div className="flex items-center gap-1">
                      <Icon className={`size-4 ${display.color}`} />
                      <p className={`font-medium text-lg ${display.color}`}>
                        {display.text}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Valor da Comissão */}
          {podeVerComissao && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Valor da Comissão (calculado)
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Atual</p>
                  <p className="font-medium text-xl">
                    {formatCurrency(valorComissaoCalculado)}
                  </p>
                </div>
                <div className="rounded-lg border bg-gray-50/50 dark:bg-gray-900/20 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Anterior</p>
                  <p className="font-medium text-xl">
                    {formatCurrency(dadosRenovacao.valorComissaoAnterior)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    Diferença
                  </p>
                  {(() => {
                    const diff = calculateDiferenca(
                      valorComissaoCalculado,
                      dadosRenovacao.valorComissaoAnterior,
                    );
                    const display = getDiferencaDisplay(diff);
                    const Icon = display.icon;
                    return (
                      <div className="flex items-center gap-1">
                        <Icon className={`size-4 ${display.color}`} />
                        <p className={`font-medium text-lg ${display.color}`}>
                          {display.text}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Prêmio Líquido
              </Label>
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="font-medium text-2xl">
                  {formatCurrency(premioLiquido)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Percentual de Comissão
              </Label>
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="font-medium text-2xl">
                  {formatPercentage(percentualComissao)}
                </p>
              </div>
            </div>
          </div>

          {podeVerComissao && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Valor da Comissão (calculado)
              </Label>
              <div className="rounded-lg border bg-green-50/50 dark:bg-green-950/20 p-4">
                <p className="font-medium text-2xl text-green-700 dark:text-green-400">
                  {formatCurrency(valorComissaoCalculado)}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface ValoresTabEditProps {
  control: Control<any>;
  dadosRenovacao?: DadosRenovacao;
  hideValorComissaoCard?: boolean;
}

function ValoresTabEdit({
  control,
  dadosRenovacao,
  hideValorComissaoCard,
}: ValoresTabEditProps) {
  const isRenovacao = !!dadosRenovacao;
  const { hasPermission } = usePermissions();
  const podeVerComissao =
    hasPermission('vendas:gerenciar_comissoes') && !hideValorComissaoCard;

  const { field: premioField } = useController({
    control,
    name: 'premioLiquido',
  });
  const { field: comissaoField } = useController({
    control,
    name: 'percentualComissao',
  });

  const premioLiquido = premioField.value as string | undefined;
  const percentualComissao = comissaoField.value as string | undefined;

  const valorComissaoCalculado = useMemo(
    () => computeValorComissao(premioLiquido, percentualComissao),
    [premioLiquido, percentualComissao],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="size-5 text-primary" />
        <h3 className="font-semibold text-lg">
          Valores {isRenovacao && '- Renovação'}
        </h3>
      </div>

      {isRenovacao && dadosRenovacao ? (
        <>
          {/* Prêmio Líquido */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Prêmio Líquido</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Anterior</span>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="font-medium">
                    {formatCurrency(dadosRenovacao.premioLiquidoAnterior)}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="premioLiquido"
                  className="text-xs text-muted-foreground"
                >
                  Novo <span className="text-red-500">*</span>
                </Label>
                <CurrencyInput
                  id="premioLiquido"
                  placeholder="0,00"
                  value={premioLiquido || ''}
                  onChange={(value) => premioField.onChange(value)}
                  onBlur={premioField.onBlur}
                />
              </div>
            </div>
            {(() => {
              const diff = calculateDiferenca(
                premioLiquido,
                dadosRenovacao.premioLiquidoAnterior,
              );
              if (diff !== 0) {
                const display = getDiferencaDisplay(diff);
                const Icon = display.icon;
                return (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <Icon className={`size-4 ${display.color}`} />
                    <p className={`text-sm font-medium ${display.color}`}>
                      Diferença: {display.text}
                    </p>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* Percentual de Comissão */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Percentual de Comissão
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Anterior</span>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="font-medium">
                    {formatPercentage(dadosRenovacao.percentualComissaoAnterior)}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="percentualComissao"
                  className="text-xs text-muted-foreground"
                >
                  Novo <span className="text-red-500">*</span>
                </Label>
                <PercentageInput
                  id="percentualComissao"
                  placeholder="0,00"
                  value={percentualComissao || ''}
                  onChange={(value) => comissaoField.onChange(value)}
                  onBlur={comissaoField.onBlur}
                />
              </div>
            </div>
            {(() => {
              const diff = calculateDiferenca(
                percentualComissao,
                dadosRenovacao.percentualComissaoAnterior,
              );
              if (diff !== 0) {
                const display = getDiferencaDisplay(diff, true);
                const Icon = display.icon;
                return (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <Icon className={`size-4 ${display.color}`} />
                    <p className={`text-sm font-medium ${display.color}`}>
                      Diferença: {display.text}
                    </p>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* Valor da Comissão */}
          {podeVerComissao && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Valor da Comissão (calculado)
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Anterior</span>
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="font-medium">
                      {formatCurrency(dadosRenovacao.valorComissaoAnterior)}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Novo</span>
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="font-medium text-green-700 dark:text-green-400">
                      {formatCurrency(valorComissaoCalculado)}
                    </p>
                  </div>
                </div>
              </div>
              {(() => {
                const diff = calculateDiferenca(
                  valorComissaoCalculado,
                  dadosRenovacao.valorComissaoAnterior,
                );
                if (diff !== 0) {
                  const display = getDiferencaDisplay(diff);
                  const Icon = display.icon;
                  return (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <Icon className={`size-4 ${display.color}`} />
                      <p className={`text-sm font-medium ${display.color}`}>
                        Diferença: {display.text}
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="premioLiquido">
                Prêmio Líquido <span className="text-red-500">*</span>
              </Label>
              <CurrencyInput
                id="premioLiquido"
                placeholder="0,00"
                value={premioLiquido || ''}
                onChange={(value) => premioField.onChange(value)}
                onBlur={premioField.onBlur}
                className="h-12"
              />
              <p className="text-xs text-muted-foreground">
                Valor do prêmio após impostos
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="percentualComissao">
                Percentual de Comissão <span className="text-red-500">*</span>
              </Label>
              <PercentageInput
                id="percentualComissao"
                placeholder="0,00"
                value={percentualComissao || ''}
                onChange={(value) => comissaoField.onChange(value)}
                onBlur={comissaoField.onBlur}
                className="h-12"
              />
              <p className="text-xs text-muted-foreground">
                Percentual sobre o prêmio líquido
              </p>
            </div>
          </div>

          {podeVerComissao && (
            <div className="space-y-2">
              <Label>Valor da Comissão</Label>
              <div className="rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 p-6">
                <p className="text-sm text-muted-foreground mb-2">
                  Calculado Automaticamente
                </p>
                <p className="font-bold text-3xl text-green-700 dark:text-green-400">
                  {formatCurrency(valorComissaoCalculado)}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
