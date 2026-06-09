
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
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Skeleton } from '@/core/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/core/ui/collapsible';
import { ChevronLeft, ChevronRight, ChevronDown, PackageOpen } from 'lucide-react';
import { useHistoricoConfigs, type ComissaoConfigHistoricoItem } from '../http';
import { cn } from '@/core/utils';

function OperacaoBadge({ value }: { value: 'CRIACAO' | 'ATUALIZACAO' | 'EXCLUSAO' }) {
  if (value === 'CRIACAO')
    return (
      <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/10 font-normal">
        Criação
      </Badge>
    );
  if (value === 'EXCLUSAO')
    return (
      <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/10 font-normal">
        Exclusão
      </Badge>
    );
  return (
    <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/10 font-normal">
      Atualização
    </Badge>
  );
}

function EscopoBadge({ value }: { value: string }) {
  const labels: Record<string, string> = {
    global: 'Global',
    cargo: 'Por Cargo',
    vendedor: 'Por Vendedor',
  };
  return (
    <Badge variant="outline" className="font-normal text-xs">
      {labels[value] ?? value}
    </Badge>
  );
}

function ExpandableRow({ item }: { item: ComissaoConfigHistoricoItem }) {
  const [open, setOpen] = useState(false);
  const date = new Date(item.createdAt);

  const formatData = (data: Record<string, any> | null) => {
    if (!data) return '—';
    const relevant = ['tipoSeguro', 'tipoNegocio', 'percentualParticipacao', 'nomeCargo', 'nomeVendedor', 'cargoId', 'usuarioId'];
    const filtered = Object.fromEntries(
      Object.entries(data).filter(([k]) => relevant.includes(k)),
    );
    return (
      <div className="space-y-0.5">
        {Object.entries(filtered).map(([k, v]) => (
          <div key={k} className="flex gap-1.5 text-xs">
            <span className="text-muted-foreground shrink-0">{k}:</span>
            <span className="font-medium">{v === null ? 'null' : String(v)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <>
        <TableRow className={cn(open && 'bg-muted/20')}>
          <TableCell>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
          </TableCell>
          <TableCell>
            <OperacaoBadge value={item.tipoOperacao} />
          </TableCell>
          <TableCell>
            <EscopoBadge value={item.escopo} />
          </TableCell>
          <TableCell className="text-sm">{item.usuarioNome ?? '—'}</TableCell>
          <TableCell className="text-sm text-muted-foreground tabular-nums">
            {date.toLocaleDateString('pt-BR')}{' '}
            {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </TableCell>
        </TableRow>
        <CollapsibleContent asChild>
          <TableRow className="bg-muted/10 hover:bg-muted/10">
            <TableCell />
            <TableCell colSpan={4} className="pb-3 pt-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {item.tipoOperacao !== 'CRIACAO' && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Antes</p>
                    {formatData(item.dadosAntes)}
                  </div>
                )}
                {item.tipoOperacao !== 'EXCLUSAO' && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Depois</p>
                    {formatData(item.dadosDepois)}
                  </div>
                )}
                {item.tipoOperacao === 'EXCLUSAO' && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Dados removidos</p>
                    {formatData(item.dadosAntes)}
                  </div>
                )}
              </div>
            </TableCell>
          </TableRow>
        </CollapsibleContent>
      </>
    </Collapsible>
  );
}

export function HistoricoConfigs() {
  const [escopo, setEscopo] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useHistoricoConfigs({
    escopo: escopo || undefined,
    page,
    limit: 30,
  });

  const rows = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <div>
        <Select value={escopo || '__todos'} onValueChange={(v) => { setEscopo(v === '__todos' ? '' : v); setPage(1); }}>
          <SelectTrigger className="h-9 text-sm w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos">Todos os escopos</SelectItem>
            <SelectItem value="global">Global</SelectItem>
            <SelectItem value="cargo">Por Cargo</SelectItem>
            <SelectItem value="vendedor">Por Vendedor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[40px]" />
            <TableHead>Operação</TableHead>
            <TableHead>Escopo</TableHead>
            <TableHead>Usuário</TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            [1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                {Array.from({ length: 5 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <PackageOpen className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Nenhum histórico encontrado.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => <ExpandableRow key={row.id} item={row} />)
          )}
        </TableBody>
      </Table>

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
    </div>
  );
}
