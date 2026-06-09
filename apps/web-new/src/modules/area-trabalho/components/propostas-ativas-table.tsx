
import { FileCheck, Eye, Edit, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/ui/table';
import { DataTablePagination } from '@/core/ui/data-table-pagination';
import { usePagination } from '@/core/hooks/use-pagination';
import type { Proposta } from '@/types/area-trabalho';
import { EmptyState } from '@/core/components/shared';

interface PropostasAtivasTableProps {
  propostas: Proposta[];
  onVisualizar: (proposta: Proposta) => void;
  onEditar: (proposta: Proposta) => void;
  onConfirmarVenda: (proposta: Proposta) => void;
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
    AGUARDANDO_ENVIO: 'secondary',
    ENVIADA: 'default',
    EM_ANALISE: 'secondary',
    PENDENTE_DOCUMENTACAO: 'secondary',
    APROVADA: 'default',
    APROVADA_CONDICIONAL: 'secondary',
    RECUSADA: 'destructive',
    CANCELADA: 'destructive',
    VENDA_CONFIRMADA: 'default',
  };

  const labels: Record<string, string> = {
    AGUARDANDO_ENVIO: 'Aguardando Envio',
    ENVIADA: 'Enviada',
    EM_ANALISE: 'Em Análise',
    PENDENTE_DOCUMENTACAO: 'Pendente Doc.',
    APROVADA: 'Aprovada',
    APROVADA_CONDICIONAL: 'Aprovada Condicional',
    RECUSADA: 'Recusada',
    CANCELADA: 'Cancelada',
    VENDA_CONFIRMADA: 'Venda Confirmada',
  };

  return (
    <Badge variant={variants[status] || 'default'}>
      {labels[status] || status}
    </Badge>
  );
};

export function PropostasAtivasTable({
  propostas,
  onVisualizar,
  onEditar,
  onConfirmarVenda,
}: PropostasAtivasTableProps) {
  const {
    currentPage,
    pageSize,
    totalPages,
    paginatedData,
    setCurrentPage,
    setPageSize,
  } = usePagination({
    data: propostas,
    initialPageSize: 10,
  });

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="rounded-lg bg-purple-500/10 p-2 ring-1 ring-purple-500/20">
            <FileCheck className="size-4 text-purple-600 dark:text-purple-500" />
          </div>
          Propostas Ativas
          {propostas.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {propostas.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {propostas.length === 0 ? (
          <EmptyState icon={FileCheck} description="Nenhuma proposta ativa no momento" />
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Seguradora</TableHead>
                    <TableHead>Prêmio</TableHead>
                    <TableHead>Vigência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((proposta) => {
                    const nomeCliente =
                      proposta.cliente.tipoPessoa === 'PF'
                        ? proposta.cliente.nome
                        : proposta.cliente.nomeFantasia ||
                          proposta.cliente.razaoSocial;

                    return (
                      <TableRow
                        key={proposta.id}
                        className="group hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-sm">
                              {proposta.numero}
                            </span>
                            {proposta.numeroPropostaExterno && (
                              <span className="text-xs text-muted-foreground">
                                Ext: {proposta.numeroPropostaExterno}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {nomeCliente}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {proposta.produto.nomeProduto}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {proposta.seguradoraParceira
                            ? proposta.seguradoraParceira.nomeFantasia ||
                              proposta.seguradoraParceira.razaoSocial
                            : '-'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {proposta.premioLiquido
                            ? proposta.premioLiquido.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5 text-sm">
                            <span>
                              {new Date(
                                proposta.vigenciaInicio,
                              ).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              até{' '}
                              {new Date(
                                proposta.vigenciaFim,
                              ).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(proposta.status)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onVisualizar(proposta)}
                              title="Visualizar"
                            >
                              <Eye className="size-4" />
                            </Button>
                            {[
                              'AGUARDANDO_ENVIO',
                              'PENDENTE_DOCUMENTACAO',
                            ].includes(proposta.status) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEditar(proposta)}
                                title="Editar"
                              >
                                <Edit className="size-4" />
                              </Button>
                            )}
                            {proposta.status === 'APROVADA' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onConfirmarVenda(proposta)}
                                title="Confirmar Venda"
                              >
                                <CheckCircle2 className="size-4 text-green-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {propostas.length > 10 && (
              <DataTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={propostas.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
