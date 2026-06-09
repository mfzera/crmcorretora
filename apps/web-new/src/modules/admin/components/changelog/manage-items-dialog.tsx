
import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { adminApi, type Changelog, type ChangelogItem } from '@/infra/http/admin-api';
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
import { Plus, Edit, Trash2, Bug, Sparkles, Zap, AlertTriangle, Shield, FileText } from 'lucide-react';
import { Skeleton } from '@/core/ui/skeleton';

interface ManageItemsDialogProps {
  changelog: Changelog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ITEM_TYPES = [
  { value: 'feature', label: 'Nova Funcionalidade', icon: Sparkles, color: 'text-blue-500' },
  { value: 'bugfix', label: 'Correção de Bug', icon: Bug, color: 'text-red-500' },
  { value: 'improvement', label: 'Melhoria', icon: Zap, color: 'text-yellow-500' },
  { value: 'breaking', label: 'Breaking Change', icon: AlertTriangle, color: 'text-orange-500' },
  { value: 'security', label: 'Segurança', icon: Shield, color: 'text-purple-500' },
  { value: 'documentation', label: 'Documentação', icon: FileText, color: 'text-green-500' },
] as const;

export function ManageItemsDialog({
  changelog,
  open,
  onOpenChange,
}: ManageItemsDialogProps) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<ChangelogItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: fullChangelog, isLoading } = useQuery({
    queryKey: ['admin', 'changelog', changelog.id],
    queryFn: () => adminApi.getChangelog(changelog.id),
    enabled: open,
  });

  const items = fullChangelog?.items || [];

  const getTypeConfig = (type: string) => {
    return ITEM_TYPES.find((t) => t.value === type) || ITEM_TYPES[0];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Gerenciar Itens - {changelog.version}: {changelog.title}
          </DialogTitle>
          <DialogDescription>
            Adicione, edite ou remova itens deste changelog
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
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum item adicionado ainda</p>
              <p className="text-sm mt-1">
                Clique em "Adicionar Item" para começar
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const typeConfig = getTypeConfig(item.type);
                const Icon = typeConfig.icon;
                return (
                  <div
                    key={item.id}
                    className="border rounded-lg p-4 space-y-2 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${typeConfig.color}`} />
                          <Badge variant="outline">{typeConfig.label}</Badge>
                        </div>
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
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

      {isAddingItem && (
        <AddItemDialog
          changelogId={changelog.id}
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
        open={!!deletingItemId}
        onOpenChange={() => setDeletingItemId(null)}
      />
    </Dialog>
  );
}

interface AddItemDialogProps {
  changelogId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AddItemDialog({ changelogId, open, onOpenChange }: AddItemDialogProps) {
  const [type, setType] = useState<string>('feature');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.createChangelogItem(changelogId, {
        type: type as any,
        title,
        description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'changelog', changelogId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'changelogs'] });
      toast.success('Item adicionado com sucesso');
      resetForm();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast.error(handleApiError(error));
    },
  });

  const resetForm = () => {
    setType('feature');
    setTitle('');
    setDescription('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Item</DialogTitle>
          <DialogDescription>
            Adicione um novo item ao changelog
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-type">
              Tipo <span className="text-destructive">*</span>
            </Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="add-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map((itemType) => {
                  const Icon = itemType.icon;
                  return (
                    <SelectItem key={itemType.value} value={itemType.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${itemType.color}`} />
                        {itemType.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-title">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="add-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Novo sistema de busca avançada"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-description">
              Descrição <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="add-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a mudança em detalhes..."
              rows={4}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
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

interface EditItemDialogProps {
  item: ChangelogItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditItemDialog({ item, open, onOpenChange }: EditItemDialogProps) {
  const [type, setType] = useState(item.type);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.updateChangelogItem(item.id, {
        type: type as any,
        title,
        description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'changelog', item.changelogId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'changelogs'] });
      toast.success('Item atualizado com sucesso');
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast.error(handleApiError(error));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Item</DialogTitle>
          <DialogDescription>Atualize as informações do item</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-type">
              Tipo <span className="text-destructive">*</span>
            </Label>
            <Select value={type} onValueChange={setType as any}>
              <SelectTrigger id="edit-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map((itemType) => {
                  const Icon = itemType.icon;
                  return (
                    <SelectItem key={itemType.value} value={itemType.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${itemType.color}`} />
                        {itemType.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

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
            <Label htmlFor="edit-item-description">
              Descrição <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="edit-item-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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

interface DeleteItemDialogProps {
  itemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DeleteItemDialog({ itemId, open, onOpenChange }: DeleteItemDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteChangelogItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'changelog'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'changelogs'] });
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
            Tem certeza que deseja deletar este item? Esta ação não pode ser
            desfeita.
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
