
import * as React from 'react';
import { Check, ChevronsUpDown, Search, User, Building2 } from 'lucide-react';
import { cn } from '@/core/utils';
import { Button } from '@/core/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/core/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/core/ui/popover';
import type { Cliente } from '@/types/area-trabalho';

interface ClienteComboboxProps {
  value?: string;
  onValueChange: (value: string) => void;
  clientes: Cliente[];
  isLoading?: boolean;
  placeholder?: string;
}

export function ClienteCombobox({
  value,
  onValueChange,
  clientes,
  isLoading = false,
  placeholder = 'Selecione um cliente...',
}: ClienteComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const selectedCliente = clientes.find((cliente) => cliente.id === value);

  const filteredClientes = React.useMemo(() => {
    if (!search) return clientes;

    const searchLower = search.toLowerCase();
    return clientes.filter((cliente) => {
      const nome =
        cliente.tipoPessoa === 'PF'
          ? cliente.nome?.toLowerCase()
          : (cliente.nomeFantasia || cliente.razaoSocial)?.toLowerCase();

      const documento =
        cliente.tipoPessoa === 'PF' ? cliente.cpf : cliente.cnpj;

      return (
        nome?.includes(searchLower) || documento?.includes(search.replace(/\D/g, ''))
      );
    });
  }, [clientes, search]);

  const getClienteDisplay = (cliente: Cliente) => {
    const nome =
      cliente.tipoPessoa === 'PF'
        ? cliente.nome
        : cliente.nomeFantasia || cliente.razaoSocial;

    const documento =
      cliente.tipoPessoa === 'PF'
        ? cliente.cpf
        : cliente.cnpj;

    return { nome, documento };
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={isLoading}
        >
          {selectedCliente ? (
            <span className="flex items-center gap-2">
              {selectedCliente.tipoPessoa === 'PF' ? (
                <User className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Building2 className="h-4 w-4 text-muted-foreground" />
              )}
              {getClienteDisplay(selectedCliente).nome}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Buscar cliente..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Carregando clientes...
              </div>
            ) : filteredClientes.length === 0 ? (
              <CommandEmpty>
                {search
                  ? 'Nenhum cliente encontrado.'
                  : 'Nenhum cliente disponível.'}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredClientes.map((cliente) => {
                  const { nome, documento } = getClienteDisplay(cliente);
                  return (
                    <CommandItem
                      key={cliente.id}
                      value={cliente.id}
                      onSelect={(currentValue) => {
                        onValueChange(currentValue === value ? '' : currentValue);
                        setOpen(false);
                        setSearch('');
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {cliente.tipoPessoa === 'PF' ? (
                          <User className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{nome}</div>
                          {documento && (
                            <div className="text-xs text-muted-foreground">
                              {cliente.tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'}:{' '}
                              {documento}
                            </div>
                          )}
                        </div>
                      </div>
                      <Check
                        className={cn(
                          'ml-auto h-4 w-4',
                          value === cliente.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
