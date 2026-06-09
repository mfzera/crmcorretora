import { db } from '@ecotech/shared/database';
import { clientes } from '@ecotech/shared/database';

export async function createTestClientePF(
  corretoraId: string,
  vendedorId: string,
  overrides: Record<string, unknown> = {},
) {
  const ts = Date.now();
  const [cliente] = await db
    .insert(clientes)
    .values({
      corretoraId,
      vendedorId,
      tipoPessoa: 'PF',
      nome: `Cliente PF ${ts}`,
      cpf: String(ts).slice(-11).padStart(11, '0'),
      email: `cliente.${ts}@teste.com`,
      ativo: true,
      ...overrides,
    })
    .returning();
  return cliente;
}

export async function createTestClientePJ(
  corretoraId: string,
  vendedorId: string,
  overrides: Record<string, unknown> = {},
) {
  const ts = Date.now();
  const [cliente] = await db
    .insert(clientes)
    .values({
      corretoraId,
      vendedorId,
      tipoPessoa: 'PJ',
      razaoSocial: `Empresa Teste ${ts}`,
      cnpj: String(ts).slice(-14).padStart(14, '0'),
      email: `empresa.${ts}@teste.com`,
      ativo: true,
      ...overrides,
    })
    .returning();
  return cliente;
}
