
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2,
  UserPlus,
  Check,
  ChevronsUpDown,
  Paperclip,
  FileEdit,
  Shield,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
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
import { Textarea } from '@/core/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/core/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/core/ui/popover';
import { cn } from '@/core/utils';
import { DateInput } from '@/core/ui/date-input';
import { AnexoUploader } from '@/modules/anexos/components/anexo-uploader';
import { AnexoList } from '@/modules/anexos/components/anexo-list';
import { NovoClienteDialog } from '@/modules/clientes/components/novo-cliente-dialog';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { useSearchClients } from '@/modules/clientes/http';
import { useProdutos } from '@/modules/produtos/http';
import { useSeguradorasParceiras } from '@/modules/seguradoras-parceiras/http';
import {
  useRegistrarEndossoExterno,
  useDocumentosCliente,
  documentosVendaKeys,
} from '@/modules/documentos-venda/http';
import { useQueryClient } from '@tanstack/react-query';
import type { TipoEndosso } from '@/types/area-trabalho';
import type { DocumentoVenda } from '@/types/documento-venda';

const tiposEndosso: { value: TipoEndosso; label: string }[] = [
  { value: 'INCLUSAO_COBERTURA', label: 'Inclusão de Cobertura' },
  { value: 'EXCLUSAO_COBERTURA', label: 'Exclusão de Cobertura' },
  { value: 'ALTERACAO_VALOR', label: 'Alteração de Valor' },
  { value: 'INCLUSAO_ITEM', label: 'Inclusão de Item' },
  { value: 'EXCLUSAO_ITEM', label: 'Exclusão de Item' },
  { value: 'ALTERACAO_DADOS', label: 'Alteração de Dados' },
  { value: 'ALTERACAO_VIGENCIA', label: 'Alteração de Vigência' },
  { value: 'TRANSFERENCIA_SEGURADO', label: 'Transferência de Segurado' },
  { value: 'SUBSTITUICAO_VEICULO', label: 'Substituição de Veículo' },
  { value: 'CANCELAMENTO', label: 'Cancelamento' },
  { value: 'OUTROS', label: 'Outros' },
];

