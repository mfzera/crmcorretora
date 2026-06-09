export const CLOSED_STATUSES = new Set(['ganha', 'perdida', 'arquivada']);

export function calcDelta(atual: number, comparacao: number | string | null | undefined): number | null {
  const base = Number(comparacao);
  if (!isFinite(base) || base === 0) return null;
  return ((atual - base) / Math.abs(base)) * 100;
}
