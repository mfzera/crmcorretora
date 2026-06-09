import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import relativeTime from 'dayjs/plugin/relativeTime';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isToday from 'dayjs/plugin/isToday';

dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);
dayjs.extend(isToday);
dayjs.locale('pt-br');

export function parseDateStr(date: string): dayjs.Dayjs {
  if (date.includes('T')) return dayjs(date);
  return dayjs(date, 'YYYY-MM-DD');
}

/** Calcula dias até uma data (positivo = futuro, negativo = passado) */
export function calculateDaysUntil(date: string | Date): number {
  const target = typeof date === 'string' ? parseDateStr(date) : dayjs(date);
  return target.startOf('day').diff(dayjs().startOf('day'), 'day');
}

/** Calcula dias desde uma data (sempre positivo) */
export function calculateDaysSince(date: string | Date): number {
  return Math.abs(calculateDaysUntil(date));
}

/** Verifica se uma data já passou */
export function isExpired(date: string | Date): boolean {
  return calculateDaysUntil(date) < 0;
}

/** Formata data para padrão brasileiro (DD/MM/YYYY) */
export function formatDateBR(date: string | Date): string {
  const d = typeof date === 'string' ? parseDateStr(date) : dayjs(date);
  return d.format('DD/MM/YYYY');
}

/** Formata data e hora para padrão brasileiro (DD/MM/YYYY HH:mm) */
export function formatDateTimeBR(date: string | Date): string {
  const d = typeof date === 'string' ? parseDateStr(date) : dayjs(date);
  return d.format('DD/MM/YYYY HH:mm');
}

/** Retorna texto relativo ao momento atual (ex: "há 3 dias") */
export function fromNow(date: string | Date): string {
  const d = typeof date === 'string' ? parseDateStr(date) : dayjs(date);
  return d.fromNow();
}

/** Adiciona dias a uma data */
export function addDays(date: Date, days: number): Date {
  return dayjs(date).add(days, 'day').toDate();
}

/** Adiciona meses a uma data */
export function addMonths(date: Date, months: number): Date {
  return dayjs(date).add(months, 'month').toDate();
}

/** Adiciona anos a uma data */
export function addYears(date: Date, years: number): Date {
  return dayjs(date).add(years, 'year').toDate();
}

/** Converte Date para string YYYY-MM-DD (usa data local, não UTC) */
export function toISODateString(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}

/** Retorna "YYYY-MM-DD" de hoje no timezone local do navegador (nunca UTC). */
export function todayLocalISODate(): string {
  return dayjs().format('YYYY-MM-DD');
}

export { dayjs };
