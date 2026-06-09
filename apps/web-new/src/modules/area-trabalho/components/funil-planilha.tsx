import { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ValueFormatterParams,
  type CellValueChangedEvent,
  type CellEditingStartedEvent,
  type GetRowIdParams,
  type ICellRendererParams,
  type ICellEditorParams,
  type ColorSchemeValue,
} from 'ag-grid-community';
import { toast } from 'sonner';
import { Eye, CheckCircle2, XCircle, AArrowDown, AArrowUp, MessageSquare, Check } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { cn } from '@/core/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/core/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/core/ui/sheet';
import type { Cotacao, EtapaCotacao } from '@/types/area-trabalho';
import type { Produto } from '@/types/produto';
import type { SeguradoraParceira } from '@/types/seguradora-parceira';
import type { MembroEquipe, ComentarioItem } from '../http';
import {
  useUpdateCotacao,
  useComentariosCotacao,
  useAdicionarComentarioCotacao,
} from '../http';
import { useProdutos } from '@/modules/produtos/http';
import { useSeguradorasParceiras } from '@/modules/seguradoras-parceiras/http';
import { ComentariosPanel } from './comentarios-panel';

ModuleRegistry.registerModules([AllCommunityModule]);

function useBrowserColorScheme(): ColorSchemeValue {
  const [scheme, setScheme] = useState<ColorSchemeValue>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setScheme(
        document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      );
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => obs.disconnect();
  }, []);
  return scheme;
}

const ETAPAS: {
  value: EtapaCotacao;
  label: string;
  dotClass: string;
  badgeClass: string;
}[] = [
  {
    value: 'LEVANTANDO_DADOS',
    label: 'Levantando Dados',
    dotClass: 'bg-slate-400 dark:bg-slate-500',
    badgeClass: 'bg-slate-100 dark:bg-slate-500/25 text-slate-600 dark:text-slate-300',
  },
  {
    value: 'PROPOSTA_ENVIADA',
    label: 'Proposta Enviada',
    dotClass: 'bg-blue-500',
    badgeClass: 'bg-blue-50 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300',
  },
  {
    value: 'EM_NEGOCIACAO',
    label: 'Em Negociação',
    dotClass: 'bg-amber-500',
    badgeClass: 'bg-amber-50 dark:bg-amber-500/25 text-amber-700 dark:text-amber-400',
  },
  {
    value: 'AGUARDANDO_RETORNO',
    label: 'Aguardando Retorno',
    dotClass: 'bg-violet-500',
    badgeClass: 'bg-violet-50 dark:bg-violet-500/25 text-violet-700 dark:text-violet-400',
  },
];

const FONT_SIZES = [
  { label: 'P', size: 11, rowHeight: 32, headerHeight: 32 },
  { label: 'M', size: 13, rowHeight: 38, headerHeight: 38 },
  { label: 'G', size: 15, rowHeight: 44, headerHeight: 42 },
] as const;

type FontSizeKey = 0 | 1 | 2;

interface GridContext {
  onVisualizar: (c: Cotacao) => void;
  onConfirmarVenda: (c: Cotacao) => void;
  onMarcarPerdida: (c: Cotacao) => void;
  onOpenComentarios: (c: Cotacao) => void;
  produtos: Produto[];
  seguradoras: SeguradoraParceira[];
}

// ─── Cell renderers ───────────────────────────────────────────────────────────

