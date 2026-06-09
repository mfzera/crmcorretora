
import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import {
  Building2,
  Calendar,
  Check,
  ChevronsUpDown,
  FileText,
  Package,
} from 'lucide-react';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/core/ui/command';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/core/ui/alert-dialog';
import { DateInput } from '@/core/ui/date-input';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/core/ui/form';
import { Input } from '@/core/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/core/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Separator } from '@/core/ui/separator';
import { cn } from '@/core/utils';
import { formatDateBR } from '@/core/utils/date-utils';
import dayjs from 'dayjs';
import { LancamentosComissao } from '@/modules/configuracoes-comissoes/components/lancamentos-comissao';
import { ValoresTab } from '@/modules/cotacoes/components/valores-tab';
import { VendedoresComissaoTab } from '@/modules/cotacoes/components/vendedores-comissao-tab';
import type { Cotacao, Vendedor } from '@/types/area-trabalho';
import type { Produto } from '@/types/produto';
import type { SeguradoraParceira } from '@/types/seguradora-parceira';

interface ResolverComissao {
  fonte: string | null;
  sistemaAtivo: boolean;
  percentualParticipacao: string | null;
}

interface CotacaoDadosTabProps {
  mode: 'view' | 'edit';
  cotacaoAtual: Cotacao;

  // Edit mode
  form?: UseFormReturn<any>;
  produtos?: Produto[];
  seguradoras?: SeguradoraParceira[];
  usuarios?: Vendedor[];

  // Comissão resolver (warning banner)
  resolverComissao?: ResolverComissao;
  resolverComissaoEdit?: ResolverComissao;
  vendedorIdAtual?: string | null;
  vendedorIdForm?: string | null;
}

