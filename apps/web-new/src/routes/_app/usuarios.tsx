import { createFileRoute, type ErrorComponentProps } from '@tanstack/react-router';
import { z } from 'zod';

import { useState, useTransition, lazy, Suspense } from 'react';
import { Users as UsersIcon, Shield, UsersRound, GitBranch, Plus, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { Button } from '@/core/ui/button';
import { useAuthStore } from '@/infra/auth/auth-store';
import { UsuariosTab } from '@/modules/usuarios/components/usuarios-tab';
import { CargosTab } from '@/modules/usuarios/components/cargos-tab';
import { EquipesTab } from '@/modules/usuarios/components/equipes-tab';
import { SubvendedoresTab } from '@/modules/usuarios/components/subvendedores-tab';
import { VendedoresTab } from '@/modules/vendedores/components/vendedores-tab';
import { usuariosQueryOptions } from '@/modules/usuarios/http';
const UsuarioDialog = lazy(() =>
  import('@/modules/usuarios/components/usuario-dialog').then((m) => ({ default: m.UsuarioDialog })),
);
const NovoCargoDialog = lazy(() =>
  import('@/modules/usuarios/components/novo-cargo-dialog').then((m) => ({ default: m.NovoCargoDialog })),
);
const TemplateSelectorDialog = lazy(() =>
  import('@/modules/usuarios/components/template-selector-dialog').then((m) => ({ default: m.TemplateSelectorDialog })),
);
const VendedorDialog = lazy(() =>
  import('@/modules/vendedores/components/vendedor-dialog').then((m) => ({ default: m.VendedorDialog })),
);
import { PageGuard } from '@/modules/auth/components/page-guard';
import { PageHeader } from '@/core/components/shared';

const usuariosSearchSchema = z.object({
  page: z.number().int().positive().catch(1),
  search: z.string().optional().catch(undefined),
  cargoId: z.string().optional().catch(undefined),
  ativo: z.enum(['true', 'false']).optional().catch(undefined),
  tab: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/_app/usuarios')({
  validateSearch: usuariosSearchSchema,
  loaderDeps: ({ search: { page, search, cargoId, ativo } }) => ({
    page,
    search,
    cargoId,
    ativo,
  }),
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureQueryData(
      usuariosQueryOptions({
        page: deps.page,
        limit: 20,
        search: deps.search,
        cargoId: deps.cargoId,
        ativo: deps.ativo,
      }),
    ).catch(() => {}),
  pendingComponent: UsuariosPending,
  errorComponent: UsuariosError,
  component: UsuariosPage,
});

function UsuariosPending() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function UsuariosError({ error, reset }: ErrorComponentProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <p className="text-sm text-muted-foreground">
        {error instanceof Error ? error.message : 'Erro ao carregar usuários'}
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  );
}

function UsuariosPage() {
  return (
    <PageGuard permission={['usuarios:visualizar', 'vendedores:visualizar']} requireAll={false}>
      <UsuariosPageContent />
    </PageGuard>
  );
}

