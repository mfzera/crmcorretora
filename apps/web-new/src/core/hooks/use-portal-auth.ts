
import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { usePortalAuthStore } from '@/infra/auth/portal-auth-store';

/**
 * Hook de guard de rota para o portal do segurado.
 * Redireciona para o login se não autenticado.
 */
export function usePortalAuth(subdominio: string) {
  const navigate = useNavigate();
  const { isAuthenticated, cliente, corretora, token, portalLogout } =
    usePortalAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      navigate({ to: `/portal/${subdominio}/login`, replace: true });
    }
  }, [isAuthenticated, token, subdominio, navigate]);

  return { cliente, corretora, token, portalLogout, isAuthenticated };
}
