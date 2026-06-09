/**
 * Pricing Calculator for Per-Seat Pricing Model (Option A: Hybrid Base + Per-Seat)
 *
 * Preços líquidos (o que a empresa recebe):
 * - Trienal:   R$ 190,00/mês base + R$ 68,40/seat (líquido)
 * - Anual:     R$ 218,50/mês base + R$ 78,66/seat (+15% líquido vs trienal)
 * - Semestral: R$ 251,28/mês base + R$ 90,46/seat (+15% líquido vs anual)
 * - Mensal:    R$ 288,97/mês base + R$ 104,03/seat (+15% líquido vs semestral)
 *
 * Preços brutos exibidos ao cliente (líquido + taxa Asaas 2,88% + R$0,49/transação):
 *   gross_base = (net + 0,49 / billing_months) / (1 - 0,0288)
 *   gross_seat = net_seat / (1 - 0,0288)  — taxa fixa é por transação, não por seat
 * - Trienal:   R$ 195,65/mês base + R$ 70,43/seat
 * - Anual:     R$ 225,02/mês base + R$ 80,99/seat (economize 24% vs mensal)
 * - Semestral: R$ 258,81/mês base + R$ 93,14/seat (economize 13% vs mensal)
 * - Mensal:    R$ 298,04/mês base + R$ 107,11/seat (referência — plano recorrente mais caro)
 */

export const PRICING_CONFIG = {
  BASE_PRICE: 195.65, // R$ 195,65 — preço base trienal bruto (líquido R$190 + taxa Asaas 2,88% + R$0,49)
  INCLUDED_SEATS: 3,
  PRICE_PER_ADDITIONAL_SEAT: 70.43, // R$ 70,43 — seat trienal bruto (líquido R$68,40 + taxa Asaas 2,88%)
  CURRENCY: 'BRL',
} as const;

export type PlanCycle = 'TRIENAL' | 'ANUAL' | 'SEMESTRAL' | 'MENSAL';

export const PLAN_CONFIGS: Record<
  PlanCycle,
  {
    label: string;
    shortLabel: string;
    billingLabel: string;
    basePrice: number;
    pricePerSeat: number;
    billingMonths: number;
    /** null = cobrança única (trienal via payment avulso no Asaas) */
    asaasCycle: 'MONTHLY' | 'SEMIANNUALLY' | 'YEARLY' | null;
    badge: string | null;
  }
> = {
  TRIENAL: {
    label: '3 Anos',
    shortLabel: '36 meses',
    billingLabel: 'cobrado a cada 3 anos',
    basePrice: 195.65, // bruto (líquido R$190 + taxa Asaas)
    pricePerSeat: 70.43, // bruto (líquido R$68,40 + taxa Asaas)
    billingMonths: 36,
    asaasCycle: null, // cobrança avulsa (payment), não subscription
    badge: 'Economize 34%', // vs plano mensal
  },
  ANUAL: {
    label: 'Anual',
    shortLabel: '12 meses',
    billingLabel: 'cobrado anualmente',
    basePrice: 225.02, // bruto (líquido R$218,50 + taxa Asaas)
    pricePerSeat: 80.99, // bruto (líquido R$78,66 + taxa Asaas)
    billingMonths: 12,
    asaasCycle: 'YEARLY',
    badge: 'Economize 24%', // vs plano mensal
  },
  SEMESTRAL: {
    label: 'Semestral',
    shortLabel: '6 meses',
    billingLabel: 'cobrado semestralmente',
    basePrice: 258.81, // bruto (líquido R$251,28 + taxa Asaas)
    pricePerSeat: 93.14, // bruto (líquido R$90,46 + taxa Asaas)
    billingMonths: 6,
    asaasCycle: 'SEMIANNUALLY',
    badge: 'Economize 13%', // vs plano mensal
  },
  MENSAL: {
    label: 'Mensal',
    shortLabel: '1 mês',
    billingLabel: 'cobrado mensalmente',
    basePrice: 298.04, // bruto (líquido R$288,97 + taxa Asaas)
    pricePerSeat: 107.11, // bruto (líquido R$104,03 + taxa Asaas)
    billingMonths: 1,
    asaasCycle: 'MONTHLY',
    badge: null,
  },
};

