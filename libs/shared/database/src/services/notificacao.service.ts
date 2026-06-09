import { db } from '../connection.js';
import type { DbOrTx } from '../connection.js';
import { notificacoes } from '../schema/notificacao.js';
import type { NewNotificacao } from '../schema/notificacao.js';
import { usuarios } from '../schema/usuario.js';
import { cargoPermissoes, permissoesGlobais } from '../schema/permissao.js';
import { eq, and, isNull, inArray } from 'drizzle-orm';

export class NotificacaoService {
  static async criar(data: Omit<NewNotificacao, 'id' | 'createdAt'>) {
    try {
      const [notificacao] = await db
        .insert(notificacoes)
        .values(data)
        .returning();
      return notificacao;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      throw error;
    }
  }

  static async criarParaMultiplosUsuarios(
    usuarioIds: string[],
    data: Omit<
      NewNotificacao,
      'id' | 'createdAt' | 'usuarioId' | 'corretoraId'
    > & {
      corretoraId: string;
    },
    tx?: DbOrTx,
  ) {
    try {
      const executor = tx ?? db;
      const notificacoesData = usuarioIds.map((usuarioId) => ({
        ...data,
        usuarioId,
      }));

      const result = await executor
        .insert(notificacoes)
        .values(notificacoesData)
        .returning();
      return result;
    } catch (error) {
      console.error(
        'Erro ao criar notificações para múltiplos usuários:',
        error,
      );
      throw error;
    }
  }

  static async notificarVendaRecusada(params: {
    corretoraId: string;
    documentoId: string;
    numeroDocumento: string;
    clienteNome: string;
    motivoRejeicao: string;
    rejeitadoPorNome: string;
    vendedorId: string;
    gestorId?: string | null;
  }) {
    const {
      corretoraId,
      documentoId,
      numeroDocumento,
      clienteNome,
      motivoRejeicao,
      rejeitadoPorNome,
      vendedorId,
      gestorId,
    } = params;

    const destinatarios = [vendedorId];
    if (gestorId) destinatarios.push(gestorId);

    return this.criarParaMultiplosUsuarios(destinatarios, {
      corretoraId,
      tipo: 'venda_recusada',
      titulo: 'Venda recusada pelo cadastro',
      mensagem: `A venda ${numeroDocumento} do cliente ${clienteNome} foi recusada por ${rejeitadoPorNome}. Motivo: ${motivoRejeicao}`,
      linkAcao: `/workspace?documentoId=${documentoId}`,
      prioridade: 'urgente',
      metadata: { documentoId, numeroDocumento, clienteNome, motivoRejeicao, rejeitadoPorNome },
    });
  }

  static async notificarRenovacaoExpirando(params: {
    corretoraId: string;
    renovacaoId: string;
    clienteNome: string;
    dataVencimento: Date | string;
    diasRestantes: number;
    vendedorId: string;
    gestorId?: string | null;
  }) {
    const {
      corretoraId,
      renovacaoId,
      clienteNome,
      dataVencimento,
      diasRestantes,
      vendedorId,
      gestorId,
    } = params;

    const destinatarios = [vendedorId];
    if (gestorId) destinatarios.push(gestorId);

    const prioridade =
      diasRestantes <= 7 ? 'urgente' : diasRestantes <= 15 ? 'alta' : 'media';

    return this.criarParaMultiplosUsuarios(destinatarios, {
      corretoraId,
      tipo: 'renovacao_expirando',
      titulo: 'Renovação expirando em breve',
      mensagem: `A apólice do cliente ${clienteNome} vence em ${diasRestantes} dia(s)`,
      linkAcao: `/workspace?renovacaoId=${renovacaoId}`,
      prioridade,
      metadata: { renovacaoId, clienteNome, dataVencimento, diasRestantes },
    });
  }

