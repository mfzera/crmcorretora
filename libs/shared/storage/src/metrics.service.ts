import { db } from '@ecotech/shared/database';
import {
  storageMetrics,
  storageLimits,
  anexos,
  corretoras,
} from '@ecotech/shared/database';
import { eq, and, isNull, sql, gte, lte, desc } from 'drizzle-orm';

// R2 Pricing (2024)
const R2_PRICING = {
  STORAGE_PER_GB: 0.015, // $/GB/month
  CLASS_A_PER_MILLION: 4.5, // write operations
  CLASS_B_PER_MILLION: 0.36, // read operations
  EGRESS: 0, // FREE!
};

export interface StorageUsageSnapshot {
  corretoraId: string;
  data: Date;
  totalArquivos: number;
  totalBytes: number;
  totalBytesCotacoes: number;
  totalBytesDocumentos: number;
  totalBytesChat: number;
  arquivosAdicionados: number;
  arquivosRemovidos: number;
  bytesAdicionados: number;
  bytesRemovidos: number;
  custoEstimadoMensal: number;
}

export interface LimitStatus {
  ok: boolean;
  shouldAlert: boolean;
  shouldBlock: boolean;
  percentUsed: number;
  bytesUsed: number;
  bytesLimit: number;
  arquivosUsados: number;
  arquivosLimit: number;
}

export class MetricsService {
  /**
   * Calcular uso atual de storage de uma corretora
   */
  static async calculateCurrentUsage(corretoraId: string): Promise<{
    totalArquivos: number;
    totalBytes: number;
    byType: {
      cotacoes: number;
      documentos: number;
      chat: number;
    };
  }> {
    const result = await db
      .select({
        count: sql<number>`count(*)`,
        totalBytes: sql<number>`COALESCE(sum(${anexos.tamanho}), 0)`,
        entidadeTipo: anexos.entidadeTipo,
      })
      .from(anexos)
      .where(and(eq(anexos.corretoraId, corretoraId), isNull(anexos.deletedAt)))
      .groupBy(anexos.entidadeTipo);

    const usage = {
      totalArquivos: 0,
      totalBytes: 0,
      byType: {
        cotacoes: 0,
        documentos: 0,
        chat: 0,
      },
    };

    for (const row of result) {
      usage.totalArquivos += Number(row.count);
      usage.totalBytes += Number(row.totalBytes);

      if (row.entidadeTipo === 'cotacao') {
        usage.byType.cotacoes = Number(row.totalBytes);
      } else if (row.entidadeTipo === 'documento_venda') {
        usage.byType.documentos = Number(row.totalBytes);
      } else if (row.entidadeTipo === 'mensagem_chat') {
        usage.byType.chat = Number(row.totalBytes);
      }
    }

    return usage;
  }

  /**
   * Criar snapshot diário de métricas
   */
  static async createDailySnapshot(
    corretoraId: string,
    data?: Date,
  ): Promise<StorageUsageSnapshot> {
    const snapshotDate = data || new Date();
    const dateOnly = snapshotDate.toISOString().split('T')[0];

    // Calcular uso atual
    const currentUsage = await this.calculateCurrentUsage(corretoraId);

    // Buscar snapshot anterior
    const previousSnapshot = await db.query.storageMetrics.findFirst({
      where: eq(storageMetrics.corretoraId, corretoraId),
      orderBy: desc(storageMetrics.data),
    });

    // Calcular delta
    const arquivosAdicionados = previousSnapshot
      ? Math.max(0, currentUsage.totalArquivos - previousSnapshot.totalArquivos)
      : currentUsage.totalArquivos;

    const arquivosRemovidos = previousSnapshot
      ? Math.max(0, previousSnapshot.totalArquivos - currentUsage.totalArquivos)
      : 0;

    const bytesAdicionados = previousSnapshot
      ? Math.max(0, currentUsage.totalBytes - previousSnapshot.totalBytes)
      : currentUsage.totalBytes;

    const bytesRemovidos = previousSnapshot
      ? Math.max(0, previousSnapshot.totalBytes - currentUsage.totalBytes)
      : 0;

    // Calcular custo estimado
    const custoEstimadoMensal = this.calculateMonthlyCost(
      currentUsage.totalBytes,
    );

    // Inserir ou atualizar snapshot
    const [snapshot] = await db
      .insert(storageMetrics)
      .values({
        corretoraId,
        data: dateOnly,
        totalArquivos: currentUsage.totalArquivos,
        totalBytes: currentUsage.totalBytes,
        totalBytesCotacoes: currentUsage.byType.cotacoes,
        totalBytesDocumentos: currentUsage.byType.documentos,
        totalBytesChat: currentUsage.byType.chat,
        arquivosAdicionados,
        arquivosRemovidos,
        bytesAdicionados,
        bytesRemovidos,
        custoEstimadoMensal: custoEstimadoMensal.toFixed(2),
      })
      .onConflictDoUpdate({
        target: [storageMetrics.corretoraId, storageMetrics.data],
        set: {
          totalArquivos: currentUsage.totalArquivos,
          totalBytes: currentUsage.totalBytes,
          totalBytesCotacoes: currentUsage.byType.cotacoes,
          totalBytesDocumentos: currentUsage.byType.documentos,
          totalBytesChat: currentUsage.byType.chat,
          arquivosAdicionados,
          arquivosRemovidos,
          bytesAdicionados,
          bytesRemovidos,
          custoEstimadoMensal: custoEstimadoMensal.toFixed(2),
        },
      })
      .returning();

    return {
      corretoraId: snapshot.corretoraId,
      data: new Date(snapshot.data),
      totalArquivos: snapshot.totalArquivos,
      totalBytes: snapshot.totalBytes,
      totalBytesCotacoes: snapshot.totalBytesCotacoes,
      totalBytesDocumentos: snapshot.totalBytesDocumentos,
      totalBytesChat: snapshot.totalBytesChat,
      arquivosAdicionados: snapshot.arquivosAdicionados,
      arquivosRemovidos: snapshot.arquivosRemovidos,
      bytesAdicionados: snapshot.bytesAdicionados,
      bytesRemovidos: snapshot.bytesRemovidos,
      custoEstimadoMensal,
    };
  }

