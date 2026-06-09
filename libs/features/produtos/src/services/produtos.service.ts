import { NotFoundError, ConflictError } from '@ecotech/shared/utils';
import * as repo from '../repositories/produtos.repository';
import type { CreateProdutoInput, UpdateProdutoInput } from '../schemas';

export async function getTiposSeguro(corretoraId: string) {
  return repo.listTiposSeguro(corretoraId);
}

export async function criar(corretoraId: string, data: CreateProdutoInput) {
  const existing = await repo.findByNome(corretoraId, data.nomeProduto);
  if (existing) throw new ConflictError('Já existe um produto com este nome');
  return repo.create(corretoraId, data);
}

export async function listar(
  corretoraId: string,
  opts: {
    pagina: number;
    porPagina: number;
    tipoSeguro?: string;
    ativo?: string;
    busca?: string;
  },
) {
  const { items, total } = await repo.list(corretoraId, opts);
  const totalPaginas = Math.ceil(total / opts.porPagina);
  return { data: items, total, pagina: opts.pagina, porPagina: opts.porPagina, totalPaginas };
}

export async function buscar(corretoraId: string, id: string) {
  const produto = await repo.findById(corretoraId, id);
  if (!produto) throw new NotFoundError('Produto');
  return produto;
}

export async function atualizar(
  corretoraId: string,
  id: string,
  data: UpdateProdutoInput,
) {
  const produto = await repo.findById(corretoraId, id);
  if (!produto) throw new NotFoundError('Produto');

  if (data.nomeProduto && data.nomeProduto !== produto.nomeProduto) {
    const existing = await repo.findByNome(corretoraId, data.nomeProduto);
    if (existing) throw new ConflictError('Já existe um produto com este nome');
  }

  return repo.update(id, data);
}

export async function excluir(corretoraId: string, id: string) {
  const produto = await repo.findById(corretoraId, id);
  if (!produto) throw new NotFoundError('Produto');
  await repo.softDelete(id);
}
