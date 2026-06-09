import { X } from 'lucide-react';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';

interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface NegociosFilterChipsProps {
  chips: FilterChip[];
  onClearAll: () => void;
}

export function NegociosFilterChips({ chips, onClearAll }: NegociosFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="secondary"
          className="gap-1 pr-1 pl-2.5 h-6 text-xs font-normal"
        >
          {chip.label}
          <button
            onClick={chip.onRemove}
            className="flex items-center justify-center rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            aria-label={`Remover filtro ${chip.label}`}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-xs px-2 text-muted-foreground"
        onClick={onClearAll}
      >
        Limpar todos
      </Button>
    </div>
  );
}
