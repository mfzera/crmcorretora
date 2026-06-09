
import { DollarSign, FileText, Percent } from 'lucide-react';
import { Card, CardContent } from '@/core/ui/card';
import { Skeleton } from '@/core/ui/skeleton';
import { formatCurrency } from '../metricas-utils';
import type { DocumentoVenda } from '@/types/documento-venda';

interface VendedorItensKpisProps {
  items: DocumentoVenda[];
  total: number;
  isLoading: boolean;
}

export function VendedorItensKpis({
  items,
  total,
  isLoading,
}: VendedorItensKpisProps) {
  const totalPremio = items.reduce((sum, d) => sum + (d.premioLiquido ?? 0), 0);

  const comissoes = items
    .filter((d) => d.premioLiquido && d.premioLiquido > 0 && d.valorComissao)
    .map((d) => ((d.valorComissao ?? 0) / d.premioLiquido!) * 100);
  const mediaComissao =
    comissoes.length > 0
      ? comissoes.reduce((a, b) => a + b, 0) / comissoes.length
      : 0;

  const kpis = [
    {
      label: 'Total em Prêmios',
      value: isLoading ? null : formatCurrency(totalPremio),
      icon: DollarSign,
      sub: 'dos itens desta página',
    },
    {
      label: 'Negócios',
      value: isLoading ? null : total.toLocaleString('pt-BR'),
      icon: FileText,
      sub: 'no grupo selecionado',
    },
    {
      label: 'Comissão Média',
      value: isLoading
        ? null
        : `${mediaComissao.toFixed(1).replace('.', ',')}%`,
      icon: Percent,
      sub: 'sobre prêmio líquido',
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="border-0 shadow-sm bg-muted/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 shrink-0">
              <kpi.icon className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                {kpi.label}
              </p>
              {isLoading ? (
                <Skeleton className="h-6 w-24 mt-1" />
              ) : (
                <p className="text-lg font-bold tabular-nums leading-tight">
                  {kpi.value}
                </p>
              )}
              <p className="text-xs text-muted-foreground/70 truncate">{kpi.sub}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
