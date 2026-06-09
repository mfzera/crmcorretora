/**
 * Commission Calculator Utility
 *
 * Handles commission split calculations for multi-vendor scenarios
 * Supports:
 * - Two-way split: Principal + Secondary vendor
 * - Three-way split: Principal + Secondary + Corretora (broker)
 * - Validation: Percentages must sum to 100%
 */

export interface ComissaoSplitInput {
  premioLiquido: number | string;
  percentualComissaoPrincipal?: number | string;
  percentualComissaoSecundario?: number | string;
  percentualComissaoTerceiro?: number | string;
  percentualCorretora?: number | string;
  negocioCorretora?: boolean;
}

export interface ComissaoSplitResult {
  valid: boolean;
  errors: string[];
  valorComissaoTotal: number;
  valorComissaoPrincipal: number | null;
  valorComissaoSecundario: number | null;
  valorComissaoTerceiro: number | null;
  valorComissaoCorretora: number | null;
  percentualTotal: number;
}

/**
 * Converts string or number to number, handling null/undefined
 */
function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  return typeof value === 'string' ? parseFloat(value) : value;
}

/**
 * Validates and calculates commission split
 *
 * Rules:
 * 1. If no split fields provided, returns valid with null values (backward compatible)
 * 2. If any split field provided, all percentages must sum to 100%
 * 3. Percentages must be >= 0 and <= 100
 * 4. Calculated values are rounded to 2 decimal places
 *
 * @param input - Commission split configuration
 * @returns Validation result with calculated values
 */
export function calculateComissaoSplit(input: ComissaoSplitInput): ComissaoSplitResult {
  const errors: string[] = [];
  const premio = toNumber(input.premioLiquido);

  const percPrincipal = toNumber(input.percentualComissaoPrincipal);
  const percSecundario = toNumber(input.percentualComissaoSecundario);
  const percTerceiro = toNumber(input.percentualComissaoTerceiro);
  const percCorretora = toNumber(input.percentualCorretora);

  const hasSplit = percPrincipal > 0 || percSecundario > 0 || percTerceiro > 0 || percCorretora > 0;

  // Backward compatibility: if no split fields, return valid with nulls
  if (!hasSplit) {
    return {
      valid: true,
      errors: [],
      valorComissaoTotal: 0,
      valorComissaoPrincipal: null,
      valorComissaoSecundario: null,
      valorComissaoTerceiro: null,
      valorComissaoCorretora: null,
      percentualTotal: 0,
    };
  }

  // Validate percentages are within range
  if (percPrincipal < 0 || percPrincipal > 100) {
    errors.push('Percentual do vendedor principal deve estar entre 0 e 100');
  }
  if (percSecundario < 0 || percSecundario > 100) {
    errors.push('Percentual do vendedor secundário deve estar entre 0 e 100');
  }
  if (percTerceiro < 0 || percTerceiro > 100) {
    errors.push('Percentual do vendedor terciário deve estar entre 0 e 100');
  }
  if (percCorretora < 0 || percCorretora > 100) {
    errors.push('Percentual da corretora deve estar entre 0 e 100');
  }

  // Calculate total percentage
  const percentualTotal = percPrincipal + percSecundario + percTerceiro + percCorretora;

  // Validate sum equals 100% (with small tolerance for floating point)
  if (Math.abs(percentualTotal - 100) > 0.01) {
    errors.push(
      `Os percentuais devem somar 100%. Atual: ${percentualTotal.toFixed(2)}%`
    );
  }

  // Validate premio is positive
  if (premio <= 0) {
    errors.push('Prêmio líquido deve ser maior que zero');
  }

  // Calculate monetary values (total commission is premio * percentualTotal / 100)
  const valorComissaoTotal = (premio * percentualTotal) / 100;
  const valorComissaoPrincipal = percPrincipal > 0 ? (premio * percPrincipal) / 100 : null;
  const valorComissaoSecundario = percSecundario > 0 ? (premio * percSecundario) / 100 : null;
  const valorComissaoTerceiro = percTerceiro > 0 ? (premio * percTerceiro) / 100 : null;
  const valorComissaoCorretora = percCorretora > 0 ? (premio * percCorretora) / 100 : null;

  return {
    valid: errors.length === 0,
    errors,
    valorComissaoTotal: parseFloat(valorComissaoTotal.toFixed(2)),
    valorComissaoPrincipal: valorComissaoPrincipal !== null ? parseFloat(valorComissaoPrincipal.toFixed(2)) : null,
    valorComissaoSecundario: valorComissaoSecundario !== null ? parseFloat(valorComissaoSecundario.toFixed(2)) : null,
    valorComissaoTerceiro: valorComissaoTerceiro !== null ? parseFloat(valorComissaoTerceiro.toFixed(2)) : null,
    valorComissaoCorretora: valorComissaoCorretora !== null ? parseFloat(valorComissaoCorretora.toFixed(2)) : null,
    percentualTotal: parseFloat(percentualTotal.toFixed(2)),
  };
}

