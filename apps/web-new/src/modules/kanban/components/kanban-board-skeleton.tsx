import { cn } from '@/core/utils';
import { KANBAN_COLUMNS } from '@/types/kanban';

const CARD_HEIGHTS = [
  ['h-[88px]', 'h-[112px]', 'h-[96px]'],
  ['h-[104px]', 'h-[88px]', 'h-[120px]', 'h-[96px]'],
  ['h-[96px]', 'h-[112px]', 'h-[88px]'],
  ['h-[88px]', 'h-[96px]'],
  ['h-[112px]', 'h-[88px]', 'h-[104px]'],
];

export function KanbanBoardSkeleton() {
  return (
    <div className="flex flex-col gap-3 h-full animate-pulse">
      {/* Filtros skeleton */}
      <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 pb-1">
        <div className="h-8 w-[200px] rounded-md bg-muted" />
        <div className="h-8 w-[140px] rounded-md bg-muted" />
        <div className="w-px h-5 bg-border hidden sm:block" />
        <div className="h-8 w-[160px] rounded-md bg-muted" />
        <div className="h-8 w-[140px] rounded-md bg-muted" />
      </div>

      {/* Colunas skeleton */}
      <div className="flex md:grid md:h-full md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 overflow-x-hidden pb-4 px-3 sm:px-4">
        {KANBAN_COLUMNS.map((col, colIdx) => (
          <div
            key={col.id}
            className="shrink-0 w-[85vw] max-w-[320px] md:w-auto md:max-w-none md:min-w-0 flex flex-col rounded-xl border bg-muted/40 md:h-full overflow-hidden"
          >
            {/* Header da coluna */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-card">
              <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', col.color)} />
              <span className="flex-1 font-semibold text-sm text-foreground">{col.title}</span>
              <div className="h-5 w-6 rounded-full bg-muted" />
            </div>

            {/* Cards skeleton */}
            <div className="space-y-2 p-3 md:flex-1 md:overflow-y-auto">
              {CARD_HEIGHTS[colIdx].map((height, cardIdx) => (
                <div
                  key={cardIdx}
                  className={cn('w-full rounded-lg bg-card border border-l-4 border-l-muted-foreground/20', height)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
