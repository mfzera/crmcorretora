
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AlertTriangle, Check, ChevronsUpDown, FileText, Loader2, MessageSquare, Paperclip, PlusCircle } from 'lucide-react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/core/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/core/ui/command';
import { Input } from '@/core/ui/input';
import { Textarea } from '@/core/ui/textarea';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { ScrollArea } from '@/core/ui/scroll-area';
import { cn } from '@/core/utils';
import { handleApiError } from '@/core/utils/handle-api-error';
import { dayjs } from '@/core/utils/date-utils';
import { TIPO_SINISTRO_LABELS } from '@/types/sinistro';
import { DateInput } from '@/core/ui/date-input';
import { useDocumentosVendaAtivos } from '@/modules/documentos-venda/http';
import { RegistrarApoliceAvulsaDialog } from '@/modules/documentos-venda/components/registrar-apolice-avulsa-dialog';
import { AnexosTab } from '@/modules/anexos/components';
import { useCreateSinistro, useHistoricoSinistro, useAdicionarAnotacaoSinistro } from '../http';

const schema = z.object({
  documentoVendaId: z.string().uuid('Selecione uma apólice'),
  tipoSinistro: z.enum([
    'COLISAO', 'ROUBO_FURTO', 'INCENDIO', 'DANOS_NATURAIS',
    'DANOS_TERCEIROS', 'INVALIDEZ', 'MORTE', 'HOSPITALIZACAO', 'OUTROS',
  ]),
  descricao: z.string().min(1, 'Descrição obrigatória').max(3000),
  dataOcorrencia: z.string().min(1, 'Data obrigatória'),
  valorReclamado: z.coerce.number().min(0).optional().or(z.literal('')),
  numeroSinistroExterno: z.string().max(100).optional().or(z.literal('')),
  observacoes: z.string().max(2000).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface NovoSinistroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDocumentoVendaId?: string;
}

export function NovoSinistroDialog({ open, onOpenChange, defaultDocumentoVendaId }: NovoSinistroDialogProps) {
  const criar = useCreateSinistro();
  const [apoliceSearch, setApoliceSearch] = useState('');
  const [apolicePopoverOpen, setApolicePopoverOpen] = useState(false);
  const [createdSinistroId, setCreatedSinistroId] = useState<string | null>(null);
  const [createdNumeroSinistro, setCreatedNumeroSinistro] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dados');
  const [novaAnotacao, setNovaAnotacao] = useState('');
  const [cadastrarApoliceOpen, setCadastrarApoliceOpen] = useState(false);

  const { data: historico = [] } = useHistoricoSinistro(createdSinistroId);
  const adicionarAnotacao = useAdicionarAnotacaoSinistro();
  const anotacoes = historico.filter((h) => h.tipo === 'ANOTACAO');

  const { data: apolices = [], isLoading: loadingApolices } = useDocumentosVendaAtivos(apoliceSearch);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      documentoVendaId: defaultDocumentoVendaId ?? '',
      tipoSinistro: 'OUTROS',
      descricao: '',
      dataOcorrencia: '',
      valorReclamado: '',
      numeroSinistroExterno: '',
      observacoes: '',
    },
  });

  const documentoVendaIdWatch = useWatch({ control: form.control, name: 'documentoVendaId' });
  const tipoSinistroWatch = useWatch({ control: form.control, name: 'tipoSinistro' });
  const dataOcorrenciaWatch = useWatch({ control: form.control, name: 'dataOcorrencia' });
  const valorReclamadoWatch = useWatch({ control: form.control, name: 'valorReclamado' });

  const selectedApolice = apolices.find((a) => a.id === documentoVendaIdWatch)
    ?? (defaultDocumentoVendaId ? apolices.find((a) => a.id === defaultDocumentoVendaId) : undefined);

  function getApoliceLabel(apolice: (typeof apolices)[0]) {
    const cliente = apolice.cliente?.nome || apolice.cliente?.razaoSocial || 'Cliente';
    const num = apolice.numeroApoliceExterna || apolice.numeroPropostaExterna || apolice.numero;
    return `${num} — ${cliente}`;
  }

  async function onSubmit(values: FormValues) {
    try {
      const sinistro = await criar.mutateAsync({
        documentoVendaId: values.documentoVendaId,
        tipoSinistro: values.tipoSinistro,
        descricao: values.descricao,
        dataOcorrencia: values.dataOcorrencia,
        valorReclamado: values.valorReclamado ? Number(values.valorReclamado) : undefined,
        numeroSinistroExterno: values.numeroSinistroExterno || undefined,
        observacoes: values.observacoes || undefined,
      });
      toast.success('Sinistro aberto com sucesso');
      setCreatedSinistroId(sinistro.id);
      setCreatedNumeroSinistro(sinistro.numeroSinistro);
      setActiveTab('dados');
    } catch (e) {
      toast.error(handleApiError(e));
    }
  }

  async function handleAdicionarAnotacao() {
    if (!createdSinistroId || !novaAnotacao.trim()) return;
    try {
      await adicionarAnotacao.mutateAsync({ id: createdSinistroId, texto: novaAnotacao.trim() });
      setNovaAnotacao('');
    } catch (e) {
      toast.error(handleApiError(e));
    }
  }

  function handleClose() {
    setCreatedSinistroId(null);
    setCreatedNumeroSinistro(null);
    setActiveTab('dados');
    setNovaAnotacao('');
    form.reset();
    setApoliceSearch('');
    onOpenChange(false);
  }

  const nomeCliente = selectedApolice?.cliente?.nome || selectedApolice?.cliente?.razaoSocial;
  const numeroApolice = selectedApolice
    ? (selectedApolice.numeroApoliceExterna || selectedApolice.numeroPropostaExterna || selectedApolice.numero)
    : null;

  function formatCurrency(value: number | null | undefined) {
    if (!value) return null;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return null;
    return dayjs(value).format('DD/MM/YYYY');
  }

  return (
    <>
    <RegistrarApoliceAvulsaDialog
      open={cadastrarApoliceOpen}
      onOpenChange={setCadastrarApoliceOpen}
      onSuccess={(documento) => {
        form.setValue('documentoVendaId', documento.id);
        // Força o popover a fechar e o campo a refletir a seleção
        setApolicePopoverOpen(false);
      }}
    />
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(true); }}>
      <DialogContent
        className="max-w-5xl! p-0 h-[85vh] gap-0"
        style={{ width: '95vw' }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Abrir Sinistro</DialogTitle>
          <DialogDescription>Registre um novo sinistro vinculado a uma apólice ativa</DialogDescription>
        </DialogHeader>

        <div className="flex h-full overflow-hidden">
          {/* Sidebar — hidden on mobile */}
          <aside className="hidden md:flex w-[260px] shrink-0 border-r bg-muted/30 flex-col h-full">
            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Sinistro</p>
                <p className="text-sm font-mono text-muted-foreground">Novo registro</p>
              </div>

              {nomeCliente ? (
                <>
                  <div>
                    <p className="font-bold text-xl leading-tight break-words">{nomeCliente}</p>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Apólice</p>
                    <p className="text-sm font-mono font-medium">{numeroApolice}</p>
                  </div>

                  {selectedApolice?.seguradoraParceira && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Seguradora</p>
                      <p className="text-sm font-medium">
                        {selectedApolice.seguradoraParceira.nomeFantasia || selectedApolice.seguradoraParceira.razaoSocial}
                      </p>
                    </div>
                  )}

                  {selectedApolice?.produto && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Produto</p>
                      <p className="text-sm font-semibold">{selectedApolice.produto.nomeProduto}</p>
                      <Badge variant="outline" className="mt-1 text-xs">{selectedApolice.produto.tipoSeguro}</Badge>
                    </div>
                  )}

                  {selectedApolice?.itemDescricao && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Item segurado</p>
                      <p className="text-sm font-medium">{selectedApolice.itemDescricao}</p>
                    </div>
                  )}

                  {(selectedApolice?.vigenciaInicio || selectedApolice?.vigenciaFim) && (
                    <div className="rounded-lg border bg-card p-3 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vigência</p>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedApolice.vigenciaInicio && (
                          <div>
                            <p className="text-xs text-muted-foreground">Início</p>
                            <p className="text-xs font-medium">{formatDate(selectedApolice.vigenciaInicio)}</p>
                          </div>
                        )}
                        {selectedApolice.vigenciaFim && (
                          <div>
                            <p className="text-xs text-muted-foreground">Término</p>
                            <p className="text-xs font-medium">{formatDate(selectedApolice.vigenciaFim)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(selectedApolice?.premioLiquido || selectedApolice?.valorSegurado || selectedApolice?.franquia) && (
                    <div className="rounded-lg border bg-card p-3 space-y-2">
                      {selectedApolice.premioLiquido && (
                        <div>
                          <p className="text-xs text-muted-foreground">Prêmio líquido</p>
                          <p className="text-lg font-bold">{formatCurrency(selectedApolice.premioLiquido)}</p>
                        </div>
                      )}
                      {selectedApolice.valorSegurado && (
                        <div>
                          <p className="text-xs text-muted-foreground">Valor segurado</p>
                          <p className="text-sm font-semibold">{formatCurrency(selectedApolice.valorSegurado)}</p>
                        </div>
                      )}
                      {selectedApolice.franquia && (
                        <div>
                          <p className="text-xs text-muted-foreground">Franquia</p>
                          <p className="text-sm font-medium">{formatCurrency(selectedApolice.franquia)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedApolice?.vendedor && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Vendedor</p>
                      <p className="text-sm font-medium">{selectedApolice.vendedor.nome}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Selecione uma apólice para ver os dados do seguro
                  </p>
                </div>
              )}

              {tipoSinistroWatch && tipoSinistroWatch !== 'OUTROS' && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Tipo de sinistro</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {TIPO_SINISTRO_LABELS[tipoSinistroWatch]}
                  </Badge>
                </div>
              )}

              {dataOcorrenciaWatch && (
                <div>
                  <p className="text-xs text-muted-foreground">Data da Ocorrência</p>
                  <p className="text-sm font-medium">
                    {dayjs(dataOcorrenciaWatch).format('DD/MM/YYYY')}
                  </p>
                </div>
              )}

              {valorReclamadoWatch && Number(valorReclamadoWatch) > 0 && (
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Valor Reclamado</p>
                  <p className="text-2xl font-bold">
                    {Number(valorReclamadoWatch).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t space-y-2 shrink-0">
              {createdSinistroId ? (
                <Button className="w-full" onClick={handleClose}>
                  Fechar
                </Button>
              ) : (
                <>
                  <Button
                    className="w-full"
                    onClick={() => form.handleSubmit(onSubmit)()}
                    disabled={criar.isPending}
                  >
                    {criar.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Abrindo...
                      </>
                    ) : (
                      'Abrir Sinistro'
                    )}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleClose}>
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </aside>

          {/* Main area */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-6 pt-6 pb-4 border-b shrink-0">
              <h2 className="flex items-center gap-3 text-2xl font-semibold">
                <div className="p-2 rounded-lg bg-primary/10">
                  <AlertTriangle className="size-6 text-primary" />
                </div>
                Abrir Sinistro
              </h2>
              <p className="mt-2 text-base text-muted-foreground">
                Registre um novo sinistro vinculado a uma apólice ativa
              </p>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col min-h-0"
            >
              <TabsList className="mx-6 mt-2 w-fit">
                <TabsTrigger value="dados" className="gap-2">
                  <FileText className="size-4" />
                  Dados
                </TabsTrigger>
                <TabsTrigger value="anexos" className="gap-2">
                  <Paperclip className="size-4" />
                  Anexos
                </TabsTrigger>
                <TabsTrigger value="comentarios" className="gap-2">
                  <MessageSquare className="size-4" />
                  Comentários
                  {anotacoes.length > 0 && (
                    <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5 font-medium">
                      {anotacoes.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Dados */}
              <TabsContent value="dados" className="mt-0 flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-5 h-full">
                  {createdSinistroId ? (
                    <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-6 space-y-2">
                      <p className="text-sm font-semibold text-green-700 flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Sinistro aberto com sucesso
                      </p>
                      <p className="text-sm text-green-700/80 font-mono font-medium">
                        Nº: {createdNumeroSinistro}
                      </p>
                      <p className="text-xs text-green-700/60">
                        Você pode adicionar anexos e comentários nas abas acima.
                      </p>
                    </div>
                  ) : (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Apólice */}
                        <div className="space-y-4">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Apólice
                          </h3>
                          <FormField
                            control={form.control}
                            name="documentoVendaId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Apólice vinculada</FormLabel>
                                {defaultDocumentoVendaId ? (
                                  <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                                    {selectedApolice ? getApoliceLabel(selectedApolice) : defaultDocumentoVendaId}
                                  </div>
                                ) : (
                                  <Popover open={apolicePopoverOpen} onOpenChange={setApolicePopoverOpen}>
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button
                                          variant="outline"
                                          role="combobox"
                                          className={cn(
                                            'w-full justify-between font-normal',
                                            !field.value && 'text-muted-foreground',
                                          )}
                                        >
                                          <span className="truncate">
                                            {selectedApolice
                                              ? getApoliceLabel(selectedApolice)
                                              : 'Buscar apólice por cliente ou nº...'}
                                          </span>
                                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                      </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[min(480px,90vw)] p-0" align="start">
                                      <Command shouldFilter={false}>
                                        <CommandInput
                                          placeholder="Buscar por cliente ou número..."
                                          value={apoliceSearch}
                                          onValueChange={setApoliceSearch}
                                        />
                                        <CommandList>
                                          {loadingApolices ? (
                                            <div className="py-6 text-center text-sm text-muted-foreground">
                                              Buscando...
                                            </div>
                                          ) : apolices.length === 0 ? (
                                            <CommandEmpty>Nenhuma apólice ativa encontrada.</CommandEmpty>
                                          ) : (
                                            <CommandGroup>
                                              {apolices.map((apolice) => (
                                                <CommandItem
                                                  key={apolice.id}
                                                  value={apolice.id}
                                                  onSelect={() => {
                                                    field.onChange(apolice.id);
                                                    setApolicePopoverOpen(false);
                                                  }}
                                                >
                                                  <Check
                                                    className={cn(
                                                      'mr-2 h-4 w-4',
                                                      field.value === apolice.id ? 'opacity-100' : 'opacity-0',
                                                    )}
                                                  />
                                                  <div className="flex flex-col">
                                                    <span className="text-sm font-medium">
                                                      {apolice.numeroApoliceExterna || apolice.numeroPropostaExterna || apolice.numero}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                      {apolice.cliente?.nome || apolice.cliente?.razaoSocial}
                                                      {apolice.produto && ` · ${apolice.produto.nomeProduto}`}
                                                    </span>
                                                  </div>
                                                </CommandItem>
                                              ))}
                                            </CommandGroup>
                                          )}
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                )}
                                <button
                                  type="button"
                                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1 transition-colors"
                                  onClick={() => setCadastrarApoliceOpen(true)}
                                >
                                  <PlusCircle className="h-3 w-3" />
                                  Cadastrar nova apólice
                                </button>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Ocorrência */}
                        <div className="space-y-4">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Ocorrência
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="tipoSinistro"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tipo de sinistro</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
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
                                  <FormLabel>Data da ocorrência</FormLabel>
                                  <FormControl>
                                    <div className="flex gap-2">
                                      <DateInput
                                        value={field.value}
                                        onChange={field.onChange}
                                        showQuickSelect={false}
                                        className="flex-1"
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="shrink-0 h-9"
                                        onClick={() => field.onChange(dayjs().format('YYYY-MM-DD'))}
                                      >
                                        Hoje
                                      </Button>
                                    </div>
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
                                  <Textarea
                                    placeholder="Descreva o ocorrido em detalhes..."
                                    className="min-h-[100px] resize-none"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Valores e referências */}
                        <div className="space-y-4">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Valores e Referências
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="valorReclamado"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Valor reclamado</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="0,00" {...field} />
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
                                  <FormLabel>Nº protocolo seguradora</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Protocolo externo" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Observações */}
                        <div className="space-y-4">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Observações
                          </h3>
                          <FormField
                            control={form.control}
                            name="observacoes"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Textarea
                                    placeholder="Observações adicionais sobre o sinistro..."
                                    className="min-h-[80px] resize-none"
                                    {...field}
                                  />
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
              </TabsContent>

              {/* Anexos */}
              <TabsContent value="anexos" className="mt-0 flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto px-6 py-4">
                  {createdSinistroId ? (
                    <AnexosTab
                      entidade="sinistro"
                      entidadeId={createdSinistroId}
                      isActive={activeTab === 'anexos'}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Salve o sinistro primeiro para adicionar anexos.</p>
                  )}
                </div>
              </TabsContent>

              {/* Comentários */}
              <TabsContent value="comentarios" className="mt-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="px-6 py-4 space-y-4">
                    {createdSinistroId ? (
                      <>
                        {anotacoes.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhuma anotação ainda.</p>
                        ) : (
                          <div className="space-y-3">
                            {anotacoes.map((a) => (
                              <div key={a.id} className="rounded-lg border bg-card p-3 space-y-1">
                                <p className="text-xs text-muted-foreground">
                                  {dayjs(a.createdAt).format('DD/MM/YYYY HH:mm')}
                                  {a.usuario && ` · ${a.usuario.nome}`}
                                </p>
                                <p className="text-sm">{a.descricao}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="space-y-2 pt-2">
                          <Textarea
                            placeholder="Adicionar anotação..."
                            className="min-h-[80px] resize-none text-sm"
                            value={novaAnotacao}
                            onChange={(e) => setNovaAnotacao(e.target.value)}
                          />
                          <Button
                            size="sm"
                            onClick={handleAdicionarAnotacao}
                            disabled={!novaAnotacao.trim() || adicionarAnotacao.isPending}
                          >
                            {adicionarAnotacao.isPending && (
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            )}
                            Adicionar
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Salve o sinistro primeiro para adicionar comentários.</p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Action buttons — mobile only (md+ uses sidebar footer) */}
            <div className="md:hidden p-4 border-t shrink-0 space-y-2">
              {createdSinistroId ? (
                <Button className="w-full" onClick={handleClose}>
                  Fechar
                </Button>
              ) : (
                <>
                  <Button
                    className="w-full"
                    onClick={() => form.handleSubmit(onSubmit)()}
                    disabled={criar.isPending}
                  >
                    {criar.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Abrindo...</>
                    ) : (
                      'Abrir Sinistro'
                    )}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleClose}>
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
