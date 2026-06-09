import { api } from '@/infra/http/api';
import { queryOptions } from '@tanstack/react-query';

export interface DashboardStats {
  clientesAtivos: number;
  renovacoesPendentes: number;
  cotacoesAbertas: number;
  prospeccoesEmCadastro: number;
  premioLiquidoMes: number;
  comissaoMes: number;
  mediaComissaoPercent: number;
}

export interface RenovacaoUrgente {
  id: string;
  clienteNome: string;
  produto: string;
  dataVencimento: string;
  premioAnterior: number;
  diasRestantes: number;
}

export interface AtividadeRecente {
  id: string;
  tipo: 'cotacao' | 'proposta' | 'renovacao' | 'cliente';
  descricao: string;
  data: string;
}

export interface AlertaFollowUp {
  id: string;
  numeroCotacao: string;
  clienteNome: string;
  produto: string;
  diasSemMovimento: number;
  ultimaAtualizacao: string;
}

export interface TarefaPendente {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: 'baixa' | 'media' | 'alta';
  dataVencimento: string | null;
  entidadeTipo: string | null;
  entidadeId: string | null;
  createdAt: string;
}

export interface RenovacoesChartItem {
  date: string;
  renovacoes: number;
  convertidos: number;
}

interface DashboardResponse {
  success: boolean;
  data: {
    stats: DashboardStats;
    renovacoesUrgentes: RenovacaoUrgente[];
    atividadesRecentes: AtividadeRecente[];
    alertasFollowUp: AlertaFollowUp[];
    tarefasPendentes: TarefaPendente[];
  };
}

export function dashboardQueryOptions() {
  return queryOptions({
    queryKey: ['dashboard'] as const,
    queryFn: getDashboardData,
    retry: false,
  });
}

export async function getDashboardData(): Promise<DashboardResponse['data']> {
  const data = await api.get<DashboardResponse['data']>('/dashboard');
  return data;
}

export async function getRenovacoesChartData(
  periodo: 'semana' | 'mes' | 'trimestre',
): Promise<RenovacoesChartItem[]> {
  const data = await api.get<RenovacoesChartItem[]>(
    `/dashboard/renewals-chart?periodo=${periodo}`,
  );
  return data;
}
