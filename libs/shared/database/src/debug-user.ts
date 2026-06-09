import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from './connection.js';
import { usuarios } from './schema/index.js';

async function run() {
  const u = await db.query.usuarios.findFirst({
    where: eq(usuarios.email, 'ecotech@grupoecosistema.com.br'),
    columns: { id: true, nome: true, corretoraId: true, corretoraAtivaId: true },
  });
  console.log('Raw user:', JSON.stringify(u, null, 2));
  console.log('JWT corretoraId seria:', (u as any)?.corretoraAtivaId ?? u?.corretoraId);
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
