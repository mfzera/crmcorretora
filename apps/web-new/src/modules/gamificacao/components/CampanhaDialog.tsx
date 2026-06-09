
import { useEffect } from 'react';
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
import { Input } from '@/core/ui/input';
import { Textarea } from '@/core/ui/textarea';
import { Label } from '@/core/ui/label';
import { Switch } from '@/core/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { toast } from 'sonner';
import { useCreateCampaign, useUpdateCampaign } from '../http';
import { useSeguradorasParceiras } from '@/modules/seguradoras-parceiras/http';

const schema = z.object({
  titulo: z.string().min(1, 'Título obrigatório').max(255),
  descricao: z.string().min(1, 'Descrição obrigatória'),
  seguradoraParceiraId: z.string().uuid().optional(),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ativa: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface CampanhaDialogProps {
  open: boolean;
  onClose: () => void;
  campanha?: any;
}

export function CampanhaDialog({ open, onClose, campanha }: CampanhaDialogProps) {
  const isEdit = !!campanha;
  const criarCampanha = useCreateCampaign();
  const atualizarCampanha = useUpdateCampaign();
  const { data: seguradoras } = useSeguradorasParceiras({ status: 'ATIVA', limit: 100 });

  const today = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { ativa: true, dataInicio: today },
  });

  const ativa = watch('ativa');

  useEffect(() => {
    if (campanha) {
      reset({
        titulo: campanha.titulo,
        descricao: campanha.descricao,
        seguradoraParceiraId: campanha.seguradoraParceiraId ?? undefined,
        dataInicio: campanha.dataInicio,
        dataFim: campanha.dataFim,
        ativa: campanha.ativa,
      });
    }
  }, [campanha, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await atualizarCampanha.mutateAsync({ id: campanha.id, ...data });
        toast.success('Campanha atualizada!');
      } else {
        await criarCampanha.mutateAsync(data);
        toast.success('Campanha criada!');
      }
      onClose();
      reset();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar campanha');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Campanha' : 'Nova Campanha'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input {...register('titulo')} placeholder="Ex: Porto Seguro - Desconto Auto" />
            {errors.titulo && <p className="text-xs text-destructive mt-1">{errors.titulo.message}</p>}
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              {...register('descricao')}
              rows={3}
              placeholder="Detalhe a campanha, produto, desconto, condições..."
            />
            {errors.descricao && <p className="text-xs text-destructive mt-1">{errors.descricao.message}</p>}
          </div>

          <div>
            <Label>Seguradora Parceira (opcional)</Label>
            <Select
              onValueChange={(v) => setValue('seguradoraParceiraId', v === 'none' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem seguradora associada" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem seguradora</SelectItem>
                {seguradoras?.data?.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data Início</Label>
              <Input type="date" {...register('dataInicio')} />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" {...register('dataFim')} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={ativa}
              onCheckedChange={(v) => setValue('ativa', v)}
            />
            <Label>Campanha ativa</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? 'Salvar' : 'Criar Campanha'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
