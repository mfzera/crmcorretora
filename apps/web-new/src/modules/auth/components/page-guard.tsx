
import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { usePermissions } from '@/core/hooks/use-permissions';
import { useAuthStore } from '@/infra/auth/auth-store';
import { Skeleton } from '@/core/ui/skeleton';

interface PageGuardProps {
  children: React.ReactNode;
  permission?: string | string[];
  requireAll?: boolean;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

/**
 * Component to protect Next.js App Router pages
 *
 * Usage in page.tsx:
 * ```tsx
 * export default function UsuariosPage() {
 *   return (
 *     <PageGuard permission="usuarios:visualizar">
 *       <div>Conteúdo protegido</div>
 *     </PageGuard>
 *   );
 * }
 * ```
 */
export function PageGuard({
  children,
  permission,
  requireAll = false,
  redirectTo = '/sem-permissao',
  fallback,
}: PageGuardProps) {
  const navigate = useNavigate();
  const { hasPermission, hasAnyPermission, hasAllPermissions } =
    usePermissions();
  const { user } = useAuthStore();
  

  useEffect(() => {
    // Check if user is authenticated
    if (!user) {
      navigate({ to: '/login', search: { redirect: window.location.pathname } });
      return;
    }

    // If no permission specified, just check authentication
    if (!permission) {
      return;
    }

    // Check permissions
    let hasAccess: boolean;

    if (Array.isArray(permission)) {
      hasAccess = requireAll
        ? hasAllPermissions(permission)
        : hasAnyPermission(permission);
    } else {
      hasAccess = hasPermission(permission);
    }

    // Redirect if no access
    if (!hasAccess) {
      const permissaoParam = Array.isArray(permission)
        ? permission.join(',')
        : permission;
      if (redirectTo === '/sem-permissao') {
        navigate({ to: redirectTo as any, search: { permissao: permissaoParam } as any });
      } else {
        navigate({ to: redirectTo as any });
      }
    }
  }, [
    user,
    permission,
    requireAll,
    redirectTo,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    navigate,
  ]);

  // Check authentication — render skeleton to reserve layout space while auth hydrates
  if (!user) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="space-y-8 p-4 md:p-8">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  // Check permissions
  if (permission) {
    let hasAccess: boolean;

    if (Array.isArray(permission)) {
      hasAccess = requireAll
        ? hasAllPermissions(permission)
        : hasAnyPermission(permission);
    } else {
      hasAccess = hasPermission(permission);
    }

    if (!hasAccess) {
      if (fallback) {
        return <>{fallback}</>;
      }
      return null;
    }
  }

  return <>{children}</>;
}
