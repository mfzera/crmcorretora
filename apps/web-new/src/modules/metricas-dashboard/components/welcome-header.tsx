
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/infra/auth/auth-store';

function getDataExtenso(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatHora(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function WelcomeHeader() {
  const { user } = useAuthStore();
  const primeiroNome = user?.nome?.split(' ')[0] ?? '';

  const [hora, setHora] = useState(() => formatHora(new Date()));

  useEffect(() => {
    const interval = setInterval(() => {
      setHora(formatHora(new Date()));
    }, 30000); // atualiza a cada 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
        Excelente dia, {primeiroNome}!
      </h1>
      <p className="text-sm capitalize text-muted-foreground">
        {getDataExtenso()} · {hora}
      </p>
    </div>
  );
}
