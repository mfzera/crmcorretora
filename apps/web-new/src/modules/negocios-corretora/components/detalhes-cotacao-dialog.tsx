
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { Badge } from '@/core/ui/badge';
import { Separator } from '@/core/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import {
  User,
  Building2,
  Package,
  Calendar,
  DollarSign,
  FileText,
  Users,
  Percent,
  Clock,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import type { Cotacao } from '@/types/area-trabalho';
import { formatDateBR } from '@/core/utils/date-utils';

interface DetalhesCotacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cotacao: Cotacao;
}

export function DetalhesCotacaoDialog({
  open,
  onOpenChange,
  cotacao,
}: DetalhesCotacaoDialogProps) {
  const nomeCliente =
    cotacao.cliente.tipoPessoa === 'PF'
      ? cotacao.cliente.nome
      : cotacao.cliente.razaoSocial;

  const documentoCliente =
    cotacao.cliente.tipoPessoa === 'PF'
      ? cotacao.cliente.cpf
      : cotacao.cliente.cnpj;

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      'default' | 'secondary' | 'destructive' | 'outline'
    > = {
      ATIVO: 'default',
      AGUARDANDO_CADASTRO: 'secondary',
      EM_NEGOCIACAO: 'outline',
      CANCELADO: 'destructive',
      EXPIRADO: 'destructive',
      RENOVADO: 'default',
      VENCIDO: 'destructive',
      ARQUIVADO: 'outline',
      EM_ELABORACAO: 'secondary',
      PERDIDA: 'destructive',
      EXPIRADA: 'outline',
      CONVERTIDA: 'default',
    };

    const labels: Record<string, string> = {
      ATIVO: 'Ativo',
      AGUARDANDO_CADASTRO: 'Aguardando Cadastro',
      EM_NEGOCIACAO: 'Em Negociação',
      CANCELADO: 'Cancelado',
      EXPIRADO: 'Expirado',
      RENOVADO: 'Renovado',
      VENCIDO: 'Vencido',
      ARQUIVADO: 'Arquivado',
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

  const getSituacaoBadge = (situacao: string) => {
    return (
      <Badge variant={situacao === 'RENOVACAO' ? 'default' : 'secondary'}>
        {situacao === 'RENOVACAO' ? 'Renovação' : 'Novo'}
      </Badge>
    );
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return 'Não informado';
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value == null) return 'Não informado';
    return `${value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}%`;
  };

  const formatDate = (date: string) => {
    return formatDateBR(date);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl h-[95vh] max-h-[95vh] p-0 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl flex-wrap">
              <FileText className="size-5 sm:size-6 text-blue-600 shrink-0" />
              <span className="break-words">
                Detalhes da Cotação - {cotacao.numero || cotacao.numeroCotacao}
              </span>
            </DialogTitle>
            <DialogDescription className="mt-1 sm:mt-2 text-xs sm:text-sm">
              Informações completas do negócio da corretora
            </DialogDescription>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 sm:py-6">
            <div className="space-y-4 sm:space-y-6">
              {/* Status e Situação */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Status:
                  </span>
                  {getStatusBadge(cotacao.status)}
                </div>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Situação:
                  </span>
                  {getSituacaoBadge(cotacao.situacao)}
                </div>
                {cotacao.negocioCorretora && (
                  <>
                    <Separator orientation="vertical" className="h-6" />
                    <Badge variant="default" className="bg-emerald-600">
                      Negócio Corretora
                    </Badge>
                  </>
                )}
              </div>

              <Separator />

              {/* Informações do Cliente */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="size-5 text-blue-600" />
                    Informações do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Nome/Razão Social
                      </p>
                      <p className="text-base font-semibold">{nomeCliente}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Tipo de Pessoa
                      </p>
                      <p className="text-base">
                        {cotacao.cliente.tipoPessoa === 'PF'
                          ? 'Pessoa Física'
                          : 'Pessoa Jurídica'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {cotacao.cliente.tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'}
                      </p>
                      <p className="text-base">{documentoCliente || '-'}</p>
                    </div>
                    {cotacao.cliente.tipoPessoa === 'PJ' &&
                      cotacao.cliente.nomeFantasia && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Nome Fantasia
                          </p>
                          <p className="text-base">
                            {cotacao.cliente.nomeFantasia}
                          </p>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>

              {/* Informações do Produto */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="size-5 text-purple-600" />
                    Informações do Produto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Produto
                      </p>
                      <p className="text-base font-semibold">
                        {cotacao.produto.nomeProduto}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Tipo de Seguro
                      </p>
                      <p className="text-base">{cotacao.produto.tipoSeguro}</p>
                    </div>
                    {cotacao.seguradoraParceira && (
                      <div className="sm:col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Seguradora Parceira
                        </p>
                        <p className="text-base">
                          {cotacao.seguradoraParceira.nomeFantasia ||
                            cotacao.seguradoraParceira.razaoSocial}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Informações de Vigência */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="size-5 text-orange-600" />
                    Vigência e Datas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Início da Vigência
                      </p>
                      <p className="text-base">
                        {formatDate(cotacao.vigenciaInicio)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Fim da Vigência
                      </p>
                      <p className="text-base">
                        {formatDate(cotacao.vigenciaFim)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Criado em
                      </p>
                      <p className="text-base">
                        {formatDate(cotacao.createdAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Informações Financeiras */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <DollarSign className="size-5 text-green-600" />
                    Informações Financeiras
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Prêmio Líquido
                      </p>
                      <p className="text-base font-semibold text-green-700 dark:text-green-400">
                        {formatCurrency(cotacao.premioLiquido)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Percentual de Comissão
                      </p>
                      <p className="text-base">
                        {formatPercent(cotacao.percentualComissao)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Valor da Comissão Total
                      </p>
                      <p className="text-base font-semibold">
                        {formatCurrency(cotacao.valorComissao)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Informações de Vendedores */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="size-5 text-indigo-600" />
                    Vendedores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Vendedor Principal
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground">Nome</p>
                        <p className="text-base font-semibold">
                          {cotacao.vendedor?.nome || 'Não atribuído'}
                        </p>
                      </div>
                      {cotacao.percentualComissaoPrincipal != null && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Percentual
                            </p>
                            <p className="text-base">
                              {formatPercent(
                                cotacao.percentualComissaoPrincipal,
                              )}
                            </p>
                          </div>
                          <div className="sm:col-span-2">
                            <p className="text-xs text-muted-foreground">
                              Valor da Comissão
                            </p>
                            <p className="text-base font-semibold text-green-600">
                              {formatCurrency(cotacao.valorComissaoPrincipal)}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {cotacao.vendedorSecundario && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Vendedor Secundário
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground">Nome</p>
                          <p className="text-base font-semibold">
                            {cotacao.vendedorSecundario.nome}
                          </p>
                        </div>
                        {cotacao.percentualComissaoSecundario != null && (
                          <>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Percentual
                              </p>
                              <p className="text-base">
                                {formatPercent(
                                  cotacao.percentualComissaoSecundario,
                                )}
                              </p>
                            </div>
                            <div className="sm:col-span-2">
                              <p className="text-xs text-muted-foreground">
                                Valor da Comissão
                              </p>
                              <p className="text-base font-semibold text-green-600">
                                {formatCurrency(
                                  cotacao.valorComissaoSecundario,
                                )}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {cotacao.negocioCorretora && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Comissão da Corretora
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Percentual
                          </p>
                          <p className="text-base font-semibold">
                            {formatPercent(cotacao.percentualCorretora)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Valor da Comissão
                          </p>
                          <p className="text-base font-semibold text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(cotacao.valorComissaoCorretora)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dados de Renovação (se aplicável) */}
              {cotacao.situacao === 'RENOVACAO' && cotacao.dadosRenovacao && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="size-5 text-blue-600" />
                      Dados de Renovação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Prêmio Anterior
                        </p>
                        <p className="text-base">
                          {formatCurrency(
                            cotacao.dadosRenovacao.premioLiquidoAnterior,
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          % Comissão Anterior
                        </p>
                        <p className="text-base">
                          {formatPercent(
                            cotacao.dadosRenovacao.percentualComissaoAnterior,
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Comissão Anterior
                        </p>
                        <p className="text-base">
                          {formatCurrency(
                            cotacao.dadosRenovacao.valorComissaoAnterior,
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Informações de Perda (se aplicável) */}
              {cotacao.status === 'PERDIDA' &&
                (cotacao.motivoPerda || cotacao.detalhesPerda) && (
                  <Card className="border-destructive/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base text-destructive">
                        <AlertCircle className="size-5" />
                        Informações de Perda
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {cotacao.motivoPerda && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Motivo da Perda
                          </p>
                          <p className="text-base">{cotacao.motivoPerda}</p>
                        </div>
                      )}
                      {cotacao.detalhesPerda && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Detalhes
                          </p>
                          <p className="text-base">{cotacao.detalhesPerda}</p>
                        </div>
                      )}
                      {cotacao.concorrenteGanhou && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Concorrente
                          </p>
                          <p className="text-base">
                            {cotacao.concorrenteGanhou}
                          </p>
                        </div>
                      )}
                      {cotacao.dataMarcadaPerdida && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Data da Perda
                          </p>
                          <p className="text-base">
                            {formatDate(cotacao.dataMarcadaPerdida)}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
