
import { useState } from 'react';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  Loader2,
  MessageSquare,
  Paperclip,
  FileText,
  History,
  AlertTriangle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/core/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Textarea } from '@/core/ui/textarea';
import { Label } from '@/core/ui/label';
import { Input } from '@/core/ui/input';
import { Separator } from '@/core/ui/separator';
import { ScrollArea } from '@/core/ui/scroll-area';
import { dayjs } from '@/core/utils/date-utils';
import { handleApiError } from '@/core/utils/handle-api-error';
import { usePermissions } from '@/core/hooks/use-permissions';
import { AnexosTab } from '@/modules/anexos/components';
import { ComentariosPanel } from '@/modules/area-trabalho/components/comentarios-panel';
import { useComentariosDocumentoVenda } from '@/modules/area-trabalho/http';
import type { Sinistro } from '@/types/sinistro';
import {
  STATUS_SINISTRO_LABELS,
  TIPO_SINISTRO_LABELS,
} from '@/types/sinistro';
import {
  useAprovarSinistro,
  useRecusarSinistro,
  usePagarSinistro,
  useHistoricoSinistro,
  useComentariosSinistro,
  useAdicionarComentarioSinistro,
} from '../http';

interface SinistroDetalheSheetProps {
  sinistro: Sinistro | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_COLORS: Record<string, string> = {
  ABERTO: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  EM_ANALISE: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400',
  AGUARDANDO_DOCUMENTOS: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400',
  APROVADO: 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400',
  RECUSADO: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
  PAGO: 'bg-teal-500/10 text-teal-600 border-teal-500/20 dark:text-teal-400',
  CANCELADO: 'bg-gray-500/10 text-gray-500 border-gray-500/20 dark:text-gray-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={STATUS_COLORS[status] ?? 'bg-gray-500/10 text-gray-500 border-gray-500/20'}
    >
      {STATUS_SINISTRO_LABELS[status as keyof typeof STATUS_SINISTRO_LABELS] ?? status}
    </Badge>
  );
}

