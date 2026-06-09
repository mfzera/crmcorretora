import { useState } from 'react';
import { GripVertical, Eye, EyeOff, Plus, Trash2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Switch } from '@/core/ui/switch';
import { cn } from '@/core/utils';
import type { KanbanColumnDef } from './types';
import {
  useUpdateKanbanColumn,
  useCreateCustomColumn,
  useUpdateCustomColumn,
  useDeleteCustomColumn,
} from './http';

const PRESET_COLORS = [
  'bg-slate-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-pink-500',
  'bg-rose-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-yellow-500',
  'bg-lime-500',
  'bg-green-500',
  'bg-teal-500',
  'bg-cyan-500',
];

interface KanbanConfigDialogProps {
  boardType: string;
  columns: KanbanColumnDef[];
  /** Todas as colunas incluindo ocultas (para a lista de config) */
  allColumns: KanbanColumnDef[];
}

export function KanbanConfigDialog({ boardType, columns, allColumns }: KanbanConfigDialogProps) {
  const [open, setOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('bg-slate-500');
  const [newTerminal, setNewTerminal] = useState(false);

  const updateColumn = useUpdateKanbanColumn(boardType);
  const createCustom = useCreateCustomColumn(boardType);
  const updateCustom = useUpdateCustomColumn(boardType);
  const deleteCustom = useDeleteCustomColumn(boardType);

  const handleToggleVisible = (col: KanbanColumnDef) => {
    updateColumn.mutate(
      { columnId: col.id, data: { visible: !col.visible } },
      { onError: () => toast.error('Erro ao atualizar coluna') },
    );
  };

  const handleCreateCustom = () => {
    if (!newLabel.trim()) return;
    createCustom.mutate(
      { label: newLabel.trim(), color: newColor, isTerminal: newTerminal },
      {
        onSuccess: () => {
          setNewLabel('');
          setNewColor('bg-slate-500');
          setNewTerminal(false);
          toast.success('Coluna criada');
        },
        onError: () => toast.error('Erro ao criar coluna'),
      },
    );
  };

  const handleDeleteCustom = (col: KanbanColumnDef) => {
    deleteCustom.mutate(col.id, {
      onSuccess: () => toast.success('Coluna removida'),
      onError: () => toast.error('Erro ao remover coluna'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />
          Colunas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar colunas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Colunas existentes (padrão + custom) */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Visibilidade
            </p>
            {allColumns.map((col) => (
              <div
                key={col.id}
                className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', col.color)} />
                <span className="flex-1 text-sm truncate">{col.title}</span>
                {col.isCustom && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive/70 hover:text-destructive"
                    onClick={() => handleDeleteCustom(col)}
                    disabled={deleteCustom.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <button
                  onClick={() => handleToggleVisible(col)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  disabled={updateColumn.isPending}
                >
                  {col.visible ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground/40" />
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Criar coluna customizada */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Nova coluna
            </p>
            <div className="space-y-2">
              <Input
                placeholder="Nome da coluna"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCustom()}
              />
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    className={cn(
                      'w-5 h-5 rounded-full transition-transform',
                      c,
                      newColor === c && 'ring-2 ring-offset-1 ring-foreground scale-110',
                    )}
                    onClick={() => setNewColor(c)}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="terminal"
                  checked={newTerminal}
                  onCheckedChange={setNewTerminal}
                />
                <Label htmlFor="terminal" className="text-sm cursor-pointer">
                  Estado final (cards não podem ser movidos)
                </Label>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full gap-1.5"
              onClick={handleCreateCustom}
              disabled={!newLabel.trim() || createCustom.isPending}
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar coluna
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
