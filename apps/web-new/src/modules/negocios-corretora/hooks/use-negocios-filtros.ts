import { useState, useEffect, useRef, useTransition } from 'react';
import { defaultFiltros } from '../http';

const SESSION_KEY = 'negocios-page-filtros';

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useNegociosFiltros() {
  const saved = loadSession();
  const [, startTransition] = useTransition();

  const [searchInput, setSearchInputRaw] = useState<string>(saved?.search ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState<string>(saved?.search ?? '');
  const [negocioCorretora, setNegocioCorretoraRaw] = useState<'todos' | 'sim' | 'nao'>(saved?.negocioCorretora ?? 'todos');
  const [status, setStatusRaw] = useState<string>(saved?.status ?? 'todos');
  const [produto, setProdutoRaw] = useState<string>(saved?.produto ?? 'todos');
  const [vendedorId, setVendedorIdRaw] = useState<string>(saved?.vendedorId ?? 'todos');
  const [dataInicio, setDataInicioRaw] = useState<string>(saved?.dataInicio ?? '');
  const [dataFim, setDataFimRaw] = useState<string>(saved?.dataFim ?? '');
  const [sortBy, setSortByRaw] = useState<string>(saved?.sortBy ?? defaultFiltros.sortBy);
  const [sortDir, setSortDirRaw] = useState<'asc' | 'desc'>(saved?.sortDir ?? 'desc');
  const [page, setPageRaw] = useState<number>(1);
  const [pageSize, setPageSizeRaw] = useState<number>(20);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setSearchInput(value: string) {
    setSearchInputRaw(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      startTransition(() => {
        setDebouncedSearch(value);
        setPageRaw(1);
      });
    }, 300);
  }

  function setNegocioCorretora(value: 'todos' | 'sim' | 'nao') {
    startTransition(() => {
      setNegocioCorretoraRaw(value);
      setPageRaw(1);
    });
  }

  function setStatus(value: string) {
    startTransition(() => {
      setStatusRaw(value);
      setPageRaw(1);
    });
  }

  function setProduto(value: string) {
    startTransition(() => {
      setProdutoRaw(value);
      setPageRaw(1);
    });
  }

  function setVendedorId(value: string) {
    startTransition(() => {
      setVendedorIdRaw(value);
      setPageRaw(1);
    });
  }

  function setDataInicio(value: string) {
    startTransition(() => {
      setDataInicioRaw(value);
      setPageRaw(1);
    });
  }

  function setDataFim(value: string) {
    startTransition(() => {
      setDataFimRaw(value);
      setPageRaw(1);
    });
  }

  function toggleSort(column: string) {
    startTransition(() => {
      if (sortBy === column) {
        setSortDirRaw((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortByRaw(column);
        setSortDirRaw('desc');
      }
      setPageRaw(1);
    });
  }

  function setPage(value: number) {
    setPageRaw(value);
  }

  function setPageSize(value: number) {
    setPageSizeRaw(value);
    setPageRaw(1);
  }

  const temFiltrosAtivos =
    !!debouncedSearch ||
    negocioCorretora !== 'todos' ||
    status !== 'todos' ||
    produto !== 'todos' ||
    vendedorId !== 'todos' ||
    !!dataInicio ||
    !!dataFim;

  const activeFilterCount = [
    !!debouncedSearch,
    negocioCorretora !== 'todos',
    status !== 'todos',
    produto !== 'todos',
    vendedorId !== 'todos',
    !!dataInicio || !!dataFim,
  ].filter(Boolean).length;

  function resetFiltros() {
    startTransition(() => {
      setSearchInputRaw('');
      setDebouncedSearch('');
      setNegocioCorretoraRaw('todos');
      setStatusRaw('todos');
      setProdutoRaw('todos');
      setVendedorIdRaw('todos');
      setDataInicioRaw('');
      setDataFimRaw('');
      setPageRaw(1);
    });
  }

  const filtros = {
    search: debouncedSearch,
    negocioCorretora,
    status,
    produto,
    vendedorId,
    dataInicio,
    dataFim,
    sortBy,
    sortDir,
  };

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(filtros));
    } catch {}
  }, [JSON.stringify(filtros)]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return {
    searchInput,
    setSearchInput,
    negocioCorretora,
    setNegocioCorretora,
    status,
    setStatus,
    produto,
    setProduto,
    vendedorId,
    setVendedorId,
    dataInicio,
    setDataInicio,
    dataFim,
    setDataFim,
    sortBy,
    sortDir,
    toggleSort,
    page,
    setPage,
    pageSize,
    setPageSize,
    temFiltrosAtivos,
    activeFilterCount,
    resetFiltros,
    filtros,
  };
}
