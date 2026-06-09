import { db } from '@ecotech/shared/database';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigration() {
  try {
    console.log('Aplicando migration de notificações...');

    const migrationSQL = readFileSync(
      join(__dirname, '../libs/shared/database/migrations/0006_add_notificacoes.sql'),
      'utf-8'
    );

    await db.execute(sql.raw(migrationSQL));

    console.log('✓ Migration aplicada com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao aplicar migration:', error);
    process.exit(1);
  }
}

applyMigration();
