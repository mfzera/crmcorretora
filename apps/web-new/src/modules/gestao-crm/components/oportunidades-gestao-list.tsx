
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/core/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import {
  useOportunidadesGestao,
  useReatribuirOportunidade,
  useDeletarOportunidadeGestor,
  useVendedoresStats,
} from '../http';
import {
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Flame,
  AlertCircle,
} from 'lucide-react';
import { Skeleton } from '@/core/ui/skeleton';
import { useAuthStore } from '@/infra/auth/auth-store';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/core/ui/alert-dialog';

interface OportunidadesGestaoListProps {
  vendedorId?: string;
}

const statusLabels: Record<string, string> = {
  lead: 'Lead',
  contato_inicial: 'Contato Inicial',
  negociacao: 'Negociação',
  ganha: 'Ganha',
  perdida: 'Perdida',
};

const statusColors: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  contato_inicial:
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  negociacao:
    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  ganha: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  perdida: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const prioridadeColors: Record<string, string> = {
  baixa: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  media:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  alta: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const temperaturaColors: Record<string, string> = {
  frio: 'text-blue-600',
  morno: 'text-orange-600',
  quente: 'text-red-600',
};

export function OportunidadesGestaoList({
  vendedorId,
}: OportunidadesGestaoListProps) {
  const [statusFiltro, setStatusFiltro] = useState<string | undefined>();
  const [vendedorFiltroId, setVendedorFiltroId] = useState<string>('');
  const [oportunidadeParaDeletar, setOportunidadeParaDeletar] = useState<
    string | null
  >(null);
  const [oportunidadeParaReatribuir, setOportunidadeParaReatribuir] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [novoVendedorId, setNovoVendedorId] = useState<string>('');
  const { user } = useAuthStore();
  const isGestorOuAdmin = !!(user?.isAdmin || user?.isGestor);

  const { data: oportunidades = [], isLoading } = useOportunidadesGestao({
    vendedorId: vendedorId ?? (vendedorFiltroId || undefined),
    status: statusFiltro,
    enabled: isGestorOuAdmin,
  });
  const { data: vendedores = [] } = useVendedoresStats({ enabled: isGestorOuAdmin });

  const { mutate: reatribuir, isPending: isPendingReatribuir } =
    useReatribuirOportunidade();
  const { mutate: deletar, isPending: isPendingDeletar } =
    useDeletarOportunidadeGestor();

  const handleReatribuir = () => {
    if (!oportunidadeParaReatribuir || !novoVendedorId) return;

    reatribuir(
      {
        id: oportunidadeParaReatribuir.id,
        novoVendedorId,
      },
      {
        onSuccess: () => {
          toast.success('Oportunidade reatribuída com sucesso!');
          setOportunidadeParaReatribuir(null);
          setNovoVendedorId('');
        },
        onError: (error: unknown) => {
          toast.error(handleApiError(error));
        },
      },
    );
  };

  const handleDeletar = () => {
    if (!oportunidadeParaDeletar) return;

    deletar(oportunidadeParaDeletar, {
      onSuccess: () => {
        toast.success('Oportunidade deletada com sucesso!');
        setOportunidadeParaDeletar(null);
      },
      onError: (error: unknown) => {
        toast.error(handleApiError(error));
      },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Oportunidades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle>Oportunidades</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {!vendedorId && (
                <Select
                  value={vendedorFiltroId || '__all__'}
                  onValueChange={(v) =>
                    setVendedorFiltroId(v === '__all__' ? '' : v)
                  }
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filtrar por vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos os vendedores</SelectItem>
                    {vendedores.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="contato_inicial">Contato Inicial</SelectItem>
                  <SelectItem value="negociacao">Negociação</SelectItem>
                  <SelectItem value="ganha">Ganha</SelectItem>
                  <SelectItem value="perdida">Perdida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {oportunidades.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhuma oportunidade encontrada
            </div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="md:hidden space-y-2">
                {oportunidades.map((oportunidade) => {
                  const dropdown = (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            setOportunidadeParaReatribuir({
                              id: oportunidade.id,
                              nome: oportunidade.nomeCliente,
                            })
                          }
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Reatribuir
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            setOportunidadeParaDeletar(oportunidade.id)
                          }
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                  return (
                    <div
                      key={oportunidade.id}
                      className="border border-border/50 rounded-lg p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`shrink-0 ${statusColors[oportunidade.status]}`}>
                              {statusLabels[oportunidade.status]}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`shrink-0 ${prioridadeColors[oportunidade.prioridade]}`}
                            >
                              <AlertCircle className="mr-1 h-3 w-3" />
                              {oportunidade.prioridade}
                            </Badge>
                            <Flame
                              className={`h-4 w-4 ${temperaturaColors[oportunidade.temperatura]}`}
                            />
                          </div>
                          <p className="font-medium text-sm truncate">
                            {oportunidade.nomeCliente}
                          </p>
                          {oportunidade.vendedor?.nome && (
                            <p className="text-xs text-muted-foreground truncate">
                              {oportunidade.vendedor.nome}
                            </p>
                          )}
                          {oportunidade.premioEstimado && (
                            <p className="text-xs font-medium">
                              {parseFloat(oportunidade.premioEstimado).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                            </p>
                          )}
                        </div>
                        {dropdown}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: tabela */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="hidden md:table-cell">Vendedor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center hidden md:table-cell">Prioridade</TableHead>
                      <TableHead className="text-center hidden md:table-cell">Temperatura</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">Prêmio Est.</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {oportunidades.map((oportunidade) => (
                      <TableRow key={oportunidade.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{oportunidade.nomeCliente}</div>
                            {oportunidade.metadata?.emailCliente && (
                              <div className="text-xs text-muted-foreground">
                                {oportunidade.metadata.emailCliente as string}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div>
                            <div className="font-medium">
                              {oportunidade.vendedor?.nome}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {oportunidade.vendedor?.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[oportunidade.status]}>
                            {statusLabels[oportunidade.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center hidden md:table-cell">
                          <Badge
                            variant="outline"
                            className={prioridadeColors[oportunidade.prioridade]}
                          >
                            <AlertCircle className="mr-1 h-3 w-3" />
                            {oportunidade.prioridade}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center hidden md:table-cell">
                          <Flame
                            className={`mx-auto h-5 w-5 ${temperaturaColors[oportunidade.temperatura]}`}
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium hidden lg:table-cell">
                          {oportunidade.premioEstimado
                            ? parseFloat(
                                oportunidade.premioEstimado,
                              ).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })
                            : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  setOportunidadeParaReatribuir({
                                    id: oportunidade.id,
                                    nome: oportunidade.nomeCliente,
                                  })
                                }
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Reatribuir
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  setOportunidadeParaDeletar(oportunidade.id)
                                }
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Deletar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Reatribuição */}
      <AlertDialog
        open={!!oportunidadeParaReatribuir}
        onOpenChange={(open) => {
          if (!open) {
            setOportunidadeParaReatribuir(null);
            setNovoVendedorId('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reatribuir Oportunidade</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione o novo vendedor para a oportunidade "
              {oportunidadeParaReatribuir?.nome}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={novoVendedorId} onValueChange={setNovoVendedorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                {vendedores.map((vendedor) => (
                  <SelectItem key={vendedor.id} value={vendedor.id}>
                    {vendedor.nome} ({vendedor.stats.total} oportunidades)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPendingReatribuir}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReatribuir}
              disabled={!novoVendedorId || isPendingReatribuir}
            >
              {isPendingReatribuir ? 'Reatribuindo...' : 'Reatribuir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação de Deleção */}
      <AlertDialog
        open={!!oportunidadeParaDeletar}
        onOpenChange={(open) => {
          if (!open) setOportunidadeParaDeletar(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta oportunidade? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPendingDeletar}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletar}
              disabled={isPendingDeletar}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPendingDeletar ? 'Deletando...' : 'Deletar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
