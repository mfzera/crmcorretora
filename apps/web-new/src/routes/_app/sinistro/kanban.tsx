import { createFileRoute } from '@tanstack/react-router';
import { ModuloGuard } from '@/core/components/shared/modulo-guard';
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/core/ui/skeleton';

const SinistroKanbanBoard = lazy(() =>
  import('@/modules/sinistros/components/sinistro-kanban-board').then((m) => ({ default: m.SinistroKanbanBoard })),
);

export const Route = createFileRoute('/_app/sinistro/kanban')({
  component: () => <ModuloGuard modulo="sinistros"><SinistroKanbanPage /></ModuloGuard>,
});


function SinistroKanbanPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
        <h1 className="text-lg sm:text-xl font-semibold">Sinistros — Kanban</h1>
      </div>
      <Suspense fallback={<Skeleton className="h-full w-full rounded" />}>
        <SinistroKanbanBoard />
      </Suspense>
    </div>
  );
}
