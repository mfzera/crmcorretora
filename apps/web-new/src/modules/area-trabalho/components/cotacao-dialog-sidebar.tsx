
import { useState } from 'react';
import { AlertTriangle, Loader2, Pencil, Send, UserX, UserCheck, Search, UserPlus } from 'lucide-react';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Label } from '@/core/ui/label';
import { Separator } from '@/core/ui/separator';
import { Switch } from '@/core/ui/switch';
import { Input } from '@/core/ui/input';
import type { Cotacao } from '@/types/area-trabalho';
import { useSearchClients } from '@/modules/clientes/http';
import { NovoClienteDialog } from '@/modules/clientes/components/novo-cliente-dialog';
import { CotacaoTagSelector, TagBadge } from './cotacao-tag-manager';

interface CotacaoDialogSidebarProps {
  cotacao: Cotacao;
  mode: 'view' | 'edit';

  premioLiquido: string | number | null | undefined;
  percentualComissao: string | number | null | undefined;
  valorComissao: number | null;

  negocioCorretora: boolean;
  onNegocioCorretoraChange: (checked: boolean) => void;

  onSalvar?: () => void;
  isSalvando?: boolean;

  onConfirmarVenda?: () => void;
  isReenviando?: boolean;
  onMarcarPerdida?: () => void;
  onReabrir?: () => void;
  isReabrindo?: boolean;
  onSwitchToEdit?: () => void;
  onVincularCliente?: (clienteId: string) => void;
  isVinculando?: boolean;

  onClose: () => void;
}

