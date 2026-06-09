import { useState, useRef, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getRouteApi } from '@tanstack/react-router';
import { dayjs } from '@/core/utils/date-utils';
import { handleApiError } from '@/core/utils/handle-api-error';
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  FileText, Search, X, ExternalLink,
} from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Skeleton } from '@/core/ui/skeleton';
import { Input } from '@/core/ui/input';
import { useWorkspaceActivity, useEndosso, useReenviarEndosso, areaTrabalhoKeys } from '@/modules/area-trabalho/http';
import { useDocumentoVenda } from '@/modules/documentos-venda/http';
import { DocumentoVendaDialog } from '@/modules/cadastro/components/documento-venda-dialog';
import { ReenviarCadastroDialog } from './reenviar-cadastro-dialog';
import { EndossoRecusadoDialog } from '@/modules/area-trabalho/components/endosso-recusado-dialog';

const routeApi = getRouteApi('/_app/workspace2/');

type ActivityEvent = {
  id: string;
  tipoEvento: string;
  usuarioNome: string | null;
  descricao: string;
  statusAnterior: string | null;
  statusNovo: string | null;
  createdAt: string;
  documentoVendaId: string;
  documentoNumero: string | null;
  documentoStatus: string | null;
  motivoRejeicao: string | null;
  tentativasRejeicao: number | null;
  clienteNome: string;
  produtoNome: string;
  vendedorNome: string | null;
  dadosAlterados?: { endossoId?: string } | null;
};