/**
 * Calculates commission from premio and percentage (legacy single-vendor mode)
 *
 * @param premio - Premium amount
 * @param percentual - Commission percentage
 * @returns Commission value
 */
export function calculateComissaoSimples(
  premio: number | string,
  percentual: number | string
): number {
  const p = toNumber(premio);
  const perc = toNumber(percentual);
  return parseFloat(((p * perc) / 100).toFixed(2));
}

/**
 * Auto-adjusts percentages when one changes to maintain 100% sum
 * Used in UI to automatically balance the split
 *
 * Priority: Corretora > Principal > Secundario
 *
 * @param changed - Which field changed ('principal' | 'secundario' | 'corretora')
 * @param newValue - New percentage value
 * @param current - Current state of all percentages
 * @returns Adjusted percentages that sum to 100%
 */
export function autoAdjustPercentages(
  changed: 'principal' | 'secundario' | 'terceiro' | 'corretora',
  newValue: number,
  current: {
    principal: number;
    secundario: number;
    terceiro: number;
    corretora: number;
  }
): {
  principal: number;
  secundario: number;
  terceiro: number;
  corretora: number;
} {
  // Clamp new value
  const value = Math.max(0, Math.min(100, newValue));

  // Fixed values: the changed field + corretora (highest priority, kept fixed unless corretora changed)
  if (changed === 'corretora') {
    const remaining = 100 - value;
    const vendedoresTotal = current.principal + current.secundario + current.terceiro;
    if (vendedoresTotal > 0) {
      return {
        principal: parseFloat((remaining * (current.principal / vendedoresTotal)).toFixed(2)),
        secundario: parseFloat((remaining * (current.secundario / vendedoresTotal)).toFixed(2)),
        terceiro: parseFloat((remaining * (current.terceiro / vendedoresTotal)).toFixed(2)),
        corretora: value,
      };
    }
    return { principal: remaining, secundario: 0, terceiro: 0, corretora: value };
  }

  // For vendor changes: keep corretora fixed, distribute remaining among other vendors
  const remaining = 100 - value - current.corretora;

  if (changed === 'principal') {
    const otherTotal = current.secundario + current.terceiro;
    if (otherTotal > 0) {
      return {
        principal: value,
        secundario: parseFloat((remaining * (current.secundario / otherTotal)).toFixed(2)),
        terceiro: parseFloat((remaining * (current.terceiro / otherTotal)).toFixed(2)),
        corretora: current.corretora,
      };
    }
    return { principal: value, secundario: remaining, terceiro: 0, corretora: current.corretora };
  }

  if (changed === 'secundario') {
    const otherTotal = current.principal + current.terceiro;
    if (otherTotal > 0) {
      return {
        principal: parseFloat((remaining * (current.principal / otherTotal)).toFixed(2)),
        secundario: value,
        terceiro: parseFloat((remaining * (current.terceiro / otherTotal)).toFixed(2)),
        corretora: current.corretora,
      };
    }
    return { principal: remaining, secundario: value, terceiro: 0, corretora: current.corretora };
  }

  // terceiro changed
  const otherTotal = current.principal + current.secundario;
  if (otherTotal > 0) {
    return {
      principal: parseFloat((remaining * (current.principal / otherTotal)).toFixed(2)),
      secundario: parseFloat((remaining * (current.secundario / otherTotal)).toFixed(2)),
      terceiro: value,
      corretora: current.corretora,
    };
  }
  return { principal: remaining, secundario: 0, terceiro: value, corretora: current.corretora };
}
