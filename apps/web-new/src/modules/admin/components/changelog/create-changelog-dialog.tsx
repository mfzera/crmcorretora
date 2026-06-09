
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/infra/http/admin-api';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Textarea } from '@/core/ui/textarea';
import { Switch } from '@/core/ui/switch';
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

interface CreateChangelogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateChangelogDialog({
  open,
  onOpenChange,
}: CreateChangelogDialogProps) {
  const [version, setVersion] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      // Convert date string to ISO datetime — use T12:00:00Z (noon UTC) to avoid
      // timezone-shift issues where new Date("YYYY-MM-DD") is treated as UTC midnight,
      // causing the date to appear one day earlier in UTC-3 (Brazil).
      const releaseDateISO = new Date(`${releaseDate}T12:00:00Z`).toISOString();

      return adminApi.createChangelog({
        version,
        title,
        description: description || undefined,
        releaseDate: releaseDateISO,
        isPublished,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'changelogs'] });
      toast.success('Changelog criado com sucesso');
      resetForm();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast.error(handleApiError(error));
    },
  });

  const resetForm = () => {
    setVersion('');
    setTitle('');
    setDescription('');
    setReleaseDate('');
    setIsPublished(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate version format
    const versionRegex = /^\d+\.\d+\.\d+(\.\d+){0,2}$/;
    if (!versionRegex.test(version)) {
      toast.error('Formato de versão inválido', {
        description: 'Use o formato X.Y.Z (ex: 1.2.3 ou 1.2.3.4.5)',
      });
      return;
    }

    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Novo Changelog</DialogTitle>
          <DialogDescription>
            Crie um novo registro de alterações para documentar as mudanças da
            versão.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="version">
                Versão <span className="text-destructive">*</span>
              </Label>
              <Input
                id="version"
                placeholder="1.0.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Formato: X.Y.Z (ex: 1.2.3 ou 1.2.3.4.5)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="releaseDate">
                Data de Lançamento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="releaseDate"
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Ex: Melhorias de performance e correções"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descrição opcional detalhando as mudanças principais..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isPublished"
              checked={isPublished}
              onCheckedChange={setIsPublished}
            />
            <Label htmlFor="isPublished" className="cursor-pointer">
              Publicar imediatamente
            </Label>
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
              {mutation.isPending ? 'Criando...' : 'Criar Changelog'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
