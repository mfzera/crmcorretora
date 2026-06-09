import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { toast } from 'sonner';
import { AgGridReact } from 'ag-grid-react';
import {
  themeQuartz,
  type ColDef,
  type ValueFormatterParams,
  type GetRowIdParams,
  type ICellEditorParams,
} from 'ag-grid-community';
import { AArrowDown, AArrowUp, ArrowLeftRight, Building2, ChevronLeft, ChevronRight, Check, History, LayoutGrid, Package, Plus, EyeOff, Eye as EyeIcon, Printer, Search, Table2, Tag, Users, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/ui/popover';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Skeleton } from '@/core/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/core/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/ui/tooltip';
import {
  areaTrabalhoKeys,
  useIniciarRenovacao,
  useReatribuirClienteRenovacao,
  useUpdateQuote,
  useCreateQuote,
  useUpdateRenovacaoStatus,
  useArchiveQuote,
  useRestoreQuote,
  useArchiveRenovacao,
  useRestoreRenovacao,
  useComentariosCotacao,
  useAdicionarComentarioCotacao,
  type ComentarioItem,
} from '@/modules/area-trabalho/http';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/core/ui/sheet';
import { ComentariosPanel } from '@/modules/area-trabalho/components/comentarios-panel';
import { EquipeWorkspaceView, OportunidadesPendentesClienteCard } from '@/modules/area-trabalho/components';
import { useUpdateClient } from '@/modules/clientes/http';
import { cn } from '@/core/utils';
import { handleApiError, isApiError } from '@/core/utils/handle-api-error';
import { useAuthStore } from '@/infra/auth/auth-store';
import type { RenovacaoPendente } from '@/types/area-trabalho';
import {
  ClienteCellRenderer,
  VendedorCellRenderer,
  SituacaoCellRenderer,
  ComentariosCellRenderer,
  PLCellRenderer,
  ComissaoCellRenderer,
  ReceitaCellRenderer,
  AcoesCellRenderer,
} from '../components/cell-renderers';
import { AnexosCellRenderer } from '../components/anexos-cell-renderer';
import { SituacaoDropdown, MultiSelectFilter } from '../components/situacao-dropdown';
import { ReenviarCadastroDialog } from '../components/reenviar-cadastro-dialog';
import { WorkspaceKanban } from '../components/workspace-kanban';
import { ProdutoCellEditor, VendedorCellEditor, SeguradoraCellEditor } from '../components/cell-editors';
import { ActivityFeed } from '../components/activity-feed';
import { useBrowserColorScheme } from '../hooks/use-browser-color-scheme';
import { useWorkspaceNavigation } from '../hooks/use-workspace-navigation';
import { useWorkspaceFilters } from '../hooks/use-workspace-filters';
import { useWorkspaceColumnPrefs } from '../hooks/use-workspace-column-prefs';
import { useWorkspaceDialogs } from '../hooks/use-workspace-dialogs';
import { useWorkspaceData } from '../hooks/use-workspace-data';
import { useWorkspaceInlineEdit } from '../hooks/use-workspace-inline-edit';
import { FONT_SIZES } from '../types';
import { fmt, fmtDate, fmtPct, renovacaoPlanilhaParaPendente, situacaoToEtapa, situacaoToRenovacaoStatus, SITUACOES_RENOVACAO_EDITAVEIS, SITUACOES_BLOQUEADAS } from '../helpers';
import type { FontSizeKey, GridContext, SelectOption, SituacaoLabel, WorkspaceRow } from '../types';

// ─── Lazy dialogs ─────────────────────────────────────────────────────────────

const RenovacaoDetalhesDialog = lazy(() =>
  import('@/modules/area-trabalho/components/renovacao-detalhes-dialog').then((m) => ({ default: m.RenovacaoDetalhesDialog })),
);
const RenovacaoConvertidaDialog = lazy(() =>
  import('@/modules/area-trabalho/components/renovacao-convertida-dialog').then((m) => ({ default: m.RenovacaoConvertidaDialog })),
);
const CotacaoDialog = lazy(() =>
  import('@/modules/area-trabalho/components/cotacao-dialog').then((m) => ({ default: m.CotacaoDialog })),
);
const NovoSeguroDialog = lazy(() =>
  import('@/modules/area-trabalho/components/novo-seguro-dialog').then((m) => ({ default: m.NovoSeguroDialog })),
);
const RegistrarEndossoExternoDialog = lazy(() =>
  import('@/modules/area-trabalho/components/registrar-endosso-externo-dialog').then((m) => ({ default: m.RegistrarEndossoExternoDialog })),
);
const CancelarRenovacaoDialog = lazy(() =>
  import('../components/cancelar-renovacao-dialog').then((m) => ({ default: m.CancelarRenovacaoDialog })),
);
const TransferirRenovacoesDialog = lazy(() =>
  import('@/modules/area-trabalho/components/transferir-renovacoes-dialog').then((m) => ({ default: m.TransferirRenovacoesDialog })),
);
const ProspectoRapidoDialog = lazy(() =>
  import('../components/prospecto-rapido-dialog').then((m) => ({ default: m.ProspectoRapidoDialog })),
);

// ─────────────────────────────────────────────────────────────────────────────

// ── Cores de coluna — 15 tons semi-transparentes ──────────────────────────────

const COL_PRESET_COLORS = [
  { label: 'Vermelho',  value: 'rgba(239,68,68,0.18)'   },
  { label: 'Laranja',   value: 'rgba(249,115,22,0.18)'  },
  { label: 'Âmbar',    value: 'rgba(245,158,11,0.18)'  },
  { label: 'Amarelo',  value: 'rgba(234,179,8,0.18)'   },
  { label: 'Lima',     value: 'rgba(132,204,22,0.18)'  },
  { label: 'Verde',    value: 'rgba(34,197,94,0.18)'   },
  { label: 'Teal',     value: 'rgba(20,184,166,0.18)'  },
  { label: 'Ciano',    value: 'rgba(6,182,212,0.18)'   },
  { label: 'Azul',     value: 'rgba(59,130,246,0.18)'  },
  { label: 'Índigo',   value: 'rgba(99,102,241,0.18)'  },
  { label: 'Violeta',  value: 'rgba(139,92,246,0.18)'  },
  { label: 'Roxo',     value: 'rgba(168,85,247,0.18)'  },
  { label: 'Rosa',     value: 'rgba(236,72,153,0.18)'  },
  { label: 'Rose',     value: 'rgba(244,63,94,0.18)'   },
  { label: 'Cinza',    value: 'rgba(100,116,139,0.18)' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────

function safeLS(key: string, fallback: string): string {
  try { return localStorage.getItem(key) ?? fallback; }
  catch { return fallback; }
}

const wsRouteApi = getRouteApi('/_app/workspace2/');

export function WorkspaceScreen() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const gridRefRen = useRef<AgGridReact<WorkspaceRow>>(null);
  const gridRefNS = useRef<AgGridReact<WorkspaceRow>>(null);

  const { mesAtual, vigenciaInicio, vigenciaFim, nomeMesAtual, irParaMesAnterior, irParaProximoMes } = useWorkspaceNavigation();

  const wsSearch = wsRouteApi.useSearch();
  const wsNavigate = wsRouteApi.useNavigate();
  const activeTab = wsSearch.tab ?? 'renovacoes';
  const setActiveTab = useCallback((tab: string) => {
    wsNavigate({ search: (prev) => ({ ...prev, tab: tab as any }) });
  }, [wsNavigate]);
  const [selectedRenIds, setSelectedRenIds] = useState<string[]>([]);
  const [localDeletedIds, setLocalDeletedIds] = useState<Set<string>>(new Set());
  const [localRestoredIds, setLocalRestoredIds] = useState<Set<string>>(new Set());

  const {
    columnColors, columnColorsRef,
    colContextMenu, closeColContextMenu,
    onCellContextMenu, onColumnHeaderContextMenu,
    setColor,
    onGridReady, onColumnResized, onDragStopped,
    scheduleSavePrefs,
  } = useWorkspaceColumnPrefs({ ren: gridRefRen, ns: gridRefNS }, activeTab);

  const {
    situacaoFilter, setSituacaoFilter,
    tagFilter, setTagFilter,
    tagPopoverOpen, setTagPopoverOpen,
    vendedorFilter, setVendedorFilter,
    produtoFilter, setProdutoFilter,
    seguradoraFilter, setSeguradoraFilter,
    showExcluidos, setShowExcluidos,
    nameFilter, setNameFilter,
  } = useWorkspaceFilters(columnColorsRef);
  const deferredNameFilter = useDeferredValue(nameFilter);

  const dialogs = useWorkspaceDialogs();

  const [fontSizeIdx, setFontSizeIdx] = useState<FontSizeKey>(1);

  const [viewMode, setViewMode] = useState<'planilha' | 'kanban'>(() =>
    safeLS('workspace:viewMode', 'planilha') === 'kanban' ? 'kanban' : 'planilha'
  );
  const handleViewModeChange = useCallback((mode: 'planilha' | 'kanban') => {
    try { localStorage.setItem('workspace:viewMode', mode); } catch { /* ignorar */ }
    setViewMode(mode);
  }, []);

  const browserColorScheme = useBrowserColorScheme();
  const filtros = useMemo(() => ({ vigenciaInicio, vigenciaFim }), [vigenciaInicio, vigenciaFim]);

  // ── Data (queries + row derivation) ──────────────────────────────────────
  const {
    equipeData,
    loadingRenovacoes,
    loadingCotacoes,
    cotacaoTags,
    usuariosVendedores,
    pendentesMap,
    vendedoresOptions,
    produtosOptions,
    seguradorasOptions,
    rowsRen,
    rowsNS,
    vendedorFilterOptions,
    produtoFilterOptions,
    seguradoraFilterOptions,
  } = useWorkspaceData({
    filtros,
    situacaoFilter,
    tagFilter,
    vendedorFilter,
    produtoFilter,
    seguradoraFilter,
    showExcluidos,
    nameFilter: deferredNameFilter,
  });

  const displayRowsRen = useMemo(() => {
    if (localDeletedIds.size === 0 && localRestoredIds.size === 0) return rowsRen;
    return rowsRen.map((r) => {
      if (localRestoredIds.has(r.id)) return { ...r, isDeleted: false };
      if (localDeletedIds.has(r.id)) return { ...r, isDeleted: true };
      return r;
    });
  }, [rowsRen, localDeletedIds, localRestoredIds]);
  const displayRowsNS = useMemo(() => {
    if (localDeletedIds.size === 0 && localRestoredIds.size === 0) return rowsNS;
    return rowsNS.map((r) => {
      if (localRestoredIds.has(r.id)) return { ...r, isDeleted: false };
      if (localDeletedIds.has(r.id)) return { ...r, isDeleted: true };
      return r;
    });
  }, [rowsNS, localDeletedIds, localRestoredIds]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const iniciarMutation = useIniciarRenovacao();
  const reatribuirMutation = useReatribuirClienteRenovacao();
  const updateClientMutation = useUpdateClient();
  const updateQuoteMutation = useUpdateQuote();
  const createQuoteMutation = useCreateQuote();
  const updateRenovacaoStatusMutation = useUpdateRenovacaoStatus();
  const archiveQuoteMutation = useArchiveQuote();
  const restoreQuoteMutation = useRestoreQuote();
  const archiveRenovacaoMutation = useArchiveRenovacao();
  const restoreRenovacaoMutation = useRestoreRenovacao();

  const { data: comentarios = [], isLoading: loadingComentarios } = useComentariosCotacao(
    dialogs.comentariosRow?.cotacaoId ?? null,
  );
  const adicionarComentario = useAdicionarComentarioCotacao();

  const onSelectionChangedRen = useCallback(() => {
    const nodes = gridRefRen.current?.api.getSelectedNodes() ?? [];
    const ids = nodes
      .filter((n) => n.data?.rowType === 'renovacao' && !n.data?.isDeleted)
      .map((n) => n.data!.id);
    setSelectedRenIds(ids);
  }, []);

  useEffect(() => {
    gridRefRen.current?.api?.deselectAll();
    setSelectedRenIds([]);
  }, [activeTab, mesAtual]);

  const handleOpenComentarios = useCallback((row: WorkspaceRow) => dialogs.openComentarios(row), [dialogs]);
  const handleAddComentario = useCallback((row: WorkspaceRow, texto: string) => {
    if (!row.cotacaoId) return;
    const originalCount = row.comentariosCount ?? 0;
    const originalUltimo = row.ultimoComentario;
    const patch: Partial<WorkspaceRow> = {
      comentariosCount: originalCount + 1,
      ultimoComentario: {
        autorNome: currentUser?.nome ?? '',
        autorAvatarUrl: currentUser?.avatarUrl ?? null,
        texto,
        createdAt: new Date().toISOString(),
      },
    };
    const applyToNode = (p: Partial<WorkspaceRow>) => {
      for (const ref of [gridRefRen, gridRefNS]) {
        const node = ref.current?.api.getRowNode(row.id);
        if (node?.data) { node.setData({ ...node.data, ...p }); return; }
      }
    };
    applyToNode(patch);
    adicionarComentario.mutate({ cotacaoId: row.cotacaoId, texto }, {
      onError: () => applyToNode({ comentariosCount: originalCount, ultimoComentario: originalUltimo }),
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() }); },
    });
  }, [adicionarComentario, currentUser, gridRefRen, gridRefNS]);

  // ── Dialog handlers ───────────────────────────────────────────────────────

  const handleIniciarClick = useCallback((row: WorkspaceRow) => {
    if (!row.renovacaoId) return;
    const pendente = pendentesMap.get(row.renovacaoId);
    if (pendente) { dialogs.openDetalhes(pendente); return; }
    const r = row._renovacao!;
    const status: RenovacaoPendente['status'] =
      r.status === 'NAO_TRABALHADO' ? 'PENDENTE'
      : r.status === 'RENOVADO' ? 'RENOVADO'
      : r.status === 'PERDIDO' ? 'PERDIDO'
      : 'EM_ANDAMENTO';
    dialogs.openDetalhes(renovacaoPlanilhaParaPendente(r, status));
  }, [pendentesMap, dialogs]);

  const handleVerDetalhes = useCallback((row: WorkspaceRow) => {
    if (row.rowType === 'renovacao') {
      if (row._renovacao?.status === 'RENOVADO') {
        dialogs.openConvertida(row._renovacao);
        return;
      }
      if (row._cotacao) {
        dialogs.openCotacao(row._cotacao, 'view');
        return;
      }
      const pendente = row.renovacaoId ? pendentesMap.get(row.renovacaoId) : undefined;
      if (pendente) { dialogs.openDetalhes(pendente); return; }
      if (row._renovacao) {
        const r = row._renovacao;
        const renovacaoPendenteStatus: RenovacaoPendente['status'] =
          r.status === 'NAO_TRABALHADO' ? 'PENDENTE'
          : r.status === 'RENOVADO' ? 'RENOVADO'
          : r.status === 'PERDIDO' ? 'PERDIDO'
          : 'EM_ANDAMENTO';
        dialogs.openDetalhes(renovacaoPlanilhaParaPendente(r, renovacaoPendenteStatus));
      }
    } else if (row.rowType === 'cotacao' && row._cotacao) {
      if (row.situacao === 'Reprovada') {
        const docId = row._cotacao.documentoVendaIdDoc;
        if (docId) dialogs.openReenviarCadastro({ clienteNome: row.clienteNome, documentoVendaId: docId, motivoRejeicao: row._cotacao.motivoRejeicaoCadastroDoc });
        return;
      }
      dialogs.openCotacao(row._cotacao, 'view');
    }
  }, [pendentesMap, dialogs]);


  const handleEditarDetalhes = useCallback((row: WorkspaceRow) => {
    if (row._cotacao) dialogs.openCotacao(row._cotacao, 'edit');
  }, [dialogs]);

  const handleProspectar = useCallback((row: WorkspaceRow) => {
    if (row._cotacao) {
      dialogs.openCotacao(row._cotacao, 'view');
    } else if (row.rowType === 'renovacao') {
      handleIniciarClick(row);
    }
  }, [handleIniciarClick, dialogs]);

  const handleSaveCotacao = async (data: any) => {
    if (!dialogs.selectedCotacao) return;
    try {
      await updateQuoteMutation.mutateAsync({ id: dialogs.selectedCotacao.id, data });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
      toast.success('Cotação atualizada!');
      dialogs.closeCotacao();
    } catch (err) { toast.error(handleApiError(err)); throw err; }
  };

  const handleConfirmIniciarDetalhes = async (opts: { produtoId?: string; dadosExtras?: { email?: string; telefone?: string; celular?: string; cpf?: string; cnpj?: string; tipoPessoa?: 'PF' | 'PJ'; razaoSocial?: string } }) => {
    if (!dialogs.detalhesRenovacao) return;
    try {
      if (opts.dadosExtras && Object.values(opts.dadosExtras).some(Boolean)) {
        await updateClientMutation.mutateAsync({ id: dialogs.detalhesRenovacao.cliente.id, ...opts.dadosExtras } as any);
      }
      await iniciarMutation.mutateAsync({ renovacaoId: dialogs.detalhesRenovacao.id, produtoId: opts.produtoId });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.planilha(filtros) });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.renovacoes() });
      toast.success('Renovação iniciada com sucesso!');
      dialogs.closeDetalhes();
    } catch (err) {
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.renovacoes() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.planilha(filtros) });
      toast.error(handleApiError(err));
      throw err;
    }
  };

  const handleAtribuirIniciarDetalhes = async (novoClienteId: string) => {
    if (!dialogs.detalhesRenovacao) return;
    try {
      try {
        await reatribuirMutation.mutateAsync({ renovacaoId: dialogs.detalhesRenovacao.id, novoClienteId });
      } catch (err) {
        // Se o cliente selecionado já é o atual, não é bloqueante — apenas prosseguir para iniciar
        const jaEhAtual = isApiError(err) && err.code === 'VALIDATION_ERROR' && err.message?.includes('já é o cliente atual');
        if (!jaEhAtual) throw err;
      }
      await iniciarMutation.mutateAsync({ renovacaoId: dialogs.detalhesRenovacao.id });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.planilha(filtros) });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.renovacoes() });
      toast.success('Renovação iniciada com sucesso!');
      dialogs.closeDetalhes();
    } catch (err) { toast.error(handleApiError(err)); throw err; }
  };

  const handleCriarNovoSeguro = async (data: any) => {
    try {
      await createQuoteMutation.mutateAsync(data);
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
      toast.success('Cotação criada com sucesso!');
    } catch (err) { toast.error(handleApiError(err)); throw err; }
  };

  const handleDelete = useCallback((row: WorkspaceRow) => {
    setLocalDeletedIds((prev) => new Set([...prev, row.id]));
    setLocalRestoredIds((prev) => { const n = new Set(prev); n.delete(row.id); return n; });

    const onError = (err: unknown) => {
      setLocalDeletedIds((prev) => { const n = new Set(prev); n.delete(row.id); return n; });
      toast.error(handleApiError(err));
    };

    if (row.rowType === 'cotacao' && row.cotacaoId) {
      archiveQuoteMutation.mutate(row.cotacaoId, {
        onSuccess: () => toast.success('Registro marcado como excluído'),
        onError,
      });
    } else if (row.rowType === 'renovacao' && row.renovacaoId) {
      archiveRenovacaoMutation.mutate(row.renovacaoId, {
        onSuccess: () => toast.success('Registro marcado como excluído'),
        onError,
      });
    }
  }, [archiveQuoteMutation, archiveRenovacaoMutation]);

  const handleRestore = useCallback((row: WorkspaceRow) => {
    setLocalRestoredIds((prev) => new Set([...prev, row.id]));
    setLocalDeletedIds((prev) => { const n = new Set(prev); n.delete(row.id); return n; });

    const onSuccess = () => {
      toast.success('Registro restaurado com sucesso');
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.all });
    };
    const onError = (err: unknown) => {
      setLocalRestoredIds((prev) => { const n = new Set(prev); n.delete(row.id); return n; });
      toast.error(handleApiError(err));
    };

    if (row.rowType === 'cotacao' && row.cotacaoId) {
      restoreQuoteMutation.mutate(row.cotacaoId, { onSuccess, onError });
    } else if (row.rowType === 'renovacao' && row.renovacaoId) {
      restoreRenovacaoMutation.mutate(row.renovacaoId, { onSuccess, onError });
    }
  }, [queryClient, restoreQuoteMutation, restoreRenovacaoMutation]);

  const handlePrint = useCallback(() => {
    const isRen = activeTab === 'renovacoes';
    const rows = isRen ? rowsRen : rowsNS;
    const tabTitle = isRen ? 'Renovações' : 'Novos Seguros';
    const totalReceita = rows.reduce((sum, r) => sum + (r.receita ?? 0), 0);
    const mesLabel = nomeMesAtual.charAt(0).toUpperCase() + nomeMesAtual.slice(1);

    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const tableRows = rows.map((row) => `<tr>
      <td>${esc(fmtDate(row.vigenciaInicio))}</td>
      <td>${esc(fmtDate(row.vigenciaFim))}</td>
      <td>${esc(row.clienteNome)}${row.clienteTipo === 'PJ' ? ' <small>(PJ)</small>' : ''}</td>
      <td>${esc(row.produto)}</td>
      <td>${esc(row.vendedorNome ?? '—')}</td>
      <td>${esc(row.seguradora ?? '—')}</td>
      <td class="num">${esc(fmt(row.plAtual))}</td>
      <td class="num">${esc(fmtPct(row.comissaoPct))}</td>
      <td class="num">${esc(fmt(row.receita))}</td>
      <td>${esc(row.situacao)}</td>
    </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Pipeline — ${esc(tabTitle)}</title>
  <style>
    @page{size:A4 landscape;margin:0}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,sans-serif;font-size:10px;color:#111;background:#fff;padding:14mm 12mm}
    p.meta{font-size:9px;color:#666;margin:2px 0 10px}
    table{width:100%;border-collapse:collapse}
    th{font-weight:600;padding:5px 6px;text-align:left;border-top:1px solid #ccc;border-bottom:1px solid #ccc;white-space:nowrap}
    td{padding:4px 6px;border-bottom:1px solid #eee;vertical-align:middle}
    td.num,th.num{text-align:right}
    tfoot td{border-top:1px solid #ccc;border-bottom:none;font-weight:600;padding-top:5px}
    small{color:#888;font-size:8.5px}
  </style>
</head>
<body>
  <p style="font-size:12px;font-weight:600;margin-bottom:2px">Pipeline de Negócios — ${esc(tabTitle)}</p>
  <p class="meta">${esc(mesLabel)} · ${rows.length} registro${rows.length !== 1 ? 's' : ''}</p>
  <table>
    <thead>
      <tr>
        <th>Vig. Início</th><th>Vig. Fim</th><th>Cliente</th><th>Produto</th><th>Vendedor</th><th>Seguradora</th>
        <th class="num">PL Atual</th><th class="num">Comissão %</th><th class="num">Receita</th><th>Situação</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="8" class="num">Total Receita</td>
        <td class="num">${esc(fmt(totalReceita))}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>
  <script>window.onload=()=>{window.print()}<\/script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=1200,height=800');
    if (!win) { toast.error('Permita pop-ups para imprimir'); return; }
    win.document.write(html);
    win.document.close();
  }, [activeTab, rowsRen, rowsNS, nomeMesAtual]);

  // ── Kanban situação change ────────────────────────────────────────────────

  const onKanbanSituacaoChange = useCallback(
    (row: WorkspaceRow, newSituacao: SituacaoLabel, rollback: () => void) => {
      if (row.rowType === 'renovacao' && row.renovacaoId) {
        // Renovação não iniciada (pendente ou vencida): abrir dialog de iniciar em vez de mover diretamente
        if (row.situacao === 'Renovar' || row.situacao === 'Vencida') {
          rollback();
          handleIniciarClick(row);
          return;
        }
        // Renovações com cotação: suportam Fechado via isFechado na cotação
        if (newSituacao === 'Fechado' && row.cotacaoId) {
          updateQuoteMutation.mutate(
            { id: row.cotacaoId, data: { isFechado: true } },
            {
              onSuccess: () => queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.planilha(filtros) }),
              onError: (err) => { rollback(); toast.error(handleApiError(err)); },
            },
          );
          return;
        }
        // Saindo de Fechado: desfaz isFechado e aplica novo status na renovação
        if (row.situacao === 'Fechado' && row.cotacaoId) {
          const kanbanStatus = situacaoToRenovacaoStatus(newSituacao);
          const etapa = situacaoToEtapa(newSituacao);
          updateQuoteMutation.mutate(
            { id: row.cotacaoId, data: { isFechado: false, ...(etapa ? { etapa } : {}) } },
            {
              onSuccess: () => {
                if (kanbanStatus) {
                  updateRenovacaoStatusMutation.mutate(
                    { id: row.renovacaoId!, status: kanbanStatus },
                    { onSuccess: () => queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.planilha(filtros) }) },
                  );
                } else {
                  queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.planilha(filtros) });
                }
              },
              onError: (err) => { rollback(); toast.error(handleApiError(err)); },
            },
          );
          return;
        }
        if (!SITUACOES_RENOVACAO_EDITAVEIS.has(row.situacao)) { rollback(); return; }
        const validTargets: SituacaoLabel[] = ['Cotação Enviada', 'Aguardando Retorno'];
        if (!validTargets.includes(newSituacao)) { rollback(); return; }
        const kanbanStatus = situacaoToRenovacaoStatus(newSituacao);
        if (!kanbanStatus) { rollback(); return; }
        updateRenovacaoStatusMutation.mutate(
          { id: row.renovacaoId, status: kanbanStatus },
          {
            onSuccess: () => queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.planilha(filtros) }),
            onError: (err) => { rollback(); toast.error(handleApiError(err)); },
          },
        );
      } else if (row.rowType === 'cotacao' && row.cotacaoId) {
        if (row._cotacao?.status !== 'EM_ELABORACAO') { rollback(); return; }
        // Bloqueia avanço se cliente sem CPF/CNPJ (prospecto sem cadastro completo)
        if (newSituacao !== 'Fechado' && newSituacao !== 'Iniciado') {
          const cliente = row._cotacao?.cliente;
          if (cliente && !cliente.cpf && !cliente.cnpj) {
            rollback();
            toast.warning('Complete os dados do cliente antes de avançar a cotação.');
            return;
          }
        }
        if (newSituacao === 'Fechado') {
          updateQuoteMutation.mutate(
            { id: row.cotacaoId, data: { isFechado: true } },
            { onError: (err) => { rollback(); toast.error(handleApiError(err)); } },
          );
          return;
        }
        if (row.situacao === 'Fechado') {
          const etapa = situacaoToEtapa(newSituacao);
          updateQuoteMutation.mutate(
            { id: row.cotacaoId, data: { isFechado: false, ...(etapa ? { etapa } : {}) } },
            { onError: (err) => { rollback(); toast.error(handleApiError(err)); } },
          );
          return;
        }
        const etapa = situacaoToEtapa(newSituacao);
        if (!etapa) { rollback(); return; }
        updateQuoteMutation.mutate(
          { id: row.cotacaoId, data: { etapa } },
          { onError: (err) => { rollback(); toast.error(handleApiError(err)); } },
        );
      } else {
        rollback();
      }
    },
    [queryClient, filtros, handleIniciarClick, updateRenovacaoStatusMutation, updateQuoteMutation],
  );

  const onKanbanMoveBlocked = useCallback(
    (row: WorkspaceRow, toColumnId: string) => {
      if (toColumnId === 'Cancelado') {
        if (row.rowType !== 'renovacao' || !row._renovacao) {
          toast.info('Apenas renovações podem ser canceladas por aqui.');
          return;
        }
        dialogs.openCancelar(row);
        return;
      }
      if (toColumnId !== 'Convertido' && toColumnId !== 'Perdido') return;
      const cotacao = row._cotacao;
      if (!cotacao) {
        toast.info('Inicie a renovação antes de converter ou marcar como perdida.');
        return;
      }
      dialogs.openCotacao(cotacao, 'view');
    },
    [dialogs],
  );

  // ── Inline edit ───────────────────────────────────────────────────────────
  const { onCellEditingStarted, onDirectUpdate, onCellValueChanged } = useWorkspaceInlineEdit({
    gridRefRen,
    gridRefNS,
    filtros,
    vendedoresOptions,
    produtosOptions,
    seguradorasOptions,
  });

  // ── Grid config ───────────────────────────────────────────────────────────

  const gridContext = useMemo<GridContext>(
    () => ({
      onIniciar: handleIniciarClick,
      onVerDetalhes: handleVerDetalhes,
      onEditarDetalhes: handleEditarDetalhes,
      onProspectar: handleProspectar,
      onDelete: handleDelete,
      onRestore: handleRestore,
      onOpenComentarios: handleOpenComentarios,
      addComentario: handleAddComentario,
      vendedores: vendedoresOptions,
      produtos: produtosOptions,
      seguradoras: seguradorasOptions,
      onDirectUpdate,
    }),
    [handleIniciarClick, handleVerDetalhes, handleEditarDetalhes, handleProspectar, handleDelete, handleRestore, handleOpenComentarios, handleAddComentario, vendedoresOptions, produtosOptions, seguradorasOptions, onDirectUpdate],
  );

  const gridContextNS = useMemo<GridContext>(
    () => ({
      onIniciar: () => {},
      onVerDetalhes: handleVerDetalhes,
      onEditarDetalhes: handleEditarDetalhes,
      onProspectar: handleProspectar,
      onDelete: handleDelete,
      onRestore: handleRestore,
      onOpenComentarios: handleOpenComentarios,
      addComentario: handleAddComentario,
      vendedores: vendedoresOptions,
      produtos: produtosOptions,
      seguradoras: seguradorasOptions,
      onDirectUpdate,
    }),
    [handleVerDetalhes, handleEditarDetalhes, handleProspectar, handleDelete, handleRestore, handleOpenComentarios, handleAddComentario, vendedoresOptions, produtosOptions, seguradorasOptions, onDirectUpdate],
  );

  const isCotacaoAtiva = (p: { data?: WorkspaceRow | null }) =>
    p.data?._cotacao?.status === 'EM_ELABORACAO';

  const isRenovacaoEditavel = (p: { data?: WorkspaceRow | null }) =>
    p.data?.rowType === 'renovacao' && !SITUACOES_BLOQUEADAS.has(p.data?.situacao ?? '' as SituacaoLabel);

  // ag-Grid não chama valueSetter para popup editors, mas sem ele dispara onCellValueChanged
  // com newValue = undefined. Retornar false suprime esse comportamento indesejado.
  const POPUP_EDITOR_VALUESET: ColDef['valueSetter'] = () => false;

  const columnDefs: ColDef<WorkspaceRow>[] = useMemo(() => {
    const cs = (colId: string, base?: Record<string, string>) => ((_p: unknown) => {
      const bg = columnColorsRef.current[colId];
      return bg ? { ...base, backgroundColor: bg } : (base ?? null);
    });
    return [
    // Cliente — nunca editável
    {
      headerName: 'Cliente',
      colId: 'col_cliente',
      valueGetter: (p) => p.data?.clienteNome ?? '',
      cellRenderer: ClienteCellRenderer,
      cellStyle: cs('col_cliente'),
      flex: 2,
      minWidth: 150,
      editable: false,
    },
    // Vigência Início — agDateStringCellEditor (YYYY-MM-DD)
    {
      field: 'vigenciaInicio',
      headerName: 'Vig. Início',
      valueFormatter: (p: ValueFormatterParams) => fmtDate(p.value),
      editable: false,
      cellStyle: cs('vigenciaInicio'),
      width: 105,
    },
    // Vigência Fim
    {
      field: 'vigenciaFim',
      headerName: 'Vig. Fim',
      valueFormatter: (p: ValueFormatterParams) => fmtDate(p.value),
      editable: false,
      cellStyle: cs('vigenciaFim'),
      width: 105,
    },
    // Produto — popup pesquisável; save vai via onDirectUpdate dentro do editor
    {
      colId: 'col_produto',
      headerName: 'Produto',
      valueGetter: (p) => p.data?.produto ?? '—',
      valueSetter: POPUP_EDITOR_VALUESET,
      editable: isCotacaoAtiva,
      cellEditor: ProdutoCellEditor,
      cellEditorPopup: true,
      cellStyle: cs('col_produto'),
      flex: 1,
      minWidth: 110,
    },
    // Vendedor — popup pesquisável; save vai via onDirectUpdate dentro do editor
    {
      colId: 'col_vendedor',
      headerName: 'Vendedor',
      valueGetter: (p) => p.data?.vendedorNome ?? '—',
      valueSetter: POPUP_EDITOR_VALUESET,
      cellRenderer: VendedorCellRenderer,
      editable: isCotacaoAtiva,
      cellEditor: VendedorCellEditor,
      cellEditorPopup: true,
      cellStyle: cs('col_vendedor'),
      flex: 1,
      minWidth: 120,
    },
    // Seguradora — popup pesquisável; save vai via onDirectUpdate dentro do editor
    {
      colId: 'col_seguradora',
      headerName: 'Seguradora',
      valueGetter: (p) => p.data?.seguradora ?? '—',
      valueSetter: POPUP_EDITOR_VALUESET,
      editable: isCotacaoAtiva,
      cellEditor: SeguradoraCellEditor,
      cellEditorPopup: true,
      cellStyle: cs('col_seguradora'),
      flex: 1,
      minWidth: 110,
    },
    // PL Atual — numérico, somente cotação
    {
      field: 'plAtual',
      headerName: 'PL Atual',
      valueFormatter: (p: ValueFormatterParams) => fmt(p.value),
      cellRenderer: PLCellRenderer,
      editable: isCotacaoAtiva,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: { min: 0, precision: 2 },
      cellStyle: cs('plAtual'),
      type: 'numericColumn',
      width: 120,
    },
    // Comissão % — numérico, cotação + renovação editável
    {
      field: 'comissaoPct',
      headerName: 'Comissão %',
      valueFormatter: (p: ValueFormatterParams) => fmtPct(p.value),
      cellRenderer: ComissaoCellRenderer,
      editable: (p) => isCotacaoAtiva(p) || isRenovacaoEditavel(p),
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: { min: 0, max: 100, precision: 2 },
      cellStyle: cs('comissaoPct'),
      type: 'numericColumn',
      width: 100,
    },
    // Receita — calculada, não editável
    {
      colId: 'col_receita',
      headerName: 'Receita',
      valueGetter: (p) => p.data?.receita ?? null,
      cellRenderer: ReceitaCellRenderer,
      editable: false,
      cellStyle: cs('col_receita'),
      type: 'numericColumn',
      width: 120,
    },
    // Situação — select dinâmico por tipo de linha
    {
      colId: 'col_situacao',
      headerName: 'Situação',
      valueGetter: (p) => p.data?.situacao ?? '',
      valueSetter: (p) => {
        if (!p.data) return false;
        p.data.situacao = p.newValue as SituacaoLabel;
        return true;
      },
      cellRenderer: SituacaoCellRenderer,
      editable: (p) => {
        if (!p.data) return false;
        if (p.data.rowType === 'renovacao') return SITUACOES_RENOVACAO_EDITAVEIS.has(p.data.situacao);
        return p.data._cotacao?.status === 'EM_ELABORACAO';
      },
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: (p: ICellEditorParams<WorkspaceRow>) => ({
        values: p.data?.rowType === 'renovacao'
          ? (p.data?.situacao === 'Fechado' ? ['Iniciado', 'Cotação Enviada', 'Aguardando Retorno'] : ['Cotação Enviada', 'Aguardando Retorno', 'Fechado'])
          : (p.data?.situacao === 'Fechado' ? ['Iniciado', 'Cotação Enviada', 'Aguardando Retorno'] : ['Iniciado', 'Cotação Enviada', 'Aguardando Retorno', 'Fechado']),
      }),
      cellStyle: cs('col_situacao'),
      width: 170,
    },
    // Comentários
    {
      colId: 'col_comentarios',
      headerName: 'Comentários',
      cellRenderer: ComentariosCellRenderer,
      valueGetter: (p) => p.data?.comentariosCount ?? 0,
      sortable: false,
      editable: false,
      width: 260,
      cellStyle: cs('col_comentarios', { padding: '0 8px' }),
    },
    // Anexos
    {
      colId: 'col_anexos',
      headerName: '',
      cellRenderer: AnexosCellRenderer,
      sortable: false,
      editable: false,
      resizable: false,
      width: 48,
      cellStyle: cs('col_anexos', { padding: '0 8px' }),
    },
    // Ações
    {
      colId: 'col_acoes',
      headerName: '',
      cellRenderer: AcoesCellRenderer,
      editable: false,
      sortable: false,
      resizable: false,
      suppressMovable: true,
      pinned: 'right' as const,
      width: 110,
      cellStyle: cs('col_acoes', { padding: '0 6px' }),
    },
    ]; }, []);

  const defaultColDef: ColDef<WorkspaceRow> = useMemo(
    () => ({ resizable: true, sortable: true }),
    [],
  );

  const getRowId = useCallback((p: GetRowIdParams<WorkspaceRow>) => p.data.id, []);

  const fs = FONT_SIZES[fontSizeIdx];

  const theme = useMemo(
    () =>
      themeQuartz.withParams({
        spacing: 6,
        rowHeight: fs.rowHeight,
        headerHeight: fs.headerHeight,
        fontSize: fs.size,
        fontFamily: 'inherit',
        borderRadius: 4,
        wrapperBorderRadius: 6,
        backgroundColor: 'var(--background)',
        foregroundColor: 'var(--foreground)',
        borderColor: 'var(--border)',
        chromeBackgroundColor: 'var(--muted)',
        headerBackgroundColor: 'var(--muted)',
        headerTextColor: 'var(--muted-foreground)',
        cellTextColor: 'var(--foreground)',
        oddRowBackgroundColor: 'color-mix(in srgb, var(--muted) 40%, var(--background))',
        rowHoverColor: 'color-mix(in srgb, var(--primary) 6%, transparent)',
        columnBorder: { style: 'solid', width: 1, color: 'var(--border)' },
        selectedRowBackgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)',
        menuBackgroundColor: 'var(--popover)',
        menuTextColor: 'var(--popover-foreground)',
        browserColorScheme,
      }),
    [fs, browserColorScheme],
  );

  const getRowStyle = useCallback((params: { data?: WorkspaceRow }) => {
    if (params.data?.isDeleted) return { opacity: '0.45' as const };
    if (params.data?.situacao === 'Perdido' || params.data?.situacao === 'Cancelado') return { opacity: '0.65' as const };
    return undefined;
  }, []);

  const gridProps = {
    columnDefs,
    defaultColDef,
    getRowId,
    rowSelection: { mode: 'singleRow' as const, enableClickSelection: false },
    animateRows: true,
    singleClickEdit: true,
    stopEditingWhenCellsLoseFocus: true,
    onCellEditingStarted,
    onCellValueChanged,
    onCellContextMenu,
    onColumnHeaderContextMenu,
    onGridReady,
    onColumnResized,
    onDragStopped,
    preventDefaultOnContextMenu: true,
    theme,
    getRowStyle,
  } as const;

  const isGridTab = activeTab === 'renovacoes' || activeTab === 'novos-seguros';

  return (
    <>
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-background">

        {/* Linha principal: título + nav + filtros + ações */}
        <div className="flex h-12 items-center gap-3 px-5">

          {/* Título */}
          <h1 className="shrink-0 text-sm font-semibold tracking-tight">Pipeline de Negócios</h1>

          {isGridTab && (
            <>
              <div className="h-4 w-px shrink-0 bg-border" />

              {/* Navegação de mês */}
              <div className="flex shrink-0 items-center">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={irParaMesAnterior}>
                  <ChevronLeft className="size-3.5" />
                </Button>
                <span className="w-36 text-center text-sm font-medium capitalize">{nomeMesAtual}</span>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={irParaProximoMes}>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>

              <div className="h-4 w-px shrink-0 bg-border" />
            </>
          )}

          {/* Filtros */}
          {isGridTab && <div className="flex items-center gap-1.5">
            <SituacaoDropdown value={situacaoFilter} onChange={setSituacaoFilter} />

            {cotacaoTags.length > 0 && (
              <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={tagFilter.length > 0 ? 'secondary' : 'outline'}
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                  >
                    <Tag className="h-3 w-3" />
                    {tagFilter.length === 0
                      ? 'Tag'
                      : tagFilter.length === 1
                        ? (cotacaoTags as any[]).find((t) => t.id === tagFilter[0])?.nome ?? 'Tag'
                        : `Tag (${tagFilter.length})`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="start">
                  {tagFilter.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTagFilter([])}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Limpar filtro
                    </button>
                  )}
                  {(cotacaoTags as any[]).map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setTagFilter(tagFilter.includes(tag.id) ? tagFilter.filter((id) => id !== tag.id) : [...tagFilter, tag.id])}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted transition-colors"
                    >
                      <span className="inline-block size-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.cor }} />
                      <span className="flex-1 text-left truncate">{tag.nome}</span>
                      {tagFilter.includes(tag.id) && <Check className="size-3 shrink-0" />}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            )}

            {vendedorFilterOptions.length > 0 && (
              <MultiSelectFilter
                label="Vendedor"
                icon={<Users className="h-3 w-3" />}
                options={vendedorFilterOptions}
                value={vendedorFilter}
                onChange={setVendedorFilter}
              />
            )}

            {produtoFilterOptions.length > 0 && (
              <MultiSelectFilter
                label="Produto"
                icon={<Package className="h-3 w-3" />}
                options={produtoFilterOptions}
                value={produtoFilter}
                onChange={setProdutoFilter}
              />
            )}

            {seguradoraFilterOptions.length > 0 && (
              <MultiSelectFilter
                label="Seguradora"
                icon={<Building2 className="h-3 w-3" />}
                options={seguradoraFilterOptions}
                value={seguradoraFilter}
                onChange={setSeguradoraFilter}
              />
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 w-7 p-0 ${showExcluidos ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setShowExcluidos((v) => !v)}
                >
                  {showExcluidos ? <EyeIcon className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showExcluidos ? 'Ocultar excluídos' : 'Mostrar excluídos'}</TooltipContent>
            </Tooltip>
          </div>}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Ações */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8" onClick={() => dialogs.openEndosso()}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Endosso
            </Button>
            <Button size="sm" className="h-8" onClick={() => dialogs.openNovoSeguro()}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Novo Seguro
            </Button>
          </div>
        </div>

        {/* Linha de tabs + controles de exibição */}
        <div className="flex items-end justify-between px-5">
          <TabsList className="h-8 rounded-none border-b-0 bg-transparent p-0 gap-0">
            <TabsTrigger
              value="renovacoes"
              className="rounded-none border-b-2 border-transparent px-4 pb-2 pt-0 text-sm data-[state=active]:!border-transparent data-[state=active]:!border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Renovações
              <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {rowsRen.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="novos-seguros"
              className="rounded-none border-b-2 border-transparent px-4 pb-2 pt-0 text-sm data-[state=active]:!border-transparent data-[state=active]:!border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Novos Seguros
              <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {rowsNS.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="rounded-none border-b-2 border-transparent px-4 pb-2 pt-0 text-sm data-[state=active]:!border-transparent data-[state=active]:!border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <History className="size-3.5 mr-1.5" />
              Logs
            </TabsTrigger>
            <TabsTrigger
              value="equipe"
              className="rounded-none border-b-2 border-transparent px-4 pb-2 pt-0 text-sm data-[state=active]:!border-transparent data-[state=active]:!border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Users className="size-3.5 mr-1.5" />
              Equipe
              {equipeData && equipeData.membros.length > 1 && (
                <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {equipeData.membros.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Controles de exibição + busca */}
          {isGridTab && <div className="flex items-center gap-2 pb-1.5">
            {/* Busca por nome */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
              <Input
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder="Buscar cliente..."
                className={cn(
                  'h-7 w-40 pl-7 text-xs transition-[width] duration-200',
                  nameFilter ? 'w-52 pr-7' : 'pr-2',
                )}
              />
              {nameFilter && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setNameFilter('')}
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </Button>
              )}
            </div>

            <div className="w-px h-4 bg-border shrink-0" />

            {/* View mode */}
            <div className="flex items-center rounded-md border bg-muted/30 p-0.5 gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant={viewMode === 'planilha' ? 'secondary' : 'ghost'} className="h-6 w-6 p-0" onClick={() => handleViewModeChange('planilha')}>
                    <Table2 className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Planilha</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant={viewMode === 'kanban' ? 'secondary' : 'ghost'} className="h-6 w-6 p-0" onClick={() => handleViewModeChange('kanban')}>
                    <LayoutGrid className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Kanban</TooltipContent>
              </Tooltip>
            </div>

            <div className="h-3.5 w-px bg-border" />

            {/* Tamanho de fonte */}
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" disabled={fontSizeIdx === 0}
                    onClick={() => setFontSizeIdx((i) => Math.max(0, i - 1) as FontSizeKey)}>
                    <AArrowDown className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Diminuir fonte</TooltipContent>
              </Tooltip>
              {FONT_SIZES.map((f, i) => (
                <Button key={f.label} size="sm" variant={fontSizeIdx === i ? 'secondary' : 'ghost'}
                  className="h-6 w-6 p-0 text-[11px] font-medium"
                  onClick={() => setFontSizeIdx(i as FontSizeKey)}>
                  {f.label}
                </Button>
              ))}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" disabled={fontSizeIdx === 2}
                    onClick={() => setFontSizeIdx((i) => Math.min(2, i + 1) as FontSizeKey)}>
                    <AArrowUp className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Aumentar fonte</TooltipContent>
              </Tooltip>
            </div>

            <div className="h-3.5 w-px bg-border" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={handlePrint}>
                  <Printer className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Imprimir</TooltipContent>
            </Tooltip>
          </div>}
        </div>
      </div>

      {/* Aba Renovações */}
      <TabsContent value="renovacoes" className="flex-1 min-h-0 mt-0 overflow-hidden">
        {viewMode === 'kanban' ? (
          <WorkspaceKanban
            rows={rowsRen}
            boardType="workspace-kanban-ren"
            onSituacaoChange={onKanbanSituacaoChange}
            onMoveBlocked={onKanbanMoveBlocked}
            onVerDetalhes={handleVerDetalhes}
          />
        ) : loadingRenovacoes ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 15 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col h-full w-full">
            {selectedRenIds.length > 0 && (
              <div className="flex items-center gap-3 border-b bg-primary/5 px-4 py-2 shrink-0">
                <span className="text-sm font-medium">{selectedRenIds.length} renovação{selectedRenIds.length !== 1 ? 'ões' : ''} selecionada{selectedRenIds.length !== 1 ? 's' : ''}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => dialogs.openTransferir()}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Transferir
                </Button>
                <button
                  type="button"
                  className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => { gridRefRen.current?.api?.deselectAll(); setSelectedRenIds([]); }}
                >
                  <X className="h-3.5 w-3.5" />
                  Limpar seleção
                </button>
              </div>
            )}
            <div className="flex-1 min-h-0 p-4">
              <AgGridReact<WorkspaceRow>
                {...gridProps}
                rowSelection={{ mode: 'multiRow' as const, enableClickSelection: false, checkboxes: true, headerCheckbox: true }}
                ref={gridRefRen}
                rowData={displayRowsRen}
                context={gridContext}
                onSelectionChanged={onSelectionChangedRen}
              />
            </div>
          </div>
        )}
      </TabsContent>

      {/* Aba Novos Seguros */}
      <TabsContent value="novos-seguros" className="flex-1 min-h-0 mt-0 overflow-auto">
        {viewMode === 'kanban' ? (
          <WorkspaceKanban
            rows={rowsNS}
            boardType="workspace-kanban-ns"
            onSituacaoChange={onKanbanSituacaoChange}
            onMoveBlocked={onKanbanMoveBlocked}
            onVerDetalhes={handleVerDetalhes}
          />
        ) : loadingCotacoes ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 15 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col h-full w-full">
            <div className="px-4 pt-4">
              <OportunidadesPendentesClienteCard />
            </div>
            <div className="flex-1 min-h-0 p-4">
              <AgGridReact<WorkspaceRow>
                {...gridProps}
                ref={gridRefNS}
                rowData={displayRowsNS}
                context={gridContextNS}
              />
            </div>
          </div>
        )}
      </TabsContent>

      {/* Aba Logs */}
      <TabsContent value="logs" className="flex-1 min-h-0 mt-0 overflow-hidden">
        <ActivityFeed />
      </TabsContent>

      {/* Aba Equipe */}
      <TabsContent value="equipe" className="flex-1 min-h-0 mt-0 overflow-auto">
        <div className="p-5 max-w-2xl">
          {equipeData ? (
            <EquipeWorkspaceView
              data={equipeData}
              onVisualizarCotacao={(c) => dialogs.openCotacao(c, 'view')}
              onEditarCotacao={(c) => dialogs.openCotacao(c, 'edit')}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="size-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Carregando dados da equipe…</p>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Lazy dialogs */}
      {dialogs.detalhesMounted && (
        <Suspense fallback={null}>
          <RenovacaoDetalhesDialog
            open={!!dialogs.detalhesRenovacao}
            renovacao={dialogs.detalhesRenovacao}
            onClose={() => dialogs.closeDetalhes()}
            onIniciar={handleConfirmIniciarDetalhes}
            onAtribuirCliente={handleAtribuirIniciarDetalhes}
          />
        </Suspense>
      )}

      {dialogs.convertidaMounted && (
        <Suspense fallback={null}>
          <RenovacaoConvertidaDialog
            open={!!dialogs.selectedRenovacaoConvertida}
            renovacao={dialogs.selectedRenovacaoConvertida}
            onClose={() => dialogs.closeConvertida()}
          />
        </Suspense>
      )}

      {dialogs.cotacaoMounted && (
        <Suspense fallback={null}>
          <CotacaoDialog
            open={!!dialogs.selectedCotacao}
            cotacao={dialogs.selectedCotacao}
            mode={dialogs.cotacaoMode}
            onClose={() => dialogs.closeCotacao()}
            onSave={handleSaveCotacao}
            onSwitchToEdit={() => dialogs.setCotacaoMode('edit')}
          />
        </Suspense>
      )}

      {dialogs.novoSeguroMounted && (
        <Suspense fallback={null}>
          <NovoSeguroDialog
            open={dialogs.novoSeguroOpen}
            onOpenChange={dialogs.setNovoSeguroOpen}
            onCriar={handleCriarNovoSeguro}
            onCriarSemCliente={() => dialogs.openProspectoRapido()}
          />
        </Suspense>
      )}

      {dialogs.prospectoRapidoMounted && (
        <Suspense fallback={null}>
          <ProspectoRapidoDialog
            open={dialogs.prospectoRapidoOpen}
            onOpenChange={dialogs.setProspectoRapidoOpen}
          />
        </Suspense>
      )}

      {dialogs.endossoMounted && (
        <Suspense fallback={null}>
          <RegistrarEndossoExternoDialog
            open={dialogs.endossoOpen}
            onOpenChange={dialogs.setEndossoOpen}
          />
        </Suspense>
      )}

      {dialogs.cancelarMounted && (
        <Suspense fallback={null}>
          <CancelarRenovacaoDialog
            open={!!dialogs.cancelarRow}
            row={dialogs.cancelarRow}
            onOpenChange={(open) => { if (!open) dialogs.closeCancelar(); }}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.planilha(filtros) })}
          />
        </Suspense>
      )}

      {dialogs.transferirMounted && (
        <Suspense fallback={null}>
          <TransferirRenovacoesDialog
            open={dialogs.transferirOpen}
            onOpenChange={dialogs.setTransferirOpen}
            renovacaoIds={selectedRenIds}
            vendedorAtualId={currentUser?.id ?? ''}
            onSuccess={() => { gridRefRen.current?.api?.deselectAll(); setSelectedRenIds([]); }}
          />
        </Suspense>
      )}

      <ReenviarCadastroDialog
        open={!!dialogs.reenviarCadastroRow}
        row={dialogs.reenviarCadastroRow}
        onClose={() => dialogs.closeReenviarCadastro()}
      />

      <Sheet open={!!dialogs.comentariosRow} onOpenChange={(open) => { if (!open) dialogs.closeComentarios(); }}>
        <SheetContent className="w-[420px] sm:w-[480px] flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 py-4 border-b shrink-0">
            <SheetTitle className="text-sm font-medium truncate">
              Comentários
              {dialogs.comentariosRow && (
                <span className="text-muted-foreground font-normal ml-1.5">
                  — {dialogs.comentariosRow.clienteNome}
                </span>
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden px-5 py-4">
            <ComentariosPanel
              comentarios={comentarios as ComentarioItem[]}
              isLoading={loadingComentarios}
              canAdd={!!dialogs.comentariosRow?.cotacaoId}
              isSending={adicionarComentario.isPending}
              onAdd={(texto, parentId) => {
                if (!dialogs.comentariosRow?.cotacaoId) return;
                adicionarComentario.mutate({ cotacaoId: dialogs.comentariosRow.cotacaoId, texto, parentId });
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

    </Tabs>

    {/* Context menu flutuante para colorir coluna */}
    {colContextMenu && (
      <>
        <div className="fixed inset-0 z-40" onClick={closeColContextMenu} onContextMenu={(e) => { e.preventDefault(); closeColContextMenu(); }} />
        <div
          className="fixed z-50 w-48 overflow-hidden rounded-md border bg-popover p-2 text-popover-foreground shadow-md"
          style={{ top: colContextMenu.y, left: colContextMenu.x }}
        >
          <p className="mb-1.5 px-1 text-[11px] font-medium text-muted-foreground">Cor da coluna</p>
          <div className="grid grid-cols-5 gap-1">
            {COL_PRESET_COLORS.map(({ label, value }) => (
              <button
                key={value}
                title={label}
                className="h-6 w-6 rounded border border-border/50 transition-transform hover:scale-110"
                style={{ backgroundColor: value }}
                onClick={() => {
                  setColor(colContextMenu.colId, value);
                  scheduleSavePrefs();
                  closeColContextMenu();
                }}
              />
            ))}
          </div>
          {columnColors[colContextMenu.colId] && (
            <button
              className="mt-2 flex w-full items-center gap-1.5 rounded px-1 py-1 text-[11px] text-muted-foreground hover:bg-accent"
              onClick={() => {
                setColor(colContextMenu.colId, null);
                scheduleSavePrefs();
                closeColContextMenu();
              }}
            >
              ✕ Remover cor
            </button>
          )}
        </div>
      </>
    )}
    </>
  );
}
