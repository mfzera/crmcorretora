import { db } from '@ecotech/shared/database';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function migrateChangelogs() {
  try {
    console.log('Running changelog migration...');

    // Read the migration SQL
    const migrationPath = path.join(__dirname, '../libs/shared/database/migrations/0030_add_changelogs.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by statement separator and execute each statement
    const statements = migrationSQL.split('--').filter(s => s.trim().length > 0);

    for (const statement of statements) {
      const cleanStatement = statement.trim();
      if (cleanStatement.length > 0 && !cleanStatement.startsWith('Create') && !cleanStatement.startsWith('Add')) {
        try {
          await db.execute(sql.raw(cleanStatement));
          console.log('Executed statement successfully');
        } catch (error: any) {
          if (error.code === '42P07' || error.code === '42710') {
            console.log('Object already exists, skipping...');
          } else {
            throw error;
          }
        }
      }
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateChangelogs();