function UsuariosPageContent() {
  const { user } = useAuthStore();
  const { tab: tabParam } = Route.useSearch();
  const [, startTransition] = useTransition();

  const canSeeUsuarios = user?.permissoes?.includes('usuarios:visualizar') || user?.isAdmin;
  const canSeeVendedores = user?.permissoes?.includes('vendedores:visualizar') || user?.isAdmin;
  const canManageUsers = user?.permissoes?.includes('usuarios:criar') || user?.isAdmin;
  const canManageRoles = user?.permissoes?.includes('cargos:criar') || user?.isAdmin;
  const canManageVendedores = user?.permissoes?.includes('vendedores:gerenciar') || user?.isAdmin;

  const defaultTab = tabParam ?? (canSeeUsuarios ? 'usuarios' : 'vendedores');
  const [activeTab, setActiveTab] = useState(defaultTab);

  const [dialogNovoUsuarioOpen, setDialogNovoUsuarioOpen] = useState(false);
  const [dialogNovoCargoOpen, setDialogNovoCargoOpen] = useState(false);
  const [dialogTemplateSelectorOpen, setDialogTemplateSelectorOpen] = useState(false);
  const [dialogVendedorOpen, setDialogVendedorOpen] = useState(false);

  const tabCount = (canSeeUsuarios ? 4 : 0) + (canSeeVendedores ? 1 : 0);
  const tabGridCols =
    tabCount === 1 ? 'grid-cols-1' :
    tabCount === 2 ? 'grid-cols-2' :
    tabCount === 3 ? 'grid-cols-3' :
    tabCount === 4 ? 'grid-cols-4' :
    'grid-cols-5';

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 p-3 sm:p-6 md:p-8">
      <PageHeader
        icon={UsersIcon}
        title="Controle de Usuários"
        description="Gerencie usuários, cargos, equipes e vendedores da sua corretora"
        actions={
          <div className="flex gap-2">
            {activeTab === 'usuarios' && canManageUsers && (
              <Button onClick={() => setDialogNovoUsuarioOpen(true)} className="gap-2">
                <Plus className="size-4" />
                Novo Usuário
              </Button>
            )}
            {activeTab === 'cargos' && canManageRoles && (
              <Button onClick={() => setDialogTemplateSelectorOpen(true)} className="gap-2">
                <Plus className="size-4" />
                Novo Cargo
              </Button>
            )}
            {activeTab === 'vendedores' && canManageVendedores && (
              <Button onClick={() => setDialogVendedorOpen(true)} className="gap-2">
                <Plus className="size-4" />
                Novo Vendedor
              </Button>
            )}
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => startTransition(() => setActiveTab(v))} className="w-full">
        <TabsList className={`grid w-full max-w-lg ${tabGridCols}`}>
          {canSeeUsuarios && (
            <TabsTrigger value="usuarios" className="gap-1.5 sm:gap-2">
              <UsersIcon className="size-4" />
              <span>Usuários</span>
            </TabsTrigger>
          )}
          {canSeeUsuarios && (
            <TabsTrigger value="cargos" className="gap-1.5 sm:gap-2">
              <Shield className="size-4" />
              <span>Cargos</span>
            </TabsTrigger>
          )}
          {canSeeUsuarios && (
            <TabsTrigger value="equipes" className="gap-1.5 sm:gap-2">
              <UsersRound className="size-4" />
              <span>Equipes</span>
            </TabsTrigger>
          )}
          {canSeeUsuarios && (
            <TabsTrigger value="subvendedores" className="gap-1.5 sm:gap-2">
              <GitBranch className="size-4" />
              <span>Subvendedores</span>
            </TabsTrigger>
          )}
          {canSeeVendedores && (
            <TabsTrigger value="vendedores" className="gap-1.5 sm:gap-2">
              <UsersRound className="size-4" />
              <span>Vendedores</span>
            </TabsTrigger>
          )}
        </TabsList>

        {canSeeUsuarios && (
          <TabsContent value="usuarios" className="mt-6">
            <UsuariosTab />
          </TabsContent>
        )}

        {canSeeUsuarios && (
          <TabsContent value="cargos" className="mt-6">
            <CargosTab />
          </TabsContent>
        )}

        {canSeeUsuarios && (
          <TabsContent value="equipes" className="mt-6">
            <EquipesTab />
          </TabsContent>
        )}

        {canSeeUsuarios && (
          <TabsContent value="subvendedores" className="mt-6">
            <SubvendedoresTab />
          </TabsContent>
        )}

        {canSeeVendedores && (
          <TabsContent value="vendedores" className="mt-6">
            <VendedoresTab onNew={canManageVendedores ? () => setDialogVendedorOpen(true) : undefined} />
          </TabsContent>
        )}
      </Tabs>

      <Suspense fallback={null}>
        <UsuarioDialog
          open={dialogNovoUsuarioOpen}
          onOpenChange={setDialogNovoUsuarioOpen}
        />
        <TemplateSelectorDialog
          open={dialogTemplateSelectorOpen}
          onOpenChange={setDialogTemplateSelectorOpen}
          onCreateFromScratch={() => {
            setDialogTemplateSelectorOpen(false);
            setDialogNovoCargoOpen(true);
          }}
        />
        <NovoCargoDialog
          open={dialogNovoCargoOpen}
          onOpenChange={setDialogNovoCargoOpen}
        />
        <VendedorDialog
          open={dialogVendedorOpen}
          onOpenChange={setDialogVendedorOpen}
        />
      </Suspense>
    </div>
  );
}