const EVENTO: Record<string, { label: string; cls: string }> = {
  CRIACAO:                    { label: 'Inclusão',               cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25' },
  ALTERACAO_STATUS:           { label: 'Status',                 cls: 'bg-muted text-muted-foreground border-border' },
  ALTERACAO_DADOS:            { label: 'Dados',                  cls: 'bg-muted text-muted-foreground border-border' },
  SOLICITACAO_CADASTRO:       { label: 'Sol. Cadastro',          cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25' },
  APROVACAO_CADASTRO:         { label: 'Cadastro Aprovado',      cls: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/25' },
  REJEICAO_CADASTRO:          { label: 'Cadastro Rejeitado',     cls: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25' },
  CONFIRMACAO_VENDA:          { label: 'Venda Confirmada',       cls: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/25' },
  CANCELAMENTO:               { label: 'Cancelamento',           cls: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25' },
  PERDA:                      { label: 'Perda',                  cls: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/25' },
  CONFIRMACAO_PERDA:          { label: 'Perda Confirmada',       cls: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/25' },
  REJEICAO_PERDA:             { label: 'Perda Rejeitada',        cls: 'bg-muted text-muted-foreground border-border' },
  ENDOSSO_CRIADO:             { label: 'Endosso',                cls: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/25' },
  ENDOSSO_APROVADO:           { label: 'Endosso Aprovado',       cls: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/25' },
  ENDOSSO_RECUSADO:           { label: 'Endosso Recusado',       cls: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25' },
  ANOTACAO:                   { label: 'Anotação',               cls: 'bg-muted text-muted-foreground border-border' },
  SOLICITACAO_EXCLUSAO:       { label: 'Sol. Exclusão',          cls: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/25' },
  EXCLUSAO_ACEITA:            { label: 'Exclusão Aceita',        cls: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25' },
  EXCLUSAO_RECUSADA:          { label: 'Exclusão Recusada',      cls: 'bg-muted text-muted-foreground border-border' },
  SOLICITACAO_TROCA_VENDEDOR: { label: 'Sol. Transferência',     cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25' },
  TROCA_VENDEDOR_APROVADA:    { label: 'Transferência Aprovada', cls: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/25' },
  TROCA_VENDEDOR_RECUSADA:    { label: 'Transferência Recusada', cls: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25' },
};

const CATEGORIA_CHIPS = [
  { key: '',              label: 'Todos' },
  { key: 'cadastro',     label: 'Cadastro' },
  { key: 'endossos',     label: 'Endossos' },
  { key: 'inclusoes',    label: 'Inclusões' },
  { key: 'cancelamentos',label: 'Cancelamentos' },
  { key: 'perdas',       label: 'Perdas' },
];

function EventoBadge({ tipo }: { tipo: string }) {
  const cfg = EVENTO[tipo] ?? { label: tipo, cls: 'bg-muted text-muted-foreground border-border' };
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium shrink-0 whitespace-nowrap ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function fmtTime(dateStr: string) {
  try { return dayjs(dateStr).format('DD/MM/YY HH:mm'); } catch { return dateStr; }
}

function todayStr() { return dayjs().format('YYYY-MM-DD'); }

const LIMIT = 30;

export function ActivityFeed() {
  const queryClient = useQueryClient();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  const page          = search.logsPage       ?? 1;
  const activeCat     = search.logsCat        ?? '';
  const activeQ       = search.logsQ          ?? '';
  const dataInicio    = search.logsDataInicio  ?? '';
  const dataFim       = search.logsDataFim     ?? '';

  const [viewDocId, setViewDocId] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState(activeQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [reenviarRow, setReenviarRow] = useState<{ clienteNome: string; documentoVendaId: string; motivoRejeicao: string | null | undefined } | null>(null);
  const [endossoDialogId, setEndossoDialogId] = useState<string | null>(null);

  const { data: endossoData } = useEndosso(endossoDialogId);
  const reenviarEndossoMutation = useReenviarEndosso();

  // Keep search input in sync when URL changes externally
  useEffect(() => { setSearchInput(activeQ); }, [activeQ]);

  const setSearch = useCallback((patch: Partial<typeof search>) => {
    navigate({ search: (prev) => ({ ...prev, ...patch }) });
  }, [navigate]);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch({ logsQ: val, logsPage: 1 });
    }, 350);
  };

  const handleCatChange = (cat: string) => {
    setSearch({ logsCat: cat, logsPage: 1 });
  };

  const setDatePreset = (preset: 'hoje' | '7d' | '30d' | 'mes' | '') => {
    if (preset === '') { setSearch({ logsDataInicio: '', logsDataFim: '', logsPage: 1 }); return; }
    const today = todayStr();
    if (preset === 'hoje') { setSearch({ logsDataInicio: today, logsDataFim: today, logsPage: 1 }); return; }
    if (preset === '7d')   { setSearch({ logsDataInicio: dayjs().subtract(6, 'day').format('YYYY-MM-DD'), logsDataFim: today, logsPage: 1 }); return; }
    if (preset === '30d')  { setSearch({ logsDataInicio: dayjs().subtract(29, 'day').format('YYYY-MM-DD'), logsDataFim: today, logsPage: 1 }); return; }
    if (preset === 'mes')  { setSearch({ logsDataInicio: dayjs().startOf('month').format('YYYY-MM-DD'), logsDataFim: dayjs().endOf('month').format('YYYY-MM-DD'), logsPage: 1 }); return; }
  };

  const hasDateFilter = !!(dataInicio || dataFim);
  const hasAnyFilter = activeCat || activeQ || hasDateFilter;

  const filters = {
    categorias: activeCat || undefined,
    q: activeQ || undefined,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
  };

  const { data, isLoading } = useWorkspaceActivity(page, LIMIT, filters);
  const eventos: ActivityEvent[] = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const { data: viewDoc } = useDocumentoVenda(viewDocId ?? '');

  const prefetchDoc = useCallback((docId: string) => {
    queryClient.prefetchQuery({
      queryKey: areaTrabalhoKeys.documentoHistorico(docId),
      queryFn: async () => {
        const { api } = await import('@/infra/http/api');
        const response = await api.get<any>(`/sales-documents/${docId}/history`);
        if (response && typeof response === 'object' && 'data' in response) {
          return Array.isArray(response.data) ? response.data : [];
        }
        return Array.isArray(response) ? response : [];
      },
      staleTime: 30 * 1000,
      retry: (failureCount, error: any) => error?.status !== 403 && failureCount < 2,
    });
  }, [queryClient]);

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setSearch({ logsCat: '', logsQ: '', logsDataInicio: '', logsDataFim: '', logsPage: 1 });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b space-y-2 shrink-0">
          <Skeleton className="h-7 w-full rounded" />
          <div className="flex gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-20 rounded-full" />)}
          </div>
        </div>
        <div className="p-4 space-y-2 flex-1">
          {Array.from({ length: 15 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <div className="px-4 pt-3 pb-2.5 border-b shrink-0 space-y-2.5">
          {/* Search + date presets */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Buscar cliente ou nº doc..."
                className="pl-8 h-8 text-sm"
              />
              {searchInput && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Date presets */}
            <div className="flex items-center gap-1">
              {(['hoje', '7d', '30d', 'mes'] as const).map((preset) => {
                const labels = { hoje: 'Hoje', '7d': '7 dias', '30d': '30 dias', mes: 'Este mês' };
                const isActive = (() => {
                  const today = todayStr();
                  if (preset === 'hoje') return dataInicio === today && dataFim === today;
                  if (preset === '7d')   return dataInicio === dayjs().subtract(6, 'day').format('YYYY-MM-DD') && dataFim === today;
                  if (preset === '30d')  return dataInicio === dayjs().subtract(29, 'day').format('YYYY-MM-DD') && dataFim === today;
                  if (preset === 'mes')  return dataInicio === dayjs().startOf('month').format('YYYY-MM-DD');
                  return false;
                })();
                return (
                  <button
                    key={preset}
                    onClick={() => setDatePreset(isActive ? '' : preset)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                    }`}
                  >
                    {labels[preset]}
                  </button>
                );
              })}
            </div>

            {hasAnyFilter && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
              >
                <X className="size-3" />
                Limpar
              </button>
            )}
          </div>

          {/* Category chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORIA_CHIPS.map((chip) => (
              <button
                key={chip.key}
                onClick={() => handleCatChange(chip.key)}
                className={`px-2.5 py-0.5 rounded-full border text-xs font-medium transition-colors ${
                  activeCat === chip.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto">
          {eventos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="size-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {hasAnyFilter ? 'Nenhum evento encontrado com os filtros aplicados.' : 'Nenhum evento registrado.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted/80 backdrop-blur-sm border-b text-left">
                  <th className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap w-[110px]">Quando</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide w-[160px]">Evento</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Cliente</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide w-[120px]">Produto</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Descrição</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide w-[110px]">Por</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide w-[110px]">Vendedor</th>
                  <th className="px-4 py-2 w-[36px]" />
                </tr>
              </thead>
              <tbody>
                {eventos.map((ev) => {
                  const isExpanded = expandedRows.has(ev.id);
                  const isRejeicao = ev.tipoEvento === 'REJEICAO_CADASTRO';
                  return (
                    <>
                      <tr
                        key={ev.id}
                        className={`border-b transition-colors hover:bg-muted/40 cursor-default ${isRejeicao ? 'bg-red-500/5' : ''}`}
                        onMouseEnter={() => { if (!ev.tipoEvento.startsWith('ENDOSSO_')) prefetchDoc(ev.documentoVendaId); }}
                      >
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {fmtTime(ev.createdAt)}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap items-center gap-1">
                            <EventoBadge tipo={ev.tipoEvento} />
                            {isRejeicao && ev.tentativasRejeicao && ev.tentativasRejeicao > 1 && (
                              <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                                {ev.tentativasRejeicao}ª
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 max-w-[180px]">
                          <span className="font-medium truncate block">{ev.clienteNome}</span>
                          {ev.documentoNumero && (
                            <span className="text-[10px] text-muted-foreground">#{ev.documentoNumero}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[120px]">
                          {ev.produtoNome}
                        </td>
                        <td className="px-4 py-2.5 max-w-[240px]">
                          <span className={`text-xs line-clamp-2 ${isRejeicao ? 'text-red-700 dark:text-red-400 font-medium' : 'text-muted-foreground'}`}>
                            {ev.descricao}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[110px]">
                          {ev.usuarioNome ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[110px]">
                          {ev.vendedorNome ?? '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                if (ev.tipoEvento === 'ENDOSSO_RECUSADO') {
                                  const endossoId = ev.dadosAlterados?.endossoId;
                                  if (endossoId) { setEndossoDialogId(endossoId); return; }
                                }
                                setViewDocId(ev.documentoVendaId);
                              }}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="Ver documento"
                            >
                              <ExternalLink className="size-3.5" />
                            </button>
                            {isRejeicao && (
                              <button
                                onClick={() => toggleExpand(ev.id)}
                                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                title={isExpanded ? 'Recolher' : 'Expandir'}
                              >
                                {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isRejeicao && isExpanded && (
                        <tr key={`${ev.id}-expanded`} className="border-b bg-red-500/5">
                          <td colSpan={8} className="px-6 pb-3 pt-1">
                            <div className="rounded-md border border-red-500/25 bg-background p-3 space-y-2">
                              {ev.motivoRejeicao && (
                                <div>
                                  <p className="text-[10px] font-medium text-red-700 dark:text-red-400 uppercase tracking-wide mb-0.5">Motivo da Rejeição</p>
                                  <p className="text-xs text-red-700/80 dark:text-red-400/80">{ev.motivoRejeicao}</p>
                                </div>
                              )}
                              <div className="flex items-center gap-2 pt-1">
                                {ev.documentoStatus === 'VENDA_CONFIRMADA' && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs bg-orange-600 hover:bg-orange-700"
                                    onClick={() => setReenviarRow({ clienteNome: ev.clienteNome, documentoVendaId: ev.documentoVendaId, motivoRejeicao: ev.motivoRejeicao })}
                                  >
                                    Reenviar para Cadastro
                                  </Button>
                                )}
                                <button
                                  onClick={() => setViewDocId(ev.documentoVendaId)}
                                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
                                >
                                  Ver histórico completo
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ──────────────────────────────────────────────────── */}
        {(totalPages > 1 || total > 0) && (
          <div className="flex items-center justify-between border-t px-4 py-2 shrink-0 bg-background">
            <span className="text-xs text-muted-foreground">
              {total.toLocaleString('pt-BR')} evento{total !== 1 ? 's' : ''}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Pág. {page} de {totalPages}</span>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => setSearch({ logsPage: page - 1 })}>
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setSearch({ logsPage: page + 1 })}>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Document Dialog ─────────────────────────────────────────────── */}
      <DocumentoVendaDialog
        open={!!viewDocId}
        documento={viewDoc ?? null}
        onClose={() => setViewDocId(null)}
        readOnly
      />

      {/* ── Reenviar dialog ─────────────────────────────────────────────── */}
      <ReenviarCadastroDialog
        open={!!reenviarRow}
        onClose={() => setReenviarRow(null)}
        row={reenviarRow}
      />

      {/* ── Endosso Recusado dialog ─────────────────────────────────────── */}
      <EndossoRecusadoDialog
        open={!!endossoDialogId}
        endosso={endossoData ?? null}
        onClose={() => setEndossoDialogId(null)}
        onReenviar={async () => {
          if (!endossoDialogId) return;
          try {
            await reenviarEndossoMutation.mutateAsync(endossoDialogId);
            toast.success('Endosso reenviado para o cadastro!');
            setEndossoDialogId(null);
          } catch (err) {
            toast.error(handleApiError(err));
          }
        }}
        isReenviando={reenviarEndossoMutation.isPending}
      />
    </>
  );
}
