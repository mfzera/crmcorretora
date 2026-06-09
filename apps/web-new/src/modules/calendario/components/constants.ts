import type { EventoTipo } from './types';

export interface CategoriaCalendario {
  id: EventoTipo;
  label: string;
  dotClass: string;
  bgClass: string;
  textClass: string;
}

export const CATEGORIAS: CategoriaCalendario[] = [
  {
    id: 'tarefa',
    label: 'Tarefas',
    dotClass: 'bg-blue-500',
    bgClass: 'bg-blue-100 dark:bg-blue-950',
    textClass: 'text-blue-700 dark:text-blue-400',
  },
  {
    id: 'renovacao',
    label: 'Renovações',
    dotClass: 'bg-orange-500',
    bgClass: 'bg-orange-100 dark:bg-orange-950',
    textClass: 'text-orange-700 dark:text-orange-400',
  },
  {
    id: 'documento',
    label: 'Vencimentos',
    dotClass: 'bg-purple-500',
    bgClass: 'bg-purple-100 dark:bg-purple-950',
    textClass: 'text-purple-700 dark:text-purple-400',
  },
  {
    id: 'oportunidade',
    label: 'Oportunidades',
    dotClass: 'bg-green-500',
    bgClass: 'bg-green-100 dark:bg-green-950',
    textClass: 'text-green-700 dark:text-green-400',
  },
  {
    id: 'google',
    label: 'Google Calendar',
    dotClass: 'bg-red-500',
    bgClass: 'bg-red-100 dark:bg-red-950',
    textClass: 'text-red-700 dark:text-red-400',
  },
];

// Map tipo -> API query param name
export const TIPO_TO_PARAM: Record<EventoTipo, string> = {
  tarefa: 'tarefas',
  renovacao: 'renovacoes',
  documento: 'documentos',
  oportunidade: 'oportunidades',
  google: 'google',
};
