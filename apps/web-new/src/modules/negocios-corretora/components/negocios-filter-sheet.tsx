import { SlidersHorizontal, CalendarRange, Building2, User, Package2, Activity, X } from 'lucide-react';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/core/ui/sheet';
import { cn } from '@/core/utils';
import { dayjs } from '@/core/utils/date-utils';
import { getStatusLabel, getStatusColor } from '@/core/utils/status-config';
import type { useNegociosFiltros } from '../hooks/use-negocios-filtros';

interface NegociosFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filtros: ReturnType<typeof useNegociosFiltros>;
  produtosUnicos: string[];
  vendedoresUnicos: { id: string; nome: string }[];
  statusUnicos: string[];
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

export function NegociosFilterSheet({
  open,
  onOpenChange,
  filtros,
  produtosUnicos,
  vendedoresUnicos,
  statusUnicos,
}: NegociosFilterSheetProps) {
  // Melhoria 3: atalho ativo
  const activePeriodShortcut = PERIOD_SHORTCUTS.findIndex((s) => {
    const range = s.getRange();
    return filtros.dataInicio === range.inicio && filtros.dataFim === range.fim;
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90dvh] rounded-t-2xl flex flex-col gap-0 p-0">
        {/* Melhoria 4: indicador de arraste no topo */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        <SheetHeader className="px-4 pb-3 pt-1">
          <SheetTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" />
            Filtros
            {filtros.activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {filtros.activeFilterCount} ativo{filtros.activeFilterCount > 1 ? 's' : ''}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-5">

          {/* Melhoria 5: atalhos de período no topo da sheet */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Período rápido</p>
            <div className="grid grid-cols-2 gap-1.5">
              {PERIOD_SHORTCUTS.map((shortcut, idx) => (
                <Button
                  key={shortcut.label}
                  variant={activePeriodShortcut === idx ? 'default' : 'outline'}
                  size="sm"
                  className="h-9 text-sm justify-start"
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
          </div>

          {/* Tipo de negócio */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Building2 className="size-3.5 text-muted-foreground" />
              Tipo de Negócio
            </p>
            {/* Melhoria 6: seleção visual com botões em vez de select para opções binárias */}
            <div className="grid grid-cols-3 gap-1.5">
              {(['todos', 'sim', 'nao'] as const).map((v) => (
                <Button
                  key={v}
                  variant={filtros.negocioCorretora === v ? 'default' : 'outline'}
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => filtros.setNegocioCorretora(v)}
                >
                  {v === 'todos' ? 'Todos' : v === 'sim' ? 'Corretora' : 'Outros'}
                </Button>
              ))}
            </div>
          </div>

          {/* Status — Melhoria 7: indicadores de cor */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Activity className="size-3.5 text-muted-foreground" />
              Status
              {filtros.status !== 'todos' && (
                <button
                  onClick={() => filtros.setStatus('todos')}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                  aria-label="Limpar status"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </p>
            <Select value={filtros.status} onValueChange={filtros.setStatus}>
              <SelectTrigger
                className={cn(filtros.status !== 'todos' && 'border-primary ring-1 ring-primary/20')}
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
          </div>

          {/* Produto — Melhoria 8: header com X para limpar */}
          {produtosUnicos.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Package2 className="size-3.5 text-muted-foreground" />
                Produto
                {filtros.produto !== 'todos' && (
                  <button
                    onClick={() => filtros.setProduto('todos')}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                    aria-label="Limpar produto"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </p>
              <Select value={filtros.produto} onValueChange={filtros.setProduto}>
                <SelectTrigger
                  className={cn(filtros.produto !== 'todos' && 'border-primary ring-1 ring-primary/20')}
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
            </div>
          )}

          {/* Vendedor — Melhoria 9: header com X */}
          {vendedoresUnicos.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <User className="size-3.5 text-muted-foreground" />
                Vendedor
                {filtros.vendedorId !== 'todos' && (
                  <button
                    onClick={() => filtros.setVendedorId('todos')}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                    aria-label="Limpar vendedor"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </p>
              <Select value={filtros.vendedorId} onValueChange={filtros.setVendedorId}>
                <SelectTrigger
                  className={cn(filtros.vendedorId !== 'todos' && 'border-primary ring-1 ring-primary/20')}
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
            </div>
          )}

          {/* Período personalizado — Melhoria 10: header com X para limpar */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <CalendarRange className="size-3.5 text-muted-foreground" />
              Período personalizado
              {(filtros.dataInicio || filtros.dataFim) && (
                <button
                  onClick={() => {
                    filtros.setDataInicio('');
                    filtros.setDataFim('');
                  }}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                  aria-label="Limpar período"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <DateInput
                value={filtros.dataInicio}
                onChange={(v) => filtros.setDataInicio(v)}
                placeholder="De"
                showQuickSelect={false}
                className={cn(filtros.dataInicio && 'border-primary')}
              />
              <DateInput
                value={filtros.dataFim}
                onChange={(v) => filtros.setDataFim(v)}
                placeholder="Até"
                showQuickSelect={false}
                className={cn(filtros.dataFim && 'border-primary')}
              />
            </div>
          </div>
        </div>

        {/* Melhoria 11: rodapé com contagem no botão Aplicar */}
        <SheetFooter className="flex-row gap-2 px-4 py-4 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => { filtros.resetFiltros(); onOpenChange(false); }}
          >
            Limpar tudo
          </Button>
          <Button className="flex-1" onClick={() => onOpenChange(false)}>
            Aplicar{filtros.activeFilterCount > 0 ? ` (${filtros.activeFilterCount})` : ''}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
