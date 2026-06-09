/**
 * Renovacao Service
 *
 * Business logic layer for renewals.
 * Orchestrates repositories and applies business rules.
 */

import type {
  RenovacaoRepository,
  DocumentoVendaRepository,
  CotacaoRepository,
  RenovacaoComercial,
  DocumentoVenda,
  Cotacao,
} from '@ecotech/shared/database';
import { RenovacaoDomain } from '../models/renovacao.model.js';
import { NotFoundError, ValidationError } from '@ecotech/shared/utils';

/**
 * DTO for creating a renewal
 */
export interface CreateRenovacaoData {
  documentoVendaAnteriorId: string;
  vendedorId: string;
  premioAnterior?: string;
  percentualComissaoAnterior?: string;
  valorComissaoAnterior?: string;
  dataVencimento: string;
  novaVigenciaInicio?: string;
  novaVigenciaFim?: string;
}

/**
 * DTO for initiating a renewal
 */
export interface IniciarRenovacaoResult {
  renovacao: RenovacaoComercial;
  cotacao: Cotacao;
}

/**
 * Renovacao Service - Business Logic Layer
 */
export class RenovacaoService {
  constructor(
    private renovacaoRepo: RenovacaoRepository,
    private documentoVendaRepo: DocumentoVendaRepository,
    private cotacaoRepo: CotacaoRepository,
  ) {}

  /**
   * Get pending renewals with calculated priority
   */
  async getRenovacoesPendentes(
    tenantId: string,
    daysAhead = 60,
    vendedorId?: string,
  ) {
    const renovacoes = await this.renovacaoRepo.findPending(
      tenantId,
      daysAhead,
      vendedorId,
    );

    // Enrich with computed fields (priority, days to expiry, etc)
    return renovacoes.map((r) => new RenovacaoDomain(r).toDTO());
  }

  /**
   * Get overdue renewals (past expiration, not finalized)
   */
  async getRenovacoesVencidas(
    tenantId: string,
    vendedorId?: string,
  ) {
    const renovacoes = await this.renovacaoRepo.findOverdue(
      tenantId,
      vendedorId,
    );

    return renovacoes.map((r) => new RenovacaoDomain(r).toDTO());
  }

  /**
   * Get renewal by ID with computed fields
   */
  async getRenovacaoById(
    id: string,
    tenantId: string,
    vendedorId?: string,
    canViewAll = false,
  ) {
    const renovacao = await this.renovacaoRepo.findById(id, tenantId, {
      documentoVendaAnterior: true,
      documentoVendaNovo: true,
      vendedor: true,
      cliente: true,
      produto: true,
    });

    if (!renovacao) {
      throw new NotFoundError('Renovação');
    }

    // Check permissions - return 404 to avoid leaking existence of other vendors' records
    if (!canViewAll && renovacao.vendedorId !== vendedorId) {
      throw new NotFoundError('Renovação');
    }

    // Return with computed fields
    return new RenovacaoDomain(renovacao).toDTO();
  }

