
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/ui/table';
import { Badge } from '@/core/ui/badge';
import { Skeleton } from '@/core/ui/skeleton';
import { useCampanhaAuditoria } from '../http';

interface CampanhaAuditoriaDialogProps {
  open: boolean;
  onClose: () => void;
  campanha: any | null;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR');
}

function formatCurrency(value: string | number | null | undefined) {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

export function CampanhaAuditoriaDialog({ open, onClose, campanha }: CampanhaAuditoriaDialogProps) {
  const { data: registros = [], isLoading } = useCampanhaAuditoria(campanha?.id ?? '');

  const total = registros.reduce((sum: number, r: any) => sum + (Number(r.premioLiquido) || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Auditoria — {campanha?.titulo}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Vendas aprovadas no período · {registros.length} registro(s)
            {total > 0 && (
              <span className="ml-2 font-medium text-foreground">
                · Total: {formatCurrency(total)}
              </span>
            )}
          </p>
        </DialogHeader>

        <div className="overflow-auto flex-1">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : registros.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground text-sm">
              Nenhuma venda aprovada encontrada neste período.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Documento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Prêmio</TableHead>
                  <TableHead>Aprovado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registros.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.numero}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{r.clienteNome ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.vendedorNome ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(r.premioLiquido)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(r.data)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
