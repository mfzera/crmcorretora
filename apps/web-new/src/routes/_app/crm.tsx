import { createFileRoute } from '@tanstack/react-router';

import { useState, lazy, Suspense } from 'react';
import { Settings, Plus, Settings2 } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { EstatisticasCRM } from '@/modules/gestao-crm/components/estatisticas-crm';
import { VendedoresTable } from '@/modules/gestao-crm/components/vendedores-table';
import { OportunidadesGestaoList } from '@/modules/gestao-crm/components/oportunidades-gestao-list';

const NovaOportunidadeGestorDialog = lazy(() =>
  import('@/modules/gestao-crm/components/nova-oportunidade-gestor-dialog').then((m) => ({ default: m.NovaOportunidadeGestorDialog })),
);
const ConfigPrioridadesDialog = lazy(() =>
  import('@/modules/gestao-crm/components/config-prioridades-dialog').then((m) => ({ default: m.ConfigPrioridadesDialog })),
);
import { PageGuard } from '@/modules/auth/components/page-guard';
import { PageHeader } from '@/core/components/shared';

export const Route = createFileRoute('/_app/crm')({
  component: GestaoCRMPage,
});


function GestaoCRMPage() {
  return (
    <PageGuard permission="gestao_crm:acessar">
      <GestaoCRMPageContent />
    </PageGuard>
  );
}

function GestaoCRMPageContent() {
  const [vendedorSelecionado, setVendedorSelecionado] = useState<
    string | undefined
  >();

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 p-3 sm:p-6 md:p-8">
      <PageHeader
        icon={Settings}
        title="Gestão CRM"
        description="Gerencie oportunidades e acompanhe a performance da equipe"
        actions={
          <Suspense fallback={null}>
            <ConfigPrioridadesDialog
              trigger={
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <Settings2 className="mr-2 h-5 w-5" />
                  <span className="hidden sm:inline">Configurar Prioridades</span>
                  <span className="sm:hidden">Prioridades</span>
                </Button>
              }
            />
            <NovaOportunidadeGestorDialog
              trigger={
                <Button size="lg" className="w-full sm:w-auto">
                  <Plus className="mr-2 h-5 w-5" />
                  <span className="hidden sm:inline">Nova Oportunidade</span>
                  <span className="sm:hidden">Nova</span>
                </Button>
              }
            />
          </Suspense>
        }
      />

      {/* Estatísticas */}
      <EstatisticasCRM />

      {/* Tabs */}
      <Tabs defaultValue="vendedores" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="vendedores" className="flex-1 sm:flex-none">Equipe</TabsTrigger>
          <TabsTrigger value="oportunidades" className="flex-1 sm:flex-none">
            <span className="hidden sm:inline">Todas Oportunidades</span>
            <span className="sm:hidden">Oportunidades</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendedores" className="space-y-4">
          <VendedoresTable onSelectVendedor={setVendedorSelecionado} />

          {vendedorSelecionado && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Oportunidades do Vendedor
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVendedorSelecionado(undefined)}
                >
                  Limpar Filtro
                </Button>
              </div>
              <OportunidadesGestaoList vendedorId={vendedorSelecionado} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="oportunidades">
          <OportunidadesGestaoList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
