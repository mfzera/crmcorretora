import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCancelarRenovacao } from '@/modules/area-trabalho/http';
import { handleApiError } from '@/core/utils/handle-api-error';
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
import { Textarea } from '@/core/ui/textarea';
import { Button } from '@/core/ui/button';
import type { WorkspaceRow } from '../types';

const schema = z.object({
  motivoCancelamento: z.string().min(5, 'Informe o motivo (mínimo 5 caracteres)').max(1000),
});

type FormValues = z.infer<typeof schema>;

interface CancelarRenovacaoDialogProps {
  row: WorkspaceRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CancelarRenovacaoDialog({ row, open, onOpenChange, onSuccess }: CancelarRenovacaoDialogProps) {
  const cancelar = useCancelarRenovacao();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { motivoCancelamento: '' },
  });

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
  };

  const onSubmit = async (data: FormValues) => {
    if (!row?._renovacao?.id) return;
    try {
      await cancelar.mutateAsync({ id: row._renovacao.id, motivoCancelamento: data.motivoCancelamento });
      toast.success('Renovação cancelada.');
      onSuccess?.();
      setTimeout(handleClose, 400);
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 border-b px-6 py-4 pr-14 shrink-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
              <XCircle className="h-4 w-4 text-gray-500" />
            </div>
            <DialogHeader className="p-0 space-y-0">
              <DialogTitle className="text-base font-semibold">Cancelar Renovação</DialogTitle>
              {row.clienteNome && (
                <p className="text-xs text-muted-foreground mt-0.5">{row.clienteNome}</p>
              )}
            </DialogHeader>
          </div>

          <Form {...form}>
            <form id="cancelar-renovacao-form" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="px-6 py-6">
                <FormField
                  control={form.control}
                  name="motivoCancelamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Motivo do cancelamento <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ex: cliente não renovou, fora do prazo, problema de pagamento..."
                          rows={6}
                          disabled={cancelar.isPending}
                          {...field}
                        />
                      </FormControl>
                      <div className="flex items-center justify-between">
                        <FormMessage />
                        <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                          {field.value?.length ?? 0}/1000
                        </span>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t px-6 py-4 shrink-0 bg-background/50">
                <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
                  Voltar
                </Button>
                <Button
                  type="submit"
                  form="cancelar-renovacao-form"
                  size="sm"
                  variant="destructive"
                  disabled={cancelar.isPending}
                >
                  {cancelar.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
