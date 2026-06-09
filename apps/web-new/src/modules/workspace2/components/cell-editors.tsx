import { useState, useEffect } from 'react';
import { useGridCellEditor } from 'ag-grid-react';
import type { CustomCellEditorProps } from 'ag-grid-react';
import { Check, ChevronLeft } from 'lucide-react';
import { Input } from '@/core/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { cn } from '@/core/utils';
import { useSubvendedores } from '@/modules/usuarios/http';
import type { GridContext, WorkspaceRow } from '../types';

export function ProdutoCellEditor({ data, context, stopEditing }: CustomCellEditorProps<WorkspaceRow>) {
  const ctx = context as GridContext;
  const [search, setSearch] = useState('');

  useGridCellEditor({});

  const filtered = ctx.produtos.filter((p) =>
    p.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="bg-popover border border-border rounded-md shadow-lg w-64 overflow-hidden z-50">
      <div className="p-1.5 border-b">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produto..."
          className="h-7 text-xs"
          autoFocus
        />
      </div>
      <div className="max-h-52 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
            <span>Nenhum produto encontrado</span>
            {search && (
              <button type="button" className="text-primary hover:underline" onMouseDown={(e) => { e.preventDefault(); setSearch(''); }}>
                Limpar
              </button>
            )}
          </div>
        ) : filtered.map((p) => (
          <button
            key={p.id}
            type="button"
            className={cn(
              'w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2',
              data?._cotacao?.produtoId === p.id && 'bg-muted',
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (data) {
                data.produto = p.label;
                if (data._cotacao) (data._cotacao as any).produtoId = p.id;
              }
              ctx.onDirectUpdate(data!, 'col_produto', p.id);
              stopEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="flex-1">{p.label}</span>
            {data?._cotacao?.produtoId === p.id && <Check className="size-3 shrink-0 text-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export function VendedorCellEditor({ data, context, stopEditing }: CustomCellEditorProps<WorkspaceRow>) {
  const ctx = context as GridContext;
  const [search, setSearch] = useState('');
  const [step, setStep] = useState<'vendedor' | 'loading' | 'subvendedor'>('vendedor');
  const [pendingVendedorId, setPendingVendedorId] = useState<string | null>(null);

  const { data: subvendedores = [], isLoading: isLoadingSub } = useSubvendedores(pendingVendedorId);
  const subAtivos = subvendedores.filter((s: any) => s.ativo !== false);

  useGridCellEditor({});

  useEffect(() => {
    if (step !== 'loading') return;
    if (isLoadingSub) return;
    if (subAtivos.length === 0) {
      stopEditing(false);
    } else {
      setStep('subvendedor');
    }
  }, [step, isLoadingSub, subAtivos.length, stopEditing]);

  const filtered = ctx.vendedores.filter((v) =>
    v.label.toLowerCase().includes(search.toLowerCase()),
  );

  if (step === 'loading') {
    return (
      <div className="bg-popover border border-border rounded-md shadow-lg w-64 overflow-hidden z-50">
        <div className="px-3 py-4 text-xs text-muted-foreground text-center">Verificando subvendedores...</div>
      </div>
    );
  }

  if (step === 'subvendedor') {
    return (
      <div className="bg-popover border border-border rounded-md shadow-lg w-64 overflow-hidden z-50">
        <div className="p-1.5 border-b flex items-center gap-1.5">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onMouseDown={(e) => { e.preventDefault(); setStep('vendedor'); setPendingVendedorId(null); }}
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="text-xs font-medium">Subvendedor (opcional)</span>
        </div>
        <div className="max-h-52 overflow-y-auto py-1">
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted text-muted-foreground"
            onMouseDown={(e) => { e.preventDefault(); stopEditing(false); }}
          >
            Sem subvendedor
          </button>
          {subAtivos.map((s: any) => (
            <button
              key={s.id}
              type="button"
              className={cn(
                'w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2',
                data?.vendedorSecundarioId === s.id && 'bg-muted',
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (data) {
                  data.vendedorSecundarioId = s.id;
                  data.vendedorSecundarioNome = s.nome ?? s.label ?? null;
                  data.vendedorSecundarioAvatar = s.avatarUrl ?? null;
                }
                ctx.onDirectUpdate(data!, 'col_vendedor_secundario', s.id);
                stopEditing(false);
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Avatar className="h-4 w-4 shrink-0">
                <AvatarImage src={s.avatarUrl ?? undefined} />
                <AvatarFallback className="text-[8px]">{(s.nome ?? s.label ?? '?')[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate">{s.nome ?? s.label}</span>
              {data?.vendedorSecundarioId === s.id && <Check className="size-3 shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-popover border border-border rounded-md shadow-lg w-64 overflow-hidden z-50">
      <div className="p-1.5 border-b">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar vendedor..."
          className="h-7 text-xs"
          autoFocus
        />
      </div>
      <div className="max-h-52 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
            <span>Nenhum vendedor encontrado</span>
            {search && (
              <button type="button" className="text-primary hover:underline" onMouseDown={(e) => { e.preventDefault(); setSearch(''); }}>
                Limpar
              </button>
            )}
          </div>
        ) : filtered.map((v) => (
          <button
            key={v.id}
            type="button"
            className={cn(
              'w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2',
              data?._cotacao?.vendedorId === v.id && 'bg-muted',
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (data) {
                data.vendedorNome = v.label;
                data.vendedorAvatar = v.avatarUrl ?? null;
                if (data._cotacao) (data._cotacao as any).vendedorId = v.id;
              }
              ctx.onDirectUpdate(data!, 'col_vendedor', v.id);
              setPendingVendedorId(v.id);
              setStep('loading');
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="flex-1">{v.label}</span>
            {data?._cotacao?.vendedorId === v.id && <Check className="size-3 shrink-0 text-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SeguradoraCellEditor({ data, context, stopEditing }: CustomCellEditorProps<WorkspaceRow>) {
  const ctx = context as GridContext;
  const [search, setSearch] = useState('');

  useGridCellEditor({});

  const filtered = ctx.seguradoras.filter((s) =>
    s.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="bg-popover border border-border rounded-md shadow-lg w-64 overflow-hidden z-50">
      <div className="p-1.5 border-b">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar seguradora..."
          className="h-7 text-xs"
          autoFocus
        />
      </div>
      <div className="max-h-52 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
            <span>Nenhuma seguradora encontrada</span>
            {search && (
              <button type="button" className="text-primary hover:underline" onMouseDown={(e) => { e.preventDefault(); setSearch(''); }}>
                Limpar
              </button>
            )}
          </div>
        ) : filtered.map((s) => (
          <button
            key={s.id}
            type="button"
            className={cn(
              'w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2',
              data?._cotacao?.seguradoraParceiraId === s.id && 'bg-muted',
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (data) {
                data.seguradora = s.label;
                if (data._cotacao) (data._cotacao as any).seguradoraParceiraId = s.id;
              }
              ctx.onDirectUpdate(data!, 'col_seguradora', s.id);
              stopEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="flex-1">{s.label}</span>
            {data?._cotacao?.seguradoraParceiraId === s.id && <Check className="size-3 shrink-0 text-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
}
