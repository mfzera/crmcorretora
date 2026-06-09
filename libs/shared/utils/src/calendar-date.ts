/**
 * Operações em datas-calendário (YYYY-MM-DD) sem dependência de timezone.
 *
 * Regra central: datas-calendário (vigência, vencimento) são strings opacas
 * no formato YYYY-MM-DD e nunca carregam informação de timezone. Toda aritmética
 * usa noon UTC (T12:00:00Z) para blindar contra o offset Brasil (UTC-3) e
 * contra eventual DST futuro.
 *
 * "Hoje" no contexto de negócio é sempre a data em São Paulo (UTC-3),
 * não a data UTC do servidor.
 */

const SP_OFFSET_MS = -3 * 60 * 60 * 1000; // America/Sao_Paulo fixo desde 2019

/** Retorna "YYYY-MM-DD" de hoje no horário de São Paulo, nunca UTC. */
export function todayInSP(): string {
  const spMs = Date.now() + SP_OFFSET_MS;
  return new Date(spMs).toISOString().slice(0, 10);
}

/**
 * Diferença em dias entre duas datas YYYY-MM-DD.
 * Positivo quando `a` é posterior a `b`.
 * Usa noon UTC para anular offsets de timezone na divisão.
 */
export function diffCalendarDays(a: string, b: string): number {
  const msA = new Date(a + 'T12:00:00Z').getTime();
  const msB = new Date(b + 'T12:00:00Z').getTime();
  return Math.round((msA - msB) / 86_400_000);
}

/** Adiciona N dias a uma data YYYY-MM-DD. N pode ser negativo. */
export function addCalendarDays(date: string, days: number): string {
  const ms = new Date(date + 'T12:00:00Z').getTime() + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Verifica se uma data YYYY-MM-DD já passou em relação a hoje SP. */
export function isExpiredCalendar(dataVencimento: string): boolean {
  return diffCalendarDays(dataVencimento, todayInSP()) < 0;
}

/** Primeiro dia do mês de uma data YYYY-MM-DD. Ex: "2024-03-15" → "2024-03-01" */
export function startOfMonthStr(date: string): string {
  return date.slice(0, 7) + '-01';
}

/** Último dia do mês de uma data YYYY-MM-DD. Ex: "2024-03-15" → "2024-03-31" */
export function endOfMonthStr(date: string): string {
  const [y, m] = date.split('-').map(Number);
  // Dia 0 do mês m+1 = último dia do mês m
  const last = new Date(Date.UTC(y, m, 0));
  return last.toISOString().slice(0, 10);
}

/**
 * Itera cada dia em um intervalo [start, end] inclusive.
 * Usa setUTCDate para evitar drift de DST na iteração.
 */
export function* eachDayInRange(start: string, end: string): Generator<string> {
  const cur = new Date(start + 'T12:00:00Z');
  const endMs = new Date(end + 'T12:00:00Z').getTime();
  while (cur.getTime() <= endMs) {
    yield cur.toISOString().slice(0, 10);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
}
