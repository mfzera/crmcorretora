import { useState, startTransition, memo, useMemo } from 'react';
import { Pencil, RefreshCw, Rocket, Trash2, Undo2, Users } from 'lucide-react';
import type { ICellRendererParams } from 'ag-grid-community';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/core/ui/alert-dialog';
import { useSubvendedores } from '@/modules/usuarios/http';
import { SITUACAO_STYLES } from '../types';
import { fmt, fmtPct } from '../helpers';
import type { GridContext, WorkspaceRow } from '../types';

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora mesmo';
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)} dias`;
}

export const ClienteCellRenderer = memo(function ClienteCellRenderer({ data }: ICellRendererParams<WorkspaceRow>) {
  if (!data) return null;
  return (
    <div className="flex items-center gap-1.5 h-full min-w-0">
      {data.tags.length > 0 && (
        <div className="flex items-center gap-0.5 shrink-0">
          {data.tags.slice(0, 3).map((tag) => (
            <Tooltip key={tag.id}>
              <TooltipTrigger asChild>
                <span
                  className="inline-block size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: tag.cor }}
                />
              </TooltipTrigger>
              <TooltipContent>{tag.nome}</TooltipContent>
            </Tooltip>
          ))}
          {data.tags.length > 3 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center justify-center size-2.5 rounded-full bg-muted text-[7px] font-bold text-muted-foreground shrink-0">
                  +{data.tags.length - 3}
                </span>
              </TooltipTrigger>
              <TooltipContent>{data.tags.slice(3).map((t) => t.nome).join(', ')}</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
      <span className={`truncate font-medium ${data.isDeleted ? 'opacity-50 line-through' : ''}`}>{data.clienteNome}</span>
      <span className="shrink-0 rounded border border-border/60 px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
        {data.clienteTipo}
      </span>
    </div>
  );
});

const SubvendedorGrupoButton = memo(function SubvendedorGrupoButton({ data, ctx }: { data: WorkspaceRow; ctx: GridContext }) {
  const [open, setOpen] = useState(false);
  const { data: subvendedores = [], isLoading } = useSubvendedores(data.vendedorId);
  const ativos = useMemo(() => subvendedores.filter((s: any) => s.ativo !== false), [subvendedores]);

  if (!isLoading && ativos.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/20 text-[10px] font-medium transition-colors"
        >
          <Users className="size-2.5" />
          Grupo
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="px-3 py-2 border-b text-xs font-medium text-muted-foreground">Subvendedor</div>
        <div className="max-h-48 overflow-y-auto py-1">
          {isLoading ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Carregando...</div>
          ) : (
            <>
              {data.vendedorSecundarioId && (
                <button
                  type="button"
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted text-muted-foreground"
                  onMouseDown={(e) => { e.preventDefault(); startTransition(() => { ctx.onDirectUpdate(data, 'col_vendedor_secundario', null); data.vendedorSecundarioId = null; data.vendedorSecundarioNome = null; data.vendedorSecundarioAvatar = null; setOpen(false); }); }}
                >
                  Remover subvendedor
                </button>
              )}
              {ativos.map((s: any) => (
                <button
                  key={s.id}
                  type="button"
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2 ${data.vendedorSecundarioId === s.id ? 'bg-muted' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    startTransition(() => {
                      ctx.onDirectUpdate(data, 'col_vendedor_secundario', s.id);
                      data.vendedorSecundarioId = s.id;
                      data.vendedorSecundarioNome = s.nome ?? s.label ?? null;
                      data.vendedorSecundarioAvatar = s.avatarUrl ?? null;
                      setOpen(false);
                    });
                  }}
                >
                  <Avatar className="h-4 w-4 shrink-0">
                    <AvatarImage src={s.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-[8px]">{(s.nome ?? s.label ?? '?')[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate">{s.nome ?? s.label}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});

export const VendedorCellRenderer = memo(function VendedorCellRenderer({ data, context }: ICellRendererParams<WorkspaceRow> & { context: GridContext }) {
  if (!data?.vendedorNome) return <span className="text-muted-foreground">—</span>;
  const ctx = context as GridContext;
  const canEdit = data._cotacao?.status === 'EM_ELABORACAO';
  const initials = data.vendedorNome
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();
  return (
    <div className="flex items-center gap-2 h-full min-w-0">
      <Avatar className="h-5 w-5 shrink-0">
        <AvatarImage src={data.vendedorAvatar ?? undefined} />
        <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col justify-center min-w-0 flex-1 overflow-hidden">
        <span className="truncate leading-tight">{data.vendedorNome}</span>
        {data.vendedorSecundarioNome && (
          <span className="truncate text-[10px] text-muted-foreground leading-tight">{data.vendedorSecundarioNome}</span>
        )}
      </div>
      {canEdit && data.vendedorId && <SubvendedorGrupoButton data={data} ctx={ctx} />}
    </div>
  );
});

export const SituacaoCellRenderer = memo(function SituacaoCellRenderer({ data }: ICellRendererParams<WorkspaceRow>) {
  if (!data) return null;
  const s = SITUACAO_STYLES[data.situacao];
  if (data.situacao === 'Excluído') {
    return (
      <div className="flex flex-col justify-center h-full gap-0.5">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium w-fit ${s.badge}`}>
          <span className={`inline-block size-2 rounded-full shrink-0 ${s.dot}`} />
          Excluído
        </span>
        {data.deletedByNome && (
          <span className="text-[10px] text-muted-foreground leading-none pl-0.5">
            por {data.deletedByNome} {timeAgo(data.deletedAt)}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center h-full">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${s.badge}`}>
        <span className={`inline-block size-2 rounded-full shrink-0 ${s.dot}`} />
        {data.situacao}
      </span>
    </div>
  );
});

