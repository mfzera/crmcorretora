import { config } from 'dotenv';
import { resolve } from 'path';

config({
  path: resolve(process.cwd(), 'apps/api/.env.test'),
  override: true,
});
