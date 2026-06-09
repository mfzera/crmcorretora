import { useCallback, useEffect, useState } from 'react';

export function useWorkspaceNavigation() {
  const [mesAtual, setMesAtual] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const vigenciaInicio = `${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, '0')}-01`;
  const vigenciaFim = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0).toISOString().split('T')[0];
  const nomeMesAtual = mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const irParaMesAnterior = useCallback(() => setMesAtual((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)), []);
  const irParaProximoMes = useCallback(() => setMesAtual((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); irParaMesAnterior(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); irParaProximoMes(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [irParaMesAnterior, irParaProximoMes]);

  return { mesAtual, vigenciaInicio, vigenciaFim, nomeMesAtual, irParaMesAnterior, irParaProximoMes };
}
