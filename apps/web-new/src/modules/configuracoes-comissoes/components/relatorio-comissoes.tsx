
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Skeleton } from '@/core/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/ui/table';
import { TrendingUp, CheckCircle2, Clock, XCircle, Users, Package } from 'lucide-react';
import { useRelatorioComissoes } from '../http';

const fmt = (value: string | null | undefined) =>
  value
    ? parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'R$ 0,00';

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tabular-nums mt-0.5">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={['flex h-9 w-9 items-center justify-center rounded-lg', color].join(' ')}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RelatorioComissoes() {
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  const ultimoDia = hoje.toISOString().slice(0, 10);

  const [dataInicio, setDataInicio] = useState(primeiroDia);
  const [dataFim, setDataFim] = useState(ultimoDia);

  const { data, isLoading } = useRelatorioComissoes({ dataInicio, dataFim });

  const totais = data?.totais;
  const porVendedor = data?.porVendedor ?? [];
  const porProduto = data?.porProduto ?? [];

  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs">Período início</Label>
          <Input
            type="date"
            className="h-9 text-sm w-[150px]"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Período fim</Label>
          <Input
            type="date"
            className="h-9 text-sm w-[150px]"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </div>
      </div>

      {/* Cards de totais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-5 pb-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-7 w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <MetricCard
              label="Total em comissões"
              value={fmt(totais?.totalComissoes)}
              sub={`${totais?.qtdDocumentos ?? 0} documentos`}
              icon={TrendingUp}
              color="bg-primary/10 text-primary"
            />
            <MetricCard
              label="Pago"
              value={fmt(totais?.totalPago)}
              sub={`${totais?.qtdPago ?? 0} documentos`}
              icon={CheckCircle2}
              color="bg-green-500/10 text-green-600"
            />
            <MetricCard
              label="Pendente"
              value={fmt(totais?.totalPendente)}
              sub={`${totais?.qtdPendente ?? 0} documentos`}
              icon={Clock}
              color="bg-amber-500/10 text-amber-600"
            />
            <MetricCard
              label="Cancelado"
              value={fmt(totais?.totalCancelado)}
              icon={XCircle}
              color="bg-red-500/10 text-red-600"
            />
          </>
        )}
      </div>

      {/* Ranking por vendedor e por produto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              Top vendedores
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-3">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-4">Vendedor</TableHead>
                  <TableHead className="text-right px-4">Comissão</TableHead>
                  <TableHead className="text-right px-4">Docs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell className="px-4"><Skeleton className="h-4 w-full" /></TableCell>
                      <TableCell className="px-4"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="px-4"><Skeleton className="h-4 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : porVendedor.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6 px-4">
                      Sem dados no período
                    </TableCell>
                  </TableRow>
                ) : (
                  porVendedor.map((v) => (
                    <TableRow key={v.vendedorId}>
                      <TableCell className="px-4 font-medium text-sm">{v.nomeVendedor}</TableCell>
                      <TableCell className="text-right px-4 tabular-nums text-sm">
                        {fmt(v.totalComissao)}
                      </TableCell>
                      <TableCell className="text-right px-4 text-muted-foreground text-sm">
                        {v.qtdDocumentos}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Package className="h-4 w-4 text-muted-foreground" />
              Por produto
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-3">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-4">Produto</TableHead>
                  <TableHead className="text-right px-4">Comissão</TableHead>
                  <TableHead className="text-right px-4">Docs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell className="px-4"><Skeleton className="h-4 w-full" /></TableCell>
                      <TableCell className="px-4"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="px-4"><Skeleton className="h-4 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : porProduto.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6 px-4">
                      Sem dados no período
                    </TableCell>
                  </TableRow>
                ) : (
                  porProduto.map((p) => (
                    <TableRow key={p.produtoId}>
                      <TableCell className="px-4 font-medium text-sm">{p.nomeProduto}</TableCell>
                      <TableCell className="text-right px-4 tabular-nums text-sm">
                        {fmt(p.totalComissao)}
                      </TableCell>
                      <TableCell className="text-right px-4 text-muted-foreground text-sm">
                        {p.qtdDocumentos}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
