export function formatCurrency(value: number | string): string {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatCurrencyCompact(value: number | string): string {
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

// R$ 124.582 — sem decimais para valores ≥ 1.000, com decimais para menores
export function formatCurrencyBR(value: number | string): string {
  const n = Number(value);
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  });
}

// R$ 124k / R$ 1.2M — para espaços compactos (chips, subtítulos)
export function formatCurrencyShort(value: number | string): string {
  const n = Number(value);
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (n >= 1_000) return `R$ ${Math.round(n / 1_000)}k`;
  return formatCurrencyBR(n);
}
