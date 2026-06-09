
import * as React from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/core/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/core/ui/popover';
import { cn } from '@/core/utils';

const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

interface MonthPickerProps {
  value?: string; // YYYY-MM
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MonthPicker({
  value,
  onChange,
  placeholder = 'Selecione mês/ano',
  disabled = false,
}: MonthPickerProps) {
  const [open, setOpen] = React.useState(false);

  const parsed = value ? { year: Number(value.split('-')[0]), month: Number(value.split('-')[1]) - 1 } : null;
  const [viewYear, setViewYear] = React.useState(parsed?.year ?? new Date().getFullYear());

  const displayLabel = parsed
    ? `${MONTHS[parsed.month]} ${parsed.year}`
    : placeholder;

  const handleSelect = (monthIndex: number) => {
    const mm = String(monthIndex + 1).padStart(2, '0');
    onChange(`${viewYear}-${mm}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
          )}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          {displayLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        {/* Year navigation */}
        <div className="flex items-center justify-between mb-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewYear((y) => y - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold">{viewYear}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewYear((y) => y + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((name, i) => {
            const isSelected = parsed?.year === viewYear && parsed?.month === i;
            return (
              <Button
                key={name}
                type="button"
                variant={isSelected ? 'default' : 'ghost'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => handleSelect(i)}
              >
                {name}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
