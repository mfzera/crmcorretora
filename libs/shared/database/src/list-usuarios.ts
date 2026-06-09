import 'dotenv/config';
import { db } from './connection.js';
import { usuarios } from './schema/index.js';
import { eq } from 'drizzle-orm';

const rows = await db.select({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email, corretoraId: usuarios.corretoraId }).from(usuarios).where(eq(usuarios.corretoraId, 'a5c4f168-1b5f-46d3-9c39-423d05fdefe7'));
console.log(JSON.stringify(rows, null, 2));
process.exit(0);
