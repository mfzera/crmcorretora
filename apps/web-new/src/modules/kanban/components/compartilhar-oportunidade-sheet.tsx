
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/core/ui/sheet';
import { Button } from '@/core/ui/button';
import { toast } from 'sonner';
import { MessageCircle, MessageSquare, Copy, Check } from 'lucide-react';
import type { Oportunidade } from '@/types/kanban';
import { PRIORIDADE_LABELS, TEMPERATURA_LABELS } from '@/types/kanban';
import { SelecionarUsuarioChatDialog } from './selecionar-usuario-chat-dialog';

interface CompartilharOportunidadeSheetProps {
  oportunidade: Oportunidade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompartilharOportunidadeSheet({
  oportunidade,
  open,
  onOpenChange,
}: CompartilharOportunidadeSheetProps) {
  const [copied, setCopied] = useState(false);
  const [showUsuarioDialog, setShowUsuarioDialog] = useState(false);

  if (!oportunidade) return null;

  const STATUS_LABELS: Record<string, string> = {
    lead: 'Lead',
    contato_inicial: 'Contato Inicial',
    negociacao: 'Negociação',
    ganha: 'Ganha',
    perdida: 'Perdida',
  };

  // Montar texto para compartilhar
  const getTexto = () => {
    const linhas = [
      `*Oportunidade: ${oportunidade.nomeCliente}*`,
      '',
      `Status: ${STATUS_LABELS[oportunidade.status] || oportunidade.status}`,
      `Prioridade: ${PRIORIDADE_LABELS[oportunidade.prioridade]}`,
      `Temperatura: ${TEMPERATURA_LABELS[oportunidade.temperatura]}`,
    ];

    if (oportunidade.premioEstimado) {
      linhas.push(
        `Prêmio Estimado: R$ ${parseFloat(oportunidade.premioEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      );
    }

    if (oportunidade.vendedor) {
      linhas.push(`Vendedor: ${oportunidade.vendedor.nome}`);
    }

    if (oportunidade.observacoes) {
      linhas.push('', `Observações:`, oportunidade.observacoes);
    }

    return linhas.join('\n');
  };

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(getTexto());
      setCopied(true);
      toast.success('Copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const handleWhatsApp = () => {
    const texto = getTexto();
    // Usar whatsapp:// para melhor suporte a emojis
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleChatEquipe = () => {
    // Salva metadata da oportunidade no sessionStorage
    const metadata = {
      oportunidadeId: oportunidade.id,
      nomeCliente: oportunidade.nomeCliente,
      status: oportunidade.status,
      prioridade: oportunidade.prioridade,
      temperatura: oportunidade.temperatura,
      premioEstimado: oportunidade.premioEstimado,
      vendedor: oportunidade.vendedor
        ? {
            id: oportunidade.vendedor.id,
            nome: oportunidade.vendedor.nome,
          }
        : undefined,
      seguradora: oportunidade.seguradora
        ? {
            id: oportunidade.seguradora.id,
            nome: oportunidade.seguradora.nome,
          }
        : undefined,
      observacoes: oportunidade.observacoes,
    };

    sessionStorage.setItem('oportunidadeMetadata', JSON.stringify(metadata));

    // Abre o dialog de seleção de usuário
    setShowUsuarioDialog(true);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="px-6">
        <SheetHeader>
          <SheetTitle>Compartilhar Oportunidade</SheetTitle>
          <SheetDescription>
            Escolha como deseja compartilhar as informações desta oportunidade
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Preview do texto */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm font-semibold mb-3">Preview:</p>
            <div className="text-xs whitespace-pre-wrap text-muted-foreground leading-relaxed">
              {getTexto()}
            </div>
          </div>

          {/* Opções de compartilhamento */}
          <div>
            <p className="text-sm font-semibold mb-3">Compartilhar via:</p>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-4 h-auto py-3 px-4 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                onClick={handleChatEquipe}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-sm">Chat da Equipe</p>
                  <p className="text-xs text-muted-foreground">
                    Compartilhar no chat interno
                  </p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-4 h-auto py-3 px-4 hover:bg-green-50 hover:border-green-200 transition-colors"
                onClick={handleWhatsApp}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-sm">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">
                    Compartilhar via WhatsApp
                  </p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-4 h-auto py-3 px-4 hover:bg-gray-50 hover:border-gray-200 transition-colors"
                onClick={handleCopiar}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
                  {copied ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5 text-gray-600" />
                  )}
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-sm">
                    {copied ? 'Copiado!' : 'Copiar'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Copiar para área de transferência
                  </p>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>

      {/* Dialog de seleção de usuário */}
      <SelecionarUsuarioChatDialog
        open={showUsuarioDialog}
        onOpenChange={setShowUsuarioDialog}
        textoCompartilhar={getTexto()}
      />
    </Sheet>
  );
}
