import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

const { Pool } = pg;

// Helper to mask sensitive data in connection string
function maskConnectionString(url: string | undefined): string {
  if (!url) return 'undefined';
  try {
    const urlObj = new URL(url);
    if (urlObj.password) {
      urlObj.password = '****';
    }
    return urlObj.toString();
  } catch {
    return 'invalid URL format';
  }
}

// pg-connection-string trata 'require' como alias de 'verify-full' hoje, mas
// emitirá warning até que sejam explicitamente diferentes em v3/pg v9.
// Normaliza aqui para silenciar o warning sem alterar a segurança efetiva.
function normalizeDbUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  return url.replace(/sslmode=require/g, 'sslmode=verify-full');
}

// Log database configuration on startup
const databaseUrl = normalizeDbUrl(process.env['DATABASE_URL']);
console.log('🔌 Database Configuration:');
console.log(`   URL: ${maskConnectionString(databaseUrl)}`);
console.log(`   Max connections: 20`);
console.log(`   Connection timeout: 2000ms`);

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error(
    '   Please configure DATABASE_URL in your environment variables.',
  );
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log pool errors
pool.on('error', (err) => {
  console.error('❌ Unexpected database pool error:', err);
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;
// Aceita tanto o db principal quanto um tx de db.transaction()
export type DbOrTx =
  | Database
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

// Health check for database connection
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing database connection...');
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(
      `   Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    console.error(`   Code: ${(error as any)?.code || 'N/A'}`);

    if ((error as any)?.code === 'ECONNREFUSED') {
      console.error(
        '   Reason: Connection refused - database server is not reachable',
      );
      console.error(
        `   Attempting to connect to: ${maskConnectionString(databaseUrl)}`,
      );
      console.error('   Possible causes:');
      console.error('     - DATABASE_URL points to wrong host/port');
      console.error('     - Database server is not running');
      console.error('     - Firewall blocking connection');
      console.error('     - Database not accessible from this network');
    } else if ((error as any)?.code === 'ENOTFOUND') {
      console.error('   Reason: Host not found - DNS resolution failed');
      console.error('   Check if the database hostname is correct');
    } else if ((error as any)?.code === 'ETIMEDOUT') {
      console.error(
        '   Reason: Connection timeout - database server not responding',
      );
    } else if ((error as any)?.code === '28P01') {
      console.error(
        '   Reason: Authentication failed - invalid username/password',
      );
    } else if ((error as any)?.code === '3D000') {
      console.error('   Reason: Database does not exist');
    }

    console.error('\n   Full error details:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  console.log('🔌 Closing database connection pool...');
  await pool.end();
  console.log('✅ Database connection pool closed');
}
