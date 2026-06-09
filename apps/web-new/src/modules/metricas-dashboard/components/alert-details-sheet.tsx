import { dayjs } from '@/core/utils/date-utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/core/ui/sheet';
import { Skeleton } from '@/core/ui/skeleton';
import { AlertTriangle, PauseCircle, FileText } from 'lucide-react';
import { useMetricasDetalhes } from '@/modules/metricas/http';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categoria: 'renovacoes_vencidas' | 'cotacoes_paradas';
  vendedorId?: string;
  vendedorNome?: string;
};

const STATUS_LABELS: Record<string, string> = {
  NAO_TRABALHADO: 'Não trabalhado',
  EM_PROSPECCAO: 'Em prospecção',
  EM_NEGOCIACAO: 'Em negociação',
  AGUARDANDO_CLIENTE: 'Aguard. cliente',
};

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return dayjs(d).format('DD/MM/YY');
}

function fmtCurrency(v: number | string | null | undefined) {
  if (v == null) return '—';
  const n = Number(v);
  return isNaN(n) ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtAgo(d: string | null | undefined) {
  if (!d) return '—';
  return dayjs(d).fromNow();
}

export function AlertDetailsSheet({ open, onOpenChange, categoria, vendedorId, vendedorNome }: Props) {
  const { data, isLoading } = useMetricasDetalhes(categoria, { vendedorId }, { enabled: open });

  const isRenovacao = categoria === 'renovacoes_vencidas';
  const titulo = isRenovacao ? 'Renovações Vencidas' : 'Cotações Paradas';
  const Icon = isRenovacao ? AlertTriangle : PauseCircle;
  const iconCls = isRenovacao ? 'text-amber-500' : 'text-blue-500';

  const itens = data?.detalhes ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Icon className={`size-4 shrink-0 ${iconCls}`} />
            <SheetTitle className="text-base">{titulo}</SheetTitle>
            {!isLoading && (
              <span className="text-xs text-muted-foreground">({data?.total ?? 0})</span>
            )}
          </div>
          {vendedorNome && (
            <p className="text-xs text-muted-foreground mt-0.5">Filtrado: {vendedorNome}</p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-5 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : itens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="size-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum item encontrado.</p>
            </div>
          ) : isRenovacao ? (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm border-b">
                <tr className="text-left">
                  <th className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Cliente</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Produto</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Vendedor</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Prêmio Ant.</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Vencimento</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item: any) => {
                  const venc = dayjs(item.dataVencimento);
                  const diasAtraso = dayjs().diff(venc, 'day');
                  return (
                    <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium truncate max-w-[160px]">{item.clienteNome ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[120px]">
                        {item.produtoDescricao ?? item.itemDescricao ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[100px]">{item.vendedorNome ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs tabular-nums">{fmtCurrency(item.premioAnterior)}</td>
                      <td className="px-4 py-2.5 text-xs">
                        <span className="text-red-600 dark:text-red-400 font-medium">{fmtDate(item.dataVencimento)}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">({diasAtraso}d)</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          {STATUS_LABELS[item.status] ?? item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm border-b">
                <tr className="text-left">
                  <th className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Nº Cotação</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Cliente</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Produto</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Vendedor</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Prêmio</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Parada há</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item: any) => (
                  <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs">{item.numeroCotacao}</td>
                    <td className="px-4 py-2.5 font-medium truncate max-w-[160px]">{item.clienteNome ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[120px]">{item.produtoNome ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[100px]">{item.vendedorNome ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs tabular-nums">{fmtCurrency(item.premioLiquido)}</td>
                    <td className="px-4 py-2.5 text-xs text-blue-600 dark:text-blue-400">{fmtAgo(item.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
