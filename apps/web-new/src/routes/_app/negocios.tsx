import { createFileRoute } from '@tanstack/react-router';
import { NegociosPage } from '@/modules/negocios-corretora/components/negocios-page';
import { PageGuard } from '@/modules/auth/components/page-guard';

export const Route = createFileRoute('/_app/negocios')({
  component: () => (
    <PageGuard permission="negocios_corretora:acessar">
      <NegociosPage />
    </PageGuard>
  ),
});
