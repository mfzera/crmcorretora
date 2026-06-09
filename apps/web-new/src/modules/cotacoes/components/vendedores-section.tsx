
import { useState } from 'react';
import { User, Loader2, Building2, Plus, X } from 'lucide-react';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Label } from '@/core/ui/label';
import { Switch } from '@/core/ui/switch';
import { Input } from '@/core/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import {
  useVendedoresCotacao,
  useAdicionarVendedor,
} from '@/modules/area-trabalho/http';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';

interface VendedorCotacao {
  id: string;
  ativo: boolean;
  dataAtribuicao: string;
  vendedor: {
    id: string;
    nome: string;
    email: string;
  };
}

interface VendedoresSectionProps {
  cotacaoId: string;
  canEdit: boolean;
  vendedoresDisponiveis?: Array<{ id: string; nome: string; email: string }>;

  // Commission split props
  vendedorSecundarioId?: string | null;
  percentualComissaoPrincipal?: number | null;
  percentualComissaoSecundario?: number | null;
  percentualCorretora?: number | null;
  negocioCorretora?: boolean;
  onFieldChange?: (field: string, value: any) => void;
}

export function VendedoresSection({
  cotacaoId,
  canEdit,
  vendedoresDisponiveis = [],
  vendedorSecundarioId,
  percentualComissaoPrincipal,
  percentualComissaoSecundario,
  percentualCorretora,
  negocioCorretora,
  onFieldChange,
}: VendedoresSectionProps) {
  const { data: vendedores, isLoading } = useVendedoresCotacao(cotacaoId);
  const { mutate: adicionarVendedor, isPending } = useAdicionarVendedor();
  const [novoVendedorId, setNovoVendedorId] = useState<string>('');
  const [showSecondaryVendor, setShowSecondaryVendor] =
    useState(!!vendedorSecundarioId);
  const [localPercPrincipal, setLocalPercPrincipal] = useState(
    percentualComissaoPrincipal || 100,
  );
  const [localPercSecundario, setLocalPercSecundario] = useState(
    percentualComissaoSecundario || 0,
  );
  const [localPercCorretora, setLocalPercCorretora] = useState(
    percentualCorretora || 0,
  );

  const vendedorAtivo = vendedores?.find((v: VendedorCotacao) => v.ativo);
  const historico = vendedores?.filter((v: VendedorCotacao) => !v.ativo) || [];

  const percentualTotal =
    localPercPrincipal + localPercSecundario + localPercCorretora;
  const isValidSplit = Math.abs(percentualTotal - 100) < 0.01;

  const handleAdicionar = () => {
    if (!novoVendedorId) {
      toast.error('Selecione um vendedor');
      return;
    }

    adicionarVendedor(
      { cotacaoId, vendedorId: novoVendedorId },
      {
        onSuccess: () => {
          toast.success('Vendedor atualizado com sucesso!');
          setNovoVendedorId('');
        },
        onError: (error: unknown) => {
          toast.error(handleApiError(error));
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Vendedor Atual */}
      <div>
        <h3 className="font-semibold mb-3 text-sm">Vendedor Atual</h3>
        {vendedorAtivo ? (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{vendedorAtivo.vendedor.nome}</p>
              <p className="text-sm text-muted-foreground">
                {vendedorAtivo.vendedor.email}
              </p>
            </div>
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200"
            >
              Ativo
            </Badge>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum vendedor atribuído
          </p>
        )}
      </div>

      {/* Adicionar/Alterar Vendedor */}
      {canEdit && vendedoresDisponiveis.length > 0 && (
        <div className="space-y-2">
          <Label>Adicionar/Alterar Vendedor</Label>
          <div className="flex gap-2">
            <Select value={novoVendedorId} onValueChange={setNovoVendedorId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um vendedor..." />
              </SelectTrigger>
              <SelectContent>
                {vendedoresDisponiveis.map((vendedor) => (
                  <SelectItem key={vendedor.id} value={vendedor.id}>
                    <div className="flex flex-col">
                      <span>{vendedor.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {vendedor.email}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAdicionar}
              disabled={!novoVendedorId || isPending}
              size="default"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar
            </Button>
          </div>
        </div>
      )}

      {/* Histórico */}
      {historico.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Histórico de Vendedores</h3>
          <div className="space-y-2">
            {historico.map((v: VendedorCotacao) => (
              <div
                key={v.id}
                className="flex items-center gap-3 p-2.5 border rounded-lg bg-card"
              >
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {v.vendedor.nome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Até {new Date(v.dataAtribuicao).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  Inativo
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
