
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AlertTriangle, Clock, FileText, History, Loader2, MessageSquare, Paperclip, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/core/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
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
import { Badge } from '@/core/ui/badge';
import { Separator } from '@/core/ui/separator';
import { ScrollArea } from '@/core/ui/scroll-area';
import { DateInput } from '@/core/ui/date-input';
import { handleApiError } from '@/core/utils/handle-api-error';
import { dayjs } from '@/core/utils/date-utils';
import { AnexosTab } from '@/modules/anexos/components';
import { ComentariosPanel } from '@/modules/area-trabalho/components/comentarios-panel';
import { useComentariosDocumentoVenda } from '@/modules/area-trabalho/http';
import {
  STATUS_SINISTRO_LABELS,
  TIPO_SINISTRO_LABELS,
} from '@/types/sinistro';
import type { Sinistro } from '@/types/sinistro';
import { useUpdateSinistro, useHistoricoSinistro, useComentariosSinistro, useAdicionarComentarioSinistro } from '../http';

const STATUS_COLORS: Record<string, string> = {
  ABERTO: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  EM_ANALISE: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400',
  AGUARDANDO_DOCUMENTOS: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400',
  APROVADO: 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400',
  RECUSADO: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
  PAGO: 'bg-teal-500/10 text-teal-600 border-teal-500/20 dark:text-teal-400',
  CANCELADO: 'bg-gray-500/10 text-gray-500 border-gray-500/20 dark:text-gray-400',
};

