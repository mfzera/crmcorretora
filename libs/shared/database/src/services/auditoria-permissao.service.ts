import { db } from '../connection.js';
import { auditoriaPermissoes } from '../schema/permissao.js';
import { eq, desc } from 'drizzle-orm';

export class AuditoriaPermissaoService {
  /**
   * Registra a criação de um cargo
   */
  static async registrarCargoCriado(params: {
    corretoraId: string;
    usuarioId: string;
    cargoId: string;
    metadados?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    await db.insert(auditoriaPermissoes).values({
      corretoraId: params.corretoraId,
      usuarioId: params.usuarioId,
      cargoId: params.cargoId,
      acao: 'cargo_criado',
      metadados: params.metadados || {},
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Registra a edição de um cargo
   */
  static async registrarCargoEditado(params: {
    corretoraId: string;
    usuarioId: string;
    cargoId: string;
    metadados: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    await db.insert(auditoriaPermissoes).values({
      corretoraId: params.corretoraId,
      usuarioId: params.usuarioId,
      cargoId: params.cargoId,
      acao: 'cargo_editado',
      metadados: params.metadados,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Registra a exclusão de um cargo
   */
  static async registrarCargoExcluido(params: {
    corretoraId: string;
    usuarioId: string;
    cargoId: string;
    metadados?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    await db.insert(auditoriaPermissoes).values({
      corretoraId: params.corretoraId,
      usuarioId: params.usuarioId,
      cargoId: params.cargoId,
      acao: 'cargo_excluido',
      metadados: params.metadados || {},
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Registra a adição de uma permissão a um cargo
   */
  static async registrarPermissaoAdicionada(params: {
    corretoraId: string;
    usuarioId: string;
    cargoId: string;
    permissaoGlobalId: string;
    metadados?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    await db.insert(auditoriaPermissoes).values({
      corretoraId: params.corretoraId,
      usuarioId: params.usuarioId,
      cargoId: params.cargoId,
      permissaoGlobalId: params.permissaoGlobalId,
      acao: 'permissao_adicionada',
      metadados: params.metadados || {},
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Registra a remoção de uma permissão de um cargo
   */
  static async registrarPermissaoRemovida(params: {
    corretoraId: string;
    usuarioId: string;
    cargoId: string;
    permissaoGlobalId: string;
    metadados?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    await db.insert(auditoriaPermissoes).values({
      corretoraId: params.corretoraId,
      usuarioId: params.usuarioId,
      cargoId: params.cargoId,
      permissaoGlobalId: params.permissaoGlobalId,
      acao: 'permissao_removida',
      metadados: params.metadados || {},
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Registra a atribuição de um cargo a um usuário
   */
  static async registrarCargoAtribuido(params: {
    corretoraId: string;
    usuarioId: string;
    cargoId: string;
    metadados: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    await db.insert(auditoriaPermissoes).values({
      corretoraId: params.corretoraId,
      usuarioId: params.usuarioId,
      cargoId: params.cargoId,
      acao: 'cargo_atribuido',
      metadados: params.metadados,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Registra alteração em massa de permissões
   */
  static async registrarPermissoesAlteradas(params: {
    corretoraId: string;
    usuarioId: string;
    cargoId: string;
    metadados: {
      permissoesAdicionadas: string[];
      permissoesRemovidas: string[];
    };
    ipAddress?: string;
    userAgent?: string;
  }) {
    await db.insert(auditoriaPermissoes).values({
      corretoraId: params.corretoraId,
      usuarioId: params.usuarioId,
      cargoId: params.cargoId,
      acao: 'permissoes_alteradas',
      metadados: params.metadados,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Busca histórico de auditoria por cargo
   */
  static async buscarPorCargo(cargoId: string, limit = 50) {
    return db.query.auditoriaPermissoes.findMany({
      where: eq(auditoriaPermissoes.cargoId, cargoId),
      with: {
        permissao: {
          columns: {
            id: true,
            nomePermissao: true,
            descricao: true,
          },
        },
      },
      limit,
      orderBy: desc(auditoriaPermissoes.createdAt),
    });
  }

  /**
   * Busca histórico de auditoria por usuário (quem fez a ação)
   */
  static async buscarPorUsuario(usuarioId: string, limit = 50) {
    return db.query.auditoriaPermissoes.findMany({
      where: eq(auditoriaPermissoes.usuarioId, usuarioId),
      with: {
        permissao: {
          columns: {
            id: true,
            nomePermissao: true,
            descricao: true,
          },
        },
      },
      limit,
      orderBy: desc(auditoriaPermissoes.createdAt),
    });
  }

  /**
   * Busca histórico de auditoria por corretora
   */
  static async buscarPorCorretora(corretoraId: string, limit = 100) {
    return db.query.auditoriaPermissoes.findMany({
      where: eq(auditoriaPermissoes.corretoraId, corretoraId),
      with: {
        permissao: {
          columns: {
            id: true,
            nomePermissao: true,
            descricao: true,
          },
        },
      },
      limit,
      orderBy: desc(auditoriaPermissoes.createdAt),
    });
  }
}
