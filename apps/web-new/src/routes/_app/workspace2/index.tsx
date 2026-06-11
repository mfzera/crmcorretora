import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { WorkspaceScreen } from '@/modules/workspace2';
import {
  cotacoesAtivasQueryOptions,
  planilhaRenovacoesQueryOptions,
  equipeWorkspaceQueryOptions,
} from '@/modules/area-trabalho/http';

// O registro do ag-Grid mora em components/workspace-grid.tsx (carregado via React.lazy),
// para que o vendor-aggrid (~1,1 MB) fique fora do chunk inicial da rota /workspace2.

function getCurrentMonthFiltros() {
  const now = new Date();
  const vigenciaInicio = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const vigenciaFim = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { vigenciaInicio, vigenciaFim };
}

const workspaceSearchSchema = z.object({
  tab:            z.enum(['renovacoes', 'novos-seguros', 'logs', 'equipe']).optional().catch('renovacoes'),
  logsPage:       z.coerce.number().min(1).optional().catch(1),
  logsCat:        z.string().optional().catch(''),
  logsQ:          z.string().optional().catch(''),
  logsDataInicio: z.string().optional().catch(''),
  logsDataFim:    z.string().optional().catch(''),
  doc:            z.string().optional().catch(''),
});

export type WorkspaceSearch = z.infer<typeof workspaceSearchSchema>;

export const Route = createFileRoute('/_app/workspace2/')({
  component: WorkspaceScreen,
  pendingComponent: WorkspacePending,
  validateSearch: workspaceSearchSchema,
  loader: ({ context: { queryClient } }) => {
    const filtros = getCurrentMonthFiltros();
    // Aquece o cache das queries críticas SEM bloquear o paint: a rota monta
    // imediatamente e a tela exibe skeletons (loadingRenovacoes/loadingCotacoes)
    // enquanto os dados chegam. Mesmo padrão de routes/_app/usuarios.tsx.
    void queryClient.ensureQueryData(planilhaRenovacoesQueryOptions(filtros)).catch(() => {});
    void queryClient.ensureQueryData(cotacoesAtivasQueryOptions()).catch(() => {});
    // Dados de equipe: mais pesado, prefetch em background.
    void queryClient.prefetchQuery(equipeWorkspaceQueryOptions());
  },
});

function WorkspacePending() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}
