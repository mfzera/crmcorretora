import { db } from '@ecotech/shared/database';
import { renovacoesComerciais } from '@ecotech/shared/database';

export async function createTestRenovacao(
  corretoraId: string,
  vendedorId: string,
  overrides: Record<string, unknown> = {},
) {
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);

  const [renovacao] = await db
    .insert(renovacoesComerciais)
    .values({
      corretoraId,
      vendedorId,
      dataVencimento: ontem.toISOString().split('T')[0],
      status: 'NAO_TRABALHADO',
      ...overrides,
    })
    .returning();
  return renovacao;
}
