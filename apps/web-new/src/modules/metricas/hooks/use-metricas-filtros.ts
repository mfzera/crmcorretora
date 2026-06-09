import { useState, useCallback, useTransition } from 'react';
import {
  type PeriodoPreset,
  applyPreset,
} from '@/core/utils/period-presets';

const SESSION_KEY = 'metricas-page-filtros';

type Saved = {
  periodoPreset: PeriodoPreset | null;
  dataInicio: string;
  dataFim: string;
  equipeIdFiltro: string;
};

function readSession(): Partial<Saved> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Partial<Saved>) : {};
  } catch {
    return {};
  }
}

function writeSession(data: Saved) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch { /* ignorado */ }
}

export function useMetricasFiltros() {
  const [, startTransition] = useTransition();

  const saved = readSession();
  const defaultPeriod = applyPreset('mes_atual');

  const [periodoPreset, setPeriodoPreset] = useState<PeriodoPreset | null>(
    saved.periodoPreset ?? 'mes_atual',
  );
  const [dataInicio, setDataInicio] = useState<string>(
    saved.dataInicio ?? defaultPeriod.dataInicio,
  );
  const [dataFim, setDataFim] = useState<string>(
    saved.dataFim ?? defaultPeriod.dataFim,
  );
  const [equipeIdFiltro, setEquipeIdFiltroState] = useState<string>(
    saved.equipeIdFiltro ?? 'todas',
  );

  const sync = useCallback(
    (next: Saved) => {
      setPeriodoPreset(next.periodoPreset);
      setDataInicio(next.dataInicio);
      setDataFim(next.dataFim);
      setEquipeIdFiltroState(next.equipeIdFiltro);
      writeSession(next);
    },
    [],
  );

  const aplicarPeriodoPreset = useCallback(
    (preset: PeriodoPreset) => {
      const { dataInicio: ini, dataFim: fim } = applyPreset(preset);
      startTransition(() =>
        sync({ periodoPreset: preset, dataInicio: ini, dataFim: fim, equipeIdFiltro }),
      );
    },
    [equipeIdFiltro, sync],
  );

  const setPeriodo = useCallback(
    (ini: string, fim: string) => {
      startTransition(() =>
        sync({ periodoPreset: null, dataInicio: ini, dataFim: fim, equipeIdFiltro }),
      );
    },
    [equipeIdFiltro, sync],
  );

  const setEquipeIdFiltro = useCallback(
    (equipeId: string) => {
      startTransition(() =>
        sync({ periodoPreset, dataInicio, dataFim, equipeIdFiltro: equipeId }),
      );
    },
    [periodoPreset, dataInicio, dataFim, sync],
  );

  return {
    periodoPreset,
    dataInicio,
    dataFim,
    equipeIdFiltro,
    aplicarPeriodoPreset,
    setPeriodo,
    setEquipeIdFiltro,
  };
}