/**
 * Calculate monthly equivalent for a given plan and number of users.
 */
export function calculatePlanBill(
  activeUsers: number,
  cycle: PlanCycle,
  courtesySeats = 0,
): number {
  const cfg = PLAN_CONFIGS[cycle];
  if (activeUsers <= 0) return 0;
  const billableUsers = Math.max(0, activeUsers - courtesySeats);
  if (billableUsers <= PRICING_CONFIG.INCLUDED_SEATS) return cfg.basePrice;
  const additionalSeats = billableUsers - PRICING_CONFIG.INCLUDED_SEATS;
  return parseFloat((cfg.basePrice + additionalSeats * cfg.pricePerSeat).toFixed(2));
}

/**
 * Calculate total amount charged per billing period (monthly × billingMonths).
 */
export function calculatePlanTotal(activeUsers: number, cycle: PlanCycle): number {
  return parseFloat(
    (calculatePlanBill(activeUsers, cycle) * PLAN_CONFIGS[cycle].billingMonths).toFixed(2),
  );
}

/**
 * Calculate monthly bill based on number of active users
 * @param activeUsers - Number of active users/seats
 * @returns Total monthly cost in BRL
 */
export function calculateMonthlyBill(activeUsers: number): number {
  if (activeUsers <= 0) {
    return 0;
  }

  if (activeUsers <= PRICING_CONFIG.INCLUDED_SEATS) {
    return PRICING_CONFIG.BASE_PRICE;
  }

  const additionalSeats = activeUsers - PRICING_CONFIG.INCLUDED_SEATS;
  const total =
    PRICING_CONFIG.BASE_PRICE +
    additionalSeats * PRICING_CONFIG.PRICE_PER_ADDITIONAL_SEAT;

  return parseFloat(total.toFixed(2));
}

/**
 * Calculate number of additional seats beyond the included amount
 * @param activeUsers - Number of active users/seats
 * @returns Number of additional seats being charged
 */
export function calculateAdditionalSeats(activeUsers: number): number {
  if (activeUsers <= PRICING_CONFIG.INCLUDED_SEATS) {
    return 0;
  }

  return activeUsers - PRICING_CONFIG.INCLUDED_SEATS;
}

/**
 * Calculate prorated charge for adding/removing seats mid-cycle
 * @param seatPrice - Price per seat (default: PRICE_PER_ADDITIONAL_SEAT)
 * @param daysRemaining - Days remaining in the billing cycle
 * @param totalDaysInCycle - Total days in the billing cycle (usually 30)
 * @returns Prorated amount in BRL
 */
export function calculateProratedCharge(
  seatPrice: number,
  daysRemaining: number,
  totalDaysInCycle: number = 30,
): number {
  if (daysRemaining <= 0 || totalDaysInCycle <= 0) {
    return 0;
  }

  const prorated = seatPrice * (daysRemaining / totalDaysInCycle);
  return parseFloat(prorated.toFixed(2));
}

/**
 * Get pricing breakdown for display
 * @param activeUsers - Number of active users/seats
 * @returns Detailed pricing breakdown
 */
export function getPricingBreakdown(activeUsers: number) {
  const additionalSeats = calculateAdditionalSeats(activeUsers);
  const totalMonthly = calculateMonthlyBill(activeUsers);

  return {
    basePrice: PRICING_CONFIG.BASE_PRICE,
    includedSeats: PRICING_CONFIG.INCLUDED_SEATS,
    pricePerSeat: PRICING_CONFIG.PRICE_PER_ADDITIONAL_SEAT,
    activeUsers,
    additionalSeats,
    additionalSeatsCost:
      additionalSeats * PRICING_CONFIG.PRICE_PER_ADDITIONAL_SEAT,
    totalMonthly,
    currency: PRICING_CONFIG.CURRENCY,
  };
}

/**
 * Format price in Brazilian Real
 * @param amount - Amount in BRL
 * @returns Formatted string (e.g., "R$ 50,00")
 */
