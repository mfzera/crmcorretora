import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { db } from '@ecotech/shared/database';
import { corretoras, planos } from '@ecotech/shared/database';
import { eq, sql } from 'drizzle-orm';
import { QuotaExceededError } from '@ecotech/shared/utils';
import { MetricsService } from '@ecotech/shared/storage';

export type QuotaType =
  | 'usuario'
  | 'vendedor'
  | 'cliente'
  | 'venda'
  | 'storage';

declare module 'fastify' {
  interface FastifyInstance {
    validateQuota: (corretoraId: string, tipo: QuotaType) => Promise<void>;
    incrementQuota: (corretoraId: string, tipo: QuotaType) => Promise<void>;
    decrementQuota: (corretoraId: string, tipo: QuotaType) => Promise<void>;
  }
}

async function quotaValidatorPlugin(fastify: FastifyInstance) {
  async function validateQuota(
    corretoraId: string,
    tipo: QuotaType,
  ): Promise<void> {
    const corretora: any = await db.query.corretoras.findFirst({
      where: eq(corretoras.id, corretoraId),
      with: { plano: true } as any,
    });

    if (!corretora || !corretora.plano) {
      throw new Error('Corretora ou plano não encontrado');
    }

    const plano = corretora.plano;

    switch (tipo) {
      case 'usuario':
        if (
          plano.limiteUsuarios &&
          (corretora.usuariosAtivos ?? 0) >= plano.limiteUsuarios
        ) {
          throw new QuotaExceededError(
            `Limite de usuários atingido (${plano.limiteUsuarios})`,
            {
              limite: plano.limiteUsuarios,
              atual: corretora.usuariosAtivos,
              tipo: 'usuarios',
            },
          );
        }
        break;

      case 'vendedor':
        if (
          plano.limiteVendedores &&
          (corretora.vendedoresAtivos ?? 0) >= plano.limiteVendedores
        ) {
          throw new QuotaExceededError(
            `Limite de vendedores atingido (${plano.limiteVendedores})`,
            {
              limite: plano.limiteVendedores,
              atual: corretora.vendedoresAtivos,
              tipo: 'vendedores',
            },
          );
        }
        break;

      case 'cliente':
        if (
          plano.limiteClientes &&
          (corretora.clientesCadastrados ?? 0) >= plano.limiteClientes
        ) {
          throw new QuotaExceededError(
            `Limite de clientes atingido (${plano.limiteClientes})`,
            {
              limite: plano.limiteClientes,
              atual: corretora.clientesCadastrados,
              tipo: 'clientes',
            },
          );
        }
        break;

      case 'venda':
        if (
          plano.limiteVendasMes &&
          (corretora.vendasMesAtual ?? 0) >= plano.limiteVendasMes
        ) {
          throw new QuotaExceededError(
            `Limite de vendas do mês atingido (${plano.limiteVendasMes})`,
            {
              limite: plano.limiteVendasMes,
              atual: corretora.vendasMesAtual,
              tipo: 'vendas_mes',
            },
          );
        }
        break;

      case 'storage':
        const limitStatus = await MetricsService.checkLimits(corretoraId);
        if (limitStatus.shouldBlock) {
          throw new QuotaExceededError(
            `Limite de storage atingido (${limitStatus.percentUsed.toFixed(1)}% usado)`,
            {
              limite: limitStatus.bytesLimit,
              atual: limitStatus.bytesUsed,
              tipo: 'storage',
              percentUsed: limitStatus.percentUsed,
            },
          );
        }
        break;
    }
  }

  async function incrementQuota(
    corretoraId: string,
    tipo: QuotaType,
  ): Promise<void> {
    const columnMap: Record<QuotaType, string> = {
      usuario: 'usuarios_ativos',
      vendedor: 'vendedores_ativos',
      cliente: 'clientes_cadastrados',
      venda: 'vendas_mes_atual',
      storage: 'storage_usado_bytes',
    };

    const column = columnMap[tipo];

    // P4-A: único UPDATE — a query raw já inclui updated_at = NOW(),
    // eliminando o db.update redundante que existia antes
    await db.execute(
      sql`UPDATE corretora
          SET ${sql.raw(column)} = COALESCE(${sql.raw(column)}, 0) + 1,
              updated_at = NOW()
          WHERE id = ${corretoraId}`,
    );
  }

  async function decrementQuota(
    corretoraId: string,
    tipo: QuotaType,
  ): Promise<void> {
    const columnMap: Record<QuotaType, string> = {
      usuario: 'usuarios_ativos',
      vendedor: 'vendedores_ativos',
      cliente: 'clientes_cadastrados',
      venda: 'vendas_mes_atual',
      storage: 'storage_usado_bytes',
    };

    const column = columnMap[tipo];

    // Execute raw SQL for decrement
    await db.execute(
      sql`UPDATE corretora
          SET ${sql.raw(column)} = GREATEST(COALESCE(${sql.raw(column)}, 0) - 1, 0),
              updated_at = NOW()
          WHERE id = ${corretoraId}`,
    );
  }

  fastify.decorate('validateQuota', validateQuota);
  fastify.decorate('incrementQuota', incrementQuota);
  fastify.decorate('decrementQuota', decrementQuota);
}

const quotaValidatorPluginWithFp = fp(quotaValidatorPlugin, {
  name: 'quota-validator',
});

export default quotaValidatorPluginWithFp;
export { quotaValidatorPluginWithFp as quotaValidator };
