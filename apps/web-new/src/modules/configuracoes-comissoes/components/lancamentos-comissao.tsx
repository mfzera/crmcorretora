
import { useState } from 'react';
import { dayjs } from '@/core/utils/date-utils';
import { CheckCircle, Clock, XCircle, ChevronDown, ChevronUp, CalendarDays, TrendingUp } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/ui/select';
import { DateInput } from '@/core/ui/date-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/core/ui/dialog';
import { Label } from '@/core/ui/label';
import { Textarea } from '@/core/ui/textarea';
import { Checkbox } from '@/core/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import {
  useLancamentosComissao,
  useUpdateEntryReceipt,
  useAtualizarPagamentoLancamento,
  usePagarLoteLancamentos,
  useProjecaoLancamentos,
  type ComissaoLancamento,
  type StatusPagamentoComissao,
  type StatusRecebimentoSeguradora,
} from '../http';

const formatCurrency = (v: string | number | null | undefined) => {
  if (v === null || v === undefined) return '—';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const statusPagamentoBadge: Record<StatusPagamentoComissao, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDENTE: { label: 'Pendente', variant: 'secondary' },
  PAGO: { label: 'Pago', variant: 'default' },
  CANCELADO: { label: 'Cancelado', variant: 'destructive' },
};

const statusRecebimentoBadge: Record<StatusRecebimentoSeguradora, { label: string; icon: any }> = {
  AGUARDANDO: { label: 'Aguardando', icon: Clock },
  RECEBIDO: { label: 'Recebido', icon: CheckCircle },
  NAO_APLICAVEL: { label: 'N/A', icon: XCircle },
};

// ─── Atualizar Recebimento Dialog ─────────────────────────────────────────────

