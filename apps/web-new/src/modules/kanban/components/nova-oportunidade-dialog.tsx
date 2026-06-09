
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Clock, Flame, Plus, TrendingUp } from 'lucide-react';
import { cn } from '@/core/utils';
import { useCreateOportunidade } from '../http';
import { useSeguradorasParceiras } from '@/modules/seguradoras-parceiras/http';
import { useVendedores } from '@/modules/usuarios/http';
import { useProdutos } from '@/modules/produtos/http';
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
import { Skeleton } from '@/core/ui/skeleton';
import { toast } from 'sonner';
import { handleApiError, applyApiErrorsToForm } from '@/core/utils/handle-api-error';
import { TEMPERATURA_LABELS, type OportunidadeTemperatura } from '@/types/kanban';

const oportunidadeSchema = z.object({
  corretoraId: z.string().min(1, 'Selecione uma seguradora'),
  nomeCliente: z.string().min(1, 'Nome do cliente é obrigatório'),
  vendedorId: z.string().min(1, 'Selecione um vendedor'),
  temperatura: z.enum(['frio', 'morno', 'quente']).default('morno'),
  premioEstimado: z.string().optional(),
  dataVencimento: z.string().min(1, 'Data de vencimento é obrigatória'),
  produtoId: z.string().optional(),
  observacoes: z.string().optional(),
});

type OportunidadeForm = z.infer<typeof oportunidadeSchema>;

function tempColors(t: OportunidadeTemperatura) {
  if (t === 'quente') return 'bg-red-500/15 text-red-400 ring-red-500/20';
  if (t === 'morno') return 'bg-orange-500/15 text-orange-400 ring-orange-500/20';
  return 'bg-blue-500/15 text-blue-400 ring-blue-500/20';
}

function tempIcon(t: OportunidadeTemperatura) {
  if (t === 'quente') return <Flame className="h-3 w-3" />;
  if (t === 'morno') return <TrendingUp className="h-3 w-3" />;
  return <Clock className="h-3 w-3" />;
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">{label}</p>
      {children}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-8">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-3 w-20" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface NovaOportunidadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NovaOportunidadeDialog({ open, onOpenChange }: NovaOportunidadeDialogProps) {
  const form = useForm<OportunidadeForm>({
    resolver: zodResolver(oportunidadeSchema) as any,
    defaultValues: {
      corretoraId: '',
      nomeCliente: '',
      vendedorId: '',
      temperatura: 'morno',
      premioEstimado: '',
      dataVencimento: '',
      produtoId: '',
      observacoes: '',
    },
  });

  const { data: seguradorasResponse, isLoading: isLoadingSeguradoras } = useSeguradorasParceiras({ status: 'ATIVA', limit: 100 });
  const seguradoras = seguradorasResponse?.data || [];
  const { data: usuarios = [], isLoading: isLoadingUsuarios } = useVendedores();
  const { data: produtosResponse, isLoading: isLoadingProdutos } = useProdutos({ ativo: true }, 1, 100);
  const produtosList = produtosResponse?.data || [];
  const createOportunidade = useCreateOportunidade();
  const isLoading = isLoadingSeguradoras || isLoadingUsuarios || isLoadingProdutos;

  const temperatura = form.watch('temperatura') ?? 'morno';

  const onSubmit = async (data: OportunidadeForm) => {
    try {
      await createOportunidade.mutateAsync({
        ...data,
        premioEstimado: data.premioEstimado ? parseFloat(data.premioEstimado) : undefined,
        dataVencimento: data.dataVencimento || undefined,
        produtoId: data.produtoId || undefined,
      });
      toast.success('Oportunidade criada com sucesso');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      if (!applyApiErrorsToForm(error, form.setError)) {
        toast.error(handleApiError(error));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] max-h-[88vh] gap-0 p-0 overflow-hidden">
        <div className="flex flex-col h-full max-h-[88vh]">
          {/* Cabeçalho */}
          <div className="flex items-center gap-3 border-b px-6 py-4 pr-14 shrink-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <DialogHeader className="p-0 space-y-0">
              <DialogTitle className="text-base font-semibold">Nova Oportunidade</DialogTitle>
            </DialogHeader>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {isLoading ? (
              <FormSkeleton />
            ) : (
              <Form {...form}>
                <form id="nova-oportunidade-form" onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">

                  <FieldGroup label="Cliente">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control as any}
                        name="nomeCliente"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Nome completo</FormLabel>
                            <FormControl><Input placeholder="Ex: João Silva" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control as any}
                        name="corretoraId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Seguradora</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                              <SelectContent position="popper">
                                {seguradoras.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>{s.nomeFantasia || s.razaoSocial}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </FieldGroup>

                  <div className="border-t" />

                  <FieldGroup label="Negócio">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control as any}
                        name="vendedorId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Vendedor</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                              <SelectContent position="popper">
                                {usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control as any}
                        name="premioEstimado"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Prêmio estimado</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-muted-foreground">R$</span>
                                <Input type="number" step="0.01" placeholder="0,00" className="pl-8" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </FieldGroup>

                  <div className="border-t" />

                  <FieldGroup label="Produto e prazo">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control as any}
                        name="dataVencimento"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Vencimento <span className="text-destructive">*</span></FormLabel>
                            <FormControl><DateInput value={field.value} onChange={field.onChange} showQuickSelect={false} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control as any}
                        name="produtoId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Produto <span className="text-muted-foreground/50">(opcional)</span></FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                              <SelectContent position="popper">
                                {produtosList.map((p) => <SelectItem key={p.id} value={p.id}>{p.nomeProduto}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </FieldGroup>

                  <div className="border-t" />

                  <FieldGroup label="Detalhes">
                    <FormField
                      control={form.control as any}
                      name="temperatura"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Temperatura do lead</FormLabel>
                          <div className="flex gap-2">
                            {(['frio', 'morno', 'quente'] as OportunidadeTemperatura[]).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => field.onChange(t)}
                                className={cn(
                                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ring-1 transition-all',
                                  field.value === t ? cn(tempColors(t), 'ring-1') : 'text-muted-foreground ring-border/50 hover:ring-border'
                                )}
                              >
                                {tempIcon(t)}
                                {TEMPERATURA_LABELS[t]}
                              </button>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as any}
                      name="observacoes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Observações <span className="text-muted-foreground/50">(opcional)</span></FormLabel>
                          <FormControl>
                            <Textarea placeholder="Contexto adicional sobre a oportunidade..." className="resize-none min-h-[72px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FieldGroup>
                </form>
              </Form>
            )}
          </div>

          {/* Rodapé */}
          <div className="flex items-center justify-end gap-2 border-t px-6 py-4 shrink-0 bg-background/50">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" form="nova-oportunidade-form" size="sm" disabled={createOportunidade.isPending || isLoading}>
              {createOportunidade.isPending ? 'Criando...' : 'Criar oportunidade'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
