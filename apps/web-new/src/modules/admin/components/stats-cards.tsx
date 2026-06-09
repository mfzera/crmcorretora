import { Building2, Users, HardDrive, Archive, UserCheck, FileText } from 'lucide-react';
import type { GlobalStats } from '@/infra/http/admin-api';
import { KpiCard } from '@/core/ui/kpi-card';

interface StatsCardsProps {
  stats: GlobalStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const cards = [
    { label: 'Corretoras', value: stats.totalTenants.toLocaleString('pt-BR'), icon: <Building2 className="h-3.5 w-3.5" />, hint: 'Tenants ativos' },
    { label: 'Usuários', value: stats.totalUsers.toLocaleString('pt-BR'), icon: <Users className="h-3.5 w-3.5" />, hint: 'Contas registradas' },
    { label: 'Clientes', value: stats.totalClientes.toLocaleString('pt-BR'), icon: <UserCheck className="h-3.5 w-3.5" />, hint: 'Base total' },
    { label: 'Arquivos', value: stats.totalArquivos.toLocaleString('pt-BR'), icon: <FileText className="h-3.5 w-3.5" />, hint: 'Documentos armazenados' },
    { label: 'Armazenamento', value: formatBytes(stats.totalStorage), icon: <HardDrive className="h-3.5 w-3.5" />, hint: 'Uso consolidado' },
    { label: 'Backups', value: stats.activeBackups.toLocaleString('pt-BR'), icon: <Archive className="h-3.5 w-3.5" />, hint: 'Backups ativos' },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <KpiCard key={card.label} variant="tile" label={card.label} value={card.value} icon={card.icon} hint={card.hint} />
      ))}
    </div>
  );
}