const schema = z.object({
  clienteId: z.string().uuid('Selecione um cliente'),
  produtoId: z.string().uuid('Selecione um produto'),
  seguradoraParceiraId: z.string().uuid('Selecione uma seguradora').optional(),
  numeroPropostaExterna: z.string().min(1, 'Informe o número da proposta'),
  vigenciaInicio: z.string().min(1, 'Informe a data de início'),
  vigenciaFim: z.string().min(1, 'Informe a data de fim'),
  premioLiquido: z.coerce
    .number({ error: 'Informe o prêmio' })
    .min(0, 'Informe o prêmio'),
  percentualComissao: z.coerce.number().min(0).max(100).optional(),
  observacoesDocumento: z.string().optional(),
  tipoEndosso: z.enum(
    [
      'INCLUSAO_COBERTURA',
      'EXCLUSAO_COBERTURA',
      'ALTERACAO_VALOR',
      'INCLUSAO_ITEM',
      'EXCLUSAO_ITEM',
      'ALTERACAO_DADOS',
      'ALTERACAO_VIGENCIA',
      'TRANSFERENCIA_SEGURADO',
      'SUBSTITUICAO_VEICULO',
      'CANCELAMENTO',
      'OUTROS',
    ] as const,
    { error: 'Selecione o tipo de endosso' },
  ),
  descricao: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  dataVigenciaEndosso: z.string().min(1, 'Informe a data de vigência'),
  premioNovo: z.coerce.number().min(0).optional(),
  percentualComissaoNovo: z.coerce.number().min(0).max(100).optional(),
  motivoEndosso: z.string().optional(),
  observacoesEndosso: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const STEP1_FIELDS: (keyof FormData)[] = [
  'clienteId',
  'produtoId',
  'numeroPropostaExterna',
  'vigenciaInicio',
  'vigenciaFim',
  'premioLiquido',
];

function formatarMoeda(value: number | null | undefined) {
  if (value == null) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatarData(value: string | null | undefined) {
  if (!value) return '-';
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00Z`);
  return date.toLocaleDateString('pt-BR');
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegistrarEndossoExternoDialog({ open, onOpenChange }: Props) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [endossoId, setEndossoId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const [produtoPopoverOpen, setProdutoPopoverOpen] = useState(false);
  const [seguradoraPopoverOpen, setSeguradoraPopoverOpen] = useState(false);
  const [showNovoCliente, setShowNovoCliente] = useState(false);
  const [documentoSelecionado, setDocumentoSelecionado] =
    useState<DocumentoVenda | null>(null);

  const queryClient = useQueryClient();
  const registrarMutation = useRegistrarEndossoExterno();

  const { data: clientesData, isLoading: isLoadingClientes } =
    useSearchClients(clienteSearch);
  const clientes = clientesData || [];

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      tipoEndosso: 'ALTERACAO_DADOS',
      descricao: '',
      motivoEndosso: '',
      observacoesEndosso: '',
      observacoesDocumento: '',
      dataVigenciaEndosso: (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })(),
      premioLiquido: 0,
      premioNovo: undefined,
      percentualComissao: undefined,
      percentualComissaoNovo: undefined,
    },
  });

  const clienteIdWatched = form.watch('clienteId');

  const { data: documentosCliente = [], isLoading: isLoadingDocumentos } =
    useDocumentosCliente(clienteIdWatched || null);

  const { data: produtosData } = useProdutos({ ativo: true }, 1, 100);
  const produtos = produtosData?.data || [];

  const { data: seguradorasData } = useSeguradorasParceiras({ status: 'ATIVA', limit: 100 });
  const seguradoras = seguradorasData?.data || [];

  const handleClose = () => {
    setCurrentStep(1);
    setEndossoId(null);
    setClienteSearch('');
    setDocumentoSelecionado(null);
    form.reset();
    queryClient.invalidateQueries({ queryKey: documentosVendaKeys.lists() });
    queryClient.invalidateQueries({ queryKey: ['area-trabalho', 'endossos'] });
    queryClient.invalidateQueries({ queryKey: ['area-trabalho', 'resumo'] });
    onOpenChange(false);
  };

  const handleSelecionarDocumento = (doc: DocumentoVenda) => {
    setDocumentoSelecionado(doc);
    form.setValue('produtoId', doc.produtoId);
    form.setValue(
      'seguradoraParceiraId',
      doc.seguradoraParceiraId || '',
    );
    form.setValue(
      'numeroPropostaExterna',
      doc.numeroPropostaExterna || doc.numeroApoliceExterna || doc.numero || '',
    );
    form.setValue('vigenciaInicio', doc.vigenciaInicio || '');
    form.setValue('vigenciaFim', doc.vigenciaFim || '');
    form.setValue('premioLiquido', doc.premioLiquido ?? 0);
    if (doc.percentualComissao != null) {
      form.setValue('percentualComissao', doc.percentualComissao);
    }
  };

  const handleLimparDocumento = () => {
    setDocumentoSelecionado(null);
    form.setValue('produtoId', '' as any);
    form.setValue('seguradoraParceiraId', '' as any);
    form.setValue('numeroPropostaExterna', '');
    form.setValue('vigenciaInicio', '');
    form.setValue('vigenciaFim', '');
    form.setValue('premioLiquido', 0);
    form.setValue('percentualComissao', undefined);
  };

  const handleStep1Next = async () => {
    const valid = await form.trigger(STEP1_FIELDS);
    if (valid) setCurrentStep(2);
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      const result = await registrarMutation.mutateAsync({
        clienteId: data.clienteId,
        produtoId: data.produtoId,
        seguradoraParceiraId: data.seguradoraParceiraId || undefined,
        numeroPropostaExterna: data.numeroPropostaExterna,
        vigenciaInicio: data.vigenciaInicio,
        vigenciaFim: data.vigenciaFim,
        premioLiquido: data.premioLiquido,
        percentualComissao: data.percentualComissao,
        observacoesDocumento: data.observacoesDocumento,
        tipoEndosso: data.tipoEndosso,
        descricao: data.descricao,
        motivoEndosso: data.motivoEndosso,
        premioNovo: data.premioNovo,
        percentualComissaoNovo: data.percentualComissaoNovo,
        dataVigenciaEndosso: data.dataVigenciaEndosso,
        observacoesEndosso: data.observacoesEndosso,
      });
      setEndossoId((result as any).endosso?.id);
      setCurrentStep(3);
      toast.success('Endosso registrado com sucesso!');
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getClienteNome = (id: string) => {
    const c = clientes.find((c: any) => c.id === id);
    return c?.nome || c?.razaoSocial || 'Cliente selecionado';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5" />
              Registrar Endosso
            </DialogTitle>
            <DialogDescription>
              Registre uma proposta/apólice recebida da seguradora junto com o
              endosso correspondente.
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2 py-2">
            {[
              { n: 1, label: 'Apólice' },
              { n: 2, label: 'Endosso' },
              { n: 3, label: 'Documentos' },
            ].map(({ n, label }, idx) => (
              <div key={n} className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                    currentStep === n
                      ? 'bg-primary text-primary-foreground'
                      : currentStep > n
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {n}
                </div>
                <span
                  className={cn(
                    'text-sm',
                    currentStep === n
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {label}
                </span>
                {idx < 2 && <div className="mx-1 h-px w-8 bg-border" />}
              </div>
            ))}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* ── ETAPA 1: Dados da proposta/apólice ── */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  {/* Cliente */}
                  <FormField
                    control={form.control}
                    name="clienteId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Cliente *</FormLabel>
                        <div className="flex gap-2">
                          <Popover
                            open={clientePopoverOpen}
                            onOpenChange={setClientePopoverOpen}
                            modal
                          >
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    'flex-1 min-w-0 justify-between',
                                    !field.value && 'text-muted-foreground',
                                  )}
                                >
                                  <span className="truncate text-left flex-1 min-w-0">
                                    {field.value
                                      ? getClienteNome(field.value)
                                      : 'Selecione o cliente'}
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[380px] p-0"
                              align="start"
                            >
                              <Command shouldFilter={false}>
                                <CommandInput
                                  placeholder="Buscar cliente..."
                                  value={clienteSearch}
                                  onValueChange={setClienteSearch}
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    {clienteSearch.length < 3
                                      ? 'Digite ao menos 3 caracteres para buscar'
                                      : isLoadingClientes
                                        ? 'Buscando...'
                                        : 'Nenhum cliente encontrado'}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {clientes.map((c: any) => {
                                      const nome =
                                        c.nome || c.razaoSocial || '';
                                      return (
                                        <CommandItem
                                          key={c.id}
                                          value={c.id}
                                          onSelect={() => {
                                            // ao trocar cliente, limpa documento selecionado
                                            if (c.id !== field.value) {
                                              handleLimparDocumento();
                                            }
                                            form.setValue('clienteId', c.id);
                                            setClientePopoverOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              'mr-2 h-4 w-4',
                                              c.id === field.value
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                            )}
                                          />
                                          <div className="flex flex-col">
                                            <span>{nome}</span>
                                            <span className="text-xs text-muted-foreground">
                                              {c.email}
                                            </span>
                                          </div>
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setShowNovoCliente(true)}
                            title="Adicionar novo cliente"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Lista de documentos ativos do cliente */}
                  {clienteIdWatched && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {isLoadingDocumentos
                          ? 'Carregando documentos...'
                          : documentosCliente.length > 0
                            ? 'Documentos ativos do cliente — selecione para preencher automaticamente:'
                            : 'Nenhum documento ativo encontrado para este cliente.'}
                      </p>

                      {isLoadingDocumentos && (
                        <div className="flex items-center gap-2 py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Buscando documentos...
                          </span>
                        </div>
                      )}

                      {!isLoadingDocumentos && documentosCliente.length > 0 && (
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          {(documentosCliente as DocumentoVenda[]).map((doc) => {
                            const selecionado =
                              documentoSelecionado?.id === doc.id;
                            return (
                              <button
                                key={doc.id}
                                type="button"
                                onClick={() =>
                                  selecionado
                                    ? handleLimparDocumento()
                                    : handleSelecionarDocumento(doc)
                                }
                                className={cn(
                                  'w-full text-left rounded-lg border p-3 transition-colors',
                                  selecionado
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                    : 'border-border hover:border-primary/50 hover:bg-muted/50',
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Shield className="h-4 w-4 shrink-0 text-primary" />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium font-mono truncate">
                                        {doc.numeroPropostaExterna ||
                                          doc.numeroApoliceExterna ||
                                          doc.numero ||
                                          'Sem número'}
                                      </p>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {doc.produto?.nomeProduto}
                                        {doc.seguradoraParceira &&
                                          ` · ${doc.seguradoraParceira.nomeFantasia || doc.seguradoraParceira.razaoSocial}`}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                                      {formatarMoeda(doc.premioLiquido)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatarData(doc.vigenciaInicio)} –{' '}
                                      {formatarData(doc.vigenciaFim)}
                                    </p>
                                  </div>
                                </div>
                                {selecionado && (
                                  <div className="mt-2 flex items-center gap-1">
                                    <Check className="h-3 w-3 text-primary" />
                                    <span className="text-xs text-primary font-medium">
                                      Selecionada
                                    </span>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Badge de documento selecionado + campos preenchidos */}
                  {documentoSelecionado && (
                    <div className="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm text-primary font-medium flex-1">
                        Campos preenchidos com a proposta{' '}
                        <span className="font-mono">
                          {documentoSelecionado.numeroPropostaExterna ||
                            documentoSelecionado.numeroApoliceExterna ||
                            documentoSelecionado.numero}
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={handleLimparDocumento}
                        title="Limpar seleção"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Campos manuais — sempre visíveis, preenchidos automaticamente se documento selecionado */}
                  <div className="space-y-4 pt-1">
                    <FormField
                      control={form.control}
                      name="numeroPropostaExterna"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número da Proposta na Seguradora *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: PROP-2025-00123"
                              className="font-mono"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      {/* Produto */}
                      <FormField
                        control={form.control}
                        name="produtoId"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Produto *</FormLabel>
                            <Popover
                              open={produtoPopoverOpen}
                              onOpenChange={setProdutoPopoverOpen}
                              modal
                            >
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      'justify-between',
                                      !field.value && 'text-muted-foreground',
                                    )}
                                  >
                                    {field.value
                                      ? produtos.find(
                                          (p) => p.id === field.value,
                                        )?.nomeProduto || 'Produto selecionado'
                                      : 'Selecione o produto'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-[380px] p-0"
                                align="start"
                              >
                                <Command>
                                  <CommandInput placeholder="Buscar produto..." />
                                  <CommandList>
                                    <CommandEmpty>
                                      {produtos.length === 0
                                        ? 'Nenhum produto cadastrado.'
                                        : 'Nenhum produto encontrado'}
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {produtos.map((p) => (
                                        <CommandItem
                                          key={p.id}
                                          value={p.nomeProduto}
                                          onSelect={() => {
                                            form.setValue('produtoId', p.id);
                                            setProdutoPopoverOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              'mr-2 h-4 w-4',
                                              p.id === field.value
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                            )}
                                          />
                                          <div className="flex flex-col">
                                            <span>{p.nomeProduto}</span>
                                            <span className="text-xs text-muted-foreground">
                                              {p.tipoSeguro}
                                            </span>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Seguradora */}
                      <FormField
                        control={form.control}
                        name="seguradoraParceiraId"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Seguradora *</FormLabel>
                            <Popover
                              open={seguradoraPopoverOpen}
                              onOpenChange={setSeguradoraPopoverOpen}
                              modal
                            >
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      'justify-between',
                                      !field.value && 'text-muted-foreground',
                                    )}
                                  >
                                    {field.value
                                      ? seguradoras.find(
                                          (s) => s.id === field.value,
                                        )?.nomeFantasia ||
                                        seguradoras.find(
                                          (s) => s.id === field.value,
                                        )?.razaoSocial ||
                                        'Seguradora selecionada'
                                      : 'Selecione a seguradora'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-[380px] p-0"
                                align="start"
                              >
                                <Command>
                                  <CommandInput placeholder="Buscar seguradora..." />
                                  <CommandList>
                                    <CommandEmpty>
                                      Nenhuma seguradora encontrada
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {seguradoras.map((s) => (
                                        <CommandItem
                                          key={s.id}
                                          value={s.nomeFantasia || s.razaoSocial}
                                          onSelect={() => {
                                            form.setValue(
                                              'seguradoraParceiraId',
                                              s.id,
                                            );
                                            setSeguradoraPopoverOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              'mr-2 h-4 w-4',
                                              s.id === field.value
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                            )}
                                          />
                                          {s.nomeFantasia || s.razaoSocial}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Prêmio */}
                      <FormField
                        control={form.control}
                        name="premioLiquido"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prêmio Líquido *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0.00"
                                step="0.01"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* % Comissão */}
                      <FormField
                        control={form.control}
                        name="percentualComissao"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>% Comissão</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0.00"
                                step="0.01"
                                {...field}
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormDescription>
                              Deixe em branco para usar o padrão do produto
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="vigenciaInicio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Início da Vigência *</FormLabel>
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
                      <FormField
                        control={form.control}
                        name="vigenciaFim"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fim da Vigência *</FormLabel>
                            <FormControl>
                              <DateInput
                                value={field.value}
                                onChange={field.onChange}
                                quickSelectLabel="+1 Ano"
                                quickSelectBaseDate={form.watch('vigenciaInicio')}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="observacoesDocumento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notas do Documento (opcional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Notas sobre a apólice..."
                              rows={2}
                              className="resize-none"
                              {...field}
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
                      onClick={handleClose}
                    >
                      Cancelar
                    </Button>
                    <Button type="button" onClick={handleStep1Next}>
                      Próximo
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {/* ── ETAPA 2: Dados do endosso ── */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="tipoEndosso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Endosso *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tiposEndosso.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
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
                        <FormLabel>Descrição das Alterações *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descreva detalhadamente as alterações do endosso..."
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Mínimo 10 caracteres</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="premioNovo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Novo Prêmio Líquido</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder={String(
                                form.getValues('premioLiquido') || '0.00',
                              )}
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Deixe em branco se o prêmio não foi alterado
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="percentualComissaoNovo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nova % Comissão</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="dataVigenciaEndosso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Vigência do Endosso *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>
                          Data em que o endosso entra em vigor
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="motivoEndosso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motivo do Endosso</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Explique o motivo do endosso..."
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="observacoesEndosso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas do Endosso (opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Informações adicionais..."
                            rows={2}
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
                      onClick={() => setCurrentStep(1)}
                      disabled={isSubmitting}
                    >
                      Voltar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Registrar
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </form>
          </Form>

          {/* ── ETAPA 3: Upload de documentos ── */}
          {currentStep === 3 && endossoId && (
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Endosso registrado com sucesso! Adicione os documentos
                  necessários abaixo (opcional).
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Paperclip className="size-4" />
                  Anexos do Endosso
                </h4>
                <AnexoUploader
                  entidade="endosso"
                  entidadeId={endossoId}
                  maxFiles={10}
                />
                <AnexoList entidade="endosso" entidadeId={endossoId} />
              </div>

              <DialogFooter>
                <Button onClick={handleClose}>Finalizar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <NovoClienteDialog
        open={showNovoCliente}
        onOpenChange={setShowNovoCliente}
        onClienteCriado={(cliente) => {
          form.setValue('clienteId', cliente.id);
          setClienteSearch(cliente.nome || cliente.razaoSocial || '');
          setShowNovoCliente(false);
        }}
      />
    </>
  );
}
