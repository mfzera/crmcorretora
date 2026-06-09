
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { Separator } from '@/core/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { Textarea } from '@/core/ui/textarea';
import { Label } from '@/core/ui/label';
import { AlertCircle, Check, X, User, Calendar, FileText } from 'lucide-react';
import {
  useTransferenciasPendentes,
  useAceitarTransferencia,
  useRecusarTransferencia,
  type TransferenciaRenovacao,
} from '@/modules/transferencias/http';
import { dayjs } from '@/core/utils/date-utils';

export function TransferenciasPendentesCard() {
  const { data: transferencias, isLoading } = useTransferenciasPendentes();
  const aceitarMutation = useAceitarTransferencia();
  const recusarMutation = useRecusarTransferencia();

  const [selectedTransferencia, setSelectedTransferencia] =
    useState<TransferenciaRenovacao | null>(null);
  const [showRecusarDialog, setShowRecusarDialog] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState('');

  if (isLoading || !transferencias || transferencias.length === 0) {
    return null;
  }

  const handleAceitar = async (transferencia: TransferenciaRenovacao) => {
    await aceitarMutation.mutateAsync(transferencia.id);
  };

  const handleRecusar = async () => {
    if (!selectedTransferencia) return;
    await recusarMutation.mutateAsync({
      transferenciaId: selectedTransferencia.id,
      motivo: motivoRecusa,
    });
    setShowRecusarDialog(false);
    setSelectedTransferencia(null);
    setMotivoRecusa('');
  };

  const openRecusarDialog = (transferencia: TransferenciaRenovacao) => {
    setSelectedTransferencia(transferencia);
    setShowRecusarDialog(true);
  };

  return (
    <>
      <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-500/30 dark:bg-orange-950/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Transferências Pendentes
            <Badge variant="secondary" className="ml-auto">
              {transferencias.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {transferencias.map((transferencia) => (
            <div
              key={transferencia.id}
              className="p-4 bg-white dark:bg-card rounded-lg border dark:border-border space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {transferencia.solicitante.nome}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      quer transferir{' '}
                      <strong>{transferencia.itens.length}</strong>{' '}
                      {transferencia.itens.length === 1
                        ? 'renovação'
                        : 'renovações'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {dayjs(transferencia.criadoEm).format("DD/MM/YYYY [às] HH:mm")}
                  </div>
                </div>
              </div>

              {transferencia.observacoes && (
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-muted-foreground">
                    {transferencia.observacoes}
                  </p>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Renovações incluídas:</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {transferencia.itens.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-muted/50 rounded"
                    >
                      <span className="font-medium text-foreground">
                        {item.renovacao?.cliente?.nome ||
                          item.renovacao?.cliente?.nomeFantasia ||
                          item.renovacao?.cliente?.razaoSocial ||
                          'Cliente não informado'}
                      </span>
                      <span className="text-muted-foreground">
                        Vence em{' '}
                        {dayjs(item.renovacao.dataVencimento + 'T12:00:00Z').format('DD/MM/YYYY')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => handleAceitar(transferencia)}
                  disabled={aceitarMutation.isPending}
                  className="flex-1"
                  size="sm"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Aceitar
                </Button>
                <Button
                  onClick={() => openRecusarDialog(transferencia)}
                  disabled={recusarMutation.isPending}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Recusar
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Dialog de Recusa */}
      <Dialog open={showRecusarDialog} onOpenChange={setShowRecusarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar Transferência</DialogTitle>
            <DialogDescription>
              Você tem certeza que deseja recusar esta transferência?
              Opcionalmente, informe o motivo da recusa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo (opcional)</Label>
            <Textarea
              id="motivo"
              placeholder="Ex: Já estou com muitas renovações no momento..."
              value={motivoRecusa}
              onChange={(e) => setMotivoRecusa(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRecusarDialog(false);
                setMotivoRecusa('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRecusar}
              disabled={recusarMutation.isPending}
              variant="destructive"
            >
              Confirmar Recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
