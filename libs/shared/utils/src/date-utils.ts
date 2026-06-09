/**
 * Utilitários para manipulação e cálculo de datas
 */

/**
 * Calcula a diferença em dias entre uma data e hoje
 * @param targetDate - Data alvo (string ISO, Date ou timestamp)
 * @param referenceDate - Data de referência (padrão: hoje)
 * @returns Número de dias (positivo = futuro, negativo = passado)
 */
export function calculateDaysUntil(
  targetDate: string | Date | number,
  referenceDate: Date = new Date()
): number {
  const target = new Date(targetDate);
  const reference = new Date(referenceDate);

  // Validar se as datas são válidas
  if (isNaN(target.getTime()) || isNaN(reference.getTime())) {
    return 0;
  }

  const diffInMs = target.getTime() - reference.getTime();
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

  return diffInDays;
}

/**
 * Calcula dias restantes até o vencimento
 * Alias mais semântico para calculateDaysUntil
 */
export function calculateDaysToExpiry(expiryDate: string | Date | number): number {
  return calculateDaysUntil(expiryDate);
}

/**
 * Verifica se uma data está vencida (passada)
 */
export function isExpired(date: string | Date | number): boolean {
  return calculateDaysUntil(date) < 0;
}

/**
 * Verifica se uma data está próxima de vencer
 * @param date - Data a verificar
 * @param daysThreshold - Limite de dias (padrão: 3)
 */
export function isExpiringSoon(
  date: string | Date | number,
  daysThreshold: number = 3
): boolean {
  const days = calculateDaysUntil(date);
  return days >= 0 && days <= daysThreshold;
}

/**
 * Formata dias restantes com texto amigável
 * @param days - Número de dias
 * @returns Texto formatado (ex: "3 dias", "Vencido há 2 dias", "Hoje")
 */
export function formatDaysRemaining(days: number): string {
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Amanhã';
  if (days === -1) return 'Ontem';
  if (days > 1) return `${days} dias`;
  if (days < -1) return `Vencido há ${Math.abs(days)} dias`;
  return '';
}

/**
 * Adiciona dias a uma data
 * @param date - Data base
 * @param days - Número de dias a adicionar
 * @returns Nova data
 */
export function addDays(date: string | Date | number, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Adiciona meses a uma data
 * @param date - Data base
 * @param months - Número de meses a adicionar
 * @returns Nova data
 */
export function addMonths(date: string | Date | number, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Adiciona anos a uma data
 * @param date - Data base
 * @param years - Número de anos a adicionar
 * @returns Nova data
 */
export function addYears(date: string | Date | number, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * Formata uma data para o padrão brasileiro (dd/MM/yyyy).
 * Não usa toLocaleDateString — o output não depende do TZ do servidor.
 * Para timestamps, converte para UTC e extrai a data UTC.
 * Para strings YYYY-MM-DD, formata diretamente.
 */
export function formatDateBR(date: string | Date | number | null | undefined): string {
  if (!date) return '';

  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-');
    return `${d}/${m}/${y}`;
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const iso = d.toISOString(); // sempre UTC
  const [y, m, day] = iso.slice(0, 10).split('-');
  return `${day}/${m}/${y}`;
}

/**
 * Formata uma data e hora para o padrão brasileiro (dd/MM/yyyy HH:mm).
 * Sempre usa UTC para consistência independente do TZ do servidor.
 */
export function formatDateTimeBR(date: string | Date | number | null | undefined): string {
  if (!date) return '';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const iso = d.toISOString();
  const [y, m, day] = iso.slice(0, 10).split('-');
  const hhmm = iso.slice(11, 16);
  return `${day}/${m}/${y} ${hhmm}`;
}
