import { useModulos, type ModuloSlug } from '@/modules/corretora-config/http';
import { ModuloLockedPage } from './modulo-locked-page';

interface ModuloGuardProps {
  modulo: ModuloSlug;
  children: React.ReactNode;
}

/**
 * Exibe a página de showcase do módulo se ele não estiver habilitado na assinatura.
 * Enquanto os módulos estão carregando (lista vazia), não renderiza nada.
 */
export function ModuloGuard({ modulo, children }: ModuloGuardProps) {
  const { lista } = useModulos();

  if (lista.length === 0) return null;

  if (!lista.includes(modulo)) return <ModuloLockedPage modulo={modulo} />;

  return <>{children}</>;
}
