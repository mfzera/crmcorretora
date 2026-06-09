import 'dotenv/config';
import { db } from './connection.js';
import { cargos, cargoPermissoes, permissoesGlobais } from './schema/index.js';
import { eq, inArray, and } from 'drizzle-orm';

/**
 * One-time script to sync new kanban granular permissions to existing cargos.
 *
 * - Gerente: gets all kanban permissions including kanban:visualizar_todas
 * - Vendedor: gets kanban permissions (own opportunities only)
 */
async function syncKanbanPermissions() {
  console.log('Syncing kanban permissions to existing cargos...\n');

  // Kanban permissions for Gerente (can see all)
  const gerenteKanbanPerms = [
    'kanban:acessar',
    'kanban:visualizar',
    'kanban:visualizar_todas',
    'kanban:criar',
    'kanban:editar',
    'kanban:deletar',
    'kanban:fechar',
    'kanban:perder',
  ];

  // Kanban permissions for Vendedor (own only)
  const vendedorKanbanPerms = [
    'kanban:acessar',
    'kanban:visualizar',
    'kanban:criar',
    'kanban:editar',
    'kanban:deletar',
    'kanban:fechar',
    'kanban:perder',
  ];

  // Fetch all permission IDs
  const allKanbanPermNames = [...new Set([...gerenteKanbanPerms, ...vendedorKanbanPerms])];
  const permissoes = await db.query.permissoesGlobais.findMany({
    where: inArray(permissoesGlobais.nomePermissao, allKanbanPermNames),
  });

  console.log(`Found ${permissoes.length} kanban permissions in database:`);
  permissoes.forEach(p => console.log(`  - ${p.nomePermissao} (${p.id})`));

  if (permissoes.length !== allKanbanPermNames.length) {
    const found = permissoes.map(p => p.nomePermissao);
    const missing = allKanbanPermNames.filter(n => !found.includes(n));
    console.error('\nMissing permissions in database:', missing);
    console.error('Run seed first!');
    process.exit(1);
  }

  const permMap = new Map(permissoes.map(p => [p.nomePermissao, p.id]));

  // Fetch all cargos
  const todosCargos = await db.query.cargos.findMany();
  console.log(`\nFound ${todosCargos.length} cargos total`);

  let totalAdded = 0;

  for (const cargo of todosCargos) {
    // Determine which permissions this cargo should get
    let targetPerms: string[];

    if (cargo.isAdmin) {
      // Admin gets everything
      targetPerms = gerenteKanbanPerms;
    } else if (cargo.isGestor) {
      targetPerms = gerenteKanbanPerms;
    } else if (cargo.isVendedor) {
      targetPerms = vendedorKanbanPerms;
    } else {
      // Check if cargo already has kanban:acessar — if so, give them visualizar too
      const existingPerms = await db
        .select({ nome: permissoesGlobais.nomePermissao })
        .from(cargoPermissoes)
        .innerJoin(permissoesGlobais, eq(cargoPermissoes.permissaoGlobalId, permissoesGlobais.id))
        .where(and(
          eq(cargoPermissoes.cargoId, cargo.id),
          eq(permissoesGlobais.nomePermissao, 'kanban:acessar'),
        ));

      if (existingPerms.length > 0) {
        // Has kanban:acessar but is not Gerente/Vendedor — give basic view permissions
        targetPerms = ['kanban:acessar', 'kanban:visualizar'];
      } else {
        console.log(`  Skipping "${cargo.nomeCargo}" (no kanban access)`);
        continue;
      }
    }

    // Fetch existing permissions for this cargo
    const existing = await db.query.cargoPermissoes.findMany({
      where: eq(cargoPermissoes.cargoId, cargo.id),
    });
    const existingIds = new Set(existing.map(e => e.permissaoGlobalId));

    // Add missing ones
    const toAdd = targetPerms
      .map(name => permMap.get(name)!)
      .filter(id => !existingIds.has(id));

    if (toAdd.length > 0) {
      await db.insert(cargoPermissoes).values(
        toAdd.map(permissaoGlobalId => ({
          cargoId: cargo.id,
          permissaoGlobalId,
        })),
      ).onConflictDoNothing();

      console.log(`  "${cargo.nomeCargo}": added ${toAdd.length} kanban permissions`);
      totalAdded += toAdd.length;
    } else {
      console.log(`  "${cargo.nomeCargo}": already up to date`);
    }
  }

  console.log(`\nDone! Added ${totalAdded} permission links total.`);
  console.log('Users will get the new permissions on next login (JWT refresh).');
  process.exit(0);
}

syncKanbanPermissions().catch((error) => {
  console.error('Sync failed:', error);
  process.exit(1);
});
