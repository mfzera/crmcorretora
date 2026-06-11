import { forwardRef, memo, useCallback, useMemo } from 'react';
import { AgGridReact, type AgGridReactProps } from 'ag-grid-react';
import {
  themeQuartz,
  ModuleRegistry,
  AllCommunityModule,
  type ColDef,
  type ColorSchemeValue,
  type ValueFormatterParams,
  type GetRowIdParams,
  type ICellEditorParams,
} from 'ag-grid-community';
import {
  ClienteCellRenderer,
  VendedorCellRenderer,
  SituacaoCellRenderer,
  ComentariosCellRenderer,
  PLCellRenderer,
  ComissaoCellRenderer,
  ReceitaCellRenderer,
  AcoesCellRenderer,
} from './cell-renderers';
import { AnexosCellRenderer } from './anexos-cell-renderer';
import { ProdutoCellEditor, VendedorCellEditor, SeguradoraCellEditor } from './cell-editors';
import { fmt, fmtDate, fmtPct, SITUACOES_RENOVACAO_EDITAVEIS, SITUACOES_BLOQUEADAS } from '../helpers';
import type { GridContext, SituacaoLabel, WorkspaceRow } from '../types';

// ag-Grid é a maior dependência da rota (~1,1 MB). Registrar o módulo aqui — no escopo
// deste componente, que é carregado via React.lazy — mantém o `vendor-aggrid` fora do
// chunk inicial da rota /workspace2: o header/tabs/filtros pintam (FCP) sem esperar o ag-grid.
ModuleRegistry.registerModules([AllCommunityModule]);

type GP = AgGridReactProps<WorkspaceRow>;
type FontSize = { size: number; rowHeight: number; headerHeight: number };

const DEFAULT_ROW_SELECTION = { mode: 'singleRow' as const, enableClickSelection: false };

// ag-Grid não chama valueSetter para popup editors, mas sem ele dispara onCellValueChanged
// com newValue = undefined. Retornar false suprime esse comportamento indesejado.
const POPUP_EDITOR_VALUESET: ColDef['valueSetter'] = () => false;

const isCotacaoAtiva = (p: { data?: WorkspaceRow | null }) =>
  p.data?._cotacao?.status === 'EM_ELABORACAO';

const isRenovacaoEditavel = (p: { data?: WorkspaceRow | null }) =>
  p.data?.rowType === 'renovacao' && !SITUACOES_BLOQUEADAS.has(p.data?.situacao ?? ('' as SituacaoLabel));

export interface WorkspaceGridProps {
  rowData: WorkspaceRow[];
  context: GridContext;
  columnColorsRef: React.RefObject<Record<string, string | null>>;
  fontSize: FontSize;
  browserColorScheme: ColorSchemeValue;
  rowSelection?: GP['rowSelection'];
  onSelectionChanged?: GP['onSelectionChanged'];
  onCellEditingStarted: GP['onCellEditingStarted'];
  onCellValueChanged: GP['onCellValueChanged'];
  onCellContextMenu: GP['onCellContextMenu'];
  onColumnHeaderContextMenu: GP['onColumnHeaderContextMenu'];
  onGridReady: GP['onGridReady'];
  onColumnResized: GP['onColumnResized'];
  onDragStopped: GP['onDragStopped'];
}

// memo: com props estáveis (rowData/context/handlers memoizados, fontSize/colorScheme/ref
// estáveis), abrir um dialog no WorkspaceScreen não re-renderiza a subárvore da grid —
// é o que corta o INP dos cliques que abrem dialogs (botão "Iniciar", célula de cliente).
export const WorkspaceGrid = memo(forwardRef<AgGridReact<WorkspaceRow>, WorkspaceGridProps>(
  function WorkspaceGrid(
    {
      rowData,
      context,
      columnColorsRef,
      fontSize,
      browserColorScheme,
      rowSelection,
      onSelectionChanged,
      onCellEditingStarted,
      onCellValueChanged,
      onCellContextMenu,
      onColumnHeaderContextMenu,
      onGridReady,
      onColumnResized,
      onDragStopped,
    },
    ref,
  ) {
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
      ];
    }, [columnColorsRef]);

    const defaultColDef: ColDef<WorkspaceRow> = useMemo(
      () => ({ resizable: true, sortable: true }),
      [],
    );

    const getRowId = useCallback((p: GetRowIdParams<WorkspaceRow>) => p.data.id, []);

    const theme = useMemo(
      () =>
        themeQuartz.withParams({
          spacing: 6,
          rowHeight: fontSize.rowHeight,
          headerHeight: fontSize.headerHeight,
          fontSize: fontSize.size,
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
      [fontSize, browserColorScheme],
    );

    const getRowStyle = useCallback((params: { data?: WorkspaceRow }) => {
      if (params.data?.isDeleted) return { opacity: '0.45' as const };
      if (params.data?.situacao === 'Perdido' || params.data?.situacao === 'Cancelado') return { opacity: '0.65' as const };
      return undefined;
    }, []);

    return (
      <AgGridReact<WorkspaceRow>
        ref={ref}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        getRowId={getRowId}
        rowData={rowData}
        context={context}
        rowSelection={rowSelection ?? DEFAULT_ROW_SELECTION}
        animateRows
        singleClickEdit
        stopEditingWhenCellsLoseFocus
        onCellEditingStarted={onCellEditingStarted}
        onCellValueChanged={onCellValueChanged}
        onCellContextMenu={onCellContextMenu}
        onColumnHeaderContextMenu={onColumnHeaderContextMenu}
        onGridReady={onGridReady}
        onColumnResized={onColumnResized}
        onDragStopped={onDragStopped}
        onSelectionChanged={onSelectionChanged}
        preventDefaultOnContextMenu
        theme={theme}
        getRowStyle={getRowStyle}
      />
    );
  },
));
