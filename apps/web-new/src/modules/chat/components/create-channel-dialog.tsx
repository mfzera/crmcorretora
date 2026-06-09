
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { api } from '@/infra/http/api';
import { useUsuarios } from '@/modules/usuarios/http';
import { usePermissions } from '@/core/hooks/use-permissions';
import { Checkbox } from '@/core/ui/checkbox';
import { ScrollArea } from '@/core/ui/scroll-area';

type CreateChannelDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateChannelDialog({
  open,
  onOpenChange,
}: CreateChannelDialogProps) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [membrosIds, setMembrosIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canViewUsuarios = hasPermission('usuarios:visualizar');

  const { data: usuariosData } = useUsuarios(undefined, {
    enabled: canViewUsuarios,
  });
  const usuarios = usuariosData?.data || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error('O nome do canal é obrigatório');
      return;
    }

    if (membrosIds.length === 0) {
      toast.error('Selecione pelo menos um membro');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('/chat', {
        nome,
        descricao: descricao || undefined,
        membrosIds,
      });

      toast.success('Canal criado com sucesso');

      // Resetar form
      setNome('');
      setDescricao('');
      setMembrosIds([]);
      onOpenChange(false);

      // Atualizar lista de canais
      queryClient.invalidateQueries({ queryKey: ['canais'] });
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMembro = (usuarioId: string) => {
    setMembrosIds((prev) =>
      prev.includes(usuarioId)
        ? prev.filter((id) => id !== usuarioId)
        : [...prev, usuarioId],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Criar Canal</DialogTitle>
            <DialogDescription>
              Crie um novo canal de comunicação para sua equipe
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Canal</Label>
              <Input
                id="nome"
                placeholder="ex: marketing, vendas..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva o propósito deste canal..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Membros</Label>
              <ScrollArea className="h-48 rounded-md border p-3">
                <div className="space-y-2">
                  {usuarios.map((usuario: any) => (
                    <div
                      key={usuario.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`usuario-${usuario.id}`}
                        checked={membrosIds.includes(usuario.id)}
                        onCheckedChange={() => toggleMembro(usuario.id)}
                      />
                      <label
                        htmlFor={`usuario-${usuario.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        <div>
                          <p>{usuario.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {usuario.email}
                          </p>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                {membrosIds.length} membro(s) selecionado(s)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Canal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
