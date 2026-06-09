
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Building2, Check, Loader2 } from 'lucide-react';
import { cn } from '@/core/utils';
import { Badge } from '@/core/ui/badge';
import type { Corretora } from '@/modules/corretoras/http';

interface SelectCorretoraDialogProps {
  open: boolean;
  corretoras: Corretora[];
  onSelect: (corretoraId: string) => void;
  isLoading?: boolean;
}

export function SelectCorretoraDialog({
  open,
  corretoras,
  onSelect,
  isLoading = false,
}: SelectCorretoraDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (corretoraId: string) => {
    setSelectedId(corretoraId);
    onSelect(corretoraId);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Selecione a Corretora
          </DialogTitle>
          <DialogDescription>
            Você tem acesso a múltiplas corretoras. Escolha qual deseja acessar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4 max-h-[60vh] overflow-y-auto pr-1">
          {corretoras.map((corretora) => (
            <button
              key={corretora.id}
              onClick={() => handleSelect(corretora.id)}
              disabled={isLoading && selectedId === corretora.id}
              className={cn(
                'w-full p-4 rounded-lg border-2 transition-all text-left',
                'hover:border-primary hover:bg-accent',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                selectedId === corretora.id && 'border-primary bg-accent',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {corretora.logoUrl ? (
                    <img
                      src={corretora.logoUrl}
                      alt={corretora.nomeFantasia}
                      className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">
                        {corretora.nomeFantasia || corretora.razaoSocial}
                      </h3>
                      {corretora.ativa && (
                        <Badge variant="default" className="text-xs">
                          Atual
                        </Badge>
                      )}
                    </div>
                    {corretora.razaoSocial !== corretora.nomeFantasia && (
                      <p className="text-sm text-muted-foreground truncate">
                        {corretora.razaoSocial}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {corretora.cargo?.nome ?? 'Sem cargo definido'}
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {isLoading && selectedId === corretora.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : selectedId === corretora.id ? (
                    <Check className="h-5 w-5 text-primary" />
                  ) : (
                    <div className="h-5 w-5" />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Você poderá trocar de corretora a qualquer momento pelo menu superior
        </div>
      </DialogContent>
    </Dialog>
  );
}
