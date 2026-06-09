
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError, applyApiErrorsToForm } from '@/core/utils/handle-api-error';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Textarea } from '@/core/ui/textarea';
import { Switch } from '@/core/ui/switch';
import {
  useCreateCargo,
  useUpdateCargo,
  useCargo,
} from '@/modules/cargos/http';

const cargoSchema = z.object({
  nomeCargo: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  descricao: z.string().max(500).optional().or(z.literal('')),
  cor: z.string().optional(),
});

const CORES_DISPONIVEIS = [
  { valor: 'blue', nome: 'Azul', cor: '#3b82f6' },
  { valor: 'green', nome: 'Verde', cor: '#22c55e' },
  { valor: 'purple', nome: 'Roxo', cor: '#a855f7' },
  { valor: 'orange', nome: 'Laranja', cor: '#f97316' },
  { valor: 'pink', nome: 'Rosa', cor: '#ec4899' },
  { valor: 'red', nome: 'Vermelho', cor: '#ef4444' },
  { valor: 'yellow', nome: 'Amarelo', cor: '#eab308' },
  { valor: 'indigo', nome: 'Índigo', cor: '#6366f1' },
  { valor: 'teal', nome: 'Turquesa', cor: '#14b8a6' },
  { valor: 'cyan', nome: 'Ciano', cor: '#06b6d4' },
  { valor: 'gray', nome: 'Cinza', cor: '#6b7280' },
  { valor: 'slate', nome: 'Ardósia', cor: '#64748b' },
];

type FormData = z.infer<typeof cargoSchema>;

interface CargoDialogProps {
  cargoId?: string | null;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CargoDialog({
  cargoId,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: CargoDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const isEditing = !!cargoId;

  const { data: cargo } = useCargo(cargoId || null);
  const criarCargo = useCreateCargo();
  const atualizarCargo = useUpdateCargo();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(cargoSchema),
    defaultValues: {
      nomeCargo: '',
      descricao: '',
      cor: 'blue',
    },
  });

  const corSelecionada = watch('cor');

  // Verificar se é cargo Admin
  const isAdmin = cargo?.isAdmin || false;

  // Carregar dados do cargo ao editar
  useEffect(() => {
    if (isEditing && cargo && open) {
      reset({
        nomeCargo: cargo.nomeCargo,
        descricao: cargo.descricao || '',
        cor: cargo.cor || 'blue',
      });
    } else if (!isEditing && open) {
      reset({
        nomeCargo: '',
        descricao: '',
        cor: 'blue',
      });
    }
  }, [isEditing, cargo, open, reset]);

  const onSubmit = async (data: FormData) => {
    if (isAdmin) {
      toast.error('Não é possível editar o cargo de Administrador');
      return;
    }

    try {
      if (isEditing && cargoId) {
        await atualizarCargo.mutateAsync({
          id: cargoId,
          nomeCargo: data.nomeCargo,
          descricao: data.descricao || undefined,
          cor: data.cor,
        });
        toast.success('Cargo atualizado com sucesso!');
      } else {
        await criarCargo.mutateAsync({
          nomeCargo: data.nomeCargo,
          descricao: data.descricao || undefined,
          cor: data.cor || 'blue',
        });
        toast.success('Cargo criado com sucesso!');
      }
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      if (!applyApiErrorsToForm(error, setError)) {
        toast.error(handleApiError(error));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Cargo' : 'Novo Cargo'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do cargo'
              : 'Crie um novo cargo personalizado para sua equipe'}
          </DialogDescription>
        </DialogHeader>

        {isAdmin ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              O cargo de Administrador não pode ser editado.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Nome do Cargo */}
            <div className="space-y-2">
              <Label htmlFor="nomeCargo">
                Nome do Cargo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nomeCargo"
                placeholder="Ex: Atendente, Supervisor, etc."
                {...register('nomeCargo')}
                disabled={isSubmitting}
              />
              {errors.nomeCargo && (
                <p className="text-sm text-red-500">
                  {errors.nomeCargo.message}
                </p>
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva as responsabilidades deste cargo..."
                rows={3}
                {...register('descricao')}
                disabled={isSubmitting}
              />
              {errors.descricao && (
                <p className="text-sm text-red-500">
                  {errors.descricao.message}
                </p>
              )}
            </div>

            {/* Seletor de Cor */}
            <div className="space-y-2">
              <Label>Cor do Cargo</Label>
              <div className="grid grid-cols-6 gap-2">
                {CORES_DISPONIVEIS.map((cor) => {
                  const isSelected = corSelecionada === cor.valor;

                  return (
                    <button
                      key={cor.valor}
                      type="button"
                      onClick={() => {
                        setValue('cor', cor.valor);
                      }}
                      disabled={isSubmitting}
                      style={{
                        backgroundColor: cor.cor,
                        borderWidth: '3px',
                        borderColor: isSelected ? '#000000' : 'transparent',
                        transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                        opacity: isSelected ? 1 : 0.7,
                      }}
                      className="h-10 w-full rounded-md transition-all hover:scale-105 hover:opacity-100"
                      title={`${cor.nome} ${isSelected ? '(Selecionada)' : ''}`}
                    />
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Selecione uma cor para identificar visualmente este cargo
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? 'Atualizar' : 'Criar Cargo'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
