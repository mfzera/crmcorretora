
import { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

function formatPermissaoLabel(perm: string): string {
  const TOKEN_MAP: Record<string, string> = {
    criar: 'Criar', editar: 'Editar', excluir: 'Excluir', visualizar: 'Visualizar',
    gerenciar: 'Gerenciar', acessar: 'Acessar', atribuir: 'Atribuir',
    aprovar: 'Aprovar', analisar: 'Analisar', enviar: 'Enviar',
    usuarios: 'Usuários', cargos: 'Cargos', clientes: 'Clientes', equipes: 'Equipes',
    vendas: 'Vendas', produtos: 'Produtos', relatorios: 'Relatórios', metricas: 'Métricas',
    sinistros: 'Sinistros', campanhas: 'Campanhas', gamificacao: 'Gamificação',
    dashboard: 'Dashboard', workspace: 'Workspace', kanban: 'Kanban',
    chat: 'Chat', cadastro: 'Cadastro', gestao_crm: 'Gestão CRM',
  };
  return perm.split(':').map((part) =>
    part.split('_').map((t) => TOKEN_MAP[t] ?? (t.charAt(0).toUpperCase() + t.slice(1))).join(' ')
  ).join(': ');
}

export function useForbiddenRedirect() {
  const navigate = useNavigate();
  const redirectingRef = useRef(false);

  useEffect(() => {
    function handleForbidden(event: Event) {
      // Debounce: múltiplas queries paralelas com 403 disparam o evento várias
      // vezes quase simultaneamente — só o primeiro push deve acontecer.
      if (redirectingRef.current) return;
      if (window.location.pathname.startsWith('/sem-permissao')) return;

      redirectingRef.current = true;

      const detail = (event as CustomEvent<{ permissoesNecessarias: string[] }>).detail;
      const perms = detail?.permissoesNecessarias;

      navigate({
        to: '/sem-permissao',
        search: { permissao: perms?.length ? perms.join(',') : undefined as unknown as string },
      });

      // Libera o flag após a navegação para permitir redirecionamentos futuros
      // caso o usuário volte para uma página com o mesmo problema.
      setTimeout(() => { redirectingRef.current = false; }, 3000);
    }

    function handleOwnershipDenied() {
      toast.error('Você não tem acesso a este recurso específico.');
    }

    function handleMutationForbidden(event: Event) {
      const detail = (event as CustomEvent<{ permissoesNecessarias: string[] }>).detail;
      const perms = detail?.permissoesNecessarias ?? [];
      const label = perms.length
        ? `Permissão necessária: ${perms.map(formatPermissaoLabel).join(', ')}`
        : 'Você não tem permissão para realizar esta ação.';
      toast.error(label);
    }

    window.addEventListener('api:forbidden', handleForbidden);
    window.addEventListener('api:ownership-denied', handleOwnershipDenied);
    window.addEventListener('api:mutation-forbidden', handleMutationForbidden);
    return () => {
      window.removeEventListener('api:forbidden', handleForbidden);
      window.removeEventListener('api:ownership-denied', handleOwnershipDenied);
      window.removeEventListener('api:mutation-forbidden', handleMutationForbidden);
    };
  }, [navigate]);
}
