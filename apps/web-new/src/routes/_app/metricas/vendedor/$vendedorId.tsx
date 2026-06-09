import { createFileRoute } from '@tanstack/react-router';

import { VendedorItensPage } from '@/modules/metricas/components/vendedor-itens/vendedor-itens-page';

export const Route = createFileRoute('/_app/metricas/vendedor/$vendedorId')({
  component: Page,
});


function Page() {
  const { vendedorId = '' } = Route.useParams();

  if (!vendedorId) return null;

  return <VendedorItensPage vendedorId={vendedorId} />;
}
