export function formatDate(dateStr: string): string {
  const [year, month] = dateStr.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month) - 1]} ${year.slice(2)}`;
}

export function formatDateFull(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function getStatusBadge(diasParaVencer: number): { label: string; className: string } {
  if (diasParaVencer < 0) {
    return {
      label: 'Vencida',
      className: 'bg-red-500/15 text-red-400 border border-red-500/30',
    };
  }
  if (diasParaVencer <= 30) {
    return {
      label: 'Vencendo',
      className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    };
  }
  return {
    label: 'Ativo',
    className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  };
}

export function getTipoSeguroLabel(tipo: string | null): string {
  const map: Record<string, string> = {
    AUTO: 'Seg. Auto',
    RESIDENCIAL: 'Seg. Residencial',
    VIDA: 'Seg. Vida',
    SAUDE: 'Seg. Saúde',
    EMPRESARIAL: 'Seg. Empresarial',
    RURAL: 'Seg. Rural',
    TRANSPORTE: 'Seg. Transporte',
    RESPONSABILIDADE_CIVIL: 'Resp. Civil',
  };
  return tipo ? (map[tipo] ?? tipo) : '–';
}
