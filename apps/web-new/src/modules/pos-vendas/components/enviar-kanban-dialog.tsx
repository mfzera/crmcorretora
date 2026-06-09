import { useState } from 'react';
import { KanbanSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { useCreateOportunidade } from '@/modules/kanban/http';
import { useVendedores } from '@/modules/usuarios/http';
import type { DocumentoVenda } from '@/types/documento-venda';

interface EnviarKanbanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentos: DocumentoVenda[];
  onSuccess: () => void;
}

function nomeCliente(doc: DocumentoVenda): string {
  return doc.cliente?.nome || doc.cliente?.razaoSocial || 'Cliente';
}

export function EnviarKanbanDialog({
  open,
  onOpenChange,
  documentos,
  onSuccess,
}: EnviarKanbanDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vendedorId, setVendedorId] = useState('');
  const createOportunidade = useCreateOportunidade();
  const { data: vendedores = [] } = useVendedores();

  const handleConfirm = async () => {
    setIsSubmitting(true);
    let criados = 0;
    let erros = 0;

    for (const doc of documentos) {
      try {
        await createOportunidade.mutateAsync({
          nomeCliente: nomeCliente(doc),
          vendedorId: vendedorId || doc.vendedorId,
          clienteId: doc.clienteId,
          temperatura: 'morno',
          premioEstimado: doc.premioLiquido ?? undefined,
          dataVencimento: doc.vigenciaFim || undefined,
          produtoId: doc.produtoId || undefined,
          observacoes: `Cross-selling — apólice ${doc.numero || doc.id}${doc.produto ? ` (${doc.produto.nomeProduto})` : ''}`,
        } as any);
        criados++;
      } catch {
        erros++;
      }
    }

    setIsSubmitting(false);

    if (criados > 0) {
      toast.success(
        erros > 0
          ? `${criados} oportunidade${criados !== 1 ? 's' : ''} criada${criados !== 1 ? 's' : ''} (${erros} falhou)`
          : `${criados} oportunidade${criados !== 1 ? 's' : ''} criada${criados !== 1 ? 's' : ''} no Kanban`,
      );
      onOpenChange(false);
      onSuccess();
    } else {
      toast.error('Não foi possível criar as oportunidades');
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) setVendedorId('');
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <KanbanSquare className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle className="text-base font-semibold">
              Enviar para o Kanban
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Atribuir para
            </label>
            <Select value={vendedorId} onValueChange={setVendedorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Vendedor original de cada seguro" />
              </SelectTrigger>
              <SelectContent>
                {vendedores.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!vendedorId && (
              <p className="text-xs text-muted-foreground">
                Sem seleção, cada oportunidade vai para o vendedor do seguro de origem.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {documentos.length} seguro{documentos.length !== 1 ? 's' : ''} selecionado{documentos.length !== 1 ? 's' : ''}
            </label>
            <div className="max-h-44 overflow-y-auto rounded-md border divide-y text-sm">
              {documentos.map((doc) => (
                <div key={doc.id} className="flex items-start gap-2 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{nomeCliente(doc)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {doc.produto?.nomeProduto}
                      {doc.numero ? ` · ${doc.numero}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            As oportunidades serão criadas como <span className="font-medium">Lead</span> na primeira coluna do Kanban.
          </p>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Criando...' : `Criar ${documentos.length} oportunidade${documentos.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
