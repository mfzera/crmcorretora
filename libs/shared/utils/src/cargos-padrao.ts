/**
 * Templates fixos de cargos para o sistema EcoTech
 *
 * Esses templates não são persistidos no banco de dados.
 * São usados como base para criar novos cargos nas corretoras.
 *
 * Cada template define:
 * - Nome e descrição do cargo
 * - Flags de nível (isAdmin, isGestor, isVendedor)
 * - Conjunto de permissões padrão
 * - Cor sugerida para identificação visual
 */

export interface CargoTemplate {
  nomeCargo: string;
  descricao: string;
  cor?: string;
  isAdmin?: boolean;
  isGestor: boolean;
  isVendedor: boolean;
  permissoes: readonly string[];
}

export const CARGOS_PADRAO = {
  GERENTE: {
    nomeCargo: 'Gerente',
    descricao: 'Supervisiona vendas, aprova documentos e gerencia equipe',
    cor: '#10b981', // verde
    isGestor: true,
    isVendedor: false,
    permissoes: [
      // Dashboard com métricas gerais
      'dashboard:visualizar',
      'dashboard:visualizar_metricas_pessoais',
      'dashboard:visualizar_metricas_equipe',
      'dashboard:visualizar_metricas_gerais',

      // Vendas - Cotações (todas)
      'vendas:criar_cotacao',
      'vendas:visualizar_cotacao',
      'vendas:visualizar_todas_cotacoes',
      'vendas:editar_cotacao',
      'vendas:excluir_cotacao',

      // Vendas - Propostas (todas)
      'vendas:criar_proposta',
      'vendas:visualizar_proposta',
      'vendas:visualizar_todas_propostas',
      'vendas:editar_proposta',

      // Vendas - Documentos (todos)
      'vendas:criar_documento_venda',
      'vendas:visualizar_documento_venda',
      'vendas:visualizar_todos_documentos',
      'vendas:editar_documento_venda',
      'vendas:cancelar_venda',

      // Vendas - Endossos
      'vendas:criar_endosso',
      'vendas:visualizar_endosso',
      'vendas:aprovar_endosso',

      // Vendas - Negócios Corretora
      'vendas:visualizar_negocios_corretora',
      'vendas:gerenciar_comissoes',

      // Cadastro - Aprovar e rejeitar
      'cadastro:acessar',
      'cadastro:visualizar_pendentes',
      'cadastro:validar_documentos',
      'cadastro:aprovar_venda',
      'cadastro:rejeitar_venda',
      'cadastro:editar_apolice',

      // Clientes - Acesso total
      'clientes:criar',
      'clientes:visualizar',
      'clientes:visualizar_todos',
      'clientes:editar',
      'clientes:excluir',
      'clientes:transferir_carteira',
      'clientes:exportar',

      // Renovações
      'renovacoes:acessar',
      'renovacoes:visualizar',
      'renovacoes:gerenciar',

      // Métricas completas
      'metricas:acessar',
      'metricas:visualizar_pessoais',
      'metricas:visualizar_equipe',
      'metricas:visualizar_gerais',
      'metricas:comparar_vendedores',

      // Relatórios - Acesso completo
      'relatorios:acessar',
      'relatorios:vendas',
      'relatorios:comissoes',
      'relatorios:financeiro',
      'relatorios:producao',
      'relatorios:exportar',

      // Usuários - Visualizar e criar
      'usuarios:acessar',
      'usuarios:criar',
      'usuarios:visualizar',
      'usuarios:editar',
      'usuarios:resetar_senha',
      'usuarios:atribuir_cargo',

      // Equipes
      'equipes:criar',
      'equipes:visualizar',
      'equipes:editar',
      'equipes:gerenciar_membros',

      // Produtos
      'produtos:visualizar',
      'produtos:criar',
      'produtos:editar',
      'seguradoras_parceiras:visualizar',
      'seguradoras_parceiras:gerenciar',

      // Configurações
      'config:acessar',

      // Workspace e Ferramentas
      'workspace:acessar',
      'kanban:acessar',
      'kanban:visualizar',
      'kanban:visualizar_todas',
      'kanban:criar',
      'kanban:editar',
      'kanban:deletar',
      'kanban:fechar',
      'kanban:perder',
      'chat:acessar',
      'performance:acessar',
      'performance:visualizar',

      // Gestão
      'importar_renovacoes:acessar',
      'aceitar_exclusao:renovacao',
      'aceitar_exclusao:venda',
      'gestao_comercial:acessar',
      'gestao_pessoas:acessar',
      'gestao_crm:acessar',

      // Negócios Corretora
      'negocios_corretora:acessar',

      // Marketing
      'marketing:acessar',

      // Gamificação
      'gamificacao:gerenciar',
    ],
  },

  VENDEDOR: {
    nomeCargo: 'Vendedor',
    descricao: 'Cria e gerencia suas próprias vendas e clientes',
    cor: '#3b82f6', // azul
    isGestor: false,
    isVendedor: true,
    permissoes: [
      // Dashboard pessoal
      'dashboard:visualizar',
      'dashboard:visualizar_metricas_pessoais',

      // Vendas - Cotações (próprias)
      'vendas:criar_cotacao',
      'vendas:visualizar_cotacao',
      'vendas:editar_cotacao',
      'vendas:excluir_cotacao',

      // Vendas - Propostas (próprias)
      'vendas:criar_proposta',
      'vendas:visualizar_proposta',
      'vendas:editar_proposta',

      // Vendas - Documentos (próprios)
      'vendas:criar_documento_venda',
      'vendas:visualizar_documento_venda',
      'vendas:editar_documento_venda',

      // Vendas - Endossos
      'vendas:criar_endosso',
      'vendas:visualizar_endosso',

      // Clientes - Apenas os próprios
      'clientes:criar',
      'clientes:visualizar',
      'clientes:editar',

      // Renovações (próprias)
      'renovacoes:acessar',
      'renovacoes:visualizar',

      // Métricas pessoais
      'metricas:acessar',
      'metricas:visualizar_pessoais',

      // Relatórios - Apenas suas vendas
      'relatorios:acessar',
      'relatorios:vendas',
      'relatorios:comissoes',
      'relatorios:exportar',

      // Produtos (visualizar)
      'produtos:visualizar',
      'seguradoras_parceiras:visualizar',

      // Workspace e Ferramentas
      'workspace:acessar',
      'kanban:acessar',
      'kanban:visualizar',
      'kanban:criar',
      'kanban:editar',
      'kanban:deletar',
      'kanban:fechar',
      'kanban:perder',
      'chat:acessar',
      'performance:acessar',
    ],
  },

  CADASTRO: {
    nomeCargo: 'Cadastro',
    descricao: 'Valida documentação e ativa apólices',
    cor: '#f59e0b', // laranja
    isGestor: false,
    isVendedor: false,
    permissoes: [
      // Dashboard
      'dashboard:visualizar',

      // Cadastro - Função principal
      'cadastro:acessar',
      'cadastro:visualizar_pendentes',
      'cadastro:validar_documentos',
      'cadastro:aprovar_venda',
      'cadastro:rejeitar_venda',
      'cadastro:editar_apolice',

      // Vendas - Visualizar e editar dados de apólice
      'vendas:visualizar_documento_venda',
      'vendas:visualizar_todos_documentos',
      'vendas:editar_documento_venda',

      // Endossos
      'vendas:visualizar_endosso',
      'vendas:aprovar_endosso',

      // Clientes - Visualizar e criar para validação e cadastro
      'clientes:criar',
      'clientes:visualizar',
      'clientes:visualizar_todos',

      // Renovações (visualizar)
      'renovacoes:acessar',
      'renovacoes:visualizar',

      // Produtos (visualizar)
      'produtos:visualizar',
      'seguradoras_parceiras:visualizar',
    ],
  },

  SINISTROS: {
    nomeCargo: 'Sinistros',
    descricao: 'Abre, analisa e processa sinistros da corretora',
    cor: '#f43f5e', // rose
    isGestor: false,
    isVendedor: false,
    permissoes: [
      // Dashboard
      'dashboard:visualizar',

      // Sinistros - Função principal
      'sinistros:visualizar',
      'sinistros:criar',
      'sinistros:visualizar_todos',
      'sinistros:analisar',
      'sinistros:aprovar',

      // Clientes - Visualizar e criar para consulta e cadastro no sinistro
      'clientes:criar',
      'clientes:visualizar',
      'clientes:visualizar_todos',

      // Vendas - Visualizar apólices vinculadas
      'vendas:visualizar_documento_venda',
      'vendas:visualizar_todos_documentos',

      // Produtos (visualizar)
      'produtos:visualizar',
      'seguradoras_parceiras:visualizar',
    ],
  },
} as const satisfies Record<string, CargoTemplate>;

