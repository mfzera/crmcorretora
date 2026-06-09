import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AuthGuard } from '@/modules/auth/components/auth-guard';
import { AppLayout } from '@/core/components/layout';

export const Route = createFileRoute('/_app')({
  component: AppGroupLayout,
});

function AppGroupLayout() {
  return (
    <AuthGuard>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </AuthGuard>
  );
}
