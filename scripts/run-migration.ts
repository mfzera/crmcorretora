import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const migrationPath = path.join(
      __dirname,
      '../libs/shared/database/migrations/0013_add_chat_reactions_mentions.sql',
    );

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Aplicando migration 0013_add_chat_reactions_mentions...');

    await pool.query(migrationSQL);

    console.log('✅ Migration aplicada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();
