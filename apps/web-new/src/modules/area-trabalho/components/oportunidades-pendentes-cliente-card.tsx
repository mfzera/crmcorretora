
import { useState } from 'react';
import { UserPlus, Loader2, AlertTriangle, Check, ChevronsUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/core/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/core/ui/command';
import { cn } from '@/core/utils';
import { NovoClienteDialog } from '@/modules/clientes/components/novo-cliente-dialog';
import {
  useOportunidadesPendentesCadastroCliente,
  useConfirmarClienteOportunidade,
} from '@/modules/kanban/http';
import { useSearchClients } from '@/modules/clientes/http';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';

function formatarData(dataIso: string) {
  return new Date(dataIso).toLocaleDateString('pt-BR');
}

function ClienteSearchRow({ oportunidade }: { oportunidade: any }) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<{ id: string; nome: string } | null>(null);
  const { data: clientesData = [] } = useSearchClients(clienteSearch);
  const confirmarMutation = useConfirmarClienteOportunidade();

  const pendente = oportunidade.metadata?.pendenteCadastroCliente;

  const handleConfirmar = async () => {
    if (!clienteSelecionado) return;
    try {
      const res: any = await confirmarMutation.mutateAsync({
        id: oportunidade.id,
        clienteId: clienteSelecionado.id,
      });
      toast.success(
        res?.cotacaoId
          ? 'Cliente vinculado! Cotação criada em Cotações Ativas.'
          : 'Cliente vinculado.',
      );
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0 border-amber-200/60 dark:border-amber-900/40">
      <div className="w-52 shrink-0 min-w-0">
        <p className="font-medium text-sm leading-tight truncate">{oportunidade.nomeCliente}</p>
        <p className="text-xs text-muted-foreground leading-tight mt-0.5">
          {pendente && (
            <span>
              {formatarData(pendente.dataVigenciaInicio)} → {formatarData(pendente.dataVigenciaFim)}
              {pendente.premioFinal && (
                <span className="ml-1.5">
                  · R$ {Number(pendente.premioFinal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              )}
            </span>
          )}
          {oportunidade.dataFechamento && (
            <span className={pendente ? 'ml-1.5' : ''}>
              {pendente ? '· ' : ''}Ganho em {formatarData(oportunidade.dataFechamento)}
            </span>
          )}
        </p>
      </div>

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen} modal>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn('flex-1 justify-between', !clienteSelecionado && 'text-muted-foreground')}
            size="sm"
          >
            <span className="truncate text-left flex-1">
              {clienteSelecionado ? clienteSelecionado.nome : 'Selecione o cliente...'}
            </span>
            <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[340px] p-0" align="end">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar cliente..."
              value={clienteSearch}
              onValueChange={setClienteSearch}
            />
            <CommandList>
              <CommandEmpty>
                {clienteSearch.length < 3 ? 'Digite ao menos 3 caracteres' : 'Nenhum cliente encontrado'}
              </CommandEmpty>
              <CommandGroup>
                {clientesData.map((c: any) => {
                  const nome = c.tipoPessoa === 'PF' ? c.nome : (c.nomeFantasia || c.razaoSocial);
                  return (
                    <CommandItem
                      key={c.id}
                      value={c.id}
                      onSelect={() => {
                        setClienteSelecionado({ id: c.id, nome: nome || '' });
                        setPopoverOpen(false);
                      }}
                    >
                      <Check
                        className={cn('mr-2 h-4 w-4', clienteSelecionado?.id === c.id ? 'opacity-100' : 'opacity-0')}
                      />
                      <div className="flex flex-col">
                        <span>{nome}</span>
                        <span className="text-xs text-muted-foreground">{c.cpf || c.cnpj}</span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => setNovoClienteOpen(true)}
        title="Cadastrar novo cliente"
      >
        <UserPlus className="h-3.5 w-3.5" />
      </Button>

      <Button
        type="button"
        size="sm"
        disabled={!clienteSelecionado || confirmarMutation.isPending}
        onClick={handleConfirmar}
        className="shrink-0"
      >
        {confirmarMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        {confirmarMutation.isPending ? 'Vinculando...' : 'Vincular'}
      </Button>

      <NovoClienteDialog
        open={novoClienteOpen}
        onOpenChange={setNovoClienteOpen}
        onClienteCriado={(cliente) => {
          const nome = cliente.tipoPessoa === 'PF' ? cliente.nome : (cliente.nomeFantasia || cliente.razaoSocial);
          setClienteSelecionado({ id: cliente.id, nome: nome || '' });
          setNovoClienteOpen(false);
        }}
      />
    </div>
  );
}

const INITIAL_VISIBLE = 3;

export function OportunidadesPendentesClienteCard() {
  const { data: oportunidades = [], isLoading } = useOportunidadesPendentesCadastroCliente();
  const [expandido, setExpandido] = useState(false);

  if (isLoading || oportunidades.length === 0) return null;

  const visiveis = expandido ? oportunidades : oportunidades.slice(0, INITIAL_VISIBLE);
  const ocultos = oportunidades.length - INITIAL_VISIBLE;

  return (
    <div className="rounded-lg border border-amber-300/50 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/10">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-200/60 dark:border-amber-900/40">
        <div className="rounded bg-amber-500/10 p-1 ring-1 ring-amber-500/30">
          <UserPlus className="size-3.5 text-amber-600 dark:text-amber-500" />
        </div>
        <span className="font-semibold text-sm">Aguardando Cadastro de Cliente</span>
        <AlertTriangle className="size-3 text-amber-500 shrink-0 ml-1" />
        <span className="text-xs text-muted-foreground truncate">Vincule o cliente para gerar a cotação.</span>
        <Badge className="ml-auto shrink-0 bg-amber-500 text-white hover:bg-amber-600">
          {oportunidades.length}
        </Badge>
      </div>
      <div className="px-4 py-1">
        {visiveis.map((oportunidade: any) => (
          <ClienteSearchRow key={oportunidade.id} oportunidade={oportunidade} />
        ))}
        {ocultos > 0 && (
          <button
            type="button"
            onClick={() => setExpandido(v => !v)}
            className="flex w-full items-center justify-center gap-1.5 rounded-md py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-amber-100/60 dark:hover:bg-amber-900/20 transition-colors"
          >
            {expandido ? (
              <><ChevronUp className="h-3.5 w-3.5" />Mostrar menos</>
            ) : (
              <><ChevronDown className="h-3.5 w-3.5" />Ver mais {ocultos} {ocultos === 1 ? 'item' : 'itens'}</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
