import { api } from '@/infra/http/api';
import type { TarefaPendente } from '@/modules/dashboard/http';

export type { TarefaPendente };

interface CreateTarefaData {
  titulo: string;
  descricao?: string;
  prioridade?: 'baixa' | 'media' | 'alta';
  dataVencimento?: string;
  entidadeTipo?: string;
  entidadeId?: string;
}

interface UpdateTarefaData {
  titulo?: string;
  descricao?: string | null;
  prioridade?: 'baixa' | 'media' | 'alta';
  dataVencimento?: string | null;
  concluida?: boolean;
}

interface TarefasResponse {
  success: boolean;
  data: TarefaPendente[];
}

export async function getTarefas(concluida?: boolean): Promise<TarefaPendente[]> {
  const params: Record<string, string> = {};
  if (concluida !== undefined) params.concluida = String(concluida);
  const data = await api.get<TarefaPendente[]>('/tasks', { params });
  return data;
}

export async function createTarefa(body: CreateTarefaData): Promise<TarefaPendente> {
  const data = await api.post<TarefaPendente>('/tasks', body);
  return data;
}

export async function updateTarefa(id: string, body: UpdateTarefaData): Promise<TarefaPendente> {
  const data = await api.patch<TarefaPendente>(`/tasks/${id}`, body);
  return data;
}

export async function concluirTarefa(id: string, concluida = true): Promise<TarefaPendente> {
  const data = await api.patch<TarefaPendente>(`/tasks/${id}/complete`, { concluida });
  return data;
}

export async function deleteTarefa(id: string): Promise<void> {
  await api.delete(`/tasks/${id}`);
}
