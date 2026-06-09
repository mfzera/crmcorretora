import { createFileRoute } from '@tanstack/react-router';

import { ShieldAlert, ArrowLeft, Home, ShieldCheck, Info } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { useAuthStore } from '@/infra/auth/auth-store';
import { api } from '@/infra/http/api';

export const Route = createFileRoute('/_app/sem-permissao')({
  validateSearch: (search) => ({
    permissao: (search.permissao as string) ?? undefined,
  }),
  component: SemPermissaoPage,
});

// Overrides explícitos para nomes que a heurística não acerta bem
const PERMISSAO_LABEL_OVERRIDES: Record<string, string> = {
  'negocios_corretora:acessar': 'Acessar Negócios da Corretora',
  'performance:visualizar': 'Visualizar Performance da Equipe',
  'gestao_crm:acessar': 'Acessar Gestão CRM',
};

const TOKEN_MAP: Record<string, string> = {
  criar: 'Criar', editar: 'Editar', excluir: 'Excluir', visualizar: 'Visualizar',
  gerenciar: 'Gerenciar', acessar: 'Acessar', atribuir: 'Atribuir',
  aprovar: 'Aprovar', analisar: 'Analisar', enviar: 'Enviar',
  usuarios: 'Usuários', cargos: 'Cargos', clientes: 'Clientes', equipes: 'Equipes',
  vendas: 'Vendas', produtos: 'Produtos', relatorios: 'Relatórios', metricas: 'Métricas',
  sinistros: 'Sinistros', campanhas: 'Campanhas', gamificacao: 'Gamificação',
  dashboard: 'Dashboard', workspace: 'Workspace', kanban: 'Kanban',
  chat: 'Chat', cadastro: 'Cadastro', painel: 'Painel', performance: 'Performance',
  vendedores: 'Vendedores', negocios: 'Negócios', corretora: 'Corretora',
};

function autoLabel(perm: string): string {
  return perm.split(':').map((part) =>
    part.split('_').map((t) => TOKEN_MAP[t] ?? (t.charAt(0).toUpperCase() + t.slice(1))).join(' ')
  ).join(': ');
}

function getPermissaoLabel(permissao: string): string {
  const labels = permissao.split(',').map((p) => {
    const key = p.trim();
    return PERMISSAO_LABEL_OVERRIDES[key] ?? autoLabel(key);
  });
  return labels.join(' ou ');
}

function SemPermissaoPage() {
  const navigate = useNavigate();
  const { permissao } = Route.useSearch();
  const { user } = useAuthStore();
  const isAdmin = user?.isAdmin ?? false;

  // Buscar cargos que possuem a permissão — só para a primeira permissão da lista
  const firstPerm = permissao?.split(',')[0]?.trim();
  const { data: cargosComPermissao } = useQuery({
    queryKey: ['cargos-com-permissao', firstPerm],
    queryFn: () => api.get<Array<{ id: string; nomeCargo: string; cor: string | null }>>(`/roles/with-permission`, { params: { permissao: firstPerm! } }),
    enabled: !!firstPerm && !isAdmin,
    staleTime: 60_000,
    retry: false,
  });

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-5 text-center max-w-md w-full">
        <div className="rounded-full bg-destructive/10 p-6">
          <ShieldAlert className="h-16 w-16 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Acesso Negado</h1>
          <p className="text-muted-foreground text-base">
            Você não tem permissão para acessar esta página.
          </p>
        </div>

        {permissao && (
          <div className="w-full rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-left space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Permissão necessária
            </p>
            <p className="font-semibold text-foreground">{getPermissaoLabel(permissao)}</p>
            <code className="text-xs font-mono text-destructive">{permissao}</code>
          </div>
        )}

        <div className="w-full rounded-md border bg-muted/40 px-4 py-3 text-sm text-left flex gap-3">
          {isAdmin ? (
            <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          ) : (
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          )}
          <div className="space-y-1">
            {isAdmin ? (
              <>
                <p className="font-medium text-foreground">Você é administrador</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Administradores têm acesso total por padrão. Se você está vendo esta tela,
                  pode ser um problema de sessão — tente sair e entrar novamente.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-foreground">Sem acesso suficiente</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Seu cargo não inclui essa permissão. Solicite ao administrador do sistema
                  que atualize as permissões do seu cargo em{' '}
                  <span className="font-medium text-foreground">Usuários &gt; Cargos</span>.
                </p>
                {Array.isArray(cargosComPermissao) && cargosComPermissao.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Cargos com esta permissão:</p>
                    <div className="flex flex-wrap gap-1">
                      {cargosComPermissao.map((c) => (
                        <Badge key={c.id} variant="secondary" className="text-xs" style={c.cor ? { borderColor: c.cor, color: c.cor } : undefined}>
                          {c.nomeCargo}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button
            onClick={() => navigate({ to: '/dashboard' })}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Ir para o Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
