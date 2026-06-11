import { useState, useTransition } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/ui/popover';
import { SITUACOES } from '../types';
import type { SituacaoLabel } from '../types';

interface SituacaoDropdownProps {
  value: SituacaoLabel[];
  onChange: (v: SituacaoLabel[]) => void;
}

export function SituacaoDropdown({ value, onChange }: SituacaoDropdownProps) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const toggle = (s: SituacaoLabel) =>
    startTransition(() => onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s]));

  const label =
    value.length === 0 ? 'Situação' : value.length === 1 ? value[0] : `Situação (${value.length})`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={value.length > 0 ? 'secondary' : 'outline'} size="sm" className="h-7 gap-1.5 text-xs">
          {label}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="start">
        {value.length > 0 && (
          <button
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
            onClick={() => startTransition(() => onChange([]))}
          >
            Limpar filtro
          </button>
        )}
        {SITUACOES.map((s) => (
          <button
            key={s}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent transition-colors"
            onClick={() => toggle(s)}
          >
            <span
              className={`flex size-3.5 shrink-0 items-center justify-center rounded border ${
                value.includes(s) ? 'border-primary bg-primary' : 'border-border'
              }`}
            >
              {value.includes(s) && <Check className="size-2.5 text-primary-foreground" />}
            </span>
            <span className="flex-1 text-left">{s}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export interface MultiSelectFilterOption {
  id: string;
  label: string;
}

interface MultiSelectFilterProps {
  label: string;
  icon?: React.ReactNode;
  options: MultiSelectFilterOption[];
  value: string[];
  onChange: (v: string[]) => void;
}

export function MultiSelectFilter({ label, icon, options, value, onChange }: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const toggle = (id: string) =>
    startTransition(() => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]));

  const btnLabel =
    value.length === 0
      ? label
      : value.length === 1
        ? options.find((o) => o.id === value[0])?.label ?? label
        : `${label} (${value.length})`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={value.length > 0 ? 'secondary' : 'outline'} size="sm" className="h-7 gap-1.5 text-xs">
          {icon}
          {btnLabel}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="start">
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => startTransition(() => onChange([]))}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            Limpar filtro
          </button>
        )}
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent transition-colors"
          >
            <span
              className={`flex size-3.5 shrink-0 items-center justify-center rounded border ${
                value.includes(opt.id) ? 'border-primary bg-primary' : 'border-border'
              }`}
            >
              {value.includes(opt.id) && <Check className="size-2.5 text-primary-foreground" />}
            </span>
            <span className="flex-1 text-left truncate">{opt.label}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
