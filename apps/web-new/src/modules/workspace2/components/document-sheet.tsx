import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { dayjs } from '@/core/utils/date-utils';
import { AlertCircle, FileText, Paperclip, Pencil } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/core/ui/sheet';
import { Skeleton } from '@/core/ui/skeleton';
import { Button } from '@/core/ui/button';
import { ScrollArea } from '@/core/ui/scroll-area';
import { useDocumentoHistorico, useSolicitarValidacaoCadastro, areaTrabalhoKeys } from '@/modules/area-trabalho/http';
import { useDocumentoVenda } from '@/modules/documentos-venda/http';
import { DocumentoVendaDialog } from '@/modules/cadastro/components/documento-venda-dialog';
import { AnexoUploader, AnexoList } from '@/modules/anexos/components';
import { handleApiError } from '@/core/utils/handle-api-error';

type DocumentSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentoVendaId: string | null;
  clienteNome: string;
  produtoNome: string;
  documentoNumero: string | null;
  documentoStatus: string | null;
  motivoRejeicao: string | null;
  tentativasRejeicao: number | null;
  vendedorNome: string | null;
};

type HistoricoEntry = {
  id: string;
  tipoEvento: string;
  usuarioNome: string | null;
  descricao: string;
  statusAnterior: string | null;
  statusNovo: string | null;
  createdAt: string;
};

