import { useMemo } from 'react';
import { useAuthStore } from '@/infra/auth/auth-store';

export function usePermissions() {
  const { user } = useAuthStore();

  const isEffectiveAdmin = !!(user?.isAdmin || user?.cargo?.isAdmin);

  // Set para O(1) lookups em vez de O(n) array.includes
  const permissoesSet = useMemo(
    () => new Set(user?.permissoes ?? []),
    [user?.permissoes],
  );

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (isEffectiveAdmin) return true;
    return permissoesSet.has(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    if (isEffectiveAdmin) return true;
    return permissions.some((p) => permissoesSet.has(p));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false;
    if (isEffectiveAdmin) return true;
    return permissions.every((p) => permissoesSet.has(p));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin: isEffectiveAdmin,
  };
}
