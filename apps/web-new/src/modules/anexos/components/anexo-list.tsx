
import { useAnexos } from '../http';
import { AnexoCard } from './anexo-card';
import { Loader2 } from 'lucide-react';

interface AnexoListProps {
  entidade: string;
  entidadeId: string;
  readOnly?: boolean;
}

export function AnexoList({ entidade, entidadeId, readOnly }: AnexoListProps) {
  const { data: anexos, isLoading } = useAnexos(entidade, entidadeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!anexos || anexos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">Nenhum anexo encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {anexos.map((anexo) => (
        <AnexoCard key={anexo.id} anexo={anexo} contextEntidade={entidade} readOnly={readOnly} />
      ))}
    </div>
  );
}
