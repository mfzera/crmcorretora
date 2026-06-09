
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Skeleton } from '@/core/ui/skeleton';
import { useMetaAuditoria, useMissaoAuditoria } from '../http';
import { TrendingUp, FileText, Target, CheckCircle2, CalendarClock, Eye } from 'lucide-react';
import { cn } from '@/core/utils';
import { getStatusLabel, getStatusBadgeVariant, getIniciais } from '@/modules/metricas/components/metricas-utils';
import { Avatar, AvatarFallback } from '@/core/ui/avatar';
import { RenovacaoGestaoDetalheDialog } from '@/modules/metricas/components/renovacoes-gestao/renovacao-gestao-detalhe-dialog';
import type { RenovacaoGestao } from '@/modules/renovacoes/http';

const statusDotColor: Record<string, string> = {
  NAO_TRABALHADO: 'bg-zinc-400',
  EM_PROSPECCAO: 'bg-blue-400',
  EM_NEGOCIACAO: 'bg-amber-400',
  AGUARDANDO_CLIENTE: 'bg-purple-400',
  RENOVADO: 'bg-green-500',
  PERDIDO: 'bg-red-500',
  CANCELADO: 'bg-red-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={getStatusBadgeVariant(status)} className="gap-1.5 whitespace-nowrap text-[11px] px-2 py-0.5">
      <span className={cn('size-1.5 rounded-full shrink-0', statusDotColor[status] ?? 'bg-gray-400')} />
      {getStatusLabel(status)}
    </Badge>
  );
}

function toRenovacaoGestao(r: any): RenovacaoGestao {
  return {
    id: r.id,
    status: r.status,
    dataVencimento: r.dataVencimento,
    premioAnterior: r.premioAnterior ?? null,
    itemDescricao: r.itemDescricao ?? null,
    produtoDescricao: r.produtoDescricao ?? null,
    seguradoraAnterior: r.seguradoraAnterior ?? null,
    clienteId: null,
    vendedorId: '',
    vendedor: r.vendedorNome ? { id: '', nome: r.vendedorNome } : null,
    cliente: r.clienteNome ? { id: '', nome: r.clienteNome, razaoSocial: null, tipoPessoa: 'PF' } : null,
    documentoVendaAnterior: null,
    createdAt: r.data ?? '',
    updatedAt: r.data ?? '',
  };
}

const metricaLabels: Record<string, string> = {
  novos_seguros: 'Novos Seguros',
  renovacoes: 'Renovações',
  cotacoes: 'Cotações',
  valor_premio: 'Prêmio (R$)',
  taxa_renovacao: 'Taxa de Renovação (%)',
  premio_renovacao: 'Prêmio Renovações (R$)',
};

const isMonetary = (tipo: string | undefined) =>
  tipo === 'valor_premio' || tipo === 'novos_seguros' || tipo === 'premio_renovacao' || tipo === 'taxa_renovacao';

interface MetaAuditoriaDialogProps {
  open: boolean;
  onClose: () => void;
  meta?: any | null;
  missao?: any | null;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR');
}