function AtualizarRecebimentoDialog({
  lancamento,
  onClose,
}: {
  lancamento: ComissaoLancamento;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<StatusRecebimentoSeguradora>(lancamento.statusRecebimentoSeguradora);
  const [data, setData] = useState(lancamento.dataRecebimentoSeguradora ?? '');
  const [obs, setObs] = useState(lancamento.observacaoRecebimento ?? '');
  const mutation = useUpdateEntryReceipt();

  function handleSalvar() {
    mutation.mutate(
      { id: lancamento.id, statusRecebimentoSeguradora: status, dataRecebimentoSeguradora: data || null, observacaoRecebimento: obs || null },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recebimento da Seguradora</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusRecebimentoSeguradora)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AGUARDANDO">Aguardando</SelectItem>
                <SelectItem value="RECEBIDO">Recebido</SelectItem>
                <SelectItem value="NAO_APLICAVEL">Não Aplicável</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {status === 'RECEBIDO' && (
            <div className="space-y-1">
              <Label>Data de Recebimento</Label>
              <DateInput value={data} onChange={setData} />
            </div>
          )}
          <div className="space-y-1">
            <Label>Observação</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={mutation.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Atualizar Pagamento Dialog ───────────────────────────────────────────────

function AtualizarPagamentoDialog({
  lancamento,
  onClose,
}: {
  lancamento: ComissaoLancamento;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<StatusPagamentoComissao>(lancamento.statusPagamentoVendedor);
  const [data, setData] = useState(
    lancamento.dataPagamentoVendedor ? lancamento.dataPagamentoVendedor.substring(0, 10) : '',
  );
  const [obs, setObs] = useState(lancamento.observacaoPagamento ?? '');
  const mutation = useAtualizarPagamentoLancamento();

  function handleSalvar() {
    mutation.mutate(
      { id: lancamento.id, statusPagamentoVendedor: status, dataPagamentoVendedor: data || null, observacaoPagamento: obs || null },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagamento ao Vendedor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground">
            Parcela {lancamento.numeroParcela}/{lancamento.totalParcelas} —{' '}
            <span className="font-medium text-foreground">{formatCurrency(lancamento.valorComissaoVendedor)}</span>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusPagamentoComissao)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="PAGO">Pago</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {status === 'PAGO' && (
            <div className="space-y-1">
              <Label>Data de Pagamento</Label>
              <DateInput value={data} onChange={setData} />
            </div>
          )}
          <div className="space-y-1">
            <Label>Observação</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={mutation.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Projeção Mensal ──────────────────────────────────────────────────────────

export function ProjecaoLancamentos() {
  const [meses, setMeses] = useState(6);
  const { data, isLoading } = useProjecaoLancamentos(meses);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <CalendarDays className="h-4 w-4" /> Agenda de Recebimentos e Pagamentos
        </h3>
        <Select value={String(meses)} onValueChange={(v) => setMeses(Number(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 meses</SelectItem>
            <SelectItem value="6">6 meses</SelectItem>
            <SelectItem value="12">12 meses</SelectItem>
            <SelectItem value="24">24 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando projeção…</p>}

      {data && data.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhum lançamento futuro encontrado.
        </p>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((row) => {
            const [ano, mes] = row.mes.split('-');
            const label = dayjs(`${ano}-${mes}-01`).format('MMMM YYYY');
            return (
              <Card key={row.mes} className="text-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm capitalize">{label}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total comissão</span>
                    <span className="font-medium">{formatCurrency(row.totalComissao)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">A pagar vendedores</span>
                    <span className="font-medium">{formatCurrency(row.totalVendedor)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Parcelas</span>
                    <span>{row.qtdParcelas} total · {row.qtdPendentes} pendentes</span>
                  </div>
                  {Number(row.qtdNaoRecebido) > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>Aguardando seguradora</span>
                      <span>{row.qtdNaoRecebido}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tabela de Lançamentos ────────────────────────────────────────────────────

export function LancamentosComissao({ documentoVendaId }: { documentoVendaId?: string }) {
  const [filters, setFilters] = useState({
    vendedorId: '',
    statusPagamentoVendedor: '' as StatusPagamentoComissao | '',
    statusRecebimentoSeguradora: '' as StatusRecebimentoSeguradora | '',
    dataInicio: '',
    dataFim: '',
    page: 1,
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [recebimentoLancamento, setRecebimentoLancamento] = useState<ComissaoLancamento | null>(null);
  const [pagamentoLancamento, setPagamentoLancamento] = useState<ComissaoLancamento | null>(null);
  const [showPagarLote, setShowPagarLote] = useState(false);
  const [dataPagamentoLote, setDataPagamentoLote] = useState('');

  const { data, isLoading } = useLancamentosComissao({
    ...filters,
    documentoVendaId,
    limit: 30,
  });

  const pagarLote = usePagarLoteLancamentos();

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!data) return;
    const pendentes = data.data.filter((l) => l.statusPagamentoVendedor === 'PENDENTE').map((l) => l.id);
    if (pendentes.every((id) => selected.has(id))) {
      setSelected((prev) => {
        const next = new Set(prev);
        pendentes.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => new Set([...prev, ...pendentes]));
    }
  }

  function handlePagarLote() {
    pagarLote.mutate(
      { ids: [...selected], dataPagamento: dataPagamentoLote || undefined },
      {
        onSuccess: () => {
          setSelected(new Set());
          setShowPagarLote(false);
        },
      },
    );
  }

  const pendentesNaPagina = data?.data.filter((l) => l.statusPagamentoVendedor === 'PENDENTE') ?? [];
  const todosPendentesSelecionados =
    pendentesNaPagina.length > 0 && pendentesNaPagina.every((l) => selected.has(l.id));

  return (
    <div className="space-y-4">
      {/* Filtros */}
      {!documentoVendaId && (
        <div className="flex flex-wrap gap-3">
          <Select
            value={filters.statusPagamentoVendedor || '__all'}
            onValueChange={(v) => setFilters((f) => ({ ...f, statusPagamentoVendedor: (v === '__all' ? '' : v) as any, page: 1 }))}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos</SelectItem>
              <SelectItem value="PENDENTE">Pendente</SelectItem>
              <SelectItem value="PAGO">Pago</SelectItem>
              <SelectItem value="CANCELADO">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.statusRecebimentoSeguradora || '__all'}
            onValueChange={(v) => setFilters((f) => ({ ...f, statusRecebimentoSeguradora: (v === '__all' ? '' : v) as any, page: 1 }))}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Recebimento seguradora" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos</SelectItem>
              <SelectItem value="AGUARDANDO">Aguardando seguradora</SelectItem>
              <SelectItem value="RECEBIDO">Recebido da seguradora</SelectItem>
              <SelectItem value="NAO_APLICAVEL">Não Aplicável</SelectItem>
            </SelectContent>
          </Select>

          <DateInput
            value={filters.dataInicio}
            onChange={(v) => setFilters((f) => ({ ...f, dataInicio: v, page: 1 }))}
            placeholder="Vencimento início"
            className="w-44"
          />
          <DateInput
            value={filters.dataFim}
            onChange={(v) => setFilters((f) => ({ ...f, dataFim: v, page: 1 }))}
            placeholder="Vencimento fim"
            className="w-44"
          />
        </div>
      )}

      {/* Ação em lote */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-2">
          <span className="text-sm font-medium">{selected.size} selecionado(s)</span>
          <Button size="sm" onClick={() => setShowPagarLote(true)}>
            Marcar como Pago
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Limpar seleção
          </Button>
        </div>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {data && (
        <>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-3 py-2 w-8">
                    <Checkbox
                      checked={todosPendentesSelecionados}
                      onCheckedChange={toggleAll}
                      disabled={pendentesNaPagina.length === 0}
                    />
                  </th>
                  <th className="px-3 py-2">Vendedor</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Parcela</th>
                  <th className="px-3 py-2">Vencimento</th>
                  <th className="px-3 py-2">Val. Total</th>
                  <th className="px-3 py-2">Val. Vendedor</th>
                  <th className="px-3 py-2">Seguradora</th>
                  <th className="px-3 py-2">Pagamento</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((l) => {
                  const recBadge = statusRecebimentoBadge[l.statusRecebimentoSeguradora];
                  const pagBadge = statusPagamentoBadge[l.statusPagamentoVendedor];
                  const RecIcon = recBadge.icon;
                  return (
                    <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2">
                        {l.statusPagamentoVendedor === 'PENDENTE' && (
                          <Checkbox
                            checked={selected.has(l.id)}
                            onCheckedChange={() => toggleSelect(l.id)}
                          />
                        )}
                      </td>
                      <td className="px-3 py-2">{l.vendedorNome ?? '—'}</td>
                      <td className="px-3 py-2 capitalize text-xs text-muted-foreground">{l.tipo.replace('_', ' ').toLowerCase()}</td>
                      <td className="px-3 py-2">{l.numeroParcela}/{l.totalParcelas}</td>
                      <td className="px-3 py-2">
                        {l.dataVencimento
                          ? dayjs(l.dataVencimento).format('DD/MM/YYYY')
                          : '—'}
                      </td>
                      <td className="px-3 py-2 font-medium">{formatCurrency(l.valorComissaoTotal)}</td>
                      <td className="px-3 py-2">{formatCurrency(l.valorComissaoVendedor)}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => setRecebimentoLancamento(l)}
                          className="flex items-center gap-1 text-xs hover:underline"
                        >
                          <RecIcon className={`h-3.5 w-3.5 ${l.statusRecebimentoSeguradora === 'RECEBIDO' ? 'text-green-600' : l.statusRecebimentoSeguradora === 'AGUARDANDO' ? 'text-amber-500' : 'text-muted-foreground'}`} />
                          {recBadge.label}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => setPagamentoLancamento(l)} className="hover:underline">
                          <Badge variant={pagBadge.variant} className="text-xs">{pagBadge.label}</Badge>
                        </button>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {l.dataPagamentoVendedor
                          ? dayjs(l.dataPagamentoVendedor).format('DD/MM/YY')
                          : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {data.pagination.pages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{data.pagination.total} lançamentos</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page === 1}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                >
                  Anterior
                </Button>
                <span className="py-1">
                  {filters.page}/{data.pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page >= data.pagination.pages}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      {recebimentoLancamento && (
        <AtualizarRecebimentoDialog
          lancamento={recebimentoLancamento}
          onClose={() => setRecebimentoLancamento(null)}
        />
      )}
      {pagamentoLancamento && (
        <AtualizarPagamentoDialog
          lancamento={pagamentoLancamento}
          onClose={() => setPagamentoLancamento(null)}
        />
      )}

      {/* Pagar lote dialog */}
      {showPagarLote && (
        <Dialog open onOpenChange={(o) => !o && setShowPagarLote(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Marcar {selected.size} lançamento(s) como Pago</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label>Data de Pagamento</Label>
                <DateInput value={dataPagamentoLote} onChange={setDataPagamentoLote} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPagarLote(false)}>Cancelar</Button>
              <Button onClick={handlePagarLote} disabled={pagarLote.isPending}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
