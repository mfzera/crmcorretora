import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function applyMigration() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Aplicando migration de notificações...');

    const migrationSQL = readFileSync(
      join(__dirname, '../libs/shared/database/migrations/0006_add_notificacoes.sql'),
      'utf-8'
    );

    await client.query(migrationSQL);

    console.log('✓ Migration aplicada com sucesso!');
  } catch (error) {
    console.error('Erro ao aplicar migration:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
