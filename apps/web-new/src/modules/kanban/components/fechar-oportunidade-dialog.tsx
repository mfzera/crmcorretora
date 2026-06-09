
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useNavigate } from '@tanstack/react-router';
import { CheckCircle2, Link2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/core/ui/alert';
import { useFecharOportunidade, useVincularCliente } from '../http';
import { useSearchClients } from '@/modules/clientes/http';
import { useProdutos } from '@/modules/produtos/http';
import { useSeguradorasParceiras } from '@/modules/seguradoras-parceiras/http';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Input } from '@/core/ui/input';
import { DateInput } from '@/core/ui/date-input';
import { Checkbox } from '@/core/ui/checkbox';
import { Button } from '@/core/ui/button';
import { Skeleton } from '@/core/ui/skeleton';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import type { Oportunidade } from '@/types/kanban';

const fecharSchema = z.object({
  valorFechado: z.string().optional(),
  observacoes: z.string().optional(),
  produtoId: z.string().min(1, 'Selecione o produto'),
  seguradoraParceiraId: z.string().optional(),
  situacao: z.enum(['NOVO', 'RENOVACAO']).default('NOVO'),
  dataVigenciaInicio: z.string().min(1, 'Informe a data de início da vigência'),
  dataVigenciaFim: z.string().min(1, 'Informe a data de fim da vigência'),
  premioFinal: z.string().optional(),
  gerarDocumento: z.boolean().default(false),
  numeroProposta: z.string().optional(),
  criarRenovacao: z.boolean().default(false),
});

