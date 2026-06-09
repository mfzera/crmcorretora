#!/usr/bin/env tsx
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

// Load environment variables from root .env file
config({ path: join(process.cwd(), '.env') });

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🚀 Starting database migrations...');
  console.log(
    `📊 Database: ${databaseUrl.split('@')[1]?.split('?')[0] || 'unknown'}`,
  );

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1, // Use single connection for migrations
  });

  try {
    const db = drizzle(pool);

    // Get the migrations folder path
    const migrationsFolder = join(
      process.cwd(),
      'libs/shared/database/migrations',
    );
    console.log(`📁 Migrations folder: ${migrationsFolder}`);

    // Run migrations
    console.log('⏳ Applying migrations...');
    await migrate(db, { migrationsFolder });

    console.log('✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