function formatCurrency(value: string | number | null | undefined): string {
  if (!value) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function SinistroDetalheSheet({ sinistro, open, onOpenChange }: SinistroDetalheSheetProps) {
  const { hasPermission } = usePermissions();
  const podeAprovar = hasPermission('sinistros:aprovar');

  const [valorAprovado, setValorAprovado] = useState('');
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [obsAcao, setObsAcao] = useState('');
  const [acao, setAcao] = useState<'aprovar' | 'recusar' | 'pagar' | null>(null);
  const [activeTab, setActiveTab] = useState('dados');

  const aprovar = useAprovarSinistro();
  const recusar = useRecusarSinistro();
  const pagar = usePagarSinistro();
  const adicionarComentario = useAdicionarComentarioSinistro();
  const { data: historico = [] } = useHistoricoSinistro(open && sinistro ? sinistro.id : null);
  const { data: comentariosSinistro = [], isLoading: isLoadingComentarios } = useComentariosSinistro(open && sinistro ? sinistro.id : null);
  const { data: comentariosDocumento = [] } = useComentariosDocumentoVenda(open && sinistro ? sinistro.documentoVendaId : null);

  const todosComentarios = [...comentariosSinistro, ...comentariosDocumento].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  if (!sinistro) return null;

  const podeMoverParaAprovado = ['ABERTO', 'EM_ANALISE', 'AGUARDANDO_DOCUMENTOS'].includes(sinistro.status);
  const podePagar = sinistro.status === 'APROVADO';
  const isLoading = aprovar.isPending || recusar.isPending || pagar.isPending;

  async function handleAprovar() {
    if (!sinistro) return;
    try {
      await aprovar.mutateAsync({
        id: sinistro.id,
        data: {
          valorAprovado: valorAprovado ? parseFloat(valorAprovado) : undefined,
          observacao: obsAcao || undefined,
        },
      });
      toast.success('Sinistro aprovado');
      setAcao(null);
      setValorAprovado('');
      setObsAcao('');
    } catch (e) {
      toast.error(handleApiError(e));
    }
  }

  async function handleRecusar() {
    if (!sinistro || !motivoRecusa.trim()) return;
    try {
      await recusar.mutateAsync({ id: sinistro.id, data: { motivoRecusa } });
      toast.success('Sinistro recusado');
      setAcao(null);
      setMotivoRecusa('');
    } catch (e) {
      toast.error(handleApiError(e));
    }
  }

  async function handlePagar() {
    if (!sinistro) return;
    try {
      await pagar.mutateAsync({ id: sinistro.id, data: { observacao: obsAcao || undefined } });
      toast.success('Sinistro marcado como pago');
      setAcao(null);
      setObsAcao('');
    } catch (e) {
      toast.error(handleApiError(e));
    }
  }

  const nomeCliente = sinistro.documentoVenda?.cliente?.nome;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setAcao(null);
        onOpenChange(v);
      }}
    >
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

              <StatusBadge status={sinistro.status} />

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
              {podeAprovar && !acao && podeMoverParaAprovado && (
                <>
                  <Button
                    size="sm"
                    className="w-full gap-1.5 bg-green-600 hover:bg-green-700"
                    onClick={() => { setAcao('aprovar'); setActiveTab('dados'); }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-full gap-1.5"
                    onClick={() => { setAcao('recusar'); setActiveTab('dados'); }}
                  >
                    <XCircle className="h-3.5 w-3.5" /> Recusar
                  </Button>
                </>
              )}
              {podeAprovar && !acao && podePagar && (
                <Button
                  size="sm"
                  className="w-full gap-1.5 bg-teal-600 hover:bg-teal-700"
                  onClick={() => { setAcao('pagar'); setActiveTab('dados'); }}
                >
                  <CreditCard className="h-3.5 w-3.5" /> Registrar Pagamento
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </aside>

          {/* Main area */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-6 pt-6 pb-4 border-b shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-3 text-2xl font-semibold">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <AlertTriangle className="size-6 text-primary" />
                    </div>
                    Detalhes do Sinistro
                  </h2>
                  <p className="mt-2 text-base text-muted-foreground">
                    {sinistro.numeroSinistro}
                    {sinistro.numeroSinistroExterno && ` · ${sinistro.numeroSinistroExterno}`}
                  </p>
                </div>
              </div>
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
                  <div className="px-6 py-4 space-y-5">
                    {/* Alerta de recusa */}
                    {sinistro.motivoRecusa && (
                      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                        <p className="text-sm font-semibold text-red-600 mb-1">Motivo da recusa</p>
                        <p className="text-sm text-red-600/80">{sinistro.motivoRecusa}</p>
                      </div>
                    )}

                    {/* Descrição */}
                    <div className="rounded-lg border bg-card p-4 space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Descrição</p>
                      <p className="text-sm leading-relaxed">{sinistro.descricao}</p>
                    </div>

                    {/* Grid de informações */}
                    <div className="rounded-lg border bg-card p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        Informações
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Tipo</p>
                          <p className="font-medium">{TIPO_SINISTRO_LABELS[sinistro.tipoSinistro]}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <p className="font-medium">
                            {STATUS_SINISTRO_LABELS[sinistro.status]}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Data da ocorrência</p>
                          <p className="font-medium">
                            {dayjs(sinistro.dataOcorrencia).format('DD/MM/YYYY')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Data de abertura</p>
                          <p className="font-medium">
                            {dayjs(sinistro.dataAbertura).format('DD/MM/YYYY')}
                          </p>
                        </div>
                        {sinistro.solicitante && (
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">Solicitante</p>
                            <p className="font-medium">{sinistro.solicitante.nome}</p>
                          </div>
                        )}
                        {sinistro.aprovadoPor && (
                          <div>
                            <p className="text-xs text-muted-foreground">Aprovado por</p>
                            <p className="font-medium">{sinistro.aprovadoPor.nome}</p>
                          </div>
                        )}
                        {sinistro.dataAprovacao && (
                          <div>
                            <p className="text-xs text-muted-foreground">Data da aprovação</p>
                            <p className="font-medium">
                              {dayjs(sinistro.dataAprovacao).format('DD/MM/YYYY')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {sinistro.observacoes && (
                      <div className="rounded-lg border bg-card p-4 space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Observações</p>
                        <p className="text-sm">{sinistro.observacoes}</p>
                      </div>
                    )}

                    {/* Formulários de ação */}
                    {acao === 'aprovar' && (
                      <div className="rounded-lg border bg-card p-4 space-y-3">
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          Aprovar sinistro
                        </p>
                        <div className="space-y-1">
                          <Label className="text-xs">Valor aprovado (opcional)</Label>
                          <Input
                            type="number"
                            placeholder="R$ 0,00"
                            value={valorAprovado}
                            onChange={(e) => setValorAprovado(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Observação (opcional)</Label>
                          <Textarea
                            placeholder="Observação..."
                            value={obsAcao}
                            onChange={(e) => setObsAcao(e.target.value)}
                            className="text-sm min-h-[60px] resize-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleAprovar}
                            disabled={isLoading}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {isLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                            Confirmar aprovação
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setAcao(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}

                    {acao === 'recusar' && (
                      <div className="rounded-lg border bg-card p-4 space-y-3">
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-destructive" />
                          Recusar sinistro
                        </p>
                        <div className="space-y-1">
                          <Label className="text-xs">Motivo da recusa *</Label>
                          <Textarea
                            placeholder="Descreva o motivo..."
                            value={motivoRecusa}
                            onChange={(e) => setMotivoRecusa(e.target.value)}
                            className="text-sm min-h-[80px] resize-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleRecusar}
                            disabled={isLoading || !motivoRecusa.trim()}
                          >
                            {isLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                            Confirmar recusa
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setAcao(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}

                    {acao === 'pagar' && (
                      <div className="rounded-lg border bg-card p-4 space-y-3">
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-teal-600" />
                          Registrar pagamento
                        </p>
                        <div className="space-y-1">
                          <Label className="text-xs">Observação (opcional)</Label>
                          <Textarea
                            placeholder="Observação..."
                            value={obsAcao}
                            onChange={(e) => setObsAcao(e.target.value)}
                            className="text-sm min-h-[60px] resize-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handlePagar}
                            disabled={isLoading}
                            className="bg-teal-600 hover:bg-teal-700"
                          >
                            {isLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                            Confirmar pagamento
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setAcao(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
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
                    onAdd={(texto, parentId) => adicionarComentario.mutate({ sinistroId: sinistro.id, texto, parentId })}
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
