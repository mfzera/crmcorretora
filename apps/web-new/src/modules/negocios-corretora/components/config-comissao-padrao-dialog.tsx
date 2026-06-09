
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Label } from '@/core/ui/label';
import { Input } from '@/core/ui/input';
import { Separator } from '@/core/ui/separator';
import { Badge } from '@/core/ui/badge';
import { toast } from 'sonner';
import { Percent, Users, Info } from 'lucide-react';

interface ConfigComissaoPadraoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfigComissaoPadraoDialog({
  open,
  onOpenChange,
}: ConfigComissaoPadraoDialogProps) {
  const [percentualCorretora, setPercentualCorretora] = useState('30');
  const [percentualPrincipal1Vendedor, setPercentualPrincipal1Vendedor] = useState('100');
  const [percentualPrincipal2Vendedores, setPercentualPrincipal2Vendedores] = useState('50');
  const [percentualSecundario2Vendedores, setPercentualSecundario2Vendedores] = useState('50');

  useEffect(() => {
    if (open) {
      // Carregar valores salvos do localStorage
      const savedPercentualCorretora = localStorage.getItem('comissao_corretora_percentual');
      const savedPercPrincipal1V = localStorage.getItem('comissao_principal_1vendedor');
      const savedPercPrincipal2V = localStorage.getItem('comissao_principal_2vendedores');
      const savedPercSecundario2V = localStorage.getItem('comissao_secundario_2vendedores');

      if (savedPercentualCorretora) setPercentualCorretora(savedPercentualCorretora);
      if (savedPercPrincipal1V) setPercentualPrincipal1Vendedor(savedPercPrincipal1V);
      if (savedPercPrincipal2V) setPercentualPrincipal2Vendedores(savedPercPrincipal2V);
      if (savedPercSecundario2V) setPercentualSecundario2Vendedores(savedPercSecundario2V);
    }
  }, [open]);

  const validarPercentuais = (): string | null => {
    const percCorretora = parseFloat(percentualCorretora) || 0;
    const percPrincipal1V = parseFloat(percentualPrincipal1Vendedor) || 0;
    const percPrincipal2V = parseFloat(percentualPrincipal2Vendedores) || 0;
    const percSecundario2V = parseFloat(percentualSecundario2Vendedores) || 0;

    if (percCorretora < 0 || percCorretora > 100) {
      return 'Percentual da corretora deve estar entre 0 e 100';
    }

    if (percPrincipal1V !== 100) {
      return 'Para 1 vendedor, o percentual deve ser 100%';
    }

    if (percPrincipal2V + percSecundario2V !== 100) {
      return 'Para 2 vendedores, a soma deve ser 100%';
    }

    return null;
  };

  const handleSalvar = () => {
    const erro = validarPercentuais();
    if (erro) {
      toast.error('Erro na validação', { description: erro });
      return;
    }

    // Salvar no localStorage
    localStorage.setItem('comissao_corretora_percentual', percentualCorretora);
    localStorage.setItem('comissao_principal_1vendedor', percentualPrincipal1Vendedor);
    localStorage.setItem('comissao_principal_2vendedores', percentualPrincipal2Vendedores);
    localStorage.setItem('comissao_secundario_2vendedores', percentualSecundario2Vendedores);

    toast.success('Configuração padrão salva!', {
      description: 'Estes valores serão usados como padrão para novos negócios',
    });
    onOpenChange(false);
  };

  const calcularExemplo = (valorTotal: number) => {
    const percCorretora = parseFloat(percentualCorretora) || 0;
    const valorCorretora = (valorTotal * percCorretora) / 100;
    const valorRestante = valorTotal - valorCorretora;
    return { valorCorretora, valorRestante };
  };

  const exemplo1V = calcularExemplo(1000);
  const valorPrincipal1V = exemplo1V.valorRestante * (parseFloat(percentualPrincipal1Vendedor) / 100);

  const exemplo2V = calcularExemplo(1000);
  const valorPrincipal2V = exemplo2V.valorRestante * (parseFloat(percentualPrincipal2Vendedores) / 100);
  const valorSecundario2V = exemplo2V.valorRestante * (parseFloat(percentualSecundario2Vendedores) / 100);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="size-5 text-blue-600" />
            Configuração Padrão de Comissão - Negócios Corretora
          </DialogTitle>
          <DialogDescription>
            Defina os percentuais padrão para divisão de comissão nos negócios da corretora
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
            <div className="flex gap-3">
              <Info className="size-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Configuração Global
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Estes percentuais serão usados como valores padrão ao criar novos negócios da corretora.
                  Você poderá ajustar individualmente cada negócio posteriormente se necessário.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Percentual Corretora */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Percent className="size-4" />
              Percentual da Corretora
            </div>

            <div className="space-y-2">
              <Label htmlFor="percentualCorretora">
                Percentual fixo que a corretora recebe (%)
              </Label>
              <Input
                id="percentualCorretora"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={percentualCorretora}
                onChange={(e) => setPercentualCorretora(e.target.value)}
                placeholder="30"
              />
              <p className="text-sm text-muted-foreground">
                Este percentual será descontado do total antes de dividir entre vendedores
              </p>
            </div>
          </div>

          <Separator />

          {/* Configuração para 1 Vendedor */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="size-4" />
              <h3 className="text-sm font-semibold">Quando há 1 Vendedor</h3>
              <Badge variant="secondary">Automático</Badge>
            </div>

            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="space-y-2">
                <Label htmlFor="percentualPrincipal1V">
                  Vendedor Principal (%)
                </Label>
                <Input
                  id="percentualPrincipal1V"
                  type="number"
                  value={percentualPrincipal1Vendedor}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Vendedor único sempre recebe 100% do valor restante após desconto da corretora
                </p>
              </div>

              {/* Exemplo 1V */}
              <div className="mt-4 pt-4 border-t space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  EXEMPLO: Comissão total de R$ 1.000,00
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Corretora ({percentualCorretora}%):</span>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency(exemplo1V.valorCorretora)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vendedor (100%):</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(valorPrincipal1V)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Configuração para 2 Vendedores */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="size-4" />
              <h3 className="text-sm font-semibold">Quando há 2 Vendedores</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="percentualPrincipal2V">
                  Vendedor Principal (%)
                </Label>
                <Input
                  id="percentualPrincipal2V"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={percentualPrincipal2Vendedores}
                  onChange={(e) => setPercentualPrincipal2Vendedores(e.target.value)}
                  placeholder="50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="percentualSecundario2V">
                  Vendedor Secundário (%)
                </Label>
                <Input
                  id="percentualSecundario2V"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={percentualSecundario2Vendedores}
                  onChange={(e) => setPercentualSecundario2Vendedores(e.target.value)}
                  placeholder="50"
                />
              </div>
            </div>

            {parseFloat(percentualPrincipal2Vendedores || '0') + parseFloat(percentualSecundario2Vendedores || '0') !== 100 && (
              <p className="text-sm text-destructive">
                A soma deve ser 100%. Atual: {(parseFloat(percentualPrincipal2Vendedores || '0') + parseFloat(percentualSecundario2Vendedores || '0')).toFixed(2)}%
              </p>
            )}

            {/* Exemplo 2V */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                EXEMPLO: Comissão total de R$ 1.000,00
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Corretora ({percentualCorretora}%):</span>
                  <span className="font-semibold text-blue-600">
                    {formatCurrency(exemplo2V.valorCorretora)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Restante para vendedores:</span>
                  <span>{formatCurrency(exemplo2V.valorRestante)}</span>
                </div>
                <div className="flex justify-between pl-4">
                  <span>• Principal ({percentualPrincipal2Vendedores}%):</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(valorPrincipal2V)}
                  </span>
                </div>
                <div className="flex justify-between pl-4">
                  <span>• Secundário ({percentualSecundario2Vendedores}%):</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(valorSecundario2V)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSalvar}
            disabled={!!validarPercentuais()}
          >
            Salvar Configuração Padrão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
