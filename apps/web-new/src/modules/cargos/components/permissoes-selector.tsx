
import { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Input } from '@/core/ui/input';
import { Checkbox } from '@/core/ui/checkbox';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/core/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/core/ui/tooltip';
import {
  type PermissaoGlobal,
  agruparPermissoesPorGrupo,
  getCorGrupo,
} from '@/modules/cargos/http';

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5 not-italic font-medium">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

interface PermissoesSelectorProps {
  permissoes: PermissaoGlobal[];
  selectedPermissoes: string[]; // IDs das permissões selecionadas
  onChange: (selectedIds: string[]) => void;
  disabled?: boolean;
}

export function PermissoesSelector({
  permissoes,
  selectedPermissoes,
  onChange,
  disabled = false,
}: PermissoesSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['dashboard', 'vendas', 'clientes']),
  );

  const grupos = useMemo(() => {
    return agruparPermissoesPorGrupo(permissoes);
  }, [permissoes]);

  const filteredGrupos = useMemo(() => {
    if (!searchTerm) return grupos;

    return grupos
      .map((grupo) => ({
        ...grupo,
        permissoes: grupo.permissoes.filter(
          (p) =>
            p.nomePermissao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.descricao?.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      }))
      .filter((grupo) => grupo.permissoes.length > 0);
  }, [grupos, searchTerm]);

  const toggleGroup = (grupo: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(grupo)) {
      newExpanded.delete(grupo);
    } else {
      newExpanded.add(grupo);
    }
    setExpandedGroups(newExpanded);
  };

  const togglePermissao = (permissaoId: string) => {
    if (disabled) return;

    const newSelected = selectedPermissoes.includes(permissaoId)
      ? selectedPermissoes.filter((id) => id !== permissaoId)
      : [...selectedPermissoes, permissaoId];

    onChange(newSelected);
  };

  const toggleAllInGroup = (grupo: {
    nome: string;
    permissoes: PermissaoGlobal[];
  }) => {
    if (disabled) return;

    const grupoIds = grupo.permissoes.map((p) => p.id);
    const allSelected = grupoIds.every((id) => selectedPermissoes.includes(id));

    if (allSelected) {
      // Desmarcar todos do grupo
      onChange(selectedPermissoes.filter((id) => !grupoIds.includes(id)));
    } else {
      // Marcar todos do grupo
      const newSelected = [...new Set([...selectedPermissoes, ...grupoIds])];
      onChange(newSelected);
    }
  };

  const getGroupStats = (grupo: {
    nome: string;
    permissoes: PermissaoGlobal[];
  }) => {
    const grupoIds = grupo.permissoes.map((p) => p.id);
    const selectedCount = grupoIds.filter((id) =>
      selectedPermissoes.includes(id),
    ).length;
    const totalCount = grupoIds.length;
    return { selected: selectedCount, total: totalCount };
  };

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar permissões..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Contador */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {selectedPermissoes.length} de {permissoes.length} permissões
          selecionadas
        </span>
        {selectedPermissoes.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange([])}
            disabled={disabled}
          >
            Limpar seleção
          </Button>
        )}
      </div>

      {/* Grupos de permissões */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
        {filteredGrupos.map((grupo) => {
          const isExpanded = expandedGroups.has(grupo.nome);
          const stats = getGroupStats(grupo);
          const allSelected = stats.selected === stats.total;
          const someSelected = stats.selected > 0 && !allSelected;

          return (
            <Collapsible
              key={grupo.nome}
              open={isExpanded}
              onOpenChange={() => toggleGroup(grupo.nome)}
            >
              <div
                className={`border rounded-lg ${
                  isExpanded ? 'border-primary/50' : ''
                }`}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent rounded-t-lg">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div
                        className={`w-3 h-3 rounded-full ${getCorGrupo(grupo.nome)}`}
                      />
                      <span className="font-medium capitalize">
                        {grupo.nome}
                      </span>
                      <Badge variant="secondary" className="ml-2">
                        {stats.selected}/{stats.total}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAllInGroup(grupo);
                      }}
                      disabled={disabled}
                      className="text-xs"
                    >
                      {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                    </Button>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-3 pb-3 space-y-2">
                    {grupo.permissoes.map((permissao) => {
                      const isSelected = selectedPermissoes.includes(
                        permissao.id,
                      );

                      return (
                        <TooltipProvider key={permissao.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`flex items-start gap-3 p-2 rounded-md hover:bg-accent cursor-pointer ${
                                  isSelected ? 'bg-primary/5' : ''
                                }`}
                                onClick={() => togglePermissao(permissao.id)}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  disabled={disabled}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 space-y-1">
                                  <div className="text-sm font-medium">
                                    <HighlightText text={permissao.nomePermissao} query={searchTerm} />
                                  </div>
                                  {permissao.descricao && (
                                    <div className="text-xs text-muted-foreground">
                                      <HighlightText text={permissao.descricao} query={searchTerm} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <p className="font-medium">
                                {permissao.nomePermissao}
                              </p>
                              {permissao.descricao && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {permissao.descricao}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {filteredGrupos.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma permissão encontrada para "{searchTerm}"
        </div>
      )}
    </div>
  );
}