  /**
   * Initiate renewal (business logic)
   * Creates a quotation and updates renewal status
   */
  async iniciarRenovacao(
    renovacaoId: string,
    tenantId: string,
    userId: string,
  ): Promise<IniciarRenovacaoResult> {
    // 1. Load renewal with related data
    const renovacao = await this.renovacaoRepo.findById(renovacaoId, tenantId, {
      documentoVendaAnterior: true,
      cliente: true,
      produto: true,
    });

    if (!renovacao) {
      throw new NotFoundError('Renovação');
    }

    // 2. Apply business rule: can only initiate if not worked yet
    const domain = new RenovacaoDomain(renovacao);
    if (!domain.canBeInitiated()) {
      throw new ValidationError('Esta renovação já foi iniciada ou finalizada');
    }

    const documentoAnterior = (renovacao as any).documentoVendaAnterior as
      | DocumentoVenda
      | undefined;
    if (!documentoAnterior) {
      throw new ValidationError('Documento anterior não encontrado');
    }

    // 3. Generate quotation number
    const numeroCotacao = await this.generateNumeroCotacao(tenantId);

    // 4. Calculate new coverage dates (1 year from previous expiry)
    const { vigenciaInicio, vigenciaFim } = this.calculateVigenciaDates(
      documentoAnterior.vigenciaFim,
    );

    // 5. Create quotation for the renewal (repository adds corretoraId automatically)
    const cotacao = await this.cotacaoRepo.create(
      {
        clienteId: documentoAnterior.clienteId,
        vendedorId: renovacao.vendedorId,
        produtoId: documentoAnterior.produtoId,
        numeroCotacao,
        status: 'EM_ELABORACAO',
        vigenciaInicio,
        vigenciaFim,
        premioLiquido: documentoAnterior.premioLiquido,
        percentualComissao: documentoAnterior.percentualComissao,
        coberturas: documentoAnterior.coberturas,
      } as any,
      tenantId,
    );

    // 6. Update renewal status
    const renovacaoAtualizada = await this.renovacaoRepo.update(
      renovacaoId,
      {
        status: 'EM_PROSPECCAO',
        updatedAt: new Date(),
      },
      tenantId,
    );

    return {
      renovacao: renovacaoAtualizada,
      cotacao,
    };
  }

  /**
   * Create renewal automatically (for background jobs)
   * Business logic: 45 days before expiry, preserve all data
   */
  async criarRenovacaoAutomatica(
    documentoVendaId: string,
    tenantId: string,
  ): Promise<RenovacaoComercial> {
    // 1. Load documento de venda
    const documento = await this.documentoVendaRepo.findById(
      documentoVendaId,
      tenantId,
    );

    if (!documento) {
      throw new NotFoundError('Documento de venda');
    }

    // 2. Business rule: only ATIVO documents can have renewals
    if (documento.status !== 'ATIVO') {
      throw new ValidationError(
        'Só é possível criar renovação para documentos ativos',
      );
    }

    // 3. Calculate new coverage dates
    const { vigenciaInicio, vigenciaFim: novaVigenciaFim } =
      this.calculateVigenciaDates(documento.vigenciaFim);

    // 4. Insert or return existing (handles race condition via unique constraint)
    const { renovacao } = await this.renovacaoRepo.createOrFind(
      {
        documentoVendaAnteriorId: documentoVendaId,
        clienteId: documento.clienteId,
        vendedorId: documento.vendedorId,
        premioAnterior: documento.premioLiquido,
        percentualComissaoAnterior: documento.percentualComissao,
        valorComissaoAnterior: documento.valorComissao,
        dataVencimento: documento.vigenciaFim,
        novaVigenciaInicio: vigenciaInicio,
        novaVigenciaFim: novaVigenciaFim,
        status: 'NAO_TRABALHADO',
      } as any,
      tenantId,
    );

    return renovacao;
  }

  /**
   * Business logic: Calculate coverage dates for renewal
   * New coverage starts when previous ends, duration is 1 year
   */
  private calculateVigenciaDates(vigenciaFimAnterior: string): {
    vigenciaInicio: string;
    vigenciaFim: string;
  } {
    const vigenciaInicio = new Date(vigenciaFimAnterior);
    const vigenciaFim = new Date(vigenciaInicio);
    vigenciaFim.setFullYear(vigenciaFim.getFullYear() + 1);

    return {
      vigenciaInicio: vigenciaInicio.toISOString().split('T')[0],
      vigenciaFim: vigenciaFim.toISOString().split('T')[0],
    };
  }

  /**
   * Business logic: Generate sequential quotation number
   * Format: COT-{YEAR}-{SEQ}
   */
  private async generateNumeroCotacao(tenantId: string): Promise<string> {
    const lastNumber = await this.cotacaoRepo.getLastCotacaoNumber(tenantId);

    const ultimoNumero = lastNumber
      ? parseInt(lastNumber.split('-').pop() || '0')
      : 0;

    const ano = new Date().getFullYear();
    const proximoNumero = String(ultimoNumero + 1).padStart(3, '0');

    return `COT-${ano}-${proximoNumero}`;
  }
}
