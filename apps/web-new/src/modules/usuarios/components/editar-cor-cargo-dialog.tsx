
import { useState } from 'react';
import { Palette, Loader2 } from 'lucide-react';
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
import { useUpdateCargoCor } from '@/modules/cargos/http';
import type { Cargo } from '@/modules/cargos/http';

interface EditarCorCargoDialogProps {
  cargo: Cargo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const CORES_DISPONIVEIS = [
  { nome: 'Azul', valor: '#3b82f6' },
  { nome: 'Verde', valor: '#22c55e' },
  { nome: 'Roxo', valor: '#a855f7' },
  { nome: 'Laranja', valor: '#f97316' },
  { nome: 'Rosa', valor: '#ec4899' },
  { nome: 'Vermelho', valor: '#ef4444' },
  { nome: 'Amarelo', valor: '#eab308' },
  { nome: 'Índigo', valor: '#6366f1' },
  { nome: 'Turquesa', valor: '#14b8a6' },
  { nome: 'Ciano', valor: '#06b6d4' },
  { nome: 'Dourado', valor: '#fbbf24' },
  { nome: 'Esmeralda', valor: '#10b981' },
];

export function EditarCorCargoDialog({
  cargo,
  open,
  onOpenChange,
  onSuccess,
}: EditarCorCargoDialogProps) {
  const [corSelecionada, setCorSelecionada] = useState<string>('#3b82f6');

  const { mutate: updateCor, isPending } = useUpdateCargoCor();

  // Reset form quando o dialog abrir com novo cargo
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && cargo) {
      setCorSelecionada(cargo.cor || '#3b82f6');
    } else if (!newOpen) {
      // Reset form quando fechar
      setCorSelecionada('#3b82f6');
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!cargo) return;

    updateCor(
      {
        cargoId: cargo.id,
        cor: corSelecionada,
      },
      {
        onSuccess: () => {
          handleOpenChange(false);
          onSuccess?.();
        },
      },
    );
  };

  if (!cargo) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Alterar Cor do Cargo
            </DialogTitle>
            <DialogDescription>
              Personalize a cor do cargo "{cargo.nomeCargo}".
              {cargo.isAdmin && (
                <span className="block mt-2 text-amber-600 dark:text-amber-500">
                  ⭐ Cargo de Administrador - apenas a cor pode ser alterada
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Preview da cor atual */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-md border-2 border-border shadow-sm"
                  style={{ backgroundColor: corSelecionada }}
                />
                <div>
                  <p className="text-sm font-medium">{cargo.nomeCargo}</p>
                  <p className="text-xs text-muted-foreground">
                    Cor atual: {corSelecionada.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>

            {/* Seletor de cores */}
            <div className="space-y-2">
              <Label>Escolha uma cor</Label>
              <div className="grid grid-cols-6 gap-2">
                {CORES_DISPONIVEIS.map((cor) => (
                  <button
                    key={cor.valor}
                    type="button"
                    className={`h-12 rounded-md border-2 transition-all hover:scale-110 ${
                      corSelecionada === cor.valor
                        ? 'border-foreground ring-2 ring-offset-2 ring-offset-background'
                        : 'border-transparent hover:border-muted-foreground/30'
                    }`}
                    style={{ backgroundColor: cor.valor }}
                    onClick={() => setCorSelecionada(cor.valor)}
                    title={cor.nome}
                  />
                ))}
              </div>
            </div>

            {/* Input manual de cor (opcional) */}
            <div className="space-y-2">
              <Label htmlFor="cor-custom">Ou insira um código hexadecimal</Label>
              <div className="flex gap-2">
                <input
                  id="cor-custom"
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="#3b82f6"
                  value={corSelecionada}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                      setCorSelecionada(value);
                    }
                  }}
                  maxLength={7}
                />
                <input
                  type="color"
                  value={corSelecionada}
                  onChange={(e) => setCorSelecionada(e.target.value)}
                  className="h-10 w-16 rounded-md border border-input cursor-pointer"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !corSelecionada}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Cor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