function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '—';
  return numValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatPercentual(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '—';
  return `${numValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

export function CotacaoDialogSidebar({
  cotacao,
  mode,
  premioLiquido,
  percentualComissao,
  valorComissao,
  negocioCorretora,
  onNegocioCorretoraChange,
  onSalvar,
  isSalvando = false,
  onConfirmarVenda,
  isReenviando = false,
  onMarcarPerdida,
  onReabrir,
  isReabrindo = false,
  onSwitchToEdit,
  onVincularCliente,
  isVinculando = false,
  onClose,
}: CotacaoDialogSidebarProps) {
  const [buscaCliente, setBuscaCliente] = useState('');
  const [mostrarBusca, setMostrarBusca] = useState(false);
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);

  const { data: clientesEncontrados = [], isFetching: buscando } = useSearchClients(buscaCliente);
  const nomeCliente =
    cotacao.cliente?.tipoPessoa === 'PF'
      ? cotacao.cliente?.nome
      : cotacao.cliente?.nomeFantasia || cotacao.cliente?.razaoSocial;

  const tipoPessoaLabel =
    cotacao.cliente?.tipoPessoa === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica';
  const labelDocumento = cotacao.cliente?.tipoPessoa === 'PF' ? 'CPF' : 'CNPJ';
  const documento = cotacao.cliente?.cpf || cotacao.cliente?.cnpj || '—';
  const numeroCotacao = cotacao.numeroCotacao || cotacao.numero || '—';

  const isReprovada = !!cotacao.dataRejeicaoCadastroDoc;
  const clienteIncompleto = !cotacao.cliente?.cpf && !cotacao.cliente?.cnpj;
  const showVendaActions = mode === 'view' && cotacao.status === 'EM_ELABORACAO' && !isReprovada;
  const showReprovadaActions = mode === 'view' && isReprovada;
  const showReabrirAction = mode === 'view' && cotacao.status === 'PERDIDA' && !!onReabrir;
  const showOnlyClose = mode === 'view' && cotacao.status !== 'EM_ELABORACAO' && !showReabrirAction && !showReprovadaActions;

  return (
    <aside className="w-[280px] shrink-0 border-r bg-muted/30 flex flex-col h-full">
      <div className="p-5 space-y-4 flex-1 overflow-y-auto">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Cotação
          </p>
          <p className="text-sm font-mono font-medium">{numeroCotacao}</p>
        </div>

        <div>
          <p className="font-bold text-xl leading-tight break-words">
            {nomeCliente}
          </p>
          <p className="text-sm text-muted-foreground">{tipoPessoaLabel}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">{labelDocumento}</p>
          <p className="text-sm font-medium font-mono">{documento}</p>
        </div>

        {clienteIncompleto && onVincularCliente && (
          <div className="space-y-2">
            {!mostrarBusca ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs"
                  onClick={() => setMostrarBusca(true)}
                >
                  <UserCheck className="size-3.5" />
                  Vincular cliente cadastrado
                </Button>
                <NovoClienteDialog
                  open={novoClienteOpen}
                  onOpenChange={setNovoClienteOpen}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-xs"
                      type="button"
                    >
                      <UserPlus className="size-3.5" />
                      Cadastrar novo cliente
                    </Button>
                  }
                  onClienteCriado={(cliente) => {
                    onVincularCliente(cliente.id);
                    setNovoClienteOpen(false);
                  }}
                />
              </>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8 text-xs h-8"
                    placeholder="Buscar por nome ou CPF/CNPJ..."
                    value={buscaCliente}
                    onChange={(e) => setBuscaCliente(e.target.value)}
                    autoFocus
                  />
                </div>
                {buscaCliente.length >= 3 && (
                  <div className="rounded-md border bg-popover shadow-sm max-h-48 overflow-y-auto">
                    {buscando ? (
                      <div className="p-3 text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
                        <Loader2 className="size-3 animate-spin" /> Buscando...
                      </div>
                    ) : clientesEncontrados.length === 0 ? (
                      <div className="p-3 text-xs text-muted-foreground text-center">
                        Nenhum cliente encontrado
                      </div>
                    ) : (
                      clientesEncontrados.map((c: any) => {
                        const nome = c.tipoPessoa === 'PF' ? c.nome : (c.nomeFantasia || c.razaoSocial);
                        const doc = c.tipoPessoa === 'PF' ? c.cpf : c.cnpj;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-accent text-xs transition-colors"
                            disabled={isVinculando}
                            onClick={() => {
                              onVincularCliente(c.id);
                              setMostrarBusca(false);
                              setBuscaCliente('');
                            }}
                          >
                            <div className="font-medium">{nome}</div>
                            {doc && <div className="text-muted-foreground">{doc}</div>}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => { setMostrarBusca(false); setBuscaCliente(''); }}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        )}

        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Produto
          </p>
          <p className="text-sm font-semibold">
            {cotacao.produto?.nomeProduto ?? '—'}
          </p>
          {cotacao.produto?.tipoSeguro && (
            <Badge variant="outline" className="text-xs mt-1">
              {cotacao.produto.tipoSeguro}
            </Badge>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Prêmio Líquido</p>
            <p className="text-2xl font-bold">{formatCurrency(premioLiquido)}</p>
          </div>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground">Comissão</p>
            <p className="text-lg font-semibold text-green-600">
              {formatPercentual(percentualComissao)} ·{' '}
              {formatCurrency(valorComissao)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="negocio-corretora-sidebar" className="text-sm">
            Negócio da Corretora
          </Label>
          <Switch
            id="negocio-corretora-sidebar"
            checked={negocioCorretora}
            onCheckedChange={onNegocioCorretoraChange}
            disabled={mode === 'view'}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Tags</p>
            <CotacaoTagSelector cotacaoId={cotacao.id} currentTags={cotacao.tags ?? []} />
          </div>
          {(cotacao.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(cotacao.tags ?? []).map((tag) => (
                <TagBadge key={tag.id} tag={tag} />
              ))}
            </div>
          )}
        </div>

        {isReprovada && (
          <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide">Reprovada pelo Cadastro</span>
            </div>
            {cotacao.motivoRejeicaoCadastroDoc && (
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                {cotacao.motivoRejeicaoCadastroDoc}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t space-y-2 shrink-0">
        {mode === 'edit' && (
          <>
            <Button
              className="w-full"
              onClick={onSalvar}
              disabled={isSalvando}
            >
              {isSalvando ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Rascunho'
              )}
            </Button>
            <Button variant="outline" className="w-full" onClick={onClose}>
              Cancelar
            </Button>
          </>
        )}

        {showReprovadaActions && (
          <>
            <Button
              className="w-full bg-green-600 hover:bg-green-700 gap-2"
              onClick={onConfirmarVenda}
              disabled={isReenviando}
            >
              {isReenviando
                ? <><Loader2 className="size-4 animate-spin" />Enviando...</>
                : <><Send className="size-4" />Reenviar para Aprovação</>
              }
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={onSwitchToEdit}
            >
              <Pencil className="size-4" />
              Alterar Informações
            </Button>
            <Button variant="outline" className="w-full" onClick={onClose}>
              Fechar
            </Button>
          </>
        )}

        {showVendaActions && (
          <>
            {clienteIncompleto && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <UserX className="size-3.5 shrink-0" />
                  <span className="text-xs font-semibold">Dados incompletos</span>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  Preencha o CPF/CNPJ do cliente antes de confirmar a venda.
                </p>
              </div>
            )}
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={onConfirmarVenda}
              disabled={clienteIncompleto}
            >
              Confirmar Venda
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={onMarcarPerdida}
            >
              Marcar como Perdida
            </Button>
            <Button variant="outline" className="w-full" onClick={onClose}>
              Fechar
            </Button>
          </>
        )}

        {showReabrirAction && (
          <>
            <Button
              variant="outline"
              className="w-full"
              onClick={onReabrir}
              disabled={isReabrindo}
            >
              {isReabrindo ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Reabrindo...
                </>
              ) : (
                'Reabrir Cotação'
              )}
            </Button>
            <Button variant="outline" className="w-full" onClick={onClose}>
              Fechar
            </Button>
          </>
        )}

        {showOnlyClose && (
          <Button variant="outline" className="w-full" onClick={onClose}>
            Fechar
          </Button>
        )}
      </div>
    </aside>
  );
}
