export interface KanbanColumnDef {
  id: string;
  title: string;
  /** Tailwind class para indicadores (dot, badge). Ex: 'bg-blue-500' */
  color: string;
  /** Tailwind class para o fundo do header da coluna. Se omitido, usa color. */
  headerBg?: string;
  visible: boolean;
  ordem: number;
  isCustom: boolean;
  isTerminal?: boolean;
}

export interface KanbanBoardConfig {
  standardConfigs: Array<{
    id: string;
    columnId: string;
    visible: boolean;
    ordem: number;
    label: string | null;
    color: string | null;
  }>;
  customColumns: Array<{
    id: string;
    label: string;
    color: string;
    ordem: number;
    isTerminal: boolean;
  }>;
}

/** Coluna padrão de domínio (antes de merge com config do banco) */
export interface KanbanDefaultColumn {
  id: string;
  title: string;
  color: string;
  headerBg?: string;
  isTerminal?: boolean;
}
