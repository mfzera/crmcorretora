
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, UserPlus, Check, ChevronsUpDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { NovoClienteDialog } from '@/modules/clientes/components/novo-cliente-dialog';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { useSearchClients } from '@/modules/clientes/http';
import { useProdutos } from '@/modules/produtos/http';
import { useSeguradorasParceiras } from '@/modules/seguradoras-parceiras/http';

const novoSeguroSchema = z
  .object({
    clienteId: z.string().uuid('Selecione um cliente'),
    produtoId: z.string().uuid('Selecione um produto'),
    seguradoraParceiraId: z.string().uuid('Selecione uma seguradora'),
    situacao: z.enum(['NOVO', 'RENOVACAO'], {
      error: 'Selecione a situação',
    }),
    vigenciaInicio: z.string().min(1, 'Informe a data de início'),
    vigenciaFim: z.string().min(1, 'Informe a data de fim'),
    premioLiquido: z.string().optional(),
    observacoes: z.string().optional(),
  })
  .refine((data) => data.vigenciaFim > data.vigenciaInicio, {
    message: 'A data de fim deve ser posterior à data de início',
    path: ['vigenciaFim'],
  });

type NovoSeguroForm = z.infer<typeof novoSeguroSchema>;

interface NovoSeguroDialogProps {
  onCriar: (data: NovoSeguroForm) => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCriarSemCliente?: () => void;
}

