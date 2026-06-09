import { db } from '@ecotech/shared/database';
import {
  oportunidades,
  corretoras,
  oportunidadeStatusEnum,
  oportunidadePrioridadeEnum,
} from '@ecotech/shared/database';
import { eq, and, isNull, notInArray, sql } from 'drizzle-orm';

type OportunidadeStatus = (typeof oportunidadeStatusEnum.enumValues)[number];
type OportunidadePrioridade =
  (typeof oportunidadePrioridadeEnum.enumValues)[number];

/**
 * Atualiza automaticamente o status de uma oportunidade baseado em eventos do sistema
 */
export async function updateOpportunityStatus(
  oportunidadeId: string,
  novoStatus: OportunidadeStatus,
  corretoraId: string,
  motivoPerda?: string,
) {
  try {
    const oportunidade = await db.query.oportunidades.findFirst({
      where: and(
        eq(oportunidades.id, oportunidadeId),
        eq(oportunidades.corretoraId, corretoraId),
        isNull(oportunidades.deletedAt),
      ),
    });

    if (!oportunidade) {
      console.warn(`Oportunidade ${oportunidadeId} não encontrada`);
      return null;
    }

    // Não atualizar se já está no status final
    if (oportunidade.status === novoStatus) {
      return oportunidade;
    }

    const updateData: any = {
      status: novoStatus,
      updatedAt: new Date(),
    };

    // Se for perdida, adicionar motivo
    if (novoStatus === 'perdida' && motivoPerda) {
      updateData.motivoPerda = motivoPerda;
    }

    const [updated] = await db
      .update(oportunidades)
      .set(updateData)
      .where(eq(oportunidades.id, oportunidadeId))
      .returning();

    console.log(
      `✅ Oportunidade ${oportunidadeId} movida automaticamente para ${novoStatus}`,
    );

    return updated;
  } catch (error) {
    console.error('❌ Erro ao atualizar status da oportunidade:', error);
    return null;
  }
}

/**
 * Procura oportunidade relacionada a um cliente e produto
 */
export async function findRelatedOpportunity(
  clienteId: string,
  produtoId: string | null,
  corretoraId: string,
) {
  try {
    // Buscar oportunidade mais recente do cliente que ainda está ativa
    const oportunidade = await db.query.oportunidades.findFirst({
      where: and(
        eq(oportunidades.clienteId, clienteId),
        eq(oportunidades.corretoraId, corretoraId),
        isNull(oportunidades.deletedAt),
      ),
      orderBy: (oportunidades, { desc }) => [desc(oportunidades.createdAt)],
    });

    return oportunidade;
  } catch (error) {
    console.error('❌ Erro ao buscar oportunidade relacionada:', error);
    return null;
  }
}

/**
 * Calcula a prioridade de uma oportunidade com base nos dias sem contato
 */
export function calculatePriority(
  diasSemContato: number,
  config: {
    diasBaixa: number;
    diasMedia: number;
    diasAlta: number;
    diasUrgente: number;
  },
): OportunidadePrioridade {
  if (diasSemContato >= config.diasUrgente) {
    return 'urgente';
  } else if (diasSemContato >= config.diasAlta) {
    return 'alta';
  } else if (diasSemContato >= config.diasMedia) {
    return 'media';
  } else {
    return 'baixa';
  }
}

/**
 * Atualiza as prioridades de todas as oportunidades de uma seguradora
 * baseado nas configurações de prioridade automática
 */
export async function updateAutomaticPriorities(corretoraId: string) {
  try {
    // Buscar configuração da corretora
    const corretora = await db.query.corretoras.findFirst({
      where: eq(corretoras.id, corretoraId),
      columns: {
        configCrm: true,
      },
    });

    const config = corretora?.configCrm?.prioridadeAutomatica;

    // Se não tiver configuração ou não estiver habilitado, não faz nada
    if (!config || !config.habilitado) {
      return { updated: 0, skipped: true };
    }

    // Buscar oportunidades ativas (não finalizadas)
    const oportunidadesAtivas = await db.query.oportunidades.findMany({
      where: and(
        eq(oportunidades.corretoraId, corretoraId),
        isNull(oportunidades.deletedAt),
        notInArray(oportunidades.status, ['ganha', 'perdida']),
      ),
      columns: {
        id: true,
        prioridade: true,
        dataUltimoContato: true,
        createdAt: true,
      },
    });

    let updateCount = 0;

    for (const oportunidade of oportunidadesAtivas) {
      // Usar dataUltimoContato se disponível, senão usar createdAt
      const dataReferencia =
        oportunidade.dataUltimoContato || oportunidade.createdAt;
      const agora = new Date();
      const diasSemContato = Math.floor(
        (agora.getTime() - new Date(dataReferencia).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const novaPrioridade = calculatePriority(diasSemContato, config);

      // Só atualiza se a prioridade mudou
      if (novaPrioridade !== oportunidade.prioridade) {
        await db
          .update(oportunidades)
          .set({
            prioridade: novaPrioridade,
            updatedAt: new Date(),
          })
          .where(eq(oportunidades.id, oportunidade.id));

        updateCount++;
        console.log(
          `✅ Oportunidade ${oportunidade.id} prioridade atualizada: ${oportunidade.prioridade} -> ${novaPrioridade} (${diasSemContato} dias sem contato)`,
        );
      }
    }

    console.log(
      `📊 Prioridades atualizadas para corretora ${corretoraId}: ${updateCount} de ${oportunidadesAtivas.length} oportunidades`,
    );

    return { updated: updateCount, total: oportunidadesAtivas.length };
  } catch (error) {
    console.error('❌ Erro ao atualizar prioridades automáticas:', error);
    return { updated: 0, error };
  }
}

/**
 * Calcula a prioridade para uma única oportunidade
 * Útil para exibir no frontend sem atualizar o banco
 */
export async function calculateOpportunityPriority(
  oportunidadeId: string,
  corretoraId: string,
): Promise<OportunidadePrioridade | null> {
  try {
    // Buscar configuração da corretora
    const corretora = await db.query.corretoras.findFirst({
      where: eq(corretoras.id, corretoraId),
      columns: {
        configCrm: true,
      },
    });

    const config = corretora?.configCrm?.prioridadeAutomatica;

    // Se não tiver configuração ou não estiver habilitado, retorna null
    if (!config || !config.habilitado) {
      return null;
    }

    // Buscar oportunidade
    const oportunidade = await db.query.oportunidades.findFirst({
      where: and(
        eq(oportunidades.id, oportunidadeId),
        eq(oportunidades.corretoraId, corretoraId),
        isNull(oportunidades.deletedAt),
      ),
      columns: {
        dataUltimoContato: true,
        createdAt: true,
      },
    });

    if (!oportunidade) {
      return null;
    }

    const dataReferencia =
      oportunidade.dataUltimoContato || oportunidade.createdAt;
    const agora = new Date();
    const diasSemContato = Math.floor(
      (agora.getTime() - new Date(dataReferencia).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return calculatePriority(diasSemContato, config);
  } catch (error) {
    console.error('❌ Erro ao calcular prioridade da oportunidade:', error);
    return null;
  }
}
