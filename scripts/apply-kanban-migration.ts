import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function applyMigration() {
  const client = await pool.connect();

  try {
    console.log(
      'Starting migration to remove diagnostico and proposta status...',
    );

    await client.query('BEGIN');

    // Migrar oportunidades existentes
    console.log('Migrating existing oportunidades...');
    const updateResult = await client.query(`
      UPDATE oportunidade
      SET status = 'negociacao'
      WHERE status IN ('diagnostico', 'proposta')
    `);
    console.log(`Migrated ${updateResult.rowCount} oportunidades`);

    // Recriar o enum
    console.log('Recreating enum...');

    // Remover o default temporariamente
    console.log('Dropping default...');
    await client.query(`
      ALTER TABLE oportunidade ALTER COLUMN status DROP DEFAULT;
    `);

    // Renomear o enum antigo
    console.log('Renaming old enum...');
    await client.query(`
      ALTER TYPE oportunidade_status RENAME TO oportunidade_status_old;
    `);

    // Criar o novo enum
    console.log('Creating new enum...');
    await client.query(`
      CREATE TYPE oportunidade_status AS ENUM (
        'lead',
        'contato_inicial',
        'negociacao',
        'ganha',
        'perdida'
      );
    `);

    // Converter a coluna
    console.log('Converting column...');
    await client.query(`
      ALTER TABLE oportunidade
        ALTER COLUMN status TYPE oportunidade_status
        USING status::text::oportunidade_status;
    `);

    // Restaurar o default
    console.log('Restoring default...');
    await client.query(`
      ALTER TABLE oportunidade ALTER COLUMN status SET DEFAULT 'lead'::oportunidade_status;
    `);

    // Remover o enum antigo
    console.log('Dropping old enum...');
    await client.query(`
      DROP TYPE oportunidade_status_old;
    `);

    await client.query('COMMIT');

    console.log('Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
