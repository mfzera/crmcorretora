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
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from '@/core/ui/textarea';
import { Switch } from '@/core/ui/switch';
import {
  useCreateVendedor,
  useUpdateVendedor,
  useVendedor,
  type VendedorTipo,
} from '@/modules/vendedores/http';

const formSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(256),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().max(20).optional().or(z.literal('')),
  tipo: z.enum(['principal', 'secundario', 'externo'] as const),
  observacoes: z.string().optional().or(z.literal('')),
  ativo: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

const TIPO_LABELS: Record<VendedorTipo, string> = {
  principal: 'Principal',
  secundario: 'Secundário',
  externo: 'Externo',
};

interface VendedorDialogProps {
  vendedorId?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function VendedorDialog({
  vendedorId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: VendedorDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const isEditing = !!vendedorId;
  const { data: vendedor } = useVendedor(vendedorId || null);
  const createMutation = useCreateVendedor();
  const updateMutation = useUpdateVendedor();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      email: '',
      telefone: '',
      tipo: 'principal',
      observacoes: '',
      ativo: true,
    },
  });

  useEffect(() => {
    if (open && vendedor && isEditing) {
      reset({
        nome: vendedor.nome,
        email: vendedor.email ?? '',
        telefone: vendedor.telefone ?? '',
        tipo: vendedor.tipo,
        observacoes: vendedor.observacoes ?? '',
        ativo: vendedor.ativo,
      });
    } else if (open && !isEditing) {
      reset({
        nome: '',
        email: '',
        telefone: '',
        tipo: 'principal',
        observacoes: '',
        ativo: true,
      });
    }
  }, [open, vendedor, isEditing, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        nome: data.nome,
        email: data.email || undefined,
        telefone: data.telefone || undefined,
        tipo: data.tipo,
        observacoes: data.observacoes || undefined,
      };

      if (isEditing && vendedorId) {
        await updateMutation.mutateAsync({
          id: vendedorId,
          data: { ...payload, ativo: data.ativo },
        });
        toast.success('Vendedor atualizado com sucesso');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Vendedor criado com sucesso');
      }

      setOpen(false);
      onSuccess?.();
    } catch (err) {
      const handled = applyApiErrorsToForm(err, setError);
      if (!handled) handleApiError(err);
    }
  };

  const tipoValue = watch('tipo');
  const atoValue = watch('ativo');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Vendedor' : 'Novo Vendedor'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" {...register('nome')} placeholder="Nome completo" />
            {errors.nome && (
              <p className="text-sm text-destructive">{errors.nome.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo</Label>
            <Select
              value={tipoValue}
              onValueChange={(v) => setValue('tipo', v as VendedorTipo)}
            >
              <SelectTrigger id="tipo">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (contato)</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="email@exemplo.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              {...register('telefone')}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              {...register('observacoes')}
              placeholder="Notas internas sobre o vendedor"
              rows={3}
            />
          </div>

          {isEditing && (
            <div className="flex items-center gap-3">
              <Switch
                id="ativo"
                checked={atoValue}
                onCheckedChange={(v) => setValue('ativo', v)}
              />
              <Label htmlFor="ativo">Vendedor ativo</Label>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
