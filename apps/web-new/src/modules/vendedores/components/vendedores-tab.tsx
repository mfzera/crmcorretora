import { useState } from 'react';
import {
  Search,
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  X,
  Users,
  SearchX,
  Phone,
  Mail,
} from 'lucide-react';
import { Input } from '@/core/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/core/ui/dropdown-menu';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/core/ui/alert-dialog';
import { useVendedores, useDeleteVendedor, type Vendedor, type VendedorTipo } from '@/modules/vendedores/http';
import { VendedorDialog } from './vendedor-dialog';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { cn } from '@/core/utils';

const TIPO_LABELS: Record<VendedorTipo, string> = {
  principal: 'Principal',
  secundario: 'Secundário',
  externo: 'Externo',
};

const TIPO_COLORS: Record<VendedorTipo, string> = {
  principal: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  secundario: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  externo: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
};

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function AvatarFallback({ nome }: { nome: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
      {getInitials(nome)}
    </div>
  );
}

export function VendedoresTab({
  onNew,
}: {
  onNew?: () => void;
}) {
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState<VendedorTipo | 'todos'>('todos');
  const [ativo, setAtivo] = useState<'true' | 'false' | 'todos'>('todos');
  const [page, setPage] = useState(1);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteNome, setDeleteNome] = useState('');

  const { data, isLoading } = useVendedores({
    page,
    limit: 20,
    search: search || undefined,
    tipo: tipo !== 'todos' ? tipo : undefined,
    ativo: ativo !== 'todos' ? ativo : undefined,
  });

  const deleteMutation = useDeleteVendedor();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Vendedor removido com sucesso');
    } catch (err) {
      handleApiError(err);
    } finally {
      setDeleteId(null);
    }
  };

  const hasFilters = search || tipo !== 'todos' || ativo !== 'todos';
  const clearFilters = () => {
    setSearch('');
    setTipo('todos');
    setAtivo('todos');
    setPage(1);
  };

  const vendedores = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>

            <Select
              value={tipo}
              onValueChange={(v) => { setTipo(v as VendedorTipo | 'todos'); setPage(1); }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="principal">Principal</SelectItem>
                <SelectItem value="secundario">Secundário</SelectItem>
                <SelectItem value="externo">Externo</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={ativo}
              onValueChange={(v) => { setAtivo(v as 'true' | 'false' | 'todos'); setPage(1); }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="true">Ativos</SelectItem>
                <SelectItem value="false">Inativos</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 shrink-0">
                <X className="h-4 w-4" />
                Limpar
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : vendedores.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              {hasFilters ? (
                <>
                  <SearchX className="h-10 w-10" />
                  <p className="text-sm">Nenhum vendedor encontrado com os filtros aplicados.</p>
                  <Button variant="outline" size="sm" onClick={clearFilters}>Limpar filtros</Button>
                </>
              ) : (
                <>
                  <Users className="h-10 w-10" />
                  <p className="text-sm">Nenhum vendedor cadastrado ainda.</p>
                  {onNew && (
                    <Button size="sm" onClick={onNew}>Adicionar primeiro vendedor</Button>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendedores.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <AvatarFallback nome={v.nome} />
                            <div>
                              <p className="font-medium text-sm">{v.nome}</p>
                              {v.observacoes && (
                                <p className="text-xs text-muted-foreground truncate max-w-48">
                                  {v.observacoes}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            {v.email && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {v.email}
                              </div>
                            )}
                            {v.telefone && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {v.telefone}
                              </div>
                            )}
                            {!v.email && !v.telefone && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn('text-xs', TIPO_COLORS[v.tipo])}
                          >
                            {TIPO_LABELS[v.tipo]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={v.ativo ? 'default' : 'secondary'}>
                            {v.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setEditId(v.id)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => { setDeleteId(v.id); setDeleteNome(v.nome); }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y">
                {vendedores.map((v) => (
                  <div key={v.id} className="flex items-start gap-3 p-4">
                    <AvatarFallback nome={v.nome} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm truncate">{v.nome}</p>
                        <Badge
                          variant="outline"
                          className={cn('text-xs shrink-0', TIPO_COLORS[v.tipo])}
                        >
                          {TIPO_LABELS[v.tipo]}
                        </Badge>
                      </div>
                      {v.email && (
                        <p className="text-xs text-muted-foreground mt-0.5">{v.email}</p>
                      )}
                      {v.telefone && (
                        <p className="text-xs text-muted-foreground">{v.telefone}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditId(v.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => { setDeleteId(v.id); setDeleteNome(v.nome); }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {pagination.total} vendedor{pagination.total !== 1 ? 'es' : ''} no total
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= pagination.totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <VendedorDialog
        vendedorId={editId}
        open={!!editId}
        onOpenChange={(o) => { if (!o) setEditId(null); }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover vendedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteNome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
