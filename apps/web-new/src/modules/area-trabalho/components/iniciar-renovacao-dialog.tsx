
import { useState, useEffect, useMemo } from 'react';
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  UserSearch,
  ArrowLeft,
  Search,
  Check,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/core/ui/alert-dialog';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import {
  formatPhone,
  digitsOnly,
  formatCPF,
  formatCNPJ,
  validateCPF,
  validateCNPJ,
} from '@/core/validators/documento';
import { useSearchClients } from '@/modules/clientes/http';
import type { RenovacaoPendente } from '@/types/area-trabalho';

interface DadosExtras {
  email?: string;
  telefone?: string;
  celular?: string;
  cpf?: string;
  cnpj?: string;
}

interface IniciarRenovacaoDialogProps {
  open: boolean;
  renovacao: RenovacaoPendente | null;
  onClose: () => void;
  onConfirm: (dadosExtras?: DadosExtras) => Promise<void>;
  onAtribuirCliente?: (novoClienteId: string) => Promise<void>;
}

function temContato(renovacao: RenovacaoPendente | null): boolean {
  if (!renovacao) return true;
  const c = renovacao.cliente;
  return !!(c?.email?.trim() || c?.telefone?.trim() || c?.celular?.trim());
}

function temDocumento(renovacao: RenovacaoPendente | null): boolean {
  if (!renovacao) return true;
  const c = renovacao.cliente;
  if (c?.tipoPessoa === 'PF') return digitsOnly(c?.cpf).length === 11;
  if (c?.tipoPessoa === 'PJ') return digitsOnly(c?.cnpj).length === 14;
  return true;
}

function isEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

type Modo = 'preencher' | 'atribuir';