  /**
   * Criar snapshots para todas as corretoras
   */
  static async createDailySnapshotsForAll(): Promise<StorageUsageSnapshot[]> {
    const allCorretoras = await db.query.corretoras.findMany({
      columns: { id: true },
    });

    const snapshots: StorageUsageSnapshot[] = [];

    for (const corretora of allCorretoras) {
      try {
        const snapshot = await this.createDailySnapshot(corretora.id);
        snapshots.push(snapshot);
      } catch (error) {
        console.error(
          `Erro ao criar snapshot para corretora ${corretora.id}:`,
          error,
        );
      }
    }

    return snapshots;
  }

  /**
   * Obter histórico de métricas
   */
  static async getHistoricalData(
    corretoraId: string,
    days: number = 30,
  ): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await db.query.storageMetrics.findMany({
      where: and(
        eq(storageMetrics.corretoraId, corretoraId),
        gte(storageMetrics.data, startDate.toISOString().split('T')[0]),
      ),
      orderBy: desc(storageMetrics.data),
    });

    return metrics;
  }

  /**
   * Verificar limites e status
   */
  static async checkLimits(corretoraId: string): Promise<LimitStatus> {
    // Buscar ou criar limites
    let limits = await db.query.storageLimits.findFirst({
      where: eq(storageLimits.corretoraId, corretoraId),
    });

    if (!limits) {
      // Criar limites padrão
      [limits] = await db
        .insert(storageLimits)
        .values({
          corretoraId,
          limiteBytes: 5 * 1024 * 1024 * 1024, // 5GB
          limiteArquivos: 10000,
          alertarEm: '80.00',
          bloquearUploadEm: '95.00',
          emailsAlerta: [],
        })
        .returning();
    }

    // Calcular uso atual
    const usage = await this.calculateCurrentUsage(corretoraId);

    // Se não há limites configurados (null = ilimitado), retornar status OK
    if (!limits.limiteBytes && !limits.limiteArquivos) {
      return {
        ok: true,
        shouldAlert: false,
        shouldBlock: false,
        percentUsed: 0,
        bytesUsed: usage.totalBytes,
        bytesLimit: limits.limiteBytes ?? 0,
        arquivosUsados: usage.totalArquivos,
        arquivosLimit: limits.limiteArquivos ?? 0,
      };
    }

    // Calcular percentual usado
    const percentUsedBytes = limits.limiteBytes
      ? (usage.totalBytes / limits.limiteBytes) * 100
      : 0;
    const percentUsedArquivos = limits.limiteArquivos
      ? (usage.totalArquivos / limits.limiteArquivos) * 100
      : 0;
    const percentUsed = Math.max(percentUsedBytes, percentUsedArquivos);

    const shouldAlert = percentUsed >= Number(limits.alertarEm);
    const shouldBlock = percentUsed >= Number(limits.bloquearUploadEm);

    return {
      ok: !shouldBlock,
      shouldAlert,
      shouldBlock,
      percentUsed,
      bytesUsed: usage.totalBytes,
      bytesLimit: limits.limiteBytes ?? 0,
      arquivosUsados: usage.totalArquivos,
      arquivosLimit: limits.limiteArquivos ?? 0,
    };
  }

  /**
   * Calcular custo mensal estimado (R2 pricing)
   */
  private static calculateMonthlyCost(totalBytes: number): number {
    const gb = totalBytes / (1024 * 1024 * 1024);
    return gb * R2_PRICING.STORAGE_PER_GB;
  }

  /**
   * Obter overview de todas as corretoras
   */
  static async getGlobalOverview(): Promise<{
    totalCorretoras: number;
    totalArquivos: number;
    totalBytes: number;
    totalCustoMensal: number;
    topCorretoras: any[];
  }> {
    // Buscar snapshots mais recentes de cada corretora
    const recentSnapshots = await db
      .select({
        corretoraId: storageMetrics.corretoraId,
        totalArquivos: storageMetrics.totalArquivos,
        totalBytes: storageMetrics.totalBytes,
        custoEstimadoMensal: storageMetrics.custoEstimadoMensal,
        data: storageMetrics.data,
      })
      .from(storageMetrics)
      .orderBy(desc(storageMetrics.data))
      .limit(1000);

    // Agrupar por corretora (pegar mais recente de cada uma)
    const byCorretora = new Map();
    for (const snapshot of recentSnapshots) {
      if (!byCorretora.has(snapshot.corretoraId)) {
        byCorretora.set(snapshot.corretoraId, snapshot);
      }
    }

    const snapshots = Array.from(byCorretora.values());

    const totalCorretoras = snapshots.length;
    const totalArquivos = snapshots.reduce(
      (sum, s) => sum + s.totalArquivos,
      0,
    );
    const totalBytes = snapshots.reduce((sum, s) => sum + s.totalBytes, 0);
    const totalCustoMensal = snapshots.reduce(
      (sum, s) => sum + Number(s.custoEstimadoMensal || 0),
      0,
    );

    // Top 10 corretoras por uso
    const topCorretoras = snapshots
      .sort((a, b) => b.totalBytes - a.totalBytes)
      .slice(0, 10);

    return {
      totalCorretoras,
      totalArquivos,
      totalBytes,
      totalCustoMensal,
      topCorretoras,
    };
  }

  /**
   * Obter arquivos maiores de uma corretora
   */
  static async getLargestFiles(corretoraId: string, limit: number = 20) {
    const largestFiles = await db.query.anexos.findMany({
      where: and(eq(anexos.corretoraId, corretoraId), isNull(anexos.deletedAt)),
      orderBy: desc(anexos.tamanho),
      limit,
      columns: {
        id: true,
        nomeOriginal: true,
        tamanho: true,
        entidadeTipo: true,
        uploadEm: true,
        mimeType: true,
      },
      with: {
        uploadPor: {
          columns: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    return largestFiles.map((file) => ({
      ...file,
      tamanhoFormatado: this.formatBytes(file.tamanho),
    }));
  }

  /**
   * Obter histórico de uso com crescimento
   */
  static async getUsageHistory(
    corretoraId: string,
    days: number = 30,
  ): Promise<
    Array<{
      data: string;
      totalBytes: number;
      totalArquivos: number;
      crescimentoBytes: number;
      crescimentoArquivos: number;
    }>
  > {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshots = await db.query.storageMetrics.findMany({
      where: and(
        eq(storageMetrics.corretoraId, corretoraId),
        gte(storageMetrics.data, startDate.toISOString().split('T')[0]),
      ),
      orderBy: storageMetrics.data,
    });

    return snapshots.map((snapshot) => ({
      data: snapshot.data,
      totalBytes: snapshot.totalBytes,
      totalArquivos: snapshot.totalArquivos,
      crescimentoBytes: snapshot.bytesAdicionados - snapshot.bytesRemovidos,
      crescimentoArquivos:
        snapshot.arquivosAdicionados - snapshot.arquivosRemovidos,
    }));
  }

  /**
   * Calcular custos detalhados
   */
  static async calculateCosts(corretoraId: string): Promise<{
    storageGB: number;
    storageCostMonthly: number;
    estimatedWrites: number;
    estimatedReads: number;
    operationsCostMonthly: number;
    totalCostMonthly: number;
    breakdown: {
      storage: number;
      writes: number;
      reads: number;
      egress: number;
    };
  }> {
    const usage = await this.calculateCurrentUsage(corretoraId);

    // Storage cost
    const storageGB = usage.totalBytes / (1024 * 1024 * 1024);
    const storageCostMonthly = storageGB * R2_PRICING.STORAGE_PER_GB;

    // Estimativa de operações (baseado em uso médio)
    const estimatedWrites = usage.totalArquivos * 2; // upload + metadata update
    const estimatedReads = usage.totalArquivos * 10; // ~10 leituras por arquivo/mês

    const writesCost =
      (estimatedWrites / 1000000) * R2_PRICING.CLASS_A_PER_MILLION;
    const readsCost =
      (estimatedReads / 1000000) * R2_PRICING.CLASS_B_PER_MILLION;
    const operationsCostMonthly = writesCost + readsCost;

    const totalCostMonthly = storageCostMonthly + operationsCostMonthly;

    return {
      storageGB,
      storageCostMonthly,
      estimatedWrites,
      estimatedReads,
      operationsCostMonthly,
      totalCostMonthly,
      breakdown: {
        storage: storageCostMonthly,
        writes: writesCost,
        reads: readsCost,
        egress: 0, // R2 = FREE egress
      },
    };
  }

  /**
   * Formatar bytes para formato legível
   */
  static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }
}
