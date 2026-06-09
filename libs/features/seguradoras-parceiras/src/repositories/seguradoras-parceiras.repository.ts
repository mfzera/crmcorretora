import { db } from '@ecotech/shared/database';
import { seguradorasParceiras, produtos } from '@ecotech/shared/database';
import { eq, and, isNull, count, sql } from 'drizzle-orm';
import type {
  CreateSeguradoraParceiraInput,
  UpdateSeguradoraParceiraInput,
  ListSeguradorasParceiraQuery,
} from '../schemas';

export async function findByCnpj(corretoraId: string, cnpj: string) {
  return db.query.seguradorasParceiras.findFirst({
    where: and(
      eq(seguradorasParceiras.corretoraId, corretoraId),
      eq(seguradorasParceiras.cnpj, cnpj),
      isNull(seguradorasParceiras.deletedAt),
    ),
  });
}

export async function create(
  corretoraId: string,
  data: CreateSeguradoraParceiraInput,
) {
  const [seguradora] = await db
    .insert(seguradorasParceiras)
    .values({
      corretoraId,
      cnpj: data.cnpj,
      razaoSocial: data.razaoSocial,
      nomeFantasia: data.nomeFantasia,
      telefone: data.telefone,
      email: data.email,
      telefone24h: data.telefone24h,
      whatsapp24h: data.whatsapp24h,
      horarioAtendimento24h: data.horarioAtendimento24h,
      status: data.status || 'ATIVA',
    })
    .returning();
  return seguradora;
}

export async function listForSelect(corretoraId: string) {
  return db
    .select({
      id: seguradorasParceiras.id,
      nomeFantasia: seguradorasParceiras.nomeFantasia,
      razaoSocial: seguradorasParceiras.razaoSocial,
    })
    .from(seguradorasParceiras)
    .where(
      and(
        eq(seguradorasParceiras.corretoraId, corretoraId),
        eq(seguradorasParceiras.status, 'ATIVA'),
        isNull(seguradorasParceiras.deletedAt),
      ),
    )
    .orderBy(seguradorasParceiras.razaoSocial);
}

export async function list(corretoraId: string, query: ListSeguradorasParceiraQuery) {
  const { page, limit, status, search } = query;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(seguradorasParceiras.corretoraId, corretoraId),
    isNull(seguradorasParceiras.deletedAt),
  ] as ReturnType<typeof eq>[];

  if (status && status !== 'TODAS') {
    conditions.push(eq(seguradorasParceiras.status, status));
  }

  if (search) {
    conditions.push(
      sql`(${seguradorasParceiras.razaoSocial} LIKE ${`%${search}%`} OR ${seguradorasParceiras.nomeFantasia} LIKE ${`%${search}%`} OR ${seguradorasParceiras.cnpj} LIKE ${`%${search}%`})`,
    );
  }

  const [countResult] = await db
    .select({ count: count() })
    .from(seguradorasParceiras)
    .where(and(...conditions));

  const total = Number(countResult?.count || 0);

  const items = await db.query.seguradorasParceiras.findMany({
    where: and(...conditions),
    orderBy: (s, { asc }) => [asc(s.razaoSocial)],
    limit,
    offset,
  });

  return { items, total };
}

export async function findById(corretoraId: string, id: string) {
  return db.query.seguradorasParceiras.findFirst({
    where: and(
      eq(seguradorasParceiras.id, id),
      eq(seguradorasParceiras.corretoraId, corretoraId),
      isNull(seguradorasParceiras.deletedAt),
    ),
  });
}

export async function update(id: string, data: UpdateSeguradoraParceiraInput) {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (data.cnpj !== undefined) updateData.cnpj = data.cnpj;
  if (data.razaoSocial !== undefined) updateData.razaoSocial = data.razaoSocial;
  if (data.nomeFantasia !== undefined) updateData.nomeFantasia = data.nomeFantasia;
  if (data.telefone !== undefined) updateData.telefone = data.telefone;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.telefone24h !== undefined) updateData.telefone24h = data.telefone24h;
  if (data.whatsapp24h !== undefined) updateData.whatsapp24h = data.whatsapp24h;
  if (data.horarioAtendimento24h !== undefined)
    updateData.horarioAtendimento24h = data.horarioAtendimento24h;
  if (data.status !== undefined) updateData.status = data.status;

  const [updated] = await db
    .update(seguradorasParceiras)
    .set(updateData)
    .where(eq(seguradorasParceiras.id, id))
    .returning();
  return updated;
}

export async function countProdutosVinculados(id: string) {
  const [result] = await db
    .select({ count: count() })
    .from(produtos)
    .where(and(eq(produtos.seguradoraParceiraId, id), isNull(produtos.deletedAt)));
  return Number(result?.count || 0);
}

export async function softDelete(id: string) {
  await db
    .update(seguradorasParceiras)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(seguradorasParceiras.id, id));
}
