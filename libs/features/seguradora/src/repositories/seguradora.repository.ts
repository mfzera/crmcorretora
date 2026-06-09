import { db } from '@ecotech/shared/database';
import { corretoras, planos } from '@ecotech/shared/database';
import { eq } from 'drizzle-orm';
import type { UpdateSeguradoraInput } from '../schemas';

export async function findWithPlano(corretoraId: string) {
  const rows = await db
    .select()
    .from(corretoras)
    .leftJoin(planos, eq(corretoras.planoId, planos.id))
    .where(eq(corretoras.id, corretoraId))
    .limit(1);
  return rows[0] ?? null;
}

export async function update(corretoraId: string, data: UpdateSeguradoraInput) {
  const [updated] = await db
    .update(corretoras)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(corretoras.id, corretoraId))
    .returning();
  return updated;
}

export async function updateLogo(corretoraId: string, logoUrl: string) {
  const [updated] = await db
    .update(corretoras)
    .set({ logoUrl, updatedAt: new Date() })
    .where(eq(corretoras.id, corretoraId))
    .returning();
  return updated;
}