export function NovoSeguroDialog({
  onCriar,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onCriarSemCliente,
}: NovoSeguroDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const [isLoading, setIsLoading] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const [produtoPopoverOpen, setProdutoPopoverOpen] = useState(false);
  const [seguradoraPopoverOpen, setSeguradoraPopoverOpen] = useState(false);
  const [situacaoPopoverOpen, setSituacaoPopoverOpen] = useState(false);
  const [showNovoCliente, setShowNovoCliente] = useState(false);

  const { data: clientesData, isLoading: isLoadingClientes } =
    useSearchClients(clienteSearch);
  const clientes = clientesData || [];

  const { data: produtosData } = useProdutos({ ativo: true }, 1, 100);
  const produtos = produtosData?.data || [];

  const { data: seguradorasData } = useSeguradorasParceiras({
    status: 'ATIVA',
    limit: 100,
  });
  const seguradoras = seguradorasData?.data || [];

  const form = useForm<NovoSeguroForm>({
    resolver: zodResolver(novoSeguroSchema),
    defaultValues: {
      observacoes: '',
    },
  });

  const onSubmit = async (data: NovoSeguroForm) => {
    try {
      setIsLoading(true);

      const parsePremio = (value: string | undefined) => {
        if (!value || value.trim() === '') return undefined;
        const parsed = parseFloat(value);
        if (isNaN(parsed)) throw new Error('Valor inválido para prêmio');
        return value;
      };

      await onCriar({
        ...data,
        premioLiquido: parsePremio(data.premioLiquido),
      } as any);

      toast.success('Cotação criada com sucesso!');
      setOpen(false);
      form.reset();
      setClienteSearch('');
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const getClienteNome = (id: string) => {
    const cliente = clientes.find((c: any) => c.id === id);
    return cliente?.nome || cliente?.razaoSocial || 'Cliente selecionado';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Seguro</DialogTitle>
            <DialogDescription>
              Inicie uma nova cotação ou venda direta para seus clientes.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Cliente - combobox com busca */}
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
                                  !field.value && 'text-mduted-foreground',
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
                            className="w-[400px] p-0"
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
                                    : 'Nenhum cliente encontrado'}
                                </CommandEmpty>
                                <CommandGroup>
                                  {clientes.map((cliente: any) => {
                                    const nome =
                                      cliente.nome || cliente.razaoSocial || '';
                                    return (
                                      <CommandItem
                                        key={cliente.id}
                                        value={cliente.id}
                                        onSelect={() => {
                                          form.setValue(
                                            'clienteId',
                                            cliente.id,
                                          );
                                          setClientePopoverOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            'mr-2 h-4 w-4',
                                            cliente.id === field.value
                                              ? 'opacity-100'
                                              : 'opacity-0',
                                          )}
                                        />
                                        <div className="flex flex-col">
                                          <span>{nome}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {cliente.email}
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

                {/* Produto - combobox com busca */}
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
                                ? produtos.find((p) => p.id === field.value)
                                    ?.nomeProduto || 'Produto selecionado'
                                : 'Selecione o produto'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar produto..." />
                            <CommandList>
                              <CommandEmpty>
                                {produtos.length === 0
                                  ? 'Nenhum produto cadastrado.'
                                  : 'Nenhum produto encontrado'}
                              </CommandEmpty>
                              <CommandGroup>
                                {produtos.map((produto) => (
                                  <CommandItem
                                    key={produto.id}
                                    value={produto.nomeProduto}
                                    onSelect={() => {
                                      form.setValue('produtoId', produto.id);
                                      setProdutoPopoverOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        produto.id === field.value
                                          ? 'opacity-100'
                                          : 'opacity-0',
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span>{produto.nomeProduto}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {produto.tipoSeguro}
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

                {/* Seguradora - combobox */}
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
                                ? seguradoras.find((s) => s.id === field.value)
                                    ?.nomeFantasia ||
                                  seguradoras.find((s) => s.id === field.value)
                                    ?.razaoSocial ||
                                  'Seguradora selecionada'
                                : 'Selecione a seguradora'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar seguradora..." />
                            <CommandList>
                              <CommandEmpty>
                                Nenhuma seguradora encontrada
                              </CommandEmpty>
                              <CommandGroup>
                                {seguradoras.map((seguradora) => (
                                  <CommandItem
                                    key={seguradora.id}
                                    value={
                                      seguradora.nomeFantasia ||
                                      seguradora.razaoSocial
                                    }
                                    onSelect={() => {
                                      form.setValue(
                                        'seguradoraParceiraId',
                                        seguradora.id,
                                      );
                                      setSeguradoraPopoverOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        seguradora.id === field.value
                                          ? 'opacity-100'
                                          : 'opacity-0',
                                      )}
                                    />
                                    {seguradora.nomeFantasia ||
                                      seguradora.razaoSocial}
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

                {/* Situação - combobox */}
                <FormField
                  control={form.control}
                  name="situacao"
                  render={({ field }) => {
                    const situacoes = [
                      { value: 'NOVO', label: 'Novo' },
                      { value: 'RENOVACAO', label: 'Renovação' },
                    ];
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Situação *</FormLabel>
                        <Popover
                          open={situacaoPopoverOpen}
                          onOpenChange={setSituacaoPopoverOpen}
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
                                  ? situacoes.find(
                                      (s) => s.value === field.value,
                                    )?.label
                                  : 'Selecione a situação'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[200px] p-0"
                            align="start"
                          >
                            <Command>
                              <CommandList>
                                <CommandGroup>
                                  {situacoes.map((situacao) => (
                                    <CommandItem
                                      key={situacao.value}
                                      value={situacao.label}
                                      onSelect={() => {
                                        form.setValue(
                                          'situacao',
                                          situacao.value as
                                            | 'NOVO'
                                            | 'RENOVACAO',
                                        );
                                        setSituacaoPopoverOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          situacao.value === field.value
                                            ? 'opacity-100'
                                            : 'opacity-0',
                                        )}
                                      />
                                      {situacao.label}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vigenciaInicio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Início da Vigência</FormLabel>
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
                      <FormLabel>Fim da Vigência</FormLabel>
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
                name="premioLiquido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prêmio Líquido (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="R$ 0,00"
                        step="0.01"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Preencha com o valor real após a cotação
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Digite observações sobre este seguro..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Criar Seguro
                </Button>
              </div>

              {onCriarSemCliente && (
                <div className="pt-1 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => { setOpen(false); onCriarSemCliente(); }}
                    className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  >
                    Criar sem cliente cadastrado →
                  </button>
                </div>
              )}
            </form>
          </Form>
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
