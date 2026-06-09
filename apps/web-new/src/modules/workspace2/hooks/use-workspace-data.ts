import { useMemo } from 'react';
import {
  usePlanilhaRenovacoes,
  useCotacoesAtivas,
  useCotacoesFinalizadas,
  useCotacoesArquivadas,
  useRenovacoesPendentes,
  useRenovacoesVencidas,
  useCotacaoTags,
  useEquipeWorkspace,
} from '@/modules/area-trabalho/http';
import { useVendedores as useUsuariosVendedores } from '@/modules/usuarios/http';
import { useProdutos } from '@/modules/produtos/http';
import { useSeguradorasParceiras } from '@/modules/seguradoras-parceiras/http';
import type {
  RenovacaoPlanilha,
  RenovacaoPendente,
  Cotacao,
} from '@/types/area-trabalho';
import { rowFromRenovacao, rowFromCotacao } from '../helpers';
import type { SelectOption, SituacaoLabel, WorkspaceRow } from '../types';

interface UseWorkspaceDataParams {
  filtros: { vigenciaInicio: string; vigenciaFim: string };
  situacaoFilter: SituacaoLabel[];
  tagFilter: string[];
  vendedorFilter: string[];
  produtoFilter: string[];
  seguradoraFilter: string[];
  showExcluidos: boolean;
  nameFilter: string;
}

