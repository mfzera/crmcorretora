
import { useState } from 'react';
import { Trash2, Check, X, Loader2, AlertCircle, Eye, Package, Building2, Calendar, DollarSign, Percent, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/core/ui/sheet';
import { Textarea } from '@/core/ui/textarea';
import { Label } from '@/core/ui/label';
import {
  useSolicitacoesExclusaoPendentes,
  useAceitarExclusaoRenovacao,
  useRecusarExclusaoRenovacao,
  type SolicitacaoExclusaoRenovacao,
} from '@/modules/renovacoes/http';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';

export function ExclusoesRenovacaoCard() {
  const { data: solicitacoes = [], isLoading } =
    useSolicitacoesExclusaoPendentes();
  const aceitarMutation = useAceitarExclusaoRenovacao();
  const recusarMutation = useRecusarExclusaoRenovacao();

  const [recusandoId, setRecusandoId] = useState<string | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [detalhes, setDetalhes] = useState<SolicitacaoExclusaoRenovacao | null>(null);

  const handleAceitar = async (solicitacao: SolicitacaoExclusaoRenovacao) => {
    try {
      await aceitarMutation.mutateAsync(solicitacao.id);
      toast.success('Renovação excluída com sucesso');
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleRecusar = async () => {
    if (!recusandoId || !motivoRecusa.trim()) return;
    try {
      await recusarMutation.mutateAsync({
        solicitacaoId: recusandoId,
        motivoRecusa: motivoRecusa.trim(),
      });
      toast.success('Solicitação de exclusão recusada');
      setRecusandoId(null);
      setMotivoRecusa('');
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  if (isLoading || solicitacoes.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="rounded-lg p-2 bg-destructive/10 ring-1 ring-destructive/20">
              <Trash2 className="size-4 text-destructive" />
            </div>
            Solicitações de Exclusão
            <Badge variant="destructive">{solicitacoes.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {solicitacoes.map((solicitacao) => (
            <div
              key={solicitacao.id}
              className="border border-destructive/20 rounded-lg p-4 bg-destructive/5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      {solicitacao.renovacao.produtoDescricao ||
                        'Produto não informado'}
                    </span>
                    {solicitacao.renovacao.itemDescricao && (
                      <span className="text-xs text-muted-foreground truncate">
                        — {solicitacao.renovacao.itemDescricao}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cliente:{' '}
                    <span className="font-medium text-foreground">
                      {solicitacao.renovacao.cliente?.nome ?? 'Não informado'}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vencimento:{' '}
                    {new Date(
                      solicitacao.renovacao.dataVencimento,
                    ).toLocaleDateString('pt-BR')}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AlertCircle className="size-3" />
                    <span>
                      Solicitado por{' '}
                      <strong>{solicitacao.solicitante.nome}</strong> em{' '}
                      {new Date(solicitacao.criadoEm).toLocaleDateString(
                        'pt-BR',
                      )}
                    </span>
                  </div>
                  {solicitacao.motivo && (
                    <p className="text-xs text-foreground bg-background/60 rounded px-2 py-1 border">
                      &ldquo;{solicitacao.motivo}&rdquo;
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDetalhes(solicitacao)}
                    title="Ver detalhes"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => setRecusandoId(solicitacao.id)}
                    disabled={
                      aceitarMutation.isPending || recusarMutation.isPending
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleAceitar(solicitacao)}
                    disabled={
                      aceitarMutation.isPending || recusarMutation.isPending
                    }
                  >
                    {aceitarMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sheet de detalhes da renovação */}
      <Sheet open={!!detalhes} onOpenChange={(open) => { if (!open) setDetalhes(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-4 sm:p-8">
          {detalhes && (
            <div className="flex flex-col gap-5 p-1">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-base">
                  <div className="rounded-lg p-1.5 bg-destructive/10 ring-1 ring-destructive/20">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </div>
                  Detalhes da Renovação
                </SheetTitle>
              </SheetHeader>

              {/* Produto / Item */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <Package className="h-4 w-4 text-primary" />
                  Produto / Item
                </h3>
                <Card>
                  <CardContent className="p-3 grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground">Produto</span>
                      <p className="text-sm font-semibold">{detalhes.renovacao.produtoDescricao || 'Não informado'}</p>
                    </div>
                    {detalhes.renovacao.itemDescricao && (
                      <div className="col-span-2">
                        <span className="text-xs text-muted-foreground">Item / Risco</span>
                        <p className="text-sm font-semibold">{detalhes.renovacao.itemDescricao}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-muted-foreground">Status</span>
                      <p className="text-sm font-semibold">{detalhes.renovacao.status.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Seguradora anterior</span>
                      <p className="text-sm font-semibold">{detalhes.renovacao.seguradoraAnterior || '—'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Datas */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Datas
                </h3>
                <Card>
                  <CardContent className="p-3 grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Vencimento</span>
                      <p className="text-sm font-semibold">
                        {new Date(detalhes.renovacao.dataVencimento + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Cadastrado em</span>
                      <p className="text-sm font-semibold">
                        {new Date(detalhes.renovacao.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    {detalhes.renovacao.novaVigenciaInicio && (
                      <div>
                        <span className="text-xs text-muted-foreground">Nova vigência início</span>
                        <p className="text-sm font-semibold">
                          {new Date(detalhes.renovacao.novaVigenciaInicio + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                    {detalhes.renovacao.novaVigenciaFim && (
                      <div>
                        <span className="text-xs text-muted-foreground">Nova vigência fim</span>
                        <p className="text-sm font-semibold">
                          {new Date(detalhes.renovacao.novaVigenciaFim + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Prêmio e Comissão */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Prêmio e Comissão
                </h3>
                <Card>
                  <CardContent className="p-3 grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Prêmio anterior</span>
                      <p className="text-base font-bold text-primary">
                        {detalhes.renovacao.premioAnterior
                          ? parseFloat(detalhes.renovacao.premioAnterior).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Prêmio novo</span>
                      <p className="text-base font-bold text-primary">
                        {detalhes.renovacao.premioNovo
                          ? parseFloat(detalhes.renovacao.premioNovo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">% Comissão anterior</span>
                      <p className="text-sm font-semibold">
                        {detalhes.renovacao.percentualComissaoAnterior
                          ? `${parseFloat(detalhes.renovacao.percentualComissaoAnterior).toFixed(2)}%`
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Valor comissão anterior</span>
                      <p className="text-sm font-semibold">
                        {detalhes.renovacao.valorComissaoAnterior
                          ? parseFloat(detalhes.renovacao.valorComissaoAnterior).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : '—'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Observações / Motivo de perda */}
              {(detalhes.renovacao.observacoes || detalhes.renovacao.motivoPerda) && (
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    Observações
                  </h3>
                  <Card>
                    <CardContent className="p-3 space-y-3">
                      {detalhes.renovacao.observacoes && (
                        <div>
                          <span className="text-xs text-muted-foreground">Observações</span>
                          <p className="text-sm font-semibold">{detalhes.renovacao.observacoes}</p>
                        </div>
                      )}
                      {detalhes.renovacao.motivoPerda && (
                        <div>
                          <span className="text-xs text-muted-foreground">Motivo de perda</span>
                          <p className="text-sm font-semibold">{detalhes.renovacao.motivoPerda}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Solicitação de Exclusão */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <User className="h-4 w-4 text-destructive" />
                  Solicitação de Exclusão
                </h3>
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardContent className="p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-muted-foreground">Solicitado por</span>
                        <p className="text-sm font-semibold">{detalhes.solicitante.nome}</p>
                        <p className="text-xs text-muted-foreground">{detalhes.solicitante.email}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Data</span>
                        <p className="text-sm font-semibold">
                          {new Date(detalhes.criadoEm).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    {detalhes.motivo && (
                      <div>
                        <span className="text-xs text-muted-foreground">Motivo informado</span>
                        <p className="text-sm mt-1 bg-background/60 rounded px-3 py-2 border border-destructive/20">
                          &ldquo;{detalhes.motivo}&rdquo;
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog de recusa */}
      <Dialog
        open={!!recusandoId}
        onOpenChange={(open) => {
          if (!open) {
            setRecusandoId(null);
            setMotivoRecusa('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recusar Solicitação de Exclusão</DialogTitle>
            <DialogDescription>
              Informe o motivo da recusa para que o solicitante seja notificado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="motivo-recusa">
              Motivo da recusa <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="motivo-recusa"
              placeholder="Ex: Renovação já em processo de cotação..."
              value={motivoRecusa}
              onChange={(e) => setMotivoRecusa(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRecusandoId(null);
                setMotivoRecusa('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRecusar}
              disabled={recusarMutation.isPending || !motivoRecusa.trim()}
            >
              {recusarMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recusando...
                </>
              ) : (
                'Confirmar Recusa'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
