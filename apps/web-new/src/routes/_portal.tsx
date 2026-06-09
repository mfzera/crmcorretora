import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_portal')({
  component: PortalGroupLayout,
});

function PortalGroupLayout() {
  return <Outlet />;
}
