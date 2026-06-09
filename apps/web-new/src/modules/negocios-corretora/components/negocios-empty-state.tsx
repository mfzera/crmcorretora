import { SearchX, Building2 } from 'lucide-react';
import { Button } from '@/core/ui/button';

interface NegociosEmptyStateProps {
  variant: 'no-results' | 'no-data';
  onClearFilters?: () => void;
}

export function NegociosEmptyState({ variant, onClearFilters }: NegociosEmptyStateProps) {
  if (variant === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <SearchX className="size-7 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold">Nenhum negócio encontrado</p>
          <p className="text-sm text-muted-foreground mt-0.5">Tente ajustar os filtros</p>
        </div>
        {onClearFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            Limpar filtros
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Building2 className="size-7 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold">Nenhum negócio cadastrado</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          Quando negócios forem registrados eles aparecerão aqui
        </p>
      </div>
    </div>
  );
}
