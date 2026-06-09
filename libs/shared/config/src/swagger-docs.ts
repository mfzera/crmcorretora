export const authDocs = {
  registerSeguradora: {
    tags: ["Autenticação"],
    summary: "Registrar nova seguradora",
    description:
      "Cria uma nova seguradora na plataforma. Este endpoint não requer autenticação. A seguradora será criada com um usuário admin padrão.",
    response: {
      201: {
        description: "Seguradora criada com sucesso",
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: {
            type: "object",
            properties: {
              seguradora: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  razaoSocial: { type: "string" },
                  nomeFantasia: { type: "string" },
                  subdominio: { type: "string" },
                  status: { type: "string" },
                },
              },
              usuario: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  nome: { type: "string" },
                  email: { type: "string" },
                },
              },
            },
          },
        },
      },
      400: { description: "Dados inválidos" },
      409: { description: "CNPJ ou subdomínio já cadastrado" },
    },
  },
  login: {
    tags: ["Autenticação"],
    summary: "Autenticar usuário",
    description:
      "Realiza login do usuário com email e senha. Retorna tokens JWT para acesso à API.",
    response: {
      200: {
        description: "Autenticação bem-sucedida",
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: {
            type: "object",
            properties: {
              token: {
                type: "string",
                description: "Token JWT de acesso (8 horas)",
              },
              refreshToken: {
                type: "string",
                description: "Token para renovar acesso (7 dias)",
              },
              usuario: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  nome: { type: "string" },
                  email: { type: "string" },
                },
              },
              permissoes: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
      401: { description: "Credenciais inválidas" },
    },
  },
  refresh: {
    tags: ["Autenticação"],
    summary: "Renovar token de acesso",
    description:
      "Usa um refresh token válido para obter um novo token de acesso.",
    response: {
      200: {
        description: "Token renovado",
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: {
            type: "object",
            properties: {
              token: { type: "string" },
              refreshToken: { type: "string" },
            },
          },
        },
      },
      401: { description: "Refresh token inválido ou expirado" },
    },
  },
  me: {
    tags: ["Autenticação"],
    summary: "Obter dados do usuário autenticado",
    description:
      "Retorna as informações do usuário autenticado, incluindo seus papéis e permissões.",
    response: {
      200: {
        description: "Dados do usuário",
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: {
            type: "object",
            properties: {
              usuario: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  nome: { type: "string" },
                  email: { type: "string" },
                  primeiroAcesso: { type: "boolean" },
                },
              },
              permissoes: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
      401: { description: "Não autenticado" },
    },
  },
};

export const usuariosDocs = {
  create: {
    tags: ["Usuários"],
    summary: "Criar novo usuário",
    description:
      'Cria um novo usuário na seguradora. Requer permissão "usuarios:criar".',
    response: {
      201: {
        description: "Usuário criado com sucesso",
      },
      403: { description: "Sem permissão" },
    },
  },
  list: {
    tags: ["Usuários"],
    summary: "Listar usuários",
    description:
      'Lista todos os usuários da seguradora com paginação. Requer permissão "usuarios:visualizar".',
    response: {
      200: {
        description: "Lista de usuários",
      },
    },
  },
};

export const cargosDocs = {
  create: {
    tags: ["Cargos e Permissões"],
    summary: "Criar novo cargo",
    description:
      'Define um novo papel com permissões específicas. Requer permissão "cargos:criar".',
    response: {
      201: {
        description: "Cargo criado com sucesso",
      },
    },
  },
  list: {
    tags: ["Cargos e Permissões"],
    summary: "Listar cargos",
    description: "Lista todos os papéis definidos na seguradora.",
    response: {
      200: {
        description: "Lista de cargos",
      },
    },
  },
};

export const clientesDocs = {
  create: {
    tags: ["Clientes"],
    summary: "Criar novo cliente",
    description:
      'Cadastra um novo cliente (PF ou PJ). Requer permissão "clientes:criar".',
    response: {
      201: {
        description: "Cliente criado com sucesso",
      },
    },
  },
  list: {
    tags: ["Clientes"],
    summary: "Listar clientes",
    description:
      'Lista clientes do vendedor ou todos os clientes (com permissão "clientes:visualizar_todos").',
    response: {
      200: {
        description: "Lista de clientes",
      },
    },
  },
};

export const cotacoesDocs = {
  create: {
    tags: ["Cotações"],
    summary: "Criar nova cotação",
    description:
      'Inicia o processo de cotação. Requer permissão "vendas:criar_cotacao".',
    response: {
      201: {
        description: "Cotação criada",
      },
    },
  },
};

export const propostasDocs = {
  create: {
    tags: ["Propostas"],
    summary: "Criar nova proposta",
    description:
      "Cria uma proposta comercial. Pode ser originária de uma cotação ou criada direto.",
    response: {
      201: {
        description: "Proposta criada",
      },
    },
  },
};

export const documentosVendaDocs = {
  create: {
    tags: ["Documentos de Venda"],
    summary: "Criar documento de venda",
    description:
      'Registra a conclusão da venda e cria o documento/apólice. Requer permissão "vendas:criar_documento_venda".',
    response: {
      201: {
        description: "Documento criado",
      },
    },
  },
};

export const endossosDocs = {
  create: {
    tags: ["Endossos"],
    summary: "Criar novo endosso",
    description:
      'Registra uma alteração (inclusão/exclusão de cobertura, mudança de dados, etc). Requer permissão "vendas:criar_endosso".',
    response: {
      201: {
        description: "Endosso criado",
      },
    },
  },
};
