import { db } from '@ecotech/shared/database';
import { planos, corretoras } from '@ecotech/shared/database';

export async function createTestPlano() {
  const ts = Date.now();
  const [plano] = await db
    .insert(planos)
    .values({
      nomePlano: `Plano Teste ${ts}`,
      valorMensal: '0',
      limiteUsuarios: 1000,
      limiteVendedores: 500,
      limiteClientes: 10000,
      ativo: true,
    })
    .returning();
  return plano;
}

export async function createTestCorretora(planoId: string) {
  const ts = Date.now();
  const cnpj = String(ts).slice(-14).padStart(14, '0');
  const [corretora] = await db
    .insert(corretoras)
    .values({
      planoId,
      razaoSocial: `Corretora Teste ${ts}`,
      cnpj,
      subdominio: `teste-${ts}`,
      emailContato: `corretora.${ts}@teste.com`,
      status: 'ATIVO',
    })
    .returning();
  return corretora;
}
