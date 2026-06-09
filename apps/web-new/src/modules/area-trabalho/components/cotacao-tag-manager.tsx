import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/core/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/core/ui/popover';
import { cn } from '@/core/utils';
import {
  useCotacaoTags,
  useCreateCotacaoTag,
  useUpdateCotacaoTag,
  useDeleteCotacaoTag,
  useAddTagToCotacao,
  useRemoveTagFromCotacao,
} from '../http';
import type { CotacaoTag } from '@/types/area-trabalho';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#10b981',
  '#06b6d4', '#3b82f6', '#64748b', '#78716c',
];

// ─── Inline tag badge (used on cards / dialogs) ──────────────────────────────

export function TagBadge({ tag, onRemove }: { tag: CotacaoTag; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
      style={{ backgroundColor: tag.cor }}
    >
      {tag.nome}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="hover:opacity-75 transition-opacity ml-0.5"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

// ─── Color picker ────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [custom, setCustom] = useState(
    PRESET_COLORS.includes(value) ? '' : value,
  );

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-6 gap-1.5">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={cn(
              'h-6 w-6 rounded-full transition-[transform,ring] hover:scale-110',
              value === c && 'ring-2 ring-offset-2 ring-foreground scale-110',
            )}
            style={{ backgroundColor: c }}
            onClick={() => { onChange(c); setCustom(''); }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={custom || value}
          onChange={(e) => { setCustom(e.target.value); onChange(e.target.value); }}
          className="h-6 w-6 cursor-pointer rounded border-0 p-0"
          title="Cor personalizada"
        />
        <span className="text-xs text-muted-foreground">Personalizada</span>
      </div>
    </div>
  );
}

// ─── Tag manager dialog (global: create/edit/delete tags) ────────────────────

export function CotacaoTagManagerDialog() {
  const { data: tags = [], isLoading } = useCotacaoTags();
  const createTag = useCreateCotacaoTag();
  const updateTag = useUpdateCotacaoTag();
  const deleteTag = useDeleteCotacaoTag();

  const [open, setOpen] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newCor, setNewCor] = useState('#6366f1');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCor, setEditCor] = useState('');

  const handleCreate = async () => {
    if (!newNome.trim()) return;
    try {
      await createTag.mutateAsync({ nome: newNome.trim(), cor: newCor });
      setNewNome('');
      setNewCor('#6366f1');
    } catch {
      toast.error('Erro ao criar tag');
    }
  };

  const handleUpdate = async (tagId: string) => {
    try {
      await updateTag.mutateAsync({ tagId, data: { nome: editNome, cor: editCor } });
      setEditingId(null);
    } catch {
      toast.error('Erro ao atualizar tag');
    }
  };

  const handleDelete = async (tagId: string) => {
    try {
      await deleteTag.mutateAsync(tagId);
    } catch {
      toast.error('Erro ao excluir tag');
    }
  };

  const startEdit = (tag: CotacaoTag) => {
    setEditingId(tag.id);
    setEditNome(tag.nome);
    setEditCor(tag.cor);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Gerenciar Tags
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Tags</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create new tag */}
          <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nova tag</p>
            <div className="flex gap-2">
              <Input
                placeholder="Nome da tag"
                value={newNome}
                onChange={(e) => setNewNome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                maxLength={50}
                className="h-8 text-sm"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-8 w-8 shrink-0 rounded-md border transition-[ring] hover:ring-2 hover:ring-ring"
                    style={{ backgroundColor: newCor }}
                    title="Escolher cor"
                  />
                </PopoverTrigger>
                <PopoverContent className="w-52 p-3">
                  <ColorPicker value={newCor} onChange={setNewCor} />
                </PopoverContent>
              </Popover>
              <Button
                size="sm"
                className="h-8 px-2"
                onClick={handleCreate}
                disabled={!newNome.trim() || createTag.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tag list */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
            ) : tags.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tag criada ainda</p>
            ) : (
              tags.map((tag) => (
                <div key={tag.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 group">
                  {editingId === tag.id ? (
                    <>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="h-6 w-6 shrink-0 rounded-full border"
                            style={{ backgroundColor: editCor }}
                          />
                        </PopoverTrigger>
                        <PopoverContent className="w-52 p-3">
                          <ColorPicker value={editCor} onChange={setEditCor} />
                        </PopoverContent>
                      </Popover>
                      <Input
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(tag.id); if (e.key === 'Escape') setEditingId(null); }}
                        className="h-6 text-xs flex-1"
                        maxLength={50}
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleUpdate(tag.id)} disabled={updateTag.isPending}>
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: tag.cor }} />
                      <span className="flex-1 text-sm">{tag.nome}</span>
                      {tag.isOwn && (
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(tag)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDelete(tag.id)} disabled={deleteTag.isPending}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tag selector (attach/detach tags to a specific cotacao) ─────────────────

interface CotacaoTagSelectorProps {
  cotacaoId: string;
  currentTags: CotacaoTag[];
}

export function CotacaoTagSelector({ cotacaoId, currentTags }: CotacaoTagSelectorProps) {
  const { data: allTags = [] } = useCotacaoTags();
  const addTag = useAddTagToCotacao();
  const removeTag = useRemoveTagFromCotacao();
  const [open, setOpen] = useState(false);
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(() => new Set(currentTags.map((t) => t.id)));

  // Sync when prop changes after refetch
  const tagsKey = currentTags.map((t) => t.id).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setOptimisticIds(new Set(currentTags.map((t) => t.id))); }, [tagsKey]);

  const toggle = async (tagId: string) => {
    const removing = optimisticIds.has(tagId);
    setOptimisticIds((prev) => {
      const next = new Set(prev);
      if (removing) next.delete(tagId); else next.add(tagId);
      return next;
    });
    try {
      if (removing) {
        await removeTag.mutateAsync({ cotacaoId, tagId });
      } else {
        await addTag.mutateAsync({ cotacaoId, tagId });
      }
    } catch {
      // Rollback on error
      setOptimisticIds((prev) => {
        const next = new Set(prev);
        if (removing) next.add(tagId); else next.delete(tagId);
        return next;
      });
      toast.error(removing ? 'Erro ao remover tag' : 'Erro ao adicionar tag');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
          <Plus className="h-3 w-3" />
          Tags
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="start">
        <p className="text-xs font-medium text-muted-foreground px-2 mb-1.5">Selecionar tags</p>
        {allTags.length === 0 ? (
          <p className="text-xs text-muted-foreground px-2 py-1">Nenhuma tag disponível</p>
        ) : (
          <div className="space-y-0.5">
            {allTags.map((tag) => {
              const selected = optimisticIds.has(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggle(tag.id)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted transition-colors"
                >
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: tag.cor }} />
                  <span className="flex-1 text-left truncate">{tag.nome}</span>
                  {selected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
