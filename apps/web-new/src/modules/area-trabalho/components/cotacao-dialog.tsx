
import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Edit,
  Eye,
  Loader2,
  CheckCircle2,
  Flag,
  MessageSquare,
  FileText,
  Package,
  RefreshCw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { Form } from '@/core/ui/form';
import { Input } from '@/core/ui/input';
import { Textarea } from '@/core/ui/textarea';
import type { Cotacao } from '@/types/area-trabalho';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { useProdutos } from '@/modules/produtos/http';
import { useSeguradorasParceiras } from '@/modules/seguradoras-parceiras/http';
import { useVendedores } from '@/modules/usuarios/http';
import { cn } from '@/core/utils';
import {
  useConfirmarVendaCotacao,
  useMarcarCotacaoPerdida,
  useReabrirCotacao,
  useCotacao,
  useComentariosCotacao,
  useAdicionarComentarioCotacao,
  useSolicitarValidacaoCadastro,
  useUpdateQuote,
} from '../http';
import { usePermissions } from '@/core/hooks/use-permissions';
import { ComentariosPanel } from './comentarios-panel';
import { CotacaoDadosTab } from './cotacao-dados-tab';
import { CotacaoDialogSidebar } from './cotacao-dialog-sidebar';
import { AnexosTab } from '@/modules/anexos/components';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Label } from '@/core/ui/label';
import { DateInput } from '@/core/ui/date-input';
import { useAnexos } from '@/modules/anexos/http';
import { useResolveCommission } from '@/modules/configuracoes-comissoes/http';
import { Skeleton } from '@/core/ui/skeleton';

const editCotacaoSchema = z.object({
  produtoId: z.string().optional().or(z.literal('')),
  seguradoraParceiraId: z.string().optional().or(z.literal('')),
  vigenciaInicio: z.string().optional().or(z.literal('')),
  vigenciaFim: z.string().optional().or(z.literal('')),
  premioLiquido: z.string().optional(),
  percentualComissao: z.string().optional(),

  vendedorId: z.string().optional().nullable(),
  vendedorSecundarioId: z.string().optional().nullable(),
  vendedorTerceiroId: z.string().optional().nullable(),

  percentualComissaoPrincipal: z.string().optional(),
  percentualComissaoSecundario: z.string().optional(),
  percentualComissaoTerceiro: z.string().optional(),
  percentualCorretora: z.string().optional(),
  negocioCorretora: z.boolean().optional(),

  situacao: z.enum(['NOVO', 'RENOVACAO']).optional(),
  itemDescricao: z.string().max(500).optional(),
});

type EditCotacaoForm = z.infer<typeof editCotacaoSchema>;

interface CotacaoDialogProps {
  cotacao: Cotacao | null;
  open: boolean;
  mode: 'view' | 'edit';
  onClose: () => void;
  onSave?: (data: EditCotacaoForm) => Promise<void>;
  onVendaConfirmada?: () => void;
  onSwitchToEdit?: () => void;
}

function DadosTabSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[60px] w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-[90px] w-full rounded-lg" />
        <Skeleton className="h-[90px] w-full rounded-lg" />
      </div>
      <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
        <Skeleton className="h-4 w-20" />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-5 w-28" />
          </div>
        </div>
      </div>
      <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComentariosTabSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="size-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className={`h-4 ${i === 0 ? 'w-3/4' : i === 1 ? 'w-1/2' : 'w-2/3'}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AnexosTabSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
          <Skeleton className="size-8 rounded shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

const getStatusBadge = (status: string) => {
  const variants: Record<
    string,
    'default' | 'secondary' | 'destructive' | 'outline'
  > = {
    EM_ELABORACAO: 'secondary',
    PERDIDA: 'destructive',
    EXPIRADA: 'destructive',
    CONVERTIDA: 'default',
  };

  const labels: Record<string, string> = {
    EM_ELABORACAO: 'Em Elaboração',
    PERDIDA: 'Perdida',
    EXPIRADA: 'Expirada',
    CONVERTIDA: 'Convertida',
  };

  return (
    <Badge variant={variants[status] || 'default'}>
      {labels[status] || status}
    </Badge>
  );
};

