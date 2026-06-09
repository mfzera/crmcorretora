import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '@ecotech/shared/utils';
import * as repo from '../repositories/cargos.repository';
import type { CreateCargoInput, UpdateCargoInput } from '../schemas';

export async function getPermissoesDisponiveis() {
  const permissoes = await repo.listPermissoesGlobais();
  return permissoes.reduce(
    (acc, p) => {
      const grupo = p.grupo || 'outros';
      if (!acc[grupo]) acc[grupo] = [];
      acc[grupo].push({
        id: p.id,
        nomePermissao: p.nomePermissao,
        descricao: p.descricao,
        grupo: p.grupo,
      });
      return acc;
    },
    {} as Record<
      string,
      Array<{ id: string; nomePermissao: string; descricao: string | null; grupo: string | null }>
    >,
  );
}

export async function criar(corretoraId: string, data: CreateCargoInput) {
  const existing = await repo.findCargoByNome(corretoraId, data.nomeCargo);
  if (existing) throw new ConflictError('Já existe um cargo com este nome');

  try {
    return await repo.createCargo(corretoraId, data);
  } catch (err: any) {
    if (err?.cause?.code === '23505' || err?.message?.includes('unq_corretora_cargo')) {
      throw new ConflictError('Já existe um cargo com este nome');
    }
    throw err;
  }
}

export async function listar(corretoraId: string) {
  return repo.listCargos(corretoraId);
}

export async function buscar(corretoraId: string, id: string) {
  const cargo = await repo.findCargoById(corretoraId, id);
  if (!cargo) throw new NotFoundError('Cargo');
  const permissoes = await repo.getCargoPermissoes(id);
  return { ...cargo, permissoes };
}

export async function atualizarCor(corretoraId: string, id: string, cor: string) {
  const cargo = await repo.findCargoById(corretoraId, id);
  if (!cargo) throw new NotFoundError('Cargo');
  return repo.updateCargoCor(id, cor);
}

export async function atualizar(
  corretoraId: string,
  id: string,
  data: UpdateCargoInput,
) {
  const cargo = await repo.findCargoById(corretoraId, id);
  if (!cargo) throw new NotFoundError('Cargo');

  if (cargo.isAdmin)
    throw new ValidationError(
      'Não é possível editar o cargo de Administrador. Use o endpoint /cor para alterar apenas a cor.',
    );

  if (data.nomeCargo && data.nomeCargo !== cargo.nomeCargo) {
    const existing = await repo.findCargoByNome(corretoraId, data.nomeCargo);
    if (existing) throw new ConflictError('Já existe um cargo com este nome');
  }

  return repo.updateCargo(id, data);
}

export async function excluir(corretoraId: string, id: string) {
  const cargo = await repo.findCargoById(corretoraId, id);
  if (!cargo) throw new NotFoundError('Cargo');

  if (cargo.isAdmin)
    throw new ValidationError('Não é possível excluir o cargo de Administrador');

  const usersWithRole = await repo.listUsuariosByCargo(corretoraId, id);
  if (usersWithRole.length > 0) {
    throw new ValidationError(
      'Não é possível excluir um cargo que possui usuários vinculados',
      { usuarios: usersWithRole.map((u) => ({ nome: u.nome, email: u.email })) },
    );
  }

  await repo.softDeleteCargo(id);
}

export async function atribuirPermissoes(
  corretoraId: string,
  id: string,
  permissaoIds: string[],
) {
  const cargo = await repo.findCargoById(corretoraId, id);
  if (!cargo) throw new NotFoundError('Cargo');

  if (cargo.isAdmin)
    throw new ValidationError('O cargo de Administrador já possui todas as permissões');

  if (permissaoIds.length > 0) {
    const valid = await repo.validatePermissaoIds(permissaoIds);
    if (valid.length !== permissaoIds.length)
      throw new ValidationError('Uma ou mais permissões são inválidas');
  }

  await repo.setCargoPermissoes(id, permissaoIds);
}

export async function removerPermissao(
  corretoraId: string,
  id: string,
  permissaoId: string,
) {
  const cargo = await repo.findCargoById(corretoraId, id);
  if (!cargo) throw new NotFoundError('Cargo');

  if (cargo.isAdmin)
    throw new ValidationError(
      'Não é possível remover permissões do cargo de Administrador',
    );

  await repo.removeCargoPermissao(id, permissaoId);
}

export async function listTemplates() {
  return repo.listTemplates();
}

export async function getTemplate(templateId: string) {
  const template = await repo.findTemplate(templateId);
  if (!template) throw new NotFoundError('Template de cargo');
  const permissoes = await repo.getTemplatePermissoes(templateId);
  return { ...template, permissoes };
}

export async function criarDeTemplate(
  corretoraId: string,
  templateId: string,
  nomeCargo: string,
  descricao?: string,
  cor?: string,
) {
  const template = await repo.findTemplate(templateId);
  if (!template) throw new NotFoundError('Template de cargo');

  const existing = await repo.findCargoByNome(corretoraId, nomeCargo);
  if (existing) throw new ConflictError('Já existe um cargo com este nome');

  const templatePermissoes = await repo.getTemplatePermissaoIds(templateId);
  const permissaoIds = templatePermissoes.map((tp) => tp.permissaoGlobalId);

  const cargo = await repo.createCargoFromTemplate(
    corretoraId,
    nomeCargo,
    descricao,
    cor,
    template,
    permissaoIds,
  );

  return { cargo, totalPermissoes: permissaoIds.length };
}

export async function duplicar(
  corretoraId: string,
  id: string,
  nomeCargo: string,
  descricao?: string,
  cor?: string,
) {
  const original = await repo.findCargoById(corretoraId, id);
  if (!original) throw new NotFoundError('Cargo');

  if (original.isAdmin)
    throw new ValidationError('Não é possível duplicar o cargo de Administrador');

  const existing = await repo.findCargoByNome(corretoraId, nomeCargo);
  if (existing) throw new ConflictError('Já existe um cargo com este nome');

  // getCargoPermissoes returns { id } from permissoesGlobais which is permissaoGlobalId
  const originalPermissoes = await repo.getCargoPermissoes(id);
  const permissaoIds = originalPermissoes.map((p) => p.id);

  const cargo = await repo.duplicateCargo(
    corretoraId,
    nomeCargo,
    descricao,
    cor,
    original,
    permissaoIds,
  );

  return { cargo, totalPermissoes: permissaoIds.length };
}
