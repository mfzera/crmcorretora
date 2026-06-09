import { createFileRoute } from '@tanstack/react-router';

import { Plus } from 'lucide-react';
import { useState, useTransition, lazy, Suspense } from 'react';
import { oportunidadesQueryOptions } from '@/modules/kanban/http';
import { produtosQueryOptions } from '@/modules/produtos/http';
import { vendedoresSelectQueryOptions } from '@/modules/usuarios/http';
import { seguradorasParceiraQueryOptions } from '@/modules/seguradoras-parceiras/http';
import { KanbanBoardSkeleton } from '@/modules/kanban/components/kanban-board-skeleton';

const KanbanBoard = lazy(() =>
  import('@/modules/kanban/components/kanban-board').then((m) => ({ default: m.KanbanBoard })),
);
import { Button } from '@/core/ui/button';
import { NovaOportunidadeDialog } from '@/modules/kanban/components/nova-oportunidade-dialog';
import { KPIsCards } from '@/modules/dashboard/components/kpis-cards';
import { PageGuard } from '@/modules/auth/components/page-guard';

export const Route = createFileRoute('/_app/dashboard/kanban')({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(oportunidadesQueryOptions()),
      queryClient.prefetchQuery(produtosQueryOptions({ ativo: true }, 1, 100)),
      queryClient.prefetchQuery(vendedoresSelectQueryOptions),
      queryClient.prefetchQuery(seguradorasParceiraQueryOptions({ status: 'ATIVA', limit: 100 })),
    ]),
  component: KanbanPage,
});


function KanbanPage() {
  return (
    <PageGuard permission="kanban:acessar">
      <KanbanPageContent />
    </PageGuard>
  );
}

function KanbanPageContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Kanban de Oportunidades</h1>
        <Button onClick={() => startTransition(() => setDialogOpen(true))}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Oportunidade
        </Button>
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* KPIs */}
        <KPIsCards />

        {/* Kanban Board */}
        <div className="md:h-[calc(100%-8rem)]">
          <Suspense fallback={<KanbanBoardSkeleton />}>
            <KanbanBoard />
          </Suspense>
        </div>
      </div>

      <NovaOportunidadeDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
