import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Users } from 'lucide-react';
import { useEffect } from 'react';
import { useAuthStore } from '@/infra/auth/auth-store';
import { Skeleton } from '@/core/ui/skeleton';
import { DashboardContent } from '@/modules/metricas-dashboard/components/dashboard-content';
import { metricasQueryOptions, metricasEvolucaoQueryOptions } from '@/modules/metricas/http';
import { dayjs } from '@/core/utils/date-utils';

export const Route = createFileRoute('/_app/painel-equipe')({
  loader: ({ context: { queryClient } }) => {
    const defaultFiltros = {
      dataInicio: dayjs().subtract(3, 'month').format('YYYY-MM-DD'),
      dataFim: dayjs().format('YYYY-MM-DD'),
    };
    return Promise.all([
      queryClient.ensureQueryData(metricasQueryOptions(defaultFiltros)),
      queryClient.ensureQueryData(
        metricasEvolucaoQueryOptions({ ...defaultFiltros, granularidade: 'semana' }),
      ),
    ]).catch(() => {});
  },
  component: DashboardEquipePage,
});

function DashboardEquipePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !user.isGestor && !user.isLiderEquipe && !user.isAdmin) {
      navigate({ to: '/sem-permissao', search: { permissao: undefined as unknown as string } });
    }
  }, [user, navigate]);

  if (!user) {
    return (
      <div className="space-y-8 p-4 md:p-8">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!user.isGestor && !user.isLiderEquipe && !user.isAdmin) return null;

  return (
    <DashboardContent
      roleContext="gestor"
      title="Métricas da Equipe"
      subtitle="Performance da sua equipe"
      icon={<Users className="size-4" />}
    />
  );
}
