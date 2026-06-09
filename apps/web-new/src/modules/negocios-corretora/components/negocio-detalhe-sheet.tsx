import { Settings } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/core/ui/sheet';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { Separator } from '@/core/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import {
  User,
  Package,
  Calendar,
  DollarSign,
  FileText,
  Users,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import type { Cotacao } from '@/types/area-trabalho';
import { formatDateBR } from '@/core/utils/date-utils';
import { getStatusLabel } from '@/core/utils/status-config';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ATIVO: 'default', AGUARDANDO_CADASTRO: 'secondary', EM_NEGOCIACAO: 'outline',
  CANCELADO: 'destructive', EXPIRADO: 'destructive', RENOVADO: 'default',
  VENCIDO: 'destructive', ARQUIVADO: 'outline', EM_ELABORACAO: 'secondary',
  PERDIDA: 'destructive', EXPIRADA: 'outline', CONVERTIDA: 'default',
};

function fmt(v: number | null | undefined) {
  if (v == null) return 'Não informado';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtPct(v: number | null | undefined) {
  if (v == null) return 'Não informado';
  return `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

interface NegocioDetalheSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cotacao: Cotacao;
  onConfigComissao: () => void;
}

export function NegocioDetalheSheet({
  open,
  onOpenChange,
  cotacao,
  onConfigComissao,
}: NegocioDetalheSheetProps) {
  const nomeCliente =
    cotacao.cliente.tipoPessoa === 'PF' ? cotacao.cliente.nome : cotacao.cliente.razaoSocial;
  const documentoCliente =
    cotacao.cliente.tipoPessoa === 'PF' ? cotacao.cliente.cpf : cotacao.cliente.cnpj;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92dvh] rounded-t-2xl flex flex-col p-0 gap-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b flex-shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4 text-blue-600 shrink-0" />
            <span className="truncate">
              {cotacao.numero || cotacao.numeroCotacao}
            </span>
          </SheetTitle>
          <SheetDescription className="text-xs">
            Informações completas do negócio
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={STATUS_VARIANTS[cotacao.status] ?? 'default'}>
              {getStatusLabel(cotacao.status)}
            </Badge>
            <Badge variant={cotacao.situacao === 'RENOVACAO' ? 'default' : 'secondary'}>
              {cotacao.situacao === 'RENOVACAO' ? 'Renovação' : 'Novo'}
            </Badge>
            {cotacao.negocioCorretora && (
              <Badge variant="default" className="bg-emerald-600">Negócio Corretora</Badge>
            )}
          </div>

          <Separator />

          {/* Cliente */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <User className="size-4 text-blue-600" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="text-sm font-semibold">{nomeCliente}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p className="text-sm">
                  {cotacao.cliente.tipoPessoa === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {cotacao.cliente.tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'}
                </p>
                <p className="text-sm">{documentoCliente || '—'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Produto */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Package className="size-4 text-purple-600" />
                Produto
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Produto</p>
                <p className="text-sm font-semibold">{cotacao.produto.nomeProduto}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tipo de Seguro</p>
                <p className="text-sm">{cotacao.produto.tipoSeguro}</p>
              </div>
              {cotacao.seguradoraParceira && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Seguradora</p>
                  <p className="text-sm">
                    {cotacao.seguradoraParceira.nomeFantasia || cotacao.seguradoraParceira.razaoSocial}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vigência */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="size-4 text-orange-600" />
                Vigência
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Início</p>
                <p className="text-sm">{formatDateBR(cotacao.vigenciaInicio)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fim</p>
                <p className="text-sm">{formatDateBR(cotacao.vigenciaFim)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p className="text-sm">{formatDateBR(cotacao.createdAt)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Financeiro */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <DollarSign className="size-4 text-green-600" />
                Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Prêmio Líquido</p>
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                  {fmt(cotacao.premioLiquido)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">% Comissão</p>
                <p className="text-sm">{fmtPct(cotacao.percentualComissao)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Valor Comissão Total</p>
                <p className="text-sm font-semibold">{fmt(cotacao.valorComissao)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Vendedores */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="size-4 text-indigo-600" />
                Vendedores
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-3">
              <div className="rounded-lg bg-muted/50 p-3 grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Vendedor Principal</p>
                  <p className="text-sm font-semibold">{cotacao.vendedor?.nome || 'Não atribuído'}</p>
                </div>
                {cotacao.percentualComissaoPrincipal != null && (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">%</p>
                      <p className="text-sm">{fmtPct(cotacao.percentualComissaoPrincipal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor</p>
                      <p className="text-sm font-semibold text-green-600">{fmt(cotacao.valorComissaoPrincipal)}</p>
                    </div>
                  </>
                )}
              </div>

              {cotacao.vendedorSecundario && (
                <div className="rounded-lg bg-muted/50 p-3 grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Vendedor Secundário</p>
                    <p className="text-sm font-semibold">{cotacao.vendedorSecundario.nome}</p>
                  </div>
                  {cotacao.percentualComissaoSecundario != null && (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground">%</p>
                        <p className="text-sm">{fmtPct(cotacao.percentualComissaoSecundario)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Valor</p>
                        <p className="text-sm font-semibold text-green-600">{fmt(cotacao.valorComissaoSecundario)}</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {cotacao.negocioCorretora && (
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-3 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">% Corretora</p>
                    <p className="text-sm font-semibold">{fmtPct(cotacao.percentualCorretora)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor Corretora</p>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      {fmt(cotacao.valorComissaoCorretora)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Renovação */}
          {cotacao.situacao === 'RENOVACAO' && cotacao.dadosRenovacao && (
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="size-4 text-blue-600" />
                  Dados de Renovação
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Prêmio Anterior</p>
                  <p className="text-sm">{fmt(cotacao.dadosRenovacao.premioLiquidoAnterior)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Comissão Anterior</p>
                  <p className="text-sm">{fmt(cotacao.dadosRenovacao.valorComissaoAnterior)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Perda */}
          {cotacao.status === 'PERDIDA' && (cotacao.motivoPerda || (cotacao as any).detalhesPerda) && (
            <Card className="border-destructive/50">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="size-4" />
                  Informações de Perda
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                {cotacao.motivoPerda && (
                  <div>
                    <p className="text-xs text-muted-foreground">Motivo</p>
                    <p className="text-sm">{cotacao.motivoPerda}</p>
                  </div>
                )}
                {(cotacao as any).detalhesPerda && (
                  <div>
                    <p className="text-xs text-muted-foreground">Detalhes</p>
                    <p className="text-sm">{(cotacao as any).detalhesPerda}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <SheetFooter className="flex-row gap-2 border-t px-4 py-3">
          <SheetClose asChild>
            <Button variant="outline" className="flex-1">Fechar</Button>
          </SheetClose>
          <Button
            className="flex-1 gap-2"
            onClick={() => { onOpenChange(false); onConfigComissao(); }}
          >
            <Settings className="size-4" />
            Configurar Comissão
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