function SituacaoCellRenderer({ value, data }: ICellRendererParams<Cotacao>) {
  if (data?.status === 'PERDIDA') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300">
        <span className="inline-block size-2 rounded-full shrink-0 bg-red-500" />
        Perdida
      </span>
    );
  }
  if (data?.status === 'CONVERTIDA') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
        <span className="inline-block size-2 rounded-full shrink-0 bg-amber-500" />
        Aguardando Cadastro
      </span>
    );
  }
  const etapa = ETAPAS.find((e) => e.label === value);
  if (!etapa) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${etapa.badgeClass}`}>
      <span className={`inline-block size-2 rounded-full shrink-0 ${etapa.dotClass}`} />
      {etapa.label}
    </span>
  );
}

function ClienteCellRenderer({ data }: ICellRendererParams<Cotacao>) {
  if (!data) return null;
  const nome = getNomeCliente(data);
  const tags = data.tags ?? [];
  return (
    <div className="flex items-center gap-2 h-full min-w-0">
      <span className="truncate font-medium">{nome}</span>
      {tags.length > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          {tags.map((tag) => (
            <Tooltip key={tag.id}>
              <TooltipTrigger asChild>
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full cursor-default"
                  style={{ backgroundColor: tag.cor }}
                />
              </TooltipTrigger>
              <TooltipContent>{tag.nome}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
}

function ComentariosCellRenderer({
  data,
  context,
}: ICellRendererParams<Cotacao> & { context: GridContext }) {
  if (!data) return null;
  const count = data.comentariosCount ?? 0;
  const ultimo = data.ultimoComentario;

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); context.onOpenComentarios(data); }}
      className="flex items-center gap-1.5 h-full w-full min-w-0 text-muted-foreground hover:text-foreground transition-colors text-left"
    >
      <MessageSquare className="size-3.5 shrink-0" />
      {count > 0 && (
        <span className="tabular-nums font-medium text-xs shrink-0">{count}</span>
      )}
      {ultimo && (
        <span className="truncate text-xs min-w-0">
          <span className="font-medium">{ultimo.autorNome.split(' ')[0]}:</span>
          {' '}{ultimo.texto}
        </span>
      )}
    </button>
  );
}

function AcoesCellRenderer({
  data,
  context,
}: ICellRendererParams<Cotacao> & { context: GridContext }) {
  if (!data) return null;
  const { onVisualizar, onConfirmarVenda, onMarcarPerdida } = context;
  const ativa = data.status === 'EM_ELABORACAO';

  return (
    <div className="flex items-center gap-1 h-full">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onVisualizar(data); }}
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Eye className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Ver detalhes</TooltipContent>
      </Tooltip>

      {ativa && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onConfirmarVenda(data); }}
                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
              >
                <CheckCircle2 className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Confirmar venda</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onMarcarPerdida(data); }}
                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                <XCircle className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Marcar como perdida</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}

function ReceitaCell({ value }: ICellRendererParams) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">
      {formatCurrency(value)}
    </span>
  );
}

function PLCell({ value }: ICellRendererParams) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
      {formatCurrency(value)}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNomeCliente(cotacao: Cotacao): string {
  const cl = cotacao.cliente;
  return (cl?.tipoPessoa === 'PF'
    ? cl?.nome
    : cl?.nomeFantasia || cl?.razaoSocial) ?? '';
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

// ─── Custom popup cell editors ────────────────────────────────────────────────

interface CellEditorHandle {
  getValue: () => string;
  isPopup: () => boolean;
}

const ProdutoCellEditor = forwardRef<CellEditorHandle, ICellEditorParams<Cotacao>>(
  ({ data, context, api }, ref) => {
    const selectedIdRef = useRef<string>((data as any).produtoId || '');
    const [search, setSearch] = useState('');

    useImperativeHandle(ref, () => ({
      getValue: () => selectedIdRef.current,
      isPopup: () => true,
    }));

    const ctx = context as GridContext;
    const filtered = ctx.produtos.filter((p) =>
      p.nomeProduto.toLowerCase().includes(search.toLowerCase()),
    );

    return (
      <div className="bg-popover border border-border rounded-md shadow-lg w-64 overflow-hidden z-50">
        <div className="p-1.5 border-b">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="h-7 text-xs"
            autoFocus
          />
        </div>
        <div className="max-h-52 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Nenhum produto encontrado</p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                className={cn(
                  'w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2',
                  selectedIdRef.current === p.id && 'bg-muted',
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectedIdRef.current = p.id;
                  api.stopEditing();
                }}
              >
                <span className="flex-1">{p.nomeProduto}</span>
                {selectedIdRef.current === p.id && (
                  <Check className="size-3 shrink-0 text-primary" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    );
  },
);
ProdutoCellEditor.displayName = 'ProdutoCellEditor';

const SeguradoraCellEditor = forwardRef<CellEditorHandle, ICellEditorParams<Cotacao>>(
  ({ data, context, api }, ref) => {
    const selectedIdRef = useRef<string>((data as any).seguradoraParceiraId || '');
    const [search, setSearch] = useState('');

    useImperativeHandle(ref, () => ({
      getValue: () => selectedIdRef.current,
      isPopup: () => true,
    }));

    const ctx = context as GridContext;
    const filtered = ctx.seguradoras.filter((s) => {
      const nome = s.nomeFantasia || s.razaoSocial;
      return nome.toLowerCase().includes(search.toLowerCase());
    });

    return (
      <div className="bg-popover border border-border rounded-md shadow-lg w-64 overflow-hidden z-50">
        <div className="p-1.5 border-b">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar seguradora..."
            className="h-7 text-xs"
            autoFocus
          />
        </div>
        <div className="max-h-52 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Nenhuma seguradora encontrada</p>
          ) : (
            filtered.map((s) => {
              const nome = s.nomeFantasia || s.razaoSocial;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2',
                    selectedIdRef.current === s.id && 'bg-muted',
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectedIdRef.current = s.id;
                    api.stopEditing();
                  }}
                >
                  <span className="flex-1">{nome}</span>
                  {selectedIdRef.current === s.id && (
                    <Check className="size-3 shrink-0 text-primary" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  },
);
SeguradoraCellEditor.displayName = 'SeguradoraCellEditor';

// ─── Main component ───────────────────────────────────────────────────────────

interface FunilPlanilhaProps {
  cotacoes: Cotacao[];
  membros: MembroEquipe[];
  onVisualizar: (c: Cotacao) => void;
  onEditar: (c: Cotacao) => void;
  onMarcarPerdida: (c: Cotacao) => void;
  onConfirmarVenda: (c: Cotacao) => void;
}

export function FunilPlanilha({
  cotacoes,
  membros,
  onVisualizar,
  onMarcarPerdida,
  onConfirmarVenda,
}: FunilPlanilhaProps) {
  const gridRef = useRef<AgGridReact<Cotacao>>(null);
  const updateCotacao = useUpdateCotacao();
  const [fontSizeIdx, setFontSizeIdx] = useState<FontSizeKey>(1);
  const browserColorScheme = useBrowserColorScheme();
  const [cotacaoComentarios, setCotacaoComentarios] = useState<Cotacao | null>(null);

  const { data: comentarios = [], isLoading: loadingComentarios } =
    useComentariosCotacao(cotacaoComentarios?.id ?? null);
  const adicionarComentario = useAdicionarComentarioCotacao();

  const { data: produtosData } = useProdutos({ ativo: true }, 1, 100);
  const produtos = produtosData?.data || [];

  const { data: seguradorasData } = useSeguradorasParceiras({ status: 'ATIVA', limit: 100 });
  const seguradoras = seguradorasData?.data || [];

  const vendedorNomes = useMemo(() => membros.map((m) => m.nome), [membros]);

  const onOpenComentarios = useCallback((c: Cotacao) => setCotacaoComentarios(c), []);

  const gridContext = useMemo<GridContext>(
    () => ({ onVisualizar, onConfirmarVenda, onMarcarPerdida, onOpenComentarios, produtos, seguradoras }),
    [onVisualizar, onConfirmarVenda, onMarcarPerdida, onOpenComentarios, produtos, seguradoras],
  );

  const columnDefs: ColDef<Cotacao>[] = useMemo(
    () => [
      {
        headerName: 'Cliente',
        valueGetter: (p) => getNomeCliente(p.data!),
        cellRenderer: ClienteCellRenderer,
        flex: 2,
        minWidth: 140,
        editable: false,
      },
      {
        field: 'vigenciaInicio',
        headerName: 'Vig. Início',
        valueFormatter: (p: ValueFormatterParams) => formatDate(p.value),
        editable: (p) => p.data?.status === 'EM_ELABORACAO',
        cellEditor: 'agDateStringCellEditor',
        width: 105,
      },
      {
        field: 'vigenciaFim',
        headerName: 'Vig. Fim',
        valueFormatter: (p: ValueFormatterParams) => formatDate(p.value),
        editable: (p) => p.data?.status === 'EM_ELABORACAO',
        cellEditor: 'agDateStringCellEditor',
        width: 105,
      },
      {
        field: 'produtoId',
        headerName: 'Produto',
        valueFormatter: (p: ValueFormatterParams<Cotacao>) =>
          p.data?.produto?.nomeProduto ?? (p.value ? '...' : '—'),
        valueSetter: (p) => {
          const ctx = p.context as GridContext;
          const produto = ctx.produtos.find((pr) => pr.id === p.newValue);
          if (!produto) return false;
          (p.data as any).produtoId = produto.id;
          (p.data as any).produto = {
            id: produto.id,
            nomeProduto: produto.nomeProduto,
            tipoSeguro: produto.tipoSeguro,
            ativo: produto.ativo,
          };
          return true;
        },
        editable: (p) => p.data?.status === 'EM_ELABORACAO',
        cellEditor: ProdutoCellEditor,
        cellEditorPopup: true,
        flex: 1,
        minWidth: 100,
      },
      {
        headerName: 'Vendedor',
        valueGetter: (p) => p.data?.vendedor?.nome ?? '—',
        valueSetter: (p) => {
          const membro = membros.find((m) => m.nome === p.newValue);
          if (!membro) return false;
          p.data.vendedorId = membro.id;
          if (p.data.vendedor) p.data.vendedor = { ...p.data.vendedor, nome: membro.nome };
          return true;
        },
        editable: (p) => (p.data?.status === 'EM_ELABORACAO') && membros.length > 1,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: vendedorNomes },
        flex: 1,
        minWidth: 100,
      },
      {
        field: 'seguradoraParceiraId',
        headerName: 'Seguradora',
        valueFormatter: (p: ValueFormatterParams<Cotacao>) => {
          const s = p.data?.seguradoraParceira;
          return s?.nomeFantasia || s?.razaoSocial || (p.value ? '...' : '—');
        },
        valueSetter: (p) => {
          const ctx = p.context as GridContext;
          const seg = ctx.seguradoras.find((s) => s.id === p.newValue);
          if (!seg) return false;
          (p.data as any).seguradoraParceiraId = seg.id;
          (p.data as any).seguradoraParceira = {
            nomeFantasia: seg.nomeFantasia,
            razaoSocial: seg.razaoSocial,
          };
          return true;
        },
        editable: (p) => p.data?.status === 'EM_ELABORACAO',
        cellEditor: SeguradoraCellEditor,
        cellEditorPopup: true,
        flex: 1,
        minWidth: 100,
      },
      {
        field: 'premioLiquido',
        headerName: 'PL Atual',
        valueFormatter: (p: ValueFormatterParams) => formatCurrency(p.value),
        cellRenderer: PLCell,
        editable: (p) => p.data?.status === 'EM_ELABORACAO',
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: { min: 0, precision: 2 },
        type: 'numericColumn',
        width: 130,
      },
      {
        field: 'percentualComissao',
        headerName: 'Com%',
        valueFormatter: (p: ValueFormatterParams) =>
          p.value != null ? `${Number(p.value).toFixed(2)}%` : '—',
        editable: (p) => p.data?.status === 'EM_ELABORACAO',
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: { min: 0, max: 100, precision: 2 },
        type: 'numericColumn',
        width: 85,
      },
      {
        headerName: 'Receita',
        valueGetter: (p) => {
          const pl = p.data?.premioLiquido;
          const com = p.data?.percentualComissao;
          if (pl == null || com == null) return null;
          return (pl * com) / 100;
        },
        cellRenderer: ReceitaCell,
        editable: false,
        type: 'numericColumn',
        width: 120,
      },
      {
        field: 'etapa',
        headerName: 'Situação',
        valueGetter: (p) =>
          ETAPAS.find((e) => e.value === p.data?.etapa)?.label ?? '—',
        valueSetter: (p) => {
          const etapa = ETAPAS.find((e) => e.label === p.newValue);
          if (!etapa) return false;
          p.data.etapa = etapa.value;
          return true;
        },
        cellRenderer: SituacaoCellRenderer,
        editable: (p) => p.data?.status === 'EM_ELABORACAO',
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ETAPAS.map((e) => e.label) },
        width: 175,
      },
      {
        headerName: 'Comentários',
        cellRenderer: ComentariosCellRenderer,
        editable: false,
        sortable: false,
        flex: 1,
        minWidth: 140,
        cellStyle: { padding: '0 8px' },
      },
      {
        headerName: '',
        cellRenderer: AcoesCellRenderer,
        editable: false,
        sortable: false,
        resizable: false,
        suppressMovable: true,
        pinned: 'right',
        width: 90,
        cellStyle: { padding: '0 6px' },
      },
    ],
    [membros, vendedorNomes],
  );

  const defaultColDef: ColDef = useMemo(
    () => ({ resizable: true, sortable: true }),
    [],
  );

  const getRowId = useCallback(
    (params: GetRowIdParams<Cotacao>) => params.data.id,
    [],
  );

  const pendingPatch = useRef<Record<string, unknown>>({});
  const pendingCotacaoId = useRef<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rollbackData = useRef<{ cotacaoId: string; snapshot: Cotacao } | null>(null);

  const onCellEditingStarted = useCallback((event: CellEditingStartedEvent<Cotacao>) => {
    const { data } = event;
    if (!data) return;
    if (!rollbackData.current || rollbackData.current.cotacaoId !== data.id) {
      rollbackData.current = { cotacaoId: data.id, snapshot: { ...data } };
    }
  }, []);

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<Cotacao>) => {
      const { data, colDef } = event;
      const field = colDef.field as string | undefined;

      if (field === 'premioLiquido') pendingPatch.current.premioLiquido = data.premioLiquido;
      else if (field === 'percentualComissao') pendingPatch.current.percentualComissao = data.percentualComissao;
      else if (field === 'vigenciaInicio') pendingPatch.current.vigenciaInicio = data.vigenciaInicio;
      else if (field === 'vigenciaFim') pendingPatch.current.vigenciaFim = data.vigenciaFim;
      else if (field === 'etapa') pendingPatch.current.etapa = data.etapa;
      else if (field === 'produtoId') pendingPatch.current.produtoId = (data as any).produtoId;
      else if (field === 'seguradoraParceiraId') pendingPatch.current.seguradoraParceiraId = (data as any).seguradoraParceiraId;
      else if (colDef.headerName === 'Vendedor') pendingPatch.current.vendedorId = data.vendedorId;
      else return;

      pendingCotacaoId.current = data.id;

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        if (pendingCotacaoId.current && Object.keys(pendingPatch.current).length) {
          const cotacaoId = pendingCotacaoId.current;
          const patch = { ...pendingPatch.current };
          const snapshot = rollbackData.current?.cotacaoId === cotacaoId
            ? rollbackData.current.snapshot
            : null;

          pendingPatch.current = {};
          rollbackData.current = null;

          updateCotacao.mutate({ cotacaoId, data: patch }, {
            onError: () => {
              if (snapshot) {
                const node = gridRef.current?.api.getRowNode(cotacaoId);
                if (node) {
                  Object.assign(node.data!, snapshot);
                  gridRef.current?.api.refreshCells({ rowNodes: [node], force: true });
                }
              }
              toast.error('Falha ao salvar alteração');
            },
          });
        }
      }, 600);
    },
    [updateCotacao],
  );

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

  return (
    <div className="flex flex-col gap-2">
      {/* Font size control */}
      <div className="flex items-center justify-end gap-1">
        <span className="text-xs text-muted-foreground mr-1">Fonte</span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-7 p-0"
          disabled={fontSizeIdx === 0}
          onClick={() => setFontSizeIdx((i) => Math.max(0, i - 1) as FontSizeKey)}
        >
          <AArrowDown className="size-3.5" />
        </Button>
        {FONT_SIZES.map((f, i) => (
          <Button
            key={f.label}
            size="sm"
            variant={fontSizeIdx === i ? 'secondary' : 'ghost'}
            className="h-7 w-7 p-0 text-xs"
            onClick={() => setFontSizeIdx(i as FontSizeKey)}
          >
            {f.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-7 p-0"
          disabled={fontSizeIdx === 2}
          onClick={() => setFontSizeIdx((i) => Math.min(2, i + 1) as FontSizeKey)}
        >
          <AArrowUp className="size-3.5" />
        </Button>
      </div>

      <AgGridReact<Cotacao>
        ref={gridRef}
        theme={theme}
        rowData={cotacoes}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        context={gridContext}
        getRowId={getRowId}
        onCellEditingStarted={onCellEditingStarted}
        onCellValueChanged={onCellValueChanged}
        suppressRowClickSelection
        animateRows
        domLayout="autoHeight"
        getRowStyle={(params) => {
          if (params.data?.status === 'PERDIDA') {
            return { opacity: '0.75' };
          }
          if (params.data?.status === 'CONVERTIDA') {
            return { opacity: '0.85' };
          }
          return undefined;
        }}
      />

      {/* Comentários Sheet */}
      <Sheet
        open={!!cotacaoComentarios}
        onOpenChange={(open) => { if (!open) setCotacaoComentarios(null); }}
      >
        <SheetContent className="w-[420px] sm:w-[480px] flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 py-4 border-b shrink-0">
            <SheetTitle className="text-sm font-medium truncate">
              Comentários
              {cotacaoComentarios && (
                <span className="text-muted-foreground font-normal ml-1.5">
                  — {
                    cotacaoComentarios.cliente?.tipoPessoa === 'PF'
                      ? cotacaoComentarios.cliente?.nome
                      : cotacaoComentarios.cliente?.nomeFantasia || cotacaoComentarios.cliente?.razaoSocial
                  }
                </span>
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden px-5 py-4">
            <ComentariosPanel
              comentarios={comentarios as ComentarioItem[]}
              isLoading={loadingComentarios}
              canAdd
              isSending={adicionarComentario.isPending}
              onAdd={(texto, parentId) => {
                if (!cotacaoComentarios) return;
                adicionarComentario.mutate({
                  cotacaoId: cotacaoComentarios.id,
                  texto,
                  parentId,
                });
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
