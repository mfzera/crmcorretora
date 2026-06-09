/**
 * Renovacao Repository
 *
 * Encapsulates all database queries related to commercial renewals.
 * Provides a clean interface for business logic to interact with data.
 */

import { and, eq, sql, gte, lte, count, desc, asc } from 'drizzle-orm';
import type {
  RenovacaoComercial,
  NewRenovacaoComercial,
} from '../schema/renovacao.js';
import {
  BaseRepository,
  type IRepository,
  type BaseQueryFilters,
  type PaginatedResult,
} from './base-repository.js';
import type { Database } from '../connection.js';
import { renovacoesComerciais } from '../schema/index.js';

// Status type from schema enum
type StatusRenovacao =
  | 'NAO_TRABALHADO'
  | 'EM_PROSPECCAO'
  | 'EM_NEGOCIACAO'
  | 'AGUARDANDO_CLIENTE'
  | 'RENOVADO'
  | 'PERDIDO'
  | 'CANCELADO';

/**
 * Extended filters specific to renewals
 */
export interface RenovacaoQueryFilters extends BaseQueryFilters {
  status?: StatusRenovacao;
  vendedorId?: string;
  dataVencimentoInicio?: string;
  dataVencimentoFim?: string;
  incluirFinalizadas?: boolean;
}

/**
 * Options for including related data
 */
export interface RenovacaoIncludeOptions {
  documentoVendaAnterior?: boolean;
  documentoVendaNovo?: boolean;
  vendedor?: boolean;
  cliente?: boolean;
  produto?: boolean;
}

/**
 * Renovacao Repository Implementation
 */
