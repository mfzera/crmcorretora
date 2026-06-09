
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
import { useCreateMission, useUpdateMission, useBadgeTipos } from '../http';

const schema = z.object({
  titulo: z.string().min(1, 'Título obrigatório').max(255),
  descricao: z.string().optional(),
  tipoMetrica: z.enum(['novos_seguros', 'renovacoes', 'cotacoes', 'valor_premio', 'taxa_renovacao', 'premio_renovacao']),
  valorAlvo: z.coerce.number().positive('Valor deve ser positivo'),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  prazo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  destinatario: z.enum(['equipe', 'usuario']),
  equipeId: z.string().uuid().optional(),
  usuarioId: z.string().uuid().optional(),
  badgeTipoId: z.string().uuid().optional(),
  badgeObservacao: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface MissaoDialogProps {
  open: boolean;
  onClose: () => void;
  missao?: any;
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

export function MissaoDialog({ open, onClose, missao, equipes = [], usuarios = [] }: MissaoDialogProps) {
  const isEdit = !!missao;
  const criarMissao = useCreateMission();
  const atualizarMissao = useUpdateMission();
  const { data: badgeTipos = [] } = useBadgeTipos();

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
      destinatario: 'usuario',
      dataInicio: today,
    },
  });

  const destinatario = watch('destinatario');

  useEffect(() => {
    if (missao) {
      reset({
        titulo: missao.titulo,
        descricao: missao.descricao ?? '',
        tipoMetrica: missao.tipoMetrica,
        valorAlvo: parseFloat(missao.valorAlvo),
        dataInicio: missao.dataInicio,
        prazo: missao.prazo,
        destinatario: missao.equipeId ? 'equipe' : 'usuario',
        equipeId: missao.equipeId ?? undefined,
        usuarioId: missao.usuarioId ?? undefined,
        badgeTipoId: missao.badgeTipoId ?? undefined,
        badgeObservacao: missao.badgeObservacao ?? '',
      });
    }
  }, [missao, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload: any = {
        titulo: data.titulo,
        descricao: data.descricao || undefined,
        tipoMetrica: data.tipoMetrica,
        valorAlvo: data.valorAlvo,
        dataInicio: data.dataInicio,
        prazo: data.prazo,
        equipeId: data.destinatario === 'equipe' ? data.equipeId : undefined,
        usuarioId: data.destinatario === 'usuario' ? data.usuarioId : undefined,
        badgeTipoId: data.badgeTipoId || undefined,
        badgeObservacao: data.badgeObservacao || undefined,
      };

      if (isEdit) {
        await atualizarMissao.mutateAsync({ id: missao.id, ...payload });
        toast.success('Missão atualizada!');
      } else {
        await criarMissao.mutateAsync(payload);
        toast.success('Missão criada com sucesso!');
      }
      onClose();
      reset();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar missão');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Missão' : 'Nova Missão'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input {...register('titulo')} placeholder="Ex: Fechar 5 seguros novos" />
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
              <Label>Valor Alvo</Label>
              <Input type="number" step="any" {...register('valorAlvo')} placeholder="Ex: 5" />
              {errors.valorAlvo && <p className="text-xs text-destructive mt-1">{errors.valorAlvo.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data Início</Label>
              <Input type="date" {...register('dataInicio')} />
            </div>
            <div>
              <Label>Prazo</Label>
              <Input type="date" {...register('prazo')} />
            </div>
          </div>

          <div>
            <Label>Atribuir a</Label>
            <Select
              defaultValue="usuario"
              onValueChange={(v) => setValue('destinatario', v as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {usuarios.length > 0 && <SelectItem value="usuario">Usuário específico</SelectItem>}
                {equipes.length > 0 && <SelectItem value="equipe">Equipe</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          {destinatario === 'usuario' && usuarios.length > 0 && (
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

          {destinatario === 'equipe' && equipes.length > 0 && (
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

          {badgeTipos.length > 0 && (
            <div>
              <Label>Badge de Recompensa (opcional)</Label>
              <Select onValueChange={(v) => setValue('badgeTipoId', v === 'none' ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum badge" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem badge</SelectItem>
                  {badgeTipos.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
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
              {isEdit ? 'Salvar' : 'Criar Missão'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
