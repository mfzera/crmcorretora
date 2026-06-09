import 'dotenv/config';
import { db } from './connection.js';
import { planos, permissoesGlobais } from './schema/index.js';

async function seed() {
  console.log('Seeding database...');

  // Seed Plans
  console.log('Creating plans...');
  await db
    .insert(planos)
    .values([
      {
        nomePlano: 'Starter',
        descricao: 'Plano ideal para pequenas corretoras',
        limiteUsuarios: 5,
        limiteVendedores: 3,
        limiteClientes: 500,
        limiteVendasMes: 100,
        valorMensal: '199.00',
        valorAnual: '1990.00',
        features: {
          api_access: false,
          relatorios_avancados: false,
          suporte_prioritario: false,
        },
        ativo: true,
      },
      {
        nomePlano: 'Professional',
        descricao: 'Plano para corretoras em crescimento',
        limiteUsuarios: 20,
        limiteVendedores: 15,
        limiteClientes: 2000,
        limiteVendasMes: 500,
        valorMensal: '499.00',
        valorAnual: '4990.00',
        features: {
          api_access: true,
          relatorios_avancados: true,
          suporte_prioritario: false,
        },
        ativo: true,
      },
      {
        nomePlano: 'Enterprise',
        descricao: 'Plano ilimitado para grandes operações',
        limiteUsuarios: null,
        limiteVendedores: null,
        limiteClientes: null,
        limiteVendasMes: null,
        valorMensal: '1999.00',
        valorAnual: '19990.00',
        features: {
          api_access: true,
          relatorios_avancados: true,
          suporte_prioritario: true,
          integracao_customizada: true,
        },
        ativo: true,
      },
    ])
    .onConflictDoNothing();

  // Seed Global Permissions
  console.log('Creating global permissions...');
  const permissions = [
    // === DASHBOARD ===
    {
      nomePermissao: 'dashboard:visualizar',
      descricao: 'Acessar dashboard principal',
      grupo: 'dashboard',
    },
    {
      nomePermissao: 'dashboard:visualizar_metricas_pessoais',
      descricao: 'Ver métricas pessoais',
      grupo: 'dashboard',
    },
    {
      nomePermissao: 'dashboard:visualizar_metricas_equipe',
      descricao: 'Ver métricas da equipe',
      grupo: 'dashboard',
    },
    {
      nomePermissao: 'dashboard:visualizar_metricas_gerais',
      descricao: 'Ver métricas gerais da corretora',
      grupo: 'dashboard',
    },

    // === VENDAS - Cotações ===
    {
      nomePermissao: 'vendas:criar_cotacao',
      descricao: 'Criar cotações',
      grupo: 'vendas',
    },
    {
      nomePermissao: 'vendas:visualizar_cotacao',
      descricao: 'Visualizar cotações próprias',
      grupo: 'vendas',
    },
    {
      nomePermissao: 'vendas:visualizar_todas_cotacoes',
      descricao: 'Visualizar todas as cotações',
      grupo: 'vendas',
    },
    {
      nomePermissao: 'vendas:editar_cotacao',
      descricao: 'Editar cotações',
      grupo: 'vendas',
    },
    {
      nomePermissao: 'vendas:excluir_cotacao',
      descricao: 'Excluir cotações',
      grupo: 'vendas',
    },

    // === VENDAS - Propostas ===
    {
      nomePermissao: 'vendas:criar_proposta',
      descricao: 'Criar propostas',
      grupo: 'vendas',
    },
    {
      nomePermissao: 'vendas:visualizar_proposta',
      descricao: 'Visualizar propostas próprias',
      grupo: 'vendas',
    },
    {
      nomePermissao: 'vendas:visualizar_todas_propostas',
      descricao: 'Visualizar todas as propostas',
      grupo: 'vendas',
    },
    {
      nomePermissao: 'vendas:editar_proposta',
      descricao: 'Editar propostas',
      grupo: 'vendas',
    },

    // === VENDAS - Documentos ===
    {
      nomePermissao: 'vendas:criar_documento_venda',
      descricao: 'Criar documentos de venda',
      grupo: 'vendas',
    },
    {
      nomePermissao: 'vendas:visualizar_documento_venda',
      descricao: 'Visualizar documentos próprios',
      grupo: 'vendas',
    },
    {
      nomePermissao: 'vendas:visualizar_todos_documentos',
      descricao: 'Visualizar documentos de todos',
      grupo: 'vendas',
    },
    {
      nomePermissao: 'vendas:editar_documento_venda',
      descricao: 'Editar documentos de venda',
      grupo: 'vendas',
    },
    {
      nomePermissao: 'vendas:cancelar_venda',
      descricao: 'Cancelar vendas',
      grupo: 'vendas',
    },

    // === VENDAS - Endossos ===
    {
      nomePermissao: 'vendas:criar_endosso',
      descricao: 'Criar endossos',
      grupo: 'vendas',
    },
    {
      nomePermissao: 'vendas:visualizar_endosso',
      descricao: 'Visualizar endossos',
      grupo: 'vendas',
    },
    {
      nomePermissao: 'vendas:aprovar_endosso',
      descricao: 'Aprovar endossos',
      grupo: 'vendas',
    },

    // === VENDAS - Negócios Corretora ===
    {
      nomePermissao: 'vendas:visualizar_negocios_corretora',
      descricao: 'Acessar módulo de negócios corretora',
      grupo: 'vendas',
    },
    {
      nomePermissao: 'vendas:gerenciar_comissoes',
      descricao: 'Gerenciar comissões de documentos',
      grupo: 'vendas',
    },

    // === CADASTRO ===
    {
      nomePermissao: 'cadastro:acessar',
      descricao: 'Acessar módulo de cadastro',
      grupo: 'cadastro',
    },
    {
      nomePermissao: 'cadastro:visualizar_pendentes',
      descricao: 'Ver vendas pendentes de cadastro',
      grupo: 'cadastro',
    },
    {
      nomePermissao: 'cadastro:validar_documentos',
      descricao: 'Validar documentação de vendas',
      grupo: 'cadastro',
    },
    {
      nomePermissao: 'cadastro:aprovar_venda',
      descricao: 'Aprovar vendas',
      grupo: 'cadastro',
    },
    {
      nomePermissao: 'cadastro:aprovar_endosso',
      descricao: 'Aprovar e recusar endossos',
      grupo: 'cadastro',
    },
    {
      nomePermissao: 'cadastro:rejeitar_venda',
      descricao: 'Rejeitar vendas',
      grupo: 'cadastro',
    },
    {
      nomePermissao: 'cadastro:editar_apolice',
      descricao: 'Editar dados de apólice',
      grupo: 'cadastro',
    },

    // === CLIENTES ===
    {
      nomePermissao: 'clientes:criar',
      descricao: 'Criar clientes',
      grupo: 'clientes',
    },
    {
      nomePermissao: 'clientes:visualizar',
      descricao: 'Visualizar clientes próprios',
      grupo: 'clientes',
    },
    {
      nomePermissao: 'clientes:visualizar_todos',
      descricao: 'Visualizar todos os clientes',
      grupo: 'clientes',
    },
    {
      nomePermissao: 'clientes:editar',
      descricao: 'Editar clientes',
      grupo: 'clientes',
    },
    {
      nomePermissao: 'clientes:excluir',
      descricao: 'Excluir clientes',
      grupo: 'clientes',
    },
    {
      nomePermissao: 'clientes:transferir_carteira',
      descricao: 'Transferir carteira de clientes',
      grupo: 'clientes',
    },
    {
      nomePermissao: 'clientes:exportar',
      descricao: 'Exportar lista de clientes',
      grupo: 'clientes',
    },

    // === RENOVAÇÕES ===
    {
      nomePermissao: 'renovacoes:acessar',
      descricao: 'Acessar módulo de renovações',
      grupo: 'renovacoes',
    },
    {
      nomePermissao: 'renovacoes:visualizar',
      descricao: 'Visualizar renovações',
      grupo: 'renovacoes',
    },
    {
      nomePermissao: 'renovacoes:gerenciar',
      descricao: 'Gerenciar processo de renovação',
      grupo: 'renovacoes',
    },

    // === MÉTRICAS E ANÁLISES ===
    {
      nomePermissao: 'metricas:acessar',
      descricao: 'Acessar módulo de métricas',
      grupo: 'metricas',
    },
    {
      nomePermissao: 'metricas:visualizar_pessoais',
      descricao: 'Ver métricas pessoais detalhadas',
      grupo: 'metricas',
    },
    {
      nomePermissao: 'metricas:visualizar_equipe',
      descricao: 'Ver métricas da equipe',
      grupo: 'metricas',
    },
    {
      nomePermissao: 'metricas:visualizar_gerais',
      descricao: 'Ver métricas gerais da corretora',
      grupo: 'metricas',
    },
    {
      nomePermissao: 'metricas:comparar_vendedores',
      descricao: 'Comparar performance entre vendedores',
      grupo: 'metricas',
    },

    // === RELATÓRIOS ===
    {
      nomePermissao: 'relatorios:acessar',
      descricao: 'Acessar módulo de relatórios',
      grupo: 'relatorios',
    },
    {
      nomePermissao: 'relatorios:vendas',
      descricao: 'Gerar relatórios de vendas',
      grupo: 'relatorios',
    },
    {
      nomePermissao: 'relatorios:comissoes',
      descricao: 'Gerar relatórios de comissões',
      grupo: 'relatorios',
    },
    {
      nomePermissao: 'relatorios:financeiro',
      descricao: 'Gerar relatórios financeiros',
      grupo: 'relatorios',
    },
    {
      nomePermissao: 'relatorios:producao',
      descricao: 'Gerar relatórios de produção',
      grupo: 'relatorios',
    },
    {
      nomePermissao: 'relatorios:exportar',
      descricao: 'Exportar relatórios',
      grupo: 'relatorios',
    },

    // === USUÁRIOS ===
    {
      nomePermissao: 'usuarios:acessar',
      descricao: 'Acessar módulo de usuários',
      grupo: 'usuarios',
    },
    {
      nomePermissao: 'usuarios:criar',
      descricao: 'Criar usuários',
      grupo: 'usuarios',
    },
    {
      nomePermissao: 'usuarios:visualizar',
      descricao: 'Visualizar usuários',
      grupo: 'usuarios',
    },
    {
      nomePermissao: 'usuarios:editar',
      descricao: 'Editar usuários',
      grupo: 'usuarios',
    },
    {
      nomePermissao: 'usuarios:excluir',
      descricao: 'Excluir usuários',
      grupo: 'usuarios',
    },
    {
      nomePermissao: 'usuarios:resetar_senha',
      descricao: 'Resetar senha de usuários',
      grupo: 'usuarios',
    },
    {
      nomePermissao: 'usuarios:atribuir_cargo',
      descricao: 'Atribuir cargos a usuários',
      grupo: 'usuarios',
    },

    // === CARGOS E PERMISSÕES ===
    {
      nomePermissao: 'cargos:criar',
      descricao: 'Criar cargos personalizados',
      grupo: 'cargos',
    },
    {
      nomePermissao: 'cargos:visualizar',
      descricao: 'Visualizar cargos',
      grupo: 'cargos',
    },
    {
      nomePermissao: 'cargos:editar',
      descricao: 'Editar cargos',
      grupo: 'cargos',
    },
    {
      nomePermissao: 'cargos:excluir',
      descricao: 'Excluir cargos',
      grupo: 'cargos',
    },
    {
      nomePermissao: 'cargos:atribuir_permissoes',
      descricao: 'Gerenciar permissões de cargos',
      grupo: 'cargos',
    },

    // === EQUIPES ===
    {
      nomePermissao: 'equipes:criar',
      descricao: 'Criar equipes',
      grupo: 'equipes',
    },
    {
      nomePermissao: 'equipes:visualizar',
      descricao: 'Visualizar equipes',
      grupo: 'equipes',
    },
    {
      nomePermissao: 'equipes:editar',
      descricao: 'Editar equipes',
      grupo: 'equipes',
    },
    {
      nomePermissao: 'equipes:excluir',
      descricao: 'Excluir equipes',
      grupo: 'equipes',
    },
    {
      nomePermissao: 'equipes:gerenciar_membros',
      descricao: 'Gerenciar membros de equipes',
      grupo: 'equipes',
    },

    // === PRODUTOS E SEGURADORAS ===
    {
      nomePermissao: 'produtos:visualizar',
      descricao: 'Visualizar produtos',
      grupo: 'produtos',
    },
    {
      nomePermissao: 'produtos:criar',
      descricao: 'Criar produtos',
      grupo: 'produtos',
    },
    {
      nomePermissao: 'produtos:editar',
      descricao: 'Editar produtos',
      grupo: 'produtos',
    },
    {
      nomePermissao: 'produtos:excluir',
      descricao: 'Excluir produtos',
      grupo: 'produtos',
    },
    {
      nomePermissao: 'seguradoras_parceiras:visualizar',
      descricao: 'Visualizar seguradoras parceiras',
      grupo: 'produtos',
    },
    {
      nomePermissao: 'seguradoras_parceiras:gerenciar',
      descricao: 'Gerenciar seguradoras parceiras',
      grupo: 'produtos',
    },

    // === CONFIGURAÇÕES ===
    {
      nomePermissao: 'config:acessar',
      descricao: 'Acessar configurações',
      grupo: 'configuracoes',
    },
    {
      nomePermissao: 'config:editar_seguradora',
      descricao: 'Editar dados da corretora',
      grupo: 'configuracoes',
    },
    {
      nomePermissao: 'config:gerenciar_integracao',
      descricao: 'Gerenciar integrações',
      grupo: 'configuracoes',
    },
    {
      nomePermissao: 'config:visualizar_auditoria',
      descricao: 'Visualizar logs de auditoria',
      grupo: 'configuracoes',
    },

    // === WORKSPACE E FERRAMENTAS ===
    {
      nomePermissao: 'workspace:acessar',
      descricao: 'Acessar Área de Trabalho',
      grupo: 'workspace',
    },
    {
      nomePermissao: 'workspace:visualizar_planilha',
      descricao: 'Visualizar Planilha de Renovações',
      grupo: 'workspace',
    },
    {
      nomePermissao: 'kanban:acessar',
      descricao: 'Acessar Kanban',
      grupo: 'kanban',
    },
    {
      nomePermissao: 'kanban:visualizar',
      descricao: 'Visualizar oportunidades próprias no Kanban',
      grupo: 'kanban',
    },
    {
      nomePermissao: 'kanban:visualizar_todas',
      descricao: 'Visualizar todas as oportunidades no Kanban',
      grupo: 'kanban',
    },
    {
      nomePermissao: 'kanban:criar',
      descricao: 'Criar oportunidades no Kanban',
      grupo: 'kanban',
    },
    {
      nomePermissao: 'kanban:editar',
      descricao: 'Editar e mover oportunidades no Kanban',
      grupo: 'kanban',
    },
    {
      nomePermissao: 'kanban:deletar',
      descricao: 'Excluir oportunidades no Kanban',
      grupo: 'kanban',
    },
    {
      nomePermissao: 'kanban:fechar',
      descricao: 'Fechar oportunidades como ganhas',
      grupo: 'kanban',
    },
    {
      nomePermissao: 'kanban:perder',
      descricao: 'Marcar oportunidades como perdidas',
      grupo: 'kanban',
    },
    {
      nomePermissao: 'chat:acessar',
      descricao: 'Acessar Chat da Equipe',
      grupo: 'workspace',
    },
    {
      nomePermissao: 'performance:acessar',
      descricao: 'Acessar Ranking de Performance',
      grupo: 'workspace',
    },
    {
      nomePermissao: 'performance:visualizar',
      descricao: 'Visualizar dados de performance',
      grupo: 'workspace',
    },

    // === GESTÃO ===
    {
      nomePermissao: 'importar_renovacoes:acessar',
      descricao: 'Importar renovações',
      grupo: 'gestao',
    },
    {
      nomePermissao: 'aceitar_exclusao:renovacao',
      descricao: 'Aceitar ou recusar solicitações de exclusão de renovação',
      grupo: 'gestao',
    },
    {
      nomePermissao: 'aceitar_exclusao:venda',
      descricao: 'Aceitar ou recusar solicitações de exclusão de venda confirmada',
      grupo: 'gestao',
    },
    {
      nomePermissao: 'gestao_comercial:acessar',
      descricao: 'Acessar Gestão Comercial',
      grupo: 'gestao',
    },
    {
      nomePermissao: 'gestao_pessoas:acessar',
      descricao: 'Acessar Gestão de Pessoas',
      grupo: 'gestao',
    },
    {
      nomePermissao: 'gestao_crm:acessar',
      descricao: 'Acessar módulo de Gestão CRM',
      grupo: 'gestao',
    },

    // === NEGÓCIOS CORRETORA ===
    {
      nomePermissao: 'negocios_corretora:acessar',
      descricao: 'Acessar Negócios da Corretora',
      grupo: 'negocios',
    },

    // === MARKETING ===
    {
      nomePermissao: 'marketing:acessar',
      descricao: 'Acessar área de Marketing (link do portal do segurado)',
      grupo: 'marketing',
    },

    // === GAMIFICAÇÃO ===
    {
      nomePermissao: 'gamificacao:gerenciar',
      descricao: 'Criar e gerenciar metas, missões, campanhas e conceder badges',
      grupo: 'gamificacao',
    },

    // === PERMISSÕES GRANULARES ===

    // Clientes - Permissões granulares
    {
      nomePermissao: 'clientes:editar_dados_basicos',
      descricao: 'Editar dados básicos dos clientes (nome, contato)',
      grupo: 'clientes',
    },
    {
      nomePermissao: 'clientes:editar_dados_financeiros',
      descricao: 'Editar dados financeiros dos clientes',
      grupo: 'clientes',
    },
    {
      nomePermissao: 'clientes:visualizar_cpf_completo',
      descricao: 'Visualizar CPF completo (vs. parcialmente oculto)',
      grupo: 'clientes',
    },
    {
      nomePermissao: 'clientes:visualizar_dados_sensiveis',
      descricao: 'Visualizar dados sensíveis completos',
      grupo: 'clientes',
    },

    // Vendas - Valores e comissões
    {
      nomePermissao: 'vendas:editar_valor',
      descricao: 'Editar valor de cotações/propostas',
      grupo: 'vendas',
    },
    {
      nomePermissao: 'vendas:editar_comissao',
      descricao: 'Editar percentual e valor de comissão',
      grupo: 'vendas',
    },
    {
      nomePermissao: 'vendas:aprovar_desconto',
      descricao: 'Aprovar descontos acima do limite padrão',
      grupo: 'vendas',
    },
    {
      nomePermissao: 'vendas:visualizar_comissoes_outros',
      descricao: 'Visualizar comissões de outros vendedores',
      grupo: 'vendas',
    },

    // Relatórios - Dados sensíveis
    {
      nomePermissao: 'relatorios:visualizar_comissoes',
      descricao: 'Ver comissões nos relatórios',
      grupo: 'relatorios',
    },
    {
      nomePermissao: 'relatorios:exportar_dados_sensiveis',
      descricao: 'Exportar relatórios com dados sensíveis',
      grupo: 'relatorios',
    },
    {
      nomePermissao: 'relatorios:comparar_vendedores',
      descricao: 'Comparar performance entre vendedores',
      grupo: 'relatorios',
    },

    // Documentos - Estágios específicos
    {
      nomePermissao: 'vendas:editar_documento_aprovado',
      descricao: 'Editar documento já aprovado pelo cadastro',
      grupo: 'vendas',
    },
    {
      nomePermissao: 'vendas:cancelar_venda_efetivada',
      descricao: 'Cancelar venda já efetivada',
      grupo: 'vendas',
    },

    // Equipes e hierarquia
    {
      nomePermissao: 'usuarios:visualizar_equipe_completa',
      descricao:
        'Visualizar todos os membros da corretora (não apenas sua equipe)',
      grupo: 'usuarios',
    },
    {
      nomePermissao: 'usuarios:transferir_carteira',
      descricao: 'Transferir carteira de clientes entre vendedores',
      grupo: 'usuarios',
    },
    {
      nomePermissao: 'usuarios:definir_metas',
      descricao: 'Definir metas para vendedores',
      grupo: 'usuarios',
    },

    // Auditoria e Segurança
    {
      nomePermissao: 'auditoria:visualizar',
      descricao: 'Visualizar logs de auditoria',
      grupo: 'auditoria',
    },
    {
      nomePermissao: 'auditoria:visualizar_permissoes',
      descricao: 'Visualizar histórico de alterações de permissões',
      grupo: 'auditoria',
    },
    {
      nomePermissao: 'auditoria:exportar',
      descricao: 'Exportar logs de auditoria',
      grupo: 'auditoria',
    },
    {
      nomePermissao: 'vendedores:visualizar',
      descricao: 'Visualizar lista e detalhes de vendedores',
      grupo: 'vendedores',
    },
    {
      nomePermissao: 'vendedores:gerenciar',
      descricao: 'Criar, editar e remover vendedores',
      grupo: 'vendedores',
    },
  ];

  await db.insert(permissoesGlobais).values(permissions).onConflictDoNothing();

  console.log('✓ Permissions created');

  // Seed Default Roles (Cargos Padrão)
  // Note: These will be created per tenant when a new seguradora is registered
  // This is just for reference/documentation
  console.log('📌 Default roles structure documented');
  console.log('  - Dono da Corretora (isAdmin=true): All permissions');
  console.log('  - Gerente: Supervisão e aprovação');
  console.log('  - Vendedor: Vendas próprias');
  console.log('  - Cadastro: Validação e ativação');

  console.log('✓ Seed completed successfully!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
