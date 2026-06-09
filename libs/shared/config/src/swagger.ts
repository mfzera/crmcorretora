import { env } from '@ecotech/shared/utils/env';

export const swaggerConfig = {
  openapi: {
    info: {
      title: 'SaaS Seguradoras API',
      description:
        'Plataforma SaaS Multi-Tenant para gestão de vendas de seguros. API completa com autenticação JWT, controle de acesso baseado em papéis (RBAC), e gestão de quotas.',
      version: '1.0.0',
      contact: {
        name: 'Suporte técnico',
        email: 'suporte@saasseguradoras.com',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Servidor de desenvolvimento',
      },
      {
        url: `https://api.saasseguradoras.com`,
        description: 'Servidor de produção',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Token JWT obtido após autenticação. Incluir no header: Authorization: Bearer {token}',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'UNAUTHORIZED' },
                message: { type: 'string', example: 'Credenciais inválidas' },
              },
            },
          },
        },
        Seguradora: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            razaoSocial: { type: 'string' },
            nomeFantasia: { type: 'string' },
            cnpj: { type: 'string' },
            subdominio: { type: 'string' },
            emailContato: { type: 'string', format: 'email' },
            telefone: { type: 'string' },
            status: { type: 'string', enum: ['ATIVO', 'INATIVO', 'SUSPENSO'] },
            planoId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Usuario: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            corretoraId: { type: 'string', format: 'uuid' },
            nome: { type: 'string' },
            email: { type: 'string', format: 'email' },
            cargoId: { type: 'string', format: 'uuid', nullable: true },
            equipeId: { type: 'string', format: 'uuid', nullable: true },
            ativo: { type: 'boolean' },
            primeiroAcesso: { type: 'boolean' },
            ultimoLogin: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Cargo: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            corretoraId: { type: 'string', format: 'uuid' },
            nomeCargo: { type: 'string' },
            descricao: { type: 'string', nullable: true },
            isAdmin: { type: 'boolean' },
            isGestor: { type: 'boolean' },
            isVendedor: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Cliente: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            corretoraId: { type: 'string', format: 'uuid' },
            tipoPessoa: { type: 'string', enum: ['PF', 'PJ'] },
            nome: { type: 'string', nullable: true },
            cpf: { type: 'string', nullable: true },
            razaoSocial: { type: 'string', nullable: true },
            cnpj: { type: 'string', nullable: true },
            vendedorId: { type: 'string', format: 'uuid' },
            ativo: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Cotacao: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            corretoraId: { type: 'string', format: 'uuid' },
            clienteId: { type: 'string', format: 'uuid' },
            vendedorId: { type: 'string', format: 'uuid' },
            produtoId: { type: 'string', format: 'uuid' },
            numeroCotacao: { type: 'string' },
            status: {
              type: 'string',
              enum: [
                'EM_ELABORACAO',
                'ENVIADA_CLIENTE',
                'APROVADA_CLIENTE',
                'RECUSADA_CLIENTE',
                'EXPIRADA',
                'CONVERTIDA',
              ],
            },
            premioEstimado: { type: 'string', format: 'decimal' },
            percentualComissao: { type: 'string', format: 'decimal' },
            vigenciaInicio: { type: 'string', format: 'date' },
            vigenciaFim: { type: 'string', format: 'date' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Proposta: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            corretoraId: { type: 'string', format: 'uuid' },
            clienteId: { type: 'string', format: 'uuid' },
            vendedorId: { type: 'string', format: 'uuid' },
            numeroPropostaInterno: { type: 'string' },
            status: {
              type: 'string',
              enum: [
                'AGUARDANDO_ENVIO',
                'ENVIADA',
                'EM_ANALISE',
                'APROVADA',
                'RECUSADA',
                'CANCELADA',
                'VENDA_CONFIRMADA',
              ],
            },
            premioLiquido: { type: 'string', format: 'decimal' },
            vigenciaInicio: { type: 'string', format: 'date' },
            vigenciaFim: { type: 'string', format: 'date' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        DocumentoVenda: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            corretoraId: { type: 'string', format: 'uuid' },
            clienteId: { type: 'string', format: 'uuid' },
            vendedorId: { type: 'string', format: 'uuid' },
            numeroDocumento: { type: 'string' },
            status: {
              type: 'string',
              enum: [
                'EM_NEGOCIACAO',
                'AGUARDANDO_CLIENTE',
                'VENDA_CONFIRMADA',
                'AGUARDANDO_CADASTRO',
                'ATIVO',
                'CANCELADO',
                'PERDIDO',
              ],
            },
            numeroApoliceExterna: { type: 'string', nullable: true },
            premioLiquido: { type: 'string', format: 'decimal' },
            vigenciaInicio: { type: 'string', format: 'date' },
            vigenciaFim: { type: 'string', format: 'date' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      {
        name: 'Autenticação',
        description: 'Endpoints para autenticação e gerenciamento de sessão',
      },
      {
        name: 'Usuários',
        description: 'Gestão de usuários dentro da seguradora',
      },
      {
        name: 'Cargos e Permissões',
        description: 'Configuração de papéis e controle de acesso',
      },
      {
        name: 'Clientes',
        description: 'Cadastro e gestão de clientes (PF e PJ)',
      },
      {
        name: 'Produtos',
        description: 'Catálogo de produtos de seguro',
      },
      {
        name: 'Cotações',
        description: 'Gestão do ciclo de vida de cotações',
      },
      {
        name: 'Propostas',
        description: 'Gestão de propostas comerciais',
      },
      {
        name: 'Documentos de Venda',
        description: 'Acompanhamento de documentos e apólices',
      },
      {
        name: 'Endossos',
        description: 'Gestão de alterações em apólices vigentes',
      },
      {
        name: 'Renovações',
        description: 'Acompanhamento de renovações de apólices',
      },
      {
        name: 'Dashboard',
        description: 'Métricas e indicadores de vendas',
      },
      {
        name: 'Configurações',
        description: 'Configurações da seguradora e uso de recursos',
      },
    ],
    security: [{ bearerAuth: [] }],
  },
};
