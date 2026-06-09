
import { useState } from 'react';
import {
  FileCheck,
  Eye,
  Lock,
  Trash2,
  Loader2,
  MessageSquare,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/core/ui/tooltip';
import { Textarea } from '@/core/ui/textarea';
import { Label } from '@/core/ui/label';
import type { DocumentoVenda } from '@/types/documento-venda';
import { FinalizarCadastroDialog } from './finalizar-cadastro-dialog';
import { DocumentoVendaDialog } from './documento-venda-dialog';
import { ReprovarCadastroDialog } from './reprovar-cadastro-dialog';
import { useSolicitarExclusaoVenda } from '@/modules/documentos-venda/http';
import { usePermissions } from '@/core/hooks/use-permissions';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';

interface VendasPendentesTableProps {
  vendas: DocumentoVenda[];
}

export function VendasPendentesTable({ vendas }: VendasPendentesTableProps) {
  const [selectedVenda, setSelectedVenda] = useState<DocumentoVenda | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detalhesDialogOpen, setDetalhesDialogOpen] = useState(false);
  const [reprovarDialogOpen, setReprovarDialogOpen] = useState(false);
  const [exclusaoDialogOpen, setExclusaoDialogOpen] = useState(false);
  const [vendaParaExcluir, setVendaParaExcluir] = useState<DocumentoVenda | null>(null);
  const [motivoExclusao, setMotivoExclusao] = useState('');
  const solicitarExclusaoMutation = useSolicitarExclusaoVenda();
  const { hasPermission } = usePermissions();
  const podeAprovar = hasPermission('cadastro:aprovar_venda');
  const podeRejeitar = hasPermission('cadastro:rejeitar_venda');

  const handleVerDetalhes = (venda: DocumentoVenda) => {
    setSelectedVenda(venda);
    setDetalhesDialogOpen(true);
  };

  const handleReprovar = () => {
    setDetalhesDialogOpen(false);
    setReprovarDialogOpen(true);
  };

  const handleSolicitarExclusao = (e: React.MouseEvent, venda: DocumentoVenda) => {
    e.stopPropagation();
    setVendaParaExcluir(venda);
    setMotivoExclusao('');
    setExclusaoDialogOpen(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!vendaParaExcluir) return;
    try {
      await solicitarExclusaoMutation.mutateAsync({
        documentoId: vendaParaExcluir.id,
        motivo: motivoExclusao.trim() || undefined,
      });
      toast.success('Solicitação de exclusão enviada para aprovação');
      setExclusaoDialogOpen(false);
      setVendaParaExcluir(null);
      setMotivoExclusao('');
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  if (vendas.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Nenhuma venda aguardando cadastro</p>
        <p className="text-sm mt-1">
          As vendas aprovadas aparecerão aqui para cadastro
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: cards */}
      <div className="md:hidden space-y-2">
        {vendas.map((venda) => {
          const nomeCliente =
            venda.cliente.tipoPessoa === 'PF'
              ? venda.cliente.nome
              : venda.cliente.razaoSocial;
          const now = new Date();
          const isLocked =
            venda.lockedById && venda.lockExpiresAt
              ? new Date(venda.lockExpiresAt) > now
              : false;
          return (
            <div
              key={venda.id}
              className={`border border-border/50 rounded-lg p-3 cursor-pointer hover:bg-muted/30 transition-colors ${isLocked ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}`}
              onClick={() => handleVerDetalhes(venda)}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-medium text-sm truncate">{venda.numero}</span>
                    {(venda.metadata as any)?.renovacaoId && (
                      <Badge variant="outline" className="text-[10px] font-normal shrink-0">
                        Renovação
                      </Badge>
                    )}
                  </div>
                  {isLocked && (
                    <Badge
                      variant="outline"
                      className="gap-1 bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-[10px] shrink-0"
                    >
                      <Lock className="h-3 w-3" />
                      <span className="truncate max-w-[80px]">{venda.lockedBy?.nome || 'Em edição'}</span>
                    </Badge>
                  )}
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
                {venda.ultimoComentario && (
                  <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                    <MessageSquare className="size-3 shrink-0" />
                    <span className="font-medium">{venda.ultimoComentario.autor.nome}:</span>
                    <span className="truncate">{venda.ultimoComentario.texto}</span>
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  {venda.status === 'AGUARDANDO_CADASTRO' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => handleSolicitarExclusao(e, venda)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVerDetalhes(venda);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </Button>
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
              <TableHead>Vendedor</TableHead>
              <TableHead>Último comentário</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendas.map((venda) => {
              const nomeCliente =
                venda.cliente.tipoPessoa === 'PF'
                  ? venda.cliente.nome
                  : venda.cliente.razaoSocial;

              // Verificar se o lock ainda está ativo
              const now = new Date();
              const isLocked =
                venda.lockedById && venda.lockExpiresAt
                  ? new Date(venda.lockExpiresAt) > now
                  : false;

              return (
                <TableRow
                  key={venda.id}
                  className={`cursor-pointer hover:bg-muted/50 ${isLocked ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}`}
                  onClick={() => handleVerDetalhes(venda)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {venda.numero}
                      {(venda.metadata as any)?.renovacaoId && (
                        <Badge variant="outline" className="text-xs font-normal">
                          Renovação
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{nomeCliente}</p>
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
                  <TableCell className="tabular-nums">
                    <p className="text-sm">
                      {new Date(`${venda.vigenciaInicio}T12:00:00Z`).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      até{' '}
                      {new Date(`${venda.vigenciaFim}T12:00:00Z`).toLocaleDateString('pt-BR')}
                    </p>
                  </TableCell>
                  <TableCell className="tabular-nums font-medium">
                    {venda.premioLiquido
                      ? venda.premioLiquido.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })
                      : <span className="text-muted-foreground font-normal">—</span>}
                  </TableCell>
                  <TableCell>
                    {venda.vendedor?.nome || 'Não atribuído'}
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    {venda.ultimoComentario ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-default space-y-0.5">
                            <p className="truncate text-xs font-medium text-foreground">
                              {venda.ultimoComentario.autor.nome}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {venda.ultimoComentario.texto}
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <p className="font-medium mb-1">{venda.ultimoComentario.autor.nome}</p>
                          <p className="whitespace-pre-wrap">{venda.ultimoComentario.texto}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {new Date(venda.ultimoComentario.createdAt).toLocaleString('pt-BR', {
                              day: '2-digit', month: '2-digit', year: '2-digit',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isLocked && (
                        <Badge
                          variant="outline"
                          className="gap-1 bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                        >
                          <Lock className="h-3 w-3" />
                          {venda.lockedBy?.nome || 'Em edição'}
                        </Badge>
                      )}
                      {venda.status === 'AGUARDANDO_CADASTRO' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={(e) => handleSolicitarExclusao(e, venda)}
                          title="Solicitar exclusão desta venda"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerDetalhes(venda)}
                      >
                        <Eye className="h-4 w-4 mr-1.5" />
                        Detalhes
                      </Button>
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
        onFinalizarCadastro={podeAprovar ? () => {
          setDetalhesDialogOpen(false);
          setDialogOpen(true);
        } : undefined}
        onReprovarCadastro={podeRejeitar ? handleReprovar : undefined}
      />

      <FinalizarCadastroDialog
        venda={selectedVenda}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedVenda(null);
        }}
      />

      <ReprovarCadastroDialog
        documento={selectedVenda}
        open={reprovarDialogOpen}
        onClose={() => {
          setReprovarDialogOpen(false);
          setSelectedVenda(null);
        }}
        onSuccess={() => {
          setReprovarDialogOpen(false);
          setSelectedVenda(null);
        }}
      />

      <Dialog
        open={exclusaoDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setExclusaoDialogOpen(false);
            setVendaParaExcluir(null);
            setMotivoExclusao('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Exclusão de Venda</DialogTitle>
            <DialogDescription>
              Esta solicitação será enviada para aprovação de um gestor. A venda
              será excluída somente após a aprovação.
              {vendaParaExcluir && (
                <span className="block mt-1 font-medium text-foreground">
                  Venda #{vendaParaExcluir.numero} —{' '}
                  {vendaParaExcluir.cliente.tipoPessoa === 'PF'
                    ? vendaParaExcluir.cliente.nome
                    : vendaParaExcluir.cliente.razaoSocial}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="motivo-exclusao">Motivo (opcional)</Label>
            <Textarea
              id="motivo-exclusao"
              placeholder="Ex: Venda duplicada, cliente cadastrado duas vezes..."
              value={motivoExclusao}
              onChange={(e) => setMotivoExclusao(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setExclusaoDialogOpen(false);
                setVendaParaExcluir(null);
                setMotivoExclusao('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmarExclusao}
              disabled={solicitarExclusaoMutation.isPending}
            >
              {solicitarExclusaoMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Solicitação'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
