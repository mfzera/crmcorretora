import bcrypt from 'bcryptjs';
import { db } from '@ecotech/shared/database';
import {
  usuarios,
  cargos,
  cargoPermissoes,
  permissoesGlobais,
  usuarioCorretora,
} from '@ecotech/shared/database';

export const TEST_PASSWORD = 'Senha@Teste123';

export async function createAdminCargo(corretoraId: string) {
  const allPerms = await db.select().from(permissoesGlobais);
  const [cargo] = await db
    .insert(cargos)
    .values({
      corretoraId,
      nomeCargo: 'Administrador',
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
    })
    .returning();

  if (allPerms.length > 0) {
    await db.insert(cargoPermissoes).values(
      allPerms.map((p) => ({ cargoId: cargo.id, permissaoGlobalId: p.id })),
    );
  }
  return cargo;
}

export async function createTestUsuario(
  corretoraId: string,
  cargoId: string | null,
  overrides: Record<string, unknown> = {},
) {
  const ts = Date.now();
  // Custo 1 para velocidade em testes (vs 10 em produção)
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 1);

  const [usuario] = await db
    .insert(usuarios)
    .values({
      corretoraId,
      cargoId,
      nome: `Usuário Teste ${ts}`,
      email: `usuario.${ts}@teste.com`,
      passwordHash,
      ativo: true,
      primeiroAcesso: false,
      ...overrides,
    })
    .returning();

  await db.insert(usuarioCorretora).values({
    usuarioId: usuario.id,
    corretoraId,
    cargoId,
    ativo: true,
  });

  return usuario;
}
