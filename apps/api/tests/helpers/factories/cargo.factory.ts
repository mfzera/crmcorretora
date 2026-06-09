import { db } from '@ecotech/shared/database';
import { cargos, cargoPermissoes, permissoesGlobais } from '@ecotech/shared/database';
import { eq, inArray } from 'drizzle-orm';

export async function createTestCargo(
  corretoraId: string,
  options: {
    nomeCargo?: string;
    isAdmin?: boolean;
    isGestor?: boolean;
    isVendedor?: boolean;
    permissoes?: string[];
  } = {},
) {
  const ts = Date.now();
  const [cargo] = await db
    .insert(cargos)
    .values({
      corretoraId,
      nomeCargo: options.nomeCargo ?? `Cargo Teste ${ts}`,
      isAdmin: options.isAdmin ?? false,
      isGestor: options.isGestor ?? false,
      isVendedor: options.isVendedor ?? false,
    })
    .returning();

  if (options.permissoes && options.permissoes.length > 0) {
    const perms = await db
      .select()
      .from(permissoesGlobais)
      .where(inArray(permissoesGlobais.nomePermissao, options.permissoes));

    if (perms.length > 0) {
      await db.insert(cargoPermissoes).values(
        perms.map((p) => ({ cargoId: cargo.id, permissaoGlobalId: p.id })),
      );
    }
  }

  return cargo;
}
