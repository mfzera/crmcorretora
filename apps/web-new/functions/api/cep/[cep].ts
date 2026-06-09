import type { PagesFunction } from '@cloudflare/workers-types';

export const onRequestGet: PagesFunction<Record<string, unknown>, 'cep'> = async ({ params }) => {
  const digits = (params.cep as string).replace(/\D/g, '');

  if (digits.length !== 8) {
    return Response.json({ erro: true }, { status: 400 });
  }

  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);

  if (!res.ok) {
    return Response.json({ erro: true }, { status: res.status });
  }

  const data = await res.json();
  return Response.json(data);
};
