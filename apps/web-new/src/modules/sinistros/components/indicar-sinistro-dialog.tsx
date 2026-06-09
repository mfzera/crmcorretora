
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ShieldAlert, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Textarea } from '@/core/ui/textarea';
import { Button } from '@/core/ui/button';
import { DateInput } from '@/core/ui/date-input';
import { handleApiError } from '@/core/utils/handle-api-error';
import { TIPO_SINISTRO_LABELS } from '@/types/sinistro';
import { useIndicarSinistro } from '../http';

const schema = z.object({
  tipoSinistro: z.enum([
    'COLISAO', 'ROUBO_FURTO', 'INCENDIO', 'DANOS_NATURAIS',
    'DANOS_TERCEIROS', 'INVALIDEZ', 'MORTE', 'HOSPITALIZACAO', 'OUTROS',
  ]),
  descricao: z.string().min(10, 'Descreva o ocorrido com pelo menos 10 caracteres').max(3000),
  dataOcorrencia: z.string().min(1, 'Informe a data da ocorrência'),
  observacoes: z.string().max(2000).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface IndicarSinistroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentoVendaId: string;
  nomeCliente?: string;
}

export function IndicarSinistroDialog({
  open,
  onOpenChange,
  documentoVendaId,
  nomeCliente,
}: IndicarSinistroDialogProps) {
  const indicar = useIndicarSinistro();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipoSinistro: undefined,
      descricao: '',
      dataOcorrencia: '',
      observacoes: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await indicar.mutateAsync({
        documentoVendaId,
        tipoSinistro: values.tipoSinistro,
        descricao: values.descricao,
        dataOcorrencia: values.dataOcorrencia,
        observacoes: values.observacoes || undefined,
      });
      toast.success('Ocorrência indicada com sucesso! O time responsável será notificado.');
      form.reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) form.reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="rounded-full bg-orange-500/10 p-2">
              <ShieldAlert className="size-4 text-orange-500" />
            </div>
            <DialogTitle>Indicar Ocorrência de Sinistro</DialogTitle>
          </div>
          <DialogDescription>
            {nomeCliente
              ? `Informe os dados do ocorrido para a apólice de ${nomeCliente}. O time de sinistros abrirá o processo formal.`
              : 'Informe os dados do ocorrido. O time de sinistros abrirá o processo formal.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <FormField
              control={form.control}
              name="tipoSinistro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de sinistro</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(TIPO_SINISTRO_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dataOcorrencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data da ocorrência</FormLabel>
                  <FormControl>
                    <DateInput value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>O que aconteceu?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva brevemente o ocorrido — local, circunstâncias, pessoas envolvidas..."
                      rows={4}
                      {...field}
                    />
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
                  <FormLabel>
                    Observações adicionais{' '}
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações complementares, contatos, documentos disponíveis..."
                      rows={2}
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
                onClick={() => { form.reset(); onOpenChange(false); }}
                disabled={indicar.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={indicar.isPending}>
                {indicar.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                {indicar.isPending ? 'Enviando...' : 'Indicar ocorrência'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
