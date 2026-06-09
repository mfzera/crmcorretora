import { createFileRoute } from '@tanstack/react-router';

import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import {
  Users,
  User,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  ArrowRightLeft,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Badge } from '@/core/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/core/ui/tabs';
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
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/core/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/core/ui/alert';
import { Skeleton } from '@/core/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { useClientes, clientesQueryOptions } from '@/modules/clientes/http';
import { ProtectedComponent } from '@/modules/auth/components/protected-component';
import { usePermissions } from '@/core/hooks/use-permissions';
import { useAuthStore } from '@/infra/auth/auth-store';
import { getNomeCliente } from '@/types/cliente';
import {
  formatCPF,
  formatCNPJ,
  formatPhone,
} from '@/core/validators/documento';
import { PageGuard } from '@/modules/auth/components/page-guard';
import { PageHeader, EmptyState } from '@/core/components/shared';

export const Route = createFileRoute('/_app/clientes')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(clientesQueryOptions(undefined, 1, 15)).catch(() => {}),
  component: ClientesPage,
});


const NovoClienteDialog = lazy(() => import('@/modules/clientes/components/novo-cliente-dialog').then((m) => ({ default: m.NovoClienteDialog })));
const VisualizarClienteDialog = lazy(() => import('@/modules/clientes/components/visualizar-cliente-dialog').then((m) => ({ default: m.VisualizarClienteDialog })));
const EditarClienteDialog = lazy(() => import('@/modules/clientes/components/editar-cliente-dialog').then((m) => ({ default: m.EditarClienteDialog })));
const ExcluirClienteDialog = lazy(() => import('@/modules/clientes/components/excluir-cliente-dialog').then((m) => ({ default: m.ExcluirClienteDialog })));
const TransferirClienteDialog = lazy(() => import('@/modules/clientes/components/transferir-cliente-dialog').then((m) => ({ default: m.TransferirClienteDialog })));

type TipoPessoaFilter = 'PF' | 'PJ' | null;
type StatusFilter = 'ativo' | 'inativo' | 'nao_ativo' | null;

function ClientesPage() {
  return (
    <PageGuard permission="clientes:visualizar">
      <ClientesPageContent />
    </PageGuard>
  );
}

