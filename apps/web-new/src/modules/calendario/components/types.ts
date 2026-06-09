export type EventoTipo = 'tarefa' | 'renovacao' | 'documento' | 'oportunidade' | 'google';

export interface CalendarioEvento {
  id: string;
  tipo: EventoTipo;
  titulo: string;
  data: string; // YYYY-MM-DD
  meta: {
    // Tarefa
    prioridade?: 'baixa' | 'media' | 'alta';
    concluida?: boolean;
    entidadeTipo?: string | null;
    // Renovacao
    status?: string;
    clienteNome?: string;
    premioAnterior?: number;
    // Documento
    tipoDocumento?: string;
    statusDocumento?: string;
    numeroDocumento?: string;
    // Google Calendar
    descricao?: string;
    hangoutLink?: string;
    htmlLink?: string;
    horaInicio?: string;
    horaFim?: string;
    diaTodo?: boolean;
  };
}

export interface CalendarioResumo {
  tarefas: number;
  renovacoes: number;
  documentos: number;
  oportunidades: number;
  google?: number;
}

export interface CalendarioData {
  eventos: Record<string, CalendarioEvento[]>;
  resumo: CalendarioResumo;
}