export function IniciarRenovacaoDialog({
  open,
  renovacao,
  onClose,
  onConfirm,
  onAtribuirCliente,
}: IniciarRenovacaoDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [modo, setModo] = useState<Modo>('preencher');

  // Estado do modo "preencher"
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [documento, setDocumento] = useState('');

  // Estado do modo "atribuir"
  const [busca, setBusca] = useState('');
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string | null>(
    null,
  );

  const precisaContato = useMemo(() => !temContato(renovacao), [renovacao]);
  const precisaDocumento = useMemo(
    () => !temDocumento(renovacao),
    [renovacao],
  );

  const tipoPessoa = renovacao?.cliente?.tipoPessoa;

  const { data: resultadosBusca = [], isFetching: buscando } =
    useSearchClients(busca);

  // Resetar tudo ao abrir/close
  useEffect(() => {
    if (open) {
      setModo('preencher');
      setEmail('');
      setTelefone('');
      setDocumento('');
      setBusca('');
      setClienteSelecionadoId(null);
    }
  }, [open]);

  // ---------- Validação modo "preencher" ----------
  const emailLimpo = email.trim();
  const telefoneDigits = digitsOnly(telefone);
  const documentoDigits = digitsOnly(documento);
  const emailOk = emailLimpo === '' || isEmailValido(emailLimpo);
  const telefoneOk = telefoneDigits === '' || telefoneDigits.length >= 10;
  const algumContatoPreenchido = !!emailLimpo || telefoneDigits.length >= 10;
  const contatoOk = precisaContato
    ? algumContatoPreenchido && emailOk && telefoneOk
    : true;

  const documentoOk = (() => {
    if (!precisaDocumento) return true;
    if (tipoPessoa === 'PF') return validateCPF(documentoDigits);
    if (tipoPessoa === 'PJ') return validateCNPJ(documentoDigits);
    return true;
  })();

  const podeConfirmarPreencher = contatoOk && documentoOk && !isLoading;

  // ---------- Validação modo "atribuir" ----------
  const clienteAtualId = renovacao?.cliente?.id;
  const resultadosFiltrados = useMemo(() => {
    if (!tipoPessoa) return resultadosBusca;
    return resultadosBusca.filter(
      (c: any) => c.tipoPessoa === tipoPessoa && c.id !== clienteAtualId,
    );
  }, [resultadosBusca, tipoPessoa, clienteAtualId]);

  if (!renovacao) return null;

  const nomeCliente =
    renovacao.cliente.nome || renovacao.cliente.razaoSocial || 'Cliente';

  const podeConfirmarAtribuir = !!clienteSelecionadoId && !isLoading;

  // ---------- Handlers ----------
  const handleConfirmPreencher = async () => {
    if (!podeConfirmarPreencher) return;
    try {
      setIsLoading(true);
      const dadosExtras: DadosExtras = {};
      if (precisaContato) {
        if (emailLimpo) dadosExtras.email = emailLimpo;
        if (telefoneDigits.length >= 10) dadosExtras.telefone = telefoneDigits;
      }
      if (precisaDocumento) {
        if (tipoPessoa === 'PF') dadosExtras.cpf = documentoDigits;
        if (tipoPessoa === 'PJ') dadosExtras.cnpj = documentoDigits;
      }
      const payload =
        Object.keys(dadosExtras).length > 0 ? dadosExtras : undefined;
      await onConfirm(payload);
      onClose();
    } catch {
      // Erros tratados pelo chamador (toast). Mantém o dialog aberto.
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAtribuir = async () => {
    if (!podeConfirmarAtribuir || !clienteSelecionadoId) return;
    if (!onAtribuirCliente) return;
    try {
      setIsLoading(true);
      await onAtribuirCliente(clienteSelecionadoId);
      onClose();
    } catch {
      // mantém dialog aberto, erro exibido pelo chamador
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) onClose();
  };

  const precisaAlgo = precisaContato || precisaDocumento;
  const podeAtribuir = !!onAtribuirCliente && precisaAlgo;

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Iniciar Renovação
          </AlertDialogTitle>
          <AlertDialogDescription>
            {modo === 'preencher' ? (
              <>
                Deseja iniciar o processo de renovação para{' '}
                <span className="font-medium text-foreground">
                  {nomeCliente}
                </span>
                ? Uma cotação será criada automaticamente.
              </>
            ) : (
              <>
                Selecione o cliente já cadastrado correspondente a{' '}
                <span className="font-medium text-foreground">
                  {nomeCliente}
                </span>
                .
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {modo === 'preencher' && precisaAlgo && (
          <div className="space-y-3">
            {podeAtribuir && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => setModo('atribuir')}
                disabled={isLoading}
              >
                <UserSearch className="h-4 w-4" />
                Este cliente já existe? Atribuir a um cliente cadastrado
              </Button>
            )}

            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700/60 dark:bg-amber-950/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
                <div className="w-full space-y-3">
                  <p className="text-sm text-amber-900 dark:text-amber-200">
                    {precisaContato && precisaDocumento
                      ? 'Contato e documento do cliente estão incompletos. Preencha abaixo para prosseguir.'
                      : precisaContato
                        ? 'Este cliente ainda não possui contato cadastrado. Informe pelo menos um (e-mail ou telefone).'
                        : `Este cliente ainda não possui ${
                            tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'
                          } cadastrado.`}
                  </p>

                  {precisaContato && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="renov-email">E-mail</Label>
                        <Input
                          id="renov-email"
                          type="email"
                          placeholder="cliente@exemplo.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isLoading}
                        />
                        {!emailOk && (
                          <p className="text-xs text-destructive">
                            E-mail inválido
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="renov-telefone">
                          Telefone / Celular
                        </Label>
                        <Input
                          id="renov-telefone"
                          type="tel"
                          placeholder="(11) 99999-9999"
                          value={telefone}
                          onChange={(e) =>
                            setTelefone(formatPhone(e.target.value))
                          }
                          disabled={isLoading}
                        />
                        {!telefoneOk && (
                          <p className="text-xs text-destructive">
                            Telefone deve ter ao menos 10 dígitos
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {precisaDocumento && (
                    <div className="space-y-1.5">
                      <Label htmlFor="renov-documento">
                        {tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'}
                      </Label>
                      <Input
                        id="renov-documento"
                        inputMode="numeric"
                        placeholder={
                          tipoPessoa === 'PF'
                            ? '000.000.000-00'
                            : '00.000.000/0000-00'
                        }
                        value={documento}
                        onChange={(e) => {
                          const raw = digitsOnly(e.target.value);
                          if (tipoPessoa === 'PF') {
                            setDocumento(formatCPF(raw.slice(0, 11)));
                          } else {
                            setDocumento(formatCNPJ(raw.slice(0, 14)));
                          }
                        }}
                        disabled={isLoading}
                      />
                      {documentoDigits.length > 0 && !documentoOk && (
                        <p className="text-xs text-destructive">
                          {tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'} inválido
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {modo === 'atribuir' && (
          <div className="space-y-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 self-start"
              onClick={() => {
                setClienteSelecionadoId(null);
                setModo('preencher');
              }}
              disabled={isLoading}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar e preencher dados
            </Button>

            <div className="space-y-1.5">
              <Label htmlFor="renov-busca">Buscar cliente</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="renov-busca"
                  className="pl-9"
                  placeholder="Nome, CPF, CNPJ ou e-mail (mín. 3 caracteres)"
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    setClienteSelecionadoId(null);
                  }}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-md border">
              {busca.trim().length < 3 ? (
                <p className="p-3 text-sm text-muted-foreground">
                  Digite ao menos 3 caracteres para buscar.
                </p>
              ) : buscando ? (
                <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando...
                </div>
              ) : resultadosFiltrados.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">
                  Nenhum cliente {tipoPessoa === 'PF' ? 'PF' : 'PJ'} encontrado.
                </p>
              ) : (
                <ul className="divide-y">
                  {resultadosFiltrados.map((c: any) => {
                    const selected = clienteSelecionadoId === c.id;
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
                          onClick={() => setClienteSelecionadoId(c.id)}
                          disabled={isLoading}
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
        )}

        <AlertDialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          {modo === 'preencher' ? (
            <Button
              onClick={handleConfirmPreencher}
              disabled={!podeConfirmarPreencher}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Iniciar
            </Button>
          ) : (
            <Button
              onClick={handleConfirmAtribuir}
              disabled={!podeConfirmarAtribuir}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Atribuir e iniciar
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
