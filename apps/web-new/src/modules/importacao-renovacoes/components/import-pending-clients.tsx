
import { useMemo, useState } from 'react';
import {
  UserPlus,
  UserSearch,
  Pencil,
  Users,
  Loader2,
  AlertTriangle,
  Search,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Progress } from '@/core/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { toast } from 'sonner';
import {
  useCreateClient,
  useCreateClientsBatch,
  useSearchClients,
} from '@/modules/clientes/http';
import { useProcessImportPending } from '../http';
import type { ImportacaoItem } from '../http';
import {
  digitsOnly,
  formatCPF,
  formatCNPJ,
  formatPhone,
  validateCPF,
  validateCNPJ,
} from '@/core/validators/documento';

interface PendingClientData {
  id: string; // item id
  linha: number;
  nome: string;
  documento: string;
  tipoPessoa: 'PF' | 'PJ';
  emails: string[];
  telefones: string[];
  produto: string;
  vigenciaFinal: string;
  seguradora: string | null;
  premioLiquido: string | null;
  comissao: string | null;
}

interface ImportPendingClientsProps {
  importacaoId: string;
  pendingItems: ImportacaoItem[];
  vendedorId: string;
  onProcessed: () => void;
}

function parsePendingItem(item: ImportacaoItem): PendingClientData | null {
  const row = item.dadosLinha as Record<string, any>;
  if (!row) return null;

  const documentoCliente =
    item.documentoCliente || row['DOCUMENTO DO CLIENTE'] || '';
  const nomeCliente = item.nomeCliente || row['CLIENTE'] || '';
  const tipoPessoaRaw = row['TIPO DE PESSOA'] || '';
  const documentoLimpo = documentoCliente.toString().replace(/[.\-/]/g, '');
  const isPJ =
    tipoPessoaRaw.toUpperCase().includes('JUR') || documentoLimpo.length > 11;

  const parseMultiple = (val: string | undefined): string[] => {
    if (!val) return [];
    return val
      .toString()
      .split('|')
      .map((v) => v.trim())
      .filter(Boolean);
  };

  return {
    id: item.id,
    linha: item.linhaNumero,
    nome: nomeCliente,
    documento: documentoCliente.toString(),
    tipoPessoa: isPJ ? 'PJ' : 'PF',
    emails: parseMultiple(row['E-MAIL']),
    telefones: parseMultiple(row['TELEFONE']),
    produto: item.produto || row['PRODUTO'] || row['ITEM'] || '',
    vigenciaFinal: row['VIGÊNCIA FINAL'] || row['VIGENCIA FINAL'] || '',
    seguradora: row['SEGURADORA'] || null,
    premioLiquido: row['PRÊMIO LÍQUIDO'] || row['PREMIO LIQUIDO'] || null,
    comissao: row['COMISSÃO'] || row['COMISSAO'] || null,
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ValidacaoCliente {
  documentoOk: boolean;
  nomeOk: boolean;
  emailOk: boolean;
  telefoneOk: boolean;
  temContato: boolean;
  ok: boolean;
  problemas: string[];
}

function validarCliente(c: PendingClientData): ValidacaoCliente {
  const doc = digitsOnly(c.documento);
  const documentoOk =
    c.tipoPessoa === 'PF' ? validateCPF(doc) : validateCNPJ(doc);

  const nomeOk = (c.nome || '').trim().length >= 2;

  const emails = c.emails.filter(Boolean);
  const emailOk =
    emails.length === 0 || emails.every((e) => EMAIL_REGEX.test(e.trim()));

  const telefones = c.telefones.filter(Boolean);
  const telefoneOk =
    telefones.length === 0 ||
    telefones.every((t) => digitsOnly(t).length >= 10);

  const temContato = emails.length > 0 || telefones.length > 0;

  const problemas: string[] = [];
  if (!documentoOk) {
    problemas.push(c.tipoPessoa === 'PF' ? 'CPF inválido' : 'CNPJ inválido');
  }
  if (!nomeOk) problemas.push('Nome obrigatório');
  if (!emailOk) problemas.push('E-mail inválido');
  if (!telefoneOk) problemas.push('Telefone deve ter ao menos 10 dígitos');
  if (!temContato) problemas.push('Informe e-mail ou telefone');

  return {
    documentoOk,
    nomeOk,
    emailOk,
    telefoneOk,
    temContato,
    ok: documentoOk && nomeOk && emailOk && telefoneOk && temContato,
    problemas,
  };
}

function formatDocumentoDisplay(
  documento: string,
  tipoPessoa: 'PF' | 'PJ',
): string {
  const d = digitsOnly(documento);
  if (tipoPessoa === 'PF') return d.length === 11 ? formatCPF(d) : documento;
  return d.length === 14 ? formatCNPJ(d) : documento;
}

export function ImportPendingClients({
  importacaoId,
  pendingItems,
  vendedorId,
  onProcessed,
}: ImportPendingClientsProps) {
  const [editando, setEditando] = useState<PendingClientData | null>(null);
  const [dadosEdicao, setDadosEdicao] = useState<Partial<PendingClientData>>(
    {},
  );
  const [localOverrides, setLocalOverrides] = useState<
    Record<string, Partial<PendingClientData>>
  >({});
  const [cadastrando, setCadastrando] = useState<string | null>(null);
  const [aprovandoTodos, setAprovandoTodos] = useState(false);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });

  // Atribuir a cliente existente
  const [atribuindoCliente, setAtribuindoCliente] =
    useState<PendingClientData | null>(null);
  const [buscaAtribuir, setBuscaAtribuir] = useState('');
  const [clienteAtribuirId, setClienteAtribuirId] = useState<string | null>(
    null,
  );
  const [atribuindoLoading, setAtribuindoLoading] = useState(false);

  const criarClienteMutation = useCreateClient();
  const criarClientesBatchMutation = useCreateClientsBatch();
  const processarPendentesMutation = useProcessImportPending();

  const { data: resultadosBusca = [], isFetching: buscandoClientes } =
    useSearchClients(buscaAtribuir);

  const clients: PendingClientData[] = pendingItems
    .map((item) => {
      const parsed = parsePendingItem(item);
      if (!parsed) return null;
      return { ...parsed, ...localOverrides[item.id] };
    })
    .filter(Boolean) as PendingClientData[];

  const handleEditarCliente = (cliente: PendingClientData) => {
    setEditando(cliente);
    setDadosEdicao({ ...cliente });
  };

  const validacaoEdicao = useMemo(() => {
    if (!editando) return null;
    const full: PendingClientData = {
      ...editando,
      ...dadosEdicao,
    } as PendingClientData;
    return validarCliente(full);
  }, [editando, dadosEdicao]);

  const handleSalvarEdicao = () => {
    if (!editando || !validacaoEdicao?.ok) return;
    setLocalOverrides((prev) => ({ ...prev, [editando.id]: dadosEdicao }));
    toast.success('Dados atualizados');
    setEditando(null);
    setDadosEdicao({});
  };

  const registrarCliente = async (cliente: PendingClientData) => {
    const documentoLimpo = digitsOnly(cliente.documento);
    const contatosAdicionais = [
      ...cliente.emails
        .slice(1)
        .map((e) => ({ tipo: 'EMAIL', valor: e, principal: false })),
      ...cliente.telefones
        .slice(1)
        .map((t) => ({ tipo: 'TELEFONE', valor: t, principal: false })),
    ];

    const dadosCliente: any = {
      tipoPessoa: cliente.tipoPessoa,
      email: cliente.emails[0] || undefined,
      telefone: cliente.telefones[0] || undefined,
      contatos: contatosAdicionais.length > 0 ? contatosAdicionais : undefined,
      vendedorId: vendedorId || undefined,
      ...(cliente.tipoPessoa === 'PF'
        ? { nome: cliente.nome, cpf: documentoLimpo }
        : { razaoSocial: cliente.nome, cnpj: documentoLimpo }),
    };

    try {
      await criarClienteMutation.mutateAsync(dadosCliente);
    } catch (err: any) {
      if (err?.statusCode === 409) {
        // já existe, tudo bem
      } else {
        throw err;
      }
    }
  };

  const handleCadastrar = async (cliente: PendingClientData) => {
    const v = validarCliente(cliente);
    if (!v.ok) {
      toast.error(`Dados inválidos: ${v.problemas.join(', ')}`);
      return;
    }
    setCadastrando(cliente.id);
    try {
      await registrarCliente(cliente);
      toast.success(`${cliente.nome} cadastrado!`);

      const docNorm = digitsOnly(cliente.documento);
      const itemIds = pendingItems
        .filter((item) => {
          const docItem = digitsOnly(item.documentoCliente || '');
          return docItem === docNorm;
        })
        .map((i) => i.id);

      await processarPendentesMutation.mutateAsync({ importacaoId, itemIds });
      toast.success('Renovações criadas!');
      onProcessed();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cadastrar cliente');
    } finally {
      setCadastrando(null);
    }
  };

  const handleCadastrarTodos = async () => {
    const clientesUnicos = clients.reduce<PendingClientData[]>((acc, c) => {
      const docNorm = digitsOnly(c.documento);
      if (!acc.some((a) => digitsOnly(a.documento) === docNorm)) acc.push(c);
      return acc;
    }, []);

    const validos = clientesUnicos.filter((c) => validarCliente(c).ok);
    const invalidos = clientesUnicos.length - validos.length;

    if (validos.length === 0) {
      toast.error(
        'Nenhum pendente com dados válidos. Edite os registros antes de cadastrar.',
      );
      return;
    }

    setAprovandoTodos(true);
    setProgresso({ atual: 0, total: validos.length });

    let criados = 0;
    let jaExistiam = 0;
    let falhas = 0;

    try {
      const payload = validos.map((c) => {
        const documentoLimpo = digitsOnly(c.documento);
        const contatosAdicionais = [
          ...c.emails.slice(1).map((e) => ({
            tipo: 'EMAIL' as const,
            valor: e,
            principal: false,
          })),
          ...c.telefones.slice(1).map((t) => ({
            tipo: 'TELEFONE' as const,
            valor: t,
            principal: false,
          })),
        ];
        return {
          tipoPessoa: c.tipoPessoa,
          email: c.emails[0] || undefined,
          telefone: c.telefones[0] || undefined,
          contatos:
            contatosAdicionais.length > 0 ? contatosAdicionais : undefined,
          vendedorId: vendedorId || undefined,
          ...(c.tipoPessoa === 'PF'
            ? { nome: c.nome, cpf: documentoLimpo }
            : { razaoSocial: c.nome, cnpj: documentoLimpo }),
        };
      });

      const result = await criarClientesBatchMutation.mutateAsync(
        payload as any,
      );
      criados = result.criados;
      jaExistiam = result.jaExistiam;
      falhas = result.erros.length;
      setProgresso({ atual: validos.length, total: validos.length });
    } catch (err: any) {
      toast.error(`Erro ao cadastrar clientes: ${err.message}`);
      setAprovandoTodos(false);
      setProgresso({ atual: 0, total: 0 });
      return;
    }

    if (falhas === validos.length) {
      toast.error(
        'Nenhum cliente pôde ser cadastrado. Verifique os dados e tente novamente.',
      );
      setAprovandoTodos(false);
      setProgresso({ atual: 0, total: 0 });
      return;
    }

    if (falhas > 0) {
      toast.warning(
        `${falhas} cliente(s) não puderam ser cadastrados e permanecerão pendentes.`,
      );
    } else if (criados > 0) {
      toast.success(
        `${criados} cliente(s) cadastrado(s)${jaExistiam > 0 ? ` · ${jaExistiam} já existiam` : ''}.`,
      );
    }
    if (invalidos > 0) {
      toast.warning(
        `${invalidos} pendente(s) com dados inválidos foram ignorados — edite e tente novamente.`,
      );
    }

    try {
      await processarPendentesMutation.mutateAsync({ importacaoId });
      toast.success('Pendentes processados!');
      onProcessed();
    } catch (err: any) {
      toast.error(`Erro ao processar pendentes: ${err.message}`);
    }

    setAprovandoTodos(false);
    setProgresso({ atual: 0, total: 0 });
  };

  // ---------- Atribuir a cliente existente ----------
  const handleAbrirAtribuir = (cliente: PendingClientData) => {
    setAtribuindoCliente(cliente);
    setBuscaAtribuir('');
    setClienteAtribuirId(null);
  };

  const handleFecharAtribuir = () => {
    if (atribuindoLoading) return;
    setAtribuindoCliente(null);
    setBuscaAtribuir('');
    setClienteAtribuirId(null);
  };

  const resultadosBuscaFiltrados = useMemo(() => {
    if (!atribuindoCliente) return resultadosBusca;
    return resultadosBusca.filter(
      (c: any) => c.tipoPessoa === atribuindoCliente.tipoPessoa,
    );
  }, [resultadosBusca, atribuindoCliente]);

  const handleConfirmarAtribuir = async () => {
    if (!atribuindoCliente || !clienteAtribuirId) return;
    const docNorm = digitsOnly(atribuindoCliente.documento);
    const itemIds = pendingItems
      .filter((item) => digitsOnly(item.documentoCliente || '') === docNorm)
      .map((i) => i.id);

    if (itemIds.length === 0) {
      toast.error('Nenhum item correspondente encontrado.');
      return;
    }

    setAtribuindoLoading(true);
    try {
      await processarPendentesMutation.mutateAsync({
        importacaoId,
        itemIds,
        clienteId: clienteAtribuirId,
      });
      toast.success('Pendente(s) atribuído(s) ao cliente existente!');
      onProcessed();
      setAtribuindoCliente(null);
      setClienteAtribuirId(null);
      setBuscaAtribuir('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atribuir cliente');
    } finally {
      setAtribuindoLoading(false);
    }
  };

  if (clients.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-blue-500" />
          Clientes Pendentes de Cadastro ({clients.length})
        </h3>
        <Button
          size="sm"
          onClick={handleCadastrarTodos}
          disabled={aprovandoTodos || !!cadastrando}
        >
          {aprovandoTodos ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {progresso.atual}/{progresso.total}
            </>
          ) : (
            <>
              <Users className="h-4 w-4 mr-2" />
              Cadastrar Todos
            </>
          )}
        </Button>
      </div>

      {aprovandoTodos && (
        <Progress
          value={(progresso.atual / progresso.total) * 100}
          className="mb-3"
        />
      )}

      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {clients.map((cliente) => {
          const v = validarCliente(cliente);
          return (
            <div
              key={cliente.id}
              className={`border rounded-lg p-4 ${
                v.ok
                  ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900'
                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      Linha {cliente.linha}
                    </Badge>
                    <Badge
                      variant={
                        cliente.tipoPessoa === 'PF' ? 'secondary' : 'default'
                      }
                    >
                      {cliente.tipoPessoa === 'PF'
                        ? 'Pessoa Física'
                        : 'Pessoa Jurídica'}
                    </Badge>
                    {!v.ok && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Dados inválidos
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium">{cliente.nome || '(sem nome)'}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDocumentoDisplay(
                      cliente.documento,
                      cliente.tipoPessoa,
                    )}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-muted-foreground">
                    {cliente.emails[0] && (
                      <span>
                        {cliente.emails[0]}
                        {cliente.emails.length > 1
                          ? ` (+${cliente.emails.length - 1})`
                          : ''}
                      </span>
                    )}
                    {cliente.telefones[0] && (
                      <span>
                        {cliente.telefones[0]}
                        {cliente.telefones.length > 1
                          ? ` (+${cliente.telefones.length - 1})`
                          : ''}
                      </span>
                    )}
                    {cliente.produto && <span>Produto: {cliente.produto}</span>}
                    {cliente.vigenciaFinal && (
                      <span>Venc: {cliente.vigenciaFinal}</span>
                    )}
                  </div>
                  {!v.ok && (
                    <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
                      {v.problemas.join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAbrirAtribuir(cliente)}
                    disabled={aprovandoTodos || !!cadastrando}
                    title="Atribuir a um cliente já cadastrado"
                  >
                    <UserSearch className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditarCliente(cliente)}
                    disabled={aprovandoTodos || !!cadastrando}
                    title="Editar dados"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleCadastrar(cliente)}
                    disabled={
                      cadastrando === cliente.id || aprovandoTodos || !v.ok
                    }
                    title={
                      !v.ok
                        ? 'Corrija os dados antes de cadastrar'
                        : 'Cadastrar cliente e criar renovações'
                    }
                  >
                    {cadastrando === cliente.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-1" />
                        Cadastrar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog de edição */}
      <Dialog
        open={!!editando}
        onOpenChange={(open) => !open && setEditando(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Dados do Cliente</DialogTitle>
            <DialogDescription>
              Corrija os dados antes de cadastrar o cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Pessoa</Label>
              <Select
                value={dadosEdicao.tipoPessoa || 'PF'}
                onValueChange={(value) =>
                  setDadosEdicao({
                    ...dadosEdicao,
                    tipoPessoa: value as 'PF' | 'PJ',
                    // reset documento ao trocar tipo pra evitar CPF marcado como CNPJ
                    documento: '',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PF">Pessoa Física</SelectItem>
                  <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {dadosEdicao.tipoPessoa === 'PJ' ? 'Razão Social' : 'Nome'}
              </Label>
              <Input
                value={dadosEdicao.nome || ''}
                onChange={(e) =>
                  setDadosEdicao({ ...dadosEdicao, nome: e.target.value })
                }
              />
              {validacaoEdicao && !validacaoEdicao.nomeOk && (
                <p className="text-xs text-destructive">
                  Nome deve ter ao menos 2 caracteres
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                {dadosEdicao.tipoPessoa === 'PJ' ? 'CNPJ' : 'CPF'}
              </Label>
              <Input
                inputMode="numeric"
                placeholder={
                  dadosEdicao.tipoPessoa === 'PJ'
                    ? '00.000.000/0000-00'
                    : '000.000.000-00'
                }
                value={dadosEdicao.documento || ''}
                onChange={(e) => {
                  const raw = digitsOnly(e.target.value);
                  const formatted =
                    dadosEdicao.tipoPessoa === 'PJ'
                      ? formatCNPJ(raw.slice(0, 14))
                      : formatCPF(raw.slice(0, 11));
                  setDadosEdicao({ ...dadosEdicao, documento: formatted });
                }}
              />
              {validacaoEdicao &&
                !validacaoEdicao.documentoOk &&
                (dadosEdicao.documento || '').length > 0 && (
                  <p className="text-xs text-destructive">
                    {dadosEdicao.tipoPessoa === 'PJ'
                      ? 'CNPJ inválido'
                      : 'CPF inválido'}
                  </p>
                )}
            </div>

            <div className="space-y-2">
              <Label>E-mails (separados por |)</Label>
              <Input
                placeholder="email1@exemplo.com | email2@exemplo.com"
                value={dadosEdicao.emails?.join(' | ') || ''}
                onChange={(e) =>
                  setDadosEdicao({
                    ...dadosEdicao,
                    emails: e.target.value
                      .split('|')
                      .map((v) => v.trim())
                      .filter(Boolean),
                  })
                }
              />
              {validacaoEdicao && !validacaoEdicao.emailOk && (
                <p className="text-xs text-destructive">
                  Um ou mais e-mails estão inválidos
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Telefones (separados por |)</Label>
              <Input
                placeholder="(11) 99999-9999 | (11) 88888-8888"
                value={dadosEdicao.telefones?.join(' | ') || ''}
                onChange={(e) =>
                  setDadosEdicao({
                    ...dadosEdicao,
                    telefones: e.target.value
                      .split('|')
                      .map((v) => formatPhone(v.trim()))
                      .filter(Boolean),
                  })
                }
              />
              {validacaoEdicao && !validacaoEdicao.telefoneOk && (
                <p className="text-xs text-destructive">
                  Telefone deve ter ao menos 10 dígitos
                </p>
              )}
            </div>

            {validacaoEdicao && !validacaoEdicao.temContato && (
              <p className="text-xs text-destructive">
                Informe ao menos um e-mail ou telefone.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarEdicao}
              disabled={!validacaoEdicao?.ok}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de atribuir a cliente existente */}
      <Dialog
        open={!!atribuindoCliente}
        onOpenChange={(open) => !open && handleFecharAtribuir()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserSearch className="h-5 w-5 text-primary" />
              Atribuir a cliente existente
            </DialogTitle>
            <DialogDescription>
              Em vez de cadastrar um novo cliente, vincule{' '}
              <span className="font-medium text-foreground">
                {atribuindoCliente?.nome || '(sem nome)'}
              </span>{' '}
              a um cliente já na base.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="busca-atribuir">Buscar cliente</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="busca-atribuir"
                  className="pl-9"
                  placeholder="Nome, CPF, CNPJ ou e-mail (mín. 3 caracteres)"
                  value={buscaAtribuir}
                  onChange={(e) => {
                    setBuscaAtribuir(e.target.value);
                    setClienteAtribuirId(null);
                  }}
                  disabled={atribuindoLoading}
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-md border">
              {buscaAtribuir.trim().length < 3 ? (
                <p className="p-3 text-sm text-muted-foreground">
                  Digite ao menos 3 caracteres para buscar.
                </p>
              ) : buscandoClientes ? (
                <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando...
                </div>
              ) : resultadosBuscaFiltrados.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">
                  Nenhum cliente {atribuindoCliente?.tipoPessoa} encontrado.
                </p>
              ) : (
                <ul className="divide-y">
                  {resultadosBuscaFiltrados.map((c: any) => {
                    const selected = clienteAtribuirId === c.id;
                    const nome =
                      c.tipoPessoa === 'PF'
                        ? c.nome
                        : c.razaoSocial || c.nomeFantasia;
                    const doc =
                      c.tipoPessoa === 'PF'
                        ? c.cpf
                          ? formatCPF(c.cpf)
                          : 'sem CPF'
                        : c.cnpj
                          ? formatCNPJ(c.cnpj)
                          : 'sem CNPJ';
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setClienteAtribuirId(c.id)}
                          disabled={atribuindoLoading}
                          className={`flex w-full items-center justify-between gap-2 p-3 text-left text-sm transition-colors hover:bg-accent ${
                            selected ? 'bg-accent' : ''
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{nome}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {doc}
                              {c.email ? ` · ${c.email}` : ''}
                            </p>
                          </div>
                          {selected && (
                            <Check className="h-4 w-4 shrink-0 text-primary" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleFecharAtribuir}
              disabled={atribuindoLoading}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button
              onClick={handleConfirmarAtribuir}
              disabled={!clienteAtribuirId || atribuindoLoading}
            >
              {atribuindoLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Atribuir e criar renovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
