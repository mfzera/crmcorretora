
import { useState } from 'react';
import { dayjs } from '@/core/utils/date-utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/ui/table';
import { Button } from '@/core/ui/button';
import { FileEdit, Eye } from 'lucide-react';
import { useEndossosPendentes } from '../http';
import type { Endosso } from '@/types/area-trabalho';
import { EndossoApprovalDialog } from './endosso-approval-dialog';
import { StatusBadge, EmptyState } from '@/core/components/shared';

export function EndossosPendentesTable({ enabled = true }: { enabled?: boolean }) {
  const { data: endossos = [], isLoading, isError } = useEndossosPendentes({ enabled });
  const [selectedEndosso, setSelectedEndosso] = useState<Endosso | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAnalisar = (endosso: Endosso) => {
    setSelectedEndosso(endosso);
    setDialogOpen(true);
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getClienteName = (endosso: Endosso) => {
    const cliente = endosso.documentoVenda.cliente;
    if (cliente.tipoPessoa === 'PF') {
      return cliente.nome || 'Sem nome';
    }
    return cliente.razaoSocial || cliente.nomeFantasia || 'Sem razão social';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Carregando endossos...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          Sem permissão para visualizar endossos.
        </p>
      </div>
    );
  }

  if (endossos.length === 0) {
    return <EmptyState icon={FileEdit} description="Nenhum endosso aguardando aprovação" />;
  }

  return (
    <>
      {/* Mobile: cards */}
      <div className="md:hidden space-y-2">
        {endossos.map((endosso: Endosso) => (
          <div
            key={endosso.id}
            className="border border-border/50 rounded-lg p-3 hover:bg-muted/30 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">{endosso.numeroEndosso}</span>
                <StatusBadge status={endosso.tipoEndosso} />
              </div>
              <div>
                <p className="font-medium text-sm truncate">{getClienteName(endosso)}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {endosso.documentoVenda.produto.nomeProduto}
                </p>
                <p className="text-[11px] text-muted-foreground/80 font-mono truncate">
                  {endosso.documentoVenda.numeroApoliceExterna || endosso.documentoVenda.numeroDocumento}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-medium ${
                    (endosso.diferencaPremio || 0) >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(endosso.diferencaPremio)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {dayjs(endosso.dataSolicitacao).format('DD/MM/YYYY HH:mm')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                Vendedor: {endosso.vendedor.nome}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleAnalisar(endosso)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Analisar
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Apólice</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Diferença</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {endossos.map((endosso: Endosso) => (
              <TableRow key={endosso.id}>
                <TableCell className="font-medium">
                  {endosso.numeroEndosso}
                </TableCell>
                <TableCell>
                  <StatusBadge status={endosso.tipoEndosso} />
                </TableCell>
                <TableCell>{getClienteName(endosso)}</TableCell>
                <TableCell>
                  {endosso.documentoVenda.numeroApoliceExterna ||
                    endosso.documentoVenda.numeroDocumento}
                </TableCell>
                <TableCell>
                  {endosso.documentoVenda.produto.nomeProduto}
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      (endosso.diferencaPremio || 0) >= 0
                        ? 'text-green-600 dark:text-green-400 font-medium'
                        : 'text-red-600 dark:text-red-400 font-medium'
                    }
                  >
                    {formatCurrency(endosso.diferencaPremio)}
                  </span>
                </TableCell>
                <TableCell>{endosso.vendedor.nome}</TableCell>
                <TableCell>
                  {dayjs(endosso.dataSolicitacao).format('DD/MM/YYYY HH:mm')}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAnalisar(endosso)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Analisar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedEndosso && (
        <EndossoApprovalDialog
          endosso={selectedEndosso}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </>
  );
}
