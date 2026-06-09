
import { Calendar } from '@/core/ui/calendar';
import { Checkbox } from '@/core/ui/checkbox';
import { CATEGORIAS, TIPO_TO_PARAM } from './constants';
import type { EventoTipo, CalendarioResumo } from './types';
import { cn } from '@/core/utils';

interface CalendarioSidebarProps {
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
  activeCategories: EventoTipo[];
  onToggleCategory: (tipo: EventoTipo) => void;
  resumo?: CalendarioResumo;
}

export function CalendarioSidebar({
  selectedDate,
  onSelectDate,
  currentMonth,
  onMonthChange,
  activeCategories,
  onToggleCategory,
  resumo,
}: CalendarioSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Mini Calendar */}
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={onSelectDate}
        month={currentMonth}
        onMonthChange={onMonthChange}
        className="rounded-lg border bg-card"
      />

      {/* Category Filters */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground px-1">
          Categorias
        </h4>
        <div className="space-y-2">
          {CATEGORIAS.map((cat) => (
            <label
              key={cat.id}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer transition-colors"
            >
              <Checkbox
                checked={activeCategories.includes(cat.id)}
                onCheckedChange={() => onToggleCategory(cat.id)}
              />
              <span className={cn('size-2.5 rounded-full', cat.dotClass)} />
              <span className="text-sm">{cat.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Month Summary */}
      {resumo && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground px-1">
            Resumo do mês
          </h4>
          <div className="space-y-1.5 px-2">
            {CATEGORIAS.map((cat) => {
              const count =
                resumo[TIPO_TO_PARAM[cat.id] as keyof CalendarioResumo];
              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('size-2 rounded-full', cat.dotClass)} />
                    <span className="text-muted-foreground">{cat.label}</span>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
