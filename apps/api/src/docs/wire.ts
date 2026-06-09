import { z } from 'zod';

/**
 * Wire-format helpers — convertem tipos de runtime do Drizzle/handler para
 * o que efetivamente vai pelo JSON.
 */

/**
 * Aceita Date (vindo de coluna timestamp do Drizzle) OU string (já serializada),
 * produzindo string ISO. Equivalente ao que `JSON.stringify` faz com Date via
 * `Date.prototype.toJSON`, mas explícito no tipo do schema para que OpenAPI
 * documente como string e a validação aceite ambos.
 */
export const wireDate = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString() : v),
  z.string(),
);

/**
 * Coluna decimal do Drizzle retorna string (precisão exata).
 * Use este helper quando o handler entrega o valor cru (sem parseFloat).
 */
export const wireDecimal = z.string();

/**
 * Coluna decimal do Drizzle (retorna string) ou número já convertido pelo handler.
 * O preprocess converte automaticamente — handlers não precisam chamar parseFloat.
 */
export const wireNumber = z.preprocess(
  (v) =>
    v !== null && v !== undefined && typeof v === 'string' ? parseFloat(v) : v,
  z.number(),
);
