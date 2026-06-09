
import { Search, Filter } from 'lucide-react';
import { Input } from '@/core/ui/input';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/core/ui/dropdown-menu';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterConfig {
  label: string;
  value: string | null;
  options: FilterOption[];
  onChange: (value: string | null) => void;
  renderItems?: () => React.ReactNode;
}

interface FilterBarProps {
  search: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  filters?: FilterConfig[];
  activeCount?: number;
  extra?: React.ReactNode;
}

export function FilterBar({ search, filters, activeCount, extra }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={search.placeholder ?? 'Buscar...'}
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex gap-2 items-center">
        {filters && filters.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtros
                {activeCount != null && activeCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center"
                  >
                    {activeCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {filters.map((filter, i) => (
                <div key={i}>
                  {i > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuLabel>{filter.label}</DropdownMenuLabel>
                  {filter.renderItems?.()}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {extra}
      </div>
    </div>
  );
}