export type CargosPadraoKeys = keyof typeof CARGOS_PADRAO;

// ============================================================================
// Funções utilitárias para trabalhar com templates
// ============================================================================

/**
 * Retorna a definição completa de um template de cargo
 *
 * @example
 * const gerente = getCargoTemplate('GERENTE');
 * console.log(gerente.nomeCargo); // "Gerente"
 */
export function getCargoTemplate(cargo: CargosPadraoKeys): CargoTemplate {
  return CARGOS_PADRAO[cargo];
}

/**
 * Retorna todos os templates de cargos disponíveis
 *
 * @example
 * const templates = getAllCargoTemplates();
 * templates.forEach(t => console.log(t.nomeCargo));
 */
export function getAllCargoTemplates(): CargoTemplate[] {
  return Object.values(CARGOS_PADRAO);
}

/**
 * Retorna lista de templates formatada para uso em selects/comboboxes
 *
 * @example
 * const options = getCargoTemplateOptions();
 * // [{ value: 'GERENTE', label: 'Gerente', description: '...' }, ...]
 */
export function getCargoTemplateOptions() {
  return Object.entries(CARGOS_PADRAO).map(([key, template]) => ({
    value: key as CargosPadraoKeys,
    label: template.nomeCargo,
    description: template.descricao,
    cor: template.cor,
  }));
}

