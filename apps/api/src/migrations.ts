import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { join } from 'path';
import { existsSync } from 'fs';
import { db, badgeTipos, permissoesGlobais } from '@ecotech/shared/database';
import { eq } from 'drizzle-orm';
import { logger } from '@ecotech/shared/utils/logger';

const { Pool } = pg;

export async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  logger.info({ phase: 'migration' }, '🚀 Starting database migrations...');

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
  });

  try {
    const db = drizzle(pool);

    const migrationsFolder = join(
      process.cwd(),
      'libs/shared/database/migrations',
    );

    if (!existsSync(migrationsFolder)) {
      throw new Error(`Migrations folder not found at: ${migrationsFolder}`);
    }

    const metaFolder = join(migrationsFolder, 'meta');
    if (!existsSync(metaFolder)) {
      throw new Error(`Meta folder not found at: ${metaFolder}`);
    }

    await migrate(db, { migrationsFolder });

    logger.info({ phase: 'migration' }, '✅ All migrations applied successfully');
  } catch (error: any) {
    logger.error(
      {
        phase: 'migration',
        pgCode: error?.code,
        pgDetail: error?.detail,
        err: error,
      },
      '❌ Migration failed',
    );
    throw error;
  } finally {
    await pool.end();
  }
}

export async function seedGlobalData() {
  logger.info({ phase: 'seed' }, '🌱 Running global data seed...');

  const badgesSeed = [
    // Existentes
    { slug: 'meta_batida', nome: 'Meta Batida', descricao: 'Concluiu uma meta no prazo', icone: 'trophy', cor: 'gold' },
    { slug: 'top_renovador', nome: 'Top Renovador', descricao: 'Destaque em renovações de apólices', icone: 'refresh-cw', cor: 'blue' },
    { slug: 'vendedor_mes', nome: 'Vendedor do Mês', descricao: 'Melhor vendedor do mês', icone: 'star', cor: 'yellow' },
    { slug: '5_seguros_semana', nome: '5 Seguros em 1 Semana', descricao: 'Fechou 5 seguros em uma semana', icone: 'zap', cor: 'orange' },
    { slug: 'primeira_meta', nome: 'Primeira Meta', descricao: 'Concluiu sua primeira meta', icone: 'flag', cor: 'green' },
    { slug: 'missao_cumprida', nome: 'Missão Cumprida', descricao: 'Concluiu uma missão delegada', icone: 'check-circle', cor: 'purple' },

    // Volume — Novos Seguros (vitalício)
    { slug: 'vol_seguros_bronze',   nome: 'Bronze · Novos Seguros',   descricao: '5 seguros novos fechados',    icone: 'medal',  cor: 'orange' },
    { slug: 'vol_seguros_prata',    nome: 'Prata · Novos Seguros',    descricao: '25 seguros novos fechados',   icone: 'medal',  cor: 'silver' },
    { slug: 'vol_seguros_ouro',     nome: 'Ouro · Novos Seguros',     descricao: '100 seguros novos fechados',  icone: 'trophy', cor: 'gold' },
    { slug: 'vol_seguros_platina',  nome: 'Platina · Novos Seguros',  descricao: '250 seguros novos fechados',  icone: 'crown',  cor: 'blue' },
    { slug: 'vol_seguros_diamante', nome: 'Diamante · Novos Seguros', descricao: '500 seguros novos fechados',  icone: 'crown',  cor: 'purple' },

    // Volume — Renovações
    { slug: 'vol_renov_bronze',   nome: 'Bronze · Renovações',   descricao: '5 renovações conduzidas',    icone: 'medal',  cor: 'orange' },
    { slug: 'vol_renov_prata',    nome: 'Prata · Renovações',    descricao: '25 renovações conduzidas',   icone: 'medal',  cor: 'silver' },
    { slug: 'vol_renov_ouro',     nome: 'Ouro · Renovações',     descricao: '100 renovações conduzidas',  icone: 'trophy', cor: 'gold' },
    { slug: 'vol_renov_platina',  nome: 'Platina · Renovações',  descricao: '250 renovações conduzidas',  icone: 'crown',  cor: 'blue' },
    { slug: 'vol_renov_diamante', nome: 'Diamante · Renovações', descricao: '500 renovações conduzidas',  icone: 'crown',  cor: 'purple' },

    // Volume — Cotações
    { slug: 'vol_cot_bronze',   nome: 'Bronze · Cotações',   descricao: '50 cotações criadas',     icone: 'medal',  cor: 'orange' },
    { slug: 'vol_cot_prata',    nome: 'Prata · Cotações',    descricao: '250 cotações criadas',    icone: 'medal',  cor: 'silver' },
    { slug: 'vol_cot_ouro',     nome: 'Ouro · Cotações',     descricao: '1.000 cotações criadas',  icone: 'trophy', cor: 'gold' },
    { slug: 'vol_cot_platina',  nome: 'Platina · Cotações',  descricao: '2.500 cotações criadas',  icone: 'crown',  cor: 'blue' },
    { slug: 'vol_cot_diamante', nome: 'Diamante · Cotações', descricao: '5.000 cotações criadas',  icone: 'crown',  cor: 'purple' },

    // Consistência (streak conta apenas dias úteis)
    { slug: 'streak_5',     nome: 'Em chamas',       descricao: '5 dias úteis seguidos com cotação',  icone: 'flame', cor: 'orange' },
    { slug: 'streak_20',    nome: 'Implacável',      descricao: '20 dias úteis seguidos com cotação', icone: 'flame', cor: 'gold' },
    { slug: 'streak_60',    nome: 'Lendário',        descricao: '60 dias úteis seguidos com cotação', icone: 'flame', cor: 'purple' },
    { slug: 'mes_de_fogo',  nome: 'Mês de Fogo',     descricao: '10 seguros novos em um único mês',   icone: 'zap',   cor: 'orange' },
    { slug: 'hat_trick',    nome: 'Hat-trick',       descricao: 'Bateu meta 3 meses seguidos',        icone: 'flag',  cor: 'green' },

    // Conversão e qualidade
    { slug: 'cacador_eficiente', nome: 'Caçador Eficiente', descricao: 'Conversão cotação→venda > 30% num mês com ≥5 cotações', icone: 'zap',   cor: 'blue' },
    { slug: 'tricampeao',        nome: 'Tricampeão',        descricao: 'Top 1 do ranking 3 períodos seguidos',                  icone: 'crown', cor: 'gold' },
    { slug: 'guardiao',          nome: 'Guardião',          descricao: '100% das renovações do mês renovadas',                  icone: 'refresh-cw', cor: 'green' },
    { slug: 'ticket_alto_1',     nome: 'Ticket Alto',       descricao: '1ª apólice acima de R$ 10k de prêmio',                  icone: 'star',  cor: 'silver' },
    { slug: 'ticket_alto_5',     nome: 'Ticket Alto · 5',   descricao: '5ª apólice acima de R$ 10k de prêmio',                  icone: 'star',  cor: 'gold' },
    { slug: 'ticket_alto_10',    nome: 'Ticket Alto · 10',  descricao: '10ª apólice acima de R$ 10k de prêmio',                 icone: 'star',  cor: 'purple' },

    // Relacionamento e pós-venda
    { slug: 'pos_venda_1',     nome: 'Pós-venda',        descricao: 'Abriu o 1º sinistro pelo cliente',  icone: 'award', cor: 'blue' },
    { slug: 'pos_venda_10',    nome: 'Pós-venda · 10',   descricao: 'Abriu 10 sinistros pelo cliente',   icone: 'award', cor: 'gold' },
    { slug: 'comunicador_100', nome: 'Comunicador',      descricao: 'Enviou 100 mensagens no chat da equipe', icone: 'star', cor: 'purple' },
    { slug: 'comunicador_500', nome: 'Comunicador · 500', descricao: 'Enviou 500 mensagens no chat da equipe', icone: 'star', cor: 'gold' },
    { slug: 'atento',          nome: 'Atento',           descricao: 'Nenhuma cotação sem follow-up por 30 dias', icone: 'check-circle', cor: 'green' },

    // Marcos
    { slug: 'estreante',          nome: 'Estreante',          descricao: 'Criou sua primeira cotação',     icone: 'flag',  cor: 'green' },
    { slug: 'primeira_venda',     nome: 'Primeira Venda',     descricao: 'Fechou seu primeiro seguro',      icone: 'trophy', cor: 'green' },
    { slug: 'primeira_renovacao', nome: 'Primeira Renovação', descricao: 'Conduziu sua primeira renovação', icone: 'refresh-cw', cor: 'green' },
    { slug: 'um_ano_de_casa',     nome: '1 Ano de Casa',      descricao: 'Aniversário de 1 ano na corretora', icone: 'medal', cor: 'gold' },
  ];

  for (const badge of badgesSeed) {
    const exists = await db.query.badgeTipos.findFirst({
      where: eq(badgeTipos.slug, badge.slug),
    });
    if (!exists) {
      await db.insert(badgeTipos).values(badge);
    }
  }

  const permExists = await db.query.permissoesGlobais.findFirst({
    where: eq(permissoesGlobais.nomePermissao, 'gamificacao:gerenciar'),
  });
  if (!permExists) {
    await db.insert(permissoesGlobais).values({
      nomePermissao: 'gamificacao:gerenciar',
      descricao: 'Criar e gerenciar metas, missões, campanhas e conceder badges',
      grupo: 'gamificacao',
    });
    logger.info({ phase: 'seed' }, '✅ Permissão gamificacao:gerenciar criada');
  }

  logger.info({ phase: 'seed' }, '✅ Seed concluído');
}
