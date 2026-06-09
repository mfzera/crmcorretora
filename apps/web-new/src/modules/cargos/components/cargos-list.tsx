
import { useState } from 'react';
import {
  Shield,
  Crown,
  Users,
  Briefcase,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  GitCompare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import { Button } from '@/core/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/core/ui/dropdown-menu';
import { Badge } from '@/core/ui/badge';
import { useCargos, type Cargo } from '@/modules/cargos/http';
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
import { useDeleteCargo } from '@/modules/cargos/http';
import { CompararCargosDialog } from './comparar-cargos-dialog';

interface CargosListProps {
  cargos?: Cargo[];
  onEdit: (cargo: Cargo) => void;
  onDuplicate: (cargo: Cargo) => void;
}

export function CargosList({
  cargos: cargosProp,
  onEdit,
  onDuplicate,
}: CargosListProps) {
  const { data: cargosQuery, isLoading } = useCargos();
  const deleteCargo = useDeleteCargo();
  const [cargoToDelete, setCargoToDelete] = useState<Cargo | null>(null);
  const [compararCargoId, setCompararCargoId] = useState<string | null>(null);

  // Usar cargos da prop se fornecidos, senão usar da query
  const cargos = cargosProp || cargosQuery;

  const handleDelete = async () => {
    if (!cargoToDelete) return;
    await deleteCargo.mutateAsync(cargoToDelete.id);
    setCargoToDelete(null);
  };

  function getCargoIcon(cargo: Cargo) {
    if (cargo.isAdmin) return Crown;
    if (cargo.isGestor) return Users;
    if (cargo.isVendedor) return Briefcase;
    return Shield;
  }

  function getCargoColor(cargo: Cargo) {
    if (cargo.cor) return cargo.cor;
    if (cargo.isAdmin) return '#FFD700';
    if (cargo.isGestor) return '#3B82F6';
    if (cargo.isVendedor) return '#10B981';
    return '#6B7280';
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!cargos || cargos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Shield className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Nenhum cargo encontrado.
            <br />
            Crie seu primeiro cargo para começar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cargos.map((cargo) => {
          const Icon = getCargoIcon(cargo);
          const color = getCargoColor(cargo);
          const canDelete = !cargo.isAdmin; // Não pode deletar cargo de admin

          return (
            <Card key={cargo.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{cargo.nomeCargo}</CardTitle>
                    <div className="flex gap-1 mt-1">
                      {cargo.isAdmin && (
                        <Badge variant="default" className="text-xs">
                          Admin
                        </Badge>
                      )}
                      {cargo.isGestor && (
                        <Badge variant="secondary" className="text-xs">
                          Gestor
                        </Badge>
                      )}
                      {cargo.isVendedor && (
                        <Badge variant="outline" className="text-xs">
                          Vendedor
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(cargo)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(cargo)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCompararCargoId(cargo.id)}>
                      <GitCompare className="h-4 w-4 mr-2" />
                      Comparar
                    </DropdownMenuItem>
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setCargoToDelete(cargo)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                  {cargo.descricao || 'Sem descrição'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => onEdit(cargo)}
                >
                  Gerenciar Permissões
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog de comparação de cargos */}
      <CompararCargosDialog
        open={!!compararCargoId}
        onOpenChange={(o) => { if (!o) setCompararCargoId(null); }}
        defaultCargoId={compararCargoId ?? undefined}
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog
        open={!!cargoToDelete}
        onOpenChange={() => setCargoToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cargo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cargo{' '}
              <strong>{cargoToDelete?.nomeCargo}</strong>? Usuários com este
              cargo perderão suas permissões. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
