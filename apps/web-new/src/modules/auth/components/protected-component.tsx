
import React from 'react';
import { usePermissions } from '@/core/hooks/use-permissions';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/core/ui/tooltip';

interface ProtectedComponentProps {
  permission: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAll?: boolean;
  /** 'hide' (padrão) oculta o elemento; 'disable' renderiza desabilitado com tooltip */
  mode?: 'hide' | 'disable';
}

export function ProtectedComponent({
  permission,
  children,
  fallback = null,
  requireAll = false,
  mode = 'hide',
}: ProtectedComponentProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  const hasAccess = Array.isArray(permission)
    ? requireAll
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission)
    : hasPermission(permission);

  if (!hasAccess) {
    if (mode === 'disable') {
      const permLabel = Array.isArray(permission) ? permission.join(', ') : permission;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-not-allowed">
                {React.Children.map(children, (child) =>
                  React.isValidElement(child)
                    ? React.cloneElement(child as React.ReactElement<{ disabled?: boolean }>, { disabled: true })
                    : child
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Sem permissão: {permLabel}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
