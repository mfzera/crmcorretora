
import { useState, useEffect } from 'react';
import { cn } from '@/core/utils';
import { formatDateBR } from '@/core/utils/date-utils';
import {
  Calendar,
  FileText,
  Building2,
  CheckCircle2,
  Percent,
  CreditCard,
  XCircle,
  Paperclip,
  FilePen,
  Send,
  TriangleAlert,
  Pencil,
  ChevronLeft,
  ShieldCheck,
  Users,
  StickyNote,
  MessageSquare,
  HelpCircle,
  ShieldAlert,
  Plus,
  Loader2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { Separator } from '@/core/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { Input } from '@/core/ui/input';
import { Textarea } from '@/core/ui/textarea';
import { Label } from '@/core/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/ui/tooltip';
import { DateInput } from '@/core/ui/date-input';
import { AnexosTab } from '@/modules/anexos/components';
import { CriarEndossoDialog } from '@/modules/documentos-venda/components/criar-endosso-dialog';
import { ComentariosPanel } from '@/modules/area-trabalho/components/comentarios-panel';
import {
  useUpdateSaleDocument,
  useComentariosDocumentoVenda,
  useAdicionarComentarioDocumentoVenda,
  useEndossosRecusadosByDocumento,
  useEndosso,
  useReenviarEndosso,
} from '@/modules/area-trabalho/http';
import { EndossoRecusadoDialog } from '@/modules/area-trabalho/components/endosso-recusado-dialog';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import type { DocumentoVenda } from '@/types/documento-venda';
import { usePermissions } from '@/core/hooks/use-permissions';
import {
  useSinistrosByDocumento,
  useSolicitacoesTrocaVendedor,
  useAprovarTrocaVendedor,
  useRecusarTrocaVendedor,
  type SolicitacaoTrocaVendedor,
} from '@/modules/documentos-venda/http';
import { SolicitarTrocaVendedorDialog } from '@/modules/documentos-venda/components/solicitar-troca-vendedor-dialog';
import { useVendedores } from '@/modules/usuarios/http';
import { SinistroDetalheSheet } from '@/modules/sinistros/components/sinistro-detalhe-sheet';
import { NovoSinistroDialog } from '@/modules/sinistros/components/novo-sinistro-dialog';
import { IndicarSinistroDialog } from '@/modules/sinistros/components/indicar-sinistro-dialog';
import {
  STATUS_SINISTRO_LABELS,
  TIPO_SINISTRO_LABELS,
} from '@/types/sinistro';
import type { Sinistro } from '@/types/sinistro';

interface DocumentoVendaDialogProps {
  documento: DocumentoVenda | null;
  open: boolean;
  onClose: () => void;
  onFinalizarCadastro?: () => void;
  onReprovarCadastro?: () => void;
  onConfirmarPerda?: () => void;
  onRejeitarPerda?: () => void;
  onReenviarCadastro?: () => void;
  isReenviandoCadastro?: boolean;
  readOnly?: boolean;
}

const SINISTRO_STATUS_COLORS: Record<string, string> = {
  ABERTO: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  EM_ANALISE: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400',
  AGUARDANDO_DOCUMENTOS: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400',
  APROVADO: 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400',
  RECUSADO: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
  PAGO: 'bg-teal-500/10 text-teal-600 border-teal-500/20 dark:text-teal-400',
  CANCELADO: 'bg-muted text-muted-foreground border-border',
};

const SINISTRO_STATUS_BAR: Record<string, string> = {
  ABERTO: 'bg-blue-500',
  EM_ANALISE: 'bg-orange-500',
  AGUARDANDO_DOCUMENTOS: 'bg-yellow-500',
  APROVADO: 'bg-green-500',
  RECUSADO: 'bg-red-500',
  PAGO: 'bg-teal-500',
  CANCELADO: 'bg-muted-foreground',
};

const getStatusBadge = (status: string) => {
  const variants: Record<
    string,
    'default' | 'secondary' | 'destructive' | 'outline'
  > = {
    AGUARDANDO_CADASTRO: 'secondary',
    ATIVO: 'default',
    CANCELADO: 'destructive',
    PERDIDO: 'destructive',
    EM_NEGOCIACAO: 'outline',
    AGUARDANDO_CLIENTE: 'outline',
    VENDA_CONFIRMADA: 'default',
  };

  const labels: Record<string, string> = {
    AGUARDANDO_CADASTRO: 'Aguardando Cadastro',
    ATIVO: 'Ativo',
    CANCELADO: 'Cancelado',
    PERDIDO: 'Perdido',
    EM_NEGOCIACAO: 'Em Negociação',
    AGUARDANDO_CLIENTE: 'Aguardando Cliente',
    VENDA_CONFIRMADA: 'Venda Confirmada',
    AGUARDANDO_APROVACAO: 'Aguardando Aprovação',
    ARQUIVADO: 'Arquivado',
    RENOVACAO: 'Renovação',
    EXPIRADO: 'Expirado',
  };

  return (
    <Badge variant={variants[status] || 'default'}>
      {labels[status] || status}
    </Badge>
  );
};

const formatCurrency = (value: number | null | undefined): string => {
  if (!value) return 'Não informado';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const formatPercentage = (value: number | null | undefined): string => {
  if (!value) return 'Não informado';
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

const formatDate = (date: string): string => {
  return formatDateBR(date);
};

const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString('pt-BR');
};

const formatCPF = (cpf: string): string =>
  cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

const formatCNPJ = (cnpj: string): string =>
  cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');

const formatTelefone = (tel: string): string => {
  const d = tel.replace(/\D/g, '');
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return tel;
};

const calcularDiasVigencia = (inicio: string, fim: string): number => {
  const dataInicio = new Date(inicio);
  const dataFim = new Date(fim);
  const diffTime = Math.abs(dataFim.getTime() - dataInicio.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

function SectionLabel({
  children,
  icon,
  color = 'text-muted-foreground',
  noMargin,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  color?: string;
  noMargin?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-2', !noMargin && 'mb-3', color)}>
      {icon && <span className="shrink-0">{icon}</span>}
      <p className="text-xs font-semibold uppercase tracking-widest">
        {children}
      </p>
    </div>
  );
}

function InfoCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </p>
      <p
        className={cn(
          'font-semibold text-base',
          highlight ? 'text-primary' : 'text-foreground',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SellerCard({
  nome,
  role,
  avatarUrl,
  className,
}: {
  nome: string;
  role: string;
  avatarUrl?: string | null;
  className?: string;
}) {
  const initials = nome
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border px-4 py-3',
        className ?? 'bg-muted',
      )}
    >
      <div className="size-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0 overflow-hidden">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={nome}
            className="size-9 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      <div>
        <p className="font-medium text-foreground text-sm">{nome}</p>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>
    </div>
  );
}

export function DocumentoVendaDialog({
  documento,
  open,
  onClose,
  onFinalizarCadastro,
  onReprovarCadastro,
  onConfirmarPerda,
  onRejeitarPerda,
  onReenviarCadastro,
  isReenviandoCadastro,
  readOnly,
}: DocumentoVendaDialogProps) {
  const [activeTab, setActiveTab] = useState('dados');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    vigenciaInicio: '',
    vigenciaFim: '',
    premioLiquido: '',
    percentualComissao: '',
    observacoes: '',
    numeroPropostaExterna: '',
    numeroParcelas: '1',
    modalidadePagamentoVendedor: 'AVISTA' as 'AVISTA' | 'PARCELADO',
    vendedorId: '',
    vendedorSecundarioId: null as string | null,
    vendedorTerceiroId: null as string | null,
  });

  const atualizarMutation = useUpdateSaleDocument();
  const { hasPermission } = usePermissions();
  const { data: vendedores = [] } = useVendedores();
  const podeVerComissao = hasPermission('vendas:gerenciar_comissoes');

  const { data: comentarios = [], isLoading: loadingComentarios } =
    useComentariosDocumentoVenda(documento?.id ?? null);
  const { mutate: adicionarComentario, isPending: enviandoComentario } =
    useAdicionarComentarioDocumentoVenda();
  const [pendingComentario, setPendingComentario] = useState('');

  const [selectedSinistro, setSelectedSinistro] = useState<Sinistro | null>(null);
  const [sinistroDetalheOpen, setSinistroDetalheOpen] = useState(false);
  const [novoSinistroOpen, setNovoSinistroOpen] = useState(false);
  const [indicarSinistroOpen, setIndicarSinistroOpen] = useState(false);
  const [trocaVendedorOpen, setTrocaVendedorOpen] = useState(false);
  const [recusarMotivo, setRecusarMotivo] = useState('');
  const [recusandoId, setRecusandoId] = useState<string | null>(null);

  const podeSolicitarTroca = hasPermission('vendas:solicitar_troca_vendedor');
  const podeAprovarTroca = hasPermission('vendas:aprovar_troca_vendedor');
  const podeCriarEndosso = hasPermission('vendas:criar_endosso');

  const [endossoRecusadoDialogId, setEndossoRecusadoDialogId] = useState<string | null>(null);
  const { data: endossosRecusados = [] } = useEndossosRecusadosByDocumento(
    documento?.id,
    { enabled: open && podeCriarEndosso && documento?.status === 'ATIVO' },
  );
  const { data: endossoRecusadoData } = useEndosso(endossoRecusadoDialogId);
  const reenviarEndossoMutation = useReenviarEndosso();

  const { data: solicitacoesTroca = [] } = useSolicitacoesTrocaVendedor(
    documento?.id,
    { enabled: open && documento?.status === 'ATIVO' && (podeSolicitarTroca || podeAprovarTroca) },
  );
  const aprovarTroca = useAprovarTrocaVendedor();
  const recusarTroca = useRecusarTrocaVendedor();

  const { data: sinistrosRaw = [], isLoading: loadingSinistros } = useSinistrosByDocumento(
    documento?.id,
  );
  const sinistros = sinistrosRaw;
  const sinistrosPendentes = sinistros.filter(
    (s) => !['RECUSADO', 'PAGO', 'CANCELADO'].includes(s.status),
  );

  useEffect(() => {
    if (documento) {
      setEditForm({
        vigenciaInicio: documento.vigenciaInicio?.split('T')[0] || '',
        vigenciaFim: documento.vigenciaFim?.split('T')[0] || '',
        premioLiquido: documento.premioLiquido?.toString() || '',
        percentualComissao: documento.percentualComissao?.toString() || '',
        observacoes: documento.observacoes || '',
        numeroPropostaExterna: documento.numeroPropostaExterna || '',
        numeroParcelas: (documento.numeroParcelas ?? 1).toString(),
        modalidadePagamentoVendedor: documento.modalidadePagamentoVendedor ?? 'AVISTA',
        vendedorId: documento.vendedorId ?? '',
        vendedorSecundarioId: documento.vendedorSecundarioId ?? null,
        vendedorTerceiroId: documento.vendedorTerceiroId ?? null,
      });
      setIsEditing(false);
    }
  }, [documento?.id]);

  const handleSalvar = async () => {
    if (!documento) return;
    try {
      await atualizarMutation.mutateAsync({
        id: documento.id,
        data: {
          vigenciaInicio: editForm.vigenciaInicio || undefined,
          vigenciaFim: editForm.vigenciaFim || undefined,
          premioLiquido: editForm.premioLiquido
            ? parseFloat(editForm.premioLiquido)
            : undefined,
          percentualComissao: editForm.percentualComissao
            ? parseFloat(editForm.percentualComissao)
            : undefined,
          observacoes: editForm.observacoes || undefined,
          numeroPropostaExterna: editForm.numeroPropostaExterna || undefined,
          numeroParcelas: parseInt(editForm.numeroParcelas) || 1,
          modalidadePagamentoVendedor: editForm.modalidadePagamentoVendedor,
          vendedorId: editForm.vendedorId || undefined,
          vendedorSecundarioId: editForm.vendedorSecundarioId ?? undefined,
          vendedorTerceiroId: editForm.vendedorTerceiroId ?? undefined,
        },
      });
      toast.success('Documento atualizado com sucesso!');
      setIsEditing(false);
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  if (!documento) return <Dialog open={open} onOpenChange={onClose} />;

  const nomeCliente =
    documento.cliente.tipoPessoa === 'PF'
      ? documento.cliente.nome
      : documento.cliente.razaoSocial;

  const diasVigencia = calcularDiasVigencia(
    documento.vigenciaInicio,
    documento.vigenciaFim,
  );

  return (
    <>
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        if (pendingComentario.trim() && !window.confirm('Há um comentário não enviado. Descartar e fechar?')) return;
        setPendingComentario('');
        onClose();
      }
    }}>
      <DialogContent className="!w-[98vw] !max-w-[1760px] h-[95vh] p-0 gap-0 overflow-hidden flex flex-row">
        <DialogTitle className="sr-only">
          Documento de Venda — {documento.numero}
        </DialogTitle>

        {/* ── SIDEBAR — hidden on mobile ──────────────────────────── */}
        <aside className="hidden md:flex w-[340px] shrink-0 h-full bg-card flex-col overflow-y-auto border-r border-border">
          {/* Navegação */}
          <div className="px-6 pt-5 pb-4">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="size-4" />
              Cadastro
            </button>
          </div>

          {/* Badges */}
          <div className="px-6 flex flex-col gap-2 mb-5">
            {getStatusBadge(documento.status)}
            {documento.negocioCorretora && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/30 rounded-md px-2 py-1 w-fit">
                <Building2 className="size-3" />
                Negócio Corretora
              </div>
            )}
          </div>

          {/* Número + Cliente */}
          <div className="px-6 mb-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Documento
            </p>
            <p className="text-sm text-muted-foreground font-mono mb-3">
              {documento.numero}
            </p>
            <p className="text-2xl font-bold text-foreground leading-tight">
              {nomeCliente}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {documento.cliente.tipoPessoa === 'PF'
                ? 'Pessoa Física'
                : 'Pessoa Jurídica'}
            </p>
          </div>

          <Separator
            className="mx-6 mb-5"
            style={{ width: 'calc(100% - 48px)' }}
          />

          {/* Documento + Contato */}
          <div className="px-6 mb-5 space-y-2">
            {documento.cliente.tipoPessoa === 'PF' && documento.cliente.cpf && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                  CPF
                </p>
                <p className="text-sm text-foreground">
                  {formatCPF(documento.cliente.cpf)}
                </p>
              </div>
            )}
            {documento.cliente.tipoPessoa === 'PJ' &&
              documento.cliente.cnpj && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                    CNPJ
                  </p>
                  <p className="text-sm text-foreground">
                    {formatCNPJ(documento.cliente.cnpj)}
                  </p>
                </div>
              )}
            {documento.cliente.email && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                  E-mail
                </p>
                <p className="text-sm text-foreground break-all">
                  {documento.cliente.email}
                </p>
              </div>
            )}
            {(documento.cliente.celular || documento.cliente.telefone) && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                  Telefone
                </p>
                <p className="text-sm text-foreground">
                  {formatTelefone(
                    documento.cliente.celular || documento.cliente.telefone!,
                  )}
                </p>
              </div>
            )}
          </div>

          <Separator
            className="mx-6 mb-5"
            style={{ width: 'calc(100% - 48px)' }}
          />

          {/* Produto */}
          <div className="px-6 mb-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Produto
            </p>
            <p className="text-base font-semibold text-foreground">
              {documento.produto?.nomeProduto || '-'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {documento.produto?.tipoSeguro}
              {documento.negocioCorretora ? ' · VIA CORRETORA' : ''}
            </p>
          </div>

          {/* Card Prêmio */}
          <div className="mx-6 mb-6 rounded-xl bg-muted/50 border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Prêmio Líquido
            </p>
            <p className="text-3xl font-bold text-foreground mb-1">
              {formatCurrency(documento.premioLiquido)}
            </p>
            {documento.percentualComissao && (
              <p className="text-sm text-muted-foreground">
                Comissão {formatPercentage(documento.percentualComissao)}
                {podeVerComissao && documento.valorComissao && (
                  <> · {formatCurrency(documento.valorComissao)}</>
                )}
              </p>
            )}
          </div>

          {endossosRecusados.length > 0 && (
            <div className="mx-6 mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <TriangleAlert className="size-4 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-destructive">Endosso Recusado</p>
                  {endossosRecusados[0].motivoRecusa && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {endossosRecusados[0].motivoRecusa}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    className="mt-2 w-full h-7 text-xs"
                    onClick={() => setEndossoRecusadoDialogId(endossosRecusados[0].id)}
                  >
                    <Send className="size-3 mr-1.5" />
                    Editar e Reenviar
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1" />

          {/* Botões de ação */}
          <div className="px-6 pb-6 flex flex-col gap-2">
            {documento.status === 'ATIVO' && !readOnly && (
              <CriarEndossoDialog
                documento={documento}
                trigger={
                  <Button className="w-full" variant="default">
                    <FilePen className="mr-2 size-4" />
                    Solicitar Endosso
                  </Button>
                }
              />
            )}

            {documento.status === 'VENDA_CONFIRMADA' && !readOnly && (
              <>
                {isEditing ? (
                  <>
                    <Button
                      onClick={handleSalvar}
                      disabled={atualizarMutation.isPending}
                      className="w-full"
                    >
                      {atualizarMutation.isPending
                        ? 'Salvando...'
                        : 'Salvar Alterações'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      disabled={atualizarMutation.isPending}
                      className="w-full"
                    >
                      Cancelar Edição
                    </Button>
                  </>
                ) : (
                  <>
                    {onReenviarCadastro && (
                      <Button
                        onClick={onReenviarCadastro}
                        disabled={isReenviandoCadastro}
                        className="w-full"
                      >
                        <Send className="mr-2 size-4" />
                        {isReenviandoCadastro
                          ? 'Enviando...'
                          : documento.motivoRejeicao
                            ? 'Reenviar para Cadastro'
                            : 'Enviar para Cadastro'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      className="w-full"
                    >
                      <Pencil className="mr-2 size-4" />
                      Editar
                    </Button>
                  </>
                )}
              </>
            )}

            {documento.status === 'AGUARDANDO_CADASTRO' && (
              <>
                {onFinalizarCadastro && (
                  <Button
                    onClick={onFinalizarCadastro}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    <CheckCircle2 className="mr-2 size-4" />
                    Finalizar Cadastro
                  </Button>
                )}
                {onReprovarCadastro && (
                  <Button
                    onClick={onReprovarCadastro}
                    variant="outline"
                    className="w-full"
                  >
                    <XCircle className="mr-2 size-4" />
                    Reprovar
                  </Button>
                )}
              </>
            )}

            {documento.status === 'PERDIDO' && (
              <>
                {onConfirmarPerda && (
                  <Button
                    onClick={onConfirmarPerda}
                    variant="destructive"
                    className="w-full"
                  >
                    <CheckCircle2 className="mr-2 size-4" />
                    Confirmar Perda
                  </Button>
                )}
                {onRejeitarPerda && (
                  <Button
                    onClick={onRejeitarPerda}
                    variant="outline"
                    className="w-full"
                  >
                    <XCircle className="mr-2 size-4" />
                    Rejeitar Perda
                  </Button>
                )}
              </>
            )}
          </div>
        </aside>

        {/* ── MAIN CONTENT ────────────────────────────────────────── */}
        <main className="flex-1 h-full overflow-hidden bg-background flex flex-col">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col h-full"
          >
            {/* Tabs header */}
            <TabsList className="bg-background border-b border-border rounded-none w-full justify-start px-4 md:px-8 h-14 shrink-0 gap-0 overflow-x-auto">
              <TabsTrigger
                value="dados"
                className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent bg-transparent px-0 mr-8 text-sm font-medium h-full"
              >
                <FileText className="size-4 mr-2" />
                Dados do Documento
              </TabsTrigger>
              <TabsTrigger
                value="anexos"
                className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent bg-transparent px-0 mr-8 text-sm font-medium h-full"
              >
                <Paperclip className="size-4 mr-2" />
                Anexos
              </TabsTrigger>
              <TabsTrigger
                value="comentarios"
                className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent bg-transparent px-0 text-sm font-medium h-full gap-2"
              >
                <MessageSquare className="size-4" />
                Comentários
                {comentarios.length > 0 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {comentarios.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="sinistros"
                className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent bg-transparent px-0 ml-8 text-sm font-medium h-full gap-2"
              >
                <ShieldAlert className="size-4" />
                Sinistros
                {sinistrosPendentes.length > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0">
                    {sinistrosPendentes.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Dados do Documento */}
            <TabsContent value="dados" className="flex-1 overflow-y-auto mt-0">
              <div className="px-4 md:px-8 py-4 md:py-6 space-y-8">
                {/* Banner de rejeição */}
                {documento.motivoRejeicao && (
                  <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 flex items-start gap-3">
                    <TriangleAlert className="size-4 text-warning shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        Cadastro Rejeitado
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {documento.motivoRejeicao}
                      </p>
                      {(documento as any).rejeitadoPor && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Reprovado por: {(documento as any).rejeitadoPor.nome}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Corrija as informações necessárias, adicione os anexos e
                        reenvie para o cadastro.
                      </p>
                    </div>
                  </div>
                )}

                {/* Banner Negócio Corretora */}
                {documento.negocioCorretora && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
                    <div className="rounded-md bg-primary/10 p-2 shrink-0">
                      <Building2 className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        Negócio Corretora
                      </p>
                      <p className="text-xs text-muted-foreground">
                        é um negócio originado e pertencente à própria corretora
                      </p>
                    </div>
                  </div>
                )}

                {/* Notas */}
                {(documento.observacoes || isEditing) && (
                  <section className="rounded-xl border border-border p-4 bg-muted/30">
                    <SectionLabel
                      icon={<StickyNote className="size-3.5" />}
                      color="text-muted-foreground"
                    >
                      Notas
                    </SectionLabel>
                    {isEditing ? (
                      <Textarea
                        placeholder="Notas sobre o documento..."
                        value={editForm.observacoes}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            observacoes: e.target.value,
                          }))
                        }
                        rows={4}
                        className="bg-card"
                      />
                    ) : (
                      <div className="rounded-lg border border-border bg-muted/50 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-foreground">
                            {documento.vendedor?.nome}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(documento.updatedAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {documento.observacoes}
                        </p>
                      </div>
                    )}
                  </section>
                )}

                {/* Vigência da Apólice */}
                <section className="rounded-xl border border-blue-500/40 p-4 bg-blue-500/3">
                  <SectionLabel
                    icon={<Calendar className="size-3.5" />}
                    color="text-blue-500"
                  >
                    Vigência da Apólice
                  </SectionLabel>
                  <div className="space-y-3">
                    {(documento.numeroApoliceExterna ||
                      documento.numeroApolice) && (
                      <div className="flex items-center gap-3 rounded-lg bg-blue-500/5 border border-border px-4 py-3">
                        <FileText className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground uppercase tracking-wider shrink-0">
                          Número da Apólice
                        </span>
                        <span className="font-semibold text-foreground ml-1">
                          {documento.numeroApoliceExterna ||
                            documento.numeroApolice}
                        </span>
                      </div>
                    )}
                    {!isEditing && documento.numeroPropostaExterna && (
                      <div className="flex items-center gap-3 rounded-lg bg-blue-500/5 border border-border px-4 py-3">
                        <FileText className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground uppercase tracking-wider shrink-0">
                          Número da Proposta
                        </span>
                        <span className="font-semibold text-foreground ml-1">
                          {documento.numeroPropostaExterna}
                        </span>
                      </div>
                    )}

                    {isEditing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Data de Início</Label>
                          <DateInput
                            value={editForm.vigenciaInicio}
                            onChange={(v) =>
                              setEditForm((f) => ({ ...f, vigenciaInicio: v }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Data de Término</Label>
                          <DateInput
                            value={editForm.vigenciaFim}
                            onChange={(v) =>
                              setEditForm((f) => ({ ...f, vigenciaFim: v }))
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          'grid divide-x divide-y md:divide-y-0 divide-border bg-blue-500/5 rounded-lg border border-border overflow-hidden',
                          documento.dataEmissao ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3',
                        )}
                      >
                        <InfoCell
                          label="Início"
                          value={formatDate(documento.vigenciaInicio)}
                        />
                        <InfoCell
                          label="Término"
                          value={formatDate(documento.vigenciaFim)}
                        />
                        <InfoCell
                          label="Período"
                          value={`${diasVigencia} dias`}
                          highlight
                        />
                        {documento.dataEmissao && (
                          <InfoCell
                            label="Emissão"
                            value={formatDate(documento.dataEmissao)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </section>

                {/* Seguro */}
                <section className="rounded-xl border border-violet-500/40 p-4 bg-violet-500/3">
                  <div className="flex items-center justify-between mb-3">
                    <SectionLabel
                      icon={<ShieldCheck className="size-3.5" />}
                      color="text-violet-500"
                      noMargin
                    >
                      Seguro
                    </SectionLabel>
                    {documento.situacaoCotacao === 'RENOVACAO' ? (
                      <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        Renovação
                      </span>
                    ) : (
                      <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
                        Novo
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border bg-violet-500/5 rounded-lg border border-border overflow-hidden">
                    <InfoCell
                      label="Seguradora"
                      value={
                        documento.seguradoraParceira?.nomeFantasia ||
                        documento.seguradoraParceira?.razaoSocial ||
                        'Não informado'
                      }
                    />
                    <InfoCell
                      label="Produto"
                      value={documento.produto?.nomeProduto || '-'}
                    />
                    <InfoCell
                      label="Ramo"
                      value={documento.produto?.tipoSeguro || '-'}
                    />
                    <InfoCell
                      label="Item Segurado"
                      value={documento.itemDescricao || '-'}
                    />
                  </div>
                  {(documento.franquia || documento.valorSegurado) && (
                    <div
                      className={`grid divide-x divide-border bg-violet-500/5 rounded-lg border border-border overflow-hidden mt-3 ${documento.franquia && documento.valorSegurado ? 'grid-cols-2' : 'grid-cols-1'}`}
                    >
                      {documento.valorSegurado && (
                        <InfoCell
                          label="Valor Segurado"
                          value={formatCurrency(documento.valorSegurado)}
                        />
                      )}
                      {documento.franquia && (
                        <InfoCell
                          label="Franquia"
                          value={formatCurrency(documento.franquia)}
                        />
                      )}
                    </div>
                  )}
                </section>

                {/* Equipe de Vendas */}
                {(documento.vendedor ||
                  documento.vendedorSecundario ||
                  documento.vendedorTerceiro ||
                  documento.atuante) && (
                  <section className="rounded-xl border border-amber-500/40 p-4 bg-amber-500/3">
                    <SectionLabel
                      icon={<Users className="size-3.5" />}
                      color="text-amber-500"
                    >
                      Equipe de Vendas
                    </SectionLabel>
                    {isEditing && documento.status === 'VENDA_CONFIRMADA' ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Vendedor Principal</Label>
                          <Select
                            value={editForm.vendedorId}
                            onValueChange={(v) => setEditForm((f) => ({ ...f, vendedorId: v }))}
                          >
                            <SelectTrigger className="bg-card">
                              <SelectValue placeholder="Selecionar vendedor..." />
                            </SelectTrigger>
                            <SelectContent>
                              {vendedores.map((v) => (
                                <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {documento.vendedorSecundarioId && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Vendedor Secundário</Label>
                            <Select
                              value={editForm.vendedorSecundarioId ?? ''}
                              onValueChange={(v) => setEditForm((f) => ({ ...f, vendedorSecundarioId: v }))}
                            >
                              <SelectTrigger className="bg-card">
                                <SelectValue placeholder="Selecionar vendedor..." />
                              </SelectTrigger>
                              <SelectContent>
                                {vendedores.map((v) => (
                                  <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {documento.vendedorTerceiroId && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Vendedor Terciário</Label>
                            <Select
                              value={editForm.vendedorTerceiroId ?? ''}
                              onValueChange={(v) => setEditForm((f) => ({ ...f, vendedorTerceiroId: v }))}
                            >
                              <SelectTrigger className="bg-card">
                                <SelectValue placeholder="Selecionar vendedor..." />
                              </SelectTrigger>
                              <SelectContent>
                                {vendedores.map((v) => (
                                  <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {documento.vendedor && (
                        <SellerCard
                          nome={documento.vendedor.nome}
                          role="Vendedor Principal"
                          avatarUrl={documento.vendedor.avatarUrl}
                          className="bg-amber-500/5 border border-border"
                        />
                      )}
                      {documento.vendedorSecundario && (
                        <SellerCard
                          nome={documento.vendedorSecundario.nome}
                          role="Vendedor Secundário"
                          avatarUrl={documento.vendedorSecundario.avatarUrl}
                          className="bg-amber-500/5 border border-border"
                        />
                      )}
                      {documento.vendedorTerceiro && (
                        <SellerCard
                          nome={documento.vendedorTerceiro.nome}
                          role="Vendedor Terciário"
                          avatarUrl={documento.vendedorTerceiro.avatarUrl}
                          className="bg-amber-500/5 border border-border"
                        />
                      )}
                      {documento.atuante && (
                        <SellerCard
                          nome={documento.atuante.nome}
                          role="Atuante da Venda"
                          avatarUrl={documento.atuante.avatarUrl}
                          className="bg-amber-500/5 border border-border"
                        />
                      )}
                    </div>
                    )}

                    {/* Botão de troca + solicitações */}
                    {documento.status === 'ATIVO' && !readOnly && (podeSolicitarTroca || podeAprovarTroca) && (
                      <div className="mt-4 space-y-3">
                        {podeSolicitarTroca && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTrocaVendedorOpen(true)}
                          >
                            Solicitar Troca de Vendedor
                          </Button>
                        )}

                        {solicitacoesTroca.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Solicitações de Troca
                            </p>
                            {solicitacoesTroca.map((sol: SolicitacaoTrocaVendedor) => (
                              <div
                                key={sol.id}
                                className="rounded-lg border border-border p-3 text-sm space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium capitalize">
                                    Vendedor {sol.tipoVendedor}:{' '}
                                    <span className="text-muted-foreground">
                                      {sol.vendedorAtual.nome}
                                    </span>{' '}
                                    →{' '}
                                    <span className="text-foreground">
                                      {sol.novoVendedor.nome}
                                    </span>
                                  </span>
                                  <span
                                    className={
                                      sol.status === 'PENDENTE'
                                        ? 'text-yellow-600 dark:text-yellow-400 text-xs'
                                        : sol.status === 'APROVADA'
                                          ? 'text-green-600 dark:text-green-400 text-xs'
                                          : 'text-red-600 dark:text-red-400 text-xs'
                                    }
                                  >
                                    {sol.status === 'PENDENTE'
                                      ? 'Pendente'
                                      : sol.status === 'APROVADA'
                                        ? 'Aprovada'
                                        : 'Recusada'}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Motivo: {sol.motivo}
                                </p>
                                {sol.status === 'RECUSADA' && sol.motivoRecusa && (
                                  <p className="text-xs text-red-600 dark:text-red-400">
                                    Recusa: {sol.motivoRecusa}
                                  </p>
                                )}
                                {sol.status === 'PENDENTE' && podeAprovarTroca && (
                                  <div className="flex gap-2 pt-1">
                                    {recusandoId === sol.id ? (
                                      <div className="flex gap-2 w-full">
                                        <input
                                          className="flex-1 text-xs border rounded px-2 py-1"
                                          placeholder="Motivo da recusa..."
                                          value={recusarMotivo}
                                          onChange={(e) => setRecusarMotivo(e.target.value)}
                                        />
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          className="h-7 text-xs"
                                          disabled={!recusarMotivo || recusarTroca.isPending}
                                          onClick={async () => {
                                            if (!documento || !recusarMotivo) return;
                                            try {
                                              await recusarTroca.mutateAsync({
                                                documentoId: documento.id,
                                                requestId: sol.id,
                                                motivoRecusa: recusarMotivo,
                                              });
                                              setRecusandoId(null);
                                              setRecusarMotivo('');
                                              toast.success('Solicitação recusada');
                                            } catch (err: any) {
                                              toast.error(err?.message ?? 'Erro ao recusar solicitação');
                                            }
                                          }}
                                        >
                                          Confirmar
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-xs"
                                          onClick={() => {
                                            setRecusandoId(null);
                                            setRecusarMotivo('');
                                          }}
                                        >
                                          Cancelar
                                        </Button>
                                      </div>
                                    ) : (
                                      <>
                                        <Button
                                          size="sm"
                                          className="h-7 text-xs"
                                          disabled={aprovarTroca.isPending}
                                          onClick={async () => {
                                            if (!documento) return;
                                            try {
                                              await aprovarTroca.mutateAsync({
                                                documentoId: documento.id,
                                                requestId: sol.id,
                                              });
                                              toast.success('Vendedor atualizado com sucesso');
                                            } catch (err: any) {
                                              toast.error(err?.message ?? 'Erro ao aprovar solicitação');
                                            }
                                          }}
                                        >
                                          Aprovar
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-xs"
                                          onClick={() => setRecusandoId(sol.id)}
                                        >
                                          Recusar
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                )}

                {/* Financeiro */}
                <section className="rounded-xl border border-primary/50 p-4 bg-primary/3">
                  <SectionLabel
                    icon={<CreditCard className="size-3.5" />}
                    color="text-primary"
                  >
                    Informações Financeiras
                  </SectionLabel>
                  {isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Prêmio Líquido (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={editForm.premioLiquido}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              premioLiquido: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>% Comissão</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={editForm.percentualComissao}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              percentualComissao: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Nº de Parcelas (seguradora)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={60}
                          step={1}
                          placeholder="1"
                          value={editForm.numeroParcelas}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              numeroParcelas: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Label>Pagamento ao Vendedor</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[220px]">
                              <p className="text-xs">
                                <strong>À Vista:</strong> vendedor recebe o total da comissão na 1ª parcela.<br />
                                <strong>Parcelado:</strong> vendedor recebe proporcional a cada repasse da seguradora.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Select
                          value={editForm.modalidadePagamentoVendedor}
                          onValueChange={(v) =>
                            setEditForm((f) => ({
                              ...f,
                              modalidadePagamentoVendedor: v as 'AVISTA' | 'PARCELADO',
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AVISTA">À Vista</SelectItem>
                            <SelectItem value="PARCELADO">Parcelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className={`grid gap-3 ${podeVerComissao ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                      <div className="rounded-lg bg-green-500/5 border border-primary/40 overflow-hidden">
                        <InfoCell
                          label="Prêmio Líquido"
                          value={formatCurrency(documento.premioLiquido)}
                          highlight
                        />
                      </div>
                      <div className="rounded-lg bg-green-500/5 border border-primary/40 overflow-hidden">
                        <InfoCell
                          label="% Comissão"
                          value={formatPercentage(documento.percentualComissao)}
                          highlight
                        />
                      </div>
                      {podeVerComissao && (
                        <div className="rounded-lg bg-green-500/5 border border-primary/40 overflow-hidden">
                          <InfoCell
                            label="Valor Comissão"
                            value={formatCurrency(documento.valorComissao)}
                            highlight
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {podeVerComissao &&
                    documento.negocioCorretora &&
                    documento.valorComissaoCorretora && (
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-primary/5 border border-primary/30 px-4 py-3">
                        <div>
                          <p className="text-xs text-primary uppercase tracking-wider mb-0.5">
                            Comissão Corretora
                          </p>
                          <p className="text-lg font-bold text-foreground">
                            {formatCurrency(documento.valorComissaoCorretora)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-primary">
                          {formatPercentage(documento.percentualCorretora)}
                        </p>
                      </div>
                    )}

                  {/* Parcelamento — read-only */}
                  {!isEditing && podeVerComissao && (documento.numeroParcelas ?? 1) > 1 && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg border border-muted px-4 py-2.5 text-sm">
                      <span className="text-muted-foreground">Parcelas da seguradora:</span>
                      <span className="font-semibold">{documento.numeroParcelas}×</span>
                      <span className="text-muted-foreground ml-auto">Pagamento ao vendedor:</span>
                      <span className="font-semibold">
                        {documento.modalidadePagamentoVendedor === 'PARCELADO' ? 'Parcelado' : 'À Vista'}
                      </span>
                    </div>
                  )}
                </section>

                {/* Número Proposta Externa (edit mode) */}
                {isEditing && (
                  <section>
                    <SectionLabel>Proposta Externa</SectionLabel>
                    <Input
                      placeholder="Ex: 2024-001234"
                      value={editForm.numeroPropostaExterna}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          numeroPropostaExterna: e.target.value,
                        }))
                      }
                      className="bg-card"
                    />
                  </section>
                )}

                {/* Salvar (edit mode) */}
                {isEditing && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      disabled={atualizarMutation.isPending}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSalvar}
                      disabled={atualizarMutation.isPending}
                    >
                      {atualizarMutation.isPending
                        ? 'Salvando...'
                        : 'Salvar Alterações'}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Anexos */}
            <TabsContent value="anexos" className="flex-1 overflow-y-auto mt-0">
              <div className="px-8 py-6">
                <AnexosTab
                  entidade="documento_venda"
                  entidadeId={documento.id}
                  isActive={activeTab === 'anexos'}
                  readOnly={readOnly}
                />
              </div>
            </TabsContent>

            {/* Comentários */}
            <TabsContent value="comentarios" className="flex-1 overflow-y-auto mt-0">
              <div className="px-8 py-6 h-full">
                <ComentariosPanel
                  comentarios={comentarios as any}
                  isLoading={loadingComentarios}
                  canAdd
                  onAdd={(texto, parentId) =>
                    adicionarComentario({
                      documentoId: documento.id,
                      texto,
                      parentId,
                    })
                  }
                  isSending={enviandoComentario}
                  onPendingTextChange={setPendingComentario}
                />
              </div>
            </TabsContent>

            {/* Sinistros */}
            <TabsContent value="sinistros" className="flex-1 overflow-y-auto mt-0">
              <div className="px-4 md:px-8 py-4 md:py-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-semibold text-foreground">Sinistros da Apólice</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {loadingSinistros
                        ? 'Carregando...'
                        : sinistros.length === 0
                          ? 'Nenhum sinistro registrado'
                          : `${sinistros.length} sinistro${sinistros.length > 1 ? 's' : ''}`}
                    </p>
                  </div>
                  {hasPermission('sinistros:criar') && (
                    <Button size="sm" onClick={() => setNovoSinistroOpen(true)}>
                      <Plus className="size-4 mr-1.5" />
                      Registrar sinistro
                    </Button>
                  )}
                  {!hasPermission('sinistros:criar') && hasPermission('sinistros:indicar') && documento.status === 'ATIVO' && (
                    <Button size="sm" variant="outline" onClick={() => setIndicarSinistroOpen(true)}>
                      <ShieldAlert className="size-4 mr-1.5" />
                      Indicar ocorrência
                    </Button>
                  )}
                </div>

                {loadingSinistros && (
                  <div className="flex items-center justify-center py-16 text-muted-foreground">
                    <Loader2 className="size-5 animate-spin mr-2" />
                    <span className="text-sm">Carregando sinistros...</span>
                  </div>
                )}

                {!loadingSinistros && sinistros.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <ShieldAlert className="size-8 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-foreground mb-1">Nenhum sinistro</p>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Esta apólice não possui sinistros registrados.
                      {hasPermission('sinistros:criar') && ' Use o botão acima para abrir um chamado.'}
                    </p>
                  </div>
                )}

                {!loadingSinistros && sinistros.length > 0 && (
                  <div className="space-y-2">
                    {sinistros.map((sinistro) => (
                      <div
                        key={sinistro.id}
                        className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedSinistro(sinistro);
                          setSinistroDetalheOpen(true);
                        }}
                      >
                        <div className={cn('w-1 self-stretch rounded-full shrink-0 mt-0.5', SINISTRO_STATUS_BAR[sinistro.status])} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', SINISTRO_STATUS_COLORS[sinistro.status])}>
                              {STATUS_SINISTRO_LABELS[sinistro.status]}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">{sinistro.numeroSinistro}</span>
                          </div>
                          <p className="text-sm font-medium text-foreground mb-0.5">
                            {TIPO_SINISTRO_LABELS[sinistro.tipoSinistro]}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{sinistro.descricao}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                            <span>Ocorrência: {formatDate(sinistro.dataOcorrencia)}</span>
                            {sinistro.valorReclamado && (
                              <span>Reclamado: {formatCurrency(parseFloat(sinistro.valorReclamado))}</span>
                            )}
                            {sinistro.valorAprovado && (
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                Aprovado: {formatCurrency(parseFloat(sinistro.valorAprovado))}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSinistro(sinistro);
                            setSinistroDetalheOpen(true);
                          }}
                        >
                          Ver detalhes
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Troca de Vendedor */}
          {documento.status === 'ATIVO' && (
            <SolicitarTrocaVendedorDialog
              documento={documento}
              open={trocaVendedorOpen}
              onOpenChange={setTrocaVendedorOpen}
            />
          )}

          {/* Sinistro modals */}
          <SinistroDetalheSheet
            sinistro={selectedSinistro}
            open={sinistroDetalheOpen}
            onOpenChange={setSinistroDetalheOpen}
          />
          <NovoSinistroDialog
            open={novoSinistroOpen}
            onOpenChange={setNovoSinistroOpen}
            defaultDocumentoVendaId={documento.id}
          />
          <IndicarSinistroDialog
            open={indicarSinistroOpen}
            onOpenChange={setIndicarSinistroOpen}
            documentoVendaId={documento.id}
            nomeCliente={nomeCliente}
          />

          {/* Action buttons — mobile only */}
          <div className="md:hidden px-4 pb-4 pt-3 border-t shrink-0 flex flex-col gap-2">
            {documento.status === 'ATIVO' && !readOnly && (
              <CriarEndossoDialog
                documento={documento}
                trigger={
                  <Button className="w-full" variant="default">
                    <FilePen className="mr-2 size-4" />
                    Solicitar Endosso
                  </Button>
                }
              />
            )}
            {documento.status === 'VENDA_CONFIRMADA' && !readOnly && (
              isEditing ? (
                <>
                  <Button onClick={handleSalvar} disabled={atualizarMutation.isPending} className="w-full">
                    {atualizarMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={atualizarMutation.isPending} className="w-full">
                    Cancelar Edição
                  </Button>
                </>
              ) : (
                <>
                  {onReenviarCadastro && (
                    <Button onClick={onReenviarCadastro} disabled={isReenviandoCadastro} className="w-full">
                      <Send className="mr-2 size-4" />
                      {isReenviandoCadastro ? 'Enviando...' : documento.motivoRejeicao ? 'Reenviar para Cadastro' : 'Enviar para Cadastro'}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setIsEditing(true)} className="w-full">
                    <Pencil className="mr-2 size-4" />
                    Editar
                  </Button>
                </>
              )
            )}
            {documento.status === 'AGUARDANDO_CADASTRO' && (
              <>
                {onFinalizarCadastro && (
                  <Button onClick={onFinalizarCadastro} className="w-full">
                    <CheckCircle2 className="mr-2 size-4" />
                    Finalizar Cadastro
                  </Button>
                )}
                {onReprovarCadastro && (
                  <Button onClick={onReprovarCadastro} variant="outline" className="w-full">
                    <XCircle className="mr-2 size-4" />
                    Reprovar
                  </Button>
                )}
              </>
            )}
            {documento.status === 'PERDIDO' && (
              <>
                {onConfirmarPerda && (
                  <Button onClick={onConfirmarPerda} variant="destructive" className="w-full">
                    <CheckCircle2 className="mr-2 size-4" />
                    Confirmar Perda
                  </Button>
                )}
                {onRejeitarPerda && (
                  <Button onClick={onRejeitarPerda} variant="outline" className="w-full">
                    <XCircle className="mr-2 size-4" />
                    Rejeitar Perda
                  </Button>
                )}
              </>
            )}
          </div>
        </main>
      </DialogContent>
    </Dialog>

    <EndossoRecusadoDialog
      open={!!endossoRecusadoDialogId}
      endosso={endossoRecusadoData ?? null}
      onClose={() => setEndossoRecusadoDialogId(null)}
      onReenviar={async () => {
        if (!endossoRecusadoDialogId) return;
        try {
          await reenviarEndossoMutation.mutateAsync(endossoRecusadoDialogId);
          toast.success('Endosso reenviado para o cadastro!');
          setEndossoRecusadoDialogId(null);
        } catch (err) {
          toast.error(handleApiError(err));
        }
      }}
      isReenviando={reenviarEndossoMutation.isPending}
    />
    </>
  );
}