function computeValorComissao(
  premioLiquido: string | number | null | undefined,
  percentualComissao: string | number | null | undefined,
): number | null {
  if (
    percentualComissao === null ||
    percentualComissao === undefined ||
    percentualComissao === ''
  )
    return null;
  const premio = parseFloat(String(premioLiquido || '0'));
  const percentual = parseFloat(String(percentualComissao));
  if (isNaN(percentual)) return null;
  return (premio * percentual) / 100;
}

export function CotacaoDialog({
  cotacao,
  open,
  mode,
  onClose,
  onSave,
  onVendaConfirmada,
  onSwitchToEdit,
}: CotacaoDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPerdidaDialog, setShowPerdidaDialog] = useState(false);
  const [confirmVigenciaInicio, setConfirmVigenciaInicio] = useState('');
  const [confirmVigenciaFim, setConfirmVigenciaFim] = useState('');
  const [motivoPerda, setMotivoPerda] = useState('');
  const [concorrenteGanhou, setConcorrenteGanhou] = useState('');
  const [detalhesPerda, setDetalhesPerda] = useState('');
  const [activeTab, setActiveTab] = useState('dados');
  const [showSemComissaoConfirm, setShowSemComissaoConfirm] = useState(false);
  const visitedTabs = useRef<Set<string>>(new Set(['dados']));

  const { data: cotacaoCompleta, isFetching: isFetchingCotacao } = useCotacao(cotacao?.id ?? null, {
    initialData: cotacao ?? undefined,
    initialDataUpdatedAt: 0,
  });
  const lastFetchedId = useRef<string | undefined>(undefined);
  const fetchedOnce = useRef(false);
  if (lastFetchedId.current !== cotacao?.id) {
    lastFetchedId.current = cotacao?.id;
    fetchedOnce.current = false;
  }
  useEffect(() => {
    if (!isFetchingCotacao) fetchedOnce.current = true;
  }, [isFetchingCotacao]);
  const showDadosSkeleton = isFetchingCotacao && !fetchedOnce.current;
  const cotacaoAtual = useMemo(() => cotacaoCompleta
    ? ({
        ...(cotacaoCompleta as Cotacao),
        dataRejeicaoCadastroDoc: (cotacaoCompleta as Cotacao).dataRejeicaoCadastroDoc ?? cotacao?.dataRejeicaoCadastroDoc,
        motivoRejeicaoCadastroDoc: (cotacaoCompleta as Cotacao).motivoRejeicaoCadastroDoc ?? cotacao?.motivoRejeicaoCadastroDoc,
        documentoVendaIdDoc: (cotacaoCompleta as Cotacao).documentoVendaIdDoc ?? cotacao?.documentoVendaIdDoc,
      } as Cotacao)
    : cotacao, [cotacaoCompleta, cotacao]);

  const { data: produtosData } = useProdutos({ ativo: true }, 1, 100, { enabled: mode === 'edit' });
  const produtos = produtosData?.data || [];

  const { data: seguradorasData } = useSeguradorasParceiras(
    { status: 'ATIVA', limit: 100 },
    { enabled: mode === 'edit' },
  );
  const seguradoras = seguradorasData?.data || [];

  const { data: usuarios = [] } = useVendedores({ enabled: mode === 'edit' });

  const { hasPermission } = usePermissions();

  const { mutate: confirmarVenda, isPending: isConfirmandoVenda } =
    useConfirmarVendaCotacao();
  const { mutate: marcarPerdida, isPending: isMarcandoPerdida } =
    useMarcarCotacaoPerdida();
  const { mutate: reabrirCotacao, isPending: isReabrindo } = useReabrirCotacao();
  const { mutate: solicitarValidacaoCadastro, isPending: isSolicitando } =
    useSolicitarValidacaoCadastro();
  const { mutate: updateQuote, isPending: isVinculando } = useUpdateQuote();

  // In view mode, always fetch so the "Confirmar Venda" check has accurate data.
  // In edit mode, keep lazy loading via visitedTabs.
  const { data: anexos = [], isLoading: isLoadingAnexos } = useAnexos(
    'cotacao',
    mode === 'view'
      ? (cotacao?.id ?? '')
      : (visitedTabs.current.has('anexos') ? (cotacao?.id ?? '') : ''),
  );

  const vendedorIdAtual = mode === 'edit' ? undefined : cotacaoAtual?.vendedorId;
  const tipoSeguroAtual = cotacaoAtual?.produto?.tipoSeguro;
  const tipoNegocioAtual = cotacaoAtual?.situacao;

  const cotacaoId = cotacao?.id || null;
  const { data: comentarios = [], isLoading: loadingComentarios } =
    useComentariosCotacao(visitedTabs.current.has('comentarios') ? cotacaoId : null);
  const { mutate: adicionarComentario, isPending: enviandoComentario } =
    useAdicionarComentarioCotacao();
  const [pendingComentario, setPendingComentario] = useState('');

  const form = useForm<EditCotacaoForm>({
    resolver: zodResolver(editCotacaoSchema),
    defaultValues: {
      produtoId: cotacao?.produtoId || '',
      seguradoraParceiraId: cotacao?.seguradoraParceiraId || '',
      vigenciaInicio: cotacao?.vigenciaInicio?.split('T')[0] || '',
      vigenciaFim: cotacao?.vigenciaFim?.split('T')[0] || '',
      premioLiquido: cotacao?.premioLiquido?.toString() || '',
      percentualComissao: cotacao?.percentualComissao?.toString() || '',
      vendedorId: null,
      vendedorSecundarioId: cotacao?.vendedorSecundarioId || null,
      vendedorTerceiroId: cotacao?.vendedorTerceiroId || null,
      percentualComissaoPrincipal:
        cotacao?.percentualComissaoPrincipal?.toString() || undefined,
      percentualComissaoSecundario:
        cotacao?.percentualComissaoSecundario?.toString() || undefined,
      percentualComissaoTerceiro:
        cotacao?.percentualComissaoTerceiro?.toString() || undefined,
      percentualCorretora:
        cotacao?.percentualCorretora?.toString() || undefined,
      negocioCorretora: true,
      situacao: cotacao?.situacao || 'NOVO',
      itemDescricao: (cotacao as any)?.itemDescricao || '',
    },
  });

  // Resetar aba ativa para "Dados" quando o modal abrir
  useEffect(() => {
    if (open) {
      setActiveTab('dados');
      visitedTabs.current = new Set(['dados']);
    }
  }, [open]);

  useEffect(() => {
    if (cotacaoAtual && mode === 'edit') {
      console.log('[CotacaoDialog] form.reset() DISPARADO — cotacaoAtual mudou', {
        produtoId: cotacaoAtual.produtoId,
        seguradoraParceiraId: cotacaoAtual.seguradoraParceiraId,
        isFetchingCotacao,
        timestamp: new Date().toISOString(),
      });
      form.reset({
        produtoId: cotacaoAtual.produtoId || '',
        seguradoraParceiraId: cotacaoAtual.seguradoraParceiraId || '',
        vigenciaInicio: cotacaoAtual.vigenciaInicio?.split('T')[0] || '',
        vigenciaFim: cotacaoAtual.vigenciaFim?.split('T')[0] || '',
        premioLiquido: cotacaoAtual.premioLiquido?.toString() || '',
        percentualComissao: cotacaoAtual.percentualComissao?.toString() || '',
        vendedorId: null,
        vendedorSecundarioId: cotacaoAtual.vendedorSecundarioId || null,
        vendedorTerceiroId: cotacaoAtual.vendedorTerceiroId || null,
        percentualComissaoPrincipal:
          cotacaoAtual.percentualComissaoPrincipal?.toString() || undefined,
        percentualComissaoSecundario:
          cotacaoAtual.percentualComissaoSecundario?.toString() || undefined,
        percentualComissaoTerceiro:
          cotacaoAtual.percentualComissaoTerceiro?.toString() || undefined,
        percentualCorretora:
          cotacaoAtual.percentualCorretora?.toString() || undefined,
        negocioCorretora:
          cotacaoAtual.negocioCorretora === false ? false : true,
        situacao: cotacaoAtual.situacao || 'NOVO',
        itemDescricao: (cotacaoAtual as any)?.itemDescricao || '',
      });
    }
  }, [cotacaoAtual, mode, form]);

  // Valores reativos para a sidebar (atualizam em tempo real em edit)
  const premioLiquidoWatch = useWatch({
    control: form.control,
    name: 'premioLiquido',
  });
  const percentualComissaoWatch = useWatch({
    control: form.control,
    name: 'percentualComissao',
  });
  const negocioCorretoraWatch = useWatch({
    control: form.control,
    name: 'negocioCorretora',
  });
  const vendedorIdWatch = useWatch({
    control: form.control,
    name: 'vendedorId',
  });

  // Único hook de comissão: em view usa o vendedor atual, em edit usa o selecionado no form
  const resolverVendedorId = mode === 'edit'
    ? (vendedorIdWatch ?? undefined)
    : cotacaoAtual?.vendedorId;
  const { data: resolverComissao } = useResolveCommission({
    usuarioId: resolverVendedorId,
    tipoSeguro: tipoSeguroAtual ?? undefined,
    tipoNegocio: tipoNegocioAtual,
    enabled: !!resolverVendedorId && !!tipoSeguroAtual,
  });

  useEffect(() => {
    if (mode !== 'edit' || !vendedorIdWatch) return;
    const percentual = resolverComissao?.percentualParticipacao;
    if (percentual) {
      form.setValue('percentualComissao', percentual, { shouldDirty: true });
    }
  }, [mode, vendedorIdWatch, resolverComissao?.percentualParticipacao, form]);

  // Deve ficar antes do early return para não violar Rules of Hooks
  const valorComissaoCalculadoWatch = useMemo(
    () => computeValorComissao(premioLiquidoWatch, percentualComissaoWatch),
    [premioLiquidoWatch, percentualComissaoWatch],
  );

  if (!cotacao) return null;

  const cotacaoEfetiva = cotacaoAtual || cotacao;

  const nomeCliente =
    cotacao.cliente?.tipoPessoa === 'PF'
      ? cotacao.cliente?.nome
      : cotacao.cliente?.nomeFantasia || cotacao.cliente?.razaoSocial;

  const premioLiquidoSidebar =
    mode === 'edit' ? premioLiquidoWatch : cotacaoAtual?.premioLiquido;
  const percentualComissaoSidebar =
    mode === 'edit'
      ? percentualComissaoWatch
      : cotacaoAtual?.percentualComissao;
  const valorComissaoSidebar =
    mode === 'edit'
      ? valorComissaoCalculadoWatch
      : (cotacaoAtual?.valorComissao != null
          ? Number(cotacaoAtual.valorComissao)
          : null);
  const negocioCorretoraSidebar =
    mode === 'edit'
      ? (negocioCorretoraWatch ?? true)
      : cotacaoAtual?.negocioCorretora !== false;

  const handleNegocioCorretoraChange = (checked: boolean) => {
    if (mode === 'edit') {
      form.setValue('negocioCorretora', checked, { shouldDirty: true });
    }
  };

  const scrollToFirstError = () => {
    setTimeout(() => {
      const el = document.querySelector('[aria-invalid="true"]');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  const handleSubmit = async (data: EditCotacaoForm) => {
    if (!onSave) return;

    form.clearErrors();

    const camposFaltando: string[] = [];

    if (!data.produtoId || data.produtoId.trim() === '') {
      camposFaltando.push('Produto');
    }
    if (!data.seguradoraParceiraId || data.seguradoraParceiraId.trim() === '') {
      camposFaltando.push('Seguradora');
    }
    if (!data.vigenciaInicio || data.vigenciaInicio.trim() === '') {
      camposFaltando.push('Início da Vigência');
    }
    if (!data.vigenciaFim || data.vigenciaFim.trim() === '') {
      camposFaltando.push('Fim da Vigência');
    } else if (
      data.vigenciaInicio &&
      new Date(data.vigenciaFim) <= new Date(data.vigenciaInicio)
    ) {
      camposFaltando.push('Fim da Vigência (deve ser posterior ao início)');
    }
    if (!data.premioLiquido || data.premioLiquido.trim() === '') {
      camposFaltando.push('Prêmio Líquido');
    }
    if (!data.vendedorId) {
      camposFaltando.push('Vendedor Principal');
    }

    try {
      setIsLoading(true);

      // Só enviar campos que o usuário efetivamente alterou. Enviar o payload
      // completo é perigoso em PATCH: se amanhã o backend reintroduzir qualquer
      // sync automático (ex.: atuante↔vendedor), campos não tocados virariam
      // gatilho silencioso. Mandar apenas o diff elimina essa classe de bug.
      const { dirtyFields } = form.formState;
      const payload: Record<string, unknown> = {};

      if (dirtyFields.produtoId) payload.produtoId = data.produtoId;
      if (dirtyFields.seguradoraParceiraId) {
        payload.seguradoraParceiraId = data.seguradoraParceiraId;
      }
      if (dirtyFields.vigenciaInicio) payload.vigenciaInicio = data.vigenciaInicio;
      if (dirtyFields.vigenciaFim) payload.vigenciaFim = data.vigenciaFim;
      if (dirtyFields.premioLiquido) {
        payload.premioLiquido = data.premioLiquido || undefined;
      }
      if (dirtyFields.percentualComissao) {
        payload.percentualComissao = data.percentualComissao || undefined;
      }
      if (dirtyFields.vendedorId) payload.vendedorId = data.vendedorId || null;
      if (dirtyFields.vendedorSecundarioId) {
        payload.vendedorSecundarioId = data.vendedorSecundarioId || null;
      }
      if (dirtyFields.vendedorTerceiroId) {
        payload.vendedorTerceiroId = data.vendedorTerceiroId || null;
      }
      if (dirtyFields.percentualComissaoPrincipal) {
        payload.percentualComissaoPrincipal =
          data.percentualComissaoPrincipal || undefined;
      }
      if (dirtyFields.percentualComissaoSecundario) {
        payload.percentualComissaoSecundario =
          data.percentualComissaoSecundario || undefined;
      }
      if (dirtyFields.percentualCorretora) {
        payload.percentualCorretora = data.percentualCorretora || undefined;
      }
      if (dirtyFields.negocioCorretora) {
        payload.negocioCorretora = data.negocioCorretora;
      }
      if (dirtyFields.situacao) payload.situacao = data.situacao || 'NOVO';
      if (dirtyFields.itemDescricao) {
        payload.itemDescricao = data.itemDescricao || undefined;
      }

      await onSave(payload);

      if (camposFaltando.length > 0) {
        toast.warning(
          <div>
            <div className="font-semibold mb-1">
              Rascunho salvo! Campos pendentes para confirmar venda:
            </div>
            <ul className="list-disc list-inside text-sm space-y-0.5">
              {camposFaltando.map((campo) => (
                <li key={campo}>{campo}</li>
              ))}
            </ul>
          </div>,
          { duration: 6000 },
        );
      } else {
        toast.success('Rascunho salvo com sucesso!');
      }
      onClose();
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarcarPerdida = () => {
    if (!motivoPerda) {
      toast.error('Informe o motivo da perda');
      return;
    }

    const payload = {
      cotacaoId: cotacao.id,
      motivoPerda,
      detalhesPerda: detalhesPerda || '',
      concorrenteGanhou: concorrenteGanhou || '',
    };

    marcarPerdida(payload, {
      onSuccess: () => {
        toast.success('Cotação marcada como perdida');
        setShowPerdidaDialog(false);
        setMotivoPerda('');
        setDetalhesPerda('');
        setConcorrenteGanhou('');
        onClose();
      },
      onError: (error: unknown) => {
        toast.error(handleApiError(error));
      },
    });
  };

  const validarCamposObrigatorios = (): string[] => {
    const camposPendentes: string[] = [];

    if (!cotacaoAtual?.produtoId) camposPendentes.push('Produto');
    if (!cotacaoAtual?.seguradoraParceiraId) camposPendentes.push('Seguradora');
    if (
      !cotacaoAtual?.premioLiquido ||
      Number(cotacaoAtual.premioLiquido) <= 0
    ) {
      camposPendentes.push('Prêmio Líquido');
    }
    if (!cotacaoAtual?.vigenciaInicio) {
      camposPendentes.push('Data de Início da Vigência');
    }
    if (!cotacaoAtual?.vigenciaFim) {
      camposPendentes.push('Data de Fim da Vigência');
    }

    return camposPendentes;
  };

  const handleTentarConfirmarVenda = () => {
    const camposPendentes = validarCamposObrigatorios();

    if (camposPendentes.length > 0) {
      toast.error(
        <div>
          <p className="font-semibold mb-2">Campos obrigatórios pendentes:</p>
          <ul className="list-disc list-inside text-sm">
            {camposPendentes.map((campo) => (
              <li key={campo}>{campo}</li>
            ))}
          </ul>
        </div>,
        { duration: 5000 },
      );
      return;
    }

    if (isLoadingAnexos) {
      return;
    }

    if (!anexos || anexos.length === 0) {
      toast.error(
        <div>
          <p className="font-semibold mb-2">Anexo obrigatório</p>
          <p className="text-sm">
            É necessário anexar pelo menos um documento antes de confirmar a
            venda.
          </p>
          <p className="text-sm mt-2">
            Acesse a aba <strong>Anexos</strong> para fazer o upload.
          </p>
        </div>,
        { duration: 6000 },
      );
      visitedTabs.current.add('anexos');
      setActiveTab('anexos');
      return;
    }

    const semComissao =
      !cotacaoAtual?.percentualComissao ||
      Number(cotacaoAtual.percentualComissao) <= 0;
    if (semComissao) {
      setShowSemComissaoConfirm(true);
      return;
    }

    setConfirmVigenciaInicio('');
    setConfirmVigenciaFim('');
    setShowConfirmDialog(true);
  };

  const handleConfirmarVenda = () => {
    if (!confirmVigenciaInicio || !confirmVigenciaFim) {
      toast.error('Informe as datas de vigência da nova apólice.');
      return;
    }
    if (confirmVigenciaFim <= confirmVigenciaInicio) {
      toast.error('A data de fim da vigência deve ser posterior à data de início.');
      return;
    }
    confirmarVenda(
      { cotacaoId: cotacao.id, vigenciaInicio: confirmVigenciaInicio, vigenciaFim: confirmVigenciaFim },
      {
        onSuccess: () => {
          toast.success('Venda confirmada com sucesso!');
          setShowConfirmDialog(false);
          onClose();
          if (onVendaConfirmada) {
            onVendaConfirmada();
          }
        },
        onError: (error: unknown) => {
          toast.error(handleApiError(error));
        },
      },
    );
  };

  const handleReenviarParaAprovacao = () => {
    const docId = cotacaoEfetiva.documentoVendaIdDoc;
    if (!docId) {
      toast.error('ID do documento de venda não encontrado');
      return;
    }
    solicitarValidacaoCadastro(docId, {
      onSuccess: () => {
        toast.success('Reenviado para aprovação do cadastro!');
        onClose();
        if (onVendaConfirmada) onVendaConfirmada();
      },
      onError: (error: unknown) => {
        toast.error(handleApiError(error));
      },
    });
  };

  const showVendaActions =
    mode === 'view' && cotacao.status === 'EM_ELABORACAO';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        if (pendingComentario.trim() && !window.confirm('Há um comentário não enviado. Descartar e fechar?')) return;
        setPendingComentario('');
        onClose();
      }
    }}>
      <DialogContent
        className="max-w-6xl! p-0 h-[90vh] gap-0"
        style={{ width: '95vw' }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            {mode === 'edit' ? 'Editar Cotação' : 'Detalhes da Cotação'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? `Cotação ${cotacao.numero || cotacao.numeroCotacao || ''} - ${nomeCliente}`
              : `Visualização completa da cotação ${cotacao.numero || cotacao.numeroCotacao || ''}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-full overflow-hidden">
          {/* Sidebar */}
          <CotacaoDialogSidebar
            cotacao={cotacaoEfetiva}
            mode={mode}
            premioLiquido={premioLiquidoSidebar}
            percentualComissao={percentualComissaoSidebar}
            valorComissao={valorComissaoSidebar}
            negocioCorretora={negocioCorretoraSidebar}
            onNegocioCorretoraChange={handleNegocioCorretoraChange}
            onSalvar={() => form.handleSubmit(handleSubmit)()}
            isSalvando={isLoading}
            onConfirmarVenda={cotacaoEfetiva.dataRejeicaoCadastroDoc ? handleReenviarParaAprovacao : handleTentarConfirmarVenda}
            isReenviando={cotacaoEfetiva.dataRejeicaoCadastroDoc ? isSolicitando : undefined}
            onMarcarPerdida={() => setShowPerdidaDialog(true)}
            onReabrir={hasPermission('vendas:editar_todos_documentos') ? () => {
              reabrirCotacao(cotacaoEfetiva.id, {
                onSuccess: () => {
                  toast.success('Cotação reaberta com sucesso');
                  onClose();
                },
                onError: (err: any) => handleApiError(err),
              });
            } : undefined}
            isReabrindo={isReabrindo}
            onSwitchToEdit={onSwitchToEdit}
            onVincularCliente={(clienteId) => {
              updateQuote(
                { id: cotacaoEfetiva.id, data: { clienteId } },
                {
                  onSuccess: () => toast.success('Cliente vinculado com sucesso'),
                  onError: (err: any) => toast.error(handleApiError(err)),
                },
              );
            }}
            isVinculando={isVinculando}
            onClose={onClose}
          />

          {/* Área principal */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-6 pt-6 pb-4 border-b shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="flex items-center gap-3 text-2xl font-semibold">
                    <div className="p-2 rounded-lg bg-primary/10">
                      {mode === 'edit' ? (
                        <Edit className="size-6 text-primary" />
                      ) : (
                        <Eye className="size-6 text-primary" />
                      )}
                    </div>
                    {mode === 'edit'
                      ? 'Editar Cotação'
                      : 'Detalhes da Cotação'}
                  </h2>
                  <p className="mt-2 text-base text-muted-foreground">
                    {mode === 'edit'
                      ? `Cotação ${cotacao.numero || cotacao.numeroCotacao || ''} - ${nomeCliente}`
                      : `Visualização completa da cotação ${cotacao.numero || cotacao.numeroCotacao || ''}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs font-semibold',
                      cotacaoAtual?.situacao === 'RENOVACAO'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-green-500 text-green-600 dark:text-green-400',
                    )}
                  >
                    {cotacaoAtual?.situacao === 'RENOVACAO'
                      ? 'Renovação'
                      : 'Novo Seguro'}
                  </Badge>
                  {cotacao.origem === 'RENOVACAO_PENDENTE' && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/20">
                      <RefreshCw className="size-3" />
                      Renovação Pendente
                    </span>
                  )}
                  {getStatusBadge(cotacao.status)}
                </div>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(tab) => {
                visitedTabs.current.add(tab);
                setActiveTab(tab);
              }}
              className="flex-1 flex flex-col min-h-0"
            >
              <TabsList className="mx-6 mt-2 w-fit">
                <TabsTrigger value="dados" className="gap-2">
                  <FileText className="size-4" />
                  Dados da Cotação
                </TabsTrigger>
                <TabsTrigger value="anexos" className="gap-2">
                  <Package className="size-4" />
                  Anexos
                  {mode === 'view' &&
                    cotacao.status === 'EM_ELABORACAO' &&
                    (!anexos || anexos.length === 0) && (
                      <span className="ml-1 text-xs text-red-500">*</span>
                    )}
                </TabsTrigger>
                <TabsTrigger value="comentarios" className="gap-2">
                  <MessageSquare className="size-4" />
                  Comentários
                  {comentarios.length > 0 && (
                    <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5 font-medium">
                      {comentarios.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="dados"
                className="mt-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
                forceMount
              >
                <div className="h-full overflow-y-auto px-6 py-4">
                  {showDadosSkeleton ? (
                    <DadosTabSkeleton />
                  ) : mode === 'edit' ? (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleSubmit)}>
                        <CotacaoDadosTab
                          mode="edit"
                          cotacaoAtual={cotacaoEfetiva}
                          form={form}
                          produtos={produtos}
                          seguradoras={seguradoras}
                          usuarios={usuarios}
                          resolverComissao={resolverComissao}
                          resolverComissaoEdit={resolverComissao}
                          vendedorIdAtual={vendedorIdAtual}
                          vendedorIdForm={vendedorIdWatch}
                        />
                      </form>
                    </Form>
                  ) : (
                    <CotacaoDadosTab
                      mode="view"
                      cotacaoAtual={cotacaoEfetiva}
                      usuarios={usuarios}
                      resolverComissao={resolverComissao}
                      vendedorIdAtual={vendedorIdAtual}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent
                value="anexos"
                className="mt-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
                forceMount
              >
                <div className="h-full overflow-y-auto px-6 py-4">
                  {isLoadingAnexos ? (
                    <AnexosTabSkeleton />
                  ) : (
                    <AnexosTab
                      entidade="cotacao"
                      entidadeId={cotacao.id}
                      isActive={activeTab === 'anexos'}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent
                value="comentarios"
                className="mt-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
                forceMount
              >
                <div className="px-6 py-4 h-full">
                  {loadingComentarios ? (
                    <ComentariosTabSkeleton />
                  ) : (
                  <ComentariosPanel
                    comentarios={comentarios as any}
                    isLoading={loadingComentarios}
                    canAdd={mode === 'edit'}
                    onAdd={(texto, parentId) =>
                      adicionarComentario({
                        cotacaoId: cotacao.id,
                        texto,
                        parentId,
                      })
                    }
                    isSending={enviandoComentario}
                    onPendingTextChange={setPendingComentario}
                  />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>

      {/* Dialog de Confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-green-600" />
              Confirmar Venda
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Você está prestes a confirmar esta venda. Esta ação irá:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>
                    Criar um documento de venda com status{' '}
                    <strong>Aguardando Cadastro</strong>
                  </li>
                  <li>
                    Marcar esta cotação como <strong>Convertida</strong>
                  </li>
                  <li>Enviar a venda para o setor de cadastro processar</li>
                </ul>
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Vigência da nova apólice
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Início *</Label>
                      <DateInput
                        value={confirmVigenciaInicio}
                        onChange={setConfirmVigenciaInicio}
                        showQuickSelect={false}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Fim *</Label>
                      <DateInput
                        value={confirmVigenciaFim}
                        onChange={setConfirmVigenciaFim}
                        quickSelectLabel="+1 Ano"
                        quickSelectBaseDate={confirmVigenciaInicio}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-sm font-semibold mt-2">Deseja continuar?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isConfirmandoVenda}>
              Cancelar
            </AlertDialogCancel>
            <Button
              onClick={handleConfirmarVenda}
              disabled={
                isConfirmandoVenda ||
                !confirmVigenciaInicio ||
                !confirmVigenciaFim
              }
              className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
            >
              {isConfirmandoVenda ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Confirmando...
                </>
              ) : (
                'Sim, Confirmar Venda'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Marcar como Perdida */}
      <AlertDialog open={showPerdidaDialog} onOpenChange={setShowPerdidaDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Flag className="size-4 text-destructive" />
              Marcar Cotação como Perdida
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Registre o motivo da perda desta cotação para análise futura.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="motivo-perda">Motivo da Perda *</Label>
                  <Select value={motivoPerda} onValueChange={setMotivoPerda}>
                    <SelectTrigger id="motivo-perda">
                      <SelectValue placeholder="Selecione o motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Preço muito alto">
                        Preço muito alto
                      </SelectItem>
                      <SelectItem value="Prazo inadequado">
                        Prazo inadequado
                      </SelectItem>
                      <SelectItem value="Perdeu para concorrente">
                        Perdeu para concorrente
                      </SelectItem>
                      <SelectItem value="Cliente desistiu">
                        Cliente desistiu
                      </SelectItem>
                      <SelectItem value="Outro motivo">Outro motivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {motivoPerda === 'Perdeu para concorrente' && (
                  <div className="space-y-2">
                    <Label htmlFor="concorrente">Concorrente que Ganhou</Label>
                    <Input
                      id="concorrente"
                      type="text"
                      value={concorrenteGanhou}
                      onChange={(e) => setConcorrenteGanhou(e.target.value)}
                      placeholder="Nome do concorrente"
                      maxLength={255}
                      className="h-9"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="detalhes">Detalhes Adicionais</Label>
                  <Textarea
                    id="detalhes"
                    value={detalhesPerda}
                    onChange={(e) => setDetalhesPerda(e.target.value)}
                    placeholder="Descreva mais detalhes sobre a perda..."
                    maxLength={1000}
                    rows={4}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isMarcandoPerdida}
              onClick={() => {
                setMotivoPerda('');
                setConcorrenteGanhou('');
                setDetalhesPerda('');
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarcarPerdida}
              disabled={isMarcandoPerdida || !motivoPerda}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isMarcandoPerdida ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Marcando...
                </>
              ) : (
                'Marcar como Perdida'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de venda sem comissão */}
      <AlertDialog
        open={showSemComissaoConfirm}
        onOpenChange={setShowSemComissaoConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <svg
                className="size-5 text-amber-500"
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
              Confirmar venda sem comissão?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta cotação não possui percentual de comissão configurado.
              Nenhum lançamento de comissão será gerado para os vendedores.
              Deseja continuar mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowSemComissaoConfirm(false);
                setConfirmVigenciaInicio('');
                setConfirmVigenciaFim('');
                setShowConfirmDialog(true);
              }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Confirmar sem comissão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!showVendaActions && null}
    </Dialog>
  );
}
