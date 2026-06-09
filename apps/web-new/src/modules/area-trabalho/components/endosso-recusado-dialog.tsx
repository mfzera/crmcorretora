
import { useState, useEffect } from 'react';
import {
  TriangleAlert,
  Paperclip,
  User,
  Building2,
  Shield,
  Send,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  Pencil,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/core/ui/dialog';
import { Skeleton } from '@/core/ui/skeleton';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { Textarea } from '@/core/ui/textarea';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { AnexosTab } from '@/modules/anexos/components';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { useAtualizarEndosso } from '../http';

interface EndossoRecusadoDialogProps {
  endosso: any | null;
  open: boolean;
  onClose: () => void;
  onReenviar: () => void;
  isReenviando?: boolean;
}

const formatCurrency = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

function getNomeCliente(cliente: any): string {
  if (!cliente) return '-';
  return cliente.tipoPessoa === 'PF'
    ? cliente.nome || '-'
    : cliente.nomeFantasia || cliente.razaoSocial || cliente.nome || '-';
}

const TIPO_ENDOSSO_LABELS: Record<string, string> = {
  SUBSTITUICAO_VEICULO: 'Substituição de Veículo',
  CANCELAMENTO: 'Cancelamento',
  ALTERACAO_DADOS: 'Alteração de Dados',
  ALTERACAO_VALOR: 'Alteração de Valor',
  INCLUSAO_ITEM: 'Inclusão de Item',
  EXCLUSAO_ITEM: 'Exclusão de Item',
  INCLUSAO_COBERTURA: 'Inclusão de Cobertura',
  EXCLUSAO_COBERTURA: 'Exclusão de Cobertura',
  ALTERACAO_VIGENCIA: 'Alteração de Vigência',
  TRANSFERENCIA_SEGURADO: 'Transferência de Segurado',
  OUTROS: 'Outros',
};

export function EndossoRecusadoDialog({
  endosso,
  open,
  onClose,
  onReenviar,
  isReenviando,
}: EndossoRecusadoDialogProps) {
  const [activeTab, setActiveTab] = useState('dados');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    descricao: '',
    observacoes: '',
    premioNovo: '',
    percentualComissaoNovo: '',
  });

  const atualizarMutation = useAtualizarEndosso();

  useEffect(() => {
    if (endosso) {
      setEditForm({
        descricao: endosso.descricao || '',
        observacoes: endosso.observacoes || '',
        premioNovo: endosso.premioNovo?.toString() || '',
        percentualComissaoNovo: endosso.percentualComissaoNovo?.toString() || '',
      });
      setIsEditing(false);
    }
  }, [endosso?.id]);

  if (!endosso) return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!w-[98vw] !max-w-5xl h-[95vh] p-0 gap-0 overflow-hidden flex flex-row">
        <DialogTitle className="sr-only">Carregando endosso…</DialogTitle>
        <aside className="w-[300px] shrink-0 h-full bg-card flex flex-col gap-4 p-6 border-r border-border">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
        </aside>
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-8 w-48" />
        </div>
      </DialogContent>
    </Dialog>
  );

  const cliente = endosso.documentoVenda?.cliente;
  const isPessoaFisica = cliente?.tipoPessoa === 'PF';
  const nomeCliente = getNomeCliente(cliente);
  const tipoLabel = TIPO_ENDOSSO_LABELS[endosso.tipoEndosso] ?? endosso.tipoEndosso?.replace(/_/g, ' ') ?? '-';

  const diferencaPremio = endosso.diferencaPremio ?? (
    endosso.premioNovo != null && endosso.premioAnterior != null
      ? endosso.premioNovo - endosso.premioAnterior
      : null
  );

  const handleSalvar = async () => {
    try {
      await atualizarMutation.mutateAsync({
        id: endosso.id,
        data: {
          descricao: editForm.descricao || undefined,
          observacoes: editForm.observacoes || null,
          premioNovo: editForm.premioNovo ? parseFloat(editForm.premioNovo) : undefined,
          percentualComissaoNovo: editForm.percentualComissaoNovo
            ? parseFloat(editForm.percentualComissaoNovo)
            : undefined,
        },
      });
      toast.success('Endosso atualizado!');
      setIsEditing(false);
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!w-[98vw] !max-w-5xl h-[95vh] p-0 gap-0 overflow-hidden flex flex-row">
        <DialogTitle className="sr-only">Endosso — {endosso.numeroEndosso}</DialogTitle>

        {/* Sidebar esquerda */}
        <aside className="w-[300px] shrink-0 h-full bg-card flex flex-col overflow-y-auto border-r border-border">
          <div className="px-6 pt-5 pb-4">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="size-4" />
              Cadastro
            </button>
          </div>

          <div className="px-6 mb-4">
            <Badge variant="destructive">Endosso Recusado</Badge>
          </div>

          <div className="px-6 mb-5">
            <div className="flex items-center gap-2.5">
              <div className={`rounded-md p-1.5 shrink-0 ${isPessoaFisica ? 'bg-blue-500/10' : 'bg-purple-500/10'}`}>
                {isPessoaFisica
                  ? <User className="size-4 text-blue-600 dark:text-blue-400" />
                  : <Building2 className="size-4 text-purple-600 dark:text-purple-400" />
                }
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-tight truncate">{nomeCliente}</p>
                <p className="text-xs text-muted-foreground">{isPessoaFisica ? 'Pessoa Física' : 'Pessoa Jurídica'}</p>
              </div>
            </div>
          </div>

          <div className="px-6 space-y-4 flex-1">
            {endosso.numeroEndosso && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Número</p>
                <p className="font-mono text-sm font-medium">{endosso.numeroEndosso}</p>
              </div>
            )}

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Tipo</p>
              <p className="text-sm font-medium">{tipoLabel}</p>
            </div>

            {endosso.documentoVenda?.produto?.nomeProduto && (
              <div className="flex items-start gap-2">
                <Shield className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Produto</p>
                  <p className="text-sm font-medium">{endosso.documentoVenda.produto.nomeProduto}</p>
                </div>
              </div>
            )}

            {diferencaPremio != null && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Alteração de Prêmio</p>
                <div className="flex items-center gap-1.5">
                  {diferencaPremio >= 0
                    ? <TrendingUp className="size-4 text-emerald-500" />
                    : <TrendingDown className="size-4 text-red-500" />
                  }
                  <span className={`text-sm font-semibold ${diferencaPremio >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {diferencaPremio >= 0 ? '+' : ''}{formatCurrency(diferencaPremio)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatCurrency(endosso.premioAnterior)} → {formatCurrency(endosso.premioNovo)}
                </p>
              </div>
            )}

            {endosso.vendedor?.nome && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Vendedor</p>
                <p className="text-sm">{endosso.vendedor.nome}</p>
              </div>
            )}
          </div>

          <div className="px-6 pb-6 pt-4 border-t border-border space-y-2">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSalvar}
                  disabled={atualizarMutation.isPending}
                  className="w-full"
                >
                  {atualizarMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={atualizarMutation.isPending}
                  className="w-full"
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={onReenviar}
                  disabled={isReenviando}
                  className="w-full"
                >
                  <Send className="mr-2 size-4" />
                  {isReenviando ? 'Enviando...' : 'Reenviar para Cadastro'}
                </Button>
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
          </div>
        </aside>

        {/* Conteúdo principal */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <TabsList className="bg-background border-b border-border rounded-none w-full justify-start px-8 h-14 shrink-0 gap-0">
              <TabsTrigger
                value="dados"
                className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent bg-transparent px-0 mr-8 text-sm font-medium h-full"
              >
                Dados do Endosso
              </TabsTrigger>
              <TabsTrigger
                value="anexos"
                className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent bg-transparent px-0 text-sm font-medium h-full"
              >
                <Paperclip className="size-4 mr-2" />
                Anexos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="flex-1 overflow-y-auto mt-0">
              <div className="px-8 py-6 space-y-6">
                {/* Banner de rejeição */}
                {endosso.motivoRecusa && (
                  <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 flex items-start gap-3">
                    <TriangleAlert className="size-4 text-warning shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground text-sm">Cadastro Rejeitado</p>
                      <p className="text-sm text-muted-foreground mt-1">{endosso.motivoRecusa}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Corrija as informações necessárias, adicione os anexos e reenvie para o cadastro.
                      </p>
                    </div>
                  </div>
                )}

                {/* Campos editáveis / view */}
                <div className="rounded-xl border border-border p-5 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Detalhes</p>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Descrição</Label>
                      {isEditing ? (
                        <Textarea
                          value={editForm.descricao}
                          onChange={(e) => setEditForm(f => ({ ...f, descricao: e.target.value }))}
                          className="mt-1"
                          rows={3}
                        />
                      ) : (
                        <p className="text-sm mt-1">{endosso.descricao || '-'}</p>
                      )}
                    </div>

                    {(endosso.premioAnterior != null || isEditing) && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Prêmio Anterior</Label>
                          <p className="text-sm mt-1 font-medium">{formatCurrency(endosso.premioAnterior)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Prêmio Novo</Label>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editForm.premioNovo}
                              onChange={(e) => setEditForm(f => ({ ...f, premioNovo: e.target.value }))}
                              className="mt-1"
                              step="0.01"
                            />
                          ) : (
                            <p className="text-sm mt-1 font-medium">{formatCurrency(endosso.premioNovo)}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {(endosso.dataSolicitacao) && (
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Data de Solicitação</Label>
                        <p className="text-sm mt-1">
                          {new Date(endosso.dataSolicitacao).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Observações</Label>
                      {isEditing ? (
                        <Textarea
                          value={editForm.observacoes}
                          onChange={(e) => setEditForm(f => ({ ...f, observacoes: e.target.value }))}
                          className="mt-1"
                          rows={3}
                          placeholder="Observações adicionais..."
                        />
                      ) : (
                        <p className="text-sm mt-1">{endosso.observacoes || '-'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="anexos" className="flex-1 overflow-y-auto mt-0">
              <div className="px-8 py-6">
                <AnexosTab
                  entidade="endosso"
                  entidadeId={endosso.id}
                  isActive={activeTab === 'anexos'}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