type FecharForm = z.infer<typeof fecharSchema>;

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
      {[1, 2].map((i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-9 w-full col-span-2" />
            <Skeleton className="h-9 w-full col-span-2" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface FecharOportunidadeDialogProps {
  oportunidade: Oportunidade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FecharOportunidadeDialog({ oportunidade, open, onOpenChange }: FecharOportunidadeDialogProps) {
  const navigate = useNavigate();
  const fecharOportunidade = useFecharOportunidade();

  const { data: produtosResponse, isLoading: isLoadingProdutos } = useProdutos({ ativo: true }, 1, 100);
  const produtos = produtosResponse?.data || [];
  const { data: seguradorasResponse, isLoading: isLoadingSeguradoras } = useSeguradorasParceiras({ status: 'ATIVA', limit: 100 });
  const seguradoras = seguradorasResponse?.data || [];
  const isLoadingForm = isLoadingProdutos || isLoadingSeguradoras;

  const form = useForm<FecharForm>({
    resolver: zodResolver(fecharSchema) as any,
    defaultValues: {
      valorFechado: '',
      observacoes: '',
      produtoId: '',
      seguradoraParceiraId: '',
      situacao: 'NOVO',
      dataVigenciaInicio: '',
      dataVigenciaFim: '',
      premioFinal: '',
      gerarDocumento: false,
      numeroProposta: '',
      criarRenovacao: false,
    },
  });

  const gerarDocumento = form.watch('gerarDocumento');
  const dataVigenciaInicio = form.watch('dataVigenciaInicio');

  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState('');
  const [clienteIdLocal, setClienteIdLocal] = useState<string | null>(oportunidade?.clienteId ?? null);

  useEffect(() => {
    setClienteIdLocal(oportunidade?.clienteId ?? null);
    setClienteSearch('');
    setClienteSelecionadoId('');
  }, [oportunidade?.id]);

  const { data: clientesData = [] } = useSearchClients(clienteSearch);
  const vincularCliente = useVincularCliente();

  const handleVincularCliente = async () => {
    if (!oportunidade || !clienteSelecionadoId) return;
    try {
      await vincularCliente.mutateAsync({ id: oportunidade.id, clienteId: clienteSelecionadoId });
      setClienteIdLocal(clienteSelecionadoId);
      toast.success('Cliente vinculado com sucesso!');
      setClienteSearch('');
      setClienteSelecionadoId('');
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleClose = () => { onOpenChange(false); form.reset(); };

  const onSubmit = async (data: FecharForm) => {
    if (!oportunidade) return;
    try {
      await fecharOportunidade.mutateAsync({
        id: oportunidade.id,
        data: {
          valorFechado: data.premioFinal ? parseFloat(data.premioFinal) : undefined,
          observacoes: data.observacoes || undefined,
          gerarDocumento: data.gerarDocumento,
          produtoId: data.produtoId || undefined,
          seguradoraParceiraId: data.seguradoraParceiraId || undefined,
          situacao: data.situacao,
          numeroProposta: data.numeroProposta || undefined,
          dataVigenciaInicio: data.dataVigenciaInicio || undefined,
          dataVigenciaFim: data.dataVigenciaFim || undefined,
          premioFinal: data.premioFinal ? parseFloat(data.premioFinal) : undefined,
          criarRenovacao: data.criarRenovacao,
        },
      });

      const semCliente = !clienteIdLocal;
      const msg = semCliente
        ? 'Oportunidade ganha! Vincule o cliente na aba Novos Seguros do Workspace.'
        : data.criarRenovacao
          ? 'Oportunidade ganha! Cotação, apólice e renovação criadas.'
          : data.gerarDocumento
            ? 'Oportunidade ganha! Cotação e apólice geradas.'
            : 'Oportunidade ganha! Cotação criada em cotações ativas.';

      toast.success(msg, {
        action: { label: 'Ver no workspace', onClick: () => navigate({ to: '/workspace2' }) },
      });
      handleClose();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  if (!oportunidade) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[740px] max-h-[88vh] gap-0 p-0 overflow-hidden">
        <div className="flex flex-col h-full max-h-[88vh]">
          {/* Cabeçalho */}
          <div className="flex items-center gap-3 border-b px-6 py-4 pr-14 shrink-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <DialogHeader className="p-0 space-y-0">
              <DialogTitle className="text-base font-semibold">Fechar como Ganha</DialogTitle>
              {oportunidade.nomeCliente && (
                <p className="text-xs text-muted-foreground mt-0.5">{oportunidade.nomeCliente}</p>
              )}
            </DialogHeader>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {!clienteIdLocal && (
              <Alert className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <p className="font-medium mb-1 text-sm">Sem cliente vinculado</p>
                  <p className="text-xs mb-3">A cotação ficará pendente em <strong>Cotações Ativas</strong> até vincular o cliente.</p>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Buscar cliente (min. 3 letras)..."
                        value={clienteSearch}
                        onChange={(e) => { setClienteSearch(e.target.value); setClienteSelecionadoId(''); }}
                        className="w-full rounded-md border border-amber-300 bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-amber-700"
                      />
                      {clienteSearch.length >= 3 && clientesData.length > 0 && !clienteSelecionadoId && (
                        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                          {clientesData.map((c: any) => {
                            const nome = c.tipoPessoa === 'PF' ? c.nome : (c.nomeFantasia || c.razaoSocial);
                            return (
                              <button key={c.id} type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                                onClick={() => { setClienteSelecionadoId(c.id); setClienteSearch(nome || ''); }}>
                                <span className="font-medium">{nome}</span>
                                <span className="ml-2 text-xs text-muted-foreground">{c.cpf || c.cnpj}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <Button type="button" size="sm" variant="outline" disabled={!clienteSelecionadoId || vincularCliente.isPending}
                      onClick={handleVincularCliente} className="gap-1 shrink-0">
                      <Link2 className="h-3.5 w-3.5" />
                      {vincularCliente.isPending ? 'Vinculando...' : 'Vincular'}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {isLoadingForm ? (
              <FormSkeleton />
            ) : (
              <Form {...form}>
                <form id="fechar-oportunidade-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                  <FieldGroup label="Dados da cotação">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="produtoId" render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className="text-xs text-muted-foreground">Produto <span className="text-destructive">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                            <SelectContent position="popper">
                              {produtos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nomeProduto}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="seguradoraParceiraId" render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className="text-xs text-muted-foreground">Seguradora <span className="text-muted-foreground/50">(opcional)</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                            <SelectContent position="popper">
                              {seguradoras.map((s) => <SelectItem key={s.id} value={s.id}>{s.nomeFantasia || s.razaoSocial}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="situacao" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Situação</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent position="popper">
                              <SelectItem value="NOVO">Novo</SelectItem>
                              <SelectItem value="RENOVACAO">Renovação</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="premioFinal" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Prêmio final</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-muted-foreground">R$</span>
                              <Input type="number" step="0.01" placeholder="0,00" className="pl-8" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </FieldGroup>

                  <div className="border-t" />

                  <FieldGroup label="Vigência">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="dataVigenciaInicio" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Início <span className="text-destructive">*</span></FormLabel>
                          <FormControl><DateInput value={field.value} onChange={field.onChange} showQuickSelect={false} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="dataVigenciaFim" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Fim <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <DateInput value={field.value} onChange={field.onChange}
                              showQuickSelect={!!dataVigenciaInicio} quickSelectBaseDate={dataVigenciaInicio} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </FieldGroup>

                  <div className="border-t" />

                  <FormField control={form.control} name="gerarDocumento" render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0 rounded-lg bg-muted/40 px-4 py-3">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div>
                        <FormLabel className="cursor-pointer font-medium text-sm">Gerar apólice / documento de venda</FormLabel>
                        <p className="text-xs text-muted-foreground">Cria um documento vinculado ao cliente</p>
                      </div>
                    </FormItem>
                  )} />

                  {gerarDocumento && (
                    <>
                      <div className="border-t" />
                      <FieldGroup label="Documento">
                        <FormField control={form.control} name="numeroProposta" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Número da proposta / apólice</FormLabel>
                            <FormControl><Input placeholder="Ex: AP-2024-001234" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="criarRenovacao" render={({ field }) => (
                          <FormItem className="flex items-center gap-3 space-y-0 rounded-lg bg-muted/40 px-4 py-3">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <div>
                              <FormLabel className="cursor-pointer font-medium text-sm">Criar renovação automática</FormLabel>
                              <p className="text-xs text-muted-foreground">Agenda renovação na data de vencimento</p>
                            </div>
                          </FormItem>
                        )} />
                      </FieldGroup>
                    </>
                  )}
                </form>
              </Form>
            )}
          </div>

          {/* Rodapé */}
          <div className="flex items-center justify-end gap-2 border-t px-6 py-4 shrink-0 bg-background/50">
            <Button type="button" variant="ghost" size="sm" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" form="fechar-oportunidade-form" size="sm"
              className="bg-green-600 hover:bg-green-700"
              disabled={fecharOportunidade.isPending || isLoadingForm}>
              {fecharOportunidade.isPending ? 'Salvando...' : 'Confirmar ganho'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
