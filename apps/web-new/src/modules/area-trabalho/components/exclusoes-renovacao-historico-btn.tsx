
import { useState } from 'react';
import { History } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/core/ui/sheet';
import {
  useSolicitacoesExclusaoHistorico,
  type SolicitacaoExclusaoRenovacaoHistorico,
} from '@/modules/renovacoes/http';

function Item({ item }: { item: SolicitacaoExclusaoRenovacaoHistorico }) {
  return (
    <div className="border rounded-lg p-3 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium">
          {item.renovacao.produtoDescricao || 'Produto não informado'}
          {item.renovacao.cliente?.nome && (
            <span className="text-muted-foreground font-normal"> — {item.renovacao.cliente.nome}</span>
          )}
        </span>
        <Badge variant={item.status === 'ACEITA' ? 'destructive' : 'secondary'} className="shrink-0">
          {item.status === 'ACEITA' ? 'Excluída' : 'Recusada'}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Solicitado por <strong>{item.solicitante.nome}</strong> em{' '}
        {new Date(item.criadoEm).toLocaleDateString('pt-BR')}
      </p>
      {item.respondidoPor && item.respondidoEm && (
        <p className="text-xs text-muted-foreground">
          {item.status === 'ACEITA' ? 'Aceita' : 'Recusada'} por{' '}
          <strong>{item.respondidoPor.nome}</strong> em{' '}
          {new Date(item.respondidoEm).toLocaleDateString('pt-BR')}
        </p>
      )}
      {item.motivoRecusa && (
        <p className="text-xs text-muted-foreground italic">&ldquo;{item.motivoRecusa}&rdquo;</p>
      )}
    </div>
  );
}

export function ExclusoesRenovacaoHistoricoBtn() {
  const { data: historico = [] } = useSolicitacoesExclusaoHistorico();
  const [aberto, setAberto] = useState(false);

  const resolvidos = historico.filter((h) => h.status !== 'PENDENTE');

  if (resolvidos.length === 0) return null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setAberto(true)} className="gap-2">
        <History className="size-4" />
        Histórico de exclusões
        <Badge variant="secondary">{resolvidos.length}</Badge>
      </Button>

      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <History className="size-4" />
              Histórico de Exclusões
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3">
            {resolvidos.map((item) => (
              <Item key={item.id} item={item} />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
