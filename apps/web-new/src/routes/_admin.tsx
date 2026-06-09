import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_admin')({
  component: AdminGroupLayout,
});

function AdminGroupLayout() {
  return <Outlet />;
}
