import 'dotenv/config';
import { db } from './connection.js';
import { corretoras } from './schema/index.js';

const rows = await db.select().from(corretoras);
console.log(JSON.stringify(rows.map(c => ({ id: c.id, cnpj: c.cnpj, nome: c.nomeFantasia, razao: c.razaoSocial, sub: c.subdominio })), null, 2));
process.exit(0);
