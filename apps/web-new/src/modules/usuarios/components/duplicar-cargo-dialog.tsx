
import { useState } from 'react';
import { Copy, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Textarea } from '@/core/ui/textarea';
import { useDuplicateCargo } from '@/modules/cargos/http';
import type { Cargo } from '@/modules/cargos/http';

interface DuplicarCargoDialogProps {
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
];

export function DuplicarCargoDialog({
  cargo,
  open,
  onOpenChange,
  onSuccess,
}: DuplicarCargoDialogProps) {
  const [nomeCargo, setNomeCargo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [corSelecionada, setCorSelecionada] = useState<string>('#3b82f6');

  const { mutate: duplicarCargo, isPending } = useDuplicateCargo();

  // Reset form quando o dialog abrir com novo cargo
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && cargo) {
      setNomeCargo(`${cargo.nomeCargo} (Cópia)`);
      setDescricao(cargo.descricao || '');
      setCorSelecionada(cargo.cor || '#3b82f6');
    } else if (!newOpen) {
      // Reset form quando fechar
      setNomeCargo('');
      setDescricao('');
      setCorSelecionada('#3b82f6');
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!cargo || !nomeCargo.trim()) return;

    duplicarCargo(
      {
        cargoId: cargo.id,
        nomeCargo: nomeCargo.trim(),
        descricao: descricao.trim() || undefined,
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
              <Copy className="h-5 w-5" />
              Duplicar Cargo
            </DialogTitle>
            <DialogDescription>
              Crie uma cópia de "{cargo.nomeCargo}" com todas as suas
              permissões. Você pode personalizar o nome, descrição e cor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Nome do Cargo */}
            <div className="space-y-2">
              <Label htmlFor="nomeCargo">
                Nome do Cargo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nomeCargo"
                placeholder="Ex: Vendedor Pleno (Cópia)"
                value={nomeCargo}
                onChange={(e) => setNomeCargo(e.target.value)}
                required
                maxLength={100}
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                placeholder="Descrição opcional do cargo"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>

            {/* Cor */}
            <div className="space-y-2">
              <Label>Cor do Cargo</Label>
              <div className="grid grid-cols-5 gap-2">
                {CORES_DISPONIVEIS.map((cor) => (
                  <button
                    key={cor.valor}
                    type="button"
                    className={`h-10 rounded-md border-2 transition-all hover:scale-110 ${
                      corSelecionada === cor.valor
                        ? 'border-foreground ring-2 ring-offset-2'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: cor.valor }}
                    onClick={() => setCorSelecionada(cor.valor)}
                    title={cor.nome}
                  />
                ))}
              </div>
            </div>

            {/* Informações sobre o cargo original */}
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium mb-1">Cargo Original:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Nome: {cargo.nomeCargo}</li>
                {cargo.isAdmin && <li>• Tipo: Administrador</li>}
                {cargo.isGestor && <li>• Tipo: Gestor</li>}
                {cargo.isVendedor && <li>• Tipo: Vendedor</li>}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Todas as permissões serão copiadas para o novo cargo.
              </p>
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
            <Button type="submit" disabled={isPending || !nomeCargo.trim()}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Duplicar Cargo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
