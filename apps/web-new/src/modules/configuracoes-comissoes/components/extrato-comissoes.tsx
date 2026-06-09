
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { Input } from '@/core/ui/input';
import { Skeleton } from '@/core/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/core/ui/dialog';
import { Label } from '@/core/ui/label';
import { Textarea } from '@/core/ui/textarea';
import { ChevronLeft, ChevronRight, PackageOpen, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { DateInput } from '@/core/ui/date-input';
import {
  useExtratoComissoes,
  useUpdatePaymentStatus,
  type ExtratoComissaoItem,
  type StatusPagamentoComissao,
} from '../http';
import { useVendedores } from '@/modules/usuarios/http';

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function StatusPagamentoBadge({ value }: { value: StatusPagamentoComissao }) {
  if (value === 'PAGO')
    return (
      <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/10 font-normal gap-1">
        <CheckCircle2 className="h-3 w-3" /> Pago
      </Badge>
    );
  if (value === 'CANCELADO')
    return (
      <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/10 font-normal gap-1">
        <XCircle className="h-3 w-3" /> Cancelado
      </Badge>
    );
  return (
    <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/10 font-normal gap-1">
      <Clock className="h-3 w-3" /> Pendente
    </Badge>
  );
}

function AtualizarStatusDialog({
  item,
  open,
  onOpenChange,
}: {
  item: ExtratoComissaoItem;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [status, setStatus] = useState<StatusPagamentoComissao>(item.statusPagamentoComissao);
  const [dataPagamento, setDataPagamento] = useState(
    item.dataPagamentoComissao ? item.dataPagamentoComissao.slice(0, 10) : '',
  );
  const [observacao, setObservacao] = useState(item.observacaoPagamentoComissao ?? '');
  const atualizar = useUpdatePaymentStatus();

  const handleSave = async () => {
    await atualizar.mutateAsync({
      id: item.id,
      statusPagamentoComissao: status,
      dataPagamentoComissao: dataPagamento ? new Date(dataPagamento).toISOString() : null,
      observacaoPagamentoComissao: observacao || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atualizar pagamento — {item.numeroDocumento}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Status do pagamento</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusPagamentoComissao)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="PAGO">Pago</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {status === 'PAGO' && (
            <div className="space-y-1.5">
              <Label>Data do pagamento</Label>
              <DateInput
                value={dataPagamento}
                onChange={setDataPagamento}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Observação <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea
              rows={2}
              placeholder="Ex: Pago via transferência bancária..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={atualizar.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ExtratoComissoes() {
  const [vendedorId, setVendedorId] = useState('');
  const [statusPagamento, setStatusPagamento] = useState<StatusPagamentoComissao | ''>('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [page, setPage] = useState(1);
  const [editando, setEditando] = useState<ExtratoComissaoItem | null>(null);

  const { data: vendedores = [] } = useVendedores();
  const { data, isLoading } = useExtratoComissoes({
    vendedorId: vendedorId || undefined,
    statusPagamento: statusPagamento || undefined,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
    page,
    limit: 20,
  });

  const rows = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="w-[200px]">
          <Select value={vendedorId || '__todos'} onValueChange={(v) => { setVendedorId(v === '__todos' ? '' : v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todos os vendedores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos">Todos os vendedores</SelectItem>
              {vendedores.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[160px]">
          <Select value={statusPagamento || '__todos'} onValueChange={(v) => { setStatusPagamento(v === '__todos' ? '' : v as StatusPagamentoComissao); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos">Todos os status</SelectItem>
              <SelectItem value="PENDENTE">Pendente</SelectItem>
              <SelectItem value="PAGO">Pago</SelectItem>
              <SelectItem value="CANCELADO">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            className="h-9 text-sm w-[140px]"
            value={dataInicio}
            onChange={(e) => { setDataInicio(e.target.value); setPage(1); }}
          />
          <span className="text-muted-foreground text-sm">até</span>
          <Input
            type="date"
            className="h-9 text-sm w-[140px]"
            value={dataFim}
            onChange={(e) => { setDataFim(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Tabela */}
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Documento</TableHead>
            <TableHead>Vendedor</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead className="text-right">Prêmio</TableHead>
            <TableHead className="text-right">Comissão</TableHead>
            <TableHead className="text-right">Vendedor</TableHead>
            <TableHead>Status pgto.</TableHead>
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            [1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                {Array.from({ length: 8 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8}>
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <PackageOpen className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Nenhuma comissão encontrada para os filtros selecionados.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">{row.numeroDocumento}</TableCell>
                <TableCell className="font-medium">{row.nomeVendedor}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{row.nomeProduto}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.premioLiquido ? formatCurrency(parseFloat(row.premioLiquido)) : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.valorComissao ? formatCurrency(parseFloat(row.valorComissao)) : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.valorComissaoVendedor
                    ? formatCurrency(parseFloat(row.valorComissaoVendedor))
                    : row.valorComissao && !row.negocioCorretora
                    ? formatCurrency(parseFloat(row.valorComissao))
                    : '—'}
                </TableCell>
                <TableCell>
                  <StatusPagamentoBadge value={row.statusPagamentoComissao} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setEditando(row)}
                  >
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Paginação */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{pagination.total} registros</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2">
              {page} / {pagination.pages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={page === pagination.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {editando && (
        <AtualizarStatusDialog
          item={editando}
          open={!!editando}
          onOpenChange={(v) => { if (!v) setEditando(null); }}
        />
      )}
    </div>
  );
}
