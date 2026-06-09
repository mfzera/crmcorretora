
import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { adminAuth } from '@/infra/auth/admin-auth';

interface AdminGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export function AdminGuard({ children, requiredPermission }: AdminGuardProps) {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    const authenticated = adminAuth.isAuthenticated();
    const permission = requiredPermission
      ? adminAuth.hasPermission(requiredPermission)
      : true;

    setIsAuthenticated(authenticated);
    setHasPermission(permission);
    setMounted(true);

    if (!authenticated) {
      navigate({ to: '/admin/login' });
      return;
    }

    if (requiredPermission && !permission) {
      navigate({ to: '/admin/dashboard' });
    }
  }, [navigate, requiredPermission]);

  // Enquanto verifica autenticação, renderiza os children
  // O redirect acontecerá no useEffect se necessário
  if (!mounted) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredPermission && !hasPermission) {
    return null;
  }

  return <>{children}</>;
}
