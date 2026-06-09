
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Textarea } from '@/core/ui/textarea';
import { Label } from '@/core/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { toast } from 'sonner';
import { useBadgeTipos, useAwardBadge } from '../http';

const schema = z.object({
  badgeTipoId: z.string().uuid('Selecione um badge'),
  observacao: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ConcederBadgeDialogProps {
  open: boolean;
  onClose: () => void;
  usuario: { id: string; nome: string } | null;
}

export function ConcederBadgeDialog({ open, onClose, usuario }: ConcederBadgeDialogProps) {
  const { data: badgeTipos = [] } = useBadgeTipos();
  const concederBadge = useAwardBadge();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    if (!usuario) return;
    try {
      await concederBadge.mutateAsync({
        usuarioId: usuario.id,
        badgeTipoId: data.badgeTipoId,
        observacao: data.observacao,
      });
      toast.success(`Badge concedido a ${usuario.nome}!`);
      onClose();
      reset();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao conceder badge');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Conceder Badge</DialogTitle>
          {usuario && (
            <p className="text-sm text-muted-foreground">Para: {usuario.nome}</p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Badge</Label>
            <Select onValueChange={(v) => setValue('badgeTipoId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar badge" />
              </SelectTrigger>
              <SelectContent>
                {badgeTipos.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.badgeTipoId && (
              <p className="text-xs text-destructive mt-1">{errors.badgeTipoId.message}</p>
            )}
          </div>

          <div>
            <Label>Observação (opcional)</Label>
            <Textarea
              {...register('observacao')}
              rows={2}
              placeholder="Por que está concedendo este badge?"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !usuario}>
              Conceder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