export function formatBRL(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

/**
 * Calculate cost change when adding/removing users
 * @param currentUsers - Current number of users
 * @param newUsers - New number of users after change
 * @returns Change in monthly cost (positive = increase, negative = decrease)
 */
export function calculateCostChange(
  currentUsers: number,
  newUsers: number,
): {
  costBefore: number;
  costAfter: number;
  difference: number;
  percentChange: number;
} {
  const costBefore = calculateMonthlyBill(currentUsers);
  const costAfter = calculateMonthlyBill(newUsers);
  const difference = costAfter - costBefore;
  const percentChange =
    costBefore > 0 ? ((difference / costBefore) * 100).toFixed(2) : 0;

  return {
    costBefore,
    costAfter,
    difference: parseFloat(difference.toFixed(2)),
    percentChange: parseFloat(String(percentChange)),
  };
}

// ── Módulos add-on ────────────────────────────────────────────────────────────

export type ModuloSlug = 'crm' | 'sinistros' | 'gamificacao';

/**
 * Preços brutos por módulo, por ciclo.
 * Fórmula: gross = net / (1 - 0.0288)
 *
 * Módulos sinistros/gamificacao têm preço base (cobre até INCLUDED_SEATS usuários)
 * + preço por seat adicional acima desse threshold.
 * crm é cobrado apenas por seat adicional (sem base própria).
 *
 * Líquidos-alvo (trienal):
 *   crm         base: —          seat: R$ 50,00 → gross R$ 51,49
 *   sinistros   base: R$ 40,00 → gross R$ 41,19   seat: R$ 10,00 → gross R$ 10,30
 *   gamificacao base: R$ 70,00 → gross R$ 72,08   seat: R$ 20,00 → gross R$ 20,59
 *
 * Ciclos superiores aplicam +15% sobre o líquido anterior.
 */
export const MODULE_PRICING_CONFIG: Record<
  ModuloSlug,
  Record<
    PlanCycle,
    {
      /** Preço base fixo (cobre até INCLUDED_SEATS usuários); null = só per-seat */
      base: { net: number; gross: number } | null;
      /** Preço por seat adicional acima de INCLUDED_SEATS */
      seat: { net: number; gross: number };
    }
  >
> = {
  crm: {
    TRIENAL:   { base: null, seat: { net: 50.00, gross: 51.49 } },
    ANUAL:     { base: null, seat: { net: 57.50, gross: 59.21 } },
    SEMESTRAL: { base: null, seat: { net: 66.13, gross: 68.10 } },
    MENSAL:    { base: null, seat: { net: 76.04, gross: 78.30 } },
  },
  sinistros: {
    TRIENAL:   { base: { net: 40.00, gross: 41.19 }, seat: { net: 10.00, gross: 10.30 } },
    ANUAL:     { base: { net: 46.00, gross: 47.36 }, seat: { net: 11.50, gross: 11.84 } },
    SEMESTRAL: { base: { net: 52.90, gross: 54.47 }, seat: { net: 13.23, gross: 13.62 } },
    MENSAL:    { base: { net: 60.84, gross: 62.64 }, seat: { net: 15.21, gross: 15.66 } },
  },
  gamificacao: {
    TRIENAL:   { base: { net: 70.00, gross: 72.08 }, seat: { net: 20.00, gross: 20.59 } },
    ANUAL:     { base: { net: 80.50, gross: 82.89 }, seat: { net: 23.00, gross: 23.68 } },
    SEMESTRAL: { base: { net: 92.58, gross: 95.32 }, seat: { net: 26.45, gross: 27.23 } },
    MENSAL:    { base: { net: 106.46, gross: 109.62 }, seat: { net: 30.42, gross: 31.32 } },
  },
};

export const MODULO_LABELS: Record<ModuloSlug, { nome: string; descricao: string }> = {
  crm: {
    nome: 'CRM',
    descricao: 'Cotações, vendas, renovações e gestão de clientes',
  },
  sinistros: {
    nome: 'Sinistros',
    descricao: 'Abertura, acompanhamento e pagamento de sinistros',
  },
  gamificacao: {
    nome: 'Gamificação',
    descricao: 'Metas, missões, badges e ranking de equipe',
  },
};

/**
 * Calcula o custo mensal dos módulos add-on (sinistros, gamificacao).
 * Cada módulo cobra um preço base (cobre até INCLUDED_SEATS usuários)
 * + per-seat para usuários adicionais acima do threshold.
 */
export function calculateModulesBill(
  activeUsers: number,
  cycle: PlanCycle,
  modulosAtivos: string[],
  courtesySeats = 0,
): number {
  const billableUsers = Math.max(0, activeUsers - courtesySeats);
  if (billableUsers <= 0) return 0;
  const additionalSeats = Math.max(0, billableUsers - PRICING_CONFIG.INCLUDED_SEATS);
  let total = 0;
  for (const modulo of ['sinistros', 'gamificacao'] as const) {
    if (modulosAtivos.includes(modulo)) {
      const pricing = MODULE_PRICING_CONFIG[modulo][cycle];
      if (pricing.base) total += pricing.base.gross;
      total += pricing.seat.gross * additionalSeats;
    }
  }
  return parseFloat(total.toFixed(2));
}

/**
 * Custo mensal total: CRM (base + seats adicionais) + módulos add-on por usuário.
 */
export function calculateTotalBill(
  activeUsers: number,
  cycle: PlanCycle,
  modulosAtivos: string[],
  courtesySeats = 0,
): number {
  const crm = calculatePlanBill(activeUsers, cycle, courtesySeats);
  const addons = calculateModulesBill(activeUsers, cycle, modulosAtivos, courtesySeats);
  return parseFloat((crm + addons).toFixed(2));
}

/**
 * Preços por seat de vendedor — metade do preço do seat CRM.
 * Vendedores não têm login e são cobrados separadamente dos usuários.
 * Sem seats incluídos — cobrança flat por ativo.
 *
 * Líquidos-alvo (trienal): R$ 25,00/seat → gross R$ 25,75
 * Ciclos superiores: +15% sobre o líquido anterior.
 */
export const VENDEDOR_PRICING_CONFIG: Record<
  PlanCycle,
  { net: number; gross: number }
> = {
  TRIENAL:   { net: 25.00, gross: 25.75 },
  ANUAL:     { net: 28.75, gross: 29.61 },
  SEMESTRAL: { net: 33.06, gross: 34.04 },
  MENSAL:    { net: 38.02, gross: 39.15 },
};

/**
 * Custo mensal de vendedores ativos (cobrança flat por seat, sem gratuidade).
 */
export function calculateVendedoresBill(
  activeVendedores: number,
  cycle: PlanCycle,
): number {
  if (activeVendedores <= 0) return 0;
  return parseFloat(
    (VENDEDOR_PRICING_CONFIG[cycle].gross * activeVendedores).toFixed(2),
  );
}

/**
 * Custo mensal total incluindo vendedores.
 */
export function calculateTotalBillWithVendedores(
  activeUsers: number,
  activeVendedores: number,
  cycle: PlanCycle,
  modulosAtivos: string[],
  courtesySeats = 0,
): number {
  const base = calculateTotalBill(activeUsers, cycle, modulosAtivos, courtesySeats);
  const sellers = calculateVendedoresBill(activeVendedores, cycle);
  return parseFloat((base + sellers).toFixed(2));
}

/**
 * Example pricing table for reference
 */
export const PRICING_EXAMPLES = [
  { users: 1, cost: calculateMonthlyBill(1) },
  { users: 2, cost: calculateMonthlyBill(2) },
  { users: 3, cost: calculateMonthlyBill(3) },
  { users: 4, cost: calculateMonthlyBill(4) },
  { users: 5, cost: calculateMonthlyBill(5) },
  { users: 10, cost: calculateMonthlyBill(10) },
  { users: 15, cost: calculateMonthlyBill(15) },
  { users: 20, cost: calculateMonthlyBill(20) },
  { users: 50, cost: calculateMonthlyBill(50) },
  { users: 100, cost: calculateMonthlyBill(100) },
] as const;
