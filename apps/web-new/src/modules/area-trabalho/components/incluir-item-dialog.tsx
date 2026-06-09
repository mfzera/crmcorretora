
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2,
  Check,
  ChevronsUpDown,
  ArrowLeftRight,
  CheckCircle2,
  Paperclip,
} from 'lucide-react';
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
import { Separator } from '@/core/ui/separator';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { useProdutos } from '@/modules/produtos/http';
import { useSeguradorasParceiras } from '@/modules/seguradoras-parceiras/http';
import { useVendedores } from '@/modules/usuarios/http';
import { useSolicitarInclusaoItem } from '../http';
import { AnexosTab } from '@/modules/anexos/components';
import type { DocumentoVenda } from '@/types/documento-venda';

const incluirItemSchema = z.object({
  produtoId: z.string().uuid('Selecione um produto'),
  seguradoraParceiraId: z.string().uuid('Selecione uma seguradora'),
  vigenciaInicio: z.string().min(1, 'Informe a data de início'),
  vigenciaFim: z.string().min(1, 'Informe a data de fim'),
  premioLiquido: z.string().optional(),
  itemDescricao: z.string().max(500).optional(),
  novoVendedorId: z.string().uuid().optional(),
  observacoes: z
    .string()
    .min(10, 'Justificativa deve ter no mínimo 10 caracteres')
    .max(2000),
});

type IncluirItemForm = z.infer<typeof incluirItemSchema>;

interface IncluirItemDialogProps {
  documento: DocumentoVenda;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IncluirItemDialog({
  documento,
  open,
  onOpenChange,
}: IncluirItemDialogProps) {
  const [produtoPopoverOpen, setProdutoPopoverOpen] = useState(false);
  const [seguradoraPopoverOpen, setSeguradoraPopoverOpen] = useState(false);
  const [vendedorPopoverOpen, setVendedorPopoverOpen] = useState(false);
  const [etapa, setEtapa] = useState<'form' | 'anexos' | 'concluido'>('form');
  const [formData, setFormData] = useState<IncluirItemForm | null>(null);

  const { data: produtosData } = useProdutos({ ativo: true }, 1, 100);
  const produtos = produtosData?.data || [];

  const { data: seguradorasData } = useSeguradorasParceiras({ status: 'ATIVA', limit: 100 });
  const seguradoras = seguradorasData?.data || [];

  const { data: vendedores = [] } = useVendedores();

  const solicitarInclusao = useSolicitarInclusaoItem();

  const getClienteName = () => {
    if (documento.cliente.tipoPessoa === 'PF') {
      return documento.cliente.nome || 'Cliente';
    }
    return documento.cliente.razaoSocial || 'Cliente';
  };

  const form = useForm<IncluirItemForm>({
    resolver: zodResolver(incluirItemSchema),
    defaultValues: {
      produtoId: documento.produtoId,
      seguradoraParceiraId: documento.seguradoraParceiraId,
      vigenciaInicio: documento.vigenciaInicio,
      vigenciaFim: documento.vigenciaFim,
      premioLiquido: '',
      itemDescricao: '',
      observacoes: '',
    },
  });

  const handleClose = () => {
    setEtapa('form');
    setFormData(null);
    form.reset({
      produtoId: documento.produtoId,
      seguradoraParceiraId: documento.seguradoraParceiraId,
      vigenciaInicio: documento.vigenciaInicio,
      vigenciaFim: documento.vigenciaFim,
      premioLiquido: '',
      itemDescricao: '',
      observacoes: '',
    });
    onOpenChange(false);
  };

  const onSubmit = (data: IncluirItemForm) => {
    setFormData(data);
    setEtapa('anexos');
  };

  const handleEnviar = async () => {
    if (!formData) return;
    try {
      const premioLiquido =
        formData.premioLiquido && formData.premioLiquido.trim() !== ''
          ? parseFloat(formData.premioLiquido)
          : undefined;

      await solicitarInclusao.mutateAsync({
        documentoId: documento.id,
        data: {
          produtoId: formData.produtoId,
          seguradoraParceiraId: formData.seguradoraParceiraId,
          vigenciaInicio: formData.vigenciaInicio,
          vigenciaFim: formData.vigenciaFim,
          premioLiquido,
          itemDescricao: formData.itemDescricao || undefined,
          observacoes: formData.observacoes,
          novoVendedorId: formData.novoVendedorId || undefined,
        },
      });

      setEtapa('concluido');
      toast.success('Enviado para cadastro!');
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="size-4" />
            Solicitar Alteração
          </DialogTitle>
          <DialogDescription>
            Documento{' '}
            <span className="font-medium">{documento.numero}</span> —{' '}
            {getClienteName()}
          </DialogDescription>
        </DialogHeader>

        {etapa === 'concluido' ? (
          /* Etapa 3: concluído */
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 p-3">
              <CheckCircle2 className="size-5 text-green-600 dark:text-green-400 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-green-900 dark:text-green-100">
                  Enviado para cadastro!
                </p>
                <p className="text-green-700 dark:text-green-300">
                  O documento foi encaminhado para a equipe de cadastro.
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleClose}>Fechar</Button>
            </div>
          </div>
        ) : etapa === 'anexos' ? (
          /* Etapa 2: anexos + confirmar envio */
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-3">
              <Paperclip className="size-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Anexe documentos de suporte se necessário, depois clique em{' '}
                <strong>Enviar para Cadastro</strong>.
              </p>
            </div>

            <Separator />

            <AnexosTab
              entidade="documento_venda"
              entidadeId={documento.id}
              isActive={true}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setEtapa('form')}
                disabled={solicitarInclusao.isPending}
              >
                Voltar
              </Button>
              <Button
                onClick={handleEnviar}
                disabled={solicitarInclusao.isPending}
              >
                {solicitarInclusao.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Enviar para Cadastro
              </Button>
            </div>
          </div>
        ) : (
          /* Etapa 1: formulário */
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                                Nenhum produto encontrado
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

              <div className="grid grid-cols-2 gap-4">
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="itemDescricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição do Item (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Veículo placa ABC-1234"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="novoVendedorId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Alterar Vendedor (opcional)</FormLabel>
                    <Popover
                      open={vendedorPopoverOpen}
                      onOpenChange={setVendedorPopoverOpen}
                      modal
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn('justify-between font-normal', !field.value && 'text-muted-foreground')}
                          >
                            {field.value
                              ? vendedores.find((v) => v.id === field.value)?.nome ?? 'Vendedor selecionado'
                              : 'Manter vendedor atual'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar vendedor..." />
                          <CommandList>
                            <CommandEmpty>Nenhum vendedor encontrado</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="__manter__"
                                onSelect={() => {
                                  form.setValue('novoVendedorId', undefined);
                                  setVendedorPopoverOpen(false);
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', !field.value ? 'opacity-100' : 'opacity-0')} />
                                Manter vendedor atual
                              </CommandItem>
                              {vendedores.map((v) => (
                                <CommandItem
                                  key={v.id}
                                  value={v.nome}
                                  onSelect={() => {
                                    form.setValue('novoVendedorId', v.id);
                                    setVendedorPopoverOpen(false);
                                  }}
                                >
                                  <Check className={cn('mr-2 h-4 w-4', v.id === field.value ? 'opacity-100' : 'opacity-0')} />
                                  {v.nome}
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

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Justificativa da Alteração *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o motivo da alteração solicitada..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {field.value?.length ?? 0}/2000 caracteres (mínimo 10)
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={solicitarInclusao.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  Próximo — Anexar Documentos
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
