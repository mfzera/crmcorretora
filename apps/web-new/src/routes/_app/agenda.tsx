import { createFileRoute } from '@tanstack/react-router';

import { PageGuard } from '@/modules/auth/components/page-guard';
import { CalendarioPage } from '@/modules/calendario/components/calendario-page';

export const Route = createFileRoute('/_app/agenda')({
  component: AgendaPage,
});


function AgendaPage() {
  return (
    <PageGuard permission="dashboard:visualizar">
      <CalendarioPage />
    </PageGuard>
  );
}
