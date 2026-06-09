export type BadgeRaridade = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';
export type BadgeCategoria =
  | 'volume_seguros'
  | 'volume_renovacoes'
  | 'volume_cotacoes'
  | 'streak'
  | 'conversao'
  | 'pos_venda'
  | 'marcos'
  | 'campanha'
  | 'geral';

const RARIDADE_MAP: Record<string, BadgeRaridade> = {
  // Streaks
  streak_5: 'incomum',
  streak_20: 'raro',
  streak_60: 'lendario',
  // Volume seguros
  vol_seguros_bronze: 'comum',
  vol_seguros_prata: 'incomum',
  vol_seguros_ouro: 'raro',
  vol_seguros_platina: 'epico',
  vol_seguros_diamante: 'lendario',
  // Volume renovações
  vol_renov_bronze: 'comum',
  vol_renov_prata: 'incomum',
  vol_renov_ouro: 'raro',
  vol_renov_platina: 'epico',
  vol_renov_diamante: 'lendario',
  // Volume cotações
  vol_cot_bronze: 'comum',
  vol_cot_prata: 'incomum',
  vol_cot_ouro: 'raro',
  vol_cot_platina: 'epico',
  vol_cot_diamante: 'lendario',
  // Conversão/qualidade
  cacador_eficiente: 'raro',
  guardiao: 'raro',
  tricampeao: 'lendario',
  hat_trick: 'epico',
  mes_de_fogo: 'incomum',
  // Ticket alto
  ticket_alto_1: 'incomum',
  ticket_alto_5: 'raro',
  ticket_alto_10: 'epico',
  // Pós-venda
  pos_venda_1: 'comum',
  pos_venda_10: 'incomum',
  // Comunicador
  comunicador_100: 'comum',
  comunicador_500: 'incomum',
  atento: 'incomum',
  // Marcos
  estreante: 'comum',
  primeira_venda: 'comum',
  primeira_renovacao: 'comum',
  um_ano_de_casa: 'raro',
  meta_batida: 'comum',
  missao_cumprida: 'comum',
  primeira_meta: 'comum',
  // Manual/especiais
  top_renovador: 'incomum',
  vendedor_mes: 'raro',
  '5_seguros_semana': 'incomum',
};

const CATEGORIA_MAP: Record<string, BadgeCategoria> = {
  vol_seguros_bronze: 'volume_seguros',
  vol_seguros_prata: 'volume_seguros',
  vol_seguros_ouro: 'volume_seguros',
  vol_seguros_platina: 'volume_seguros',
  vol_seguros_diamante: 'volume_seguros',
  vol_renov_bronze: 'volume_renovacoes',
  vol_renov_prata: 'volume_renovacoes',
  vol_renov_ouro: 'volume_renovacoes',
  vol_renov_platina: 'volume_renovacoes',
  vol_renov_diamante: 'volume_renovacoes',
  vol_cot_bronze: 'volume_cotacoes',
  vol_cot_prata: 'volume_cotacoes',
  vol_cot_ouro: 'volume_cotacoes',
  vol_cot_platina: 'volume_cotacoes',
  vol_cot_diamante: 'volume_cotacoes',
  streak_5: 'streak',
  streak_20: 'streak',
  streak_60: 'streak',
  mes_de_fogo: 'streak',
  hat_trick: 'streak',
  cacador_eficiente: 'conversao',
  tricampeao: 'conversao',
  guardiao: 'conversao',
  ticket_alto_1: 'conversao',
  ticket_alto_5: 'conversao',
  ticket_alto_10: 'conversao',
  pos_venda_1: 'pos_venda',
  pos_venda_10: 'pos_venda',
  comunicador_100: 'pos_venda',
  comunicador_500: 'pos_venda',
  atento: 'pos_venda',
  estreante: 'marcos',
  primeira_venda: 'marcos',
  primeira_renovacao: 'marcos',
  um_ano_de_casa: 'marcos',
  primeira_meta: 'marcos',
  meta_batida: 'geral',
  missao_cumprida: 'geral',
  top_renovador: 'geral',
  vendedor_mes: 'geral',
  '5_seguros_semana': 'geral',
};

export const RARIDADE_LABEL: Record<BadgeRaridade, string> = {
  comum: 'Comum',
  incomum: 'Incomum',
  raro: 'Raro',
  epico: 'Épico',
  lendario: 'Lendário',
};

export const RARIDADE_ORDER: BadgeRaridade[] = ['comum', 'incomum', 'raro', 'epico', 'lendario'];

export const RARIDADE_CLASSES: Record<BadgeRaridade, { ring: string; glow: string; label: string; dot: string }> = {
  comum: {
    ring: 'ring-border',
    glow: '',
    label: 'text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
  incomum: {
    ring: 'ring-green-400 dark:ring-green-600',
    glow: '',
    label: 'text-green-600 dark:text-green-400',
    dot: 'bg-green-500',
  },
  raro: {
    ring: 'ring-blue-400 dark:ring-blue-500',
    glow: 'shadow-blue-500/20',
    label: 'text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  epico: {
    ring: 'ring-purple-400 dark:ring-purple-500',
    glow: 'shadow-purple-500/30',
    label: 'text-purple-600 dark:text-purple-400',
    dot: 'bg-purple-500',
  },
  lendario: {
    ring: 'ring-yellow-400 dark:ring-yellow-500',
    glow: 'shadow-yellow-500/40',
    label: 'text-yellow-600 dark:text-yellow-400',
    dot: 'bg-yellow-500',
  },
};

export const CATEGORIA_LABEL: Record<BadgeCategoria, string> = {
  volume_seguros: 'Volume · Seguros',
  volume_renovacoes: 'Volume · Renovações',
  volume_cotacoes: 'Volume · Cotações',
  streak: 'Consistência',
  conversao: 'Conversão',
  pos_venda: 'Pós-venda',
  marcos: 'Marcos',
  campanha: 'Campanha',
  geral: 'Geral',
};

export function getRaridadeBadge(slug: string): BadgeRaridade {
  return RARIDADE_MAP[slug] ?? 'comum';
}

export function getCategoriaBadge(slug: string): BadgeCategoria {
  return CATEGORIA_MAP[slug] ?? 'geral';
}
