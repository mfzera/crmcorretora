/**
 * Cross-schema relation definitions.
 *
 * Relations that reference multiple schemas are centralized here to avoid
 * circular imports. This file is exported last in index.ts.
 */
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { planos } from './plano';
import { usuarios } from './usuario';
import { cargos } from './cargo';
import { equipes } from './equipe';
import { usuarioSubvendedores } from './usuario-subvendedor';

export const equipesRelations = relations(equipes, ({ one, many }) => ({
  corretora: one(corretoras, {
    fields: [equipes.corretoraId],
    references: [corretoras.id],
  }),
  membros: many(usuarios),
}));

export const corretorasRelations = relations(corretoras, ({ one, many }) => ({
  plano: one(planos, {
    fields: [corretoras.planoId],
    references: [planos.id],
  }),
  usuarios: many(usuarios, { relationName: 'usuarioCorretora' }),
  usuariosCorretoraAtiva: many(usuarios, {
    relationName: 'usuarioCorretoraAtiva',
  }),
}));

export const usuariosRelations = relations(usuarios, ({ one, many }) => ({
  corretora: one(corretoras, {
    fields: [usuarios.corretoraId],
    references: [corretoras.id],
    relationName: 'usuarioCorretora',
  }),
  corretoraAtiva: one(corretoras, {
    fields: [usuarios.corretoraAtivaId],
    references: [corretoras.id],
    relationName: 'usuarioCorretoraAtiva',
  }),
  cargo: one(cargos, {
    fields: [usuarios.cargoId],
    references: [cargos.id],
  }),
  equipe: one(equipes, {
    fields: [usuarios.equipeId],
    references: [equipes.id],
  }),
  gestor: one(usuarios, {
    fields: [usuarios.gestorId],
    references: [usuarios.id],
    relationName: 'gestorSubordinados',
  }),
  subordinados: many(usuarios, { relationName: 'gestorSubordinados' }),
  subvendedores: many(usuarioSubvendedores, { relationName: 'vendedorPrincipalSubvendedores' }),
  vinculosComoSub: many(usuarioSubvendedores, { relationName: 'subvendedorVinculos' }),
}));

export const usuarioSubvendedoresRelations = relations(usuarioSubvendedores, ({ one }) => ({
  vendedorPrincipal: one(usuarios, {
    fields: [usuarioSubvendedores.vendedorPrincipalId],
    references: [usuarios.id],
    relationName: 'vendedorPrincipalSubvendedores',
  }),
  subvendedor: one(usuarios, {
    fields: [usuarioSubvendedores.subvendedorId],
    references: [usuarios.id],
    relationName: 'subvendedorVinculos',
  }),
  criadoPor: one(usuarios, {
    fields: [usuarioSubvendedores.criadoPorId],
    references: [usuarios.id],
  }),
}));
