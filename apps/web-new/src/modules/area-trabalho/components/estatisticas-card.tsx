
import { FileText, FileCheck, RefreshCw } from 'lucide-react';
import { StatCard } from '@/core/components/shared';

interface EstatisticasCardProps {
  estatisticas: {
    totalRenovacoesPendentes: number;
    totalCotacoesAtivas: number;
    totalPropostasAtivas: number;
    metaMensal: number;
    vendidoMes: number;
  };
}

export function EstatisticasCard({ estatisticas }: EstatisticasCardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard
        title="Renovações Pendentes"
        value={estatisticas.totalRenovacoesPendentes}
        icon={RefreshCw}
        color="orange"
      />
      <StatCard
        title="Cotações Ativas"
        value={estatisticas.totalCotacoesAtivas}
        icon={FileText}
        color="blue"
      />
      <StatCard
        title="Propostas Ativas"
        value={estatisticas.totalPropostasAtivas}
        icon={FileCheck}
        color="purple"
      />
    </div>
  );
}
