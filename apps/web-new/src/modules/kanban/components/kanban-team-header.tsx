
import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { Users, TrendingUp, Settings2, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { cn } from '@/core/utils';
import type { VendedorStats } from '@/modules/gestao-crm/http';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/ui/popover';

const STORAGE_KEY = 'kanban-equipe-config-v1';

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function formatValor(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
}

interface KanbanTeamHeaderProps {
  vendedores: VendedorStats[];
  filtroVendedorIds: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
}

export const KanbanTeamHeader = memo(function KanbanTeamHeader({
  vendedores,
  filtroVendedorIds,
  onToggle,
  onClear,
}: KanbanTeamHeaderProps) {
  const [vendedoresVisiveis, setVendedoresVisiveis] = useState<string[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setVendedoresVisiveis(JSON.parse(saved));
    } catch {}
  }, []);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    el.addEventListener('scroll', checkScroll);
    checkScroll();
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', checkScroll);
    };
  }, [checkScroll, vendedores]);

  const toggleVisibilidade = useCallback(
    (id: string) => {
      setVendedoresVisiveis((prev) => {
        const current = prev ?? vendedores.map((v) => v.id);
        const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
        // Se todos selecionados, volta pra null (sem config)
        const result = next.length >= vendedores.length ? null : next.length === 0 ? [id] : next;
        if (result === null) {
          localStorage.removeItem(STORAGE_KEY);
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
        }
        return result;
      });
    },
    [vendedores],
  );

  const mostrarTodos = useCallback(() => {
    setVendedoresVisiveis(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -220 : 220, behavior: 'smooth' });
  };

  if (vendedores.length === 0) return null;

  const vendedoresFiltrados = vendedoresVisiveis
    ? vendedores.filter((v) => vendedoresVisiveis.includes(v.id))
    : vendedores;

  const ocultados = vendedores.length - vendedoresFiltrados.length;

  const totalGeral = vendedores.reduce((s, v) => s + v.stats.total, 0);
  const ganhasGeral = vendedores.reduce((s, v) => s + v.stats.ganhas, 0);
  const taxaGeral = totalGeral > 0 ? Math.round((ganhasGeral / totalGeral) * 100) : 0;
  const valorGeral = vendedores.reduce((s, v) => s + v.stats.valorEstimado, 0);

  const todosAtivo = filtroVendedorIds.length === 0;

  return (
    <div className="px-3 sm:px-4 pb-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Equipe
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {vendedores.length} vendedor{vendedores.length !== 1 ? 'es' : ''}
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'rounded p-0.5 transition-colors hover:bg-muted',
                  vendedoresVisiveis ? 'text-primary' : 'text-muted-foreground',
                )}
                title="Configurar vendedores visíveis"
              >
                <Settings2 className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2">
              <p className="mb-1 px-2 py-1 text-xs font-semibold text-muted-foreground">
                Vendedores visíveis
              </p>
              <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
                {vendedores.map((v) => {
                  const visivel = !vendedoresVisiveis || vendedoresVisiveis.includes(v.id);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => toggleVisibilidade(v.id)}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted"
                    >
                      <div
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          visivel ? 'border-primary bg-primary' : 'border-border',
                        )}
                      >
                        {visivel && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <Avatar className="h-5 w-5 shrink-0">
                        <AvatarImage src={v.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-[9px]">{getInitials(v.nome)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{v.nome.split(' ')[0]}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                        {v.stats.total}
                      </span>
                    </button>
                  );
                })}
              </div>
              {vendedoresVisiveis && (
                <button
                  type="button"
                  onClick={mostrarTodos}
                  className="mt-2 w-full rounded-md px-2 py-1.5 text-center text-xs text-primary transition-colors hover:bg-primary/10"
                >
                  Mostrar todos
                </button>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="relative">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        <div
          ref={scrollRef}
          className={cn(
            'flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            canScrollLeft && 'pl-9',
            canScrollRight && 'pr-9',
          )}
        >
          {/* Chip "Todos" */}
          <button
            type="button"
            onClick={onClear}
            className={cn(
              'flex shrink-0 flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              todosAtivo
                ? 'border-primary bg-primary/10 shadow-sm'
                : 'border-border bg-card hover:border-primary/40 hover:bg-muted/60',
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  todosAtivo ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className={cn('text-xs font-semibold', todosAtivo ? 'text-primary' : 'text-foreground')}>
                  Todos
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">{totalGeral} oport.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pl-0.5">
              <span className="text-[11px] text-muted-foreground tabular-nums">{ganhasGeral} ganhas</span>
              <span className="text-muted-foreground/40">·</span>
              <span
                className={cn(
                  'text-[11px] font-medium tabular-nums',
                  taxaGeral >= 30 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
                )}
              >
                {taxaGeral}%
              </span>
              {valorGeral > 0 && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {formatValor(valorGeral)}
                  </span>
                </>
              )}
            </div>
          </button>

          <div className="my-1 w-px shrink-0 bg-border" />

          {vendedoresFiltrados.map((v) => {
            const ativo = filtroVendedorIds.includes(v.id);
            const taxa = Math.round(v.stats.taxaConversao);

            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onToggle(v.id)}
                className={cn(
                  'flex shrink-0 flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  ativo
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-muted/60',
                )}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={v.avatarUrl ?? undefined} alt={v.nome} />
                    <AvatarFallback
                      className={cn(
                        'text-[11px] font-semibold',
                        ativo ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {getInitials(v.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'max-w-[90px] truncate text-xs font-semibold',
                        ativo ? 'text-primary' : 'text-foreground',
                      )}
                    >
                      {v.nome.split(' ')[0]}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {v.stats.total} oport.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-0.5">
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {v.stats.ganhas} ganhas
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <span
                    className={cn(
                      'text-[11px] font-medium tabular-nums',
                      taxa >= 50
                        ? 'text-green-600 dark:text-green-400'
                        : taxa >= 25
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-muted-foreground',
                    )}
                  >
                    <TrendingUp className="mr-0.5 -mt-px inline h-2.5 w-2.5" />
                    {taxa}%
                  </span>
                  {v.stats.valorEstimado > 0 && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {formatValor(v.stats.valorEstimado)}
                      </span>
                    </>
                  )}
                </div>
              </button>
            );
          })}

          {/* Badge de vendedores ocultos por configuração */}
          {ocultados > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-full shrink-0 items-center self-center rounded-full border border-dashed border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted"
                  title={`${ocultados} vendedor${ocultados > 1 ? 'es' : ''} oculto${ocultados > 1 ? 's' : ''}`}
                >
                  +{ocultados}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-48 p-2">
                <p className="mb-1 px-2 py-1 text-xs text-muted-foreground">Ocultos na barra</p>
                {vendedores
                  .filter((v) => vendedoresVisiveis && !vendedoresVisiveis.includes(v.id))
                  .map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => onToggle(v.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted',
                        filtroVendedorIds.includes(v.id) && 'font-medium text-primary',
                      )}
                    >
                      <Avatar className="h-5 w-5 shrink-0">
                        <AvatarImage src={v.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-[9px]">{getInitials(v.nome)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{v.nome.split(' ')[0]}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                        {v.stats.total}
                      </span>
                    </button>
                  ))}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
});
