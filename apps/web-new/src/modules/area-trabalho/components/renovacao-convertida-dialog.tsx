
import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  FileText,
  MessageSquare,
  Package,
  RefreshCw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/core/ui/dialog';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Separator } from '@/core/ui/separator';
import { Skeleton } from '@/core/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import type { RenovacaoPlanilha } from '@/types/area-trabalho';
import { useComentariosRenovacao } from '../http';
import { ComentariosPanel } from './comentarios-panel';
import { AnexoList } from '@/modules/anexos/components';
import { formatDateBR } from '@/core/utils/date-utils';

function fmt(v: string | number | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtPct(v: string | number | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return '—';
  return `${n.toFixed(2)}%`;
}

interface RenovacaoConvertidaDialogProps {
  renovacao: RenovacaoPlanilha | null;
  open: boolean;
  onClose: () => void;
}

export function RenovacaoConvertidaDialog({
  renovacao,
  open,
  onClose,
}: RenovacaoConvertidaDialogProps) {
  const [activeTab, setActiveTab] = useState('informacoes');
  const visitedTabs = useRef<Set<string>>(new Set(['informacoes']));

  useEffect(() => {
    if (open) {
      setActiveTab('informacoes');
      visitedTabs.current = new Set(['informacoes']);
    }
  }, [open]);

  const { data: comentarios = [], isLoading: loadingComentarios } =
    useComentariosRenovacao(open ? (renovacao?.id ?? null) : null);

  if (!renovacao) return null;

  const clienteRaw = renovacao.documentoVendaAnterior?.cliente ?? renovacao.cliente;
  const nomeCliente =
    clienteRaw?.tipoPessoa === 'PF'
      ? (clienteRaw as any).nome ?? '—'
      : ((clienteRaw as any).razaoSocial || (clienteRaw as any).nomeFantasia) ?? '—';

  const docAnterior = renovacao.documentoVendaAnterior;
  const docNovo = renovacao.documentoVendaNovo;

  const aprovadoPor = docNovo?.aprovadoPor;
  const dataAprovacao = docNovo?.dataAprovacaoCadastro;

  const produto =
    docAnterior?.produto?.nomeProduto ??
    renovacao.produtoDescricao ??
    renovacao.itemDescricao ??
    '—';

  const seguradora =
    docAnterior?.seguradoraParceira?.nomeFantasia ??
    docAnterior?.seguradoraParceira?.razaoSocial ??
    renovacao.seguradoraAnterior ??
    null;

  const premioNovo = docNovo?.premioLiquido ?? renovacao.premioNovo;
  const pctComissaoNovo = docNovo?.percentualComissao ?? renovacao.percentualComissaoNovo;
  const valorComissaoNovo = docNovo?.valorComissao ?? renovacao.valorComissaoNovo;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="max-w-5xl! p-0 h-[90vh] gap-0"
        style={{ width: '95vw' }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Renovação Convertida</DialogTitle>
          <DialogDescription>
            Detalhes da renovação convertida para {nomeCliente}
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-full overflow-hidden">
          {/* Sidebar */}
          <aside className="w-[280px] shrink-0 border-r bg-muted/30 flex flex-col h-full">
            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              <div>
                <p className="font-bold text-xl leading-tight break-words">
                  {nomeCliente}
                </p>
                <p className="text-sm text-muted-foreground">
                  {clienteRaw?.tipoPessoa === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                </p>
              </div>

              {renovacao.vendedor && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Vendedor
                  </p>
                  <p className="text-sm font-medium">{renovacao.vendedor.nome}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Produto
                </p>
                <p className="text-sm font-semibold">{produto}</p>
              </div>

              {seguradora && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Seguradora
                  </p>
                  <p className="text-sm font-medium">{seguradora}</p>
                </div>
              )}

              {premioNovo && (
                <div className="rounded-lg border bg-card p-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Prêmio Novo</p>
                    <p className="text-2xl font-bold">{fmt(premioNovo)}</p>
                  </div>
                  {pctComissaoNovo && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground">Comissão</p>
                        <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                          {fmtPct(pctComissaoNovo)}
                          {valorComissaoNovo && (
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                              · {fmt(valorComissaoNovo)}
                            </span>
                          )}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {aprovadoPor && (
                <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-green-600 dark:text-green-400 shrink-0" />
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">
                      Aprovado por
                    </p>
                  </div>
                  <p className="text-sm font-bold text-green-800 dark:text-green-300">
                    {aprovadoPor.nome}
                  </p>
                  {dataAprovacao && (
                    <p className="text-xs text-green-600 dark:text-green-500">
                      {formatDateBR(dataAprovacao)}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t shrink-0">
              <Button variant="outline" className="w-full" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-6 pt-6 pb-4 border-b shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="flex items-center gap-3 text-2xl font-semibold">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <RefreshCw className="size-6 text-green-600 dark:text-green-400" />
                    </div>
                    Renovação Convertida
                  </h2>
                  <p className="mt-2 text-base text-muted-foreground">
                    {nomeCliente} · {produto}
                  </p>
                </div>
                <Badge className="shrink-0 bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 border-0">
                  Convertido
                </Badge>
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
                <TabsTrigger value="informacoes" className="gap-2">
                  <FileText className="size-4" />
                  Informações
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
                <TabsTrigger value="anexos" className="gap-2">
                  <Package className="size-4" />
                  Anexos
                </TabsTrigger>
              </TabsList>

              {/* Informações */}
              <TabsContent
                value="informacoes"
                className="mt-0 flex-1 overflow-y-auto data-[state=inactive]:hidden"
                forceMount
              >
                <div className="px-6 py-4 space-y-6">
                  {docAnterior && (
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 pl-3 border-l-4 border-slate-400 py-0.5">
                        <FileText className="size-4 text-muted-foreground" />
                        <h3 className="font-semibold text-sm text-muted-foreground">
                          Apólice Anterior
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-4 pl-1">
                        {docAnterior.numeroApoliceExterna && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                              Número da Apólice
                            </p>
                            <p className="text-sm font-medium font-mono">
                              {docAnterior.numeroApoliceExterna}
                            </p>
                          </div>
                        )}
                        {(docAnterior.vigenciaInicio || docAnterior.vigenciaFim) && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                              Vigência Anterior
                            </p>
                            <p className="text-sm font-medium">
                              {docAnterior.vigenciaInicio
                                ? formatDateBR(docAnterior.vigenciaInicio)
                                : '—'}
                              {docAnterior.vigenciaFim
                                ? ` – ${formatDateBR(docAnterior.vigenciaFim)}`
                                : ''}
                            </p>
                          </div>
                        )}
                        {docAnterior.premioLiquido && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                              Prêmio Anterior
                            </p>
                            <p className="text-sm font-semibold">
                              {fmt(docAnterior.premioLiquido)}
                            </p>
                          </div>
                        )}
                        {docAnterior.percentualComissao && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                              Comissão Anterior
                            </p>
                            <p className="text-sm font-medium">
                              {fmtPct(docAnterior.percentualComissao)}
                              {docAnterior.valorComissao && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  · {fmt(docAnterior.valorComissao)}
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {docAnterior && docNovo && (
                    <div className="border-t border-dashed border-muted-foreground/20" />
                  )}

                  {docNovo && (
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 pl-3 border-l-4 border-green-500 py-0.5">
                        <FileText className="size-4 text-green-600 dark:text-green-400" />
                        <h3 className="font-semibold text-sm text-green-600 dark:text-green-400">
                          Documento Novo
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-4 pl-1">
                        {docNovo.numeroApoliceExterna && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                              Nova Apólice
                            </p>
                            <p className="text-sm font-medium font-mono">
                              {docNovo.numeroApoliceExterna}
                            </p>
                          </div>
                        )}
                        {(docNovo.vigenciaInicio || renovacao.novaVigenciaInicio) && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                              Nova Vigência
                            </p>
                            <p className="text-sm font-medium">
                              {formatDateBR(
                                docNovo.vigenciaInicio ?? renovacao.novaVigenciaInicio ?? '',
                              )}
                              {(docNovo.vigenciaFim || renovacao.novaVigenciaFim) && (
                                <>
                                  {' – '}
                                  {formatDateBR(
                                    docNovo.vigenciaFim ?? renovacao.novaVigenciaFim ?? '',
                                  )}
                                </>
                              )}
                            </p>
                          </div>
                        )}
                        {premioNovo && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                              Prêmio Novo
                            </p>
                            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                              {fmt(premioNovo)}
                            </p>
                          </div>
                        )}
                        {pctComissaoNovo && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                              Comissão Nova
                            </p>
                            <p className="text-sm font-medium text-green-600 dark:text-green-400">
                              {fmtPct(pctComissaoNovo)}
                              {valorComissaoNovo && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  · {fmt(valorComissaoNovo)}
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                        {aprovadoPor && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                              Aprovado por
                            </p>
                            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                              {aprovadoPor.nome}
                            </p>
                            {dataAprovacao && (
                              <p className="text-xs text-muted-foreground">
                                {formatDateBR(dataAprovacao)}
                              </p>
                            )}
                          </div>
                        )}
                        {docNovo.dataSolicitacaoCadastro && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                              Solicitado em
                            </p>
                            <p className="text-sm font-medium">
                              {formatDateBR(docNovo.dataSolicitacaoCadastro)}
                            </p>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {renovacao.observacoes && (
                    <>
                      <div className="border-t border-dashed border-muted-foreground/20" />
                      <section>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
                          Observações
                        </p>
                        <p className="text-sm">{renovacao.observacoes}</p>
                      </section>
                    </>
                  )}
                </div>
              </TabsContent>

              {/* Comentários */}
              <TabsContent
                value="comentarios"
                className="mt-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
                forceMount
              >
                <div className="px-6 py-4 h-full">
                  {loadingComentarios ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex gap-3">
                          <Skeleton className="size-8 rounded-full shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-4 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ComentariosPanel
                      comentarios={comentarios as any}
                      isLoading={loadingComentarios}
                      canAdd={false}
                      onAdd={() => {}}
                      isSending={false}
                    />
                  )}
                </div>
              </TabsContent>

              {/* Anexos */}
              <TabsContent
                value="anexos"
                className="mt-0 flex-1 overflow-y-auto data-[state=inactive]:hidden"
                forceMount
              >
                <div className="px-6 py-4 space-y-2">
                  <h3 className="text-sm font-semibold">Arquivos Anexados</h3>
                  {visitedTabs.current.has('anexos') && (
                    <AnexoList entidade="renovacao" entidadeId={renovacao.id} />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
