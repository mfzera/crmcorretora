import { describe, it, expect } from 'vitest';
import { parsePercentualPlanilha } from '@ecotech/shared/utils';

describe('parsePercentualPlanilha', () => {
  it('retorna null para vazio, nulo e inválido', () => {
    expect(parsePercentualPlanilha(null)).toBeNull();
    expect(parsePercentualPlanilha(undefined)).toBeNull();
    expect(parsePercentualPlanilha('')).toBeNull();
    expect(parsePercentualPlanilha('abc')).toBeNull();
    expect(parsePercentualPlanilha(-1)).toBeNull();
  });

  it('multiplica por 100 valores fracionários (célula Excel formatada como %)', () => {
    expect(parsePercentualPlanilha(0.24)).toBe('24.00');
    expect(parsePercentualPlanilha('0,24')).toBe('24.00');
    expect(parsePercentualPlanilha('0.5')).toBe('50.00');
    expect(parsePercentualPlanilha(0.01)).toBe('1.00');
  });

  it('mantém valores ≥ 1 como percentual bruto', () => {
    expect(parsePercentualPlanilha(24)).toBe('24.00');
    expect(parsePercentualPlanilha('24')).toBe('24.00');
    expect(parsePercentualPlanilha('24%')).toBe('24.00');
    expect(parsePercentualPlanilha(1)).toBe('1.00');
    expect(parsePercentualPlanilha(55.5)).toBe('55.50');
  });

  it('remove símbolos e normaliza vírgula decimal', () => {
    expect(parsePercentualPlanilha('R$ 24,50')).toBe('24.50');
    expect(parsePercentualPlanilha('24,50%')).toBe('24.50');
  });

  it('retorna 0.00 para zero literal', () => {
    expect(parsePercentualPlanilha(0)).toBe('0.00');
    expect(parsePercentualPlanilha('0')).toBe('0.00');
  });
});
