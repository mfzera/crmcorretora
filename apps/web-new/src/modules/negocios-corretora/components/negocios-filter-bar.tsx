import { useState } from 'react';
import { Search, SlidersHorizontal, ChevronDown, X, CalendarDays } from 'lucide-react';
import { Input } from '@/core/ui/input';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { DateInput } from '@/core/ui/date-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/core/ui/collapsible';
import { cn } from '@/core/utils';
import { dayjs } from '@/core/utils/date-utils';
import { getStatusLabel, getStatusColor } from '@/core/utils/status-config';
import type { useNegociosFiltros } from '../hooks/use-negocios-filtros';

interface NegociosFilterBarProps {
  filtros: ReturnType<typeof useNegociosFiltros>;
  produtosUnicos: string[];
  vendedoresUnicos: { id: string; nome: string }[];
  statusUnicos: string[];
  defaultOpen?: boolean;
}

// Melhoria 2: atalhos de período
const PERIOD_SHORTCUTS = [
  {
    label: 'Este mês',
    getRange: () => ({
      inicio: dayjs().startOf('month').format('YYYY-MM-DD'),
      fim: dayjs().format('YYYY-MM-DD'),
    }),
  },
  {
    label: '30 dias',
    getRange: () => ({
      inicio: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
      fim: dayjs().format('YYYY-MM-DD'),
    }),
  },
  {
    label: '90 dias',
    getRange: () => ({
      inicio: dayjs().subtract(90, 'day').format('YYYY-MM-DD'),
      fim: dayjs().format('YYYY-MM-DD'),
    }),
  },
  {
    label: 'Este ano',
    getRange: () => ({
      inicio: dayjs().startOf('year').format('YYYY-MM-DD'),
      fim: dayjs().format('YYYY-MM-DD'),
    }),
  },
];

export function NegociosFilterBar({
  filtros,
  produtosUnicos,
  vendedoresUnicos,
  statusUnicos,
  defaultOpen,
}: NegociosFilterBarProps) {
  // Melhoria 3: estado do collapsible controlado para mostrar chevron animado
  const [isOpen, setIsOpen] = useState(defaultOpen ?? filtros.temFiltrosAtivos);

  // Melhoria 4: atalho de período ativo
  const activePeriodShortcut = PERIOD_SHORTCUTS.findIndex((s) => {
    const range = s.getRange();
    return filtros.dataInicio === range.inicio && filtros.dataFim === range.fim;
  });

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="hidden sm:block"
    >
      <div className="flex items-center gap-2 flex-wrap">
        {/* Melhoria 5: campo de busca com botão X */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            className="pl-8 pr-8 h-8 w-56 text-sm"
            placeholder="Buscar cliente, número..."
            value={filtros.searchInput}
            onChange={(e) => filtros.setSearchInput(e.target.value)}
          />
          {filtros.searchInput && (
            <button
              type="button"
              onClick={() => filtros.setSearchInput('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Limpar busca"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Melhoria 6: botão de filtros com chevron animado */}
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 relative">
            <SlidersHorizontal className="size-3.5" />
            Filtros
            {filtros.activeFilterCount > 0 && (
              <Badge
                variant="default"
                className="absolute -top-1.5 -right-1.5 size-4 p-0 flex items-center justify-center text-[10px] rounded-full"
              >
                {filtros.activeFilterCount}
              </Badge>
            )}
            <ChevronDown
              className={cn(
                'size-3 opacity-50 transition-transform duration-200',
                isOpen && 'rotate-180',
              )}
            />
          </Button>
        </CollapsibleTrigger>

        {/* Melhoria 7: atalhos de período visíveis sempre */}
        <div className="flex items-center gap-0.5 rounded-md border p-0.5">
          {PERIOD_SHORTCUTS.map((shortcut, idx) => (
            <Button
              key={shortcut.label}
              variant={activePeriodShortcut === idx ? 'default' : 'ghost'}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => {
                const { inicio, fim } = shortcut.getRange();
                filtros.setDataInicio(inicio);
                filtros.setDataFim(fim);
              }}
            >
              {shortcut.label}
            </Button>
          ))}
        </div>

        {/* Melhoria 8: botão limpar tudo quando há filtros */}
        {filtros.temFiltrosAtivos && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={filtros.resetFiltros}
          >
            <X className="size-3.5" />
            Limpar
          </Button>
        )}
      </div>

      <CollapsibleContent className="pt-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Melhoria 9: destaque visual nos selects ativos */}
          <Select
            value={filtros.negocioCorretora}
            onValueChange={(v) => filtros.setNegocioCorretora(v as 'todos' | 'sim' | 'nao')}
          >
            <SelectTrigger
              className={cn(
                'h-8 w-48 text-sm',
                filtros.negocioCorretora !== 'todos' && 'border-primary ring-1 ring-primary/20 text-primary',
              )}
            >
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="sim">Negócio Corretora</SelectItem>
              <SelectItem value="nao">Outros Negócios</SelectItem>
            </SelectContent>
          </Select>

          {/* Melhoria 10: status com indicadores de cor */}
          <Select value={filtros.status} onValueChange={filtros.setStatus}>
            <SelectTrigger
              className={cn(
                'h-8 w-44 text-sm',
                filtros.status !== 'todos' && 'border-primary ring-1 ring-primary/20 text-primary',
              )}
            >
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {statusUnicos.map((s) => (
                <SelectItem key={s} value={s}>
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full shrink-0',
                        getStatusColor(s),
                      )}
                    />
                    {getStatusLabel(s)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Melhoria 11: produto com destaque */}
          {produtosUnicos.length > 0 && (
            <Select value={filtros.produto} onValueChange={filtros.setProduto}>
              <SelectTrigger
                className={cn(
                  'h-8 w-44 text-sm',
                  filtros.produto !== 'todos' && 'border-primary ring-1 ring-primary/20 text-primary',
                )}
              >
                <SelectValue placeholder="Todos os produtos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os produtos</SelectItem>
                {produtosUnicos.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Melhoria 12: vendedor com destaque */}
          {vendedoresUnicos.length > 0 && (
            <Select value={filtros.vendedorId} onValueChange={filtros.setVendedorId}>
              <SelectTrigger
                className={cn(
                  'h-8 w-44 text-sm',
                  filtros.vendedorId !== 'todos' && 'border-primary ring-1 ring-primary/20 text-primary',
                )}
              >
                <SelectValue placeholder="Todos os vendedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os vendedores</SelectItem>
                {vendedoresUnicos.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Melhoria 13: período com ícone e limpar individual */}
          <div className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5 text-muted-foreground shrink-0" />
            <DateInput
              value={filtros.dataInicio}
              onChange={(v) => filtros.setDataInicio(v)}
              placeholder="De"
              showQuickSelect={false}
              className={cn(
                'h-8 w-28 text-sm',
                filtros.dataInicio && 'border-primary',
              )}
            />
            <span className="text-xs text-muted-foreground">–</span>
            <DateInput
              value={filtros.dataFim}
              onChange={(v) => filtros.setDataFim(v)}
              placeholder="Até"
              showQuickSelect={false}
              className={cn(
                'h-8 w-28 text-sm',
                filtros.dataFim && 'border-primary',
              )}
            />
            {/* Melhoria 14: limpar datas individualmente */}
            {(filtros.dataInicio || filtros.dataFim) && (
              <button
                type="button"
                onClick={() => {
                  filtros.setDataInicio('');
                  filtros.setDataFim('');
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Limpar período"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
