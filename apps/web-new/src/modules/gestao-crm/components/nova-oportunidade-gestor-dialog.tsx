
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/core/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/core/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Input } from '@/core/ui/input';
import { Textarea } from '@/core/ui/textarea';
import { Button } from '@/core/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { useCreateManagerOpportunity } from '../http';
import { useVendedoresStats } from '../http';
import { useAuthStore } from '@/infra/auth/auth-store';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';

const formSchema = z.object({
  vendedorId: z.string().min(1, 'Selecione um vendedor'),
  nomeCliente: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  emailCliente: z.string().email('Email inválido').optional().or(z.literal('')),
  telefoneCliente: z.string().optional(),
  status: z.enum(['lead', 'contato_inicial', 'negociacao']),
  temperatura: z.enum(['frio', 'morno', 'quente']),
  premioEstimado: z.string().optional(),
  dataVencimento: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface NovaOportunidadeGestorDialogProps {
  trigger?: React.ReactNode;
}

export function NovaOportunidadeGestorDialog({
  trigger,
}: NovaOportunidadeGestorDialogProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuthStore();
  const { mutate: criar, isPending } = useCreateManagerOpportunity();
  const { data: vendedores = [] } = useVendedoresStats({ enabled: !!(user?.isAdmin || user?.isGestor) });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vendedorId: '',
      nomeCliente: '',
      emailCliente: '',
      telefoneCliente: '',
      status: 'lead',
      temperatura: 'morno',
      premioEstimado: '',
      dataVencimento: '',
      observacoes: '',
    },
  });

  const onSubmit = (data: FormData) => {
    criar(
      {
        ...data,
        premioEstimado: data.premioEstimado
          ? parseFloat(data.premioEstimado)
          : undefined,
        emailCliente: data.emailCliente || undefined,
        dataVencimento: data.dataVencimento || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Oportunidade criada com sucesso!');
          setOpen(false);
          form.reset();
        },
        onError: (error: unknown) => {
          toast.error(handleApiError(error));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Oportunidade
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Nova Oportunidade</DialogTitle>
          <DialogDescription>
            Criar uma oportunidade e atribuir a um vendedor
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="vendedorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendedor *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o vendedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vendedores.map((vendedor) => (
                        <SelectItem key={vendedor.id} value={vendedor.id}>
                          {vendedor.nome} ({vendedor.stats.total} oportunidades)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nomeCliente"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nome do Cliente *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emailCliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@exemplo.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefoneCliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="contato_inicial">
                        Contato Inicial
                      </SelectItem>
                      <SelectItem value="negociacao">Negociação</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="temperatura"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temperatura</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="frio">Frio</SelectItem>
                        <SelectItem value="morno">Morno</SelectItem>
                        <SelectItem value="quente">Quente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="premioEstimado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prêmio Estimado</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dataVencimento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Vencimento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas sobre a oportunidade..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Oportunidade
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
