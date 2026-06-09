import { useRef, useState } from 'react';
import { Eye, Settings } from 'lucide-react';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { dayjs } from '@/core/utils/date-utils';
import { formatCurrencyBR } from '@/core/utils/format-currency';
import { getStatusLabel } from '@/core/utils/status-config';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ATIVO: 'default',
  AGUARDANDO_CADASTRO: 'secondary',
  EM_NEGOCIACAO: 'outline',
  CANCELADO: 'destructive',
  EXPIRADO: 'destructive',
  RENOVADO: 'default',
  VENCIDO: 'destructive',
  ARQUIVADO: 'outline',
};

interface NegocioCardMobileProps {
  documento: any;
  onVerDetalhes: (doc: any) => void;
  onConfigComissao: (doc: any) => void;
}

export function NegocioCardMobile({ documento, onVerDetalhes, onConfigComissao }: NegocioCardMobileProps) {
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const THRESHOLD = 60;
  const RAIL_WIDTH = 112;

  const nomeCliente =
    documento.cliente?.tipoPessoa === 'PF'
      ? documento.cliente?.nome
      : documento.cliente?.razaoSocial;

  const dataAprovacao = documento.dataAprovacaoCadastro
    ? dayjs(documento.dataAprovacaoCadastro)
    : documento.createdAt
      ? dayjs(documento.createdAt)
      : null;

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchMove(e: React.TouchEvent) {
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);

    if (deltaY > Math.abs(deltaX) * 0.5) return;

    if (revealed) {
      const newOffset = Math.max(-RAIL_WIDTH, Math.min(0, -RAIL_WIDTH + deltaX));
      setOffset(newOffset);
    } else {
      if (deltaX < 0) {
        const newOffset = Math.max(-RAIL_WIDTH, deltaX);
        setOffset(newOffset);
      }
    }
  }

  function handleTouchEnd() {
    if (revealed) {
      if (offset > -RAIL_WIDTH + THRESHOLD) {
        setOffset(0);
        setRevealed(false);
      } else {
        setOffset(-RAIL_WIDTH);
        setRevealed(true);
      }
    } else {
      if (offset < -THRESHOLD) {
        setOffset(-RAIL_WIDTH);
        setRevealed(true);
      } else {
        setOffset(0);
        setRevealed(false);
      }
    }
  }

  function close() {
    setOffset(0);
    setRevealed(false);
  }

  return (
    <div className="relative overflow-hidden rounded-lg border">
      {/* Action rail */}
      <div className="absolute right-0 inset-y-0 flex items-stretch" style={{ width: RAIL_WIDTH }}>
        <button
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-blue-600 text-white text-[10px] font-medium"
          onClick={() => { close(); onVerDetalhes(documento); }}
          aria-label="Ver detalhes"
        >
          <Eye className="size-4" />
          Detalhes
        </button>
        <button
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-slate-700 text-white text-[10px] font-medium"
          onClick={() => { close(); onConfigComissao(documento); }}
          aria-label="Configurar comissão"
        >
          <Settings className="size-4" />
          Comissão
        </button>
      </div>

      {/* Card content */}
      <div
        className="relative bg-card p-3 space-y-2 transition-transform cursor-pointer"
        style={{ transform: `translateX(${offset}px)`, willChange: 'transform' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (!revealed) onVerDetalhes(documento);
          else close();
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate text-muted-foreground">
            {documento.numeroDocumento || documento.numeroApoliceExterna || '—'}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {documento.negocioCorretora && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0">Corretora</Badge>
            )}
            <Badge variant={STATUS_VARIANTS[documento.status] ?? 'default'} className="text-[10px]">
              {getStatusLabel(documento.status)}
            </Badge>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold truncate">{nomeCliente || 'Sem cliente'}</p>
          <p className="text-xs text-muted-foreground truncate">{documento.produto?.nomeProduto || '—'}</p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-green-600 dark:text-green-400">
            {documento.premioLiquido ? formatCurrencyBR(parseFloat(documento.premioLiquido)) : '—'}
          </span>
          {dataAprovacao && (
            <span className="text-xs text-muted-foreground">{dataAprovacao.format('DD/MM/YYYY')}</span>
          )}
        </div>
      </div>
    </div>
  );
}
