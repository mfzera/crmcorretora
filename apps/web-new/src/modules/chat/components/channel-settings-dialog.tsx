
import { useState } from 'react';
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
import { useUpdateChannel } from '../http';

type ChannelSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canal: {
    id: string;
    nome?: string;
    descricao?: string | null;
  };
};

export function ChannelSettingsDialog({
  open,
  onOpenChange,
  canal,
}: ChannelSettingsDialogProps) {
  const [nome, setNome] = useState(canal.nome || '');
  const [descricao, setDescricao] = useState(canal.descricao || '');
  const atualizarCanal = useUpdateChannel(canal.id);

  const handleSave = async () => {
    if (!nome.trim()) {
      return;
    }

    try {
      await atualizarCanal.mutateAsync({
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      // Erro tratado no hook
    }
  };

  const handleClose = () => {
    setNome(canal.nome || '');
    setDescricao(canal.descricao || '');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configurações do Canal</DialogTitle>
          <DialogDescription>
            Atualize as informações do canal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Canal</Label>
            <Input
              id="nome"
              placeholder="Ex: Vendas, Suporte..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              {nome.length}/50 caracteres
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Textarea
              id="descricao"
              placeholder="Descreva o propósito deste canal..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={200}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {descricao.length}/200 caracteres
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!nome.trim() || atualizarCanal.isPending}
          >
            {atualizarCanal.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
