
import { useNavigate } from '@tanstack/react-router';
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
import { Badge } from '@/core/ui/badge';
import { Skeleton } from '@/core/ui/skeleton';
import { FileSpreadsheet, ExternalLink } from 'lucide-react';
import { ImportacaoStatusBadge } from './import-status-badge';
import type { ImportacaoResumo } from '../http';

interface ImportHistoryTableProps {
  importacoes: ImportacaoResumo[];
  isLoading?: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function ImportHistoryTable({
  importacoes,
  isLoading,
  page,
  totalPages,
  total,
  onPageChange,
}: ImportHistoryTableProps) {
  const navigate = useNavigate();
  

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (importacoes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border rounded-lg gap-2">
        <FileSpreadsheet className="h-10 w-10 opacity-40" />
        <p>Nenhuma importação encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Data</TableHead>
              <TableHead>Arquivo</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-center">
                <span className="text-green-600">Sucesso</span>
              </TableHead>
              <TableHead className="text-center">
                <span className="text-red-600">Erros</span>
              </TableHead>
              <TableHead className="text-center">
                <span className="text-blue-600">Pendentes</span>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {importacoes.map((imp) => (
              <TableRow
                key={imp.id}
                className="cursor-pointer hover:bg-muted/30"
                onClick={() =>
                  navigate({ to: `/importar-renovacoes/${imp.id}` })
                }
              >
                <TableCell className="text-sm whitespace-nowrap">
                  {dayjs(imp.createdAt).format('DD/MM/YY HH:mm')}
                </TableCell>
                <TableCell className="max-w-[180px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileSpreadsheet className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate" title={imp.nomeArquivo}>
                      {imp.nomeArquivo}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {imp.usuarioNome ?? '—'}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{imp.totalLinhas}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  {imp.totalSucesso > 0 ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0">
                      {imp.totalSucesso}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">0</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {imp.totalErros > 0 ? (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0">
                      {imp.totalErros}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">0</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {imp.totalPendentes > 0 ? (
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-0">
                      {imp.totalPendentes}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">0</span>
                  )}
                </TableCell>
                <TableCell>
                  <ImportacaoStatusBadge status={imp.status} />
                </TableCell>
                <TableCell>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total} importação{total !== 1 ? 'ões' : ''} · Página {page} de{' '}
            {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={(e) => {
                e.stopPropagation();
                onPageChange(page - 1);
              }}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={(e) => {
                e.stopPropagation();
                onPageChange(page + 1);
              }}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
