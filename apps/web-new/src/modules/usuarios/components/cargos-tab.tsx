
import { useState } from 'react';
import {
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  AlertCircle,
  Users,
  CheckCircle2,
  Settings,
  Eye,
  Copy,
  Key,
  Palette,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/core/ui/dropdown-menu';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/core/ui/alert';
import { Separator } from '@/core/ui/separator';
import { useCargos } from '@/modules/cargos/http';
import { CargoDialog } from './cargo-dialog';
import { ExcluirCargoDialog } from './excluir-cargo-dialog';
import { PermissoesDialog } from './permissoes-dialog';
import { VisualizarCargoDialog } from './visualizar-cargo-dialog';
import { DuplicarCargoDialog } from './duplicar-cargo-dialog';
import { EditarCorCargoDialog } from './editar-cor-cargo-dialog';
import type { Cargo } from '@/types/cargo';
import { cn } from '@/core/utils';

const getCorClasse = (cor: string | null) => {
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

const getCorHex = (cor: string | null) => {
  const cores: Record<string, string> = {
    blue: '#3b82f6',
    green: '#22c55e',
    purple: '#a855f7',
    orange: '#f97316',
    pink: '#ec4899',
    red: '#ef4444',
    yellow: '#eab308',
    indigo: '#6366f1',
    teal: '#14b8a6',
    cyan: '#06b6d4',
    gray: '#6b7280',
    slate: '#64748b',
  };
  return cores[cor || 'blue'] || '#3b82f6';
};

export function CargosTab() {
  const [cargoSelecionado, setCargoSelecionado] = useState<Cargo | null>(null);
  const [dialogEditarOpen, setDialogEditarOpen] = useState(false);
  const [dialogExcluirOpen, setDialogExcluirOpen] = useState(false);
  const [dialogPermissoesOpen, setDialogPermissoesOpen] = useState(false);
  const [dialogVisualizarOpen, setDialogVisualizarOpen] = useState(false);
  const [dialogDuplicarOpen, setDialogDuplicarOpen] = useState(false);
  const [dialogEditarCorOpen, setDialogEditarCorOpen] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<
    'todos' | 'admin' | 'gestor' | 'vendedor'
  >('todos');

  const { data: cargos = [], isLoading } = useCargos();

  // Filtrar cargos por tipo
  const cargosFiltrados = cargos.filter((cargo) => {
    if (filtroTipo === 'todos') return true;
    if (filtroTipo === 'admin') return cargo.isAdmin;
    if (filtroTipo === 'gestor') return cargo.isGestor;
    if (filtroTipo === 'vendedor') return cargo.isVendedor;
    return true;
  });

  const getTipoBadge = (cargo: Cargo) => {
    if (cargo.isAdmin) {
      return (
        <Badge variant="default" className="bg-red-600 hover:bg-red-700">
          <Shield className="mr-1 h-3 w-3" />
          Admin
        </Badge>
      );
    }
    if (cargo.isGestor) {
      return (
        <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
          <Users className="mr-1 h-3 w-3" />
          Gestor
        </Badge>
      );
    }
    if (cargo.isVendedor) {
      return (
        <Badge className="bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Vendedor
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Settings className="mr-1 h-3 w-3" />
        Outro
      </Badge>
    );
  };

  const getCargoColor = (cargo: Cargo) => {
    if (cargo.isAdmin) return 'border-red-200 dark:border-red-900';
    if (cargo.isGestor) return 'border-blue-200 dark:border-blue-900';
    if (cargo.isVendedor) return 'border-green-200 dark:border-green-900';
    return 'border-gray-200 dark:border-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Sobre Cargos e Permissões</AlertTitle>
        <AlertDescription>
          Cargos definem o conjunto de permissões que usuários têm no sistema.
          Após criar um cargo, você pode gerenciar suas permissões específicas
          de forma modular. Usuários herdam todas as permissões do cargo
          atribuído.
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Cargos</CardDescription>
            <CardTitle className="text-3xl">{cargos.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Cargos de Gestão</CardDescription>
            <CardTitle className="text-3xl">
              {cargos.filter((c) => c.isGestor || c.isAdmin).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Cargos de Vendas</CardDescription>
            <CardTitle className="text-3xl">
              {cargos.filter((c) => c.isVendedor).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filtros */}
      {cargos.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filtrar por tipo:</span>
          <div className="flex gap-2">
            <Button
              variant={filtroTipo === 'todos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipo('todos')}
            >
              Todos ({cargos.length})
            </Button>
            <Button
              variant={filtroTipo === 'admin' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipo('admin')}
            >
              <Shield className="mr-1 h-3 w-3" />
              Admin ({cargos.filter((c) => c.isAdmin).length})
            </Button>
            <Button
              variant={filtroTipo === 'gestor' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipo('gestor')}
            >
              <Users className="mr-1 h-3 w-3" />
              Gestor ({cargos.filter((c) => c.isGestor && !c.isAdmin).length})
            </Button>
            <Button
              variant={filtroTipo === 'vendedor' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipo('vendedor')}
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Vendedor ({cargos.filter((c) => c.isVendedor).length})
            </Button>
          </div>
        </div>
      )}

      {/* Cargos Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : cargosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground text-lg font-medium mb-2">
              {cargos.length === 0
                ? 'Nenhum cargo cadastrado ainda'
                : 'Nenhum cargo encontrado com este filtro'}
            </p>
            <p className="text-sm text-muted-foreground">
              {cargos.length === 0
                ? 'Crie um novo cargo para começar a organizar sua equipe'
                : 'Tente outro filtro para ver mais cargos'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cargosFiltrados.map((cargo) => (
            <Card
              key={cargo.id}
              className={cn(
                'transition-all duration-200 hover:shadow-lg border-l-4 border-t-0 border-r-0 border-b-0',
                getCargoColor(cargo),
              )}
              style={{
                borderLeftColor: getCorHex(cargo.cor),
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-3 w-3 rounded-full ${getCorClasse(cargo.cor)}`}
                      />
                      <CardTitle className="text-lg line-clamp-1">
                        {cargo.nomeCargo}
                      </CardTitle>
                    </div>
                    {getTipoBadge(cargo)}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setCargoSelecionado(cargo);
                          setDialogVisualizarOpen(true);
                        }}
                      >
                        <Eye className="mr-2 size-4" />
                        Visualizar Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setCargoSelecionado(cargo);
                          setDialogPermissoesOpen(true);
                        }}
                      >
                        <Shield className="mr-2 size-4" />
                        Gerenciar Permissões
                      </DropdownMenuItem>
                      {cargo.isAdmin ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setCargoSelecionado(cargo);
                              setDialogEditarCorOpen(true);
                            }}
                          >
                            <Palette className="mr-2 size-4" />
                            Alterar Cor
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem
                            onClick={() => {
                              setCargoSelecionado(cargo);
                              setDialogEditarOpen(true);
                            }}
                          >
                            <Edit className="mr-2 size-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setCargoSelecionado(cargo);
                              setDialogDuplicarOpen(true);
                            }}
                          >
                            <Copy className="mr-2 size-4" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setCargoSelecionado(cargo);
                              setDialogExcluirOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 size-4" />
                            Excluir
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {cargo.descricao || 'Sem descrição disponível'}
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <Key className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {cargo.isAdmin
                      ? 'Todas as permissões'
                      : 'Permissões configuráveis'}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Separator />
                <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                  <span>Criado em</span>
                  <span>
                    {new Date(cargo.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {cargo.updatedAt !== cargo.createdAt && (
                  <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                    <span>Atualizado em</span>
                    <span>
                      {new Date(cargo.updatedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Diálogos */}
      {cargoSelecionado && (
        <>
          <CargoDialog
            cargoId={cargoSelecionado.id}
            open={dialogEditarOpen}
            onOpenChange={setDialogEditarOpen}
            onSuccess={() => setCargoSelecionado(null)}
          />
          <ExcluirCargoDialog
            cargo={cargoSelecionado}
            open={dialogExcluirOpen}
            onOpenChange={setDialogExcluirOpen}
            onSuccess={() => setCargoSelecionado(null)}
          />
          <PermissoesDialog
            cargo={cargoSelecionado}
            open={dialogPermissoesOpen}
            onOpenChange={setDialogPermissoesOpen}
            onSuccess={() => setCargoSelecionado(null)}
          />
          <VisualizarCargoDialog
            cargo={cargoSelecionado}
            open={dialogVisualizarOpen}
            onOpenChange={setDialogVisualizarOpen}
          />
          <DuplicarCargoDialog
            cargo={cargoSelecionado}
            open={dialogDuplicarOpen}
            onOpenChange={setDialogDuplicarOpen}
            onSuccess={() => setCargoSelecionado(null)}
          />
          <EditarCorCargoDialog
            cargo={cargoSelecionado}
            open={dialogEditarCorOpen}
            onOpenChange={setDialogEditarCorOpen}
            onSuccess={() => setCargoSelecionado(null)}
          />
        </>
      )}
    </div>
  );
}
