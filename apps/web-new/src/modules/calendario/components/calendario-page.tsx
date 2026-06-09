
import { useState } from 'react';
import { dayjs } from '@/core/utils/date-utils';
import { CalendarDays, Plus, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/core/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/core/ui/sheet';
import { useCalendario } from '../http';
import { CalendarioSidebar } from './calendario-sidebar';
import { CalendarioGrid } from './calendario-grid';
import { CalendarioDayDetail } from './calendario-day-detail';
import { NovoEventoDialog } from './novo-evento-dialog';
import { TIPO_TO_PARAM } from './constants';
import type { EventoTipo } from './types';

export function CalendarioPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [activeCategories, setActiveCategories] = useState<EventoTipo[]>([
    'tarefa',
    'renovacao',
    'documento',
    'oportunidade',
    'google',
  ]);
  const [novoEventoOpen, setNovoEventoOpen] = useState(false);

  const mesParam = dayjs(currentMonth).format('YYYY-MM');
  const tiposParam = activeCategories.map((t) => TIPO_TO_PARAM[t]);

  const { data, isLoading } = useCalendario(mesParam, tiposParam);

  const toggleCategory = (tipo: EventoTipo) => {
    setActiveCategories((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo],
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 p-3 sm:p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h1 className="flex items-center gap-2 sm:gap-3 text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
            <div className="rounded-lg sm:rounded-xl bg-primary/10 p-2 sm:p-2.5 ring-1 ring-primary/20 shrink-0">
              <CalendarDays className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
            </div>
            Agenda
          </h1>
          <p className="text-xs sm:text-base text-muted-foreground sm:pl-[52px]">
            Visualize seus eventos e compromissos
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {isLoading && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
          {/* Filtros mobile via Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 lg:hidden">
                <SlidersHorizontal className="size-4" />
                <span className="sr-only sm:not-sr-only">Filtros</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] sm:w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filtros e calendário</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-6">
                <CalendarioSidebar
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                  activeCategories={activeCategories}
                  onToggleCategory={toggleCategory}
                  resumo={data?.resumo}
                />
              </div>
            </SheetContent>
          </Sheet>
          <Button onClick={() => setNovoEventoOpen(true)} size="sm" className="gap-1.5">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Novo evento</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex gap-4 lg:gap-6">
        {/* Left aside - hidden on mobile */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-6">
          <CalendarioSidebar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            activeCategories={activeCategories}
            onToggleCategory={toggleCategory}
            resumo={data?.resumo}
          />
        </aside>

        {/* Main area */}
        <div className="flex-1 min-w-0 space-y-4 sm:space-y-6">
          <CalendarioGrid
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            currentMonth={currentMonth}
            eventos={data?.eventos}
            activeCategories={activeCategories}
          />

          {selectedDate && (
            <CalendarioDayDetail
              date={selectedDate}
              eventos={data?.eventos}
              activeCategories={activeCategories}
              onAddEvento={() => setNovoEventoOpen(true)}
            />
          )}
        </div>
      </div>

      <NovoEventoDialog
        open={novoEventoOpen}
        onOpenChange={setNovoEventoOpen}
        defaultDate={selectedDate}
      />
    </div>
  );
}
