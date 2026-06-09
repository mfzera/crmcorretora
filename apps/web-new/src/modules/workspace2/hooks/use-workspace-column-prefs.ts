import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgGridReact } from 'ag-grid-react';
import type { ColumnHeaderContextMenuEvent } from 'ag-grid-community';
import { useWorkspace2Prefs, useSaveWorkspace2Prefs } from '../http';
import type { WorkspaceRow } from '../types';

interface GridRefs {
  ren: React.RefObject<AgGridReact<any> | null>;
  ns: React.RefObject<AgGridReact<any> | null>;
}

export function useWorkspaceColumnPrefs(gridRefs: GridRefs, activeTab: string) {
  const { ren: gridRefRen, ns: gridRefNS } = gridRefs;

  const [columnColors, setColumnColors] = useState<Record<string, string | null>>({});
  const [colContextMenu, setColContextMenu] = useState<{ x: number; y: number; colId: string } | null>(null);

  const columnColorsRef = useRef<Record<string, string | null>>({});
  const saveDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedPrefsRef = useRef<{ columnState: unknown[]; columnColors: Record<string, string | null> } | null>(null);
  const prefsLoaded = useRef(false);
  const prefsApplied = useRef(false);
  const activeTabRef = useRef(activeTab);

  const { data: savedPrefs } = useWorkspace2Prefs();
  const savePrefs = useSaveWorkspace2Prefs();

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const closeColContextMenu = useCallback(() => setColContextMenu(null), []);

  const openColMenu = useCallback((e: Event, colId: string) => {
    e.preventDefault();
    setColContextMenu({
      x: (e as MouseEvent).clientX,
      y: (e as MouseEvent).clientY,
      colId,
    });
  }, []);

  const onCellContextMenu = useCallback((event: { event?: Event | null; column?: { getColId(): string } | null }) => {
    if (!event.event || !event.column) return;
    openColMenu(event.event, event.column.getColId());
  }, [openColMenu]);

  const onColumnHeaderContextMenu = useCallback((event: ColumnHeaderContextMenuEvent<WorkspaceRow>) => {
    const e = event as any;
    if (!e.event || !e.column) return;
    openColMenu(e.event, e.column.getColId());
  }, [openColMenu]);

  const setColor = useCallback((colId: string, color: string | null) => {
    setColumnColors((prev) => {
      const next = { ...prev, [colId]: color };
      columnColorsRef.current = next;
      gridRefRen.current?.api?.refreshCells({ force: true });
      gridRefNS.current?.api?.refreshCells({ force: true });
      return next;
    });
  }, [gridRefRen, gridRefNS]);

  const scheduleSavePrefs = useCallback(() => {
    if (saveDebounceTimer.current) clearTimeout(saveDebounceTimer.current);
    saveDebounceTimer.current = setTimeout(() => {
      const isNovosSeguro = activeTabRef.current === 'novos-seguros';
      const gridApi = isNovosSeguro
        ? (gridRefNS.current?.api ?? gridRefRen.current?.api)
        : (gridRefRen.current?.api ?? gridRefNS.current?.api);
      if (!gridApi) return;
      const columnState = gridApi.getColumnState();
      savePrefs.mutate({ columnState, columnColors: columnColorsRef.current, filterState: savedPrefs?.filterState ?? {} });
    }, 1500);
  }, [gridRefRen, gridRefNS, savePrefs, savedPrefs]);

  const applyLoadedPrefs = useCallback(() => {
    const prefs = loadedPrefsRef.current;
    if (!prefs) return;
    if (prefs.columnState.length > 0) {
      for (const ref of [gridRefRen, gridRefNS]) {
        if (ref.current?.api) {
          ref.current.api.applyColumnState({ state: prefs.columnState as any, applyOrder: true });
        }
      }
    }
    if (!prefsApplied.current && Object.keys(prefs.columnColors).length > 0) {
      columnColorsRef.current = prefs.columnColors;
      setColumnColors(prefs.columnColors);
      prefsApplied.current = true;
    }
  }, [gridRefRen, gridRefNS]);

  // Aplica prefs apenas uma vez quando chegam do servidor (primeira carga)
  useEffect(() => {
    if (!savedPrefs || prefsLoaded.current) return;
    prefsLoaded.current = true;
    loadedPrefsRef.current = savedPrefs;
    applyLoadedPrefs();
  }, [savedPrefs, applyLoadedPrefs]);

  // Inject CSS for column header colors. Separated into two effects:
  // one for the initial setup/cleanup (runs once), one for content updates.
  useEffect(() => {
    return () => {
      document.getElementById('workspace2-col-header-colors')?.remove();
    };
  }, []);

  useEffect(() => {
    const styleId = 'workspace2-col-header-colors';
    let el = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = styleId;
      document.head.appendChild(el);
    }
    const rules = Object.entries(columnColors)
      .filter(([, c]) => c)
      .map(([id, c]) => `.ag-header-cell[col-id="${id}"] { background-color: ${c} !important; }`)
      .join('\n');
    el.textContent = rules;
  }, [columnColors]);

  const onGridReady = useCallback(() => {
    applyLoadedPrefs();
  }, [applyLoadedPrefs]);

  const onColumnResized = useCallback((event: { finished?: boolean }) => {
    if (!event.finished) return;
    scheduleSavePrefs();
  }, [scheduleSavePrefs]);

  const onDragStopped = useCallback(() => {
    scheduleSavePrefs();
  }, [scheduleSavePrefs]);

  return {
    columnColors,
    columnColorsRef,
    colContextMenu,
    closeColContextMenu,
    onCellContextMenu,
    onColumnHeaderContextMenu,
    setColor,
    onGridReady,
    onColumnResized,
    onDragStopped,
    scheduleSavePrefs,
  };
}
