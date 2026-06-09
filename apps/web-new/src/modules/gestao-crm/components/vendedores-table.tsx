
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { useVendedoresStats } from '../http';
import { useAuthStore } from '@/infra/auth/auth-store';
import { Users, TrendingUp, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/core/ui/skeleton';

interface VendedoresTableProps {
  onSelectVendedor?: (vendedorId: string) => void;
}

export function VendedoresTable({ onSelectVendedor }: VendedoresTableProps) {
  const { user } = useAuthStore();
  const { data: vendedores = [], isLoading } = useVendedoresStats({ enabled: !!(user?.isAdmin || user?.isGestor) });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Performance da Equipe
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : vendedores.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum vendedor encontrado
          </p>
        ) : (
          <>
            {/* Mobile: card stack */}
            <div className="sm:hidden space-y-2">
              {vendedores.map((vendedor) => {
                const emAndamento = vendedor.stats.contatoInicial + vendedor.stats.negociacao;
                return (
                  <div
                    key={vendedor.id}
                    className="border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onSelectVendedor?.(vendedor.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{vendedor.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{vendedor.email}</p>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Badge variant="outline" className="text-xs">{vendedor.stats.total} total</Badge>
                      <Badge variant="default" className="bg-green-600 text-xs">{vendedor.stats.ganhas} ganhas</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <TrendingUp className="h-3 w-3" />
                        {vendedor.stats.taxaConversao.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-green-600">
                        {vendedor.stats.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <span className="text-xs text-blue-600">
                        {vendedor.stats.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em neg.
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: tabela */}
            <div className="hidden sm:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center hidden lg:table-cell">Leads</TableHead>
                    <TableHead className="text-center hidden md:table-cell">Em Andamento</TableHead>
                    <TableHead className="text-center">Ganhas</TableHead>
                    <TableHead className="text-center hidden md:table-cell">Taxa Conversão</TableHead>
                    <TableHead className="text-right">Valor Ganho</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Em Negociação</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendedores.map((vendedor) => {
                    const emAndamento =
                      vendedor.stats.contatoInicial + vendedor.stats.negociacao;

                    return (
                      <TableRow key={vendedor.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{vendedor.nome}</div>
                            <div className="text-xs text-muted-foreground">
                              {vendedor.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{vendedor.stats.total}</Badge>
                        </TableCell>
                        <TableCell className="text-center hidden lg:table-cell">
                          {vendedor.stats.leads}
                        </TableCell>
                        <TableCell className="text-center hidden md:table-cell">
                          <Badge variant="secondary">{emAndamento}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="default" className="bg-green-600">
                            {vendedor.stats.ganhas}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center hidden md:table-cell">
                          <div className="flex items-center justify-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {vendedor.stats.taxaConversao.toFixed(1)}%
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {vendedor.stats.valorTotal.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </TableCell>
                        <TableCell className="text-right font-medium text-blue-600 hidden lg:table-cell">
                          {vendedor.stats.valorEstimado.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelectVendedor?.(vendedor.id)}
                          >
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