function formatCurrency(value: string | number | null | undefined): string {
  if (!value) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const schema = z.object({
  tipoSinistro: z.enum([
    'COLISAO', 'ROUBO_FURTO', 'INCENDIO', 'DANOS_NATURAIS',
    'DANOS_TERCEIROS', 'INVALIDEZ', 'MORTE', 'HOSPITALIZACAO', 'OUTROS',
  ]),
  descricao: z.string().min(1, 'Descrição obrigatória'),
  dataOcorrencia: z.string().min(1, 'Data obrigatória'),
  valorReclamado: z.string().optional(),
  numeroSinistroExterno: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface EditarSinistroDialogProps {
  sinistro: Sinistro | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarSinistroDialog({ sinistro, open, onOpenChange }: EditarSinistroDialogProps) {
  const [activeTab, setActiveTab] = useState('dados');
  const [pendingComentario, setPendingComentario] = useState('');

  const update = useUpdateSinistro();
  const adicionarComentario = useAdicionarComentarioSinistro();
  const { data: historico = [] } = useHistoricoSinistro(open && sinistro ? sinistro.id : null);
  const { data: comentariosSinistro = [], isLoading: isLoadingComentarios } = useComentariosSinistro(open && sinistro ? sinistro.id : null);
  const { data: comentariosDocumento = [] } = useComentariosDocumentoVenda(open && sinistro ? sinistro.documentoVendaId : null);

  const todosComentarios = [...comentariosSinistro, ...comentariosDocumento].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipoSinistro: 'OUTROS',
      descricao: '',
      dataOcorrencia: '',
      valorReclamado: '',
      numeroSinistroExterno: '',
      observacoes: '',
    },
  });

  useEffect(() => {
    if (sinistro && open) {
      setActiveTab('dados');
      form.reset({
        tipoSinistro: sinistro.tipoSinistro,
        descricao: sinistro.descricao ?? '',
        dataOcorrencia: sinistro.dataOcorrencia,
        valorReclamado: sinistro.valorReclamado ?? '',
        numeroSinistroExterno: sinistro.numeroSinistroExterno ?? '',
        observacoes: sinistro.observacoes ?? '',
      });
    }
  }, [sinistro, open, form]);

  if (!sinistro) return null;

  const naoEditavel = sinistro.status !== 'ABERTO';
  const nomeCliente = sinistro.documentoVenda?.cliente?.nome;

  async function onSubmit(values: FormValues) {
    try {
      await update.mutateAsync({
        id: sinistro!.id,
        data: {
          tipoSinistro: values.tipoSinistro,
          descricao: values.descricao,
          dataOcorrencia: values.dataOcorrencia,
          valorReclamado: values.valorReclamado ? parseFloat(values.valorReclamado) : undefined,
          numeroSinistroExterno: values.numeroSinistroExterno || undefined,
          observacoes: values.observacoes || undefined,
        },
      });
      toast.success('Sinistro atualizado com sucesso');
      onOpenChange(false);
    } catch (err) {
      toast.error(handleApiError(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        if (pendingComentario.trim() && !window.confirm('Há um comentário não enviado. Descartar e fechar?')) return;
        setPendingComentario('');
        onOpenChange(false);
      }
    }}>
      <DialogContent
        className="max-w-5xl! p-0 h-[90vh] gap-0"
        style={{ width: '95vw' }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{sinistro.numeroSinistro}</DialogTitle>
          <DialogDescription>{nomeCliente}</DialogDescription>
        </DialogHeader>

        <div className="flex h-full overflow-hidden">
          {/* Sidebar */}
          <aside className="w-[260px] shrink-0 border-r bg-muted/30 flex flex-col h-full">
            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Sinistro</p>
                <p className="text-sm font-mono font-medium">{sinistro.numeroSinistro}</p>
              </div>

              {nomeCliente && (
                <div>
                  <p className="font-bold text-xl leading-tight break-words">{nomeCliente}</p>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                </div>
              )}

              <Badge
                variant="outline"
                className={STATUS_COLORS[sinistro.status] ?? 'bg-gray-500/10 text-gray-500 border-gray-500/20'}
              >
                {STATUS_SINISTRO_LABELS[sinistro.status]}
              </Badge>

              {sinistro.documentoVenda?.produto && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Produto</p>
                  <p className="text-sm font-semibold">{sinistro.documentoVenda.produto.nomeProduto}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Tipo</p>
                <Badge variant="outline" className="mt-1 text-xs">
                  {TIPO_SINISTRO_LABELS[sinistro.tipoSinistro]}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Data da Ocorrência</p>
                  <p className="text-sm font-medium">
                    {dayjs(sinistro.dataOcorrencia).format('DD/MM/YYYY')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Abertura</p>
                  <p className="text-sm font-medium">
                    {dayjs(sinistro.dataAbertura).format('DD/MM/YYYY')}
                  </p>
                </div>
              </div>

              {(sinistro.valorReclamado || sinistro.valorAprovado) && (
                <div className="rounded-lg border bg-card p-4 space-y-3">
                  {sinistro.valorReclamado && (
                    <div>
                      <p className="text-xs text-muted-foreground">Valor Reclamado</p>
                      <p className="text-xl font-bold">{formatCurrency(sinistro.valorReclamado)}</p>
                    </div>
                  )}
                  {sinistro.valorAprovado && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground">Valor Aprovado</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(sinistro.valorAprovado)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t space-y-2 shrink-0">
              {!naoEditavel && (
                <Button
                  type="submit"
                  form="editar-sinistro-form"
                  className="w-full gap-1.5"
                  disabled={update.isPending}
                >
                  {update.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Pencil className="h-3.5 w-3.5" />
                  }
                  Salvar alterações
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => {
                if (pendingComentario.trim() && !window.confirm('Há um comentário não enviado. Descartar e fechar?')) return;
                setPendingComentario('');
                onOpenChange(false);
              }}>
                Fechar
              </Button>
            </div>
          </aside>

          {/* Área principal */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-6 pt-6 pb-4 border-b shrink-0">
              <h2 className="flex items-center gap-3 text-2xl font-semibold">
                <div className="p-2 rounded-lg bg-primary/10">
                  <AlertTriangle className="size-6 text-primary" />
                </div>
                Editar Sinistro
              </h2>
              <p className="mt-2 text-base text-muted-foreground">
                {sinistro.numeroSinistro}
                {sinistro.numeroSinistroExterno && ` · ${sinistro.numeroSinistroExterno}`}
              </p>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col min-h-0"
            >
              <TabsList className="mx-6 mt-2 w-fit">
                <TabsTrigger value="dados" className="gap-2">
                  <FileText className="size-4" /> Dados
                </TabsTrigger>
                <TabsTrigger value="anexos" className="gap-2">
                  <Paperclip className="size-4" /> Anexos
                </TabsTrigger>
                <TabsTrigger value="historico" className="gap-2">
                  <History className="size-4" />
                  Histórico
                  {historico.length > 0 && (
                    <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5 font-medium">
                      {historico.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="comentarios" className="gap-2">
                  <MessageSquare className="size-4" />
                  Comentários
                  {todosComentarios.length > 0 && (
                    <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5 font-medium">
                      {todosComentarios.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0)}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Dados */}
              <TabsContent value="dados" className="mt-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="px-6 py-5">
                    {naoEditavel ? (
                      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                        <p className="text-sm font-semibold text-yellow-700 mb-1">Edição não permitida</p>
                        <p className="text-sm text-yellow-700/80">
                          Sinistros só podem ser editados com status <strong>Aberto</strong>.
                          Status atual: <strong>{STATUS_SINISTRO_LABELS[sinistro.status]}</strong>.
                        </p>
                      </div>
                    ) : (
                      <Form {...form}>
                        <form id="editar-sinistro-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                          <div className="rounded-lg border bg-card p-4 space-y-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Ocorrência
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="tipoSinistro"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Tipo de sinistro</FormLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue />
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
                                    <FormLabel>Data de ocorrência</FormLabel>
                                    <FormControl>
                                      <DateInput
                                        value={field.value}
                                        onChange={field.onChange}
                                        showQuickSelect={false}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              control={form.control}
                              name="descricao"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Descrição</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} rows={3} className="resize-none" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="rounded-lg border bg-card p-4 space-y-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Valores e Referências
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="valorReclamado"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Valor reclamado (R$)</FormLabel>
                                    <FormControl>
                                      <Input {...field} type="number" min={0} step="0.01" placeholder="0,00" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="numeroSinistroExterno"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Protocolo externo</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="Nº seguradora" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>

                          <div className="rounded-lg border bg-card p-4 space-y-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Observações
                            </p>
                            <FormField
                              control={form.control}
                              name="observacoes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Textarea {...field} rows={3} placeholder="Opcional" className="resize-none" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </form>
                      </Form>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Anexos */}
              <TabsContent value="anexos" className="mt-0 flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto px-6 py-4">
                  <AnexosTab
                    entidade="sinistro"
                    entidadeId={sinistro.id}
                    isActive={activeTab === 'anexos'}
                  />
                </div>
              </TabsContent>

              {/* Histórico */}
              <TabsContent value="historico" className="mt-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="px-6 py-4">
                    <p className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Linha do tempo
                    </p>
                    {historico.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
                    ) : (
                      <div className="space-y-0">
                        {historico.map((h, i) => (
                          <div key={h.id} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary/40 shrink-0" />
                              {i < historico.length - 1 && (
                                <div className="w-px flex-1 bg-border mt-1" />
                              )}
                            </div>
                            <div className="pb-4 flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">
                                {dayjs(h.createdAt).format('DD/MM/YYYY HH:mm')}
                                {h.usuario && ` · ${h.usuario.nome}`}
                              </p>
                              {h.statusAnterior && h.statusNovo && (
                                <p className="text-sm mt-0.5">
                                  <span className="text-muted-foreground">
                                    {STATUS_SINISTRO_LABELS[h.statusAnterior]}
                                  </span>
                                  {' → '}
                                  <span className="font-medium">
                                    {STATUS_SINISTRO_LABELS[h.statusNovo]}
                                  </span>
                                </p>
                              )}
                              {h.descricao && (
                                <p className="text-xs text-muted-foreground mt-0.5">{h.descricao}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Comentários */}
              <TabsContent value="comentarios" className="mt-0 flex-1 overflow-hidden">
                <div className="h-full px-6 py-4">
                  <ComentariosPanel
                    comentarios={todosComentarios}
                    isLoading={isLoadingComentarios}
                    canAdd
                    isSending={adicionarComentario.isPending}
                    onAdd={(texto, parentId) => adicionarComentario.mutate({ sinistroId: sinistro!.id, texto, parentId })}
                    onPendingTextChange={setPendingComentario}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
