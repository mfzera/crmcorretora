
import { useState, useEffect } from 'react';
import { formatDateBR } from '@/core/utils/date-utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FileCheck,
  Loader2,
  Calendar,
  FileText,
  CalendarCheck,
  ArrowRight,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/core/ui/form';
import { Input } from '@/core/ui/input';
import type { DocumentoVenda } from '@/types/documento-venda';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { useFinalizarCadastro } from '@/modules/documentos-venda/http';
import { Separator } from '@/core/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/core/ui/alert';
import { Badge } from '@/core/ui/badge';
import { useDocumentosVendaAguardandoCadastro } from '@/modules/documentos-venda/http';
import { useNavigate } from '@tanstack/react-router';
import { useDocumentoLock } from '@/core/hooks/use-documento-lock';

const cadastroSchema = z.object({
  numeroApolice: z.string().optional(),
  dataEmissao: z.string().optional(),
  itemDescricao: z.string().max(500).optional(),
});

type CadastroForm = z.infer<typeof cadastroSchema>;

interface FinalizarCadastroDialogProps {
  venda: DocumentoVenda | null;
  open: boolean;
  onClose: () => void;
}

export function FinalizarCadastroDialog({
  venda,
  open,
  onClose,
}: FinalizarCadastroDialogProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [renovacaoData, setRenovacaoData] = useState<any>(null);
  const { mutate: finalizarCadastro } = useFinalizarCadastro();
  const { data: vendasPendentes = [] } = useDocumentosVendaAguardandoCadastro();
  

  // Hook de gerenciamento de lock
  const { lockStatus, acquireLock, releaseLock, isLocking } = useDocumentoLock(
    venda?.id || null,
    open,
  );

  const form = useForm<CadastroForm>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: {
      numeroApolice: '',
      dataEmissao: '',
      itemDescricao: (venda as any)?.itemDescricao || '',
    },
  });

  // Tentar adquirir o lock quando o dialog abrir
  useEffect(() => {
    if (open && venda?.id && venda.status === 'AGUARDANDO_CADASTRO') {
      acquireLock(venda.id).catch(() => {
        // Erro já é tratado no hook
      });
    }
  }, [open, venda?.id, venda?.status]);

  if (!venda) return null;

  const nomeCliente =
    venda.cliente.tipoPessoa === 'PF'
      ? venda.cliente.nome
      : venda.cliente.razaoSocial;

  const handleSubmit = async (data: CadastroForm) => {
    // Prevenir múltiplos cliques
    if (isLoading) return;

    try {
      setIsLoading(true);

      finalizarCadastro(
        {
          documentoId: venda.id,
          numeroApolice: data.numeroApolice || undefined,
          dataEmissao: data.dataEmissao || undefined,
          itemDescricao: data.itemDescricao || undefined,
        },
        {
          onSuccess: (response) => {
            toast.success('Cadastro finalizado com sucesso!');
            setRenovacaoData(response.renovacao);
            setShowSuccess(true);
            form.reset();
          },
          onError: (error: unknown) => {
            toast.error(handleApiError(error));
            setIsLoading(false);
          },
        },
      );
    } catch (error) {
      toast.error(handleApiError(error));
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setShowSuccess(false);
    setRenovacaoData(null);
    setIsLoading(false);
    onClose();
  };

  const handleContinuarCadastrando = () => {
    handleClose();
  };

  const handleIrParaWorkspace = () => {
    handleClose();
    navigate({ to: '/workspace2' });
  };

  const vendasRestantes = vendasPendentes.filter(
    (v: any) => v.id !== venda?.id,
  ).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        {venda.status !== 'AGUARDANDO_CADASTRO' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                <FileCheck className="h-5 w-5" />
                Venda Já Processada
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Esta venda já foi processada e está com status{' '}
                <strong>{venda.status}</strong>. Não é possível finalizar o
                cadastro novamente.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </>
        ) : showSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-500">
                <FileCheck className="h-5 w-5" />
                Cadastro Finalizado com Sucesso!
              </DialogTitle>
              <DialogDescription>
                A venda foi ativada e a renovação foi criada automaticamente
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Info da venda ativada */}
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileCheck className="h-4 w-4 text-green-600 dark:text-green-500" />
                  <h3 className="font-semibold text-sm">
                    Venda #{venda?.numero} - ATIVO
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cliente:</span>
                    <p className="font-medium">{nomeCliente}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Produto:</span>
                    <p className="font-medium">{venda?.produto.nomeProduto}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vigência:</span>
                    <p className="font-medium">
                      {venda?.vigenciaInicio ? formatDateBR(venda.vigenciaInicio) : ''}{' '}
                      até{' '}
                      {venda?.vigenciaFim ? formatDateBR(venda.vigenciaFim) : ''}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Prêmio Líquido:
                    </span>
                    <p className="font-medium">
                      {venda?.premioLiquido
                        ? Number(venda.premioLiquido).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })
                        : 'Não informado'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Info da renovação criada */}
              {renovacaoData && (
                <Alert>
                  <CalendarCheck className="h-4 w-4" />
                  <AlertTitle>Renovação Criada Automaticamente</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>
                      A renovação{' '}
                      <strong>
                        {renovacaoData.renovacao?.numeroDocumento}
                      </strong>{' '}
                      foi criada e aparecerá no workspace a partir de{' '}
                      <strong>
                        {new Date(
                          renovacaoData.dataInicioJanela,
                        ).toLocaleDateString('pt-BR')}
                      </strong>{' '}
                      (45 dias antes do vencimento)
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                      <ArrowRight className="h-3 w-3" />
                      <span>
                        Nova vigência:{' '}
                        {new Date(
                          renovacaoData.renovacao?.vigenciaInicio,
                        ).toLocaleDateString('pt-BR')}{' '}
                        até{' '}
                        {new Date(
                          renovacaoData.renovacao?.vigenciaFim,
                        ).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Contador de pendências */}
              {vendasRestantes > 0 && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm">
                    Você ainda tem <strong>{vendasRestantes}</strong>{' '}
                    {vendasRestantes === 1
                      ? 'venda aguardando'
                      : 'vendas aguardando'}{' '}
                    cadastro
                  </span>
                </div>
              )}
            </div>

            <DialogFooter>
              {vendasRestantes > 0 ? (
                <>
                  <Button variant="outline" onClick={handleIrParaWorkspace}>
                    Ir para Workspace
                  </Button>
                  <Button onClick={handleContinuarCadastrando}>
                    Cadastrar Próxima <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handleClose}>
                    Fechar
                  </Button>
                  <Button onClick={handleIrParaWorkspace}>
                    Ver no Workspace
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                Finalizar Cadastro
              </DialogTitle>
              <DialogDescription>
                Complete o cadastro da venda e torne-a ativa
              </DialogDescription>
            </DialogHeader>

            {/* Alerta de bloqueio */}
            {lockStatus?.isLocked && !lockStatus?.isLockedByCurrentUser && (
              <Alert variant="destructive">
                <Lock className="h-4 w-4" />
                <AlertTitle>Documento em Edição</AlertTitle>
                <AlertDescription>
                  Este documento está sendo editado por{' '}
                  <strong>{lockStatus.lockedBy?.nome}</strong>. Você não pode
                  finalizar o cadastro até que seja liberado.
                </AlertDescription>
              </Alert>
            )}

            {lockStatus?.isLockedByCurrentUser && (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertTitle>Documento Bloqueado para Você</AlertTitle>
                <AlertDescription>
                  Este documento está bloqueado para sua edição exclusiva.
                  Outros usuários não poderão editá-lo enquanto você estiver
                  aqui.
                </AlertDescription>
              </Alert>
            )}

            {/* Informações da Venda */}
            <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
              <h3 className="font-semibold text-sm">Informações da Venda</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Número:</span>
                  <p className="font-medium">{venda.numero}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cliente:</span>
                  <p className="font-medium">{nomeCliente}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Produto:</span>
                  <p className="font-medium">{venda.produto.nomeProduto}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Prêmio Líquido:</span>
                  <p className="font-medium">
                    {venda.premioLiquido
                      ? venda.premioLiquido.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })
                      : 'Não informado'}
                  </p>
                </div>
                {(venda as any).numeroParcelas > 1 && (
                  <div>
                    <span className="text-muted-foreground">Parcelamento:</span>
                    <p className="font-medium">
                      {(venda as any).numeroParcelas}× —{' '}
                      {(venda as any).modalidadePagamentoVendedor === 'PARCELADO'
                        ? 'Vendedor recebe parcelado'
                        : 'Vendedor recebe à vista'}
                    </p>
                  </div>
                )}
                {(venda as any).itemDescricao && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Item:</span>
                    <p className="font-medium">
                      {(venda as any).itemDescricao}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Formulário de Cadastro */}
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4"
              >
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Dados da Apólice (Opcional)
                  </h3>

                  <FormField
                    control={form.control}
                    name="itemDescricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição do Item/Risco</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Placa ABC1234 - Honda Civic 2020"
                            maxLength={500}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Identifique o bem ou risco segurado (veículo, imóvel,
                          etc.)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="numeroApolice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número da Apólice</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 123456789" {...field} />
                        </FormControl>
                        <FormDescription>
                          Informe o número da apólice caso já tenha sido emitida
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dataEmissao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Emissão</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <Input type="date" {...field} />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Data em que a apólice foi emitida
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="rounded-lg border bg-muted p-4 text-sm">
                  <p className="font-medium mb-1">ℹ️ Informações importantes</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Os dados da apólice são opcionais</li>
                    <li>
                      Você pode finalizar o cadastro sem informar a apólice
                    </li>
                    <li>A apólice pode ser adicionada posteriormente</li>
                    <li>Ao finalizar, a venda ficará com status ATIVO</li>
                  </ul>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      isLoading ||
                      isLocking ||
                      (lockStatus?.isLocked &&
                        !lockStatus?.isLockedByCurrentUser)
                    }
                  >
                    {(isLoading || isLocking) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {lockStatus?.isLocked &&
                    !lockStatus?.isLockedByCurrentUser ? (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Bloqueado por {lockStatus.lockedBy?.nome}
                      </>
                    ) : (
                      'Finalizar Cadastro'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
