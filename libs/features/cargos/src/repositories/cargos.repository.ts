import { db } from '@ecotech/shared/database';
import {
  cargos,
  cargoPermissoes,
  permissoesGlobais,
  usuarios,
  cargoTemplates,
  cargoTemplatePermissoes,
} from '@ecotech/shared/database';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import type { CreateCargoInput, UpdateCargoInput } from '../schemas';

export async function findCargoByNome(corretoraId: string, nomeCargo: string) {
  return db.query.cargos.findFirst({
    where: and(
      eq(cargos.corretoraId, corretoraId),
      eq(cargos.nomeCargo, nomeCargo),
      isNull(cargos.deletedAt),
    ),
  });
}

export async function createCargo(corretoraId: string, data: CreateCargoInput) {
  const [cargo] = await db
    .insert(cargos)
    .values({
      corretoraId,
      nomeCargo: data.nomeCargo,
      descricao: data.descricao,
      cor: data.cor,
      isAdmin: false,
      isGestor: data.isGestor,
      isVendedor: data.isVendedor,
    })
    .returning();
  return cargo;
}

export async function listCargos(corretoraId: string) {
  return db.query.cargos.findMany({
    where: and(eq(cargos.corretoraId, corretoraId), isNull(cargos.deletedAt)),
    orderBy: (c, { asc }) => [asc(c.nomeCargo)],
  });
}

export async function findCargoById(corretoraId: string, id: string) {
  return db.query.cargos.findFirst({
    where: and(
      eq(cargos.id, id),
      eq(cargos.corretoraId, corretoraId),
      isNull(cargos.deletedAt),
    ),
  });
}

export async function getCargoPermissoes(cargoId: string) {
  return db
    .select({
      id: permissoesGlobais.id,
      nomePermissao: permissoesGlobais.nomePermissao,
      descricao: permissoesGlobais.descricao,
      grupo: permissoesGlobais.grupo,
    })
    .from(cargoPermissoes)
    .innerJoin(
      permissoesGlobais,
      eq(cargoPermissoes.permissaoGlobalId, permissoesGlobais.id),
    )
    .where(eq(cargoPermissoes.cargoId, cargoId));
}

export async function updateCargoCor(id: string, cor: string) {
  const [updated] = await db
    .update(cargos)
    .set({ cor, updatedAt: new Date() })
    .where(eq(cargos.id, id))
    .returning();
  return updated;
}

export async function updateCargo(id: string, data: UpdateCargoInput) {
  const [updated] = await db
    .update(cargos)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(cargos.id, id))
    .returning();
  return updated;
}

export async function softDeleteCargo(id: string) {
  await db
    .update(cargos)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(cargos.id, id));
}

export async function listUsuariosByCargo(corretoraId: string, cargoId: string) {
  return db.query.usuarios.findMany({
    where: and(
      eq(usuarios.cargoId, cargoId),
      eq(usuarios.corretoraId, corretoraId),
      isNull(usuarios.deletedAt),
    ),
    columns: { nome: true, email: true },
  });
}

export async function setCargoPermissoes(cargoId: string, permissaoIds: string[]) {
  await db.transaction(async (tx) => {
    await tx.delete(cargoPermissoes).where(eq(cargoPermissoes.cargoId, cargoId));
    if (permissaoIds.length > 0) {
      await tx.insert(cargoPermissoes).values(
        permissaoIds.map((permissaoId) => ({ cargoId, permissaoGlobalId: permissaoId })),
      );
    }
  });
}

export async function removeCargoPermissao(cargoId: string, permissaoId: string) {
  await db
    .delete(cargoPermissoes)
    .where(
      and(
        eq(cargoPermissoes.cargoId, cargoId),
        eq(cargoPermissoes.permissaoGlobalId, permissaoId),
      ),
    );
}

export async function listPermissoesGlobais() {
  return db.query.permissoesGlobais.findMany({
    orderBy: (p, { asc }) => [asc(p.grupo), asc(p.nomePermissao)],
  });
}

export async function validatePermissaoIds(ids: string[]) {
  return db.query.permissoesGlobais.findMany({
    where: inArray(permissoesGlobais.id, ids),
  });
}

export async function listTemplates() {
  const templates = await db.query.cargoTemplates.findMany({
    where: eq(cargoTemplates.ativo, true),
    orderBy: (t, { asc }) => [asc(t.ordem), asc(t.nomeTemplate)],
  });

  return Promise.all(
    templates.map(async (template) => {
      const permissoes = await db
        .select()
        .from(cargoTemplatePermissoes)
        .where(eq(cargoTemplatePermissoes.templateId, template.id));
      return { ...template, totalPermissoes: permissoes.length };
    }),
  );
}

export async function findTemplate(templateId: string) {
  return db.query.cargoTemplates.findFirst({
    where: and(
      eq(cargoTemplates.id, templateId),
      eq(cargoTemplates.ativo, true),
    ),
  });
}

export async function getTemplatePermissoes(templateId: string) {
  return db
    .select({
      id: permissoesGlobais.id,
      nomePermissao: permissoesGlobais.nomePermissao,
      descricao: permissoesGlobais.descricao,
      grupo: permissoesGlobais.grupo,
    })
    .from(cargoTemplatePermissoes)
    .innerJoin(
      permissoesGlobais,
      eq(cargoTemplatePermissoes.permissaoGlobalId, permissoesGlobais.id),
    )
    .where(eq(cargoTemplatePermissoes.templateId, templateId));
}

export async function getTemplatePermissaoIds(templateId: string) {
  return db
    .select({ permissaoGlobalId: cargoTemplatePermissoes.permissaoGlobalId })
    .from(cargoTemplatePermissoes)
    .where(eq(cargoTemplatePermissoes.templateId, templateId));
}

export async function createCargoFromTemplate(
  corretoraId: string,
  nomeCargo: string,
  descricao: string | undefined,
  cor: string | undefined,
  template: typeof cargoTemplates.$inferSelect,
  permissaoIds: string[],
) {
  return db.transaction(async (tx) => {
    const [newCargo] = await tx
      .insert(cargos)
      .values({
        corretoraId,
        nomeCargo,
        descricao: descricao || template.descricao,
        cor: cor || template.cor,
        isAdmin: false,
        isGestor: template.isGestor,
        isVendedor: template.isVendedor,
      })
      .returning();

    if (permissaoIds.length > 0) {
      await tx.insert(cargoPermissoes).values(
        permissaoIds.map((permissaoGlobalId) => ({
          cargoId: newCargo.id,
          permissaoGlobalId,
        })),
      );
    }

    return newCargo;
  });
}

export async function duplicateCargo(
  corretoraId: string,
  nomeCargo: string,
  descricao: string | undefined,
  cor: string | undefined,
  original: typeof cargos.$inferSelect,
  permissaoIds: string[],
) {
  return db.transaction(async (tx) => {
    const [newCargo] = await tx
      .insert(cargos)
      .values({
        corretoraId,
        nomeCargo,
        descricao: descricao || original.descricao,
        cor: cor || original.cor,
        isAdmin: false,
        isGestor: original.isGestor,
        isVendedor: original.isVendedor,
      })
      .returning();

    if (permissaoIds.length > 0) {
      await tx.insert(cargoPermissoes).values(
        permissaoIds.map((permissaoGlobalId) => ({
          cargoId: newCargo.id,
          permissaoGlobalId,
        })),
      );
    }

    return newCargo;
  });
}
