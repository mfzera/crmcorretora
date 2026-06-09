
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, Loader2, PlusCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Input } from '@/core/ui/input';
import { Button } from '@/core/ui/button';
import { cn } from '@/core/utils';
import { handleApiError } from '@/core/utils/handle-api-error';
import { DateInput } from '@/core/ui/date-input';
import { useClientes } from '@/modules/clientes/http';
import { useProdutos } from '@/modules/produtos/http';
import { useSeguradorasParceiras } from '@/modules/seguradoras-parceiras/http';
import { NovoClienteDialog } from '@/modules/clientes/components/novo-cliente-dialog';
import { useRegistrarApoliceAvulsa } from '../http';

const schema = z.object({
  clienteId: z.string().uuid('Selecione um cliente'),
  produtoId: z.string().uuid('Selecione um produto'),
  seguradoraParceiraId: z.string().uuid().optional().or(z.literal('')),
  numeroApoliceExterna: z.string().min(1, 'Número da apólice obrigatório').max(100),
  vigenciaInicio: z.string().min(1, 'Data de início obrigatória'),
  vigenciaFim: z.string().min(1, 'Data de término obrigatória'),
  premioLiquido: z.coerce.number().min(0).optional().or(z.literal('')),
  valorSegurado: z.coerce.number().min(0).optional().or(z.literal('')),
  itemDescricao: z.string().max(500).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface RegistrarApoliceAvulsaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClienteId?: string;
  onSuccess: (documento: any) => void;
}

export function RegistrarApoliceAvulsaDialog({
  open,
  onOpenChange,
  defaultClienteId,
  onSuccess,
}: RegistrarApoliceAvulsaDialogProps) {
  const registrar = useRegistrarApoliceAvulsa();

  const [clienteSearch, setClienteSearch] = useState('');
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const [seguradoraPopoverOpen, setSeguradoraPopoverOpen] = useState(false);
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);

  const { data: clientesData } = useClientes({ busca: clienteSearch }, 1, 20);
  const clientes = clientesData?.data ?? [];

  const { data: produtosData } = useProdutos(undefined, 1, 100);
  const produtos = produtosData?.data ?? [];

  const { data: seguradorasData } = useSeguradorasParceiras({ limit: 100 } as any);
  const seguradoras = seguradorasData?.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      clienteId: defaultClienteId ?? '',
      produtoId: '',
      seguradoraParceiraId: '',
      numeroApoliceExterna: '',
      vigenciaInicio: '',
      vigenciaFim: '',
      premioLiquido: '',
      valorSegurado: '',
      itemDescricao: '',
    },
  });

  const selectedClienteId = form.watch('clienteId');
  const selectedSeguradoraId = form.watch('seguradoraParceiraId');

  const selectedCliente = clientes.find((c) => c.id === selectedClienteId);
  const selectedSeguradora = seguradoras.find((s) => s.id === selectedSeguradoraId);

  function getClienteNome(c: (typeof clientes)[0]) {
    return c.nome || c.razaoSocial || c.id;
  }

  function getSeguradoraNome(s: (typeof seguradoras)[0]) {
    return (s as any).nomeFantasia || (s as any).razaoSocial || s.id;
  }

  async function onSubmit(values: FormValues) {
    try {
      const res = await registrar.mutateAsync({
        clienteId: values.clienteId,
        produtoId: values.produtoId,
        seguradoraParceiraId: values.seguradoraParceiraId || undefined,
        numeroApoliceExterna: values.numeroApoliceExterna,
        vigenciaInicio: values.vigenciaInicio,
        vigenciaFim: values.vigenciaFim,
        premioLiquido: values.premioLiquido ? Number(values.premioLiquido) : undefined,
        valorSegurado: values.valorSegurado ? Number(values.valorSegurado) : undefined,
        itemDescricao: values.itemDescricao || undefined,
      });
      toast.success('Apólice cadastrada com sucesso');
      onSuccess((res as any).data ?? res);
      handleClose();
    } catch (e) {
      toast.error(handleApiError(e));
    }
  }

  function handleClose() {
    form.reset();
    setClienteSearch('');
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Apólice</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Cliente */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cliente
                </h3>
                <FormField
                  control={form.control}
                  name="clienteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <div className="flex gap-2">
                        <Popover open={clientePopoverOpen} onOpenChange={setClientePopoverOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  'flex-1 justify-between font-normal',
                                  !field.value && 'text-muted-foreground',
                                )}
                              >
                                <span className="truncate">
                                  {selectedCliente
                                    ? getClienteNome(selectedCliente)
                                    : 'Buscar cliente...'}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[360px] p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput
                                placeholder="Buscar por nome..."
                                value={clienteSearch}
                                onValueChange={setClienteSearch}
                              />
                              <CommandList>
                                {clientes.length === 0 ? (
                                  <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                ) : (
                                  <CommandGroup>
                                    {clientes.map((c) => (
                                      <CommandItem
                                        key={c.id}
                                        value={c.id}
                                        onSelect={() => {
                                          field.onChange(c.id);
                                          setClientePopoverOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            'mr-2 h-4 w-4',
                                            field.value === c.id ? 'opacity-100' : 'opacity-0',
                                          )}
                                        />
                                        {getClienteNome(c)}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Criar novo cliente"
                          onClick={() => setNovoClienteOpen(true)}
                        >
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Dados da apólice */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Apólice
                </h3>

                <FormField
                  control={form.control}
                  name="numeroApoliceExterna"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número da apólice</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 123456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="produtoId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Produto</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {produtos.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nomeProduto}
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
                    name="seguradoraParceiraId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seguradora</FormLabel>
                        <Popover open={seguradoraPopoverOpen} onOpenChange={setSeguradoraPopoverOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between font-normal"
                              >
                                <span className="truncate text-sm">
                                  {selectedSeguradora
                                    ? getSeguradoraNome(selectedSeguradora)
                                    : <span className="text-muted-foreground">Opcional...</span>}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[280px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar..." />
                              <CommandList>
                                <CommandGroup>
                                  <CommandItem
                                    value=""
                                    onSelect={() => {
                                      field.onChange('');
                                      setSeguradoraPopoverOpen(false);
                                    }}
                                  >
                                    <Check className={cn('mr-2 h-4 w-4', !field.value ? 'opacity-100' : 'opacity-0')} />
                                    Nenhuma
                                  </CommandItem>
                                  {seguradoras.map((s) => (
                                    <CommandItem
                                      key={s.id}
                                      value={s.id}
                                      onSelect={() => {
                                        field.onChange(s.id);
                                        setSeguradoraPopoverOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          field.value === s.id ? 'opacity-100' : 'opacity-0',
                                        )}
                                      />
                                      {getSeguradoraNome(s)}
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
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="vigenciaInicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vigência início</FormLabel>
                        <FormControl>
                          <DateInput value={field.value} onChange={field.onChange} showQuickSelect={false} />
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
                        <FormLabel>Vigência término</FormLabel>
                        <FormControl>
                          <DateInput value={field.value} onChange={field.onChange} showQuickSelect={false} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="premioLiquido"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prêmio líquido</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="valorSegurado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor segurado</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="itemDescricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item / Bem segurado</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Toyota Corolla 2022, Placa ABC-1234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => form.handleSubmit(onSubmit)()}
              disabled={registrar.isPending}
            >
              {registrar.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cadastrar apólice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NovoClienteDialog
        open={novoClienteOpen}
        onOpenChange={setNovoClienteOpen}
        onClienteCriado={(cliente) => {
          form.setValue('clienteId', cliente.id);
          setNovoClienteOpen(false);
        }}
      />
    </>
  );
}
