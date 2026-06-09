/**
 * Resolve o vendedor principal e o atuante de uma operação.
 *
 * Regra: quem faz a ação (request.user.sub) é sempre o atuante.
 * O vendedor principal segue a cadeia: body → fallback do negócio → atuante.
 *
 * @param dataVendedorId  - vendedorId vindo do body da requisição (opcional)
 * @param fallbackId      - vendedorId da entidade relacionada (cliente, cotação, documento...)
 * @param requestUserId   - request.user.sub — quem está executando a ação
 */
export function resolveVendedorPrincipal(
  dataVendedorId: string | null | undefined,
  fallbackId: string | null | undefined,
  requestUserId: string,
): { vendedorId: string; atuanteId: string } {
  return {
    vendedorId: dataVendedorId ?? fallbackId ?? requestUserId,
    atuanteId: requestUserId,
  };
}
