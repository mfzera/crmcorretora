import { useState } from 'react';
import { Plus, Trash2, Pencil, Search, Loader2, GitBranch, Users, RefreshCw } from 'lucide-react';
import { Checkbox } from '@/core/ui/checkbox';
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
  Card,
  CardContent,
  CardHeader,
} from '@/core/ui/card';
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
  useVendedores,
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

function getInitials(nome: string) {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function getAvatarColor(nome: string) {
  const colors = [
    'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
    'bg-indigo-500', 'bg-teal-500',
  ];
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
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

  const [percentualNovo, setPercentualNovo] = useState(
    editando?.percentualNovo != null ? String(editando.percentualNovo) : '',
  );
  const [percentualRenovacao, setPercentualRenovacao] = useState(
    editando?.percentualRenovacao != null ? String(editando.percentualRenovacao) : '',
  );
  const [dataInicio, setDataInicio] = useState(
    editando?.dataInicio ?? new Date().toISOString().slice(0, 10),
  );
  const [dataFim, setDataFim] = useState(editando?.dataFim ?? '');
  const [popoverOpen, setPopoverOpen] = useState(false);

  const createMutation = useCreateSubvendedor(vendedorPrincipalId);
  const updateMutation = useUpdateSubvendedor(vendedorPrincipalId);

  const idsJaVinculados = subvendedoresExistentes
    .filter((s) => s.id !== editando?.id)
    .map((s) => s.subvendedorId);

  const disponiveis = vendedores.filter(
    (v) => v.id !== vendedorPrincipalId && !idsJaVinculados.includes(v.id),
  );

  const selected = vendedores.find((v) => v.id === subId);

  function buildPercentuais() {
    const novo = percentualNovo ? Number(percentualNovo) : null;
    const renov = mesmaComissao ? novo : (percentualRenovacao ? Number(percentualRenovacao) : null);
    return { percentualNovo: novo, percentualRenovacao: renov };
  }

  async function handleSalvar() {
    if (!subId && !editando) {
      toast.error('Selecione um subvendedor');
      return;
    }
    if (!dataInicio) {
      toast.error('Informe a data de início');
      return;
    }

    const { percentualNovo: pNovo, percentualRenovacao: pRenov } = buildPercentuais();

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
    <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
      {!editando && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Subvendedor</Label>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start font-normal h-9 text-sm"
              >
                {selected ? (
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        'h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0',
                        getAvatarColor(selected.nome),
                      )}
                    >
                      {getInitials(selected.nome)}
                    </span>
                    {selected.nome}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Selecionar subvendedor...</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar vendedor..." />
                <CommandEmpty>Nenhum encontrado.</CommandEmpty>
                <CommandGroup className="max-h-52 overflow-auto">
                  {disponiveis.map((v) => (
                    <CommandItem
                      key={v.id}
                      value={v.nome}
                      onSelect={() => {
                        setSubId(v.id);
                        setPopoverOpen(false);
                      }}
                    >
                      <span
                        className={cn(
                          'mr-2 h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0',
                          getAvatarColor(v.nome),
                        )}
                      >
                        {getInitials(v.nome)}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm truncate">{v.nome}</span>
                        <span className="text-xs text-muted-foreground truncate">{v.email}</span>
                      </div>
                      {subId === v.id && (
                        <span className="ml-auto text-primary text-xs">✓</span>
                      )}
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
          id="mesma-comissao"
          checked={mesmaComissao}
          onCheckedChange={(v) => setMesmaComissao(!!v)}
        />
        <label htmlFor="mesma-comissao" className="text-xs text-muted-foreground cursor-pointer select-none">
          Mesma comissão para novos e renovações
        </label>
      </div>

      {/* Campos de comissão */}
      {mesmaComissao ? (
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">% Comissão</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={percentualNovo}
              onChange={(e) => { setPercentualNovo(e.target.value); setPercentualRenovacao(e.target.value); }}
              placeholder="0"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Data início</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Data fim</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">% Novos seguros</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={percentualNovo}
                onChange={(e) => setPercentualNovo(e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">% Renovações</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={percentualRenovacao}
                onChange={(e) => setPercentualRenovacao(e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Data início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Data fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={handleSalvar} disabled={isPending}>
          {isPending ? 'Salvando...' : editando ? 'Salvar alterações' : 'Vincular'}
        </Button>
      </div>
    </div>
  );
}

function VendedorCard({
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
    <Card>
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                'h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0',
                getAvatarColor(vendedor.nome),
              )}
            >
              {getInitials(vendedor.nome)}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{vendedor.nome}</p>
              <p className="text-xs text-muted-foreground truncate">{vendedor.email}</p>
            </div>
            {subvendedores.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-2 shrink-0">
                {subvendedores.length} sub{subvendedores.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0"
            onClick={() => {
              setShowForm(true);
              setEditando(null);
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Vincular sub
          </Button>
        </div>
      </CardHeader>

      {(isLoading || subvendedores.length > 0 || showForm) && (
        <CardContent className="px-4 pb-4 pt-0 space-y-2">
          {isLoading && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Carregando vínculos...
            </p>
          )}

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
                className="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2"
              >
                <div
                  className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold shrink-0',
                    getAvatarColor(s.nome),
                  )}
                >
                  {getInitials(s.nome)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.nome}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {s.percentualNovo != null && s.percentualRenovacao != null && s.percentualNovo === s.percentualRenovacao && (
                      <span className="text-xs text-muted-foreground">{s.percentualNovo}% comissão</span>
                    )}
                    {s.percentualNovo != null && s.percentualRenovacao != null && s.percentualNovo !== s.percentualRenovacao && (
                      <span className="text-xs text-muted-foreground">
                        {s.percentualNovo}% novos · {s.percentualRenovacao}% renov.
                      </span>
                    )}
                    {s.percentualNovo != null && s.percentualRenovacao == null && (
                      <span className="text-xs text-muted-foreground">{s.percentualNovo}% novos</span>
                    )}
                    {s.percentualNovo == null && s.percentualRenovacao != null && (
                      <span className="text-xs text-muted-foreground">{s.percentualRenovacao}% renov.</span>
                    )}
                    {s.dataFim && (
                      <span className="text-[11px] text-muted-foreground">
                        · até {new Date(s.dataFim + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setEditando(s);
                      setShowForm(false);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmRemoverId(s.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ),
          )}

          {showForm && editando === null && (
            <SubvendedorForm
              vendedorPrincipalId={vendedor.id}
              vendedores={todosVendedores}
              subvendedoresExistentes={subvendedores}
              onDone={() => setShowForm(false)}
            />
          )}
        </CardContent>
      )}

      <AlertDialog
        open={confirmRemoverId !== null}
        onOpenChange={(o) => !o && setConfirmRemoverId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover vínculo?</AlertDialogTitle>
            <AlertDialogDescription>
              O subvendedor será desvinculado de {vendedor.nome}. É possível vincular novamente a
              qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmRemoverId) {
                  handleRemover(confirmRemoverId);
                  setConfirmRemoverId(null);
                }
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export function SubvendedoresTab() {
  const { data: vendedores = [], isLoading } = useVendedores();
  const [search, setSearch] = useState('');

  const filtrados = vendedores.filter((v) =>
    v.nome.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Barra de busca */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar vendedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {!isLoading && (
          <p className="text-sm text-muted-foreground">
            {vendedores.length} vendedor{vendedores.length !== 1 ? 'es' : ''}
          </p>
        )}
      </div>

      <p className="text-sm text-muted-foreground -mt-2">
        Vincule subvendedores a cada vendedor principal. Ao selecionar o vendedor em uma cotação,
        os subvendedores aparecem com um clique em{' '}
        <span className="font-medium text-foreground">+</span>.
      </p>

      {/* Estados */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtrados.length === 0 ? (
        <Card>
          <CardContent className="text-center py-14">
            {vendedores.length === 0 ? (
              <>
                <Users className="h-10 w-10 mx-auto mb-4 text-muted-foreground/30" />
                <p className="font-medium text-sm">Nenhum vendedor cadastrado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cadastre vendedores na aba Vendedores para configurar subvendedores
                </p>
              </>
            ) : (
              <>
                <GitBranch className="h-10 w-10 mx-auto mb-4 text-muted-foreground/30" />
                <p className="font-medium text-sm">Nenhum vendedor encontrado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tente ajustar o termo de busca
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtrados.map((v) => (
            <VendedorCard key={v.id} vendedor={v} todosVendedores={vendedores} />
          ))}
        </div>
      )}
    </div>
  );
}
