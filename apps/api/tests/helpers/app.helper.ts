import { buildApp } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';

let _app: FastifyInstance | null = null;

export async function buildTestApp(): Promise<FastifyInstance> {
  if (_app) return _app;
  const app = await buildApp();
  await app.ready();
  _app = app;
  return app;
}

export async function closeTestApp(): Promise<void> {
  if (_app) {
    await _app.close();
    _app = null;
  }
}
