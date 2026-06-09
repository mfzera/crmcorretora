
import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageSquare, CornerDownRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { Button } from '@/core/ui/button';
import { Textarea } from '@/core/ui/textarea';
import { Separator } from '@/core/ui/separator';
import type { ComentarioItem } from '../http';

function getInitials(nome: string) {
  return nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

interface ReplyInputProps {
  onSend: (texto: string) => void;
  isSending: boolean;
  onCancel: () => void;
}

function ReplyInput({ onSend, isSending, onCancel }: ReplyInputProps) {
  const [texto, setTexto] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const handleSend = () => {
    const t = texto.trim();
    if (!t) return;
    onSend(t);
    setTexto('');
  };

  return (
    <div className="mt-2 ml-10 flex flex-col gap-1.5">
      <Textarea
        ref={ref}
        placeholder="Escrever resposta..."
        value={texto}
        maxLength={2000}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          if (e.key === 'Escape') onCancel();
        }}
        className="resize-none text-sm min-h-[36px] py-2"
        rows={1}
      />
      {texto.length > 1800 && (
        <p className="text-xs text-muted-foreground text-right">{texto.length}/2000</p>
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSend} disabled={!texto.trim() || isSending} className="h-7 px-3 text-xs">
          {isSending ? <Loader2 className="size-3 animate-spin mr-1" /> : <Send className="size-3 mr-1" />}
          Responder
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 px-3 text-xs text-muted-foreground">
          Cancelar
        </Button>
      </div>
    </div>
  );
}

interface CommentRowProps {
  comentario: ComentarioItem;
  canReply: boolean;
  onReply: (parentId: string, texto: string) => void;
  isSending: boolean;
  depth?: number;
}

function CommentRow({ comentario: c, canReply, onReply, isSending, depth = 0 }: CommentRowProps) {
  const [replying, setReplying] = useState(false);

  return (
    <div className={depth > 0 ? 'ml-10 border-l-2 border-border pl-3' : ''}>
      <div className="flex gap-3">
        <Avatar className="size-8 shrink-0 mt-0.5">
          <AvatarImage src={c.autor.avatarUrl ?? undefined} />
          <AvatarFallback className="text-xs">{getInitials(c.autor.nome)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-semibold">{c.autor.nome}</span>
            <span className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</span>
          </div>
          <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">{c.texto}</p>
          {canReply && depth === 0 && (
            <button
              onClick={() => setReplying((v) => !v)}
              className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <CornerDownRight className="size-3" />
              Responder
            </button>
          )}
        </div>
      </div>

      {replying && (
        <ReplyInput
          isSending={isSending}
          onSend={(texto) => {
            onReply(c.id, texto);
            setReplying(false);
          }}
          onCancel={() => setReplying(false)}
        />
      )}

      {/* Respostas aninhadas (apenas 1 nível) */}
      {c.replies?.length > 0 && (
        <div className="mt-2 space-y-3">
          {c.replies.map((r) => (
            <CommentRow
              key={r.id}
              comentario={r}
              canReply={false}
              onReply={onReply}
              isSending={isSending}
              depth={1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ComentariosPanelProps {
  comentarios: ComentarioItem[];
  isLoading: boolean;
  canAdd: boolean;
  onAdd: (texto: string, parentId?: string | null) => void;
  isSending: boolean;
  onPendingTextChange?: (text: string) => void;
}

export function ComentariosPanel({ comentarios, isLoading, canAdd, onAdd, isSending, onPendingTextChange }: ComentariosPanelProps) {
  const [novoTexto, setNovoTexto] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comentarios.length]);

  const handleSend = () => {
    const t = novoTexto.trim();
    if (!t) return;
    onAdd(t, null);
    setNovoTexto('');
    onPendingTextChange?.('');
  };

  const totalCount = comentarios.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Lista com altura fixa + scroll */}
      <div className="flex-1 overflow-y-auto space-y-4 max-h-[360px] pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : comentarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="size-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum comentário ainda</p>
            {canAdd && <p className="text-xs text-muted-foreground/70 mt-1">Seja o primeiro a comentar</p>}
          </div>
        ) : (
          <>
            {comentarios.map((c) => (
              <CommentRow
                key={c.id}
                comentario={c}
                canReply={canAdd}
                onReply={(parentId, texto) => onAdd(texto, parentId)}
                isSending={isSending}
              />
            ))}
            <div ref={endRef} />
          </>
        )}
      </div>

      {canAdd && (
        <>
          <Separator />
          <div className="flex gap-2 items-end shrink-0">
            <div className="flex flex-col flex-1 gap-1">
              <Textarea
                placeholder="Escreva um comentário..."
                value={novoTexto}
                maxLength={2000}
                onChange={(e) => { setNovoTexto(e.target.value); onPendingTextChange?.(e.target.value); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                className="resize-none min-h-[36px] max-h-[120px] py-2 text-sm"
                rows={1}
              />
              {novoTexto.length > 1800 && (
                <p className="text-xs text-muted-foreground text-right">{novoTexto.length}/2000</p>
              )}
            </div>
            <Button
              onClick={handleSend}
              disabled={!novoTexto.trim() || isSending}
              size="sm"
              className="h-9 w-9 p-0 shrink-0"
            >
              {isSending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">Enter para enviar · Shift+Enter para nova linha</p>
        </>
      )}
    </div>
  );
}
