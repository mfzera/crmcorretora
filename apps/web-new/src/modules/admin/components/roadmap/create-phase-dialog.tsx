
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/infra/http/admin-api';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Switch } from '@/core/ui/switch';
import { MonthPicker } from '@/core/ui/month-picker';
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

interface CreatePhaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePhaseDialog({ open, onOpenChange }: CreatePhaseDialogProps) {
  const [name, setName] = useState('');
  const [estimatedDate, setEstimatedDate] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.createRoadmapPhase({ name, estimatedDate, isPublished }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roadmap'] });
      toast.success('Fase criada com sucesso');
      resetForm();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast.error(handleApiError(error));
    },
  });

  const resetForm = () => {
    setName('');
    setEstimatedDate('');
    setIsPublished(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!estimatedDate) {
      toast.error('Selecione a data estimada');
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Nova Fase</DialogTitle>
          <DialogDescription>
            Crie uma nova fase do roadmap com nome e data estimada.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phase-name">
              Nome da fase <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phase-name"
              placeholder="Ex: Fundação, Expansão..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>
              Data estimada (mês/ano) <span className="text-destructive">*</span>
            </Label>
            <MonthPicker
              value={estimatedDate}
              onChange={setEstimatedDate}
              placeholder="Selecione o mês/ano"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="phase-published"
              checked={isPublished}
              onCheckedChange={setIsPublished}
            />
            <Label htmlFor="phase-published" className="cursor-pointer">
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
              {mutation.isPending ? 'Criando...' : 'Criar Fase'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
