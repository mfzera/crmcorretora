import { createFileRoute } from '@tanstack/react-router';

import { useEffect, useState } from 'react';
import {
  Package, Building2, Send, X,
  Car, Home, Heart, Activity, Briefcase, Leaf, Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/core/ui/button';
import { Textarea } from '@/core/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { getPortalProdutos, solicitarCotacao, type Produto } from '@/infra/http/portal-api';
import { getTipoSeguroLabel } from '@/modules/portal/utils/portal-utils';

export const Route = createFileRoute('/_portal/portal/$subdominio/produtos')({
  component: PortalProdutosPage,
});


function getTipoIcon(tipo: string | null) {
  switch (tipo) {
    case 'AUTO': return Car;
    case 'RESIDENCIAL': return Home;
    case 'VIDA': return Heart;
    case 'SAUDE': return Activity;
    case 'EMPRESARIAL': return Briefcase;
    case 'RURAL': return Leaf;
    case 'TRANSPORTE': return Truck;
    default: return Package;
  }
}

function PortalProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    getPortalProdutos()
      .then(setProdutos)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  function openDialog(produto: Produto) {
    setSelectedProduto(produto);
    setMensagem('');
    setDialogOpen(true);
  }

  async function handleSolicitar() {
    if (!selectedProduto) return;
    setEnviando(true);
    try {
      await solicitarCotacao({ produtoId: selectedProduto.id, mensagem: mensagem || undefined });
      toast.success('Solicitação enviada! Sua corretora entrará em contato.');
      setDialogOpen(false);
    } catch {
      toast.error('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="space-y-5">
        <div>
          <h1
            className="text-xl font-bold text-white"
            style={{ fontFamily: '"Sora", sans-serif', letterSpacing: '-0.02em' }}
          >
            Novos Seguros
          </h1>
          <p className="mt-1 text-sm text-[#525252]">
            Produtos disponíveis para você contratar
          </p>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-36 rounded-xl bg-[#18181b]" />
            ))}
          </div>
        ) : produtos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#262628] p-12 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-[#525252]" />
            <p className="font-semibold text-white">Nenhum produto disponível</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {produtos.map((p) => {
              const Icon = getTipoIcon(p.tipoSeguro);
              return (
                <div
                  key={p.id}
                  className="flex flex-col rounded-xl border border-[#262628] bg-[#18181b] p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#00FF87]/[0.08]">
                        <Icon className="h-4 w-4 text-[#00FF87]" />
                      </div>
                      <h3
                        className="text-sm font-semibold text-white leading-snug"
                        style={{ fontFamily: '"Sora", sans-serif' }}
                      >
                        {p.nomeProduto}
                      </h3>
                    </div>
                    {p.tipoSeguro && (
                      <span className="shrink-0 rounded-full border border-[#262628] bg-[#262628] px-2 py-0.5 text-[11px] font-medium text-[#a1a1aa]">
                        {getTipoSeguroLabel(p.tipoSeguro)}
                      </span>
                    )}
                  </div>
                  {p.seguradora && (
                    <p className="mb-2 flex items-center gap-1.5 text-xs text-[#525252]">
                      <Building2 className="h-3 w-3" />
                      {p.seguradora.nomeFantasia ?? p.seguradora.razaoSocial}
                    </p>
                  )}
                  {p.descricao && (
                    <p className="mb-4 flex-1 text-xs text-[#a1a1aa] line-clamp-3">
                      {p.descricao}
                    </p>
                  )}
                  <Button
                    size="sm"
                    className="mt-auto w-full gap-1.5 bg-[#00FF87]/10 text-[#00FF87] hover:bg-[#00FF87]/15 border-0"
                    onClick={() => openDialog(p)}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Solicitar cotação
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Cotação</DialogTitle>
            <DialogDescription>
              {selectedProduto?.nomeProduto} — sua corretora receberá a solicitação e entrará em contato.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Mensagem (opcional)</label>
            <Textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Adicione detalhes ou dúvidas para sua corretora..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={enviando}>
              <X className="mr-1.5 h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={handleSolicitar} disabled={enviando} className="gap-1.5">
              <Send className="h-4 w-4" />
              {enviando ? 'Enviando...' : 'Enviar solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
