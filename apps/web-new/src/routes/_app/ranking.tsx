import { createFileRoute } from '@tanstack/react-router';
import { ModuloGuard } from '@/core/components/shared/modulo-guard';
import { PageGuard } from '@/modules/auth/components/page-guard';
import { RankingDisplay } from '@/modules/ranking/components/RankingDisplay';

export const Route = createFileRoute('/_app/ranking')({
  component: () => <ModuloGuard modulo="gamificacao"><RankingPage /></ModuloGuard>,
});

function RankingPage() {
  return (
    <PageGuard permission="workspace:acessar">
      <RankingDisplay />
    </PageGuard>
  );
}
