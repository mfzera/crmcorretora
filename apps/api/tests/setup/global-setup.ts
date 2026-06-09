import { execSync } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';

export async function setup() {
  config({ path: resolve(process.cwd(), 'apps/api/.env.test'), override: true });
  console.log('\n🧪 Rodando migrations em ecotech_test...');
  execSync('tsx apps/api/scripts/run-migrations.ts', {
    env: { ...process.env },
    stdio: 'inherit',
  });
  console.log('✅ Migrations concluídas.\n');
}

export async function teardown() {
  const { closeTestApp } = await import('../helpers/app.helper.js');
  await closeTestApp();
}
