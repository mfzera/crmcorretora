export interface Endereco {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface Cliente {
  id: string;
  tipoPessoa: 'PF' | 'PJ';
  // Campos PF
  nome?: string;
  cpf?: string;
  rg?: string;
  dataNascimento?: string;
  sexo?: 'M' | 'F' | 'OUTRO';
  estadoCivil?: 'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'VIUVO' | 'OUTRO';
  profissao?: string;
  // Campos PJ
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  ramoAtividade?: string;
  dataAbertura?: string;
  // Campos comuns
  email?: string;
  telefone?: string;
  celular?: string;
  endereco?: Endereco;
  ativo: boolean;
}

export interface Produto {
  id: string | null;
  nomeProduto: string;
  tipoSeguro: string | null;
  ativo: boolean;
}

export type StatusCotacao =
  | 'EM_ELABORACAO'
  | 'PERDIDA'
  | 'EXPIRADA'
  | 'CONVERTIDA';

export type EtapaCotacao =
  | 'LEVANTANDO_DADOS'
  | 'PROPOSTA_ENVIADA'
  | 'EM_NEGOCIACAO'
  | 'AGUARDANDO_RETORNO';

export interface CotacaoTag {
  id: string;
  nome: string;
  cor: string;
  criadorId?: string;
  equipeId?: string | null;
  isOwn?: boolean;
}

export type SituacaoCotacao = 'NOVO' | 'RENOVACAO';

export type StatusProposta =
  | 'AGUARDANDO_ENVIO'
  | 'ENVIADA'
  | 'EM_ANALISE'
  | 'PENDENTE_DOCUMENTACAO'
  | 'APROVADA'
  | 'APROVADA_CONDICIONAL'
  | 'RECUSADA'
  | 'CANCELADA'
  | 'VENDA_CONFIRMADA';

export type StatusDocumentoVenda =
  | 'EM_NEGOCIACAO'
  | 'AGUARDANDO_CLIENTE'
  | 'AGUARDANDO_APROVACAO'
  | 'VENDA_CONFIRMADA'
  | 'AGUARDANDO_CADASTRO'
  | 'ATIVO'
  | 'CANCELADO'
  | 'PERDIDO';

export type StatusEndosso =
  | 'SOLICITADO'
  | 'APROVADO'
  | 'RECUSADO'
  | 'CANCELADO';

export type TipoEndosso =
  | 'INCLUSAO_COBERTURA'
  | 'EXCLUSAO_COBERTURA'
  | 'ALTERACAO_VALOR'
  | 'INCLUSAO_ITEM'
  | 'EXCLUSAO_ITEM'
  | 'ALTERACAO_DADOS'
  | 'ALTERACAO_VIGENCIA'
  | 'TRANSFERENCIA_SEGURADO'
  | 'SUBSTITUICAO_VEICULO'
  | 'CANCELAMENTO'
  | 'OUTROS';

export interface Vendedor {
  id: string;
  nome: string;
  email: string;
  avatarUrl?: string | null;
}

export interface DadosRenovacao {
  premioLiquidoAnterior: number | null;
  percentualComissaoAnterior: number | null;
  valorComissaoAnterior: number | null;
}

export interface Cotacao {
  id: string;
  numero?: string;
  numeroCotacao?: string; // API retorna com esse nome
  clienteId: string;
  cliente: Cliente;
  produtoId: string;
  produto: Produto;
  seguradoraParceiraId?: string | null;
  seguradoraParceira?: {
    id: string;
    razaoSocial: string;
    nomeFantasia: string | null;
  } | null;
  vendedorId: string;
  vendedor?: Vendedor;
  status: StatusCotacao;
  etapa?: EtapaCotacao;
  situacao: SituacaoCotacao;
  tags?: CotacaoTag[];
  origem?: 'MANUAL' | 'RENOVACAO_PENDENTE' | null;
  vigenciaInicio: string;
  vigenciaFim: string;
  premioLiquido?: number | null;
  percentualComissao: number | null;
  valorComissao?: number | null;

  // Commission split fields
  vendedorSecundarioId?: string | null;
  vendedorSecundario?: Vendedor | null;
  vendedorTerceiroId?: string | null;
  vendedorTerceiro?: Vendedor | null;
  percentualComissaoPrincipal?: number | null;
  percentualComissaoSecundario?: number | null;
  percentualComissaoTerceiro?: number | null;
  valorComissaoPrincipal?: number | null;
  valorComissaoSecundario?: number | null;
  valorComissaoTerceiro?: number | null;
  negocioCorretora?: boolean;
  isFechado?: boolean;
  percentualCorretora?: number | null;
  valorComissaoCorretora?: number | null;

  // Atuante: usuário logado que agiu na venda (audit + ownership)
  atuanteId?: string | null;
  atuante?: Vendedor | null;

  // Campos de perda
  motivoPerda?: string | null;
  detalhesPerda?: string | null;
  concorrenteGanhou?: string | null;
  dataMarcadaPerdida?: string | null;
  // Dados de renovação (quando situacao = 'RENOVACAO')
  dadosRenovacao?: DadosRenovacao;
  // Documento de venda vinculado (se cotação foi convertida e rejeitada)
  documentoVenda?: {
    id: string;
    status: string;
    motivoRejeicao: string | null;
    dataRejeicaoCadastro: string | null;
    dataAprovacaoCadastro?: string | null;
    aprovadoPor?: { id: string; nome: string } | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  deletedByNome?: string | null;
  comentariosCount?: number;
  anexosCount?: number;
  ultimoComentario?: {
    texto: string;
    autorNome: string;
    autorAvatarUrl: string | null;
    createdAt: string;
  } | null;
  renovacaoId?: string | null;
  dataRejeicaoCadastroDoc?: string | null;
  motivoRejeicaoCadastroDoc?: string | null;
  documentoVendaIdDoc?: string | null;
  documentoVendaStatusDoc?: string | null;
}

export interface CotacaoVendedor {
  id: string;
  cotacaoId: string;
  vendedorId: string;
  vendedor: {
    id: string;
    nome: string;
    email: string;
  };
  dataAtribuicao: string;
  atribuidoPor?: string;
  ativo: boolean;
}

export interface Proposta {
  id: string;
  numero: string;
  clienteId: string;
  cliente: Cliente;
  produtoId: string;
  produto: Produto;
  seguradoraParceiraId: string;
  seguradoraParceira?: {
    id: string;
    razaoSocial: string;
    nomeFantasia: string | null;
  } | null;
  vendedorId: string;
  status: StatusProposta;
  numeroPropostaExterno: string | null;
  vigenciaInicio: string;
  vigenciaFim: string;
  premioLiquido: number | null;
  percentualComissao: number | null;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface SolicitacaoExclusaoInfo {
  id: string;
  status: 'PENDENTE' | 'RECUSADA';
  motivoRecusa: string | null;
  criadoEm: string;
}

export interface RenovacaoPendente {
  id: string;
  documentoVendaId: string | null;
  cliente: Cliente;
  produto: Produto;
  numeroApolice: string | null;
  vigenciaFim: string | null;
  premioAtual: number | null;
  diasParaVencimento: number;
  prioridade: 'ALTA' | 'MEDIA' | 'BAIXA';
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'RENOVADO' | 'PERDIDO';
  statusOriginal: 'NAO_TRABALHADO' | 'EM_PROSPECCAO' | 'EM_NEGOCIACAO' | 'AGUARDANDO_CLIENTE' | 'RENOVADO' | 'PERDIDO' | 'CANCELADO';
  vendedorId: string;
  vendedor: Vendedor | null;
  percentualComissaoAnterior: number | null;
  valorComissaoAnterior: number | null;
  seguradoraParceira: {
    id: string;
    razaoSocial: string;
    nomeFantasia: string | null;
  } | null;
  // Campos adicionais para renovações importadas
  itemDescricao?: string | null;
  produtoDescricao?: string | null;
  seguradoraAnterior?: string | null;
  importadoDePlanilha?: boolean;
  // Documento de venda novo (quando a renovação já gerou um documento)
  documentoVendaNovo?: {
    id: string;
    status: string;
    numeroDocumento: string;
    motivoRejeicao: string | null;
    dataRejeicaoCadastro: string | null;
    dataAprovacaoCadastro: string | null;
  } | null;
  // Solicitação de exclusão pendente ou recusada (se existir)
  solicitacaoExclusao?: SolicitacaoExclusaoInfo | null;
}

export interface Endosso {
  id: string;
  numeroEndosso: string;
  status: StatusEndosso;
  tipoEndosso: TipoEndosso;
  descricao: string;
  documentoVenda: {
    id: string;
    numeroDocumento: string;
    numeroApoliceExterna: string | null;
    cliente: Cliente;
    produto: Produto;
  };
  vendedor: {
    id: string;
    nome: string;
  };
  premioAnterior: number | null;
  premioNovo: number | null;
  diferencaPremio: number | null;
  percentualComissaoAnterior: number | null;
  percentualComissaoNovo: number | null;
  diferencaComissao: number | null;
  dataSolicitacao: string;
  dataAprovacao: string | null;
  motivoRecusa: string | null;
  observacoes: string | null;
}

export interface DocumentoCancelado {
  id: string;
  numeroDocumento: string;
  numeroApoliceExterna: string | null;
  cliente: Cliente;
  produto: Produto;
  premioLiquido: number | null;
  dataCancelamento: string;
  motivoCancelamento: string | null;
  canceladoPor: {
    id: string;
    nome: string;
  } | null;
  vigenciaInicio: string;
  vigenciaFim: string;
}

export type StatusRenovacao =
  | 'NAO_TRABALHADO'
  | 'EM_PROSPECCAO'
  | 'EM_NEGOCIACAO'
  | 'AGUARDANDO_CLIENTE'
  | 'RENOVADO'
  | 'PERDIDO'
  | 'CANCELADO';

export interface RenovacaoPlanilha {
  id: string;
  status: StatusRenovacao;
  dataVencimento: string | null;
  novaVigenciaInicio: string | null;
  novaVigenciaFim: string | null;
  documentoVendaAnteriorId: string | null;
  documentoVendaNovoId: string | null;
  premioAnterior: string | null;
  premioNovo: string | null;
  valorComissaoNovo: string | null;
  percentualComissaoNovo: string | null;
  observacoes: string | null;
  dataPerda: string | null;
  motivoPerda: string | null;
  concorrenteGanhou: string | null;
  detalhesPerda: string | null;
  dataCancelamento: string | null;
  motivoCancelamento: string | null;
  deletedAt?: string | null;
  deletedByNome?: string | null;
  produtoDescricao: string | null;
  itemDescricao: string | null;
  seguradoraAnterior: string | null;
  cliente: {
    id: string;
    tipoPessoa: 'PF' | 'PJ';
    nome?: string | null;
    razaoSocial?: string | null;
    cpf?: string | null;
    cnpj?: string | null;
    email?: string | null;
    telefone?: string | null;
    celular?: string | null;
  } | null;
  vendedor: { id: string; nome: string; avatarUrl?: string | null } | null;
  documentoVendaAnterior: {
    id: string;
    status: string;
    premioLiquido: string | null;
    percentualComissao: string | null;
    valorComissao: string | null;
    vigenciaInicio: string | null;
    vigenciaFim: string | null;
    numeroApoliceExterna: string | null;
    cliente: {
      id: string;
      tipoPessoa: 'PF' | 'PJ';
      nome?: string | null;
      razaoSocial?: string | null;
      cpf?: string | null;
      cnpj?: string | null;
      email?: string | null;
      telefone?: string | null;
      celular?: string | null;
    } | null;
    produto: { id: string; nomeProduto: string } | null;
    seguradoraParceira: {
      id: string;
      razaoSocial: string;
      nomeFantasia: string | null;
    } | null;
  } | null;
  documentoVendaNovo: {
    id: string;
    status: string;
    premioLiquido: string | null;
    percentualComissao: string | null;
    valorComissao: string | null;
    numeroApoliceExterna: string | null;
    vigenciaInicio: string | null;
    vigenciaFim: string | null;
    dataSolicitacaoCadastro: string | null;
    dataAprovacaoCadastro: string | null;
    dataRejeicaoCadastro: string | null;
    motivoRejeicao: string | null;
    dataCancelamento: string | null;
    motivoCancelamento: string | null;
    dataPerda: string | null;
    motivoPerda: string | null;
    concorrenteGanhou: string | null;
    aprovadoPor: { id: string; nome: string } | null;
    rejeitadoPor: { id: string; nome: string } | null;
    canceladoPor: { id: string; nome: string } | null;
  } | null;
}

export interface ResumoAreaTrabalho {
  renovacoesPendentes: RenovacaoPendente[];
  cotacoesAtivas: Cotacao[];
  propostasAtivas: Proposta[];
  estatisticas: {
    totalRenovacoesPendentes: number;
    totalCotacoesAtivas: number;
    totalPropostasAtivas: number;
    totalEndossosPendentes: number;
    totalCanceladosMes: number;
    metaMensal: number;
    vendidoMes: number;
  };
}
