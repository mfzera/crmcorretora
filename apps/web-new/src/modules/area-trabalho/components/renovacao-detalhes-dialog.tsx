
import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Calendar,
  FileText,
  User,
  Building2,
  Package,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ChevronsUpDown,
  Check,
  MessageSquare,
  Loader2,
  Mail,
  Phone,
  MapPin,
  UserSearch,
  Search,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/core/ui/dialog';
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
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { Separator } from '@/core/ui/separator';
import { Skeleton } from '@/core/ui/skeleton';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { cn } from '@/core/utils';
import { useProdutos } from '@/modules/produtos/http';
import {
  useComentariosRenovacao,
  useAdicionarComentarioRenovacao,
} from '../http';
import { useSearchClients } from '@/modules/clientes/http';
import { ComentariosPanel } from './comentarios-panel';
import type { RenovacaoPendente } from '@/types/area-trabalho';
import { parseDateStr, formatDateBR, dayjs } from '@/core/utils/date-utils';
import {
  formatPhone,
  digitsOnly,
  formatCPF,
  formatCNPJ,
  validateCPF,
  validateCNPJ,
} from '@/core/validators/documento';

interface DadosExtras {
  email?: string;
  telefone?: string;
  celular?: string;
  cpf?: string;
  cnpj?: string;
  // Correção de classificação quando o cliente foi cadastrado com o tipo errado
  // (ex.: MEI/ME registrado como PF, mas o documento é CNPJ).
  tipoPessoa?: 'PF' | 'PJ';
  razaoSocial?: string;
}

interface RenovacaoDetalhesDialogProps {
  renovacao: RenovacaoPendente | null;
  open: boolean;
  onClose: () => void;
  onIniciar: (opts: { produtoId?: string; dadosExtras?: DadosExtras }) => Promise<void>;
  onAtribuirCliente?: (novoClienteId: string) => Promise<void>;
}

function temContato(renovacao: RenovacaoPendente | null): boolean {
  if (!renovacao) return true;
  const c = renovacao.cliente;
  return !!(c?.email?.trim() || c?.telefone?.trim() || c?.celular?.trim());
}

function temDocumento(renovacao: RenovacaoPendente | null): boolean {
  if (!renovacao) return true;
  const c = renovacao.cliente;
  if (c?.tipoPessoa === 'PF') return digitsOnly(c?.cpf ?? '').length === 11;
  if (c?.tipoPessoa === 'PJ') return digitsOnly(c?.cnpj ?? '').length === 14;
  return true;
}

function isEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function RenovacaoDetalhesDialog({
  renovacao,
  open,
  onClose,
  onIniciar,
  onAtribuirCliente,
}: RenovacaoDetalhesDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [modo, setModo] = useState<'preencher' | 'atribuir'>('preencher');
  const [pendingComentario, setPendingComentario] = useState('');
  const [showDescartarConfirm, setShowDescartarConfirm] = useState(false);

  // Produto (importados sem correspondência)
  const [produtoIdSelecionado, setProdutoIdSelecionado] = useState<string | undefined>(undefined);
  const [openProdutoCombobox, setOpenProdutoCombobox] = useState(false);

  // Dados faltantes (sidebar form)
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [documento, setDocumento] = useState('');
  // Correção do tipo de pessoa no ato (null = mantém o tipo cadastrado)
  const [tipoOverride, setTipoOverride] = useState<'PF' | 'PJ' | null>(null);

  // Atribuição de cliente
  const [busca, setBusca] = useState('');
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string | null>(null);

  const { data: produtosData } = useProdutos(undefined, 1, 100);
  const produtos = produtosData?.data ?? [];

  const { data: resultadosBusca = [], isFetching: buscando } = useSearchClients(busca);

  const { data: comentarios = [], isLoading: loadingComentarios } =
    useComentariosRenovacao(renovacao?.id ?? null);
  const { mutate: adicionarComentario, mutateAsync: adicionarComentarioAsync, isPending: enviando } =
    useAdicionarComentarioRenovacao();

  useEffect(() => {
    if (open) {
      setModo('preencher');
      setEmail('');
      setTelefone('');
      setDocumento('');
      setTipoOverride(null);
      setBusca('');
      setClienteSelecionadoId(null);
      setProdutoIdSelecionado(undefined);
      setPendingComentario('');
    }
  }, [open]);

  const precisaContato = useMemo(() => !temContato(renovacao), [renovacao]);
  const precisaDocumento = useMemo(() => !temDocumento(renovacao), [renovacao]);
  const tipoPessoa = renovacao?.cliente?.tipoPessoa;
  // Tipo usado para coletar o documento: a correção feita aqui tem precedência.
  const tipoDocumento = tipoOverride ?? tipoPessoa;
  const tipoCorrigido = tipoOverride != null && tipoOverride !== tipoPessoa;

  const emailLimpo = email.trim();
  const telefoneDigits = digitsOnly(telefone);
  const documentoDigits = digitsOnly(documento);
  const emailOk = emailLimpo === '' || isEmailValido(emailLimpo);
  const telefoneOk = telefoneDigits === '' || telefoneDigits.length >= 10;
  const algumContatoPreenchido = !!emailLimpo || telefoneDigits.length >= 10;
  const contatoOk = precisaContato ? algumContatoPreenchido && emailOk && telefoneOk : true;
  const documentoOk = (() => {
    if (!precisaDocumento) return true;
    if (tipoDocumento === 'PF') return validateCPF(documentoDigits);
    if (tipoDocumento === 'PJ') return validateCNPJ(documentoDigits);
    return true;
  })();

  const isProdutoImportado = !renovacao?.produto?.id;
  const produtoNomeAtual = renovacao?.produto?.nomeProduto || renovacao?.produtoDescricao || renovacao?.itemDescricao;
  const produtoSelecionado = produtos.find((p) => p.id === produtoIdSelecionado);
  const produtoOk = !isProdutoImportado || !!produtoIdSelecionado;

  const clienteAtualId = renovacao?.cliente?.id;
  const resultadosFiltrados = useMemo(() => {
    return (resultadosBusca as any[]).filter((c) => {
      if (c.id === clienteAtualId) return false;
      // Stub sem documento (ex.: empresa importada como PF) pode ser apontado
      // para um cliente de qualquer tipo — é o caso de reconciliar com o
      // cadastro PJ que já tem o CNPJ. Cliente real só casa com o mesmo tipo.
      if (precisaDocumento) return true;
      if (!tipoPessoa) return true;
      return c.tipoPessoa === tipoPessoa;
    });
  }, [resultadosBusca, tipoPessoa, clienteAtualId, precisaDocumento]);

  const podeIniciar = contatoOk && documentoOk && produtoOk && !isLoading && renovacao?.status === 'PENDENTE';
  const podeAtribuir = !!onAtribuirCliente && (precisaContato || precisaDocumento);

  const nomeCliente = renovacao
    ? renovacao.cliente.tipoPessoa === 'PF'
      ? renovacao.cliente.nome
      : renovacao.cliente.nomeFantasia || renovacao.cliente.razaoSocial
    : '';

  const dataBase = renovacao?.vigenciaFim ? parseDateStr(renovacao.vigenciaFim) : dayjs();
  const vigenciaInicio = dataBase.add(1, 'day');
  const vigenciaFim = vigenciaInicio.add(1, 'year');

  const doc = tipoPessoa === 'PF'
    ? (renovacao?.cliente.cpf ? formatCPF(renovacao.cliente.cpf) : null)
    : (renovacao?.cliente.cnpj ? formatCNPJ(renovacao.cliente.cnpj) : null);

  const diasTexto = (() => {
    if (!renovacao) return '';
    const d = renovacao.diasParaVencimento;
    if (d < 0) return `Venceu há ${Math.abs(d)} ${Math.abs(d) === 1 ? 'dia' : 'dias'}`;
    if (d === 0) return 'Vence hoje';
    return `Vence em ${d} ${d === 1 ? 'dia' : 'dias'}`;
  })();

  const urgenciaClass = (() => {
    if (!renovacao) return 'bg-muted text-muted-foreground';
    const d = renovacao.diasParaVencimento;
    if (d < 0 || d <= 7) return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400';
    if (d <= 30) return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400';
    return 'bg-muted text-muted-foreground';
  })();

  const doClose = useCallback(() => {
    setProdutoIdSelecionado(undefined);
    setPendingComentario('');
    setModo('preencher');
    onClose();
  }, [onClose]);

  const handleClose = () => {
    if (pendingComentario.trim()) {
      setShowDescartarConfirm(true);
      return;
    }
    doClose();
  };

  const handleIniciar = async () => {
    if (!podeIniciar || !renovacao) return;
    const textoComentario = pendingComentario.trim();
    if (textoComentario) {
      try {
        await adicionarComentarioAsync({ renovacaoId: renovacao.id, texto: textoComentario, parentId: null });
      } catch {
        toast.error('Não foi possível salvar o comentário. Tente novamente.');
        return;
      }
    }
    try {
      setIsLoading(true);
      const dadosExtras: DadosExtras = {};
      if (precisaContato) {
        if (emailLimpo) dadosExtras.email = emailLimpo;
        if (telefoneDigits.length >= 10) dadosExtras.telefone = telefoneDigits;
      }
      if (precisaDocumento) {
        // Se o tipo foi corrigido aqui (ex.: PF→PJ de um MEI/ME), envia o novo
        // tipo junto para o backend reclassificar o cliente antes de gravar o
        // documento. razaoSocial garante que o cliente PJ tenha nome de exibição.
        if (tipoCorrigido && tipoDocumento) {
          dadosExtras.tipoPessoa = tipoDocumento;
          if (tipoDocumento === 'PJ' && renovacao?.cliente.nome) {
            dadosExtras.razaoSocial = renovacao.cliente.nome;
          }
        }
        if (tipoDocumento === 'PF') dadosExtras.cpf = documentoDigits;
        if (tipoDocumento === 'PJ') dadosExtras.cnpj = documentoDigits;
      }
      const payload = Object.keys(dadosExtras).length > 0 ? dadosExtras : undefined;
      await onIniciar({ produtoId: produtoIdSelecionado, dadosExtras: payload });
    } catch {
      // error handled by caller, keep dialog open
    } finally {
      setIsLoading(false);
    }
  };

  const handleAtribuir = async () => {
    if (!clienteSelecionadoId || !onAtribuirCliente) return;
    try {
      setIsLoading(true);
      await onAtribuirCliente(clienteSelecionadoId);
    } catch {
      // error handled by caller
    } finally {
      setIsLoading(false);
    }
  };

  if (!renovacao) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-5xl! p-0 h-[90vh] gap-0" style={{ width: '95vw' }}>
          <DialogHeader className="sr-only">
            <DialogTitle>Iniciar Renovação</DialogTitle>
            <DialogDescription>
              Revise e complemente as informações antes de iniciar o processo de renovação
            </DialogDescription>
          </DialogHeader>

          <div className="flex h-full overflow-hidden">
            {/* ===== SIDEBAR ===== */}
            <aside className="w-[300px] shrink-0 border-r bg-slate-50 dark:bg-muted/20 flex flex-col h-full">
              <div className="p-5 space-y-5 flex-1 overflow-y-auto">

                {/* Urgência */}
                <div className={`flex items-center gap-1.5 text-xs font-semibold rounded-md px-2.5 py-2 ${urgenciaClass}`}>
                  <AlertCircle className="size-3.5 shrink-0" />
                  {diasTexto}
                </div>

                {/* ── CLIENTE ── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {tipoPessoa === 'PF' ? 'Cliente' : 'Empresa'}
                    </p>
                    {podeAtribuir && modo !== 'atribuir' && (
                      <button
                        type="button"
                        onClick={() => setModo('atribuir')}
                        disabled={isLoading}
                        className="flex items-center gap-1 text-[10px] text-primary hover:underline disabled:opacity-50"
                      >
                        <UserSearch className="size-3" />
                        Vincular cadastro
                      </button>
                    )}
                    {modo === 'atribuir' && (
                      <button
                        type="button"
                        onClick={() => { setModo('preencher'); setClienteSelecionadoId(null); setBusca(''); }}
                        disabled={isLoading}
                        className="text-[10px] text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
                      >
                        ← Voltar
                      </button>
                    )}
                  </div>

                  <div>
                    <p className="font-bold text-lg leading-tight break-words">{nomeCliente || '—'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tipoPessoa === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                    </p>
                  </div>

                  {doc && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        {tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'}
                      </p>
                      <p className="text-xs font-medium font-mono mt-0.5">{doc}</p>
                    </div>
                  )}

                  {renovacao.cliente.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="size-3 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground truncate">{renovacao.cliente.email}</p>
                    </div>
                  )}

                  {renovacao.cliente.telefone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="size-3 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground">{renovacao.cliente.telefone}</p>
                    </div>
                  )}

                  {renovacao.cliente.celular && !renovacao.cliente.telefone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="size-3 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground">{renovacao.cliente.celular}</p>
                    </div>
                  )}

                  {renovacao.cliente.endereco?.cidade && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        {renovacao.cliente.endereco.cidade}, {renovacao.cliente.endereco.estado}
                      </p>
                    </div>
                  )}

                  {/* Formulário de dados faltantes — inline na sidebar */}
                  {(precisaContato || precisaDocumento) && modo === 'preencher' && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-start gap-1.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-2.5 py-2">
                        <AlertTriangle className="size-3.5 shrink-0 mt-0.5 text-amber-500" />
                        <p className="text-xs text-amber-800 dark:text-amber-300">
                          {precisaContato && precisaDocumento
                            ? 'Contato e documento incompletos.'
                            : precisaContato
                              ? 'Nenhum contato cadastrado.'
                              : `${tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'} não informado.`
                          }
                        </p>
                      </div>

                      {precisaContato && (
                        <>
                          <div className="space-y-1">
                            <Label htmlFor="sb-email" className="text-[10px] uppercase tracking-wide text-muted-foreground">E-mail</Label>
                            <Input
                              id="sb-email"
                              type="email"
                              placeholder="cliente@exemplo.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              disabled={isLoading}
                              className="h-7 text-xs"
                            />
                            {!emailOk && <p className="text-[10px] text-destructive">E-mail inválido</p>}
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="sb-telefone" className="text-[10px] uppercase tracking-wide text-muted-foreground">Telefone</Label>
                            <Input
                              id="sb-telefone"
                              type="tel"
                              placeholder="(11) 99999-9999"
                              value={telefone}
                              onChange={(e) => setTelefone(formatPhone(e.target.value))}
                              disabled={isLoading}
                              className="h-7 text-xs"
                            />
                            {!telefoneOk && <p className="text-[10px] text-destructive">Mín. 10 dígitos</p>}
                          </div>
                        </>
                      )}

                      {precisaDocumento && (
                        <div className="space-y-1">
                          <Label htmlFor="sb-documento" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {tipoDocumento === 'PF' ? 'CPF' : 'CNPJ'}
                          </Label>
                          {/* Seletor de tipo: corrige cadastros classificados errado
                              (ex.: MEI/ME registrado como PF, mas o documento é CNPJ). */}
                          <div className="flex gap-1">
                            {(['PF', 'PJ'] as const).map((t) => (
                              <button
                                key={t}
                                type="button"
                                disabled={isLoading}
                                onClick={() => {
                                  setTipoOverride(t);
                                  setDocumento('');
                                }}
                                className={cn(
                                  'flex-1 rounded border px-2 py-1 text-[10px] font-medium transition-colors',
                                  tipoDocumento === t
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-input text-muted-foreground hover:bg-muted',
                                )}
                              >
                                {t === 'PF' ? 'CPF' : 'CNPJ'}
                              </button>
                            ))}
                          </div>
                          <Input
                            id="sb-documento"
                            inputMode="numeric"
                            placeholder={tipoDocumento === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                            value={documento}
                            onChange={(e) => {
                              const raw = digitsOnly(e.target.value);
                              if (tipoDocumento === 'PF') setDocumento(formatCPF(raw.slice(0, 11)));
                              else setDocumento(formatCNPJ(raw.slice(0, 14)));
                            }}
                            disabled={isLoading}
                            className="h-7 text-xs"
                          />
                          {tipoCorrigido && (
                            <p className="text-[10px] text-amber-600">
                              O cadastro será atualizado para {tipoDocumento === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}.
                            </p>
                          )}
                          {documentoDigits.length > 0 && !documentoOk && (
                            <p className="text-[10px] text-destructive">{tipoDocumento === 'PF' ? 'CPF' : 'CNPJ'} inválido</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Prioridade */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Prioridade</p>
                  <p className={`text-base font-bold ${
                    renovacao.prioridade === 'ALTA' ? 'text-red-500' :
                    renovacao.prioridade === 'MEDIA' ? 'text-amber-500' :
                    'text-muted-foreground'
                  }`}>
                    {renovacao.prioridade.charAt(0) + renovacao.prioridade.slice(1).toLowerCase()}
                  </p>
                </div>

                {/* Produto */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Produto</p>
                  <p className="text-sm font-semibold">{renovacao.produto?.nomeProduto ?? '—'}</p>
                  {renovacao.produto?.tipoSeguro && (
                    <Badge variant="outline" className="text-[10px] mt-1">{renovacao.produto.tipoSeguro}</Badge>
                  )}
                </div>

                <Separator />

                {/* Financeiro */}
                <div className="rounded-lg border bg-card p-3 space-y-2.5">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Prêmio Anterior</p>
                    <p className="text-xl font-bold mt-0.5">{formatCurrency(renovacao.premioAtual)}</p>
                  </div>
                  {renovacao.percentualComissaoAnterior != null && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Comissão Anterior</p>
                        <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-0.5">
                          {Number(renovacao.percentualComissaoAnterior).toFixed(2)}%
                          {renovacao.valorComissaoAnterior != null && (
                            <span className="text-xs font-normal text-muted-foreground ml-1">
                              · {formatCurrency(renovacao.valorComissaoAnterior)}
                            </span>
                          )}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Sidebar footer */}
              <div className="p-4 border-t space-y-2 shrink-0 bg-slate-50 dark:bg-muted/20">
                {modo === 'preencher' ? (
                  <>
                    <Button className="w-full gap-2" onClick={handleIniciar} disabled={!podeIniciar}>
                      {isLoading
                        ? <><Loader2 className="size-4 animate-spin" />Iniciando...</>
                        : <><CheckCircle2 className="size-4" />{renovacao.status === 'PENDENTE' ? 'Iniciar Renovação' : 'Em Andamento'}</>
                      }
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleClose} disabled={isLoading}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      className="w-full gap-2"
                      onClick={handleAtribuir}
                      disabled={!clienteSelecionadoId || isLoading}
                    >
                      {isLoading
                        ? <><Loader2 className="size-4 animate-spin" />Atribuindo...</>
                        : 'Atribuir e Iniciar'
                      }
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => { setModo('preencher'); setClienteSelecionadoId(null); setBusca(''); }}
                      disabled={isLoading}
                    >
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            </aside>

            {/* ===== MAIN CONTENT ===== */}
            <div className="flex-1 flex flex-col min-h-0 bg-background">
              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                      <RefreshCw className="size-5 text-primary" />
                      {renovacao.status === 'PENDENTE' ? 'Iniciar Renovação' : 'Renovação em Andamento'}
                    </h2>
                    <p className="text-base font-semibold mt-0.5">{nomeCliente}</p>
                    <p className="text-sm text-muted-foreground">
                      {renovacao.produto?.nomeProduto}
                      {renovacao.numeroApolice ? ` · Apólice #${renovacao.numeroApolice}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Badge variant={renovacao.prioridade === 'ALTA' ? 'destructive' : 'secondary'}>
                      {renovacao.prioridade.charAt(0) + renovacao.prioridade.slice(1).toLowerCase()}
                    </Badge>
                    <Badge variant="outline">
                      {renovacao.status === 'PENDENTE' ? 'Pendente' : 'Em Andamento'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="detalhes" className="flex-1 flex flex-col min-h-0">
                <div className="px-6 border-b shrink-0">
                  <TabsList className="h-10 bg-transparent p-0 gap-1 -mb-px">
                    <TabsTrigger
                      value="detalhes"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5 px-3 h-full text-sm"
                    >
                      <FileText className="size-3.5" />
                      Detalhes
                    </TabsTrigger>
                    <TabsTrigger
                      value="comentarios"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5 px-3 h-full text-sm"
                    >
                      <MessageSquare className="size-3.5" />
                      Comentários
                      {comentarios.length > 0 && (
                        <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5 font-medium">
                          {comentarios.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* ---- DETALHES TAB ---- */}
                <TabsContent value="detalhes" className="flex-1 overflow-y-auto m-0">
                  <div className="p-6 space-y-8">

                    {modo === 'atribuir' ? (
                      /* Attribution mode */
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Selecione o cliente já cadastrado correspondente a{' '}
                          <span className="font-medium text-foreground">{nomeCliente}</span>.
                        </p>
                        <div className="space-y-1.5">
                          <Label htmlFor="renov-busca">Buscar cliente cadastrado</Label>
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="renov-busca"
                              className="pl-9"
                              placeholder="Nome, CPF, CNPJ ou e-mail (mín. 3 caracteres)"
                              value={busca}
                              onChange={(e) => { setBusca(e.target.value); setClienteSelecionadoId(null); }}
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                        <div className="max-h-80 overflow-y-auto rounded-md border">
                          {busca.trim().length < 3 ? (
                            <p className="p-4 text-sm text-muted-foreground">Digite ao menos 3 caracteres para buscar.</p>
                          ) : buscando ? (
                            <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                              <Loader2 className="size-4 animate-spin" />Buscando...
                            </div>
                          ) : resultadosFiltrados.length === 0 ? (
                            <p className="p-4 text-sm text-muted-foreground">
                              Nenhum cliente {tipoPessoa === 'PF' ? 'PF' : 'PJ'} encontrado.
                            </p>
                          ) : (
                            <ul className="divide-y">
                              {resultadosFiltrados.map((c: any) => {
                                const selected = clienteSelecionadoId === c.id;
                                const nome = c.tipoPessoa === 'PF' ? c.nome : c.razaoSocial || c.nomeFantasia;
                                const docFmt = c.tipoPessoa === 'PF'
                                  ? (c.cpf ? formatCPF(c.cpf) : 'sem CPF')
                                  : (c.cnpj ? formatCNPJ(c.cnpj) : 'sem CNPJ');
                                return (
                                  <li key={c.id}>
                                    <button
                                      type="button"
                                      onClick={() => setClienteSelecionadoId(c.id)}
                                      disabled={isLoading}
                                      className={`flex w-full items-center justify-between gap-2 p-3 text-left text-sm transition-colors hover:bg-accent ${selected ? 'bg-accent' : ''}`}
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">{nome}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                          {docFmt}{c.email ? ` · ${c.email}` : ''}
                                        </p>
                                      </div>
                                      {selected && <Check className="size-4 shrink-0 text-primary" />}
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Normal mode — 4 colour-coded flat sections */
                      <>
                        {/* ── PRODUTO SEGURADO (violet) ── */}
                        <section>
                          <div className="flex items-center gap-2 mb-5 pl-3 border-l-4 border-violet-500 py-0.5">
                            <Package className="size-4 text-violet-600 dark:text-violet-400" />
                            <h3 className="font-semibold text-sm text-violet-600 dark:text-violet-400">
                              Produto Segurado
                            </h3>
                          </div>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-4 pl-1">
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Nome do Produto</p>
                              <p className="text-sm font-semibold">{renovacao.produto.nomeProduto}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Tipo de Seguro</p>
                              <p className="text-sm font-medium">{renovacao.produto.tipoSeguro || '—'}</p>
                            </div>
                            {renovacao.itemDescricao && (
                              <div className="col-span-2">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Item / Descrição do Risco</p>
                                <p className="text-sm font-medium">{renovacao.itemDescricao}</p>
                              </div>
                            )}
                            {(renovacao.seguradoraAnterior || renovacao.seguradoraParceira) && (
                              <div className="col-span-2">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Seguradora Anterior</p>
                                <p className="text-sm font-medium">
                                  {renovacao.seguradoraParceira
                                    ? renovacao.seguradoraParceira.nomeFantasia || renovacao.seguradoraParceira.razaoSocial
                                    : renovacao.seguradoraAnterior}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Produto sem correspondência — só relevante ao iniciar (PENDENTE) */}
                          {isProdutoImportado && renovacao.status === 'PENDENTE' && (
                            <div className="mt-5 space-y-3">
                              <div className="flex items-start gap-2 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 p-3">
                                <AlertCircle className="size-4 shrink-0 mt-0.5 text-orange-500" />
                                <div>
                                  <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                                    Produto sem correspondência no cadastro
                                  </p>
                                  <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
                                    Importado como <strong>&quot;{produtoNomeAtual}&quot;</strong>. Selecione o produto correspondente para prosseguir.
                                  </p>
                                </div>
                              </div>
                              <Popover open={openProdutoCombobox} onOpenChange={setOpenProdutoCombobox}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" role="combobox" className="w-full justify-between">
                                    <span className={cn('truncate', !produtoSelecionado && 'text-muted-foreground')}>
                                      {produtoSelecionado ? produtoSelecionado.nomeProduto : 'Selecionar produto...'}
                                    </span>
                                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0">
                                  <Command>
                                    <CommandInput placeholder="Buscar produto..." />
                                    <CommandList>
                                      <CommandEmpty>Nenhum produto encontrado</CommandEmpty>
                                      <CommandGroup className="max-h-60 overflow-auto">
                                        {produtos.map((produto) => (
                                          <CommandItem
                                            key={produto.id}
                                            value={produto.nomeProduto}
                                            onSelect={() => { setProdutoIdSelecionado(produto.id); setOpenProdutoCombobox(false); }}
                                          >
                                            <Check className={cn('mr-2 size-4', produtoIdSelecionado === produto.id ? 'opacity-100' : 'opacity-0')} />
                                            <div className="flex flex-col">
                                              <span className="text-sm">{produto.nomeProduto}</span>
                                              <span className="text-xs text-muted-foreground">{produto.tipoSeguro}</span>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                        </section>

                        <div className="border-t border-dashed border-muted-foreground/20" />

                        {/* ── APÓLICE ATUAL (emerald) ── */}
                        <section>
                          <div className="flex items-center gap-2 mb-5 pl-3 border-l-4 border-emerald-500 py-0.5">
                            <FileText className="size-4 text-emerald-600 dark:text-emerald-400" />
                            <h3 className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                              Apólice Atual
                            </h3>
                          </div>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-4 pl-1">
                            {renovacao.numeroApolice && (
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Número da Apólice</p>
                                <p className="text-sm font-medium font-mono">{renovacao.numeroApolice}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Data de Vencimento</p>
                              <p className="text-sm font-semibold">
                                {renovacao.vigenciaFim ? formatDateBR(renovacao.vigenciaFim) : '—'}
                              </p>
                            </div>
                            {renovacao.premioAtual != null && (
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Prêmio Atual</p>
                                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(renovacao.premioAtual)}</p>
                              </div>
                            )}
                            {renovacao.percentualComissaoAnterior != null && (
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Comissão Anterior</p>
                                <p className="text-base font-bold text-green-600 dark:text-green-400">
                                  {Number(renovacao.percentualComissaoAnterior).toFixed(2)}%
                                  {renovacao.valorComissaoAnterior != null && (
                                    <span className="text-xs font-normal text-muted-foreground ml-1">
                                      · {formatCurrency(renovacao.valorComissaoAnterior)}
                                    </span>
                                  )}
                                </p>
                              </div>
                            )}
                            {renovacao.vendedor && (
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Vendedor Responsável</p>
                                <p className="text-sm font-medium">{renovacao.vendedor.nome}</p>
                              </div>
                            )}
                            {renovacao.seguradoraParceira && (
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Seguradora</p>
                                <p className="text-sm font-medium">
                                  {renovacao.seguradoraParceira.nomeFantasia || renovacao.seguradoraParceira.razaoSocial}
                                </p>
                              </div>
                            )}
                          </div>
                        </section>

                        <div className="border-t border-dashed border-muted-foreground/20" />

                        {/* ── NOVA VIGÊNCIA (amber) ── */}
                        <section>
                          <div className="flex items-center gap-2 mb-5 pl-3 border-l-4 border-amber-500 py-0.5">
                            <Calendar className="size-4 text-amber-600 dark:text-amber-400" />
                            <h3 className="font-semibold text-sm text-amber-600 dark:text-amber-400">
                              Nova Vigência Proposta
                            </h3>
                          </div>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-4 pl-1 mb-3">
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Data de Início</p>
                              <p className="text-sm font-semibold">{vigenciaInicio.format('DD/MM/YYYY')}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Data de Término</p>
                              <p className="text-sm font-semibold">{vigenciaFim.format('DD/MM/YYYY')}</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-start gap-1.5 pl-1">
                            <CheckCircle2 className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
                            A vigência iniciará no dia seguinte ao vencimento, garantindo continuidade da cobertura.
                          </p>
                        </section>

                        <div className="border-t border-dashed border-muted-foreground/20" />

                        {/* ── PRÓXIMOS PASSOS (slate) ── */}
                        <section>
                          <div className="flex items-center gap-2 mb-4 pl-3 border-l-4 border-slate-400 py-0.5">
                            <ArrowRight className="size-4 text-muted-foreground" />
                            <h3 className="font-semibold text-sm text-muted-foreground">
                              Próximos Passos
                            </h3>
                          </div>
                          <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside pl-1">
                            <li>Uma cotação será criada automaticamente</li>
                            <li>Edite valores e condições conforme necessário</li>
                            <li>Envie a proposta ao cliente</li>
                            <li>Finalize a renovação após aprovação</li>
                          </ol>
                        </section>
                      </>
                    )}
                  </div>
                </TabsContent>

                {/* ---- COMENTÁRIOS TAB ---- */}
                <TabsContent value="comentarios" className="flex-1 overflow-y-auto m-0 p-6">
                  {loadingComentarios ? (
                    <div className="space-y-3">
                      <Skeleton className="h-14 w-full rounded-md" />
                      <Skeleton className="h-14 w-full rounded-md" />
                      <Skeleton className="h-10 w-2/3 rounded-md" />
                    </div>
                  ) : (
                    <ComentariosPanel
                      comentarios={comentarios as any}
                      isLoading={loadingComentarios}
                      canAdd={true}
                      onAdd={(texto, parentId) => adicionarComentario({ renovacaoId: renovacao.id, texto, parentId })}
                      isSending={enviando}
                      onPendingTextChange={setPendingComentario}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDescartarConfirm} onOpenChange={setShowDescartarConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar comentário?</AlertDialogTitle>
            <AlertDialogDescription>
              Há um comentário não enviado. Se fechar agora, ele será perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={doClose}>Descartar e fechar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
