
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Progress } from '@/core/ui/progress';

interface ImportSummaryCardsProps {
  total: number;
  sucesso: number;
  erros: number;
  pendentes: number;
  pulados: number;
}

export function ImportSummaryCards({
  total,
  sucesso,
  erros,
  pendentes,
  pulados,
}: ImportSummaryCardsProps) {
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="font-medium">Sucesso</span>
        </div>
        <p className="text-2xl font-bold">{sucesso}</p>
        <Progress value={pct(sucesso)} className="mt-2 [&>div]:bg-green-500" />
      </div>

      <div className="border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-5 w-5 text-blue-500" />
          <span className="font-medium">Pendentes</span>
        </div>
        <p className="text-2xl font-bold">{pendentes}</p>
        <Progress value={pct(pendentes)} className="mt-2 [&>div]:bg-blue-500" />
      </div>

      <div className="border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          <span className="font-medium">Pulados</span>
        </div>
        <p className="text-2xl font-bold">{pulados}</p>
        <Progress value={pct(pulados)} className="mt-2 [&>div]:bg-yellow-500" />
      </div>

      <div className="border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <XCircle className="h-5 w-5 text-red-500" />
          <span className="font-medium">Erros</span>
        </div>
        <p className="text-2xl font-bold">{erros}</p>
        <Progress value={pct(erros)} className="mt-2 [&>div]:bg-red-500" />
      </div>
    </div>
  );
}
