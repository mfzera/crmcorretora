import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_static')({
  component: StaticGroupLayout,
});

function StaticGroupLayout() {
  return <Outlet />;
}