function formatCurrency(value: string | number | null | undefined) {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function formatPercent(value: string | number | null | undefined) {
  if (value == null) return '—';
  return `${Number(value).toFixed(1)}%`;
}

function formatProgress(tipo: string | undefined, value: number | undefined) {
  if (value == null) return '—';
  if (tipo === 'valor_premio' || tipo === 'premio_renovacao') return formatCurrency(value);
  if (tipo === 'taxa_renovacao') return `${value.toFixed(1)}%`;
  return value.toLocaleString('pt-BR');
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}

function StatCard({ icon, label, value, sub, highlight }: StatCardProps) {
  return (
    <div className={cn(
      'rounded-lg border p-4 flex flex-col gap-1',
      highlight ? 'border-primary/30 bg-primary/5' : 'bg-muted/30',
    )}>
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        {icon}
        {label}
      </div>
      <span className={cn('text-xl font-semibold leading-tight', highlight && 'text-primary')}>{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

// Spreadsheet-style helpers
const th = 'h-8 py-0 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 border-r border-border/40 last:border-r-0 whitespace-nowrap';
const td = 'py-2 px-3 text-xs border-r border-border/20 last:border-r-0';
const tdNum = cn(td, 'text-right font-mono tabular-nums');
const tdMuted = cn(td, 'text-muted-foreground');

export function MetaAuditoriaDialog({ open, onClose, meta, missao }: MetaAuditoriaDialogProps) {
  const [detalheRenovacao, setDetalheRenovacao] = useState<RenovacaoGestao | null>(null);
  const item = meta ?? missao;
  const isMissao = !!missao && !meta;

  const metaAuditoria = useMetaAuditoria(!isMissao ? (item?.id ?? '') : '');
  const missaoAuditoria = useMissaoAuditoria(isMissao ? (item?.id ?? '') : '');
  const { data: registros = [], isLoading } = isMissao ? missaoAuditoria : metaAuditoria;

  const tipoMetrica = item?.tipoMetrica as string | undefined;

  const totalPremio = registros.reduce((acc: number, r: any) => {
    const val = tipoMetrica === 'premio_renovacao' ? r.premioNovo : r.premioLiquido;
    return acc + (val != null ? Number(val) : 0);
  }, 0);

  const renovados = tipoMetrica === 'taxa_renovacao'
    ? registros.filter((r: any) => r.status === 'RENOVADO').length
    : null;

  const premioRenovados = tipoMetrica === 'taxa_renovacao'
    ? registros.filter((r: any) => r.status === 'RENOVADO')
        .reduce((acc: number, r: any) => acc + (r.premioNovo != null ? Number(r.premioNovo) : 0), 0)
    : null;

  const previstoRenovar = tipoMetrica === 'taxa_renovacao'
    ? registros.filter((r: any) => r.status !== 'RENOVADO')
        .reduce((acc: number, r: any) => acc + (r.premioAnterior != null ? Number(r.premioAnterior) : 0), 0)
    : null;

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="!w-[95vw] !max-w-[95vw] max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Auditoria — {item?.titulo}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {tipoMetrica ? metricaLabels[tipoMetrica] : ''} · {registros.length} registro(s)
          </p>
        </DialogHeader>

        {/* Summary cards */}
        {!isLoading && registros.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={<FileText className="h-3.5 w-3.5" />}
              label="Registros"
              value={registros.length}
              sub={tipoMetrica === 'taxa_renovacao' ? `${renovados} renovado(s)` : undefined}
            />
            {tipoMetrica === 'taxa_renovacao' ? (
              <StatCard
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                label="Prêmio Renovados"
                value={formatCurrency(premioRenovados)}
                sub="soma dos prêmios novos"
                highlight
              />
            ) : isMonetary(tipoMetrica) ? (
              <StatCard
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                label="Prêmio Líquido Total"
                value={formatCurrency(totalPremio)}
                sub="soma dos registros"
                highlight
              />
            ) : null}
            <StatCard
              icon={<Target className="h-3.5 w-3.5" />}
              label="Progresso atual"
              value={formatProgress(tipoMetrica, item?.progressoAtual)}
              sub={`meta: ${formatProgress(tipoMetrica, item?.valorAlvo ? parseFloat(item.valorAlvo) : undefined)}`}
            />
            {tipoMetrica === 'taxa_renovacao' ? (
              <StatCard
                icon={<CalendarClock className="h-3.5 w-3.5" />}
                label="Previsto para renovar"
                value={formatCurrency(previstoRenovar)}
                sub={`${registros.filter((r: any) => r.status !== 'RENOVADO').length} pendente(s)`}
              />
            ) : (
              <StatCard
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                label="Conclusão"
                value={`${item?.percentual ?? 0}%`}
                sub={item?.status}
              />
            )}
          </div>
        )}

        {/* Spreadsheet table */}
        <div className="overflow-auto flex-1 rounded-lg border border-border/60">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : registros.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground text-sm">
              Nenhum registro encontrado para esta meta.
            </p>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border bg-muted/60">
                  {tipoMetrica === 'novos_seguros' && (<>
                    <th className={th}>Nº Documento</th>
                    <th className={th}>Nº Cotação</th>
                    <th className={th}>Item</th>
                    <th className={cn(th, 'text-right')}>Prêmio Líquido</th>
                  </>)}
                  {tipoMetrica === 'cotacoes' && (<>
                    <th className={th}>Número</th>
                    <th className={th}>Situação</th>
                    <th className={th}>Item</th>
                  </>)}
                  {tipoMetrica === 'renovacoes' && (<>
                    <th className={th}>Item</th>
                    <th className={th}>Produto</th>
                    <th className={th}>Seguradora anterior</th>
                  </>)}
                  {tipoMetrica === 'valor_premio' && (<>
                    <th className={th}>Número</th>
                    <th className={th}>Status</th>
                    <th className={cn(th, 'text-right')}>Prêmio Líquido</th>
                  </>)}
                  {tipoMetrica === 'taxa_renovacao' && (<>
                    <th className={th}>Item</th>
                    <th className={th}>Produto</th>
                    <th className={th}>Seguradora anterior</th>
                    <th className={th}>Status</th>
                    <th className={th}>Vencimento</th>
                    <th className={cn(th, 'text-right')}>Prêmio Ant.</th>
                    <th className={cn(th, 'text-right')}>Com. % Ant.</th>
                    <th className={cn(th, 'text-right')}>Prêmio Novo</th>
                    <th className={cn(th, 'text-right')}>Com. % Novo</th>
                    <th className={th} />
                  </>)}
                  {tipoMetrica === 'premio_renovacao' && (<>
                    <th className={th}>Item</th>
                    <th className={th}>Produto</th>
                    <th className={th}>Seguradora anterior</th>
                    <th className={cn(th, 'text-right')}>Prêmio Novo</th>
                  </>)}
                  <th className={th}>Cliente</th>
                  <th className={th}>Vendedor</th>
                  <th className={th}>Data</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r: any, i: number) => {
                  const isRenovado = r.status === 'RENOVADO';
                  const rowCls = cn(
                    'border-b border-border/30 transition-colors',
                    isRenovado
                      ? 'bg-green-500/5 hover:bg-green-500/10'
                      : i % 2 === 0
                        ? 'bg-transparent hover:bg-muted/30'
                        : 'bg-muted/15 hover:bg-muted/30',
                  );
                  return (
                    <tr key={r.id} className={rowCls}>
                      {tipoMetrica === 'novos_seguros' && (<>
                        <td className={cn(td, 'font-mono')}>{r.numero}</td>
                        <td className={cn(tdMuted, 'font-mono')}>{r.numeroCotacao ?? '—'}</td>
                        <td className={cn(tdMuted, 'max-w-[200px] truncate')}>{r.itemDescricao ?? '—'}</td>
                        <td className={cn(tdNum, 'font-semibold')}>{formatCurrency(r.premioLiquido)}</td>
                      </>)}
                      {tipoMetrica === 'cotacoes' && (<>
                        <td className={cn(td, 'font-mono')}>{r.numero}</td>
                        <td className={td}><Badge variant="outline" className="text-[11px] px-1.5 py-0">{r.situacao}</Badge></td>
                        <td className={cn(tdMuted, 'max-w-[200px] truncate')}>{r.itemDescricao ?? '—'}</td>
                      </>)}
                      {tipoMetrica === 'renovacoes' && (<>
                        <td className={cn(td, 'max-w-[200px] truncate')}>{r.itemDescricao ?? '—'}</td>
                        <td className={tdMuted}>{r.produtoDescricao ?? '—'}</td>
                        <td className={tdMuted}>{r.seguradoraAnterior ?? '—'}</td>
                      </>)}
                      {tipoMetrica === 'valor_premio' && (<>
                        <td className={cn(td, 'font-mono')}>{r.numero}</td>
                        <td className={td}><Badge variant="outline" className="text-[11px] px-1.5 py-0">{r.status}</Badge></td>
                        <td className={cn(tdNum, 'font-semibold')}>{formatCurrency(r.premioLiquido)}</td>
                      </>)}
                      {tipoMetrica === 'taxa_renovacao' && (<>
                        <td className={cn(td, 'max-w-[160px] truncate')}>{r.itemDescricao ?? '—'}</td>
                        <td className={tdMuted}>{r.produtoDescricao ?? '—'}</td>
                        <td className={tdMuted}>{r.seguradoraAnterior ?? '—'}</td>
                        <td className={td}><StatusBadge status={r.status} /></td>
                        <td className={cn(tdMuted, 'whitespace-nowrap')}>{formatDate(r.dataVencimento)}</td>
                        <td className={tdNum}>{formatCurrency(r.premioAnterior)}</td>
                        <td className={cn(tdNum, isRenovado ? '' : 'text-muted-foreground')}>{formatPercent(r.percentualComissaoAnterior)}</td>
                        <td className={cn(tdNum, isRenovado ? 'font-semibold text-green-600 dark:text-green-400' : 'text-muted-foreground')}>
                          {isRenovado ? formatCurrency(r.premioNovo) : '—'}
                        </td>
                        <td className={cn(tdNum, isRenovado ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground')}>
                          {isRenovado ? formatPercent(r.percentualComissaoNovo) : '—'}
                        </td>
                        <td className={td}>
                          <Button variant="ghost" size="icon" className="size-6" onClick={() => setDetalheRenovacao(toRenovacaoGestao(r))}>
                            <Eye className="size-3" />
                          </Button>
                        </td>
                      </>)}
                      {tipoMetrica === 'premio_renovacao' && (<>
                        <td className={cn(td, 'max-w-[160px] truncate')}>{r.itemDescricao ?? '—'}</td>
                        <td className={tdMuted}>{r.produtoDescricao ?? '—'}</td>
                        <td className={tdMuted}>{r.seguradoraAnterior ?? '—'}</td>
                        <td className={cn(tdNum, 'font-semibold')}>{formatCurrency(r.premioNovo)}</td>
                      </>)}
                      <td className={td}>{r.clienteNome ?? '—'}</td>
                      <td className={td}>
                        {r.vendedorNome ? (
                          <Avatar className="size-6" title={r.vendedorNome}>
                            <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                              {getIniciais(r.vendedorNome)}
                            </AvatarFallback>
                          </Avatar>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className={cn(tdMuted, 'whitespace-nowrap')}>{formatDate(r.data)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <RenovacaoGestaoDetalheDialog
      renovacao={detalheRenovacao}
      open={detalheRenovacao !== null}
      onClose={() => setDetalheRenovacao(null)}
    />
    </>
  );
}
