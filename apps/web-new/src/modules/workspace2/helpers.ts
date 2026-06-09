import type { RenovacaoPlanilha, Cotacao, RenovacaoPendente, EtapaCotacao } from '@/types/area-trabalho';
import type { SituacaoLabel, WorkspaceRow } from './types';
import { calculateDaysUntil, todayLocalISODate, dayjs } from '@/core/utils/date-utils';

export function fmt(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function fmtDate(v: string | null | undefined): string {
  if (!v) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(v.length === 10 ? v + 'T00:00:00' : v));
  } catch {
    return '—';
  }
}

export function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toFixed(1)}%`;
}

export function primeiroDiaMes(): string {
  return dayjs().startOf('month').format('YYYY-MM-DD');
}

export function ultimoDiaMes(): string {
  return dayjs().endOf('month').format('YYYY-MM-DD');
}

export function isRenovacaoExcluida(r: RenovacaoPlanilha): boolean {
  if (r.deletedAt) return true;
  return r.status === 'CANCELADO' && (r.motivoCancelamento?.startsWith('__EXCLUIDO__|') ?? false);
}

export function parseDeletedByFromRenovacao(r: RenovacaoPlanilha): { byNome: string | null; at: string | null } {
  if (!isRenovacaoExcluida(r)) return { byNome: null, at: null };
  if (r.deletedAt) return { byNome: r.deletedByNome ?? null, at: r.deletedAt };
  const parts = (r.motivoCancelamento ?? '').split('|');
  return {
    byNome: parts[2] ?? null,
    at: r.dataCancelamento ?? null,
  };
}

export function situacaoFromRenovacao(r: RenovacaoPlanilha): SituacaoLabel {
  if (isRenovacaoExcluida(r)) return 'Excluído';
  switch (r.status) {
    case 'NAO_TRABALHADO': {
      const hoje = todayLocalISODate();
      return r.dataVencimento && r.dataVencimento < hoje ? 'Vencida' : 'Renovar';
    }
    case 'EM_PROSPECCAO':     return 'Iniciado';
    case 'EM_NEGOCIACAO': {
      const docStatus = r.documentoVendaNovo?.status;
      if (docStatus === 'AGUARDANDO_CADASTRO' || docStatus === 'AGUARDANDO_APROVACAO') return 'Aguardando Cadastro';
      if (docStatus === 'CANCELADO') return 'Cancelado';
      return 'Cotação Enviada';
    }
    case 'AGUARDANDO_CLIENTE':return 'Aguardando Retorno';
    case 'RENOVADO':
      if (r.documentoVendaNovo?.status === 'AGUARDANDO_CADASTRO') return 'Aguardando Cadastro';
      return 'Convertido';
    case 'PERDIDO':           return 'Perdido';
    case 'CANCELADO':         return 'Cancelado';
    default:                  return 'Renovar';
  }
}

export function situacaoFromCotacao(c: Cotacao): SituacaoLabel {
  if (c.deletedAt) return 'Excluído';
  if (c.isFechado) return 'Fechado';
  if (c.documentoVenda?.status === 'AGUARDANDO_CADASTRO' || c.documentoVendaStatusDoc === 'AGUARDANDO_CADASTRO') return 'Aguardando Cadastro';
  if (c.status === 'CONVERTIDA') return 'Convertido';
  if (c.status === 'PERDIDA')    return 'Perdido';
  if (c.status === 'EXPIRADA')   return 'Cancelado';
  if (c.dataRejeicaoCadastroDoc) return 'Reprovada';
  if (!c.etapa || c.etapa === 'LEVANTANDO_DADOS') return 'Iniciado';
  if (c.etapa === 'PROPOSTA_ENVIADA' || c.etapa === 'EM_NEGOCIACAO') return 'Cotação Enviada';
  if (c.etapa === 'AGUARDANDO_RETORNO') return 'Aguardando Retorno';
  return 'Iniciado';
}

export function rowFromRenovacao(r: RenovacaoPlanilha): WorkspaceRow {
  const doc = r.documentoVendaAnterior;
  const docNovo = r.documentoVendaNovo;
  const cliente = doc?.cliente ?? r.cliente;
  const { byNome, at } = parseDeletedByFromRenovacao(r);
  const excluido = isRenovacaoExcluida(r);
  return {
    id: r.id,
    rowType: 'renovacao',
    clienteNome: (cliente?.tipoPessoa === 'PF' ? cliente?.nome : cliente?.razaoSocial) ?? '—',
    clienteTipo: cliente?.tipoPessoa ?? 'PF',
    vigenciaInicio: r.novaVigenciaInicio ?? doc?.vigenciaInicio ?? null,
    vigenciaFim: r.novaVigenciaFim ?? r.dataVencimento ?? doc?.vigenciaFim ?? null,
    produto: doc?.produto?.nomeProduto ?? r.produtoDescricao ?? r.itemDescricao ?? '—',
    produtoId: doc?.produto?.id ?? null,
    vendedorNome: r.vendedor?.nome ?? null,
    vendedorAvatar: r.vendedor?.avatarUrl ?? null,
    vendedorId: r.vendedor?.id ?? null,
    vendedorSecundarioId: null,
    vendedorSecundarioNome: null,
    vendedorSecundarioAvatar: null,
    seguradora: doc?.seguradoraParceira?.nomeFantasia ?? doc?.seguradoraParceira?.razaoSocial ?? r.seguradoraAnterior ?? null,
    seguradoraId: doc?.seguradoraParceira?.id ?? null,
    plAtual: doc?.premioLiquido ? parseFloat(doc.premioLiquido) : null,
    comissaoPct: docNovo?.percentualComissao ? parseFloat(docNovo.percentualComissao) : doc?.percentualComissao ? parseFloat(doc.percentualComissao) : r.percentualComissaoNovo ? parseFloat(r.percentualComissaoNovo) : null,
    receita: r.valorComissaoNovo ? parseFloat(r.valorComissaoNovo) : docNovo?.valorComissao ? parseFloat(docNovo.valorComissao) : null,
    situacao: situacaoFromRenovacao(r),
    comentariosCount: 0,
    anexosCount: 0,
    tags: [],
    isDeleted: excluido,
    deletedAt: at,
    deletedByNome: byNome,
    renovacaoId: r.id,
    _renovacao: r,
  };
}

export function rowFromCotacao(c: Cotacao): WorkspaceRow {
  const deletedAt = c.deletedAt ?? null;
  return {
    id: c.id,
    rowType: 'cotacao',
    clienteNome: (c.cliente?.tipoPessoa === 'PF' ? c.cliente?.nome : c.cliente?.razaoSocial) ?? '—',
    clienteTipo: c.cliente?.tipoPessoa ?? 'PF',
    vigenciaInicio: c.vigenciaInicio ?? null,
    vigenciaFim: c.vigenciaFim ?? null,
    produto: c.produto?.nomeProduto ?? '—',
    produtoId: c.produto?.id ?? null,
    vendedorNome: c.vendedor?.nome ?? null,
    vendedorAvatar: c.vendedor?.avatarUrl ?? null,
    vendedorId: c.vendedorId ?? c.vendedor?.id ?? null,
    vendedorSecundarioId: c.vendedorSecundarioId ?? null,
    vendedorSecundarioNome: c.vendedorSecundario?.nome ?? null,
    vendedorSecundarioAvatar: c.vendedorSecundario?.avatarUrl ?? null,
    seguradora: c.seguradoraParceira?.nomeFantasia ?? c.seguradoraParceira?.razaoSocial ?? null,
    seguradoraId: c.seguradoraParceira?.id ?? null,
    plAtual: c.premioLiquido ?? null,
    comissaoPct: c.percentualComissao ?? null,
    receita: c.valorComissao ?? null,
    situacao: situacaoFromCotacao(c),
    comentariosCount: c.comentariosCount ?? 0,
    anexosCount: c.anexosCount ?? 0,
    ultimoComentario: c.ultimoComentario ?? null,
    tags: c.tags ?? [],
    isDeleted: !!deletedAt,
    deletedAt,
    deletedByNome: c.deletedByNome ?? null,
    cotacaoId: c.id,
    _cotacao: c,
  };
}

export const SITUACOES_RENOVACAO_EDITAVEIS = new Set<SituacaoLabel>(['Iniciado', 'Cotação Enviada', 'Aguardando Retorno', 'Fechado']);
export const SITUACOES_BLOQUEADAS = new Set<SituacaoLabel>(['Renovar', 'Vencida', 'Aguardando Cadastro', 'Convertido', 'Perdido', 'Cancelado', 'Excluído', 'Reprovada']);

export function situacaoToEtapa(s: SituacaoLabel): EtapaCotacao | null {
  switch (s) {
    case 'Iniciado':            return 'LEVANTANDO_DADOS';
    case 'Cotação Enviada':    return 'PROPOSTA_ENVIADA';
    case 'Aguardando Retorno':  return 'AGUARDANDO_RETORNO';
    default:                    return null;
  }
}

export function situacaoToRenovacaoStatus(s: SituacaoLabel): string | null {
  switch (s) {
    case 'Cotação Enviada':    return 'EM_NEGOCIACAO';
    case 'Aguardando Retorno':  return 'AGUARDANDO_CLIENTE';
    default:                    return null;
  }
}

export function renovacaoPlanilhaParaPendente(
  r: RenovacaoPlanilha,
  status: RenovacaoPendente['status'],
): RenovacaoPendente {
  const c = r.documentoVendaAnterior?.cliente ?? r.cliente;
  const doc = r.documentoVendaAnterior;
  return {
    id: r.id,
    documentoVendaId: r.documentoVendaAnteriorId,
    cliente: {
      id: c?.id ?? '',
      tipoPessoa: c?.tipoPessoa ?? 'PF',
      nome: c?.nome ?? undefined,
      razaoSocial: c?.razaoSocial ?? undefined,
      cpf: c?.cpf ?? undefined,
      cnpj: c?.cnpj ?? undefined,
      email: c?.email ?? undefined,
      telefone: c?.telefone ?? undefined,
      celular: c?.celular ?? undefined,
      ativo: true,
    },
    produto: doc?.produto
      ? { id: doc.produto.id, nomeProduto: doc.produto.nomeProduto, tipoSeguro: null, ativo: true }
      : { id: null, nomeProduto: r.produtoDescricao ?? r.itemDescricao ?? '', tipoSeguro: null, ativo: true },
    numeroApolice: doc?.numeroApoliceExterna ?? null,
    vigenciaFim: r.dataVencimento,
    premioAtual: doc?.premioLiquido ? parseFloat(doc.premioLiquido) : null,
    diasParaVencimento: r.dataVencimento
      ? calculateDaysUntil(r.dataVencimento)
      : 0,
    prioridade: 'MEDIA',
    status,
    statusOriginal: r.status,
    vendedorId: r.vendedor?.id ?? '',
    vendedor: r.vendedor ? { id: r.vendedor.id, nome: r.vendedor.nome, email: '' } : null,
    percentualComissaoAnterior: doc?.percentualComissao ? parseFloat(doc.percentualComissao) : null,
    valorComissaoAnterior: doc?.valorComissao ? parseFloat(doc.valorComissao) : null,
    seguradoraParceira: doc?.seguradoraParceira ?? null,
  };
}
