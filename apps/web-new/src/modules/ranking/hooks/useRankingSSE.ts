import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getToken(): string | null {
  try {
    const stored = localStorage.getItem('auth-storage');
    if (!stored) return null;
    return JSON.parse(stored)?.state?.token ?? null;
  } catch {
    return null;
  }
}

export function useRankingSSE() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let aborted = false;
    let retryTimeout: ReturnType<typeof setTimeout>;
    let abortController = new AbortController();

    async function connect() {
      if (aborted) return;
      const token = getToken();
      if (!token) return;

      try {
        const res = await fetch(`${API_URL}/gamification/ranking/events`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal,
        });

        if (!res.ok || !res.body) {
          if (!aborted) retryTimeout = setTimeout(connect, 5_000);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            if (text.includes('event: ranking-updated')) {
              queryClient.invalidateQueries({ queryKey: ['ranking-docs-periodo'] });
              queryClient.invalidateQueries({ queryKey: ['ranking-ultima-venda'] });
              queryClient.invalidateQueries({ queryKey: ['gamificacao', 'ranking'] });
            }
          }
        } finally {
          reader.releaseLock();
        }

        // stream fechou normalmente — reconecta
        if (!aborted) retryTimeout = setTimeout(connect, 2_000);
      } catch (err) {
        if (aborted || (err as Error).name === 'AbortError') return;
        retryTimeout = setTimeout(connect, 5_000);
      }
    }

    connect();

    return () => {
      aborted = true;
      abortController.abort();
      clearTimeout(retryTimeout);
    };
  }, [queryClient]);
}