function ClientesPageContent() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tipoPessoaFilter, setTipoPessoaFilter] =
    useState<TipoPessoaFilter>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'transferred'>(
    'mine',
  );
  const itemsPerPage = 15;

  const { hasPermission } = usePermissions();
  const { user } = useAuthStore();
  const canViewAll = hasPermission('clientes:visualizar_todos');

  // Debounce: só dispara query após 300ms parado de digitar
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchInput]);

  // Resetar página ao mudar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [tipoPessoaFilter, statusFilter, activeTab]);

  // Montar filtros server-side
  const filtros = {
    ...(debouncedSearch ? { busca: debouncedSearch } : {}),
    ...(tipoPessoaFilter ? { tipoPessoa: tipoPessoaFilter } : {}),
    ...(statusFilter === 'ativo' ? { ativo: true } : {}),
    ...(statusFilter === 'inativo' ? { ativo: false } : {}),
    ...(statusFilter === 'nao_ativo' ? { isActiveCliente: false } : {}),
    ...(canViewAll && activeTab === 'mine' && user?.id
      ? { vendedorId: user.id }
      : {}),
    ...(canViewAll && activeTab === 'transferred'
      ? { soTransferidos: true }
      : {}),
  };

  const { data, isLoading, isError, error, refetch } = useClientes(
    filtros,
    currentPage,
    itemsPerPage,
  );

  const clientes = Array.isArray(data) ? data : data?.data || [];
  const totalPaginas = data?.meta?.totalPages ?? 1;
  const totalClientes = data?.meta?.total ?? clientes.length;

  const hasActiveFilters = tipoPessoaFilter !== null || statusFilter !== null;

  const clearFilters = () => {
    setTipoPessoaFilter(null);
    setStatusFilter(null);
    setCurrentPage(1);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'all' | 'mine' | 'transferred');
    setCurrentPage(1);
  };

  const startIndex = (currentPage - 1) * itemsPerPage;

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 p-3 sm:p-6 md:p-8">
      <PageHeader
        icon={Users}
        title="Clientes"
        description="Gerencie todos os seus clientes em um só lugar"
        actions={
          <Suspense fallback={null}>
            <NovoClienteDialog onSuccess={() => refetch()} />
          </Suspense>
        }
      />

      {/* Tabs - reserva espaço sempre para evitar CLS quando canViewAll carrega */}
      <div className="min-h-10">
        {canViewAll && (
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="w-full sm:w-auto overflow-x-auto justify-start">
              <TabsTrigger value="mine" className="gap-2 shrink-0">
                <User className="size-4" />
                <span className="hidden sm:inline">Meus Clientes</span>
                <span className="sm:hidden">Meus</span>
              </TabsTrigger>
              <TabsTrigger value="transferred" className="gap-2 shrink-0">
                <ArrowRightLeft className="size-4" />
                <span className="hidden sm:inline">Transferidos para Mim</span>
                <span className="sm:hidden">Transferidos</span>
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-2 shrink-0">
                <Users className="size-4" />
                <span className="hidden sm:inline">Todos os Clientes</span>
                <span className="sm:hidden">Todos</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros
                    {hasActiveFilters && (
                      <Badge
                        variant="secondary"
                        className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center"
                      >
                        {(tipoPessoaFilter ? 1 : 0) + (statusFilter ? 1 : 0)}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[90vw] sm:w-56">
                  <DropdownMenuLabel>Tipo de Pessoa</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={tipoPessoaFilter === 'PF'}
                    onCheckedChange={(checked) =>
                      setTipoPessoaFilter(checked ? 'PF' : null)
                    }
                  >
                    Pessoa Física
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={tipoPessoaFilter === 'PJ'}
                    onCheckedChange={(checked) =>
                      setTipoPessoaFilter(checked ? 'PJ' : null)
                    }
                  >
                    Pessoa Jurídica
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuLabel>Status</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === 'ativo'}
                    onCheckedChange={(checked) =>
                      setStatusFilter(checked ? 'ativo' : null)
                    }
                  >
                    Ativo
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === 'inativo'}
                    onCheckedChange={(checked) =>
                      setStatusFilter(checked ? 'inativo' : null)
                    }
                  >
                    Inativo
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === 'nao_ativo'}
                    onCheckedChange={(checked) =>
                      setStatusFilter(checked ? 'nao_ativo' : null)
                    }
                  >
                    Não Ativo
                  </DropdownMenuCheckboxItem>

                  {hasActiveFilters && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={clearFilters}
                        className="text-destructive focus:text-destructive"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Limpar Filtros
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Warning */}
      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar clientes</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Clientes Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Lista de Clientes</span>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={totalClientes === 0 ? 'invisible' : ''}
              >
                {totalClientes} clientes
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="overflow-hidden rounded-lg border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nome/Razão Social</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    {canViewAll && <TableHead>Responsável</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(itemsPerPage)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-10 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28 font-mono" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      {canViewAll && <TableCell><Skeleton className="h-4 w-28" /></TableCell>}
                      <TableCell><Skeleton className="h-5 w-12 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : clientes.length === 0 && debouncedSearch ? (
            <EmptyState
              icon={Search}
              description={`Nenhum cliente encontrado com "${debouncedSearch}"`}
            />
          ) : clientes.length === 0 ? (
            <EmptyState
              icon={Users}
              description="Nenhum cliente cadastrado ainda"
              action={
                <Suspense fallback={null}>
                  <NovoClienteDialog onSuccess={() => refetch()} />
                </Suspense>
              }
            />
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="md:hidden space-y-2">
                {clientes.map((cliente) => (
                  <div
                    key={cliente.id}
                    className="border border-border/50 rounded-lg p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={
                              cliente.tipoPessoa === 'PF' ? 'default' : 'secondary'
                            }
                            className="shrink-0"
                          >
                            {cliente.tipoPessoa}
                          </Badge>
                          {!cliente.ativo ? (
                            <Badge variant="secondary" className="shrink-0">Inativo</Badge>
                          ) : cliente.isActiveCliente === false ? (
                            <Badge variant="outline" className="shrink-0 border-amber-500 text-amber-600">
                              Não Ativo
                            </Badge>
                          ) : (
                            <Badge variant="default" className="shrink-0">Ativo</Badge>
                          )}
                        </div>
                        <p className="font-medium text-sm truncate">
                          {getNomeCliente(cliente)}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {cliente.tipoPessoa === 'PF'
                            ? formatCPF(cliente.cpf!)
                            : formatCNPJ(cliente.cnpj!)}
                        </p>
                        {cliente.email && (
                          <p className="text-xs text-muted-foreground truncate">
                            {cliente.email}
                          </p>
                        )}
                        {cliente.telefone && (
                          <p className="text-xs text-muted-foreground">
                            {formatPhone(cliente.telefone)}
                          </p>
                        )}
                        {canViewAll && cliente.vendedor?.nome && (
                          <p className="text-[11px] text-muted-foreground/70">
                            Resp.: {cliente.vendedor.nome}
                          </p>
                        )}
                      </div>
                      <ClienteActionsDropdown cliente={cliente} refetch={refetch} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: tabela */}
              <div className="hidden md:block overflow-hidden rounded-lg border border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nome/Razão Social</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      {canViewAll && <TableHead>Responsável</TableHead>}
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientes.map((cliente) => (
                      <TableRow
                        key={cliente.id}
                        className="group hover:bg-muted/30 transition-colors"
                      >
                        <TableCell>
                          <Badge
                            variant={
                              cliente.tipoPessoa === 'PF'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {cliente.tipoPessoa}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {getNomeCliente(cliente)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {cliente.tipoPessoa === 'PF'
                            ? formatCPF(cliente.cpf!)
                            : formatCNPJ(cliente.cnpj!)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cliente.email}
                        </TableCell>
                        <TableCell>
                          {formatPhone(cliente.telefone)}
                        </TableCell>
                        {canViewAll && (
                          <TableCell className="text-muted-foreground text-sm">
                            {cliente.vendedor?.nome || '—'}
                          </TableCell>
                        )}
                        <TableCell>
                          {!cliente.ativo ? (
                            <Badge variant="secondary">Inativo</Badge>
                          ) : cliente.isActiveCliente === false ? (
                            <Badge variant="outline" className="border-amber-500 text-amber-600">
                              Não Ativo
                            </Badge>
                          ) : (
                            <Badge variant="default">Ativo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <ClienteActionsDropdown cliente={cliente} refetch={refetch} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t">
              <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                <span className="hidden sm:inline">Mostrando </span>
                {startIndex + 1}–{Math.min(startIndex + itemsPerPage, totalClientes)} de {totalClientes}
                <span className="hidden sm:inline"> clientes</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </Button>
                <span className="text-xs sm:hidden text-muted-foreground tabular-nums">
                  Página {currentPage} de {totalPaginas}
                </span>
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(
                    (page) => {
                      if (
                        page === 1 ||
                        page === totalPaginas ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <Button
                            key={page}
                            variant={
                              currentPage === page ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-9"
                          >
                            {page}
                          </Button>
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <span key={page} className="px-1">
                            ...
                          </span>
                        );
                      }
                      return null;
                    },
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPaginas, prev + 1))
                  }
                  disabled={currentPage === totalPaginas}
                >
                  <span className="hidden sm:inline">Próximo</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClienteActionsDropdown({
  cliente,
  refetch,
}: {
  cliente: any;
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
        <Suspense fallback={null}>
          <VisualizarClienteDialog
            cliente={cliente}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Eye className="mr-2 h-4 w-4" />
                Visualizar
              </DropdownMenuItem>
            }
          />
        </Suspense>
        <ProtectedComponent permission="clientes:editar">
          <Suspense fallback={null}>
            <EditarClienteDialog
              cliente={cliente}
              onSuccess={() => refetch()}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              }
            />
          </Suspense>
        </ProtectedComponent>
        <ProtectedComponent permission="clientes:transferir_carteira">
          <Suspense fallback={null}>
            <TransferirClienteDialog
              cliente={cliente}
              onSuccess={() => refetch()}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transferir
                </DropdownMenuItem>
              }
            />
          </Suspense>
        </ProtectedComponent>
        <ProtectedComponent permission="clientes:excluir">
          <Suspense fallback={null}>
            <ExcluirClienteDialog
              cliente={cliente}
              onSuccess={() => refetch()}
              trigger={
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              }
            />
          </Suspense>
        </ProtectedComponent>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
