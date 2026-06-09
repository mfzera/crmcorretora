
import { useEffect, useState, useTransition } from 'react';
import {
  Package,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Badge } from '@/core/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/core/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/core/ui/alert';
import { AlertCircle } from 'lucide-react';
import { NovoProdutoDialog } from '@/modules/produtos/components/novo-produto-dialog';
import { VisualizarProdutoDialog } from '@/modules/produtos/components/visualizar-produto-dialog';
import { EditarProdutoDialog } from '@/modules/produtos/components/editar-produto-dialog';
import { ExcluirProdutoDialog } from '@/modules/produtos/components/excluir-produto-dialog';
import { useProdutos } from '@/modules/produtos/http';
import {
  TipoSeguro,
  getTipoSeguroLabel,
  getTipoSeguroBadgeColor,
} from '@/types/produto';
import { useAuthStore } from '@/infra/auth/auth-store';

type TipoSeguroFilter = TipoSeguro | 'TODOS';
type StatusFilter = boolean | 'TODOS';

export function ProdutosList() {
  const { user } = useAuthStore();
  const [inputSearchTerm, setInputSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoSeguroFilter, setTipoSeguroFilter] =
    useState<TipoSeguroFilter>('TODOS');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('TODOS');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [, startTransition] = useTransition();

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setSearchTerm(inputSearchTerm);
        setCurrentPage(1);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [inputSearchTerm]);

  const { data, isLoading, refetch } = useProdutos(
    {
      tipoSeguro: tipoSeguroFilter,
      ativo: statusFilter,
      search: searchTerm,
    },
    currentPage,
    itemsPerPage,
  );

  const produtos = data?.data || [];
  const totalPages = data?.totalPaginas || 0;
  const totalItems = data?.total || 0;

  const hasPermission =
    user?.permissoes?.includes('config:gerenciar_produtos') || user?.isAdmin;

  const formatCurrency = (value: string | null | undefined) => {
    if (!value) return '-';
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  const formatPercentage = (value: string | null | undefined) => {
    if (!value) return '-';
    return `${parseFloat(value).toFixed(2)}%`;
  };

  const hasActiveFilters =
    tipoSeguroFilter !== 'TODOS' || statusFilter !== 'TODOS';

  const clearFilters = () => {
    startTransition(() => {
      setTipoSeguroFilter('TODOS');
      setStatusFilter('TODOS');
      setCurrentPage(1);
    });
  };

  const handleSearchChange = (value: string) => {
    setInputSearchTerm(value);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold">Produtos</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gerencie os produtos de seguro
          </p>
        </div>
        {hasPermission && <NovoProdutoDialog onSuccess={() => refetch()} />}
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome do produto..."
                value={inputSearchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                value={tipoSeguroFilter}
                onValueChange={(value) => {
                  startTransition(() => {
                    setTipoSeguroFilter(value as TipoSeguroFilter);
                    setCurrentPage(1);
                  });
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Tipo de Seguro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os Tipos</SelectItem>
                  {Object.values(TipoSeguro).map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {getTipoSeguroLabel(tipo)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(statusFilter)}
                onValueChange={(value) => {
                  startTransition(() => {
                    setStatusFilter(value === 'TODOS' ? 'TODOS' : value === 'true');
                    setCurrentPage(1);
                  });
                }}
              >
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="true">Ativos</SelectItem>
                  <SelectItem value="false">Inativos</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {!isLoading &&
        produtos.length === 0 &&
        !inputSearchTerm &&
        !hasActiveFilters && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Nenhum produto cadastrado</AlertTitle>
            <AlertDescription>
              Comece cadastrando produtos de seguro para sua seguradora.
            </AlertDescription>
          </Alert>
        )}

      {/* Produtos Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Lista de Produtos</span>
            {totalItems > 0 && (
              <Badge variant="secondary" className="font-normal">
                {totalItems} produto{totalItems !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Carregando produtos...
            </div>
          ) : produtos.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {inputSearchTerm || hasActiveFilters
                ? 'Nenhum produto encontrado com os filtros aplicados.'
                : 'Nenhum produto cadastrado ainda.'}
            </div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="md:hidden space-y-2">
                {produtos.map((produto) => (
                  <div
                    key={produto.id}
                    className="border border-border/50 rounded-lg p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`shrink-0 ${getTipoSeguroBadgeColor(produto.tipoSeguro)}`}
                          >
                            {getTipoSeguroLabel(produto.tipoSeguro)}
                          </Badge>
                          <Badge
                            variant={produto.ativo ? 'default' : 'secondary'}
                            className="shrink-0"
                          >
                            {produto.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm break-words">
                          {produto.nomeProduto}
                        </p>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>
                            Prêmio: {formatCurrency(produto.premioMinimo)} – {formatCurrency(produto.premioMaximo)}
                          </p>
                          <p>
                            Comissão: {formatPercentage(produto.percentualComissaoPadrao)}
                          </p>
                        </div>
                      </div>
                      <ProdutoActionsDropdown
                        produto={produto}
                        hasPermission={!!hasPermission}
                        refetch={refetch}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: tabela */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome do Produto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Prêmio Mínimo</TableHead>
                      <TableHead>Prêmio Máximo</TableHead>
                      <TableHead>Comissão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[70px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtos.map((produto) => (
                      <TableRow key={produto.id}>
                        <TableCell className="font-medium">
                          {produto.nomeProduto}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getTipoSeguroBadgeColor(
                              produto.tipoSeguro,
                            )}
                          >
                            {getTipoSeguroLabel(produto.tipoSeguro)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(produto.premioMinimo)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(produto.premioMaximo)}
                        </TableCell>
                        <TableCell>
                          {formatPercentage(produto.percentualComissaoPadrao)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={produto.ativo ? 'default' : 'secondary'}
                          >
                            {produto.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ProdutoActionsDropdown
                            produto={produto}
                            hasPermission={!!hasPermission}
                            refetch={refetch}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-2 py-4">
                  <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                    Página {currentPage} de {totalPages}
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startTransition(() => setCurrentPage((p) => Math.max(1, p - 1)))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Anterior</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startTransition(() => setCurrentPage((p) => Math.min(totalPages, p + 1)))}
                      disabled={currentPage === totalPages}
                    >
                      <span className="hidden sm:inline">Próxima</span>
                      <ChevronRight className="h-4 w-4 sm:ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProdutoActionsDropdown({
  produto,
  hasPermission,
  refetch,
}: {
  produto: any;
  hasPermission: boolean;
  refetch: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 sm:h-8 sm:w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <VisualizarProdutoDialog
          produtoId={produto.id}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Eye className="mr-2 h-4 w-4" />
              Visualizar
            </DropdownMenuItem>
          }
        />
        {hasPermission && (
          <>
            <EditarProdutoDialog
              produtoId={produto.id}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              }
              onSuccess={() => refetch()}
            />
            <DropdownMenuSeparator />
            <ExcluirProdutoDialog
              produtoId={produto.id}
              trigger={
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              }
              onSuccess={() => refetch()}
            />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
