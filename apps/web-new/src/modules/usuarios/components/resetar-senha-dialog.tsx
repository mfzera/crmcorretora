
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Key } from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';

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
import { useResetarSenha } from '@/modules/usuarios/http';
import type { Usuario } from '@/types/usuario';

const resetarSenhaSchema = z.object({
  novaSenha: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Senha deve conter letras maiúsculas, minúsculas e números'
    ),
  confirmarSenha: z.string(),
}).refine((data) => data.novaSenha === data.confirmarSenha, {
  message: 'As senhas não coincidem',
  path: ['confirmarSenha'],
});

type FormData = z.infer<typeof resetarSenhaSchema>;

interface ResetarSenhaDialogProps {
  usuario: Usuario;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ResetarSenhaDialog({
  usuario,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: ResetarSenhaDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const resetarSenha = useResetarSenha();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(resetarSenhaSchema),
    defaultValues: {
      novaSenha: '',
      confirmarSenha: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await resetarSenha.mutateAsync({
        id: usuario.id,
        novaSenha: data.novaSenha,
      });
      toast.success(
        'Senha resetada com sucesso! O usuário deverá alterá-la no próximo login.'
      );
      reset();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Resetar Senha
          </DialogTitle>
          <DialogDescription>
            Defina uma nova senha para <span className="font-semibold">{usuario.nome}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              O usuário será marcado como "primeiro acesso" e será obrigado a
              mudar a senha no próximo login.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="novaSenha">
              Nova Senha <span className="text-red-500">*</span>
            </Label>
            <Input
              id="novaSenha"
              type="password"
              placeholder="Mínimo 8 caracteres"
              {...register('novaSenha')}
              disabled={isSubmitting}
            />
            {errors.novaSenha && (
              <p className="text-sm text-red-500">{errors.novaSenha.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmarSenha">
              Confirmar Senha <span className="text-red-500">*</span>
            </Label>
            <Input
              id="confirmarSenha"
              type="password"
              placeholder="Digite a senha novamente"
              {...register('confirmarSenha')}
              disabled={isSubmitting}
            />
            {errors.confirmarSenha && (
              <p className="text-sm text-red-500">
                {errors.confirmarSenha.message}
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            A senha deve conter no mínimo 8 caracteres, incluindo letras
            maiúsculas, minúsculas e números
          </p>

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
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Resetar Senha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
