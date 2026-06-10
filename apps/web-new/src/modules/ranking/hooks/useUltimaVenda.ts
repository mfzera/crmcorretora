import { useQuery } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import { type UltimaVenda } from '../components/UltimaVendaCard';

export function useUltimaVenda(
  usuariosMap: Record<string, { avatarUrl: string | null; cargo: string | null }>,
) {
  const { data } = useQuery({
    queryKey: ['ranking-ultima-venda'],
    queryFn: async () => {
      const res = await api.get<any>('/sales-documents', { params: { limit: 1 } });
      const docs = Array.isArray(res) ? res : ((res as any)?.data ?? []);
      return (docs[0] ?? null) as UltimaVenda | null;
    },
    staleTime: 60_000,
    retry: false,
  });

  const vendedorId = data?.vendedor?.id;
  const avatarUrl = vendedorId
    ? (usuariosMap[vendedorId]?.avatarUrl ?? null)
    : null;
  const cargo = vendedorId ? (usuariosMap[vendedorId]?.cargo ?? null) : null;

  return { ultimaVenda: data ?? null, avatarUrl, cargo };
}
