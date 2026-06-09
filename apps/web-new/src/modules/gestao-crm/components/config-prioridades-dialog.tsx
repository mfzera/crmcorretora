
import { useState, useEffect } from 'react';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/core/ui/form';
import { Input } from '@/core/ui/input';
import { Button } from '@/core/ui/button';
import { Switch } from '@/core/ui/switch';
import { Loader2, Settings2, AlertCircle } from 'lucide-react';
import { useConfigCRM, useUpdateCRMConfig } from '../http';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { Alert, AlertDescription } from '@/core/ui/alert';

const formSchema = z
  .object({
    habilitado: z.boolean(),
    diasBaixa: z.coerce.number().min(1, 'Mínimo 1 dia'),
    diasMedia: z.coerce.number().min(1, 'Mínimo 1 dia'),
    diasAlta: z.coerce.number().min(1, 'Mínimo 1 dia'),
    diasUrgente: z.coerce.number().min(1, 'Mínimo 1 dia'),
  })
  .refine(
    (data) =>
      data.diasBaixa < data.diasMedia &&
      data.diasMedia < data.diasAlta &&
      data.diasAlta < data.diasUrgente,
    {
      message:
        'Os dias devem estar em ordem crescente: Baixa < Média < Alta < Urgente (quanto mais dias, mais urgente)',
      path: ['diasBaixa'],
    },
  );

type FormData = z.infer<typeof formSchema>;

interface ConfigPrioridadesDialogProps {
  trigger?: React.ReactNode;
}

export function ConfigPrioridadesDialog({
  trigger,
}: ConfigPrioridadesDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: config, isLoading } = useConfigCRM();
  const { mutate: atualizar, isPending } = useUpdateCRMConfig();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: {
      habilitado: false,
      diasBaixa: 2,
      diasMedia: 5,
      diasAlta: 10,
      diasUrgente: 15,
    },
  });

  // Atualizar form quando carregar configuração
  useEffect(() => {
    if (config?.prioridadeAutomatica) {
      form.reset({
        habilitado: config.prioridadeAutomatica.habilitado,
        diasBaixa: config.prioridadeAutomatica.diasBaixa,
        diasMedia: config.prioridadeAutomatica.diasMedia,
        diasAlta: config.prioridadeAutomatica.diasAlta,
        diasUrgente: config.prioridadeAutomatica.diasUrgente,
      });
    }
  }, [config, form]);

  const habilitado = form.watch('habilitado');

  const onSubmit = (data: FormData) => {
    atualizar(
      {
        prioridadeAutomatica: {
          habilitado: data.habilitado,
          diasBaixa: data.diasBaixa,
          diasMedia: data.diasMedia,
          diasAlta: data.diasAlta,
          diasUrgente: data.diasUrgente,
        },
      },
      {
        onSuccess: () => {
          toast.success('Configurações salvas com sucesso!');
          setOpen(false);
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
          <Button variant="outline" size="sm">
            <Settings2 className="mr-2 h-4 w-4" />
            Configurar Prioridades
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configurar Prioridades Automáticas</DialogTitle>
          <DialogDescription>
            Define como as prioridades das oportunidades são calculadas
            automaticamente com base no tempo de criação.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="habilitado"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Prioridade Automática
                      </FormLabel>
                      <FormDescription>
                        Quando ativado, a prioridade das oportunidades será
                        calculada automaticamente com base nos dias desde a
                        criação.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {habilitado && (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      A prioridade é definida com base nos dias sem contato
                      (desde o último contato ou criação). Quanto mais tempo sem
                      contato, mais urgente a oportunidade.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="diasBaixa"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full bg-gray-500" />
                              Baixa (dias)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                className="border-gray-200 focus-visible:ring-gray-500"
                              />
                            </FormControl>
                            <FormDescription>
                              Até {field.value || 0} dia(s) sem contato
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="diasMedia"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full bg-yellow-500" />
                              Média (dias)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                className="border-yellow-200 focus-visible:ring-yellow-500"
                              />
                            </FormControl>
                            <FormDescription>
                              A partir de {field.value || 0} dia(s) sem contato
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="diasAlta"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full bg-orange-500" />
                              Alta (dias)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                className="border-orange-200 focus-visible:ring-orange-500"
                              />
                            </FormControl>
                            <FormDescription>
                              A partir de {field.value || 0} dia(s) sem contato
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="diasUrgente"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full bg-red-500" />
                              Urgente (dias)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                className="border-red-200 focus-visible:ring-red-500"
                              />
                            </FormControl>
                            <FormDescription>
                              A partir de {field.value || 0} dia(s) sem contato
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="rounded-lg bg-muted p-4 text-sm">
                      <p className="font-medium mb-2">Como funciona:</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>
                          - Até <strong>{form.watch('diasBaixa')}</strong>{' '}
                          dia(s) sem contato ={' '}
                          <span className="text-gray-500">Baixa</span>
                        </li>
                        <li>
                          - De <strong>{form.watch('diasMedia')}</strong> a{' '}
                          <strong>{form.watch('diasAlta') - 1}</strong> dias ={' '}
                          <span className="text-yellow-600">Média</span>
                        </li>
                        <li>
                          - De <strong>{form.watch('diasAlta')}</strong> a{' '}
                          <strong>{form.watch('diasUrgente') - 1}</strong> dias
                          = <span className="text-orange-500">Alta</span>
                        </li>
                        <li>
                          - A partir de{' '}
                          <strong>{form.watch('diasUrgente')}</strong> dia(s) ={' '}
                          <span className="text-red-500">Urgente</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </>
              )}

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
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar Configurações
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
