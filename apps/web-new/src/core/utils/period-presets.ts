import { dayjs } from './date-utils';

export type PeriodoPreset = 'mes_atual' | '3_meses' | '6_meses' | '12_meses';

export const PERIODO_LABELS: Record<PeriodoPreset, string> = {
  mes_atual: 'Mês atual',
  '3_meses': '3 meses',
  '6_meses': '6 meses',
  '12_meses': '12 meses',
};

export const PERIODO_PRESETS: PeriodoPreset[] = ['mes_atual', '3_meses', '6_meses', '12_meses'];

export function applyPreset(preset: PeriodoPreset): { dataInicio: string; dataFim: string } {
  const hoje = dayjs();
  switch (preset) {
    case 'mes_atual':
      return {
        dataInicio: hoje.startOf('month').format('YYYY-MM-DD'),
        dataFim: hoje.endOf('month').format('YYYY-MM-DD'),
      };
    case '3_meses':
      return {
        dataInicio: hoje.subtract(2, 'month').startOf('month').format('YYYY-MM-DD'),
        dataFim: hoje.endOf('month').format('YYYY-MM-DD'),
      };
    case '6_meses':
      return {
        dataInicio: hoje.subtract(5, 'month').startOf('month').format('YYYY-MM-DD'),
        dataFim: hoje.endOf('month').format('YYYY-MM-DD'),
      };
    case '12_meses':
      return {
        dataInicio: hoje.subtract(11, 'month').startOf('month').format('YYYY-MM-DD'),
        dataFim: hoje.endOf('month').format('YYYY-MM-DD'),
      };
  }
}
