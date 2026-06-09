import { Badge } from '@/core/ui/badge';
import { cn } from '@/core/utils';

type StatusColor = 'green' | 'red' | 'yellow' | 'blue' | 'orange' | 'purple' | 'cyan' | 'gray';

const STATUS_MAP: Record<string, { label: string; color: StatusColor }> = {
  // generic
  ativo: { label: 'Ativo', color: 'green' },
  inativo: { label: 'Inativo', color: 'gray' },
  nao_ativo: { label: 'Não Ativo', color: 'gray' },
  pendente: { label: 'Pendente', color: 'yellow' },
  cancelado: { label: 'Cancelado', color: 'red' },
  aprovado: { label: 'Aprovado', color: 'green' },
  reprovado: { label: 'Reprovado', color: 'red' },
  // endosso types
  INCLUSAO_COBERTURA: { label: 'Inclusão Cobertura', color: 'green' },
  EXCLUSAO_COBERTURA: { label: 'Exclusão Cobertura', color: 'red' },
  ALTERACAO_VALOR: { label: 'Alteração Valor', color: 'blue' },
  INCLUSAO_ITEM: { label: 'Inclusão Item', color: 'green' },
  EXCLUSAO_ITEM: { label: 'Exclusão Item', color: 'red' },
  ALTERACAO_DADOS: { label: 'Alteração Dados', color: 'yellow' },
  ALTERACAO_VIGENCIA: { label: 'Alteração Vigência', color: 'purple' },
  TRANSFERENCIA_SEGURADO: { label: 'Transferência', color: 'orange' },
  SUBSTITUICAO_VEICULO: { label: 'Substituição Veículo', color: 'cyan' },
  CANCELAMENTO: { label: 'Cancelamento', color: 'red' },
  OUTROS: { label: 'Outros', color: 'gray' },
  // cotacoes
  em_cotacao: { label: 'Em Cotação', color: 'blue' },
  proposta_enviada: { label: 'Proposta Enviada', color: 'purple' },
  ganho: { label: 'Ganho', color: 'green' },
  perdido: { label: 'Perdido', color: 'red' },
  expirado: { label: 'Expirado', color: 'gray' },
  // kanban stages
  lead: { label: 'Lead', color: 'gray' },
  contato: { label: 'Contato', color: 'blue' },
  diagnostico: { label: 'Diagnóstico', color: 'purple' },
  proposta: { label: 'Proposta', color: 'yellow' },
  negociacao: { label: 'Negociação', color: 'orange' },
  fechado: { label: 'Fechado', color: 'green' },
  perdida: { label: 'Perdida', color: 'red' },
};

const COLOR_CLASSES: Record<StatusColor, string> = {
  green: 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
  red: 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
  yellow: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  blue: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  orange: 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  purple: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  cyan: 'bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  gray: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  color?: StatusColor;
  className?: string;
}

export function StatusBadge({ status, label, color, className }: StatusBadgeProps) {
  const mapped = STATUS_MAP[status];
  const resolvedLabel = label ?? mapped?.label ?? status;
  const resolvedColor = color ?? mapped?.color ?? 'gray';

  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium', COLOR_CLASSES[resolvedColor], className)}
    >
      {resolvedLabel}
    </Badge>
  );
}

export { STATUS_MAP, COLOR_CLASSES, type StatusColor };
