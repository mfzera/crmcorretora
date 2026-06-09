
import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { adminApi, type RoadmapPhase, type RoadmapItem } from '@/infra/http/admin-api';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Textarea } from '@/core/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/core/ui/alert-dialog';
import { Badge } from '@/core/ui/badge';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { Plus, Edit, Trash2, Check, Clock, Circle } from 'lucide-react';
import { Skeleton } from '@/core/ui/skeleton';

interface ManageItemsDialogProps {
  phase: RoadmapPhase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planejado', icon: Circle, color: 'text-gray-400' },
  { value: 'in_progress', label: 'Em Progresso', icon: Clock, color: 'text-blue-500' },
  { value: 'done', label: 'Concluído', icon: Check, color: 'text-emerald-500' },
] as const;

export function ManageItemsDialog({ phase, open, onOpenChange }: ManageItemsDialogProps) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const phaseId = phase.id;

  const { data: fullPhase, isLoading } = useQuery({
    queryKey: ['admin', 'roadmap', 'phase', phaseId],
    queryFn: () => adminApi.getRoadmapPhase(phaseId),
    enabled: open && !!phaseId,
  });

  const resolvedPhaseId = phaseId || fullPhase?.id;
  const items = fullPhase?.items || [];

  const getStatusConfig = (status: string) =>
    STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Itens — {phase.name}</DialogTitle>
          <DialogDescription>
            Adicione, edite ou remova itens desta fase do roadmap
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            onClick={() => setIsAddingItem(true)}
            className="w-full"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Item
          </Button>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum item adicionado ainda</p>
              <p className="text-sm mt-1">Clique em "Adicionar Item" para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const statusConfig = getStatusConfig(item.status);
                const Icon = statusConfig.icon;
                return (
                  <div
                    key={item.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${statusConfig.color}`} />
                          <Badge variant="outline">{statusConfig.label}</Badge>
                        </div>
                        <h4 className="font-medium">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingItem(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingItemId(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>

      {isAddingItem && phaseId && (
        <AddItemDialog
          phaseId={phaseId}
          open={isAddingItem}
          onOpenChange={setIsAddingItem}
        />
      )}

      {editingItem && (
        <EditItemDialog
          item={editingItem}
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
        />
      )}

      <DeleteItemDialog
        itemId={deletingItemId}
        phaseId={phase.id}
        open={!!deletingItemId}
        onOpenChange={() => setDeletingItemId(null)}
      />
    </Dialog>
  );
}

// --- Add Item Dialog ---

interface AddItemDialogProps {
  phaseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AddItemDialog({ phaseId, open, onOpenChange }: AddItemDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('planned');

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.createRoadmapItem(phaseId, {
        title,
        description: description || undefined,
        status: status as 'done' | 'in_progress' | 'planned',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roadmap', 'phase', phaseId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'roadmap'] });
      toast.success('Item adicionado com sucesso');
      resetForm();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast.error(handleApiError(error));
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStatus('planned');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Item</DialogTitle>
          <DialogDescription>Adicione um novo item a esta fase</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-item-title">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="add-item-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Sistema de autenticação"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-item-description">Descrição</Label>
            <Textarea
              id="add-item-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-item-status">
              Status <span className="text-destructive">*</span>
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="add-item-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${s.color}`} />
                        {s.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { resetForm(); onOpenChange(false); }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Edit Item Dialog ---

interface EditItemDialogProps {
  item: RoadmapItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditItemDialog({ item, open, onOpenChange }: EditItemDialogProps) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || '');
  const [status, setStatus] = useState(item.status);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.updateRoadmapItem(item.id, { title, description: description || undefined, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roadmap', 'phase', item.phaseId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'roadmap'] });
      toast.success('Item atualizado com sucesso');
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast.error(handleApiError(error));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Item</DialogTitle>
          <DialogDescription>Atualize as informações do item</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-item-title">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-item-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-item-description">Descrição</Label>
            <Textarea
              id="edit-item-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-item-status">
              Status <span className="text-destructive">*</span>
            </Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger id="edit-item-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${s.color}`} />
                        {s.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Delete Item Dialog ---

interface DeleteItemDialogProps {
  itemId: string | null;
  phaseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DeleteItemDialog({ itemId, phaseId, open, onOpenChange }: DeleteItemDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteRoadmapItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roadmap', 'phase', phaseId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'roadmap'] });
      toast.success('Item deletado com sucesso');
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast.error(handleApiError(error));
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja deletar este item? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => itemId && mutation.mutate(itemId)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Deletar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
