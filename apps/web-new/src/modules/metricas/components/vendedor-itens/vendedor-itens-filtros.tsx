
import { Search, X, CalendarIcon } from 'lucide-react';
import { Input } from '@/core/ui/input';
import { Button } from '@/core/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/core/ui/popover';
import { Calendar } from '@/core/ui/calendar';
import { cn } from '@/core/utils';
import { dayjs } from '@/core/utils/date-utils';

interface Produto {
  id: string;
  nomeProduto: string;
}

interface VendedorItensFiltrosProps {
  produtos: Produto[];
  search: string;
  produtoId: string;
  dataInicio: Date | undefined;
  dataFim: Date | undefined;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onProdutoChange: (value: string) => void;
  onDataInicioChange: (date: Date | undefined) => void;
  onDataFimChange: (date: Date | undefined) => void;
  onClear: () => void;
}

export function VendedorItensFiltros({
  produtos,
  search,
  produtoId,
  dataInicio,
  dataFim,
  hasActiveFilters,
  onSearchChange,
  onProdutoChange,
  onDataInicioChange,
  onDataFimChange,
  onClear,
}: VendedorItensFiltrosProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Linha principal de filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, apólice ou cliente..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Produto */}
        <Select value={produtoId || 'todos'} onValueChange={onProdutoChange}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Produto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os produtos</SelectItem>
            {produtos.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nomeProduto}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Data início */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full sm:w-36 justify-start gap-2 font-normal',
                !dataInicio && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className="size-4 shrink-0" />
              {dataInicio ? dayjs(dataInicio).format('DD/MM/YYYY') : 'De'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dataInicio}
              onSelect={onDataInicioChange}
              initialFocus
            />
            {dataInicio && (
              <div className="p-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => onDataInicioChange(undefined)}
                >
                  Limpar
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Data fim */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full sm:w-36 justify-start gap-2 font-normal',
                !dataFim && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className="size-4 shrink-0" />
              {dataFim ? dayjs(dataFim).format('DD/MM/YYYY') : 'Até'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dataFim}
              onSelect={onDataFimChange}
              initialFocus
            />
            {dataFim && (
              <div className="p-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => onDataFimChange(undefined)}
                >
                  Limpar
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Limpar filtros */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            title="Limpar filtros"
            className="shrink-0"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
