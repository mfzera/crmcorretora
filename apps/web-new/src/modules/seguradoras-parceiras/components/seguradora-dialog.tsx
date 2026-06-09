
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/core/ui/form';
import { Input } from '@/core/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { toast } from 'sonner';
import { handleApiError, applyApiErrorsToForm } from '@/core/utils/handle-api-error';
import {
  useCreateInsurancePartner,
  useUpdateInsurancePartner,
  useSeguradoraParceira,
} from '@/modules/seguradoras-parceiras/http';

const schema = z.object({
  cnpj: z
    .string()
    .min(1, 'CNPJ é obrigatório')
    .regex(
      /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
      'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX',
    ),
  razaoSocial: z
    .string()
    .min(1, 'Razão social é obrigatória')
    .max(255, 'Razão social deve ter no máximo 255 caracteres'),
  nomeFantasia: z
    .string()
    .max(255, 'Nome fantasia deve ter no máximo 255 caracteres')
    .optional(),
  telefone: z
    .string()
    .max(20, 'Telefone deve ter no máximo 20 caracteres')
    .optional(),
  email: z
    .string()
    .email('Email inválido')
    .max(255, 'Email deve ter no máximo 255 caracteres')
    .optional()
    .or(z.literal('')),
  telefone24h: z
    .string()
    .max(20, 'Telefone 24h deve ter no máximo 20 caracteres')
    .optional(),
  whatsapp24h: z
    .string()
    .max(20, 'WhatsApp 24h deve ter no máximo 20 caracteres')
    .optional(),
  horarioAtendimento24h: z
    .string()
    .max(100, 'Horário de atendimento deve ter no máximo 100 caracteres')
    .optional(),
  status: z.enum(['ATIVA', 'INATIVA']).default('ATIVA'),
});

type FormData = z.infer<typeof schema>;

interface SeguradoraDialogProps {
  corretoraId?: string | null;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function SeguradoraDialog({
  corretoraId,
  trigger,
  onSuccess,
}: SeguradoraDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = !!corretoraId;

  const { data: seguradora } = useSeguradoraParceira(corretoraId ?? null);
  const criarSeguradora = useCreateInsurancePartner();
  const atualizarSeguradora = useUpdateInsurancePartner();

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      cnpj: '',
      razaoSocial: '',
      nomeFantasia: '',
      telefone: '',
      email: '',
      telefone24h: '',
      whatsapp24h: '',
      horarioAtendimento24h: '',
      status: 'ATIVA',
    },
  });

  // Load data when editing
  useEffect(() => {
    if (seguradora && isEdit) {
      form.reset({
        cnpj: seguradora.cnpj,
        razaoSocial: seguradora.razaoSocial,
        nomeFantasia: seguradora.nomeFantasia || '',
        telefone: seguradora.telefone || '',
        email: seguradora.email || '',
        telefone24h: seguradora.telefone24h || '',
        whatsapp24h: seguradora.whatsapp24h || '',
        horarioAtendimento24h: seguradora.horarioAtendimento24h || '',
        status: seguradora.status,
      });
    }
  }, [seguradora, isEdit, form]);

  // Format CNPJ as user types
  const formatCNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 14) {
      return cleaned
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return value;
  };

  const handleSubmit = async (data: FormData) => {
    try {
      if (isEdit && corretoraId) {
        await atualizarSeguradora.mutateAsync({
          id: corretoraId,
          data: {
            cnpj: data.cnpj,
            razaoSocial: data.razaoSocial,
            nomeFantasia: data.nomeFantasia || undefined,
            telefone: data.telefone || undefined,
            email: data.email || undefined,
            telefone24h: data.telefone24h || undefined,
            whatsapp24h: data.whatsapp24h || undefined,
            horarioAtendimento24h: data.horarioAtendimento24h || undefined,
            status: data.status,
          },
        });
        toast.success('Seguradora atualizada com sucesso!');
      } else {
        await criarSeguradora.mutateAsync({
          cnpj: data.cnpj,
          razaoSocial: data.razaoSocial,
          nomeFantasia: data.nomeFantasia || undefined,
          telefone: data.telefone || undefined,
          email: data.email || undefined,
          telefone24h: data.telefone24h || undefined,
          whatsapp24h: data.whatsapp24h || undefined,
          horarioAtendimento24h: data.horarioAtendimento24h || undefined,
          status: data.status,
        });
        toast.success('Seguradora cadastrada com sucesso!');
      }

      setOpen(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      if (!applyApiErrorsToForm(error, form.setError)) {
        toast.error(handleApiError(error));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 size-4" />
            Nova Seguradora
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Seguradora' : 'Nova Seguradora Parceira'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize as informações da seguradora parceira'
              : 'Cadastre uma nova seguradora parceira com quem sua corretora trabalha'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit as any)}
            className="space-y-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {/* CNPJ */}
              <FormField
                control={form.control as any}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                        onChange={(e) => {
                          const formatted = formatCNPJ(e.target.value);
                          field.onChange(formatted);
                        }}
                        className="h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control as any}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ATIVA">Ativa</SelectItem>
                        <SelectItem value="INATIVA">Inativa</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Razão Social */}
            <FormField
              control={form.control as any}
              name="razaoSocial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razão Social *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: Porto Seguro S.A."
                      className="h-9"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nome Fantasia */}
            <FormField
              control={form.control as any}
              name="nomeFantasia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Fantasia</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: Porto Seguro"
                      className="h-9"
                    />
                  </FormControl>
                  <FormDescription>
                    Nome comercial da seguradora (opcional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Telefone */}
              <FormField
                control={form.control as any}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="(11) 1234-5678"
                        className="h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control as any}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="contato@seguradora.com.br"
                        className="h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Suporte 24h */}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Suporte 24h (exibido no portal do segurado)</p>
                <p className="text-xs text-muted-foreground">
                  Dados de contato de emergência que o segurado verá no portal
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control as any}
                  name="telefone24h"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone 24h</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="0800 000 0000"
                          className="h-9"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control as any}
                  name="whatsapp24h"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp 24h</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="(11) 99999-9999"
                          className="h-9"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control as any}
                name="horarioAtendimento24h"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário de Atendimento</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: 24h / 7 dias por semana"
                        className="h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  criarSeguradora.isPending || atualizarSeguradora.isPending
                }
              >
                {criarSeguradora.isPending || atualizarSeguradora.isPending
                  ? 'Salvando...'
                  : isEdit
                    ? 'Atualizar'
                    : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
