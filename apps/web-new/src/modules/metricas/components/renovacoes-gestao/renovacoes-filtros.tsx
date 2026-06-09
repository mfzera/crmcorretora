
import { useState } from 'react';
import { Search, X, CalendarRange, Check, Users } from 'lucide-react';
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
import { Checkbox } from '@/core/ui/checkbox';
import { DateInput } from '@/core/ui/date-input';
import { cn } from '@/core/utils';
import { useVendedores } from '../../http';
import { usePermissions } from '@/core/hooks/use-permissions';
import type { FiltrosRenovacoesGestao } from '@/modules/renovacoes/http';

const STATUS_OPTIONS = [
  { value: 'NAO_TRABALHADO', label: 'Não trabalhado' },
  { value: 'EM_PROSPECCAO', label: 'Em prospecção' },
  { value: 'EM_NEGOCIACAO', label: 'Em negociação' },
  { value: 'AGUARDANDO_CLIENTE', label: 'Aguardando cliente' },
  { value: 'RENOVADO', label: 'Renovado' },
  { value: 'PERDIDO', label: 'Perdido' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

export function RenovacoesFiltros({
  filtros,
  onChange,
}: {
  filtros: FiltrosRenovacoesGestao;
  onChange: (filtros: Partial<FiltrosRenovacoesGestao>) => void;
}) {
  const { hasPermission } = usePermissions();
  const podeVerEquipes = hasPermission('equipes:visualizar');
  const [vendedorPopoverOpen, setVendedorPopoverOpen] = useState(false);

  const { data: vendedoresData } = useVendedores();
  const vendedores = vendedoresData?.vendedores ?? [];

  const vendedoresSelecionados: string[] = filtros.vendedorIds ?? [];

  const toggleVendedor = (id: string) => {
    const atual = vendedoresSelecionados;
    const novo = atual.includes(id) ? atual.filter((v) => v !== id) : [...atual, id];
    onChange({ vendedorIds: novo.length > 0 ? novo : undefined });
  };

  const labelVendedor = () => {
    if (vendedoresSelecionados.length === 0) return 'Todos os vendedores';
    if (vendedoresSelecionados.length === 1) {
      return vendedores.find((v) => v.id === vendedoresSelecionados[0])?.nome ?? '1 vendedor';
    }
    return `${vendedoresSelecionados.length} vendedores`;
  };

  const temFiltros =
    !!filtros.search ||
    !!filtros.status ||
    (filtros.vendedorIds?.length ?? 0) > 0 ||
    !!filtros.dataVencimentoInicio ||
    !!filtros.dataVencimentoFim;

  const limpar = () =>
    onChange({
      search: undefined,
      status: undefined,
      vendedorIds: undefined,
      dataVencimentoInicio: undefined,
      dataVencimentoFim: undefined,
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          className="pl-8 h-8 w-52 text-sm"
          placeholder="Buscar cliente ou produto..."
          value={filtros.search ?? ''}
          onChange={(e) =>
            onChange({ search: e.target.value || undefined })
          }
        />
      </div>

      {/* Status */}
      <Select
        value={filtros.status ?? 'todos'}
        onValueChange={(v) => onChange({ status: v === 'todos' ? undefined : v })}
      >
        <SelectTrigger className="h-8 w-48 text-sm">
          <SelectValue placeholder="Todos os status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os status</SelectItem>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Vendedores — multi-select */}
      {podeVerEquipes && vendedores.length > 0 && (
        <Popover open={vendedorPopoverOpen} onOpenChange={setVendedorPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 gap-1.5 text-sm font-normal',
                vendedoresSelecionados.length > 0 && 'border-primary text-primary',
              )}
            >
              <Users className="size-3.5" />
              {labelVendedor()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1" align="start">
            <div className="max-h-60 overflow-y-auto">
              {vendedores.map((v) => {
                const selecionado = vendedoresSelecionados.includes(v.id);
                return (
                  <button
                    key={v.id}
                    onClick={() => toggleVendedor(v.id)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted transition-colors"
                  >
                    <Checkbox
                      checked={selecionado}
                      className="pointer-events-none"
                    />
                    <span className="flex-1 text-left truncate">{v.nome}</span>
                    {selecionado && <Check className="size-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
            {vendedoresSelecionados.length > 0 && (
              <div className="border-t mt-1 pt-1 px-1">
                <button
                  onClick={() => onChange({ vendedorIds: undefined })}
                  className="w-full rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors text-left"
                >
                  Limpar seleção
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}

      {/* Período de vencimento */}
      <div className="flex items-center gap-1.5">
        <CalendarRange className="size-3.5 text-muted-foreground shrink-0" />
        <DateInput
          value={filtros.dataVencimentoInicio ?? ''}
          onChange={(v) => onChange({ dataVencimentoInicio: v || undefined })}
          placeholder="De"
          showQuickSelect={false}
          className="h-8 w-32 text-sm"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <DateInput
          value={filtros.dataVencimentoFim ?? ''}
          onChange={(v) => onChange({ dataVencimentoFim: v || undefined })}
          placeholder="Até"
          showQuickSelect={false}
          className="h-8 w-32 text-sm"
        />
      </div>

      {/* Limpar */}
      {temFiltros && (
        <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={limpar}>
          <X className="size-3.5" />
          Limpar
        </Button>
      )}
    </div>
  );
}