export function CotacaoDadosTab({
  mode,
  cotacaoAtual,
  form,
  produtos = [],
  seguradoras = [],
  usuarios = [],
  resolverComissao,
  resolverComissaoEdit,
  vendedorIdAtual,
  vendedorIdForm,
}: CotacaoDadosTabProps) {
  const [openProdutoCombobox, setOpenProdutoCombobox] = useState(false);
  const [confirmVigencia, setConfirmVigencia] = useState<{
    mensagem: string;
    pendingDate: string;
    onConfirm: (date: string) => void;
  } | null>(null);
  const tipoSeguroAtual = cotacaoAtual.produto?.tipoSeguro;

  function buildMensagemVigencia(avisos: string[]): string {
    return avisos.join(' Além disso, ');
  }

  function handleVigenciaInicioChange(
    date: string,
    fieldOnChange: (date: string) => void,
  ) {
    if (!date) { fieldOnChange(date); return; }
    const avisos: string[] = [];
    if (dayjs(date).diff(dayjs(), 'day') > 30)
      avisos.push('a data de início está mais de 30 dias no futuro.');
    const fim = form?.getValues('vigenciaFim');
    if (fim && dayjs(fim).diff(dayjs(date), 'year', true) > 1)
      avisos.push('o período de vigência ficará superior a 1 ano.');
    if (avisos.length > 0) {
      setConfirmVigencia({ mensagem: buildMensagemVigencia(avisos), pendingDate: date, onConfirm: fieldOnChange });
    } else {
      fieldOnChange(date);
    }
  }

  function handleVigenciaFimChange(
    date: string,
    fieldOnChange: (date: string) => void,
  ) {
    if (!date) { fieldOnChange(date); return; }
    const inicio = form?.getValues('vigenciaInicio');
    if (inicio && dayjs(date).diff(dayjs(inicio), 'year', true) > 1) {
      setConfirmVigencia({
        mensagem: 'o período de vigência ficará superior a 1 ano.',
        pendingDate: date,
        onConfirm: fieldOnChange,
      });
    } else {
      fieldOnChange(date);
    }
  }

  const mostrarAvisoComissao =
    !!tipoSeguroAtual &&
    ((mode === 'view' &&
      !!vendedorIdAtual &&
      resolverComissao?.fonte === null &&
      resolverComissao?.sistemaAtivo) ||
      (mode === 'edit' &&
        !!vendedorIdForm &&
        resolverComissaoEdit?.fonte === null &&
        resolverComissaoEdit?.sistemaAtivo));

  return (
    <>
    <div className="space-y-6">
      {/* View mode: dados estáticos */}
      {mode === 'view' && (
        <div className="space-y-4">
          {/* Tipo de Negócio */}
          <div
            className={cn(
              'p-4 rounded-lg border flex items-center gap-3',
              cotacaoAtual.situacao === 'RENOVACAO'
                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                : 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900',
            )}
          >
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full shrink-0',
                cotacaoAtual.situacao === 'RENOVACAO'
                  ? 'bg-blue-100 dark:bg-blue-900'
                  : 'bg-green-100 dark:bg-green-900',
              )}
            >
              <FileText
                className={cn(
                  'h-5 w-5',
                  cotacaoAtual.situacao === 'RENOVACAO'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-green-600 dark:text-green-400',
                )}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tipo de Negócio</p>
              <p className="font-semibold">
                {cotacaoAtual.situacao === 'RENOVACAO'
                  ? 'Renovação'
                  : 'Novo Seguro'}
              </p>
            </div>
          </div>

          {/* Produto + Seguradora */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 p-4 rounded-lg border bg-muted/30 min-w-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 shrink-0">
                  <Package className="size-4 text-orange-600 dark:text-orange-400" />
                </div>
                <p className="text-xs text-muted-foreground">Produto</p>
              </div>
              <p className="font-semibold text-sm truncate">
                {cotacaoAtual.produto?.nomeProduto || '-'}
              </p>
              {cotacaoAtual.produto?.tipoSeguro && (
                <Badge variant="outline" className="text-xs">
                  {cotacaoAtual.produto.tipoSeguro}
                </Badge>
              )}
            </div>

            <div className="space-y-2 p-4 rounded-lg border bg-muted/30 min-w-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
                  <Building2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-xs text-muted-foreground">Seguradora</p>
              </div>
              <p className="font-semibold text-sm truncate">
                {cotacaoAtual.seguradoraParceira
                  ? cotacaoAtual.seguradoraParceira.nomeFantasia ||
                    cotacaoAtual.seguradoraParceira.razaoSocial
                  : 'Não informada'}
              </p>
              {cotacaoAtual.seguradoraParceira && (
                <Badge variant="outline" className="text-xs">
                  Parceira
                </Badge>
              )}
            </div>
          </div>

          {/* Item/Descrição */}
          {(cotacaoAtual as any)?.itemDescricao && (
            <div className="p-4 rounded-lg border bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">
                Descrição do Item/Risco
              </p>
              <p className="text-sm font-medium">
                {(cotacaoAtual as any).itemDescricao}
              </p>
            </div>
          )}

          {/* Vigência */}
          <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Vigência</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Início</p>
                <p className="font-semibold text-sm">
                  {formatDateBR(cotacaoAtual.vigenciaInicio)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Término</p>
                <p className="font-semibold text-sm">
                  {formatDateBR(cotacaoAtual.vigenciaFim)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit mode: formulário */}
      {mode === 'edit' && form && (
        <div className="space-y-6">
          {/* Tipo de Negócio */}
          {cotacaoAtual.situacao === 'RENOVACAO' ? (
            <div className="space-y-2 p-4 rounded-lg border bg-muted/30">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Tipo de Negócio
              </h3>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="default"
                  className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
                  disabled
                >
                  <Check className="size-4" />
                  Renovação
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 p-4 rounded-lg border bg-muted/30">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Tipo de Negócio
              </h3>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={
                    form.watch('situacao') === 'NOVO' ? 'default' : 'outline'
                  }
                  className={cn(
                    'flex-1 gap-2',
                    form.watch('situacao') === 'NOVO' &&
                      'bg-green-600 hover:bg-green-700',
                  )}
                  onClick={() =>
                    form.setValue('situacao', 'NOVO', { shouldDirty: true })
                  }
                >
                  <Check
                    className={cn(
                      'size-4',
                      form.watch('situacao') !== 'NOVO' && 'opacity-0',
                    )}
                  />
                  Novo Seguro
                </Button>
                <Button
                  type="button"
                  variant={
                    form.watch('situacao') === 'RENOVACAO'
                      ? 'default'
                      : 'outline'
                  }
                  className={cn(
                    'flex-1 gap-2',
                    form.watch('situacao') === 'RENOVACAO' &&
                      'bg-blue-600 hover:bg-blue-700',
                  )}
                  onClick={() =>
                    form.setValue('situacao', 'RENOVACAO', {
                      shouldDirty: true,
                    })
                  }
                >
                  <Check
                    className={cn(
                      'size-4',
                      form.watch('situacao') !== 'RENOVACAO' && 'opacity-0',
                    )}
                  />
                  Renovação
                </Button>
              </div>
            </div>
          )}

          {/* Produto e Seguradora */}
          <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Produto e Seguradora
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="produtoId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Produto *</FormLabel>
                    <Popover
                      open={openProdutoCombobox}
                      onOpenChange={setOpenProdutoCombobox}
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
                                  ?.nomeProduto ||
                                cotacaoAtual.produto?.nomeProduto
                              : 'Selecione o produto'}
                            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar produto..." />
                          <CommandEmpty>Nenhum produto encontrado</CommandEmpty>
                          <CommandGroup>
                            {produtos.map((produto) => (
                              <CommandItem
                                key={produto.id}
                                value={produto.nomeProduto}
                                onSelect={() => {
                                  console.log('[Produto] onSelect disparado:', produto.id, produto.nomeProduto);
                                  field.onChange(produto.id);
                                  setOpenProdutoCombobox(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 size-4',
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
                render={({ field }) => {
                  console.log('[Seguradora] render — field.value atual:', field.value, '| seguradoras disponíveis:', seguradoras.length);
                  return (
                  <FormItem>
                    <FormLabel>Seguradora *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        console.log('[Seguradora] onValueChange disparado:', value);
                        field.onChange(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a seguradora" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {seguradoras.map((seguradora) => (
                          <SelectItem key={seguradora.id} value={seguradora.id}>
                            {seguradora.nomeFantasia || seguradora.razaoSocial}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                  );
                }}
              />
            </div>

            <FormField
              control={form.control}
              name="itemDescricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição do Item/Risco</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Placa ABC1234 - Honda Civic 2020"
                      maxLength={500}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Identifique o bem ou risco segurado (veículo, imóvel, etc.)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Vigência */}
          <div className="space-y-4 p-5 rounded-xl border bg-muted/30">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Vigência
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="vigenciaInicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início da Vigência *</FormLabel>
                    <FormControl>
                      <DateInput
                        value={field.value}
                        onChange={(date) =>
                          handleVigenciaInicioChange(date, field.onChange)
                        }
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
                        onChange={(date) =>
                          handleVigenciaFimChange(date, field.onChange)
                        }
                        quickSelectLabel="+1 Ano"
                        quickSelectBaseDate={form.watch('vigenciaInicio')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      )}

      {/* Aviso: comissão não configurada */}
      {mostrarAvisoComissao && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <svg
            className="h-4 w-4 text-amber-500 mt-0.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <div className="text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-400">
              Comissão não configurada
            </p>
            <p className="text-amber-600/80 dark:text-amber-400/70 text-xs mt-0.5">
              Não há configuração de comissão para{' '}
              <strong>{tipoSeguroAtual}</strong> aplicável a este vendedor.
              Configure em <strong>Configurações → Comissões</strong>.
            </p>
          </div>
        </div>
      )}

      <Separator />

      {/* Valores (prêmio + percentual) */}
      <ValoresTab
        mode={mode}
        control={mode === 'edit' ? (form?.control as any) : undefined}
        premioLiquido={cotacaoAtual.premioLiquido}
        percentualComissao={cotacaoAtual.percentualComissao}
        valorComissao={cotacaoAtual.valorComissao}
        dadosRenovacao={cotacaoAtual.dadosRenovacao}
        hideValorComissaoCard
      />

      <Separator />

      {/* Equipe de Vendas */}
      <VendedoresComissaoTab
        mode={mode}
        control={mode === 'edit' ? (form?.control as any) : undefined}
        vendedorPrincipal={cotacaoAtual.vendedor || undefined}
        vendedorSecundario={cotacaoAtual.vendedorSecundario || undefined}
        vendedorTerceiro={cotacaoAtual.vendedorTerceiro || undefined}
        atuante={cotacaoAtual.atuante || undefined}
        vendedorId={cotacaoAtual.vendedorId}
        vendedorSecundarioId={cotacaoAtual.vendedorSecundarioId}
        vendedorTerceiroId={cotacaoAtual.vendedorTerceiroId}
        vendedoresDisponiveis={usuarios}
      />

      {/* Aprovado por — após conversão */}
      {cotacaoAtual.documentoVenda?.aprovadoPor && (
        <>
          <Separator />
          <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4 flex items-start gap-3">
            <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/50 shrink-0">
              <Check className="size-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-0.5">Aprovado por</p>
              <p className="text-sm font-bold text-green-800 dark:text-green-300">
                {cotacaoAtual.documentoVenda.aprovadoPor.nome}
              </p>
              {cotacaoAtual.documentoVenda.dataAprovacaoCadastro && (
                <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                  {formatDateBR(cotacaoAtual.documentoVenda.dataAprovacaoCadastro)}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Lançamentos de comissão — após conversão */}
      {cotacaoAtual.documentoVenda?.id && (
        <>
          <Separator />
          <div>
            <h3 className="font-semibold text-sm mb-3">
              Lançamentos de Comissão
            </h3>
            <LancamentosComissao
              documentoVendaId={cotacaoAtual.documentoVenda.id}
            />
          </div>
        </>
      )}
    </div>
    <AlertDialog
      open={!!confirmVigencia}
      onOpenChange={(open) => { if (!open) setConfirmVigencia(null); }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar data de vigência</AlertDialogTitle>
          <AlertDialogDescription>
            Atenção:{' '}
            {confirmVigencia?.mensagem}{' '}
            Tem certeza que deseja utilizar a data{' '}
            <strong>
              {confirmVigencia ? formatDateBR(confirmVigencia.pendingDate) : ''}
            </strong>
            ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmVigencia(null)}>
            Corrigir data
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (confirmVigencia) {
                confirmVigencia.onConfirm(confirmVigencia.pendingDate);
                setConfirmVigencia(null);
              }
            }}
          >
            Sim, confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