const EVENTO: Record<string, { label: string; cls: string }> = {
  CRIACAO:                    { label: 'Inclusão',               cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25' },
  ALTERACAO_STATUS:           { label: 'Status',                 cls: 'bg-muted text-muted-foreground border-border' },
  ALTERACAO_DADOS:            { label: 'Dados',                  cls: 'bg-muted text-muted-foreground border-border' },
  SOLICITACAO_CADASTRO:       { label: 'Sol. Cadastro',          cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25' },
  APROVACAO_CADASTRO:         { label: 'Cadastro Aprovado',      cls: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/25' },
  REJEICAO_CADASTRO:          { label: 'Cadastro Rejeitado',     cls: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25' },
  CONFIRMACAO_VENDA:          { label: 'Venda Confirmada',       cls: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/25' },
  CANCELAMENTO:               { label: 'Cancelamento',           cls: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25' },
  PERDA:                      { label: 'Perda',                  cls: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/25' },
  CONFIRMACAO_PERDA:          { label: 'Perda Confirmada',       cls: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/25' },
  REJEICAO_PERDA:             { label: 'Perda Rejeitada',        cls: 'bg-muted text-muted-foreground border-border' },
  ENDOSSO_CRIADO:             { label: 'Endosso',                cls: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/25' },
  ENDOSSO_APROVADO:           { label: 'Endosso Aprovado',       cls: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/25' },
  ENDOSSO_RECUSADO:           { label: 'Endosso Recusado',       cls: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25' },
  ANOTACAO:                   { label: 'Anotação',               cls: 'bg-muted text-muted-foreground border-border' },
  SOLICITACAO_EXCLUSAO:       { label: 'Sol. Exclusão',          cls: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/25' },
  EXCLUSAO_ACEITA:            { label: 'Exclusão Aceita',        cls: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25' },
  EXCLUSAO_RECUSADA:          { label: 'Exclusão Recusada',      cls: 'bg-muted text-muted-foreground border-border' },
  SOLICITACAO_TROCA_VENDEDOR: { label: 'Sol. Transferência',     cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25' },
  TROCA_VENDEDOR_APROVADA:    { label: 'Transferência Aprovada', cls: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/25' },
  TROCA_VENDEDOR_RECUSADA:    { label: 'Transferência Recusada', cls: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25' },
};

const DOC_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  VENDA_CONFIRMADA:    { label: 'Venda Confirmada',   cls: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/25' },
  AGUARDANDO_CADASTRO: { label: 'Aguard. Cadastro',   cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25' },
  ATIVO:               { label: 'Ativo',              cls: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/25' },
  CANCELADO:           { label: 'Cancelado',          cls: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25' },
  PERDIDO:             { label: 'Perdido',            cls: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/25' },
};

function EventoBadge({ tipo }: { tipo: string }) {
  const cfg = EVENTO[tipo] ?? { label: tipo, cls: 'bg-muted text-muted-foreground border-border' };
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium shrink-0 whitespace-nowrap ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export function DocumentSheet({
  open,
  onOpenChange,
  documentoVendaId,
  clienteNome,
  produtoNome,
  documentoNumero,
  documentoStatus,
  motivoRejeicao,
  tentativasRejeicao,
  vendedorNome,
}: DocumentSheetProps) {
  const queryClient = useQueryClient();
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const solicitarMutation = useSolicitarValidacaoCadastro();

  const { data: historico, isLoading, isError: historicoError } = useDocumentoHistorico(open ? documentoVendaId : null);
  // Prefetch do documento completo assim que o sheet abre (para o dialog abrir instantâneo)
  const { data: fullDoc, isError: docError } = useDocumentoVenda(open ? (documentoVendaId ?? '') : '');
  const semAcesso = historicoError || docError;

  const statusCfg = documentoStatus
    ? (DOC_STATUS_LABELS[documentoStatus] ?? { label: documentoStatus, cls: 'bg-muted text-muted-foreground border-border' })
    : null;
  const podeReenviar = documentoStatus === 'VENDA_CONFIRMADA';
  const statusFinal = documentoStatus === 'ATIVO' || documentoStatus === 'CANCELADO' || documentoStatus === 'PERDIDO';
  const podeVerAnexos = !!documentoVendaId && !statusFinal;

  const handleReenviar = async () => {
    if (!documentoVendaId) return;
    try {
      await solicitarMutation.mutateAsync(documentoVendaId);
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.all });
      toast.success('Reenviado para o cadastro com sucesso!');
      setDocDialogOpen(false);
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[480px] sm:max-w-[480px] flex flex-col p-0">
          <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="text-base font-semibold leading-tight truncate">{clienteNome}</SheetTitle>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">{produtoNome}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {documentoNumero && (
                  <span className="text-xs text-muted-foreground font-mono">#{documentoNumero}</span>
                )}
                {statusCfg && (
                  <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${statusCfg.cls}`}>
                    {statusCfg.label}
                  </span>
                )}
              </div>
            </div>

            {vendedorNome && (
              <p className="text-xs text-muted-foreground mt-1">Vendedor: {vendedorNome}</p>
            )}

            {motivoRejeicao && (
              <div className="mt-3 rounded-md bg-red-500/10 border border-red-500/25 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="size-3.5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-red-700 dark:text-red-400">
                      Motivo de rejeição
                      {tentativasRejeicao && tentativasRejeicao > 1 && (
                        <span className="ml-1.5 text-[10px] opacity-75">({tentativasRejeicao}ª tentativa)</span>
                      )}
                    </p>
                    <p className="text-xs text-red-700/80 dark:text-red-400/80 mt-0.5">{motivoRejeicao}</p>
                  </div>
                </div>
              </div>
            )}

            {podeReenviar && (
              <Button
                size="sm"
                className="mt-3 w-full gap-2"
                onClick={() => setDocDialogOpen(true)}
                disabled={!fullDoc}
              >
                <Pencil className="size-3.5" />
                {!fullDoc ? 'Carregando documento...' : motivoRejeicao ? 'Editar e Reenviar para Cadastro' : 'Abrir e Enviar para Cadastro'}
              </Button>
            )}
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-4 space-y-6">
              {podeVerAnexos && (
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Paperclip className="size-3" />
                    Documentos
                  </p>
                  {podeReenviar && (
                    <AnexoUploader
                      entidade="documento_venda"
                      entidadeId={documentoVendaId!}
                    />
                  )}
                  <div className={podeReenviar ? 'mt-3' : undefined}>
                    <AnexoList entidade="documento_venda" entidadeId={documentoVendaId!} />
                  </div>
                </div>
              )}

              <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-3">Histórico</p>

              {isLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="size-2 rounded-full mt-1.5 shrink-0" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && (!historico || historico.length === 0) && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <FileText className="size-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
                </div>
              )}

              {!isLoading && historico && historico.length > 0 && (
                <ol className="relative border-l border-border ml-1.5 space-y-0">
                  {(historico as HistoricoEntry[]).map((entry, idx) => (
                    <li key={entry.id} className="ml-4 pb-5 last:pb-0">
                      <span
                        className={`absolute -left-[5px] mt-1.5 size-2.5 rounded-full border-2 border-background ${
                          entry.tipoEvento === 'REJEICAO_CADASTRO'
                            ? 'bg-red-500'
                            : idx === 0
                            ? 'bg-primary'
                            : 'bg-muted-foreground/40'
                        }`}
                      />
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <EventoBadge tipo={entry.tipoEvento} />
                        <time className="text-[10px] text-muted-foreground">
                          {dayjs(entry.createdAt).format('DD/MM/YY HH:mm')}
                        </time>
                        {entry.usuarioNome && (
                          <span className="text-[10px] text-muted-foreground">· {entry.usuarioNome}</span>
                        )}
                      </div>
                      {entry.descricao && (
                        <p className={`text-xs leading-relaxed ${
                          entry.tipoEvento === 'REJEICAO_CADASTRO'
                            ? 'text-red-700 dark:text-red-400'
                            : 'text-muted-foreground'
                        }`}>
                          {entry.descricao}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <DocumentoVendaDialog
        documento={fullDoc ?? null}
        open={docDialogOpen}
        onClose={() => setDocDialogOpen(false)}
        onReenviarCadastro={handleReenviar}
        isReenviandoCadastro={solicitarMutation.isPending}
      />
    </>
  );
}
