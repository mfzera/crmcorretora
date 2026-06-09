
import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { toast } from 'sonner';
import { useCreateGoal, useUpdateGoal } from '../http';

const schema = z.object({
  titulo: z.string().min(1, 'Título obrigatório').max(255),
  descricao: z.string().optional(),
  tipoMetrica: z.enum(['novos_seguros', 'renovacoes', 'cotacoes', 'valor_premio', 'taxa_renovacao', 'premio_renovacao']),
  valorAlvo: z.coerce.number().positive('Valor deve ser positivo'),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  escopo: z.enum(['corretora', 'equipe', 'usuario']).optional(),
  equipeId: z.string().uuid().optional(),
  usuarioId: z.string().uuid().optional(),
});

type FormData = z.infer<typeof schema>;

interface MetaDialogProps {
  open: boolean;
  onClose: () => void;
  meta?: any; // existing meta for edit mode
  equipes?: { id: string; nome: string }[];
  usuarios?: { id: string; nome: string }[];
}

const metricaOpcoes = [
  { value: 'novos_seguros', label: 'Novos Seguros' },
  { value: 'renovacoes', label: 'Renovações (quantidade)' },
  { value: 'cotacoes', label: 'Cotações' },
  { value: 'valor_premio', label: 'Valor de Prêmio (R$)' },
  { value: 'taxa_renovacao', label: 'Taxa de Renovação (%)' },
  { value: 'premio_renovacao', label: 'Prêmio de Renovações (R$)' },
];

export function MetaDialog({ open, onClose, meta, equipes = [], usuarios = [] }: MetaDialogProps) {
  const isEdit = !!meta;
  const criarMeta = useCreateGoal();
  const atualizarMeta = useUpdateGoal();

  const today = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      tipoMetrica: 'novos_seguros',
      escopo: 'corretora',
      dataInicio: today,
    },
  });

  const escopo = watch('escopo');
  const tipoMetrica = watch('tipoMetrica');

  useEffect(() => {
    if (meta) {
      reset({
        titulo: meta.titulo,
        descricao: meta.descricao ?? '',
        tipoMetrica: meta.tipoMetrica,
        valorAlvo: parseFloat(meta.valorAlvo),
        dataInicio: meta.dataInicio,
        dataFim: meta.dataFim,
        escopo: meta.equipeId ? 'equipe' : meta.usuarioId ? 'usuario' : 'corretora',
        equipeId: meta.equipeId ?? undefined,
        usuarioId: meta.usuarioId ?? undefined,
      });
    }
  }, [meta, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload: any = {
        titulo: data.titulo,
        descricao: data.descricao || undefined,
        tipoMetrica: data.tipoMetrica,
        valorAlvo: data.valorAlvo,
        dataInicio: data.dataInicio,
        dataFim: data.dataFim,
        equipeId: data.escopo === 'equipe' ? data.equipeId : undefined,
        usuarioId: data.escopo === 'usuario' ? data.usuarioId : undefined,
      };

      if (isEdit) {
        await atualizarMeta.mutateAsync({ id: meta.id, ...payload });
        toast.success('Meta atualizada!');
      } else {
        await criarMeta.mutateAsync(payload);
        toast.success('Meta criada com sucesso!');
      }
      onClose();
      reset();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar meta');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input {...register('titulo')} placeholder="Ex: 10 novos seguros em março" />
            {errors.titulo && <p className="text-xs text-destructive mt-1">{errors.titulo.message}</p>}
          </div>

          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea {...register('descricao')} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Métrica</Label>
              <Select
                defaultValue="novos_seguros"
                onValueChange={(v) => setValue('tipoMetrica', v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {metricaOpcoes.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                Valor Alvo{tipoMetrica === 'taxa_renovacao' ? ' (%)' : tipoMetrica === 'valor_premio' || tipoMetrica === 'premio_renovacao' ? ' (R$)' : ''}
              </Label>
              <Input
                type="number"
                step="any"
                {...register('valorAlvo')}
                placeholder={tipoMetrica === 'taxa_renovacao' ? 'Ex: 80' : 'Ex: 10'}
                max={tipoMetrica === 'taxa_renovacao' ? 100 : undefined}
              />
              {errors.valorAlvo && <p className="text-xs text-destructive mt-1">{errors.valorAlvo.message}</p>}
            </div>
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

          <div>
            <Label>Escopo</Label>
            <Select
              defaultValue="corretora"
              onValueChange={(v) => setValue('escopo', v as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="corretora">Toda a corretora</SelectItem>
                {equipes.length > 0 && <SelectItem value="equipe">Equipe específica</SelectItem>}
                {usuarios.length > 0 && <SelectItem value="usuario">Usuário específico</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          {escopo === 'equipe' && equipes.length > 0 && (
            <div>
              <Label>Equipe</Label>
              <Select onValueChange={(v) => setValue('equipeId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar equipe" />
                </SelectTrigger>
                <SelectContent>
                  {equipes.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {escopo === 'usuario' && usuarios.length > 0 && (
            <div>
              <Label>Usuário</Label>
              <Select onValueChange={(v) => setValue('usuarioId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar usuário" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? 'Salvar' : 'Criar Meta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
