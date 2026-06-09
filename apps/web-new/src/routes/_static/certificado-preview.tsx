import { createFileRoute } from '@tanstack/react-router';
import { Certificado } from '@/modules/treinamentos/components/Certificado';

export const Route = createFileRoute('/_static/certificado-preview')({
  component: CertificadoPreviewPage,
});


const props = {
  nome: 'Miguel Ferreira Caetano',
  curso: 'Gestão Operacional com Workspace',
  descricao: 'Renovações pendentes, cotações ativas, endossos e conversão de vendas em um painel unificado.',
  totalAulas: 8,
  data: '15 de abril de 2026',
  certificadoId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
};

function CertificadoPreviewPage() {
  return (
    <div className="min-h-screen bg-gray-200 flex flex-col items-center py-12 gap-10">
      <div className="flex flex-col items-center gap-2 w-full max-w-5xl">
        <p className="text-xs font-mono text-gray-500">light</p>
        <div className="w-full shadow-2xl rounded-xl overflow-hidden">
          <Certificado {...props} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 w-full max-w-5xl">
        <p className="text-xs font-mono text-gray-500">dark</p>
        <div className="w-full shadow-2xl rounded-xl overflow-hidden">
          <Certificado {...props} dark />
        </div>
      </div>
    </div>
  );
}
