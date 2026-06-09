import { createFileRoute, redirect } from '@tanstack/react-router';

// /vendedores foi incorporado em /usuarios como aba
export const Route = createFileRoute('/_app/vendedores')({
  beforeLoad: () => {
    throw redirect({ to: '/usuarios', search: { tab: 'vendedores' } as any });
  },
  component: () => null,
});
