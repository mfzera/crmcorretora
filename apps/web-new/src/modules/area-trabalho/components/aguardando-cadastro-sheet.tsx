
import { useState } from 'react';
import { Clock, User, Building2, Shield, FileText, UserCircle, XCircle, AlertTriangle, RefreshCw, CheckCircle2, History } from 'lucide-react';
import { EmptyState } from '@/core/components/shared';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/core/ui/sheet';
import { Badge } from '@/core/ui/badge';
import { Separator } from '@/core/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { useCadastroLogs } from '../http';
import { usePermissions } from '@/core/hooks/use-permissions';

interface AguardandoCadastroSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendasDiretas: any[];
  endossos: any[];
  endossosRecusados?: any[];
  onVerDocumento?: (doc: any) => void;
  onVerEndosso?: (endosso: any) => void;
}

function getNomeCliente(cliente: any): string {
  if (!cliente) return '';
  return cliente.tipoPessoa === 'PF'
    ? cliente.nome || ''
    : cliente.nomeFantasia || cliente.razaoSocial || cliente.nome || '';
}

function ClienteIcon({ isPessoaFisica }: { isPessoaFisica: boolean }) {
  return (
    <div className={`rounded-md p-1.5 flex-shrink-0 ${isPessoaFisica ? 'bg-blue-500/10' : 'bg-purple-500/10'}`}>
      {isPessoaFisica
        ? <User className="size-3 text-blue-600 dark:text-blue-400" />
        : <Building2 className="size-3 text-purple-600 dark:text-purple-400" />
      }
    </div>
  );
}