  static async notificarAprovacaoPendente(params: {
    corretoraId: string;
    documentoId: string;
    numeroDocumento: string;
    clienteNome: string;
    vendedorNome: string;
  }) {
    const {
      corretoraId,
      documentoId,
      numeroDocumento,
      clienteNome,
      vendedorNome,
    } = params;

    const permissao = await db.query.permissoesGlobais.findFirst({
      where: eq(permissoesGlobais.nomePermissao, 'cadastro:aprovar_venda'),
      columns: { id: true },
    });

    if (!permissao) {
      console.warn('Permissão cadastro:aprovar_venda não encontrada');
      return [];
    }

    const cargosComPermissao = await db
      .select({ cargoId: cargoPermissoes.cargoId })
      .from(cargoPermissoes)
      .where(eq(cargoPermissoes.permissaoGlobalId, permissao.id));

    const cargoIds = cargosComPermissao.map((c) => c.cargoId);
    if (cargoIds.length === 0) return [];

    const aprovadores = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(
        and(
          eq(usuarios.corretoraId, corretoraId),
          inArray(usuarios.cargoId, cargoIds),
          isNull(usuarios.deletedAt),
        ),
      );

    const aprovadorIds = aprovadores.map((u) => u.id);
    if (aprovadorIds.length === 0) return [];

    return this.criarParaMultiplosUsuarios(aprovadorIds, {
      corretoraId,
      tipo: 'aprovacao_pendente',
      titulo: 'Nova venda aguardando aprovação',
      mensagem: `${vendedorNome} submeteu a venda ${numeroDocumento} do cliente ${clienteNome} para aprovação`,
      linkAcao: `/workspace?documentoId=${documentoId}`,
      prioridade: 'alta',
      metadata: { documentoId, numeroDocumento, clienteNome, vendedorNome },
    });
  }

  static async notificarVendaAprovada(params: {
    corretoraId: string;
    documentoId: string;
    numeroDocumento: string;
    clienteNome: string;
    aprovadoPorNome: string;
    vendedorId: string;
    gestorId?: string | null;
  }) {
    const {
      corretoraId,
      documentoId,
      numeroDocumento,
      clienteNome,
      aprovadoPorNome,
      vendedorId,
      gestorId,
    } = params;

    const destinatarios = [vendedorId];
    if (gestorId) destinatarios.push(gestorId);

    return this.criarParaMultiplosUsuarios(destinatarios, {
      corretoraId,
      tipo: 'venda_aprovada',
      titulo: 'Venda aprovada!',
      mensagem: `A venda ${numeroDocumento} do cliente ${clienteNome} foi aprovada por ${aprovadoPorNome}`,
      linkAcao: `/workspace?documentoId=${documentoId}`,
      prioridade: 'alta',
      metadata: { documentoId, numeroDocumento, clienteNome, aprovadoPorNome },
    });
  }

  static async notificarEndossoSolicitado(
    params: {
      corretoraId: string;
      endossoId: string;
      documentoId: string;
      clienteNome: string;
      tipoEndosso: string;
      solicitanteNome: string;
      vendedorId: string;
      gestorId?: string | null;
    },
    tx?: DbOrTx,
  ) {
    const {
      corretoraId,
      endossoId,
      documentoId,
      clienteNome,
      tipoEndosso,
      solicitanteNome,
      vendedorId,
      gestorId,
    } = params;

    const destinatarios = [vendedorId];
    if (gestorId) destinatarios.push(gestorId);

    const tiposEndosso: Record<string, string> = {
      inclusao_cobertura: 'Inclusão de Cobertura',
      exclusao_cobertura: 'Exclusão de Cobertura',
      alteracao_valor: 'Alteração de Valor',
      alteracao_item: 'Alteração de Item',
      alteracao_dados: 'Alteração de Dados',
      alteracao_vigencia: 'Alteração de Vigência',
      transferencia_titularidade: 'Transferência de Titularidade',
      substituicao_veiculo: 'Substituição de Veículo',
      cancelamento: 'Cancelamento',
      inclusao: 'Inclusão',
      exclusao: 'Exclusão',
      alteracao: 'Alteração',
      outro: 'Outro',
    };

    const tipoLabel = tiposEndosso[tipoEndosso] ?? tipoEndosso;

    return this.criarParaMultiplosUsuarios(
      destinatarios,
      {
        corretoraId,
        tipo: 'endosso_solicitado',
        titulo: 'Endosso solicitado',
        mensagem: `${solicitanteNome} solicitou um endosso de ${tipoLabel} para a apólice de ${clienteNome}`,
        linkAcao: `/workspace?endossoId=${endossoId}&documentoId=${documentoId}`,
        prioridade: 'alta',
        metadata: { endossoId, documentoId, clienteNome, tipoEndosso, solicitanteNome },
      },
      tx,
    );
  }

