
import { useState } from 'react';
import {
  Shield,
  Search,
  MoreVertical,
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
import { useSeguradorasParceiras } from '@/modules/seguradoras-parceiras/http';
import { useAuthStore } from '@/infra/auth/auth-store';
import { SeguradoraDialog } from '@/modules/seguradoras-parceiras/components/seguradora-dialog';
import { ExcluirSeguradoraDialog } from '@/modules/seguradoras-parceiras/components/excluir-seguradora-dialog';

type StatusFilter = 'ATIVA' | 'INATIVA' | 'TODAS';

export function SeguradorasList() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ATIVA');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { data, isLoading, refetch } = useSeguradorasParceiras({
    status: statusFilter,
    search: searchTerm,
    page: currentPage,
    limit: itemsPerPage,
  });

  const seguradoras = data?.data || [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages || 0;
  const totalItems = pagination?.total || 0;

  const hasPermission =
    user?.permissoes?.includes('config:gerenciar_seguradoras_parceiras') ||
    user?.isAdmin;

  const formatCNPJ = (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length === 14) {
      return cleaned.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        '$1.$2.$3/$4-$5',
      );
    }
    return cnpj;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const hasActiveFilters = statusFilter !== 'ATIVA' || searchTerm !== '';

  const clearFilters = () => {
    setStatusFilter('ATIVA');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Seguradoras Parceiras</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie as seguradoras parceiras
          </p>
        </div>
        {hasPermission && <SeguradoraDialog onSuccess={() => refetch()} />}
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                value={statusFilter}
                onValueChange={(value: StatusFilter) => {
                  setStatusFilter(value);
                  handleFilterChange();
                }}
              >
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas</SelectItem>
                  <SelectItem value="ATIVA">Ativas</SelectItem>
                  <SelectItem value="INATIVA">Inativas</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && statusFilter === 'ATIVA' && searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2"
                >
                  <X className="size-4" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {!isLoading &&
        seguradoras.length === 0 &&
        !searchTerm &&
        statusFilter === 'ATIVA' && (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertTitle>Nenhuma seguradora cadastrada</AlertTitle>
            <AlertDescription>
              Comece cadastrando as seguradoras parceiras com quem sua corretora
              trabalha.
            </AlertDescription>
          </Alert>
        )}

      {/* Seguradoras Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Lista de Seguradoras</span>
            {totalItems > 0 && (
              <Badge variant="secondary" className="font-normal">
                {totalItems} seguradora{totalItems !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Carregando seguradoras...
            </div>
          ) : seguradoras.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {searchTerm || statusFilter !== 'ATIVA'
                ? 'Nenhuma seguradora encontrada com os filtros aplicados.'
                : 'Nenhuma seguradora cadastrada ainda.'}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Razão Social</TableHead>
                      <TableHead>Nome Fantasia</TableHead>
                      <TableHead>Contatos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead className="w-[70px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seguradoras.map((seguradora) => (
                      <TableRow key={seguradora.id}>
                        <TableCell className="font-mono text-sm">
                          {formatCNPJ(seguradora.cnpj)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {seguradora.razaoSocial}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {seguradora.nomeFantasia || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            {seguradora.telefone && (
                              <div className="text-muted-foreground">
                                {seguradora.telefone}
                              </div>
                            )}
                            {seguradora.email && (
                              <div className="text-muted-foreground">
                                {seguradora.email}
                              </div>
                            )}
                            {!seguradora.telefone && !seguradora.email && '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              seguradora.status === 'ATIVA'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {seguradora.status === 'ATIVA'
                              ? 'Ativa'
                              : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(seguradora.createdAt)}
                        </TableCell>
                        <TableCell>
                          {hasPermission && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <SeguradoraDialog
                                  corretoraId={seguradora.id}
                                  trigger={
                                    <DropdownMenuItem
                                      onSelect={(e) => e.preventDefault()}
                                    >
                                      <Edit className="mr-2 size-4" />
                                      Editar
                                    </DropdownMenuItem>
                                  }
                                  onSuccess={() => refetch()}
                                />
                                <DropdownMenuSeparator />
                                <ExcluirSeguradoraDialog
                                  corretoraId={seguradora.id}
                                  trigger={
                                    <DropdownMenuItem
                                      onSelect={(e) => e.preventDefault()}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="mr-2 size-4" />
                                      Excluir
                                    </DropdownMenuItem>
                                  }
                                  onSuccess={() => refetch()}
                                />
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4">
                  <p className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="size-4 mr-1" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                      <ChevronRight className="size-4 ml-1" />
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
