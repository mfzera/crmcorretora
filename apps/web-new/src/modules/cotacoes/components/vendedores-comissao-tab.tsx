
import { useState, useMemo } from 'react';
import { User, Plus, X, Lock, ChevronsUpDown, Check, Users } from 'lucide-react';
import { type Control, useController } from 'react-hook-form';
import { useSubvendedores } from '@/modules/usuarios/http';
import { Button } from '@/core/ui/button';
import { Label } from '@/core/ui/label';
import { Badge } from '@/core/ui/badge';
import { PercentageInput } from '@/core/ui/percentage-input';
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
import { cn } from '@/core/utils';

interface Vendedor {
  id: string;
  nome: string;
  email: string;
}

interface VendedoresComissaoTabProps {
  mode: 'view' | 'edit';
  vendedorPrincipal?: Vendedor;
  vendedorSecundario?: Vendedor | null;
  vendedorTerceiro?: Vendedor | null;
  atuante?: Vendedor | null;

  // View mode values
  vendedorId?: string | null;
  vendedorSecundarioId?: string | null;
  vendedorTerceiroId?: string | null;
  percentualComissaoPrincipal?: number | null;
  percentualComissaoSecundario?: number | null;
  percentualComissaoTerceiro?: number | null;
  percentualCorretora?: number | null;
  negocioCorretora?: boolean;

  // Edit mode: bind fields directly to react-hook-form
  control?: Control<any>;
  vendedoresDisponiveis?: Vendedor[];
}

function VendedorCard({
  vendedor,
  color = 'blue',
  label,
  percentual,
}: {
  vendedor: Vendedor;
  color?: 'blue' | 'purple' | 'orange' | 'gray';
  label?: string;
  percentual?: number | null;
}) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50/50 dark:bg-blue-950/20',
      icon: 'bg-blue-100 dark:bg-blue-900',
      text: 'text-blue-600',
    },
    purple: {
      bg: 'bg-purple-50/50 dark:bg-purple-950/20',
      icon: 'bg-purple-100 dark:bg-purple-900',
      text: 'text-purple-600',
    },
    orange: {
      bg: 'bg-orange-50/50 dark:bg-orange-950/20',
      icon: 'bg-orange-100 dark:bg-orange-900',
      text: 'text-orange-600',
    },
    gray: {
      bg: 'bg-muted/50',
      icon: 'bg-muted',
      text: 'text-muted-foreground',
    },
  };
  const c = colorMap[color];
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${c.bg}`}>
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full ${c.icon}`}
      >
        <User className={`h-5 w-5 ${c.text}`} />
      </div>
      <div className="flex-1">
        <p className="font-medium">{vendedor.nome}</p>
        <p className="text-sm text-muted-foreground">{vendedor.email}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {percentual != null && (
          <Badge variant="secondary" className="text-xs font-medium tabular-nums">
            {percentual}%
          </Badge>
        )}
        {label && (
          <Badge variant="outline" className="text-xs shrink-0">
            {label}
          </Badge>
        )}
      </div>
    </div>
  );
}

