
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type Changelog } from '@/infra/http/admin-api';
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
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';

interface EditChangelogDialogProps {
  changelog: Changelog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditChangelogDialog({
  changelog,
  open,
  onOpenChange,
}: EditChangelogDialogProps) {
  const [title, setTitle] = useState(changelog.title);
  const [description, setDescription] = useState(changelog.description || '');
  const [releaseDate, setReleaseDate] = useState(
    changelog.releaseDate?.split('T')[0] ?? '',
  );

  const queryClient = useQueryClient();

  useEffect(() => {
    setTitle(changelog.title);
    setDescription(changelog.description || '');
    setReleaseDate(changelog.releaseDate?.split('T')[0] ?? '');
  }, [changelog]);

  const mutation = useMutation({
    mutationFn: () => {
      // Convert date string to ISO datetime — use T12:00:00Z (noon UTC) to avoid
      // timezone-shift issues where new Date("YYYY-MM-DD") is treated as UTC midnight,
      // causing the date to appear one day earlier in UTC-3 (Brazil).
      const releaseDateISO = new Date(`${releaseDate}T12:00:00Z`).toISOString();

      return adminApi.updateChangelog(changelog.id, {
        title,
        description: description || undefined,
        releaseDate: releaseDateISO,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'changelogs'] });
      toast.success('Changelog atualizado com sucesso');
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Changelog - {changelog.version}</DialogTitle>
          <DialogDescription>
            Atualize as informações do changelog. A versão não pode ser
            alterada.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-version">Versão</Label>
            <Input
              id="edit-version"
              value={changelog.version}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              A versão não pode ser alterada após a criação
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-releaseDate">
              Data de Lançamento <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-releaseDate"
              type="date"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-title">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Descrição</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
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
              {mutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
