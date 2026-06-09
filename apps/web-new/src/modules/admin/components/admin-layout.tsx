
import { ReactNode } from 'react';
import { AdminTopbar } from '@/modules/admin/components/admin-topbar';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminTopbar />
      <main className="mx-auto w-full max-w-[1400px] px-6 py-6">
        {children}
      </main>
    </div>
  );
}
