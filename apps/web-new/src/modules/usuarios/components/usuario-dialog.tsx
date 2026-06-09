
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Switch } from '@/core/ui/switch';
import {
  useCreateUser,
  useUpdateUser,
  useUsuario,
} from '@/modules/usuarios/http';
import { useCargos } from '@/modules/cargos/http';
import type { Usuario } from '@/types/usuario';

// Schema combinado que funciona para ambos os casos
const formSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(256),
  email: z.string().email('Email inválido').toLowerCase().optional(),
  senha: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Senha deve conter letras maiúsculas, minúsculas e números',
    )
    .optional(),
  telefone: z.string().max(20).optional().or(z.literal('')),
  cargoId: z.string().min(1, 'Selecione um cargo'),
  equipeId: z.string().optional().or(z.literal('')),
  ativo: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface UsuarioDialogProps {
  usuarioId?: string | null;
  /** Dados já disponíveis no pai — evita flash de campos vazios ao abrir */
  usuario?: Usuario | null;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UsuarioDialog({
  usuarioId,
  usuario: usuarioProp,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: UsuarioDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const isEditing = !!usuarioId;

  const { data: usuarioDetalhado } = useUsuario(usuarioId || null);
  // Usa dados detalhados se disponíveis, senão cai no prop vindo do pai
  const usuario = usuarioDetalhado ?? usuarioProp;
  const { data: cargos = [] } = useCargos();
  const criarUsuario = useCreateUser();
  const atualizarUsuario = useUpdateUser();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: usuarioProp
      ? {
          nome: usuarioProp.nome,
          email: usuarioProp.email || '',
          telefone: usuarioProp.telefone || '',
          cargoId: usuarioProp.cargo?.id || '',
          equipeId: usuarioProp.equipe?.id || '',
          ativo: usuarioProp.ativo,
        }
      : {
          nome: '',
          email: '',
          senha: '',
          telefone: '',
          cargoId: '',
          equipeId: '',
          ativo: true,
        },
  });

  const ativo = watch('ativo');

  // Carregar dados do usuário ao editar
  useEffect(() => {
    if (!open) return;
    if (isEditing && usuario) {
      reset({
        nome: usuario.nome,
        email: usuario.email || '',
        telefone: usuario.telefone || '',
        cargoId: usuario.cargo?.id || '',
        equipeId: usuario.equipe?.id || '',
        ativo: usuario.ativo,
      });
    } else {
      // Limpa estado antigo enquanto aguarda dados (ou modo criação)
      reset({
        nome: '',
        email: '',
        senha: '',
        telefone: '',
        cargoId: '',
        equipeId: '',
        ativo: true,
      });
    }
  }, [isEditing, usuario, open, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && usuarioId) {
        // Validar campos para edição
        if (!data.nome || !data.cargoId) {
          toast.error('Nome e cargo são obrigatórios');
          return;
        }

        await atualizarUsuario.mutateAsync({
          id: usuarioId,
          data: {
            nome: data.nome,
            email: data.email || undefined,
            telefone: data.telefone || undefined,
            cargoId: data.cargoId || undefined,
            equipeId: data.equipeId || undefined,
            ativo: data.ativo ?? true,
          },
        });
        toast.success('Usuário atualizado com sucesso!');
      } else {
        // Validar campos para criação
        if (!data.email || !data.senha) {
          toast.error('Email e senha são obrigatórios para novos usuários');
          return;
        }

        await criarUsuario.mutateAsync({
          nome: data.nome,
          email: data.email,
          senha: data.senha,
          telefone: data.telefone || undefined,
          cargoId: data.cargoId,
          equipeId: data.equipeId || undefined,
        });
        toast.success('Usuário criado com sucesso!');
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do usuário'
              : 'Preencha os dados para criar um novo usuário'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome">
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nome"
                placeholder="Nome completo"
                {...register('nome')}
                disabled={isSubmitting}
              />
              {errors.nome && (
                <p className="text-sm text-red-500">{errors.nome.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email {!isEditing && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@empresa.com"
                {...register('email')}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                placeholder="(00) 00000-0000"
                {...register('telefone')}
                disabled={isSubmitting}
              />
              {errors.telefone && (
                <p className="text-sm text-red-500">
                  {errors.telefone.message}
                </p>
              )}
            </div>

            {/* Cargo */}
            <div className="space-y-2">
              <Label htmlFor="cargoId">
                Cargo <span className="text-red-500">*</span>
              </Label>
              <Select
                value={watch('cargoId')}
                onValueChange={(value) => setValue('cargoId', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cargo" />
                </SelectTrigger>
                <SelectContent>
                  {cargos.map((cargo) => (
                    <SelectItem key={cargo.id} value={cargo.id}>
                      {cargo.nomeCargo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.cargoId && (
                <p className="text-sm text-red-500">{errors.cargoId.message}</p>
              )}
            </div>

            {/* Senha (apenas criação) */}
            {!isEditing && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="senha">
                  Senha Inicial <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  {...register('senha')}
                  disabled={isSubmitting}
                />
                {errors.senha && (
                  <p className="text-sm text-red-500">{errors.senha.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  A senha deve conter no mínimo 8 caracteres, incluindo letras
                  maiúsculas, minúsculas e números
                </p>
              </div>
            )}

            {/* Status (apenas edição) */}
            {isEditing && (
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="ativo">Status do Usuário</Label>
                    <p className="text-sm text-muted-foreground">
                      {ativo
                        ? 'Usuário pode fazer login no sistema'
                        : 'Usuário não pode fazer login (desativado)'}
                    </p>
                  </div>
                  <Switch
                    id="ativo"
                    checked={ativo}
                    onCheckedChange={(checked) => setValue('ativo', checked)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}
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
              {isEditing ? 'Atualizar' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