  static async notificarEndossoRecusado(
    params: {
      corretoraId: string;
      endossoId: string;
      documentoId: string;
      numeroEndosso: string;
      clienteNome: string;
      tipoEndosso: string;
      motivoRecusa: string;
      recusadoPorNome: string;
      vendedorId: string;
      gestorId?: string | null;
    },
    tx?: DbOrTx,
  ) {
    const {
      corretoraId,
      endossoId,
      documentoId,
      numeroEndosso,
      clienteNome,
      tipoEndosso,
      motivoRecusa,
      recusadoPorNome,
      vendedorId,
      gestorId,
    } = params;

    const destinatarios = [vendedorId];
    if (gestorId) destinatarios.push(gestorId);

    const tiposEndosso: Record<string, string> = {
      INCLUSAO_COBERTURA: 'Inclusão de Cobertura',
      EXCLUSAO_COBERTURA: 'Exclusão de Cobertura',
      ALTERACAO_VALOR: 'Alteração de Valor',
      INCLUSAO_ITEM: 'Inclusão de Item',
      EXCLUSAO_ITEM: 'Exclusão de Item',
      ALTERACAO_DADOS: 'Alteração de Dados',
      ALTERACAO_VIGENCIA: 'Alteração de Vigência',
      TRANSFERENCIA_SEGURADO: 'Transferência de Segurado',
      SUBSTITUICAO_VEICULO: 'Substituição de Veículo',
      CANCELAMENTO: 'Cancelamento',
      OUTROS: 'Outros',
    };

    const tipoLabel = tiposEndosso[tipoEndosso] ?? tipoEndosso;

    return this.criarParaMultiplosUsuarios(
      destinatarios,
      {
        corretoraId,
        tipo: 'endosso_recusado',
        titulo: 'Endosso recusado',
        mensagem: `O endosso ${numeroEndosso} (${tipoLabel}) para ${clienteNome} foi recusado por ${recusadoPorNome}. Motivo: ${motivoRecusa}`,
        linkAcao: `/workspace?endossoId=${endossoId}&documentoId=${documentoId}`,
        prioridade: 'urgente',
        metadata: { endossoId, documentoId, numeroEndosso, clienteNome, tipoEndosso, motivoRecusa, recusadoPorNome },
      },
      tx,
    );
  }

  static async notificarCotacaoAtribuida(params: {
    corretoraId: string;
    cotacaoId: string;
    clienteNome: string;
    atribuidoPorNome: string;
    vendedorId: string;
  }) {
    const { corretoraId, cotacaoId, clienteNome, atribuidoPorNome, vendedorId } =
      params;

    return this.criarParaMultiplosUsuarios([vendedorId], {
      corretoraId,
      tipo: 'cotacao_atribuida',
      titulo: 'Cotação atribuída a você',
      mensagem: `${atribuidoPorNome} atribuiu a cotação do cliente ${clienteNome} a você`,
      linkAcao: `/workspace?cotacaoId=${cotacaoId}`,
      prioridade: 'media',
      metadata: { cotacaoId, clienteNome, atribuidoPorNome },
    });
  }

  static async notificarComissaoDisponivel(params: {
    corretoraId: string;
    documentoId: string;
    numeroDocumento: string;
    clienteNome: string;
    valorComissao: string;
    vendedorId: string;
    gestorId?: string | null;
  }) {
    const {
      corretoraId,
      documentoId,
      numeroDocumento,
      clienteNome,
      valorComissao,
      vendedorId,
      gestorId,
    } = params;

    const destinatarios = [vendedorId];
    if (gestorId) destinatarios.push(gestorId);

    const valorFormatado = parseFloat(valorComissao).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    return this.criarParaMultiplosUsuarios(destinatarios, {
      corretoraId,
      tipo: 'comissao_disponivel',
      titulo: 'Comissão disponível',
      mensagem: `Comissão de ${valorFormatado} calculada para a venda ${numeroDocumento} do cliente ${clienteNome}`,
      linkAcao: `/workspace?documentoId=${documentoId}`,
      prioridade: 'media',
      metadata: { documentoId, numeroDocumento, clienteNome, valorComissao },
    });
  }

