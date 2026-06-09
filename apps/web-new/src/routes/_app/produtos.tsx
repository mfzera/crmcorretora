import { createFileRoute } from '@tanstack/react-router';

import { Package, Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { ProdutosList } from '@/modules/produtos/components/produtos-list';
import { SeguradorasList } from '@/modules/seguradoras-parceiras/components/seguradoras-list';
import { PageGuard } from '@/modules/auth/components/page-guard';
import { PageHeader } from '@/core/components/shared';

export const Route = createFileRoute('/_app/produtos')({
  component: ProdutosPage,
});


function ProdutosPage() {
  return (
    <PageGuard permission="produtos:visualizar">
      <ProdutosPageContent />
    </PageGuard>
  );
}

function ProdutosPageContent() {
  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 p-3 sm:p-6 md:p-8">
      <PageHeader
        icon={Package}
        title="Produtos & Seguradoras"
        description="Gerencie os produtos e seguradoras parceiras"
      />

      {/* Tabs */}
      <Tabs defaultValue="produtos" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="produtos" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="seguradoras" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Seguradoras
          </TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="mt-6">
          <ProdutosList />
        </TabsContent>

        <TabsContent value="seguradoras" className="mt-6">
          <SeguradorasList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
