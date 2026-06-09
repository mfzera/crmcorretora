import 'dotenv/config';
import { eq, and } from 'drizzle-orm';
import { db } from './connection.js';
import { usuarios, renovacoesComerciais } from './schema/index.js';

// Busca o usuário pelo email e reatribui todas as renovações a ele
const EMAIL_ALVO = process.env.TARGET_EMAIL ?? 'ecotech@grupoecosistema.com.br';

async function run() {
  const usuario = await db.query.usuarios.findFirst({
    where: eq(usuarios.email, EMAIL_ALVO),
    columns: { id: true, nome: true, corretoraId: true, corretoraAtivaId: true },
  });

  if (!usuario) {
    console.error(`❌ Usuário com email "${EMAIL_ALVO}" não encontrado`);
    process.exit(1);
  }

  const corretoraId = (usuario as any).corretoraAtivaId ?? usuario.corretoraId;

  console.log(`✅ Usuário encontrado:`);
  console.log(`   id          = ${usuario.id}`);
  console.log(`   nome        = ${usuario.nome}`);
  console.log(`   corretoraId = ${corretoraId}`);

  // Contar renovações existentes na corretora
  const todas = await db.query.renovacoesComerciais.findMany({
    where: eq(renovacoesComerciais.corretoraId, corretoraId),
    columns: { id: true, vendedorId: true },
  });

  console.log(`\n📋 ${todas.length} renovações encontradas na corretora ${corretoraId}`);

  if (todas.length === 0) {
    console.log('Nenhuma renovação para atualizar.');
    process.exit(0);
  }

  // Atualizar todas para vendedorId do usuário alvo
  const result = await db
    .update(renovacoesComerciais)
    .set({ vendedorId: usuario.id })
    .where(eq(renovacoesComerciais.corretoraId, corretoraId));

  console.log(`\n✅ Todas as ${todas.length} renovações reatribuídas para ${usuario.nome} (${usuario.id})`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
