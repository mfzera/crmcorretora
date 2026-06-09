import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { WorkspaceScreen } from '@/modules/workspace2';
import {
  cotacoesAtivasQueryOptions,
  planilhaRenovacoesQueryOptions,
  equipeWorkspaceQueryOptions,
} from '@/modules/area-trabalho/http';

ModuleRegistry.registerModules([AllCommunityModule]);

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
  validateSearch: workspaceSearchSchema,
  loader: async ({ context: { queryClient } }) => {
    const filtros = getCurrentMonthFiltros();
    // Dados críticos: dispara em paralelo e aguarda antes de renderizar a rota
    await Promise.all([
      queryClient.prefetchQuery(planilhaRenovacoesQueryOptions(filtros)),
      queryClient.prefetchQuery(cotacoesAtivasQueryOptions()),
    ]);
    // Dados de equipe: mais pesado, não bloqueia a navegação
    void queryClient.prefetchQuery(equipeWorkspaceQueryOptions());
  },
});
