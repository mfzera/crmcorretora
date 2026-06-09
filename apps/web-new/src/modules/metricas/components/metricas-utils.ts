// Shared types and helpers for /metricas

// Re-exports canônicos — use sempre estas importações em vez das locais
export { formatCurrency, formatCurrencyCompact } from '@/core/utils/format-currency';
export { type PeriodoPreset, PERIODO_LABELS, PERIODO_PRESETS, applyPreset } from '@/core/utils/period-presets';

export type VendedorDetalhe = {
  vendedorId: string;
  vendedorNome: string;
  equipeNome?: string;
};

export type TopVendedor = {
  vendedorId: string;
  vendedorNome: string;
  totalPremio: number;
  totalComissao: number;
  count: number;
  avatarUrl?: string | null;
  equipeNome?: string | null;
  renovacoesTotal?: number;
  renovacoesFechadas?: number;
};

export function getIniciais(nome: string) {
  const partes = nome.split(' ');
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    NAO_TRABALHADO: 'Não iniciado',
    EM_PROSPECCAO: 'Prospectando',
    EM_NEGOCIACAO: 'Negociando',
    AGUARDANDO_CLIENTE: 'Aguardando',
    EM_ELABORACAO: 'Em Elaboração',
    ENVIADA_CLIENTE: 'Enviada',
    APROVADA_CLIENTE: 'Aprovada',
    RECUSADA_CLIENTE: 'Recusada',
    EXPIRADA: 'Expirada',
    CONVERTIDA: 'Convertida',
    ATIVO: 'Ativo',
    CANCELADO: 'Cancelado',
    PERDIDO: 'Perdido',
    RENOVADO: 'Renovado',
    VENCIDO: 'Vencido',
  };
  return labels[status] || status.replace(/_/g, ' ');
}

export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (['ATIVO', 'RENOVADO', 'CONVERTIDA', 'APROVADA_CLIENTE'].includes(status)) return 'default';
  if (['CANCELADO', 'PERDIDO', 'VENCIDO', 'EXPIRADA', 'RECUSADA_CLIENTE'].includes(status)) return 'destructive';
  if (['EM_NEGOCIACAO', 'EM_ELABORACAO', 'ENVIADA_CLIENTE', 'EM_PROSPECCAO'].includes(status)) return 'outline';
  return 'secondary';
}