export function useWorkspaceData({
  filtros,
  situacaoFilter,
  tagFilter,
  vendedorFilter,
  produtoFilter,
  seguradoraFilter,
  showExcluidos,
  nameFilter,
}: UseWorkspaceDataParams) {
  const { vigenciaInicio, vigenciaFim } = filtros;

  const { data: equipeData } = useEquipeWorkspace();
  const { data: renovacoes = [], isLoading: loadingRenovacoes } =
    usePlanilhaRenovacoes(filtros);
  const { data: cotacoesAtivas = [], isLoading: loadingCotacoes } =
    useCotacoesAtivas();
  const { data: cotacoesFinalizadas = [] } = useCotacoesFinalizadas();
  const { data: cotacoesArquivadas = [] } = useCotacoesArquivadas(true);
  const { data: renovacoesPendentes = [] } = useRenovacoesPendentes();
  const { data: renovacoesVencidas = [] } = useRenovacoesVencidas();
  const { data: cotacaoTags = [] } = useCotacaoTags();
  const { data: usuariosVendedores = [] } = useUsuariosVendedores();
  const { data: produtosRaw } = useProdutos({ ativo: true }, 1, 200);
  const { data: seguradorasRaw } = useSeguradorasParceiras({
    status: 'ATIVA',
    limit: 200,
  });

  const vendedoresOptions = useMemo<SelectOption[]>(
    () =>
      (usuariosVendedores as any[]).map((v) => ({
        id: v.id,
        label: v.nome,
        avatarUrl: v.avatarUrl ?? null,
      })),
    [usuariosVendedores],
  );

  const produtosOptions = useMemo<SelectOption[]>(
    () =>
      ((produtosRaw as any)?.data ?? []).map((p: any) => ({
        id: p.id,
        label: p.nomeProduto,
      })),
    [produtosRaw],
  );

  const seguradorasOptions = useMemo<SelectOption[]>(
    () =>
      ((seguradorasRaw as any)?.data ?? []).map((s: any) => ({
        id: s.id,
        label: s.nomeFantasia ?? s.razaoSocial,
      })),
    [seguradorasRaw],
  );

  // cotacoesAtivas last so they take priority over stale archived/finalized entries
  const todasCotacoes = useMemo(() => {
    const map = new Map<string, Cotacao>();
    for (const c of [
      ...(cotacoesArquivadas as Cotacao[]),
      ...(cotacoesFinalizadas as Cotacao[]),
      ...(cotacoesAtivas as Cotacao[]),
    ]) {
      const existing = map.get(c.id);
      if (!existing || c.updatedAt >= existing.updatedAt) {
        map.set(c.id, c);
      }
    }
    return Array.from(map.values());
  }, [cotacoesAtivas, cotacoesFinalizadas, cotacoesArquivadas]);

  const renovacaoToCotacaoId = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of todasCotacoes) {
      if (c.renovacaoId) m.set(c.renovacaoId, c.id);
    }
    return m;
  }, [todasCotacoes]);

  const cotacoesNovas = useMemo(
    () =>
      todasCotacoes.filter((c) => {
        if (c.situacao !== 'NOVO') return false;
        if (!c.vigenciaFim) return false;
        return c.vigenciaFim >= vigenciaInicio && c.vigenciaFim <= vigenciaFim;
      }),
    [todasCotacoes, vigenciaInicio, vigenciaFim],
  );

  const pendentesMap = useMemo(() => {
    const m = new Map<string, RenovacaoPendente>();
    for (const r of [
      ...(renovacoesPendentes as RenovacaoPendente[]),
      ...(renovacoesVencidas as RenovacaoPendente[]),
    ]) {
      m.set(r.id, r);
    }
    return m;
  }, [renovacoesPendentes, renovacoesVencidas]);

  const cotacoesNovosSeguro = useMemo(
    () =>
      todasCotacoes.filter((c) => {
        if (c.renovacaoId) return false;
        if (!c.vigenciaInicio) return false;
        return (
          c.vigenciaInicio >= vigenciaInicio && c.vigenciaInicio <= vigenciaFim
        );
      }),
    [todasCotacoes, vigenciaInicio, vigenciaFim],
  );

  const allRowsRen = useMemo<WorkspaceRow[]>(() => {
    const cotacaoById = new Map(todasCotacoes.map((c) => [c.id, c]));
    const renRows = (renovacoes as RenovacaoPlanilha[]).map((r) => {
      const row = rowFromRenovacao(r);
      const cotId = renovacaoToCotacaoId.get(r.id);
      if (cotId) {
        const cotacao = cotacaoById.get(cotId);
        row.cotacaoId = cotId;
        row._cotacao = cotacao;
        if (cotacao) {
          if (cotacao.seguradoraParceira) {
            row.seguradora =
              cotacao.seguradoraParceira.nomeFantasia ??
              cotacao.seguradoraParceira.razaoSocial ??
              row.seguradora;
            row.seguradoraId =
              cotacao.seguradoraParceira.id ?? row.seguradoraId;
          }
          if (cotacao.produto) {
            row.produto = cotacao.produto.nomeProduto ?? row.produto;
            row.produtoId = cotacao.produto.id ?? row.produtoId;
          }
          if (cotacao.vendedor) {
            row.vendedorNome = cotacao.vendedor.nome ?? row.vendedorNome;
            row.vendedorId =
              cotacao.vendedorId ?? cotacao.vendedor.id ?? row.vendedorId;
            row.vendedorAvatar =
              cotacao.vendedor.avatarUrl ?? row.vendedorAvatar;
          }
          row.vendedorSecundarioId = cotacao.vendedorSecundarioId ?? null;
          row.vendedorSecundarioNome = cotacao.vendedorSecundario?.nome ?? null;
          row.vendedorSecundarioAvatar =
            cotacao.vendedorSecundario?.avatarUrl ?? null;
          if (!r.novaVigenciaInicio && cotacao.vigenciaInicio != null)
            row.vigenciaInicio = cotacao.vigenciaInicio;
          if (!r.novaVigenciaFim && cotacao.vigenciaFim != null)
            row.vigenciaFim = cotacao.vigenciaFim;
          if (cotacao.premioLiquido != null)
            row.plAtual = cotacao.premioLiquido;
          if (cotacao.percentualComissao != null)
            row.comissaoPct = cotacao.percentualComissao;
          if (cotacao.valorComissao != null)
            row.receita = cotacao.valorComissao;
          if (cotacao.isFechado) row.situacao = 'Fechado';
          else if (
            cotacao.documentoVenda?.status === 'AGUARDANDO_CADASTRO' ||
            cotacao.documentoVendaStatusDoc === 'AGUARDANDO_CADASTRO'
          )
            row.situacao = 'Aguardando Cadastro';
          else if (
            (cotacao as any).status === 'CONVERTIDA' &&
            r.status !== 'RENOVADO'
          )
            row.situacao = 'Aguardando Cadastro';
          else if (cotacao.dataRejeicaoCadastroDoc) row.situacao = 'Reprovada';
          if (cotacao.tags?.length) row.tags = cotacao.tags;
          row.comentariosCount = (cotacao as any).comentariosCount ?? 0;
          row.anexosCount = (cotacao as any).anexosCount ?? 0;
          row.ultimoComentario = (cotacao as any).ultimoComentario ?? null;
        }
      }
      return row;
    });
    const cotRows = cotacoesNovas.map(rowFromCotacao);
    return [...renRows, ...cotRows];
  }, [renovacoes, cotacoesNovas, renovacaoToCotacaoId, todasCotacoes]);

  const rowsRen = useMemo(() => {
    let rows = allRowsRen;
    if (!showExcluidos) rows = rows.filter((r) => !r.isDeleted);
    if (situacaoFilter.length)
      rows = rows.filter((r) => situacaoFilter.includes(r.situacao));
    if (tagFilter.length)
      rows = rows.filter((r) => r.tags.some((t) => tagFilter.includes(t.id)));
    if (vendedorFilter.length)
      rows = rows.filter(
        (r) => r.vendedorId != null && vendedorFilter.includes(r.vendedorId),
      );
    if (produtoFilter.length)
      rows = rows.filter(
        (r) => r.produtoId != null && produtoFilter.includes(r.produtoId),
      );
    if (seguradoraFilter.length)
      rows = rows.filter(
        (r) =>
          r.seguradoraId != null && seguradoraFilter.includes(r.seguradoraId),
      );
    if (nameFilter.trim())
      rows = rows.filter((r) =>
        r.clienteNome.toLowerCase().includes(nameFilter.trim().toLowerCase()),
      );
    return rows;
  }, [
    allRowsRen,
    situacaoFilter,
    tagFilter,
    vendedorFilter,
    produtoFilter,
    seguradoraFilter,
    showExcluidos,
    nameFilter,
  ]);

  const allRowsNS = useMemo<WorkspaceRow[]>(
    () => cotacoesNovosSeguro.map(rowFromCotacao),
    [cotacoesNovosSeguro],
  );

  const rowsNS = useMemo(() => {
    let rows = allRowsNS;
    if (!showExcluidos) rows = rows.filter((r) => !r.isDeleted);
    if (situacaoFilter.length)
      rows = rows.filter((r) => situacaoFilter.includes(r.situacao));
    if (tagFilter.length)
      rows = rows.filter((r) => r.tags.some((t) => tagFilter.includes(t.id)));
    if (vendedorFilter.length)
      rows = rows.filter(
        (r) => r.vendedorId != null && vendedorFilter.includes(r.vendedorId),
      );
    if (nameFilter.trim())
      rows = rows.filter((r) =>
        r.clienteNome.toLowerCase().includes(nameFilter.trim().toLowerCase()),
      );
    if (produtoFilter.length)
      rows = rows.filter(
        (r) => r.produtoId != null && produtoFilter.includes(r.produtoId),
      );
    if (seguradoraFilter.length)
      rows = rows.filter(
        (r) =>
          r.seguradoraId != null && seguradoraFilter.includes(r.seguradoraId),
      );
    return rows;
  }, [
    allRowsNS,
    situacaoFilter,
    tagFilter,
    vendedorFilter,
    produtoFilter,
    seguradoraFilter,
    showExcluidos,
    nameFilter,
  ]);

  const vendedorFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of [...allRowsRen, ...allRowsNS]) {
      if (r.vendedorId && r.vendedorNome) map.set(r.vendedorId, r.vendedorNome);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
      .map(([id, label]) => ({ id, label }));
  }, [allRowsRen, allRowsNS]);

  const produtoFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of [...allRowsRen, ...allRowsNS]) {
      if (r.produtoId && r.produto) map.set(r.produtoId, r.produto);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
      .map(([id, label]) => ({ id, label }));
  }, [allRowsRen, allRowsNS]);

  const seguradoraFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of [...allRowsRen, ...allRowsNS]) {
      if (r.seguradoraId && r.seguradora) map.set(r.seguradoraId, r.seguradora);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
      .map(([id, label]) => ({ id, label }));
  }, [allRowsRen, allRowsNS]);

  return {
    equipeData,
    loadingRenovacoes,
    loadingCotacoes,
    cotacaoTags,
    usuariosVendedores,
    pendentesMap,
    vendedoresOptions,
    produtosOptions,
    seguradorasOptions,
    rowsRen,
    rowsNS,
    vendedorFilterOptions,
    produtoFilterOptions,
    seguradoraFilterOptions,
  };
}
