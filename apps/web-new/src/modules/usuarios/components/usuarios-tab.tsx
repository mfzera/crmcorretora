import { useState, useEffect, useMemo } from 'react';
import { getRouteApi } from '@tanstack/react-router';

const routeApi = getRouteApi('/_app/usuarios');
import {
  Search,
  Loader2,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Key,
  X,
  ChevronDown,
  Users,
  SearchX,
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
import { useUsuarios } from '@/modules/usuarios/http';
import { useCargos } from '@/modules/cargos/http';
import { UsuarioDialog } from './usuario-dialog';
import { ExcluirUsuarioDialog } from './excluir-usuario-dialog';
import { ResetarSenhaDialog } from './resetar-senha-dialog';
import { VisualizarUsuarioDialog } from './visualizar-usuario-dialog';
import type { Usuario } from '@/types/usuario';
import { cn } from '@/core/utils';

const getCorClasse = (cor: string | null | undefined) => {
  const cores: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    indigo: 'bg-indigo-500',
    teal: 'bg-teal-500',
    cyan: 'bg-cyan-500',
    gray: 'bg-gray-500',
    slate: 'bg-slate-500',
  };
  return cores[cor || 'blue'] || 'bg-blue-500';
};

// Melhoria 1: tempo relativo para último login
function formatRelativeDate(date: string | null): string {
  if (!date) return 'Nunca';
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'hoje';
  if (diffDays === 1) return 'há 1 dia';
  if (diffDays < 7) return `há ${diffDays} dias`;
  if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} sem.`;
  if (diffDays < 365) return `há ${Math.floor(diffDays / 30)} meses`;
  return `há ${Math.floor(diffDays / 365)} anos`;
}

function formatFullDate(date: string | null): string {
  if (!date) return 'Nunca';
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Melhoria 2: iniciais do avatar
function getInitials(nome: string): string {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

// Melhoria 3: cor de avatar baseada no nome
function getAvatarColor(nome: string): string {
  const colors = [
    'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
    'bg-indigo-500', 'bg-teal-500',
  ];
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// Melhoria 4: skeleton mobile
function UsuarioCardSkeleton() {
  return (
    <div className="border border-border/50 rounded-lg p-3 space-y-2 animate-pulse">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-9 w-9 rounded-md shrink-0" />
      </div>
    </div>
  );
}

export function UsuariosTab() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  const [searchInput, setSearchInput] = useState(search.search ?? '');
  // Melhoria 5: filtros colapsáveis com animação
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      const value = searchInput || undefined;
      if (value !== search.search) {
        navigate({
          search: (prev) => ({ ...prev, search: value, page: 1 }),
          replace: true,
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setSearchInput(search.search ?? '');
  }, [search.search]);

  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [dialogEditarOpen, setDialogEditarOpen] = useState(false);
  const [dialogExcluirOpen, setDialogExcluirOpen] = useState(false);
  const [dialogResetarOpen, setDialogResetarOpen] = useState(false);
  const [dialogVisualizarOpen, setDialogVisualizarOpen] = useState(false);

  const limit = 20;

  const { data: response, isLoading, isError } = useUsuarios({
    page: search.page,
    limit,
    search: search.search,
    cargoId: search.cargoId,
    ativo: search.ativo,
  });

  const { data: cargos = [] } = useCargos();

  const usuarios = response?.data || [];
  const pagination = response?.pagination;

  // Melhoria 6: contagem de filtros ativos
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.search) count++;
    if (search.cargoId) count++;
    if (search.ativo) count++;
    return count;
  }, [search.search, search.cargoId, search.ativo]);

  const hasFilters = activeFilterCount > 0;

  const handleLimparFiltros = () => {
    setSearchInput('');
    navigate({
      search: { page: 1 },
      replace: true,
    });
  };

  // Melhoria 7: chips de filtros ativos
  const filterChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (search.search) {
      chips.push({
        key: 'search',
        label: `"${search.search}"`,
        onRemove: () => {
          setSearchInput('');
          navigate({ search: (prev) => ({ ...prev, search: undefined, page: 1 }), replace: true });
        },
      });
    }
    if (search.cargoId) {
      const cargo = cargos.find((c) => c.id === search.cargoId);
      chips.push({
        key: 'cargo',
        label: cargo?.nomeCargo ?? 'Cargo',
        onRemove: () =>
          navigate({ search: (prev) => ({ ...prev, cargoId: undefined, page: 1 }), replace: true }),
      });
    }
    if (search.ativo) {
      chips.push({
        key: 'ativo',
        label: search.ativo === 'true' ? 'Ativos' : 'Inativos',
        onRemove: () =>
          navigate({ search: (prev) => ({ ...prev, ativo: undefined, page: 1 }), replace: true }),
      });
    }
    return chips;
  }, [search.search, search.cargoId, search.ativo, cargos]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filtros — Melhoria 8: Card compacto com colapso */}
      <Card>
        {/* Melhoria 9: header clicável com badge de filtros ativos */}
        <CardHeader
          className="py-3 px-4 sm:px-6 cursor-pointer select-none hover:bg-muted/30 transition-colors"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Filtros</CardTitle>
              {activeFilterCount > 0 && (
                <Badge variant="default" className="h-5 px-1.5 text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                filtersOpen && 'rotate-180',
              )}
            />
          </div>
        </CardHeader>

        {/* Melhoria 10: animação de colapso via grid-rows */}
        <div
          className={cn(
            'grid transition-all duration-200 ease-in-out',
            filtersOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className="overflow-hidden">
            <CardContent className="px-4 sm:px-6 pb-4 pt-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Melhoria 11: botão X no campo de busca */}
                <div className="sm:col-span-2 md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou email..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pl-9 pr-9"
                    />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => setSearchInput('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                        aria-label="Limpar busca"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Melhoria 12: destaque visual em selects ativos */}
                <Select
                  value={search.cargoId ?? 'all'}
                  onValueChange={(value) => {
                    navigate({
                      search: (prev) => ({
                        ...prev,
                        cargoId: value === 'all' ? undefined : value,
                        page: 1,
                      }),
                      replace: true,
                    });
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      search.cargoId && 'border-primary ring-1 ring-primary/20 text-primary',
                    )}
                  >
                    <SelectValue placeholder="Todos os cargos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os cargos</SelectItem>
                    {cargos.map((cargo) => (
                      <SelectItem key={cargo.id} value={cargo.id}>
                        {/* Melhoria 13: cor do cargo nas opções */}
                        <span className="flex items-center gap-2">
                          <span className={cn('h-2 w-2 rounded-full shrink-0', getCorClasse(cargo.cor))} />
                          {cargo.nomeCargo}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={search.ativo ?? 'all'}
                  onValueChange={(value) => {
                    navigate({
                      search: (prev) => ({
                        ...prev,
                        ativo: value === 'all' ? undefined : (value as 'true' | 'false'),
                        page: 1,
                      }),
                      replace: true,
                    });
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      search.ativo && 'border-primary ring-1 ring-primary/20 text-primary',
                    )}
                  >
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="true">Ativos</SelectItem>
                    <SelectItem value="false">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLimparFiltros}
                  className="gap-1.5 h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                  Limpar filtros ({activeFilterCount})
                </Button>
              )}
            </CardContent>
          </div>
        </div>
      </Card>

      {/* Melhoria 14: chips de filtros ativos */}
      {filterChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filterChips.map((chip) => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="gap-1 pr-1 pl-2.5 h-6 text-xs font-normal"
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                className="flex items-center justify-center rounded-sm opacity-70 hover:opacity-100 transition-opacity ml-0.5"
                aria-label={`Remover filtro ${chip.label}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2 text-muted-foreground"
            onClick={handleLimparFiltros}
          >
            Limpar todos
          </Button>
        </div>
      )}

      {/* Tabela / Lista */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Usuários</CardTitle>
              {/* Melhoria 15: contagem de resultados */}
              <p className="text-sm text-muted-foreground mt-0.5">
                {isLoading
                  ? 'Carregando...'
                  : `${pagination?.total ?? 0} ${(pagination?.total ?? 0) === 1 ? 'usuário encontrado' : 'usuários encontrados'}`}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <>
              {/* Melhoria 16: skeleton mobile em vez de spinner centralizado */}
              <div className="md:hidden space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <UsuarioCardSkeleton key={i} />
                ))}
              </div>
              <div className="hidden md:flex items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            </>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <p className="text-sm text-muted-foreground">Erro ao carregar dados.</p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Tentar novamente
              </Button>
            </div>
          ) : usuarios.length === 0 ? (
            /* Melhoria 17: estado vazio com ícone */
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              {hasFilters ? (
                <>
                  <SearchX className="size-10 text-muted-foreground/50" />
                  <div>
                    <p className="font-medium text-sm">Nenhum usuário encontrado</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tente ajustar os filtros aplicados
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLimparFiltros}>
                    Limpar filtros
                  </Button>
                </>
              ) : (
                <>
                  <Users className="size-10 text-muted-foreground/50" />
                  <div>
                    <p className="font-medium text-sm">Nenhum usuário cadastrado</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Crie o primeiro usuário do sistema
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="md:hidden space-y-2">
                {usuarios.map((usuario) => {
                  const dropdown = (
                    <UsuarioActionsDropdown
                      onVisualizar={() => {
                        setUsuarioSelecionado(usuario);
                        setDialogVisualizarOpen(true);
                      }}
                      onEditar={() => {
                        setUsuarioSelecionado(usuario);
                        setDialogEditarOpen(true);
                      }}
                      onResetar={() => {
                        setUsuarioSelecionado(usuario);
                        setDialogResetarOpen(true);
                      }}
                      onExcluir={() => {
                        setUsuarioSelecionado(usuario);
                        setDialogExcluirOpen(true);
                      }}
                    />
                  );
                  return (
                    <div
                      key={usuario.id}
                      className="border border-border/50 rounded-lg p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {/* Melhoria 18: avatar com iniciais */}
                        <div
                          className={cn(
                            'h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0',
                            getAvatarColor(usuario.nome),
                          )}
                        >
                          {getInitials(usuario.nome)}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {usuario.ativo ? (
                              <Badge variant="default" className="shrink-0 h-5 text-[10px]">Ativo</Badge>
                            ) : (
                              <Badge variant="destructive" className="shrink-0 h-5 text-[10px]">Inativo</Badge>
                            )}
                            {usuario.cargo && (
                              <Badge variant="secondary" className="gap-1.5 shrink-0 h-5 text-[10px]">
                                <div
                                  className={`h-2 w-2 rounded-full ${getCorClasse(usuario.cargo.cor)}`}
                                />
                                {usuario.cargo.nome}
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-sm truncate">{usuario.nome}</p>
                          {/* Melhoria 19: truncate no email em vez de break-all */}
                          <p className="text-xs text-muted-foreground truncate">{usuario.email}</p>
                          {/* Melhoria 20: data relativa no mobile */}
                          <p className="text-[11px] text-muted-foreground/70">
                            Último login: {formatRelativeDate(usuario.ultimoLogin)}
                          </p>
                        </div>
                        {dropdown}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: tabela */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Último Login</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0',
                                getAvatarColor(usuario.nome),
                              )}
                            >
                              {getInitials(usuario.nome)}
                            </div>
                            {usuario.nome}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{usuario.email}</TableCell>
                        <TableCell>
                          {usuario.cargo ? (
                            <Badge variant="secondary" className="gap-1.5">
                              <div
                                className={`h-2 w-2 rounded-full ${getCorClasse(usuario.cargo.cor)}`}
                              />
                              {usuario.cargo.nome}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Sem cargo
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {usuario.ativo ? (
                            <Badge variant="default" className="gap-1">Ativo</Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">Inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell
                          className="text-sm text-muted-foreground"
                          title={formatFullDate(usuario.ultimoLogin)}
                        >
                          {formatRelativeDate(usuario.ultimoLogin)}
                        </TableCell>
                        <TableCell className="text-right">
                          <UsuarioActionsDropdown
                            onVisualizar={() => {
                              setUsuarioSelecionado(usuario);
                              setDialogVisualizarOpen(true);
                            }}
                            onEditar={() => {
                              setUsuarioSelecionado(usuario);
                              setDialogEditarOpen(true);
                            }}
                            onResetar={() => {
                              setUsuarioSelecionado(usuario);
                              setDialogResetarOpen(true);
                            }}
                            onExcluir={() => {
                              setUsuarioSelecionado(usuario);
                              setDialogExcluirOpen(true);
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Melhoria: paginação compacta com contagem */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4">
                  <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                    Página {pagination.page} de {pagination.totalPages}
                    {' · '}
                    <span className="text-foreground font-medium">{pagination.total}</span> usuários
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate({
                          search: (prev) => ({ ...prev, page: Math.max(1, (prev.page ?? 1) - 1) }),
                          replace: true,
                        })
                      }
                      disabled={pagination.page === 1}
                    >
                      Anterior
                    </Button>
                    {/* Melhoria: números de página no desktop */}
                    <div className="hidden sm:flex gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        const mid = Math.min(
                          Math.max(pagination.page, 3),
                          pagination.totalPages - 2,
                        );
                        const page = pagination.totalPages <= 5 ? i + 1 : mid - 2 + i;
                        if (page < 1 || page > pagination.totalPages) return null;
                        return (
                          <Button
                            key={page}
                            variant={page === pagination.page ? 'default' : 'outline'}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() =>
                              navigate({
                                search: (prev) => ({ ...prev, page }),
                                replace: true,
                              })
                            }
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate({
                          search: (prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }),
                          replace: true,
                        })
                      }
                      disabled={pagination.page === pagination.totalPages}
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

      {/* Diálogos */}
      {usuarioSelecionado && (
        <>
          <UsuarioDialog
            usuarioId={usuarioSelecionado.id}
            usuario={usuarioSelecionado}
            open={dialogEditarOpen}
            onOpenChange={setDialogEditarOpen}
            onSuccess={() => setUsuarioSelecionado(null)}
          />
          <ExcluirUsuarioDialog
            usuario={usuarioSelecionado}
            open={dialogExcluirOpen}
            onOpenChange={setDialogExcluirOpen}
            onSuccess={() => setUsuarioSelecionado(null)}
          />
          <ResetarSenhaDialog
            usuario={usuarioSelecionado}
            open={dialogResetarOpen}
            onOpenChange={setDialogResetarOpen}
            onSuccess={() => setUsuarioSelecionado(null)}
          />
          <VisualizarUsuarioDialog
            usuario={usuarioSelecionado}
            open={dialogVisualizarOpen}
            onOpenChange={setDialogVisualizarOpen}
          />
        </>
      )}
    </div>
  );
}

function UsuarioActionsDropdown({
  onVisualizar,
  onEditar,
  onResetar,
  onExcluir,
}: {
  onVisualizar: () => void;
  onEditar: () => void;
  onResetar: () => void;
  onExcluir: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Melhoria: touch target mínimo 44px no mobile */}
        <Button variant="ghost" size="icon" className="shrink-0 h-11 w-11 sm:h-8 sm:w-8" aria-label="Ações do usuário">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onVisualizar}>
          <Eye className="mr-2 size-4" />
          Visualizar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEditar}>
          <Edit className="mr-2 size-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onResetar}>
          <Key className="mr-2 size-4" />
          Resetar Senha
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onExcluir} className="text-destructive">
          <Trash2 className="mr-2 size-4" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