export const ComentariosCellRenderer = memo(function ComentariosCellRenderer({ data, context }: ICellRendererParams<WorkspaceRow> & { context: GridContext }) {
  const [isEditing, setIsEditing] = useState(false);
  const [texto, setTexto] = useState('');

  if (!data) return null;

  const handleSubmit = () => {
    const t = texto.trim();
    setIsEditing(false);
    setTexto('');
    if (t && data.cotacaoId) context.addComentario(data, t);
  };

  if (isEditing) {
    return (
      <input
        autoFocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
          if (e.key === 'Escape') { e.preventDefault(); setIsEditing(false); setTexto(''); }
        }}
        onBlur={() => { setIsEditing(false); setTexto(''); }}
        onClick={(e) => e.stopPropagation()}
        maxLength={2000}
        placeholder="Comentar... Enter para enviar"
        className="w-full h-full text-xs px-1.5 bg-background border border-primary/50 rounded outline-none ring-1 ring-primary/30 min-w-0"
      />
    );
  }

  const count = data.comentariosCount;
  const ultimo = data.ultimoComentario;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); context.onOpenComentarios(data); }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(true); }}
      className="flex items-center gap-1.5 h-full w-full text-muted-foreground min-w-0 hover:text-foreground transition-colors text-left"
    >
      {count > 0 ? (
        <>
          <span className="tabular-nums text-xs font-medium shrink-0">{count}</span>
          {ultimo && (
            <span className="flex items-center gap-1 truncate min-w-0">
              <Avatar className="size-4 shrink-0">
                <AvatarImage src={ultimo.autorAvatarUrl ?? undefined} />
                <AvatarFallback className="text-[9px]">{ultimo.autorNome.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="truncate text-xs">{ultimo.texto}</span>
            </span>
          )}
        </>
      ) : (
        <span className="text-xs text-muted-foreground/60">Comentar</span>
      )}
    </button>
  );
});

export function PLCellRenderer({ data }: ICellRendererParams<WorkspaceRow>) {
  if (!data || data.plAtual == null) return <span className="text-muted-foreground">—</span>;
  return <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(data.plAtual)}</span>;
}

export function ComissaoCellRenderer({ data }: ICellRendererParams<WorkspaceRow>) {
  if (!data || data.comissaoPct == null) return <span className="text-muted-foreground">—</span>;
  return <span className="tabular-nums">{fmtPct(data.comissaoPct)}</span>;
}

export function ReceitaCellRenderer({ data }: ICellRendererParams<WorkspaceRow>) {
  if (!data || data.receita == null) return <span className="text-muted-foreground">—</span>;
  return <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">{fmt(data.receita)}</span>;
}

export const AcoesCellRenderer = memo(function AcoesCellRenderer({
  data,
  context,
}: ICellRendererParams<WorkspaceRow> & { context: GridContext }) {
  if (!data) return null;
  const { onIniciar, onEditarDetalhes, onProspectar, onDelete, onRestore } = context;
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (data.isDeleted) {
    return (
      <div className="flex items-center gap-0.5 h-full">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRestore(data); }}
              className="inline-flex items-center gap-1 h-6 px-2 rounded border border-green-200 bg-green-50 dark:bg-green-500/10 dark:border-green-500/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-500/20 text-xs font-medium transition-colors"
            >
              <Undo2 className="size-3" />
              Restaurar
            </button>
          </TooltipTrigger>
          <TooltipContent>Restaurar registro excluído</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-0.5 h-full">
        {(data.situacao === 'Renovar' || data.situacao === 'Vencida') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onIniciar(data); }}
                className="inline-flex items-center gap-1 h-6 px-2 rounded border border-blue-200 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-xs font-medium transition-colors"
              >
                <RefreshCw className="size-3" />
                Iniciar
              </button>
            </TooltipTrigger>
            <TooltipContent>Iniciar renovação</TooltipContent>
          </Tooltip>
        )}
        {data._cotacao && data._cotacao.status === 'EM_ELABORACAO' && !['Reprovada', 'Convertido', 'Renovar', 'Perdido'].includes(data.situacao) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEditarDetalhes(data); }}
                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Pencil className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Editar</TooltipContent>
          </Tooltip>
        )}
        {!['Convertido', 'Renovar', 'Perdido'].includes(data.situacao) && (data.rowType === 'cotacao' || (data.rowType === 'renovacao' && data.situacao !== 'Vencida')) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onProspectar(data); }}
                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Rocket className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Prospectar</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}
              className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/60 hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              <Trash2 className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Excluir</TooltipContent>
        </Tooltip>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              O registro de <strong>{data.clienteNome}</strong> será marcado como <strong>Excluído</strong> e ficará oculto da planilha. Você pode restaurá-lo a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmOpen(false); onDelete(data); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