function VendedorCombobox({
  selectedId,
  vendedores,
  placeholder = 'Selecione um vendedor',
  onSelect,
}: {
  selectedId?: string | null;
  vendedores: Vendedor[];
  placeholder?: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = vendedores.find((v) => v.id === selectedId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? selected.nome : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Pesquisar vendedor..." />
          <CommandEmpty>Nenhum vendedor encontrado.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-auto">
            {vendedores.map((v) => (
              <CommandItem
                key={v.id}
                value={v.nome}
                onSelect={() => {
                  onSelect(v.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    selectedId === v.id ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <div className="flex flex-col">
                  <span>{v.nome}</span>
                  <span className="text-xs text-muted-foreground">{v.email}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function VendedorSelector({
  title,
  color = 'blue',
  selectedId,
  vendedores,
  excludeIds,
  onSelect,
  onRemove,
}: {
  title: string;
  color?: 'blue' | 'purple' | 'orange';
  selectedId?: string | null;
  vendedores: Vendedor[];
  excludeIds?: string[];
  onSelect: (id: string) => void;
  onRemove: () => void;
}) {
  const selected = vendedores.find((v) => v.id === selectedId);
  const available = vendedores.filter(
    (v) => !excludeIds?.includes(v.id) || v.id === selectedId,
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{title}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {selected ? (
        <div
          className={`flex items-center gap-3 p-3 rounded-lg border ${
            color === 'blue'
              ? 'bg-blue-50/50 dark:bg-blue-950/20'
              : color === 'purple'
                ? 'bg-purple-50/50 dark:bg-purple-950/20'
                : 'bg-orange-50/50 dark:bg-orange-950/20'
          }`}
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              color === 'blue'
                ? 'bg-blue-100 dark:bg-blue-900'
                : color === 'purple'
                  ? 'bg-purple-100 dark:bg-purple-900'
                  : 'bg-orange-100 dark:bg-orange-900'
            }`}
          >
            <User
              className={`h-5 w-5 ${
                color === 'blue'
                  ? 'text-blue-600'
                  : color === 'purple'
                    ? 'text-purple-600'
                    : 'text-orange-600'
              }`}
            />
          </div>
          <div className="flex-1">
            <p className="font-medium">{selected.nome}</p>
            <p className="text-sm text-muted-foreground">{selected.email}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSelect('')}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            Alterar
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Selecionar Vendedor</Label>
          <VendedorCombobox
            selectedId={selectedId}
            vendedores={available}
            onSelect={onSelect}
          />
        </div>
      )}
    </div>
  );
}

export function VendedoresComissaoTab(props: VendedoresComissaoTabProps) {
  if (props.mode === 'view') {
    return <VendedoresComissaoTabView {...props} />;
  }
  if (!props.control) {
    throw new Error(
      'VendedoresComissaoTab: control is required in edit mode',
    );
  }
  return (
    <VendedoresComissaoTabEdit
      control={props.control}
      vendedorPrincipal={props.vendedorPrincipal}
      vendedoresDisponiveis={props.vendedoresDisponiveis ?? []}
    />
  );
}

function VendedoresComissaoTabView({
  vendedorPrincipal,
  vendedorSecundario,
  vendedorTerceiro,
  atuante,
  percentualComissaoPrincipal,
  percentualComissaoSecundario,
  percentualComissaoTerceiro,
}: VendedoresComissaoTabProps) {
  const hasSplit =
    percentualComissaoPrincipal != null ||
    percentualComissaoSecundario != null ||
    percentualComissaoTerceiro != null;

  return (
    <div className="space-y-4">
      {atuante && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="font-semibold text-sm text-muted-foreground">
              Atuante da Venda
            </h3>
          </div>
          <VendedorCard vendedor={atuante} color="gray" label="Atuante" />
        </div>
      )}

      {vendedorPrincipal && (
        <div>
          <h3 className="font-semibold mb-2 text-sm">Vendedor Principal</h3>
          <VendedorCard
            vendedor={vendedorPrincipal}
            color="blue"
            percentual={hasSplit ? percentualComissaoPrincipal : undefined}
          />
        </div>
      )}

      {vendedorSecundario && (
        <div>
          <h3 className="font-semibold mb-2 text-sm">Vendedor Secundário</h3>
          <VendedorCard
            vendedor={vendedorSecundario}
            color="purple"
            percentual={hasSplit ? percentualComissaoSecundario : undefined}
          />
        </div>
      )}

      {vendedorTerceiro && (
        <div>
          <h3 className="font-semibold mb-2 text-sm">Vendedor Terciário</h3>
          <VendedorCard
            vendedor={vendedorTerceiro}
            color="orange"
            percentual={hasSplit ? percentualComissaoTerceiro : undefined}
          />
        </div>
      )}
    </div>
  );
}

interface VendedoresComissaoTabEditProps {
  control: Control<any>;
  vendedorPrincipal?: Vendedor;
  vendedoresDisponiveis: Vendedor[];
}

function VendedoresComissaoTabEdit({
  control,
  vendedorPrincipal,
  vendedoresDisponiveis,
}: VendedoresComissaoTabEditProps) {
  const { field: principalField } = useController({ control, name: 'vendedorId' });
  const { field: secundarioField } = useController({ control, name: 'vendedorSecundarioId' });
  const { field: terceiroField } = useController({ control, name: 'vendedorTerceiroId' });
  const { field: percPrincipalField } = useController({ control, name: 'percentualComissaoPrincipal' });
  const { field: percSecundarioField } = useController({ control, name: 'percentualComissaoSecundario' });
  const { field: percTerceiroField } = useController({ control, name: 'percentualComissaoTerceiro' });

  const vendedorId = (principalField.value ?? null) as string | null;
  const vendedorSecundarioId = (secundarioField.value ?? null) as string | null;
  const vendedorTerceiroId = (terceiroField.value ?? null) as string | null;

  const [showSecondary, setShowSecondary] = useState(!!vendedorSecundarioId);
  const [showTerceiro, setShowTerceiro] = useState(!!vendedorTerceiroId);
  const [editingPrincipal, setEditingPrincipal] = useState(false);
  const [showSubvendedorPicker, setShowSubvendedorPicker] = useState(false);

  const { data: subvendedores = [] } = useSubvendedores(vendedorId);

  const usedIds = [vendedorId, vendedorSecundarioId, vendedorTerceiroId].filter(Boolean) as string[];

  const currentPrincipal = vendedorId
    ? vendedoresDisponiveis.find((v) => v.id === vendedorId) || vendedorPrincipal
    : undefined;

  // Live validation of split
  const percPrincipal = parseFloat(percPrincipalField.value || '0') || 0;
  const percSecundario = parseFloat(percSecundarioField.value || '0') || 0;
  const percTerceiro = parseFloat(percTerceiroField.value || '0') || 0;
  const totalSplit = useMemo(() => {
    let total = percPrincipal;
    if (showSecondary && vendedorSecundarioId) total += percSecundario;
    if (showTerceiro && vendedorTerceiroId) total += percTerceiro;
    return total;
  }, [percPrincipal, percSecundario, percTerceiro, showSecondary, vendedorSecundarioId, showTerceiro, vendedorTerceiroId]);

  const hasSplit = (showSecondary && !!vendedorSecundarioId) || (showTerceiro && !!vendedorTerceiroId);
  const splitIsValid = !hasSplit || Math.abs(totalSplit - 100) < 0.01;

  return (
    <div className="space-y-4">
      {/* Vendedor Principal */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Vendedor Principal</h3>
        {!editingPrincipal && currentPrincipal ? (
          <>
            <div className="flex items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{currentPrincipal.nome}</p>
                <p className="text-sm text-muted-foreground">{currentPrincipal.email}</p>
              </div>
              {subvendedores.length > 0 && !showSecondary && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSubvendedorPicker((v) => !v)}
                  className="h-8 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                  title="Selecionar subvendedor"
                >
                  <Users className="h-3.5 w-3.5 mr-1" />
                  <Plus className="h-3 w-3" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingPrincipal(true)}
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                Alterar
              </Button>
            </div>

            {showSubvendedorPicker && subvendedores.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Subvendedores de {currentPrincipal.nome}
                </p>
                <div className="flex flex-col gap-1.5">
                  {subvendedores
                    .filter((s) => !usedIds.includes(s.subvendedorId))
                    .map((s) => (
                      <button
                        key={s.subvendedorId}
                        type="button"
                        onClick={() => {
                          secundarioField.onChange(s.subvendedorId);
                          setShowSecondary(true);
                          setShowSubvendedorPicker(false);
                          // Auto-fill commission split from subvendedor config
                          if (s.percentual != null) {
                            const percSub = s.percentual;
                            const percPrinc = Math.max(0, 100 - percSub);
                            percSecundarioField.onChange(String(percSub));
                            percPrincipalField.onChange(String(percPrinc));
                          }
                        }}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-background border border-transparent hover:border-border transition-colors text-left"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900 shrink-0">
                          <User className="h-3.5 w-3.5 text-purple-600" />
                        </div>
                        <span className="flex-1 font-medium">{s.nome}</span>
                        {s.percentual != null && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="text-purple-600 font-medium">{s.percentual}%</span>
                            <span>sub</span>
                            <span className="text-muted-foreground/60">·</span>
                            <span className="text-blue-600 font-medium">{100 - s.percentual}%</span>
                            <span>principal</span>
                          </div>
                        )}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <Label>Selecionar Vendedor Principal</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <VendedorCombobox
                  selectedId={vendedorId}
                  vendedores={vendedoresDisponiveis.filter(
                    (v) => !usedIds.includes(v.id) || v.id === vendedorId,
                  )}
                  placeholder="Selecione o vendedor principal"
                  onSelect={(v) => {
                    principalField.onChange(v || null);
                    setEditingPrincipal(false);
                  }}
                />
              </div>
              {currentPrincipal && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingPrincipal(false)}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Vendedor Secundário */}
      {!showSecondary ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setShowSecondary(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Vendedor Secundário
        </Button>
      ) : (
        <VendedorSelector
          title="Vendedor Secundário"
          color="purple"
          selectedId={vendedorSecundarioId}
          vendedores={vendedoresDisponiveis}
          excludeIds={usedIds.filter((id) => id !== vendedorSecundarioId)}
          onSelect={(v) => secundarioField.onChange(v || null)}
          onRemove={() => {
            setShowSecondary(false);
            secundarioField.onChange(null);
            percSecundarioField.onChange(undefined);
            // Restore principal to 100% when secondary is removed
            percPrincipalField.onChange(undefined);
          }}
        />
      )}

      {/* Vendedor Terciário */}
      {!showTerceiro ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setShowTerceiro(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Vendedor Terciário
        </Button>
      ) : (
        <VendedorSelector
          title="Vendedor Terciário"
          color="orange"
          selectedId={vendedorTerceiroId}
          vendedores={vendedoresDisponiveis}
          excludeIds={usedIds.filter((id) => id !== vendedorTerceiroId)}
          onSelect={(v) => terceiroField.onChange(v || null)}
          onRemove={() => {
            setShowTerceiro(false);
            terceiroField.onChange(null);
            percTerceiroField.onChange(undefined);
          }}
        />
      )}

      {/* Divisão da comissão — aparece quando há vendedor secundário ou terciário */}
      {hasSplit && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Divisão da Comissão
          </p>

          <div className={cn(
            'grid gap-3',
            showTerceiro && vendedorTerceiroId ? 'grid-cols-3' : 'grid-cols-2',
          )}>
            <div className="space-y-1.5">
              <Label className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                % Principal
              </Label>
              <PercentageInput
                value={percPrincipalField.value || ''}
                onChange={(v) => percPrincipalField.onChange(v)}
                onBlur={percPrincipalField.onBlur}
                placeholder="0,00"
                className="h-9 text-sm"
              />
            </div>

            {showSecondary && vendedorSecundarioId && (
              <div className="space-y-1.5">
                <Label className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                  % Secundário
                </Label>
                <PercentageInput
                  value={percSecundarioField.value || ''}
                  onChange={(v) => percSecundarioField.onChange(v)}
                  onBlur={percSecundarioField.onBlur}
                  placeholder="0,00"
                  className="h-9 text-sm"
                />
              </div>
            )}

            {showTerceiro && vendedorTerceiroId && (
              <div className="space-y-1.5">
                <Label className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  % Terciário
                </Label>
                <PercentageInput
                  value={percTerceiroField.value || ''}
                  onChange={(v) => percTerceiroField.onChange(v)}
                  onBlur={percTerceiroField.onBlur}
                  placeholder="0,00"
                  className="h-9 text-sm"
                />
              </div>
            )}
          </div>

          <div className={cn(
            'flex items-center gap-2 text-xs rounded-md px-3 py-2',
            splitIsValid
              ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
          )}>
            <span className="font-medium">Soma: {totalSplit.toFixed(1)}%</span>
            {!splitIsValid && (
              <span className="text-amber-600/80 dark:text-amber-400/70">
                — deve totalizar 100%
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