  static async notificarSolicitacaoTrocaVendedor(params: {
    corretoraId: string;
    documentoId: string;
    numeroDocumento: string;
    clienteNome: string;
    solicitanteNome: string;
    tipoVendedor: string;
    novoVendedorNome: string;
  }) {
    const {
      corretoraId,
      documentoId,
      numeroDocumento,
      clienteNome,
      solicitanteNome,
      tipoVendedor,
      novoVendedorNome,
    } = params;

    const tipoLabel =
      tipoVendedor === 'principal'
        ? 'principal'
        : tipoVendedor === 'secundario'
          ? 'secundário'
          : 'terceiro';

    const permissao = await db.query.permissoesGlobais.findFirst({
      where: eq(permissoesGlobais.nomePermissao, 'vendas:aprovar_troca_vendedor'),
      columns: { id: true },
    });

    if (!permissao) return [];

    const cargosComPermissao = await db
      .select({ cargoId: cargoPermissoes.cargoId })
      .from(cargoPermissoes)
      .where(eq(cargoPermissoes.permissaoGlobalId, permissao.id));

    const cargoIds = cargosComPermissao.map((c) => c.cargoId);
    if (cargoIds.length === 0) return [];

    const aprovadores = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(
        and(
          eq(usuarios.corretoraId, corretoraId),
          inArray(usuarios.cargoId, cargoIds),
          isNull(usuarios.deletedAt),
        ),
      );

    const aprovadorIds = aprovadores.map((u) => u.id);
    if (aprovadorIds.length === 0) return [];

    return this.criarParaMultiplosUsuarios(aprovadorIds, {
      corretoraId,
      tipo: 'troca_vendedor_pendente',
      titulo: 'Solicitação de troca de vendedor',
      mensagem: `${solicitanteNome} solicitou a troca do vendedor ${tipoLabel} da venda ${numeroDocumento} (${clienteNome}) para ${novoVendedorNome}`,
      linkAcao: `/workspace?documentoId=${documentoId}`,
      prioridade: 'alta',
      metadata: { documentoId, numeroDocumento, clienteNome, solicitanteNome, tipoVendedor, novoVendedorNome },
    });
  }

  static async notificarTrocaVendedorAprovada(params: {
    corretoraId: string;
    documentoId: string;
    numeroDocumento: string;
    clienteNome: string;
    aprovadoPorNome: string;
    tipoVendedor: string;
    novoVendedorNome: string;
    solicitanteId: string;
  }) {
    const {
      corretoraId,
      documentoId,
      numeroDocumento,
      clienteNome,
      aprovadoPorNome,
      tipoVendedor,
      novoVendedorNome,
      solicitanteId,
    } = params;

    const tipoLabel =
      tipoVendedor === 'principal'
        ? 'principal'
        : tipoVendedor === 'secundario'
          ? 'secundário'
          : 'terceiro';

    return this.criarParaMultiplosUsuarios([solicitanteId], {
      corretoraId,
      tipo: 'troca_vendedor_aprovada',
      titulo: 'Troca de vendedor aprovada',
      mensagem: `${aprovadoPorNome} aprovou a troca do vendedor ${tipoLabel} para ${novoVendedorNome} na venda ${numeroDocumento} (${clienteNome})`,
      linkAcao: `/workspace?documentoId=${documentoId}`,
      prioridade: 'alta',
      metadata: { documentoId, numeroDocumento, clienteNome, aprovadoPorNome, tipoVendedor, novoVendedorNome },
    });
  }

  static async notificarTrocaVendedorRecusada(params: {
    corretoraId: string;
    documentoId: string;
    numeroDocumento: string;
    clienteNome: string;
    recusadoPorNome: string;
    tipoVendedor: string;
    novoVendedorNome: string;
    motivoRecusa: string;
    solicitanteId: string;
  }) {
    const {
      corretoraId,
      documentoId,
      numeroDocumento,
      clienteNome,
      recusadoPorNome,
      tipoVendedor,
      novoVendedorNome,
      motivoRecusa,
      solicitanteId,
    } = params;

    const tipoLabel =
      tipoVendedor === 'principal'
        ? 'principal'
        : tipoVendedor === 'secundario'
          ? 'secundário'
          : 'terceiro';

    return this.criarParaMultiplosUsuarios([solicitanteId], {
      corretoraId,
      tipo: 'troca_vendedor_recusada',
      titulo: 'Troca de vendedor recusada',
      mensagem: `${recusadoPorNome} recusou a troca do vendedor ${tipoLabel} para ${novoVendedorNome} na venda ${numeroDocumento} (${clienteNome}). Motivo: ${motivoRecusa}`,
      linkAcao: `/workspace?documentoId=${documentoId}`,
      prioridade: 'urgente',
      metadata: { documentoId, numeroDocumento, clienteNome, recusadoPorNome, tipoVendedor, novoVendedorNome, motivoRecusa },
    });
  }
}
