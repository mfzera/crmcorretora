import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Badge } from '@/core/ui/badge';
import { ScrollArea } from '@/core/ui/scroll-area';
import { Loader2, Shield, Plus, Minus, Equal } from 'lucide-react';
import { useCargos, useCargo, usePermissoesGlobais, type Cargo } from '@/modules/cargos/http';

interface CompararCargosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCargoId?: string;
}

export function CompararCargosDialog({ open, onOpenChange, defaultCargoId }: CompararCargosDialogProps) {
  const [cargoAId, setCargoAId] = useState<string>(defaultCargoId ?? '');
  const [cargoBId, setCargoBId] = useState<string>('');

  const { data: cargos = [] } = useCargos();
  const { data: cargoA, isLoading: loadingA } = useCargo(cargoAId || null);
  const { data: cargoB, isLoading: loadingB } = useCargo(cargoBId || null);
  const { data: todasPermissoes = [] } = usePermissoesGlobais();

  const permissoesMap = new Map(todasPermissoes.map((p) => [p.id, p]));

  const idsA = new Set(cargoA?.permissoes?.map((p) => p.id) ?? []);
  const idsB = new Set(cargoB?.permissoes?.map((p) => p.id) ?? []);

  const onlyA = [...idsA].filter((id) => !idsB.has(id));
  const onlyB = [...idsB].filter((id) => !idsA.has(id));
  const common = [...idsA].filter((id) => idsB.has(id));

  const isLoading = loadingA || loadingB;
  const hasSelection = cargoAId && cargoBId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Comparar Permissões de Cargos
          </DialogTitle>
          <DialogDescription>
            Selecione dois cargos para ver as diferenças de permissões entre eles.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Cargo A</p>
            <Select value={cargoAId} onValueChange={setCargoAId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar cargo..." />
              </SelectTrigger>
              <SelectContent>
                {cargos.filter((c) => c.id !== cargoBId).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nomeCargo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Cargo B</p>
            <Select value={cargoBId} onValueChange={setCargoBId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar cargo..." />
              </SelectTrigger>
              <SelectContent>
                {cargos.filter((c) => c.id !== cargoAId).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nomeCargo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && hasSelection && (
          <ScrollArea className="flex-1 min-h-0 mt-4">
            <div className="space-y-5 pr-2">
              {onlyA.length > 0 && (
                <DiffSection
                  title={`Somente em ${cargoA?.nomeCargo ?? 'A'}`}
                  count={onlyA.length}
                  color="destructive"
                  icon={<Minus className="h-3.5 w-3.5" />}
                  ids={onlyA}
                  map={permissoesMap}
                />
              )}
              {onlyB.length > 0 && (
                <DiffSection
                  title={`Somente em ${cargoB?.nomeCargo ?? 'B'}`}
                  count={onlyB.length}
                  color="success"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  ids={onlyB}
                  map={permissoesMap}
                />
              )}
              {common.length > 0 && (
                <DiffSection
                  title="Em ambos os cargos"
                  count={common.length}
                  color="muted"
                  icon={<Equal className="h-3.5 w-3.5" />}
                  ids={common}
                  map={permissoesMap}
                />
              )}
              {onlyA.length === 0 && onlyB.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                  <Equal className="h-8 w-8 text-muted-foreground" />
                  <p className="font-medium">Cargos idênticos</p>
                  <p className="text-sm text-muted-foreground">Estes dois cargos têm exatamente as mesmas permissões.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {!hasSelection && !isLoading && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
            <Shield className="h-10 w-10" />
            <p className="text-sm">Selecione dois cargos para comparar</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface DiffSectionProps {
  title: string;
  count: number;
  color: 'destructive' | 'success' | 'muted';
  icon: React.ReactNode;
  ids: string[];
  map: Map<string, { id: string; nomePermissao: string; descricao: string | null; grupo: string | null }>;
}

const COLOR_MAP = {
  destructive: {
    section: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    icon: 'text-red-500',
    item: 'bg-red-100/50 dark:bg-red-900/20',
  },
  success: {
    section: 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    icon: 'text-green-500',
    item: 'bg-green-100/50 dark:bg-green-900/20',
  },
  muted: {
    section: 'border-border bg-muted/30',
    badge: 'bg-muted text-muted-foreground',
    icon: 'text-muted-foreground',
    item: 'bg-muted/40',
  },
};

function DiffSection({ title, count, color, icon, ids, map }: DiffSectionProps) {
  const c = COLOR_MAP[color];
  return (
    <div className={`rounded-lg border p-4 ${c.section}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-1.5 font-medium text-sm ${c.icon}`}>
          {icon}
          {title}
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>{count}</span>
      </div>
      <div className="grid gap-1.5">
        {ids.map((id) => {
          const p = map.get(id);
          if (!p) return null;
          return (
            <div key={id} className={`flex items-start gap-2 rounded p-2 text-sm ${c.item}`}>
              <Shield className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${c.icon}`} />
              <div className="min-w-0">
                <code className="text-xs font-mono text-muted-foreground">{p.nomePermissao}</code>
                {p.descricao && <p className="text-xs text-foreground/70 mt-0.5 truncate">{p.descricao}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