export class RenovacaoRepository
  extends BaseRepository
  implements IRepository<RenovacaoComercial, NewRenovacaoComercial>
{
  constructor(private db: Database) {
    super();
  }

  /**
   * Find a single renewal by ID
   */
  async findById(
    id: string,
    tenantId: string,
    include?: RenovacaoIncludeOptions,
  ): Promise<RenovacaoComercial | null> {
    const withRelations = this.buildWithRelations(include);

    const renovacao = await this.db.query.renovacoesComerciais.findFirst({
      where: and(
        eq(renovacoesComerciais.id, id),
        eq(renovacoesComerciais.corretoraId, tenantId),
      ),
      with: withRelations,
    });

    return renovacao || null;
  }

  /**
   * Find pending renewals (expiring within specified days)
   * Renovações aparecem apenas dentro da janela de renovação (45 dias antes do vencimento até o vencimento)
   */
  async findPending(
    tenantId: string,
    daysAhead: number = 45,
    vendedorId?: string,
  ): Promise<RenovacaoComercial[]> {
    const now = new Date();
    const futureDate = new Date(
      now.getTime() + daysAhead * 24 * 60 * 60 * 1000,
    );

    const conditions = [
      eq(renovacoesComerciais.corretoraId, tenantId),
      // Apenas renovações não finalizadas (excluindo RENOVADO, PERDIDO, CANCELADO)
      sql`${renovacoesComerciais.status} IN ('NAO_TRABALHADO', 'EM_PROSPECCAO', 'EM_NEGOCIACAO', 'AGUARDANDO_CLIENTE')`,
      // Data de vencimento deve estar dentro da janela de renovação
      // (entre hoje e hoje + 45 dias)
      gte(renovacoesComerciais.dataVencimento, now.toISOString().split('T')[0]),
      lte(
        renovacoesComerciais.dataVencimento,
        futureDate.toISOString().split('T')[0],
      ),
    ];

    if (vendedorId) {
      conditions.push(eq(renovacoesComerciais.vendedorId, vendedorId));
    }

    return this.db.query.renovacoesComerciais.findMany({
      where: and(...conditions),
      with: {
        vendedor: {
          columns: {
            id: true,
            nome: true,
          },
        },
        // Cliente direto (para renovações importadas sem documento)
        cliente: {
          columns: {
            id: true,
            nome: true,
            razaoSocial: true,
            nomeFantasia: true,
            tipoPessoa: true,
            cpf: true,
            cnpj: true,
            email: true,
            telefone: true,
            ativo: true,
          },
        },
        documentoVendaAnterior: {
          with: {
            cliente: {
              columns: {
                id: true,
                nome: true,
                razaoSocial: true,
                nomeFantasia: true,
                tipoPessoa: true,
                cpf: true,
                cnpj: true,
                email: true,
                telefone: true,
                ativo: true,
              },
            },
            produto: {
              columns: {
                id: true,
                nomeProduto: true,
                tipoSeguro: true,
                ativo: true,
              },
            },
            vendedor: {
              columns: {
                id: true,
                nome: true,
                email: true,
              },
            },
            seguradoraParceira: {
              columns: {
                id: true,
                razaoSocial: true,
                nomeFantasia: true,
              },
            },
          },
        },
        documentoVendaNovo: {
          columns: {
            id: true,
            status: true,
            numeroDocumento: true,
            motivoRejeicao: true,
            dataRejeicaoCadastro: true,
            dataAprovacaoCadastro: true,
          },
        },
      } as any,
      limit: 100,
      orderBy: [asc(renovacoesComerciais.dataVencimento)],
    });
  }

  /**
   * Find overdue renewals (past expiration date, not yet finalized)
   */
  async findOverdue(
    tenantId: string,
    vendedorId?: string,
  ): Promise<RenovacaoComercial[]> {
    const today = new Date().toISOString().split('T')[0];

    const conditions = [
      eq(renovacoesComerciais.corretoraId, tenantId),
      sql`${renovacoesComerciais.status} IN ('NAO_TRABALHADO', 'EM_PROSPECCAO', 'EM_NEGOCIACAO', 'AGUARDANDO_CLIENTE')`,
      // Data de vencimento anterior a hoje
      sql`${renovacoesComerciais.dataVencimento} < ${today}`,
    ];

    if (vendedorId) {
      conditions.push(eq(renovacoesComerciais.vendedorId, vendedorId));
    }

    return this.db.query.renovacoesComerciais.findMany({
      where: and(...conditions),
      with: {
        vendedor: {
          columns: {
            id: true,
            nome: true,
          },
        },
        cliente: {
          columns: {
            id: true,
            nome: true,
            razaoSocial: true,
            nomeFantasia: true,
            tipoPessoa: true,
            cpf: true,
            cnpj: true,
            email: true,
            telefone: true,
            ativo: true,
          },
        },
        documentoVendaAnterior: {
          with: {
            cliente: {
              columns: {
                id: true,
                nome: true,
                razaoSocial: true,
                nomeFantasia: true,
                tipoPessoa: true,
                cpf: true,
                cnpj: true,
                email: true,
                telefone: true,
                ativo: true,
              },
            },
            produto: {
              columns: {
                id: true,
                nomeProduto: true,
                tipoSeguro: true,
                ativo: true,
              },
            },
            vendedor: {
              columns: {
                id: true,
                nome: true,
                email: true,
              },
            },
            seguradoraParceira: {
              columns: {
                id: true,
                razaoSocial: true,
                nomeFantasia: true,
              },
            },
          },
        },
        documentoVendaNovo: {
          columns: {
            id: true,
            status: true,
            numeroDocumento: true,
            motivoRejeicao: true,
            dataRejeicaoCadastro: true,
            dataAprovacaoCadastro: true,
          },
        },
      } as any,
      limit: 100,
      orderBy: [asc(renovacoesComerciais.dataVencimento)],
    });
  }

  /**
   * Find many renewals with filters and pagination
   */
  async findMany(
    filters: RenovacaoQueryFilters,
    tenantId: string,
    vendedorId?: string,
    canViewAll: boolean = false,
  ): Promise<PaginatedResult<RenovacaoComercial>> {
    const page = filters.page || 1;
    const limit = filters.limit;
    const offset = this.calculateOffset(page, limit);

    const conditions = [eq(renovacoesComerciais.corretoraId, tenantId)];

    // Permission-based filtering
    if (!canViewAll && vendedorId) {
      conditions.push(eq(renovacoesComerciais.vendedorId, vendedorId));
    } else if (filters.vendedorId) {
      conditions.push(eq(renovacoesComerciais.vendedorId, filters.vendedorId));
    }

    // Status filter
    if (filters.status) {
      conditions.push(eq(renovacoesComerciais.status, filters.status));
    }

    // Date range filters
    if (filters.dataVencimentoInicio) {
      conditions.push(
        gte(renovacoesComerciais.dataVencimento, filters.dataVencimentoInicio),
      );
    }

    if (filters.dataVencimentoFim) {
      conditions.push(
        lte(renovacoesComerciais.dataVencimento, filters.dataVencimentoFim),
      );
    }

    // Execute query and count in parallel
    const [renovacoes, [{ value: total }]] = await Promise.all([
      this.db.query.renovacoesComerciais.findMany({
        where: and(...conditions),
        with: {
          vendedor: {
            columns: {
              id: true,
              nome: true,
            },
          },
        } as any,
        limit,
        offset,
        orderBy: [desc(renovacoesComerciais.createdAt)],
      }),
      this.db
        .select({ value: count() })
        .from(renovacoesComerciais)
        .where(and(...conditions)),
    ]);

    return this.createPaginatedResult(renovacoes, total, page, limit);
  }

  /**
   * Find renewal by previous documento de venda
   */
  async findByDocumentoAnterior(
    documentoVendaAnteriorId: string,
    tenantId: string,
  ): Promise<RenovacaoComercial | null> {
    const renovacao = await this.db.query.renovacoesComerciais.findFirst({
      where: and(
        eq(
          renovacoesComerciais.documentoVendaAnteriorId,
          documentoVendaAnteriorId,
        ),
        eq(renovacoesComerciais.corretoraId, tenantId),
      ),
    });

    return renovacao || null;
  }

  /**
   * Create a new renewal
   */
  async create(
    data: NewRenovacaoComercial,
    tenantId: string,
  ): Promise<RenovacaoComercial> {
    const [renovacao] = await this.db
      .insert(renovacoesComerciais)
      .values({
        ...data,
        corretoraId: tenantId,
      })
      .returning();

    return renovacao;
  }

  /**
   * Create renewal or return existing if unique constraint is violated (race condition safe)
   */
  async createOrFind(
    data: NewRenovacaoComercial,
    tenantId: string,
  ): Promise<{ renovacao: RenovacaoComercial; created: boolean }> {
    const [renovacao] = await this.db
      .insert(renovacoesComerciais)
      .values({ ...data, corretoraId: tenantId })
      .onConflictDoNothing()
      .returning();

    if (renovacao) return { renovacao, created: true };

    const existing = await this.findByDocumentoAnterior(
      data.documentoVendaAnteriorId!,
      tenantId,
    );

    return { renovacao: existing!, created: false };
  }

  /**
   * Update an existing renewal
   */
  async update(
    id: string,
    data: Partial<RenovacaoComercial>,
    tenantId: string,
  ): Promise<RenovacaoComercial> {
    const [updated] = await this.db
      .update(renovacoesComerciais)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(renovacoesComerciais.id, id),
          eq(renovacoesComerciais.corretoraId, tenantId),
        ),
      )
      .returning();

    return updated;
  }

  /**
   * Soft delete (mark as cancelled)
   */
  async delete(id: string, tenantId: string): Promise<void> {
    await this.db
      .update(renovacoesComerciais)
      .set({
        status: 'CANCELADO',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(renovacoesComerciais.id, id),
          eq(renovacoesComerciais.corretoraId, tenantId),
        ),
      );
  }

  /**
   * Count total renewals
   */
  async count(
    tenantId: string,
    filters?: RenovacaoQueryFilters,
  ): Promise<number> {
    const conditions = [eq(renovacoesComerciais.corretoraId, tenantId)];

    if (filters?.status) {
      conditions.push(eq(renovacoesComerciais.status, filters.status));
    }

    const [{ value: total }] = await this.db
      .select({ value: count() })
      .from(renovacoesComerciais)
      .where(and(...conditions));

    return total;
  }

  /**
   * Helper to build with relations based on include options
   */
  private buildWithRelations(include?: RenovacaoIncludeOptions) {
    if (!include) return undefined;

    const withRelations: any = {};

    if (include.documentoVendaAnterior) {
      withRelations.documentoVendaAnterior = {
        with: {
          ...(include.cliente && {
            cliente: {
              columns: {
                id: true,
                nome: true,
                razaoSocial: true,
                tipoPessoa: true,
              },
            },
          }),
          ...(include.produto && {
            produto: {
              columns: {
                id: true,
                nomeProduto: true,
                tipoSeguro: true,
              },
            },
          }),
        },
      };
    }

    if (include.documentoVendaNovo) {
      withRelations.documentoVendaNovo = true;
    }

    if (include.vendedor) {
      withRelations.vendedor = {
        columns: {
          id: true,
          nome: true,
          email: true,
        },
      };
    }

    return withRelations;
  }
}
