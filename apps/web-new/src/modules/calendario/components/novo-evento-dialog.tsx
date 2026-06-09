
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTarefa } from '@/modules/tarefas/http';
import { calendarioKeys } from '../http';
import { dayjs } from '@/core/utils/date-utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/core/ui/form';
import { Input } from '@/core/ui/input';
import { DateInput } from '@/core/ui/date-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Textarea } from '@/core/ui/textarea';
import { Button } from '@/core/ui/button';
import { toast } from 'sonner';
import { CheckSquare } from 'lucide-react';
import { handleApiError } from '@/core/utils/handle-api-error';

const novoEventoSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  descricao: z.string().optional(),
  prioridade: z.enum(['baixa', 'media', 'alta']).default('media'),
  dataVencimento: z.string().min(1, 'Data é obrigatória'),
});

type NovoEventoForm = z.infer<typeof novoEventoSchema>;

interface NovoEventoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
}

export function NovoEventoDialog({
  open,
  onOpenChange,
  defaultDate,
}: NovoEventoDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<NovoEventoForm>({
    resolver: zodResolver(novoEventoSchema) as any,
    defaultValues: {
      titulo: '',
      descricao: '',
      prioridade: 'media',
      dataVencimento: defaultDate
        ? dayjs(defaultDate).format('YYYY-MM-DD')
        : dayjs().format('YYYY-MM-DD'),
    },
  });

  // Sync defaultDate when it changes and dialog opens
  const watchedDate = form.watch('dataVencimento');
  if (
    open &&
    defaultDate &&
    !watchedDate &&
    dayjs(defaultDate).format('YYYY-MM-DD') !== watchedDate
  ) {
    form.setValue('dataVencimento', dayjs(defaultDate).format('YYYY-MM-DD'));
  }

  const { mutate, isPending } = useMutation({
    mutationFn: (data: NovoEventoForm) =>
      createTarefa({
        titulo: data.titulo,
        descricao: data.descricao || undefined,
        prioridade: data.prioridade,
        dataVencimento: data.dataVencimento
          ? new Date(data.dataVencimento + 'T12:00:00.000Z').toISOString()
          : undefined,
      }),
    onSuccess: () => {
      toast.success('Evento criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: calendarioKeys.all });
      onOpenChange(false);
      form.reset({
        titulo: '',
        descricao: '',
        prioridade: 'media',
        dataVencimento: defaultDate
          ? dayjs(defaultDate).format('YYYY-MM-DD')
          : dayjs().format('YYYY-MM-DD'),
      });
    },
    onError: (error: unknown) => {
      toast.error(handleApiError(error));
    },
  });

  function onSubmit(data: NovoEventoForm) {
    mutate(data);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          form.reset({
            titulo: '',
            descricao: '',
            prioridade: 'media',
            dataVencimento: defaultDate
              ? dayjs(defaultDate).format('YYYY-MM-DD')
              : dayjs().format('YYYY-MM-DD'),
          });
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="size-5 text-blue-500" />
            Nova Tarefa
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Ligar para cliente..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dataVencimento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <DateInput {...field} showQuickSelect={false} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="prioridade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridade</FormLabel>
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
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhes adicionais..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Criando...' : 'Criar tarefa'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
