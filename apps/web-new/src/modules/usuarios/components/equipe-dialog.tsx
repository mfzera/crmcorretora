
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import { Label } from '@/core/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { useCreateEquipe, useUpdateEquipe } from '@/modules/equipes/http';
import { useUsuarios } from '@/modules/usuarios/http';
import type { Equipe } from '@/types/equipe';

const schema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  gestorId: z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

interface EquipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipe?: Equipe | null;
}

export function EquipeDialog({ open, onOpenChange, equipe }: EquipeDialogProps) {
  const isEditing = !!equipe;
  const createEquipe = useCreateEquipe();
  const updateEquipe = useUpdateEquipe();
  const { data: usuariosData } = useUsuarios({ limit: 100 });
  const usuarios = usuariosData?.data ?? [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '', gestorId: null },
  });

  const gestorId = watch('gestorId');

  useEffect(() => {
    if (open) {
      reset({
        nome: equipe?.nome ?? '',
        gestorId: equipe?.gestorId ?? null,
      });
    }
  }, [open, equipe, reset]);

  const onSubmit = async (data: FormData) => {
    if (isEditing && equipe) {
      await updateEquipe.mutateAsync({ id: equipe.id, ...data });
    } else {
      await createEquipe.mutateAsync({ nome: data.nome, gestorId: data.gestorId });
    }
    onOpenChange(false);
  };

  const isPending = createEquipe.isPending || updateEquipe.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Equipe' : 'Nova Equipe'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome da equipe</Label>
            <Input id="nome" {...register('nome')} placeholder="Ex: Equipe Sul" />
            {errors.nome && (
              <p className="text-xs text-destructive">{errors.nome.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Lider</Label>
            <Select
              value={gestorId ?? 'none'}
              onValueChange={(v) => setValue('gestorId', v === 'none' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar lider (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem lider</SelectItem>
                {usuarios.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
