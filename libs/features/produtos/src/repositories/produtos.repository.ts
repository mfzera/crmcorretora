import { db } from '@ecotech/shared/database';
import { produtos } from '@ecotech/shared/database';
import { eq, and, isNull, count } from 'drizzle-orm';
import type { CreateProdutoInput, UpdateProdutoInput } from '../schemas';

export async function listTiposSeguro(corretoraId: string) {
  const rows = await db
    .selectDistinct({ tipoSeguro: produtos.tipoSeguro })
    .from(produtos)
    .where(
      and(
        eq(produtos.corretoraId, corretoraId),
        eq(produtos.ativo, true),
        isNull(produtos.deletedAt),
      ),
    )
    .orderBy(produtos.tipoSeguro);
  return rows.map((r) => r.tipoSeguro).filter(Boolean);
}

export async function findByNome(corretoraId: string, nomeProduto: string) {
  return db.query.produtos.findFirst({
    where: and(
      eq(produtos.corretoraId, corretoraId),
      eq(produtos.nomeProduto, nomeProduto),
      isNull(produtos.deletedAt),
    ),
  });
}

export async function create(
  corretoraId: string,
  data: CreateProdutoInput,
) {
  const [produto] = await db
    .insert(produtos)
    .values({
      corretoraId,
      nomeProduto: data.nomeProduto,
      descricao: data.descricao,
      tipoSeguro: data.tipoSeguro,
      premioMinimo: data.premioMinimo?.toString(),
      premioMaximo: data.premioMaximo?.toString(),
      percentualComissaoPadrao: data.percentualComissaoPadrao?.toString(),
      ativo: true,
    })
    .returning();
  return produto;
}

export async function list(
  corretoraId: string,
  opts: {
    pagina: number;
    porPagina: number;
    tipoSeguro?: string;
    ativo?: string;
    busca?: string;
  },
) {
  const { pagina, porPagina, tipoSeguro, ativo, busca } = opts;
  const offset = (pagina - 1) * porPagina;

  const conditions = [
    eq(produtos.corretoraId, corretoraId),
    isNull(produtos.deletedAt),
  ] as ReturnType<typeof eq>[];

  if (tipoSeguro) conditions.push(eq(produtos.tipoSeguro, tipoSeguro));
  if (ativo !== undefined) conditions.push(eq(produtos.ativo, ativo === 'true'));

  const [countResult] = await db
    .select({ count: count() })
    .from(produtos)
    .where(and(...conditions));

  const total = Number(countResult?.count || 0);

  let items = await db.query.produtos.findMany({
    where: and(...conditions),
    orderBy: (p, { asc }) => [asc(p.nomeProduto)],
    limit: porPagina,
    offset,
  });

  if (busca) {
    const term = busca.toLowerCase();
    items = items.filter((p) => p.nomeProduto.toLowerCase().includes(term));
  }

  return { items, total };
}

export async function findById(corretoraId: string, id: string) {
  return db.query.produtos.findFirst({
    where: and(
      eq(produtos.id, id),
      eq(produtos.corretoraId, corretoraId),
      isNull(produtos.deletedAt),
    ),
  });
}

export async function update(id: string, data: UpdateProdutoInput) {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (data.nomeProduto !== undefined) updateData.nomeProduto = data.nomeProduto;
  if (data.descricao !== undefined) updateData.descricao = data.descricao;
  if (data.tipoSeguro !== undefined) updateData.tipoSeguro = data.tipoSeguro;
  if (data.premioMinimo !== undefined)
    updateData.premioMinimo = data.premioMinimo?.toString() ?? null;
  if (data.premioMaximo !== undefined)
    updateData.premioMaximo = data.premioMaximo?.toString() ?? null;
  if (data.percentualComissaoPadrao !== undefined)
    updateData.percentualComissaoPadrao =
      data.percentualComissaoPadrao?.toString() ?? null;
  if (data.ativo !== undefined) updateData.ativo = data.ativo;

  const [updated] = await db
    .update(produtos)
    .set(updateData)
    .where(eq(produtos.id, id))
    .returning();
  return updated;
}

export async function softDelete(id: string) {
  await db
    .update(produtos)
    .set({ deletedAt: new Date(), ativo: false, updatedAt: new Date() })
    .where(eq(produtos.id, id));
}
