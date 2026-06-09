
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type RoadmapPhase } from '@/infra/http/admin-api';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
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

interface EditPhaseDialogProps {
  phase: RoadmapPhase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPhaseDialog({ phase, open, onOpenChange }: EditPhaseDialogProps) {
  const [name, setName] = useState(phase.name);
  const [estimatedDate, setEstimatedDate] = useState(phase.estimatedDate);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.updateRoadmapPhase(phase.id, { name, estimatedDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roadmap'] });
      toast.success('Fase atualizada com sucesso');
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Fase</DialogTitle>
          <DialogDescription>Atualize as informações da fase.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-phase-name">
              Nome da fase <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-phase-name"
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
