
import { Badge } from '@/core/ui/badge';
import { CheckCircle2, XCircle, Clock, AlertCircle, RotateCcw } from 'lucide-react';

type StatusImportacao = 'PROCESSANDO' | 'CONCLUIDO' | 'CONCLUIDO_COM_ERROS' | 'FALHA' | 'REVERTIDO_PARCIAL';
type StatusItem = 'SUCESSO' | 'ERRO' | 'PULADO' | 'PENDENTE' | 'REVERTIDO';

const importacaoConfig: Record<StatusImportacao, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  PROCESSANDO: { label: 'Processando', variant: 'secondary' },
  CONCLUIDO: { label: 'Concluído', variant: 'success' },
  CONCLUIDO_COM_ERROS: { label: 'Com Erros', variant: 'warning' },
  FALHA: { label: 'Falhou', variant: 'destructive' },
  REVERTIDO_PARCIAL: { label: 'Revertido', variant: 'secondary' },
};

const itemConfig: Record<StatusItem, { label: string; icon: React.FC<any>; colorClass: string }> = {
  SUCESSO: { label: 'Sucesso', icon: CheckCircle2, colorClass: 'text-green-600 dark:text-green-400' },
  ERRO: { label: 'Erro', icon: XCircle, colorClass: 'text-red-600 dark:text-red-400' },
  PULADO: { label: 'Pulado', icon: AlertCircle, colorClass: 'text-yellow-600 dark:text-yellow-400' },
  PENDENTE: { label: 'Pendente', icon: Clock, colorClass: 'text-blue-600 dark:text-blue-400' },
  REVERTIDO: { label: 'Revertido', icon: RotateCcw, colorClass: 'text-gray-600 dark:text-gray-400' },
};

export function ImportacaoStatusBadge({ status }: { status: string }) {
  const config = importacaoConfig[status as StatusImportacao];
  if (!config) return <Badge variant="outline">{status}</Badge>;
  return <Badge variant={config.variant as any}>{config.label}</Badge>;
}

export function ItemStatusIcon({ status, className }: { status: string; className?: string }) {
  const config = itemConfig[status as StatusItem];
  if (!config) return null;
  const Icon = config.icon;
  return <Icon className={`h-4 w-4 flex-shrink-0 ${config.colorClass} ${className ?? ''}`} />;
}

export function ItemStatusBadge({ status }: { status: string }) {
  const config = itemConfig[status as StatusItem];
  if (!config) return <Badge variant="outline">{status}</Badge>;

  const variantMap: Record<StatusItem, string> = {
    SUCESSO: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    ERRO: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    PULADO: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    PENDENTE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    REVERTIDO: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${variantMap[status as StatusItem] ?? ''}`}>
      <config.icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
