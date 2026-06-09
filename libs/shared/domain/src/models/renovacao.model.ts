/**
 * Renovacao Domain Model
 *
 * Rich domain model with business logic encapsulated.
 * This is where business rules live, not in HTTP handlers.
 */

import type { RenovacaoComercial } from '@ecotech/shared/database';

export type PrioridadeRenovacao = 'ALTA' | 'MEDIA' | 'BAIXA';

/**
 * Renovacao Domain Model with business logic
 */
export class RenovacaoDomain {
  private readonly data: RenovacaoComercial;

  constructor(data: RenovacaoComercial) {
    this.data = data;
  }

  /**
   * Get the underlying data
   */
  getData(): RenovacaoComercial {
    return this.data;
  }

  /**
   * Calculate days until expiration
   */
  getDiasParaVencimento(): number {
    const hoje = new Date();
    const vencimento = new Date(this.data.dataVencimento);
    const diffTime = vencimento.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Calculate renewal priority based on business rules
   *
   * ALTA: <= 15 days OR premium > R$ 50.000
   * MEDIA: 16-30 days OR premium > R$ 20.000
   * BAIXA: > 30 days
   */
  calculatePrioridade(): PrioridadeRenovacao {
    const dias = this.getDiasParaVencimento();
    const premioAnterior = this.data.premioAnterior
      ? parseFloat(this.data.premioAnterior)
      : 0;

    // High priority: Urgent or high-value
    if (dias <= 15 || premioAnterior > 50000) {
      return 'ALTA';
    }

    // Medium priority: Soon or medium-value
    if (dias <= 30 || premioAnterior > 20000) {
      return 'MEDIA';
    }

    // Low priority: Plenty of time and standard value
    return 'BAIXA';
  }

  /**
   * Check if renewal can be initiated
   */
  canBeInitiated(): boolean {
    return this.data.status === 'NAO_TRABALHADO';
  }

  /**
   * Check if renewal is in progress
   */
  isInProgress(): boolean {
    return ['EM_PROSPECCAO', 'EM_NEGOCIACAO', 'AGUARDANDO_CLIENTE'].includes(
      this.data.status,
    );
  }

  /**
   * Check if renewal is finalized (success or failure)
   */
  isFinalized(): boolean {
    return ['RENOVADO', 'PERDIDO', 'CANCELADO'].includes(this.data.status);
  }

  /**
   * Check if renewal is within action window (45 days before expiry)
   */
  isWithinActionWindow(): boolean {
    const dias = this.getDiasParaVencimento();
    return dias <= 45 && dias >= 0;
  }

  /**
   * Check if renewal is overdue
   */
  isOverdue(): boolean {
    const dias = this.getDiasParaVencimento();
    return dias < 0;
  }

  /**
   * Get status label in Portuguese
   */
  getStatusLabel(): string {
    const labels: Record<string, string> = {
      NAO_TRABALHADO: 'Não Trabalhado',
      EM_PROSPECCAO: 'Em Prospecção',
      EM_NEGOCIACAO: 'Em Negociação',
      AGUARDANDO_CLIENTE: 'Aguardando Cliente',
      RENOVADO: 'Renovado',
      PERDIDO: 'Perdido',
      CANCELADO: 'Cancelado',
    };
    return labels[this.data.status] || this.data.status;
  }

  /**
   * Convert to DTO with computed fields
   */
  toDTO() {
    return {
      ...this.data,
      diasParaVencimento: this.getDiasParaVencimento(),
      prioridade: this.calculatePrioridade(),
      statusLabel: this.getStatusLabel(),
      podeIniciar: this.canBeInitiated(),
      emAndamento: this.isInProgress(),
      finalizado: this.isFinalized(),
      dentroJanela: this.isWithinActionWindow(),
      vencido: this.isOverdue(),
    };
  }
}
