import { NotFoundError, ConflictError } from '@ecotech/shared/utils';
import * as repo from '../repositories/seguradoras-parceiras.repository';
import type {
  CreateSeguradoraParceiraInput,
  UpdateSeguradoraParceiraInput,
  ListSeguradorasParceiraQuery,
} from '../schemas';

export async function criar(corretoraId: string, data: CreateSeguradoraParceiraInput) {
  const existing = await repo.findByCnpj(corretoraId, data.cnpj);
  if (existing) throw new ConflictError('CNPJ já cadastrado');
  return repo.create(corretoraId, data);
}

export async function listarParaSelect(corretoraId: string) {
  return repo.listForSelect(corretoraId);
}

export async function listar(corretoraId: string, query: ListSeguradorasParceiraQuery) {
  const { items, total } = await repo.list(corretoraId, query);
  const totalPages = Math.ceil(total / query.limit);
  return {
    data: items,
    pagination: { page: query.page, limit: query.limit, total, totalPages },
  };
}

export async function buscar(corretoraId: string, id: string) {
  const seguradora = await repo.findById(corretoraId, id);
  if (!seguradora) throw new NotFoundError('Seguradora parceira');
  return seguradora;
}

export async function atualizar(
  corretoraId: string,
  id: string,
  data: UpdateSeguradoraParceiraInput,
) {
  const seguradora = await repo.findById(corretoraId, id);
  if (!seguradora) throw new NotFoundError('Seguradora parceira');

  if (data.cnpj && data.cnpj !== seguradora.cnpj) {
    const existing = await repo.findByCnpj(corretoraId, data.cnpj);
    if (existing) throw new ConflictError('CNPJ já cadastrado');
  }

  return repo.update(id, data);
}

export async function excluir(corretoraId: string, id: string) {
  const seguradora = await repo.findById(corretoraId, id);
  if (!seguradora) throw new NotFoundError('Seguradora parceira');

  const count = await repo.countProdutosVinculados(id);
  if (count > 0)
    throw new ConflictError('Não é possível excluir seguradora com produtos vinculados');

  await repo.softDelete(id);
}
