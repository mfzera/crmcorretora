import { z } from 'zod';

function stripJsonSchemaMeta(s: unknown): unknown {
  if (Array.isArray(s)) return s.map(stripJsonSchemaMeta);
  if (s !== null && typeof s === 'object') {
    const { $schema: _s, ...rest } = s as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(rest).map(([k, v]) => [k, stripJsonSchemaMeta(v)]),
    );
  }
  return s;
}

/**
 * Converte um Zod schema para JSON Schema compatível com Fastify/Scalar.
 * Mantido para compatibilidade com código que precise de JSON Schema explicitamente.
 */
export function toDoc(schema: z.ZodTypeAny): object {
  return stripJsonSchemaMeta(z.toJSONSchema(schema)) as object;
}

/**
 * Converte um mapa { statusCode: ZodSchema } para JSON Schema.
 * Mantido para compatibilidade.
 */
export function toResponseDoc(
  schemas: Record<number, z.ZodTypeAny>,
): Record<number, object> {
  return Object.fromEntries(
    Object.entries(schemas).map(([code, schema]) => [
      Number(code),
      stripJsonSchemaMeta(z.toJSONSchema(schema)) as object,
    ]),
  );
}

// Remove chaves cujo valor é `never` para não poluir o overload resolution do Fastify.
type DropNever<T> = { [K in keyof T as [T[K]] extends [never] ? never : K]: T[K] };

/**
 * Monta o bloco schema de uma rota preservando os tipos exatos dos schemas de
 * request e response para que fastify-type-provider-zod possa:
 *  - inferir request.body / query / params;
 *  - checar em tempo de compilação que o handler retorna um shape compatível
 *    com o schema 200 (ex.: { success: true; data: T }).
 *
 * Se o retorno do handler conflitar com tipos Drizzle (ex.: Date vs string),
 * use `ok(data as z.infer<typeof dataSchema>)` para o cast pontual.
 *
 * Uso:
 *   schema: {
 *     tags: ['Clientes'],
 *     summary: 'Listar clientes',
 *     ...routeDoc({
 *       querystring: listClientesQuerySchema,
 *       response: { 200: clienteListResponse, ...defaultErrors },
 *     }),
 *   }
 */
export function routeDoc<
  TBody extends z.ZodTypeAny = never,
  TQuery extends z.ZodTypeAny = never,
  TParams extends z.ZodTypeAny = never,
  TResponse extends Record<number, z.ZodTypeAny> = Record<number, z.ZodTypeAny>,
>(opts: {
  body?: TBody;
  querystring?: TQuery;
  params?: TParams;
  response: TResponse;
}): DropNever<{
  body: TBody;
  querystring: TQuery;
  params: TParams;
  response: TResponse;
}> {
  return opts as DropNever<{
    body: TBody;
    querystring: TQuery;
    params: TParams;
    response: TResponse;
  }>;
}

/**
 * Cria o envelope padrão de sucesso { success: true, data: T }.
 * Use em todos os handlers que retornam dados — garante o shape correto
 * e preserva o literal `true` sem precisar de `as const`.
 */
export function ok<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}
