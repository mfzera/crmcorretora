export interface StatusConfig {
  label: string;
  color: string;       // classe Tailwind para dot/badge
  textColor: string;   // classe Tailwind para texto colorido
}

export const STATUS_DOCUMENTO_CONFIG: Record<string, StatusConfig> = {
  ATIVO:                { label: 'Ativo',               color: 'bg-green-500',   textColor: 'text-green-600 dark:text-green-400' },
  EM_NEGOCIACAO:        { label: 'Em Negociação',        color: 'bg-blue-500',    textColor: 'text-blue-600 dark:text-blue-400' },
  AGUARDANDO_CLIENTE:   { label: 'Aguard. Cliente',      color: 'bg-amber-500',   textColor: 'text-amber-600 dark:text-amber-400' },
  AGUARDANDO_APROVACAO: { label: 'Aguard. Aprovação',    color: 'bg-orange-500',  textColor: 'text-orange-600 dark:text-orange-400' },
  VENDA_CONFIRMADA:     { label: 'Venda Confirmada',     color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
  AGUARDANDO_CADASTRO:  { label: 'Aguard. Cadastro',     color: 'bg-yellow-500',  textColor: 'text-yellow-600 dark:text-yellow-400' },
  RENOVACAO:            { label: 'Renovação',            color: 'bg-cyan-500',    textColor: 'text-cyan-600 dark:text-cyan-400' },
  RENOVADO:             { label: 'Renovado',             color: 'bg-teal-500',    textColor: 'text-teal-600 dark:text-teal-400' },
  ARQUIVADO:            { label: 'Arquivado',            color: 'bg-slate-400',   textColor: 'text-slate-500 dark:text-slate-400' },
  CANCELADO:            { label: 'Cancelado',            color: 'bg-red-500',     textColor: 'text-red-600 dark:text-red-400' },
  PERDIDO:              { label: 'Perdido',              color: 'bg-rose-500',    textColor: 'text-rose-600 dark:text-rose-400' },
  EXPIRADO:             { label: 'Expirado',             color: 'bg-gray-400',    textColor: 'text-gray-500 dark:text-gray-400' },
  VENCIDO:              { label: 'Vencido',              color: 'bg-red-400',     textColor: 'text-red-500 dark:text-red-400' },
};

export function getStatusLabel(status: string): string {
  return STATUS_DOCUMENTO_CONFIG[status]?.label ?? formatRawStatus(status);
}

export function getStatusColor(status: string): string {
  return STATUS_DOCUMENTO_CONFIG[status]?.color ?? 'bg-gray-400';
}

export function getStatusTextColor(status: string): string {
  return STATUS_DOCUMENTO_CONFIG[status]?.textColor ?? 'text-gray-500';
}

export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'ATIVO':
    case 'RENOVADO':
    case 'VENDA_CONFIRMADA':
      return 'default';
    case 'AGUARDANDO_CADASTRO':
    case 'AGUARDANDO_APROVACAO':
    case 'AGUARDANDO_CLIENTE':
    case 'EM_ELABORACAO':
      return 'secondary';
    case 'CANCELADO':
    case 'EXPIRADO':
    case 'VENCIDO':
    case 'PERDIDO':
    case 'PERDIDA':
      return 'destructive';
    case 'EM_NEGOCIACAO':
    case 'ARQUIVADO':
    case 'EXPIRADA':
    case 'CONVERTIDA':
      return 'outline';
    default:
      return 'secondary';
  }
}

function formatRawStatus(status: string): string {
  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
