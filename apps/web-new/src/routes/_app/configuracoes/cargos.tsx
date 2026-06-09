import { createFileRoute } from '@tanstack/react-router';

import { useState } from 'react';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { Badge } from '@/core/ui/badge';
import { Separator } from '@/core/ui/separator';
import {
  Plus,
  Search,
  Shield,
  Users,
  Crown,
  Briefcase,
  Filter,
  SlidersHorizontal,
} from 'lucide-react';
import { useCargos, type Cargo } from '@/modules/cargos/http';
import { CargosList } from '@/modules/cargos/components/cargos-list';
import { EditarCargoDialog } from '@/modules/cargos/components/editar-cargo-dialog';
import { NovoCargoDialog } from '@/modules/cargos/components/novo-cargo-dialog';
import { PageGuard } from '@/modules/auth/components/page-guard';

export const Route = createFileRoute('/_app/configuracoes/cargos')({
  component: CargosPage,
});


function CargosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<
    'all' | 'admin' | 'gestor' | 'vendedor' | 'custom'
  >('all');
  const [cargoParaEditar, setCargoParaEditar] = useState<string | null>(null);
  const [dialogNovoAberto, setDialogNovoAberto] = useState(false);
  const [cargoParaDuplicar, setCargoParaDuplicar] = useState<Cargo | null>(
    null,
  );

  const { data: cargos = [], isLoading } = useCargos();

  // Filtrar cargos
  const cargosFiltrados = cargos.filter((cargo) => {
    // Filtro de busca
    const matchSearch =
      searchTerm === '' ||
      cargo.nomeCargo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cargo.descricao?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro de tipo
    let matchTipo = true;
    if (filterTipo !== 'all') {
      switch (filterTipo) {
        case 'admin':
          matchTipo = cargo.isAdmin;
          break;
        case 'gestor':
          matchTipo = cargo.isGestor && !cargo.isAdmin;
          break;
        case 'vendedor':
          matchTipo = !cargo.isAdmin && !cargo.isGestor;
          break;
        case 'custom':
          matchTipo = !cargo.padrao;
          break;
      }
    }

    return matchSearch && matchTipo;
  });

  // Estatísticas
  const stats = {
    total: cargos.length,
    admin: cargos.filter((c) => c.isAdmin).length,
    gestor: cargos.filter((c) => c.isGestor && !c.isAdmin).length,
    vendedor: cargos.filter((c) => !c.isAdmin && !c.isGestor).length,
    custom: cargos.filter((c) => !c.padrao).length,
  };

  const handleEdit = (cargo: Cargo) => {
    setCargoParaEditar(cargo.id);
  };

  const handleDuplicate = (cargo: Cargo) => {
    setCargoParaDuplicar(cargo);
    setDialogNovoAberto(true);
  };

  const handleNovoCargoClose = () => {
    setDialogNovoAberto(false);
    setCargoParaDuplicar(null);
  };

  return (
    <PageGuard permission={['cargos:criar', 'cargos:editar', 'cargos:atribuir_permissoes']}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Cargos e Permissões
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os cargos da sua organização e suas permissões de acesso
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Cargos
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Administradores
              </CardTitle>
              <Crown className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.admin}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gestores</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.gestor}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendedores</CardTitle>
              <Briefcase className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.vendedor}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Personalizados
              </CardTitle>
              <SlidersHorizontal className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.custom}</div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-1 gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-[300px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cargos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select
              value={filterTipo}
              onValueChange={(value: any) => setFilterTipo(value)}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cargos</SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    Administradores
                  </div>
                </SelectItem>
                <SelectItem value="gestor">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    Gestores
                  </div>
                </SelectItem>
                <SelectItem value="vendedor">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-green-500" />
                    Vendedores
                  </div>
                </SelectItem>
                <SelectItem value="custom">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-purple-500" />
                    Personalizados
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => setDialogNovoAberto(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cargo
          </Button>
        </div>

        {/* Results Info */}
        {searchTerm || filterTipo !== 'all' ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Mostrando {cargosFiltrados.length} de {cargos.length} cargos
            </span>
            {(searchTerm || filterTipo !== 'all') && (
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterTipo('all');
                }}
                className="h-auto p-0"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        ) : null}

        {/* Cargos List */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-2/3 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : cargosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm || filterTipo !== 'all'
                  ? 'Nenhum cargo encontrado'
                  : 'Nenhum cargo cadastrado'}
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || filterTipo !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece criando o primeiro cargo da sua organização'}
              </p>
              {!searchTerm && filterTipo === 'all' && (
                <Button onClick={() => setDialogNovoAberto(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Cargo
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <CargosList
            cargos={cargosFiltrados}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
          />
        )}

        {/* Dialogs */}
        <EditarCargoDialog
          cargoId={cargoParaEditar}
          open={!!cargoParaEditar}
          onOpenChange={(open) => !open && setCargoParaEditar(null)}
        />

        <NovoCargoDialog
          open={dialogNovoAberto}
          onOpenChange={handleNovoCargoClose}
          cargoParaDuplicar={cargoParaDuplicar}
        />
      </div>
    </PageGuard>
  );
}
