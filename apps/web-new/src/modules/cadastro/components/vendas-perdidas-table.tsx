
import { useState } from 'react';
import {
  FileX,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/ui/table';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/core/ui/tooltip';
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
import type { DocumentoVenda } from '@/types/documento-venda';
import { DocumentoVendaDialog } from './documento-venda-dialog';
import {
  useConfirmarPerda,
  useRejeitarPerda,
} from '@/modules/documentos-venda/http';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';

interface VendasPerdidasTableProps {
  vendas: DocumentoVenda[];
}

export function VendasPerdidasTable({ vendas }: VendasPerdidasTableProps) {
  const [selectedVenda, setSelectedVenda] = useState<DocumentoVenda | null>(
    null,
  );
  const [detalhesDialogOpen, setDetalhesDialogOpen] = useState(false);
  const [confirmarPerdaOpen, setConfirmarPerdaOpen] = useState(false);
  const [rejeitarPerdaOpen, setRejeitarPerdaOpen] = useState(false);

  const confirmarPerda = useConfirmarPerda();
  const rejeitarPerda = useRejeitarPerda();

  const handleVerDetalhes = (venda: DocumentoVenda) => {
    setSelectedVenda(venda);
    setDetalhesDialogOpen(true);
  };

  const handleConfirmarPerda = (venda: DocumentoVenda) => {
    setSelectedVenda(venda);
    setConfirmarPerdaOpen(true);
  };

  const handleRejeitarPerda = (venda: DocumentoVenda) => {
    setSelectedVenda(venda);
    setRejeitarPerdaOpen(true);
  };

  const confirmarPerdaAction = () => {
    if (!selectedVenda) return;

    confirmarPerda.mutate(selectedVenda.id, {
      onSuccess: () => {
        toast.success('Perda confirmada com sucesso');
        setConfirmarPerdaOpen(false);
        setSelectedVenda(null);
      },
      onError: (error: unknown) => {
        toast.error(handleApiError(error));
      },
    });
  };

  const rejeitarPerdaAction = () => {
    if (!selectedVenda) return;

    rejeitarPerda.mutate(selectedVenda.id, {
      onSuccess: () => {
        toast.success(
          'Perda rejeitada. Documento voltou para Aguardando Cadastro',
        );
        setRejeitarPerdaOpen(false);
        setSelectedVenda(null);
      },
      onError: (error: unknown) => {
        toast.error(handleApiError(error));
      },
    });
  };

  // Filtrar apenas perdas que ainda não foram confirmadas
  const vendasPendentes = vendas.filter((v) => {
    const metadata = v.metadata as any;
    // Se aguardandoAprovacaoPerda é explicitamente false, não mostrar
    // Se não existe (undefined/null) ou é true, mostrar
    return metadata?.aguardandoAprovacaoPerda !== false;
  });

  if (vendasPendentes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileX className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">
          Nenhuma venda perdida aguardando aprovação
        </p>
        <p className="text-sm mt-1">
          As vendas marcadas como perdidas aparecerão aqui para aprovação
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: cards */}
      <div className="md:hidden space-y-2">
        {vendasPendentes.map((venda) => {
          const nomeCliente =
            venda.cliente.tipoPessoa === 'PF'
              ? venda.cliente.nome
              : venda.cliente.razaoSocial;
          return (
            <div
              key={venda.id}
              className="border border-border/50 rounded-lg p-3 bg-red-50/30 dark:bg-red-950/10"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{venda.numero}</span>
                  <Badge variant="destructive" className="shrink-0 max-w-[60%] truncate">
                    {venda.motivoPerda}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium text-sm truncate">{nomeCliente}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {venda.produto.nomeProduto}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {new Date(`${venda.vigenciaInicio}T12:00:00Z`).toLocaleDateString('pt-BR')}
                    {' → '}
                    {new Date(`${venda.vigenciaFim}T12:00:00Z`).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {venda.premioLiquido
                      ? venda.premioLiquido.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })
                      : '—'}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {venda.vendedor?.nome || 'Não atribuído'}
                  </span>
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleVerDetalhes(venda)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/30"
                      onClick={() => handleConfirmarPerda(venda)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      <span className="text-xs">Confirmar</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
                      onClick={() => handleRejeitarPerda(venda)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      <span className="text-xs">Rejeitar</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead>Prêmio Líquido</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendasPendentes.map((venda) => {
              const nomeCliente =
                venda.cliente.tipoPessoa === 'PF'
                  ? venda.cliente.nome
                  : venda.cliente.razaoSocial;

              return (
                <TableRow
                  key={venda.id}
                  className="bg-red-50/30 dark:bg-red-950/10"
                >
                  <TableCell className="font-medium whitespace-nowrap">
                    {venda.numero}
                  </TableCell>
                  <TableCell className="max-w-[180px]">
                    <p className="font-medium truncate" title={nomeCliente ?? undefined}>
                      {nomeCliente}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {venda.cliente.tipoPessoa === 'PF' ? 'PF' : 'PJ'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{venda.produto.nomeProduto}</p>
                    <p className="text-xs text-muted-foreground">
                      {venda.produto.tipoSeguro}
                    </p>
                  </TableCell>
                  <TableCell className="tabular-nums text-sm whitespace-nowrap">
                    <p>
                      {new Date(`${venda.vigenciaInicio}T12:00:00Z`).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      até{' '}
                      {new Date(`${venda.vigenciaFim}T12:00:00Z`).toLocaleDateString('pt-BR')}
                    </p>
                  </TableCell>
                  <TableCell className="tabular-nums font-medium whitespace-nowrap">
                    {venda.premioLiquido
                      ? venda.premioLiquido.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })
                      : <span className="font-normal text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive" className="w-fit text-xs">
                      {venda.motivoPerda}
                    </Badge>
                    {(venda.metadata as Record<string, unknown>)?.concorrenteGanhou ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        vs.{' '}
                        {String((venda.metadata as Record<string, unknown>).concorrenteGanhou)}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">
                    {venda.vendedor?.nome || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => handleVerDetalhes(venda)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ver detalhes</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/30"
                            onClick={() => handleConfirmarPerda(venda)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Confirmar perda</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
                            onClick={() => handleRejeitarPerda(venda)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Rejeitar perda</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <DocumentoVendaDialog
        documento={selectedVenda}
        open={detalhesDialogOpen}
        onClose={() => {
          setDetalhesDialogOpen(false);
          setSelectedVenda(null);
        }}
      />

      {/* Confirmar Perda */}
      <AlertDialog
        open={confirmarPerdaOpen}
        onOpenChange={setConfirmarPerdaOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Confirmar Perda de Venda
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div>
                  Você está confirmando que a venda{' '}
                  <strong>{selectedVenda?.numero}</strong> do cliente{' '}
                  <strong>
                    {selectedVenda?.cliente.tipoPessoa === 'PF'
                      ? selectedVenda?.cliente.nome
                      : selectedVenda?.cliente.razaoSocial}
                  </strong>{' '}
                  foi realmente perdida.
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-800 space-y-1">
                  <div className="text-sm font-medium text-red-900 dark:text-red-100">
                    Motivo: {selectedVenda?.motivoPerda}
                  </div>
                  {(selectedVenda?.metadata as Record<string, unknown>)
                    ?.concorrenteGanhou ? (
                    <div className="text-sm text-red-700 dark:text-red-300">
                      Concorrente:{' '}
                      {String(
                        (selectedVenda!.metadata as Record<string, unknown>)
                          ?.concorrenteGanhou,
                      )}
                    </div>
                  ) : null}
                  {(selectedVenda?.metadata as Record<string, unknown>)
                    ?.detalhesPerda ? (
                    <div className="text-sm text-red-600 dark:text-red-400">
                      {String(
                        (selectedVenda!.metadata as Record<string, unknown>)
                          ?.detalhesPerda,
                      )}
                    </div>
                  ) : null}
                </div>
                <div>
                  Após confirmar, esta venda será removida da lista de
                  pendências.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarPerdaAction}
              className="bg-red-600 hover:bg-red-700"
              disabled={confirmarPerda.isPending}
            >
              {confirmarPerda.isPending ? 'Confirmando...' : 'Confirmar Perda'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejeitar Perda */}
      <AlertDialog open={rejeitarPerdaOpen} onOpenChange={setRejeitarPerdaOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-blue-600" />
              Rejeitar Perda de Venda
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div>
                  Você está rejeitando a perda da venda{' '}
                  <strong>{selectedVenda?.numero}</strong>.
                </div>
                <div>
                  O documento voltará para <strong>Aguardando Cadastro</strong>{' '}
                  para que possa ser processado normalmente.
                </div>
                <div>
                  Use esta opção se acredita que a venda não foi realmente
                  perdida ou se há chances de reverter a situação.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={rejeitarPerdaAction}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={rejeitarPerda.isPending}
            >
              {rejeitarPerda.isPending ? 'Rejeitando...' : 'Rejeitar Perda'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
