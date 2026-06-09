
import * as React from 'react';
import { dayjs } from '@/core/utils/date-utils';
import { cn } from '@/core/utils';
import { CATEGORIAS } from './constants';
import type { CalendarioEvento, EventoTipo } from './types';

interface CalendarioGridProps {
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  currentMonth: Date;
  eventos: Record<string, CalendarioEvento[]> | undefined;
  activeCategories: EventoTipo[];
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function CalendarioGrid({
  selectedDate,
  onSelectDate,
  currentMonth,
  eventos,
  activeCategories,
}: CalendarioGridProps) {
  const monthDayjs = dayjs(currentMonth);
  const monthStart = monthDayjs.startOf('month');
  const daysInMonth = monthDayjs.daysInMonth();
  const days = Array.from({ length: daysInMonth }, (_, i) => monthStart.add(i, 'day').toDate());
  const startDayOfWeek = monthStart.day(); // 0 = Sunday

  return (
    <div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for offset */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square rounded-xl" />
        ))}

        {/* Actual days */}
        {days.map((day) => {
          const dj = dayjs(day);
          const dateStr = dj.format('YYYY-MM-DD');
          const dayEvents = (eventos?.[dateStr] || []).filter((e) =>
            activeCategories.includes(e.tipo),
          );
          const typesPresent = new Set(dayEvents.map((e) => e.tipo));
          const isSelected = selectedDate && dj.isSame(dayjs(selectedDate), 'day');
          const today = dj.isToday();

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(day)}
              className={cn(
                'bg-muted/50 aspect-square rounded-xl p-2 flex flex-col items-start justify-start gap-1 transition-colors cursor-pointer hover:bg-muted',
                isSelected && 'ring-2 ring-primary bg-muted',
                today && !isSelected && 'ring-1 ring-primary/50',
              )}
            >
              <span
                className={cn(
                  'text-xs font-medium',
                  today && 'text-primary',
                  isSelected && 'text-primary font-bold',
                )}
              >
                {dj.date()}
              </span>

              {/* Event dots */}
              {typesPresent.size > 0 && (
                <div className="flex items-center gap-0.5 mt-auto">
                  {CATEGORIAS.filter(
                    (cat) =>
                      typesPresent.has(cat.id) &&
                      activeCategories.includes(cat.id),
                  ).map((cat) => (
                    <span
                      key={cat.id}
                      className={cn('size-1.5 rounded-full', cat.dotClass)}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
