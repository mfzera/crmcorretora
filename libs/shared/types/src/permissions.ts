/**
 * Constantes de permissões do sistema — fonte única para backend e frontend.
 * Elimina strings mágicas espalhadas em rotas e hooks.
 */
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VISUALIZAR: 'dashboard:visualizar',

  // Usuários
  USUARIOS_VISUALIZAR: 'usuarios:visualizar',
  USUARIOS_CRIAR: 'usuarios:criar',
  USUARIOS_EDITAR: 'usuarios:editar',
  USUARIOS_EXCLUIR: 'usuarios:excluir',
  USUARIOS_ATRIBUIR_CARGO: 'usuarios:atribuir_cargo',

  // Cargos
  CARGOS_CRIAR: 'cargos:criar',
  CARGOS_EDITAR: 'cargos:editar',
  CARGOS_EXCLUIR: 'cargos:excluir',
  CARGOS_ATRIBUIR_PERMISSOES: 'cargos:atribuir_permissoes',

  // Clientes
  CLIENTES_VISUALIZAR: 'clientes:visualizar',
  CLIENTES_VISUALIZAR_TODOS: 'clientes:visualizar_todos',
  CLIENTES_CRIAR: 'clientes:criar',
  CLIENTES_EDITAR: 'clientes:editar',
  CLIENTES_EXCLUIR: 'clientes:excluir',
  CLIENTES_TRANSFERIR_CARTEIRA: 'clientes:transferir_carteira',

  // Vendas
  VENDAS_CRIAR_COTACAO: 'vendas:criar_cotacao',
  VENDAS_EDITAR_COTACAO: 'vendas:editar_cotacao',
  VENDAS_EXCLUIR_COTACAO: 'vendas:excluir_cotacao',
  VENDAS_VISUALIZAR_COTACAO: 'vendas:visualizar_cotacao',
  VENDAS_CRIAR_PROPOSTA: 'vendas:criar_proposta',
  VENDAS_EDITAR_PROPOSTA: 'vendas:editar_proposta',
  VENDAS_VISUALIZAR_PROPOSTA: 'vendas:visualizar_proposta',
  VENDAS_CRIAR_DOCUMENTO_VENDA: 'vendas:criar_documento_venda',
  VENDAS_EDITAR_DOCUMENTO_VENDA: 'vendas:editar_documento_venda',
  VENDAS_VISUALIZAR_DOCUMENTO_VENDA: 'vendas:visualizar_documento_venda',
  VENDAS_EDITAR_TODOS_DOCUMENTOS: 'vendas:editar_todos_documentos',
  VENDAS_VISUALIZAR_TODOS_DOCUMENTOS: 'vendas:visualizar_todos_documentos',
  VENDAS_CANCELAR_VENDA: 'vendas:cancelar_venda',
  VENDAS_CRIAR_ENDOSSO: 'vendas:criar_endosso',
  VENDAS_APROVAR_ENDOSSO: 'vendas:aprovar_endosso',
  VENDAS_SOLICITAR_TROCA_VENDEDOR: 'vendas:solicitar_troca_vendedor',
  VENDAS_APROVAR_TROCA_VENDEDOR: 'vendas:aprovar_troca_vendedor',

  // Cadastro
  CADASTRO_ACESSAR: 'cadastro:acessar',
  CADASTRO_APROVAR_VENDA: 'cadastro:aprovar_venda',
  CADASTRO_REJEITAR_VENDA: 'cadastro:rejeitar_venda',
  CADASTRO_APROVAR_ENDOSSO: 'cadastro:aprovar_endosso',

  // Vendedores
  VENDEDORES_VISUALIZAR: 'vendedores:visualizar',
  VENDEDORES_GERENCIAR: 'vendedores:gerenciar',

  // Equipes
  EQUIPES_VISUALIZAR: 'equipes:visualizar',

  // Workspace
  WORKSPACE_ACESSAR: 'workspace:acessar',
  WORKSPACE_VISUALIZAR_PLANILHA: 'workspace:visualizar_planilha',
  WORKSPACE_VISUALIZAR_PLANILHA_EQUIPE: 'workspace:visualizar_planilha_equipe',

  // Kanban
  KANBAN_ACESSAR: 'kanban:acessar',
  KANBAN_VISUALIZAR: 'kanban:visualizar',
  KANBAN_VISUALIZAR_TODAS: 'kanban:visualizar_todas',
  KANBAN_CRIAR: 'kanban:criar',
  KANBAN_EDITAR: 'kanban:editar',
  KANBAN_FECHAR: 'kanban:fechar',
  KANBAN_PERDER: 'kanban:perder',
  KANBAN_DELETAR: 'kanban:deletar',

  // Chat
  CHAT_ACESSAR: 'chat:acessar',
  CHAT_ENVIAR_MENSAGEM: 'chat:enviar_mensagem',
  CHAT_VISUALIZAR_MENSAGENS: 'chat:visualizar_mensagens',

  // Relatórios
  RELATORIOS_VENDAS: 'relatorios:vendas',
  RELATORIOS_COMISSOES: 'relatorios:comissoes',

  // Métricas
  METRICAS_ACESSAR: 'metricas:acessar',
  PERFORMANCE_VISUALIZAR: 'performance:visualizar',
  NEGOCIOS_CORRETORA_ACESSAR: 'negocios_corretora:acessar',

  // Sinistros
  SINISTROS_VISUALIZAR: 'sinistros:visualizar',
  SINISTROS_CRIAR: 'sinistros:criar',
  SINISTROS_INDICAR: 'sinistros:indicar',
  SINISTROS_ANALISAR: 'sinistros:analisar',
  SINISTROS_APROVAR: 'sinistros:aprovar',

  // Gamificação
  GAMIFICACAO_GERENCIAR: 'gamificacao:gerenciar',

  // Produtos / Configurações
  PRODUTOS_VISUALIZAR: 'produtos:visualizar',
  CONFIG_GERENCIAR_PRODUTOS: 'config:gerenciar_produtos',
  CONFIG_GERENCIAR_SEGURADORAS_PARCEIRAS: 'config:gerenciar_seguradoras_parceiras',
  CONFIG_EDITAR_SEGURADORA: 'config:editar_seguradora',
  CONFIGURACOES_GERENCIAR_COMISSOES: 'configuracoes:gerenciar_comissoes',

  // Gestão CRM / Marketing
  GESTAO_CRM_ACESSAR: 'gestao_crm:acessar',
  MARKETING_ACESSAR: 'marketing:acessar',
  IMPORTAR_RENOVACOES_ACESSAR: 'importar_renovacoes:acessar',

  // Renovações
  ACEITAR_EXCLUSAO_RENOVACAO: 'aceitar_exclusao:renovacao',
  ACEITAR_EXCLUSAO_VENDA: 'aceitar_exclusao:venda',

  // Admin
  ADMIN_MANAGE_SYSTEM: 'admin:manage_system',
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
export type PermissionValue = (typeof PERMISSIONS)[PermissionKey];
