
import * as React from 'react';
import { ptBR } from 'react-day-picker/locale';
import { dayjs } from '@/core/utils/date-utils';
import { Calendar as CalendarIcon, CalendarPlus } from 'lucide-react';
import { Input } from '@/core/ui/input';
import { Button } from '@/core/ui/button';
import { Calendar } from '@/core/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/core/ui/popover';
import { cn } from '@/core/utils';

interface DateInputProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  showQuickSelect?: boolean;
  quickSelectDays?: number;
  quickSelectLabel?: string;
  quickSelectBaseDate?: string;
  placeholder?: string;
}

export function DateInput({
  value,
  onChange,
  label,
  className,
  disabled = false,
  showQuickSelect = true,
  quickSelectDays = 365,
  quickSelectLabel = '+1 Ano',
  quickSelectBaseDate,
  placeholder = 'Selecione uma data',
}: DateInputProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  // Parse the value (YYYY-MM-DD) to Date
  const dateValue = React.useMemo(() => {
    if (!value) return undefined;
    const parsed = dayjs(value, 'YYYY-MM-DD');
    return parsed.isValid() ? parsed.toDate() : undefined;
  }, [value]);

  // Sync input value with date value
  React.useEffect(() => {
    if (dateValue) {
      setInputValue(dayjs(dateValue).format('DD/MM/YYYY'));
    } else {
      setInputValue('');
    }
  }, [dateValue]);

  const handleQuickSelect = () => {
    const base = quickSelectBaseDate
      ? dayjs(quickSelectBaseDate, 'YYYY-MM-DD')
      : dayjs();
    if (!base.isValid()) return;
    onChange(base.add(1, 'year').format('YYYY-MM-DD'));
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onChange(dayjs(date).format('YYYY-MM-DD'));
    }
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;

    // Auto-format as user types (dd/MM/yyyy)
    let formatted = rawValue.replace(/\D/g, '');
    if (formatted.length > 2) {
      formatted = formatted.slice(0, 2) + '/' + formatted.slice(2);
    }
    if (formatted.length > 5) {
      formatted = formatted.slice(0, 5) + '/' + formatted.slice(5, 9);
    }
    setInputValue(formatted);

    // Try to parse complete date
    if (formatted.length === 10) {
      const parsed = dayjs(formatted, 'DD/MM/YYYY');
      if (parsed.isValid()) {
        onChange(parsed.format('YYYY-MM-DD'));
      }
    }
  };

  const handleInputBlur = () => {
    // Validate on blur - if invalid, reset to last valid value
    if (inputValue && inputValue.length === 10) {
      const parsed = dayjs(inputValue, 'DD/MM/YYYY');
      if (!parsed.isValid()) {
        setInputValue(dateValue ? dayjs(dateValue).format('DD/MM/YYYY') : '');
      }
    } else if (inputValue && inputValue.length > 0) {
      setInputValue(dateValue ? dayjs(dateValue).format('DD/MM/YYYY') : '');
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="text-sm font-medium mb-1.5 block">{label}</label>
      )}

      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <div className="relative flex-1">
            <Input
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              placeholder="dd/mm/aaaa"
              disabled={disabled}
              className="pr-10"
              maxLength={10}
            />
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                className={cn(
                  'absolute right-0 top-0 h-full px-3 hover:bg-transparent',
                  !value && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </div>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={handleCalendarSelect}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {showQuickSelect && !disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleQuickSelect}
            className="shrink-0"
          >
            <CalendarPlus className="h-4 w-4 mr-1" />
            {quickSelectLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