/**
 * Busca um template pelo nome do cargo (case-insensitive)
 *
 * @example
 * const template = findCargoTemplateByName('vendedor');
 * if (template) {
 *   console.log(template.permissoes.length);
 * }
 */
export function findCargoTemplateByName(
  nomeCargo: string,
): { key: CargosPadraoKeys; template: CargoTemplate } | null {
  const entry = Object.entries(CARGOS_PADRAO).find(
    ([, template]) =>
      template.nomeCargo.toLowerCase() === nomeCargo.toLowerCase(),
  );

  if (!entry) return null;

  return {
    key: entry[0] as CargosPadraoKeys,
    template: entry[1],
  };
}

/**
 * Converte array de nomes de permissões em IDs usando o mapa de permissões globais
 *
 * @example
 * const ids = getPermissaoIdsByNames(
 *   ['vendas:criar_cotacao', 'vendas:visualizar_cotacao'],
 *   permissoesGlobais
 * );
 */
export function getPermissaoIdsByNames(
  permissaoNames: readonly string[],
  permissoesGlobais: Array<{ id: string; nomePermissao: string }>,
): string[] {
  return permissaoNames
    .map((nome) => {
      const permissao = permissoesGlobais.find((p) => p.nomePermissao === nome);
      return permissao?.id;
    })
    .filter((id): id is string => id !== undefined);
}

/**
 * Valida se todas as permissões de um template existem no sistema
 * Retorna array de permissões não encontradas
 *
 * @example
 * const missing = validateTemplatePermissions(
 *   CARGOS_PADRAO.GERENTE,
 *   permissoesGlobais
 * );
 * if (missing.length > 0) {
 *   console.error('Permissões faltando:', missing);
 * }
 */
export function validateTemplatePermissions(
  template: CargoTemplate,
  permissoesGlobais: Array<{ nomePermissao: string }>,
): string[] {
  const permissoesExistentes = new Set(
    permissoesGlobais.map((p) => p.nomePermissao),
  );

  return template.permissoes.filter((p) => !permissoesExistentes.has(p));
}

// ============================================================================
// Constantes auxiliares
// ============================================================================

/**
 * Lista de todas as chaves de templates disponíveis
 */
export const CARGO_TEMPLATE_KEYS = Object.keys(
  CARGOS_PADRAO,
) as CargosPadraoKeys[];

/**
 * Mapa de cores dos templates para uso direto
 */
export const CARGO_TEMPLATE_CORES = {
  GERENTE: '#10b981',
  VENDEDOR: '#3b82f6',
  CADASTRO: '#f59e0b',
  SINISTROS: '#f43f5e',
} as const;

/**
 * @deprecated Use getCargoTemplate() instead
 */
export function getCargoPadraoDefinition(cargo: CargosPadraoKeys) {
  return getCargoTemplate(cargo);
}

/**
 * @deprecated Use getAllCargoTemplates() instead
 */
export function getAllCargoPadraoDefinitions() {
  return getAllCargoTemplates();
}
