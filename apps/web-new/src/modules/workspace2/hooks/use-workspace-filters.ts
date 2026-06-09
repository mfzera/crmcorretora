import { useCallback, useEffect, useRef, useState } from 'react';
import type { SituacaoLabel } from '../types';
import { useWorkspace2Prefs, useSaveWorkspace2Prefs } from '../http';

export function useWorkspaceFilters(columnColorsRef: React.RefObject<Record<string, string | null>>) {
  const [situacaoFilter, setSituacaoFilter] = useState<SituacaoLabel[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [vendedorFilter, setVendedorFilter] = useState<string[]>([]);
  const [produtoFilter, setProdutoFilter] = useState<string[]>([]);
  const [seguradoraFilter, setSeguradoraFilter] = useState<string[]>([]);
  const [showExcluidos, setShowExcluidos] = useState(true);
  const [nameFilter, setNameFilter] = useState('');

  const { data: savedPrefs } = useWorkspace2Prefs();
  const savePrefs = useSaveWorkspace2Prefs();

  const prefsLoaded = useRef(false);
  const saveDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carrega filtros do servidor na primeira vez que os dados chegam
  useEffect(() => {
    if (!savedPrefs || prefsLoaded.current) return;
    prefsLoaded.current = true;
    const f = savedPrefs.filterState;
    if (!f) return;
    if (f.situacao?.length) setSituacaoFilter(f.situacao as SituacaoLabel[]);
    if (f.tags?.length) setTagFilter(f.tags);
    if (f.vendedores?.length) setVendedorFilter(f.vendedores);
    if (f.produtos?.length) setProdutoFilter(f.produtos);
    if (f.seguradoras?.length) setSeguradoraFilter(f.seguradoras);
    if (f.showExcluidos !== undefined) setShowExcluidos(f.showExcluidos);
  }, [savedPrefs]);

  const scheduleSave = useCallback(
    (patch: {
      situacao?: SituacaoLabel[];
      tags?: string[];
      vendedores?: string[];
      produtos?: string[];
      seguradoras?: string[];
      showExcluidos?: boolean;
    }) => {
      if (saveDebounceTimer.current) clearTimeout(saveDebounceTimer.current);
      saveDebounceTimer.current = setTimeout(() => {
        if (!savedPrefs) return;
        savePrefs.mutate({
          columnState: savedPrefs.columnState,
          columnColors: columnColorsRef.current,
          filterState: {
            situacao: patch.situacao ?? situacaoFilter as string[],
            tags: patch.tags ?? tagFilter,
            vendedores: patch.vendedores ?? vendedorFilter,
            produtos: patch.produtos ?? produtoFilter,
            seguradoras: patch.seguradoras ?? seguradoraFilter,
            showExcluidos: patch.showExcluidos ?? showExcluidos,
          },
        });
      }, 800);
    },
    [savedPrefs, savePrefs, columnColorsRef, situacaoFilter, tagFilter, vendedorFilter, produtoFilter, seguradoraFilter, showExcluidos],
  );

  const handleSituacaoFilter = useCallback((v: SituacaoLabel[]) => {
    setSituacaoFilter(v);
    scheduleSave({ situacao: v });
  }, [scheduleSave]);

  const handleTagFilter = useCallback((v: string[]) => {
    setTagFilter(v);
    scheduleSave({ tags: v });
  }, [scheduleSave]);

  const handleVendedorFilter = useCallback((v: string[]) => {
    setVendedorFilter(v);
    scheduleSave({ vendedores: v });
  }, [scheduleSave]);

  const handleProdutoFilter = useCallback((v: string[]) => {
    setProdutoFilter(v);
    scheduleSave({ produtos: v });
  }, [scheduleSave]);

  const handleSeguradoraFilter = useCallback((v: string[]) => {
    setSeguradoraFilter(v);
    scheduleSave({ seguradoras: v });
  }, [scheduleSave]);

  const handleShowExcluidos = useCallback((v: boolean) => {
    setShowExcluidos(v);
    scheduleSave({ showExcluidos: v });
  }, [scheduleSave]);

  return {
    situacaoFilter,
    setSituacaoFilter: handleSituacaoFilter,
    tagFilter,
    setTagFilter: handleTagFilter,
    tagPopoverOpen,
    setTagPopoverOpen,
    vendedorFilter,
    setVendedorFilter: handleVendedorFilter,
    produtoFilter,
    setProdutoFilter: handleProdutoFilter,
    seguradoraFilter,
    setSeguradoraFilter: handleSeguradoraFilter,
    showExcluidos,
    setShowExcluidos: handleShowExcluidos,
    nameFilter,
    setNameFilter,
  };
}
