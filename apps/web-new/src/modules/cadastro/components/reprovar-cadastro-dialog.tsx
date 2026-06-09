
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { XCircle, Loader2, AlertTriangle } from 'lucide-react';
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
import { Textarea } from '@/core/ui/textarea';
import { Alert, AlertDescription } from '@/core/ui/alert';
import type { DocumentoVenda } from '@/types/documento-venda';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { useReprovarCadastro } from '@/modules/documentos-venda/http';

const reprovarSchema = z.object({
  motivoRejeicao: z
    .string()
    .min(10, 'O motivo deve ter no mínimo 10 caracteres')
    .max(500, 'O motivo deve ter no máximo 500 caracteres'),
});

type ReprovarForm = z.infer<typeof reprovarSchema>;

interface ReprovarCadastroDialogProps {
  documento: DocumentoVenda | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReprovarCadastroDialog({
  documento,
  open,
  onClose,
  onSuccess,
}: ReprovarCadastroDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { mutate: reprovarCadastro } = useReprovarCadastro();

  const form = useForm<ReprovarForm>({
    resolver: zodResolver(reprovarSchema),
    defaultValues: {
      motivoRejeicao: '',
    },
  });

  if (!documento) return null;

  const nomeCliente =
    documento.cliente.tipoPessoa === 'PF'
      ? documento.cliente.nome
      : documento.cliente.razaoSocial;

  const handleSubmit = async (data: ReprovarForm) => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      reprovarCadastro(
        {
          documentoId: documento.id,
          motivoRejeicao: data.motivoRejeicao,
        },
        {
          onSuccess: () => {
            toast.success('Cadastro reprovado com sucesso!');
            form.reset();
            onClose();
            onSuccess?.();
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
    if (!isLoading) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Reprovar Cadastro
          </DialogTitle>
          <DialogDescription>
            Informe o motivo da reprovação. O vendedor será notificado para
            corrigir os dados.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive" className="my-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Esta ação irá rejeitar o cadastro e retornar o documento para o
            status "Venda Confirmada" para que sejam feitas as correções
            necessárias.
          </AlertDescription>
        </Alert>

        {/* Informações do Documento */}
        <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
          <h3 className="font-semibold text-sm">Informações do Documento</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Número:</span>
              <p className="font-medium">{documento.numero}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Cliente:</span>
              <p className="font-medium">{nomeCliente}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Produto:</span>
              <p className="font-medium">{documento.produto.nomeProduto}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Vendedor:</span>
              <p className="font-medium">
                {documento.vendedor?.nome || 'Não atribuído'}
              </p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="motivoRejeicao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Motivo da Reprovação <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva detalhadamente o motivo da reprovação..."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Mínimo de 10 caracteres. Seja claro e específico sobre o que
                    precisa ser corrigido.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
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
                variant="destructive"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reprovar Cadastro
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