function StatusFooter({ reprovado, motivoRejeicao, rejeitadoPorNome }: {
  reprovado?: boolean;
  motivoRejeicao?: string | null;
  rejeitadoPorNome?: string | null;
}) {
  if (reprovado) {
    return (
      <div className="border-t border-red-200/50 dark:border-red-800/50 bg-red-500/10 px-4 py-2.5 space-y-1">
        <div className="flex items-center gap-1.5">
          <XCircle className="size-3 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-red-700 dark:text-red-400">
            Cadastro reprovado
          </span>
          {rejeitadoPorNome && (
            <span className="text-xs text-red-500 dark:text-red-500 ml-auto">
              por {rejeitadoPorNome}
            </span>
          )}
        </div>
        {motivoRejeicao && (
          <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed pl-4.5">
            {motivoRejeicao}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="border-t border-border/30 bg-amber-500/10 px-4 py-2.5 flex items-center gap-1.5">
      <Clock className="size-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
        Aguardando aprovação de cadastro
      </span>
    </div>
  );
}

function SectionHeader({ icon: Icon, label, count }: { icon: React.ComponentType<{ className?: string }>; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <Badge variant="secondary" className="text-xs h-4 px-1.5">
        {count}
      </Badge>
    </div>
  );
}

function fmtRelativo(date: string | null | undefined): string {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function LogItem({ evento }: { evento: any }) {
  const aprovado = evento.tipoEvento === 'APROVACAO_CADASTRO';
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`rounded-full p-1.5 flex-shrink-0 mt-0.5 ${aprovado ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          {aprovado
            ? <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
            : <XCircle className="size-3 text-red-600 dark:text-red-400" />
          }
        </div>
        <div className="w-px flex-1 bg-border/50 mt-1" />
      </div>
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight truncate">
              {evento.clienteNome || '—'}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {evento.produtoNome || '—'}
              {evento.documentoNumero && (
                <span className="font-mono ml-1.5 text-[10px]">{evento.documentoNumero}</span>
              )}
            </p>
          </div>
          <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">
            {fmtRelativo(evento.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <Badge
            variant="outline"
            className={`text-[10px] h-4 px-1.5 ${aprovado ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400' : 'border-red-500/50 text-red-600 dark:text-red-400'}`}
          >
            {aprovado ? 'Confirmado' : 'Recusado'}
          </Badge>
          {evento.usuarioNome && (
            <span className="text-[10px] text-muted-foreground">por {evento.usuarioNome}</span>
          )}
        </div>
        {!aprovado && evento.motivoRejeicao && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1 leading-relaxed line-clamp-2">
            {evento.motivoRejeicao}
          </p>
        )}
      </div>
    </div>
  );
}

export function AguardandoCadastroSheet({
  open,
  onOpenChange,
  vendasDiretas,
  endossos,
  endossosRecusados = [],
  onVerDocumento,
  onVerEndosso,
}: AguardandoCadastroSheetProps) {
  const [tab, setTab] = useState<'pendencias' | 'historico'>('pendencias');
  const { hasAnyPermission } = usePermissions();
  const podVerHistorico = hasAnyPermission(['cadastro:acessar', 'cadastro:aprovar_venda', 'cadastro:rejeitar_venda', 'vendas:visualizar_todos_documentos']);
  const { data: logsResult, isLoading: loadingLogs } = useCadastroLogs(1, 20, open && podVerHistorico);
  const logs = logsResult?.data ?? [];

  const total = vendasDiretas.length + endossos.length;
  const totalReprovados =
    vendasDiretas.filter((d: any) => d.motivoRejeicao).length +
    endossosRecusados.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-500/10 p-2 ring-1 ring-amber-500/20">
              <Clock className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-base font-semibold">Pendências no Cadastro</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground font-normal">
                  {total} {total === 1 ? 'item aguardando processamento' : 'itens aguardando processamento'}
                </p>
                {totalReprovados > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1.5 gap-1">
                    <AlertTriangle className="size-2.5" />
                    {totalReprovados} reprovado{totalReprovados > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <Separator className="mb-3" />

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="pendencias" className="flex-1 gap-1.5 text-xs">
              <Clock className="size-3" />
              Pendências
              {total > 0 && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{total}</Badge>
              )}
            </TabsTrigger>
            {podVerHistorico && (
              <TabsTrigger value="historico" className="flex-1 gap-1.5 text-xs">
                <History className="size-3" />
                Histórico
                {logs.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{logs.length}</Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="pendencias">
            {total === 0 ? (
              <EmptyState icon={Clock} description="Nenhuma pendência no cadastro" />
            ) : (
              <div className="space-y-6 px-4 pb-6">

                {/* Seção: Vendas Diretas — reprovados primeiro */}
                {vendasDiretas.length > 0 && (
                  <div>
                    <SectionHeader icon={FileText} label="Vendas" count={vendasDiretas.length} />
                    <div className="space-y-3">
                      {[...vendasDiretas].sort((a: any, b: any) => (b.motivoRejeicao ? 1 : 0) - (a.motivoRejeicao ? 1 : 0)).map((doc: any) => {
                        const nomeCliente = getNomeCliente(doc.cliente);
                        const isPessoaFisica = doc.cliente?.tipoPessoa === 'PF';
                        const premio = doc.premioLiquido != null
                          ? Number(doc.premioLiquido).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : null;
                        const seguradora = doc.seguradoraParceira?.nomeFantasia || doc.seguradoraParceira?.razaoSocial || null;
                        const reprovado = !!doc.motivoRejeicao;
                        return (
                          <div
                            key={doc.id}
                            className={`rounded-lg border overflow-hidden transition-colors ${reprovado ? 'border-red-200 dark:border-red-800/60 bg-card' : 'border-border/50 bg-card'} ${onVerDocumento ? 'cursor-pointer hover:border-border' : ''}`}
                            onClick={() => onVerDocumento?.(doc)}
                          >
                            <div className="p-4">
                              <div className="flex items-start gap-2.5">
                                <ClienteIcon isPessoaFisica={isPessoaFisica} />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm leading-tight truncate">
                                    {nomeCliente}
                                  </p>
                                  <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                                    <Shield className="size-3" />
                                    <span className="truncate">{doc.produto?.nomeProduto || '-'}</span>
                                  </div>
                                  {(premio || seguradora) && (
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                      {premio && (
                                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                          {premio}
                                        </span>
                                      )}
                                      {seguradora && (
                                        <span className="text-xs text-muted-foreground truncate">
                                          {seguradora}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {doc.origemCotacao === 'RENOVACAO_PENDENTE' && (
                                    <span className="inline-flex items-center gap-1 mt-1.5 w-fit rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/20">
                                      <RefreshCw className="size-2.5" />
                                      Renovação Pendente
                                    </span>
                                  )}
                                </div>
                                {doc.numeroDocumento && (
                                  <span className="font-mono text-xs text-muted-foreground flex-shrink-0">
                                    {doc.numeroDocumento}
                                  </span>
                                )}
                              </div>
                            </div>
                            <StatusFooter
                              reprovado={reprovado}
                              motivoRejeicao={doc.motivoRejeicao}
                              rejeitadoPorNome={doc.rejeitadoPor?.nome}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Seção: Endossos pendentes */}
                {endossos.length > 0 && (
                  <div>
                    <SectionHeader icon={FileText} label="Endossos" count={endossos.length} />
                    <div className="space-y-3">
                      {endossos.map((endosso: any) => {
                        const nomeCliente = getNomeCliente(endosso.documentoVenda?.cliente);
                        const isPessoaFisica = endosso.documentoVenda?.cliente?.tipoPessoa === 'PF';
                        return (
                          <div key={endosso.id} className="rounded-lg border border-border/50 bg-card overflow-hidden">
                            <div className="p-4">
                              <div className="flex items-start gap-2.5 mb-2">
                                <ClienteIcon isPessoaFisica={isPessoaFisica} />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm leading-tight truncate">
                                    {nomeCliente}
                                  </p>
                                  <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                                    <Shield className="size-3" />
                                    <span className="truncate">
                                      {endosso.documentoVenda?.produto?.nomeProduto || '-'}
                                    </span>
                                  </div>
                                </div>
                                {endosso.numeroEndosso && (
                                  <span className="font-mono text-xs text-muted-foreground flex-shrink-0">
                                    {endosso.numeroEndosso}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1.5">
                                {endosso.vendedor?.nome && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <UserCircle className="size-3" />
                                    <span className="truncate">{endosso.vendedor.nome}</span>
                                  </div>
                                )}
                                {endosso.descricao && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 flex-1">
                                    {endosso.descricao}
                                  </p>
                                )}
                              </div>
                            </div>
                            <StatusFooter />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Seção: Endossos recusados */}
                {endossosRecusados.length > 0 && (
                  <div>
                    <SectionHeader icon={XCircle} label="Endossos Recusados" count={endossosRecusados.length} />
                    <div className="space-y-3">
                      {endossosRecusados.map((endosso: any) => {
                        const nomeCliente = getNomeCliente(endosso.documentoVenda?.cliente);
                        const isPessoaFisica = endosso.documentoVenda?.cliente?.tipoPessoa === 'PF';
                        return (
                          <div
                            key={endosso.id}
                            className={`rounded-lg border border-red-200 dark:border-red-800/60 bg-card overflow-hidden transition-colors ${onVerEndosso ? 'cursor-pointer hover:border-red-400 dark:hover:border-red-600' : ''}`}
                            onClick={() => onVerEndosso?.(endosso)}
                          >
                            <div className="p-4">
                              <div className="flex items-start gap-2.5 mb-2">
                                <ClienteIcon isPessoaFisica={isPessoaFisica} />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm leading-tight truncate">
                                    {nomeCliente}
                                  </p>
                                  <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                                    <Shield className="size-3" />
                                    <span className="truncate">
                                      {endosso.documentoVenda?.produto?.nomeProduto || '-'}
                                    </span>
                                  </div>
                                </div>
                                {endosso.numeroEndosso && (
                                  <span className="font-mono text-xs text-muted-foreground flex-shrink-0">
                                    {endosso.numeroEndosso}
                                  </span>
                                )}
                              </div>
                              {endosso.tipoEndosso && (
                                <p className="text-xs text-muted-foreground mb-1">
                                  {endosso.tipoEndosso.replace(/_/g, ' ')}
                                </p>
                              )}
                            </div>
                            <StatusFooter
                              reprovado
                              motivoRejeicao={endosso.motivoRecusa}
                              rejeitadoPorNome={null}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            )}
          </TabsContent>

          <TabsContent value="historico">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                Carregando histórico...
              </div>
            ) : logs.length === 0 ? (
              <EmptyState icon={History} description="Nenhum registro de cadastro ainda" />
            ) : (
              <div className="px-4 pb-6 pt-2">
                {logs.map((evento: any, i: number) => (
                  <div key={evento.id} className={i === logs.length - 1 ? '[&>div>div:last-child>div.w-px]:hidden' : ''}>
                    <LogItem evento={evento} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
