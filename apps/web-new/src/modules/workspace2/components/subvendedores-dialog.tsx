import { useState } from 'react';
import { Plus, Trash2, User, Users, Pencil } from 'lucide-react';
import { Checkbox } from '@/core/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
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
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/core/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/core/ui/popover';
import { Badge } from '@/core/ui/badge';
import { cn } from '@/core/utils';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import {
  useSubvendedores,
  useCreateSubvendedor,
  useUpdateSubvendedor,
  useDeleteSubvendedor,
  type Subvendedor,
} from '@/modules/usuarios/http';

interface VendedorItem {
  id: string;
  nome: string;
  email: string;
}

interface SubvendedoresDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendedores: VendedorItem[];
}

function SubvendedorForm({
  vendedorPrincipalId,
  vendedores,
  subvendedoresExistentes,
  onDone,
  editando,
}: {
  vendedorPrincipalId: string;
  vendedores: VendedorItem[];
  subvendedoresExistentes: Subvendedor[];
  onDone: () => void;
  editando?: Subvendedor | null;
}) {
  const [subId, setSubId] = useState(editando?.subvendedorId ?? '');

  const initialMesma = !editando
    || (editando.percentualNovo == null && editando.percentualRenovacao == null)
    || editando.percentualNovo === editando.percentualRenovacao;
  const [mesmaComissao, setMesmaComissao] = useState(initialMesma);
  const [percentualNovo, setPercentualNovo] = useState(editando?.percentualNovo != null ? String(editando.percentualNovo) : '');
  const [percentualRenovacao, setPercentualRenovacao] = useState(editando?.percentualRenovacao != null ? String(editando.percentualRenovacao) : '');
  const [dataInicio, setDataInicio] = useState(editando?.dataInicio ?? new Date().toISOString().slice(0, 10));
  const [dataFim, setDataFim] = useState(editando?.dataFim ?? '');
  const [open, setOpen] = useState(false);

  const createMutation = useCreateSubvendedor(vendedorPrincipalId);
  const updateMutation = useUpdateSubvendedor(vendedorPrincipalId);

  const idsJaVinculados = subvendedoresExistentes
    .filter((s) => s.id !== editando?.id)
    .map((s) => s.subvendedorId);

  const disponíveis = vendedores.filter(
    (v) => v.id !== vendedorPrincipalId && !idsJaVinculados.includes(v.id),
  );

  const selected = vendedores.find((v) => v.id === subId);

  async function handleSalvar() {
    if (!subId && !editando) {
      toast.error('Selecione um subvendedor');
      return;
    }
    if (!dataInicio) {
      toast.error('Informe a data de início');
      return;
    }

    const pNovo = percentualNovo ? Number(percentualNovo) : null;
    const pRenov = mesmaComissao ? pNovo : (percentualRenovacao ? Number(percentualRenovacao) : null);

    try {
      if (editando) {
        await updateMutation.mutateAsync({
          id: editando.id,
          data: { percentualNovo: pNovo, percentualRenovacao: pRenov, dataInicio, dataFim: dataFim || null },
        });
        toast.success('Vínculo atualizado');
      } else {
        await createMutation.mutateAsync({
          subvendedorId: subId,
          percentualNovo: pNovo,
          percentualRenovacao: pRenov,
          dataInicio,
          dataFim: dataFim || null,
        });
        toast.success('Subvendedor vinculado');
      }
      onDone();
    } catch (err) {
      handleApiError(err);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      {!editando && (
        <div className="space-y-1.5">
          <Label className="text-xs">Subvendedor</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start font-normal h-8 text-sm">
                {selected ? selected.nome : 'Selecionar...'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar vendedor..." />
                <CommandEmpty>Nenhum encontrado.</CommandEmpty>
                <CommandGroup className="max-h-48 overflow-auto">
                  {disponíveis.map((v) => (
                    <CommandItem
                      key={v.id}
                      value={v.nome}
                      onSelect={() => { setSubId(v.id); setOpen(false); }}
                    >
                      <span className={cn('mr-2 h-4 w-4', subId === v.id ? 'opacity-100' : 'opacity-0')}>✓</span>
                      <div className="flex flex-col">
                        <span className="text-sm">{v.nome}</span>
                        <span className="text-xs text-muted-foreground">{v.email}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Toggle comissão diferenciada */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="ws-mesma-comissao"
          checked={mesmaComissao}
          onCheckedChange={(v) => setMesmaComissao(!!v)}
        />
        <label htmlFor="ws-mesma-comissao" className="text-xs text-muted-foreground cursor-pointer select-none">
          Mesma comissão para novos e renovações
        </label>
      </div>

      {mesmaComissao ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">% Comissão</Label>
            <Input
              type="number" min={0} max={100} step={0.5}
              value={percentualNovo}
              onChange={(e) => { setPercentualNovo(e.target.value); setPercentualRenovacao(e.target.value); }}
              placeholder="0" className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Data início</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Data fim</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-8 text-sm" />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">% Novos seguros</Label>
              <Input
                type="number" min={0} max={100} step={0.5}
                value={percentualNovo} onChange={(e) => setPercentualNovo(e.target.value)}
                placeholder="0" className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">% Renovações</Label>
              <Input
                type="number" min={0} max={100} step={0.5}
                value={percentualRenovacao} onChange={(e) => setPercentualRenovacao(e.target.value)}
                placeholder="0" className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Data início</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data fim</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={handleSalvar} disabled={isPending}>
          {isPending ? 'Salvando...' : editando ? 'Salvar' : 'Vincular'}
        </Button>
      </div>
    </div>
  );
}

function VendedorSection({
  vendedor,
  todosVendedores,
}: {
  vendedor: VendedorItem;
  todosVendedores: VendedorItem[];
}) {
  const { data: subvendedores = [], isLoading } = useSubvendedores(vendedor.id);
  const deleteMutation = useDeleteSubvendedor(vendedor.id);

  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Subvendedor | null>(null);
  const [confirmRemoverId, setConfirmRemoverId] = useState<string | null>(null);

  async function handleRemover(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Vínculo removido');
    } catch (err) {
      handleApiError(err);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <User className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <span className="text-sm font-medium">{vendedor.nome}</span>
          {subvendedores.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {subvendedores.length}
            </Badge>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => { setShowForm(true); setEditando(null); }}
        >
          <Plus className="h-3 w-3 mr-1" />
          Vincular sub
        </Button>
      </div>

      {isLoading && <p className="text-xs text-muted-foreground pl-9">Carregando...</p>}

      {subvendedores.length > 0 && (
        <div className="ml-9 space-y-1.5">
          {subvendedores.map((s) =>
            editando?.id === s.id ? (
              <SubvendedorForm
                key={s.id}
                vendedorPrincipalId={vendedor.id}
                vendedores={todosVendedores}
                subvendedoresExistentes={subvendedores}
                editando={s}
                onDone={() => setEditando(null)}
              />
            ) : (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm bg-muted/30"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900 shrink-0">
                  <User className="h-3 w-3 text-purple-600" />
                </div>
                <span className="flex-1 font-medium">{s.nome}</span>
                {s.percentualNovo != null && s.percentualRenovacao != null && s.percentualNovo === s.percentualRenovacao && (
                  <span className="text-xs text-muted-foreground">{s.percentualNovo}%</span>
                )}
                {s.percentualNovo != null && s.percentualRenovacao != null && s.percentualNovo !== s.percentualRenovacao && (
                  <span className="text-xs text-muted-foreground">{s.percentualNovo}% N · {s.percentualRenovacao}% R</span>
                )}
                {s.percentualNovo != null && s.percentualRenovacao == null && (
                  <span className="text-xs text-muted-foreground">{s.percentualNovo}% N</span>
                )}
                {s.percentualNovo == null && s.percentualRenovacao != null && (
                  <span className="text-xs text-muted-foreground">{s.percentualRenovacao}% R</span>
                )}
                {s.dataFim && (
                  <span className="text-[10px] text-muted-foreground">até {s.dataFim}</span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => { setEditando(s); setShowForm(false); }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmRemoverId(s.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ),
          )}
        </div>
      )}

      {showForm && editando === null && (
        <div className="ml-9">
          <SubvendedorForm
            vendedorPrincipalId={vendedor.id}
            vendedores={todosVendedores}
            subvendedoresExistentes={subvendedores}
            onDone={() => setShowForm(false)}
          />
        </div>
      )}

      <AlertDialog open={confirmRemoverId !== null} onOpenChange={(o) => !o && setConfirmRemoverId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover vínculo?</AlertDialogTitle>
            <AlertDialogDescription>
              O subvendedor será desvinculado de {vendedor.nome}. Esta ação pode ser desfeita adicionando novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (confirmRemoverId) { handleRemover(confirmRemoverId); setConfirmRemoverId(null); } }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function SubvendedoresDialog({
  open,
  onOpenChange,
  vendedores,
}: SubvendedoresDialogProps) {
  const [search, setSearch] = useState('');

  const filtrados = vendedores.filter((v) =>
    v.nome.toLowerCase().includes(search.toLowerCase()),
  );

  function handleOpenChange(next: boolean) {
    if (!next) setSearch('');
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Grupos de Produção (Subvendedores)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          <Input
            placeholder="Buscar vendedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Vincule subvendedores a cada vendedor principal. Ao selecionar o vendedor em uma cotação, os subvendedores aparecem com um clique em <strong>+</strong>.
          </p>
        </div>

        <div className="space-y-4 divide-y">
          {filtrados.map((v) => (
            <div key={v.id} className="pt-4 first:pt-0">
              <VendedorSection vendedor={v} todosVendedores={vendedores} />
            </div>
          ))}
          {filtrados.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum vendedor encontrado.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
