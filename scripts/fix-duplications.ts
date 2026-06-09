import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres123@localhost:5432/saas_seguradoras';

async function analyzeDuplications() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  const db = drizzle(pool);

  console.log('🔍 Analisando duplicações...\n');

  try {
    // 1. Encontrar documentos com renovações duplicadas
    console.log('1️⃣ Documentos com renovações duplicadas:');
    console.log('='.repeat(80));
    const renovacoesDuplicadas = await db.execute(sql`
      SELECT
          dv.id as documento_original_id,
          dv.numero_documento as documento_original,
          dv.status as status_original,
          COUNT(renovacao.id) as total_renovacoes,
          STRING_AGG(renovacao.numero_documento, ', ') as renovacoes_criadas
      FROM documento_venda dv
      LEFT JOIN documento_venda renovacao ON
          renovacao.metadata->>'documentoOrigemId' = dv.id::text
          AND renovacao.deleted_at IS NULL
      WHERE dv.deleted_at IS NULL
          AND dv.status = 'ATIVO'
      GROUP BY dv.id, dv.numero_documento, dv.status
      HAVING COUNT(renovacao.id) > 1
      ORDER BY total_renovacoes DESC
    `);
    console.log(renovacoesDuplicadas.rows);
    console.log(
      `Total: ${renovacoesDuplicadas.rows.length} documentos com renovações duplicadas\n`,
    );

    // 2. Detalhes das renovações duplicadas
    if (renovacoesDuplicadas.rows.length > 0) {
      console.log('2️⃣ Detalhes das renovações duplicadas:');
      console.log('='.repeat(80));
      const detalhesRenovacoes = await db.execute(sql`
        WITH renovacoes_duplicadas AS (
            SELECT
                dv.id as documento_original_id,
                dv.numero_documento as documento_original,
                COUNT(renovacao.id) as total_renovacoes
            FROM documento_venda dv
            LEFT JOIN documento_venda renovacao ON
                renovacao.metadata->>'documentoOrigemId' = dv.id::text
                AND renovacao.deleted_at IS NULL
            WHERE dv.deleted_at IS NULL
                AND dv.status = 'ATIVO'
            GROUP BY dv.id, dv.numero_documento
            HAVING COUNT(renovacao.id) > 1
        )
        SELECT
            r.id,
            r.numero_documento,
            r.status,
            r.vigencia_inicio,
            r.vigencia_fim,
            r.created_at,
            r.metadata->>'documentoOrigemId' as documento_origem_id,
            rd.documento_original,
            rd.total_renovacoes
        FROM documento_venda r
        JOIN renovacoes_duplicadas rd ON r.metadata->>'documentoOrigemId' = rd.documento_original_id::text
        WHERE r.deleted_at IS NULL
        ORDER BY rd.documento_original, r.created_at
      `);
      console.log(detalhesRenovacoes.rows);
      console.log(`\n`);
    }

    // 3. Aprovações múltiplas
    console.log('3️⃣ Histórico de aprovações múltiplas:');
    console.log('='.repeat(80));
    const aprovacoesMultiplas = await db.execute(sql`
      SELECT
          h.documento_venda_id,
          dv.numero_documento,
          COUNT(*) as total_aprovacoes,
          STRING_AGG(h.created_at::text, ', ' ORDER BY h.created_at) as datas_aprovacao,
          STRING_AGG(h.usuario_nome, ', ') as usuarios_que_aprovaram
      FROM historico_documento_venda h
      JOIN documento_venda dv ON h.documento_venda_id = dv.id
      WHERE h.tipo_evento = 'APROVACAO_CADASTRO'
          AND dv.deleted_at IS NULL
      GROUP BY h.documento_venda_id, dv.numero_documento
      HAVING COUNT(*) > 1
      ORDER BY total_aprovacoes DESC
    `);
    console.log(aprovacoesMultiplas.rows);
    console.log(
      `Total: ${aprovacoesMultiplas.rows.length} documentos com aprovações múltiplas\n`,
    );

    // 4. Renovações comerciais duplicadas
    console.log('4️⃣ Renovações comerciais duplicadas:');
    console.log('='.repeat(80));
    const renovacoesComerciaisDuplicadas = await db.execute(sql`
      SELECT
          rc.documento_venda_anterior_id,
          dv.numero_documento as documento_original,
          COUNT(rc.id) as total_renovacoes_comerciais,
          STRING_AGG(rc.id::text, ', ') as ids_renovacoes_comerciais
      FROM renovacao_comercial rc
      JOIN documento_venda dv ON rc.documento_venda_anterior_id = dv.id
      WHERE dv.deleted_at IS NULL
      GROUP BY rc.documento_venda_anterior_id, dv.numero_documento
      HAVING COUNT(rc.id) > 1
      ORDER BY total_renovacoes_comerciais DESC
    `);
    console.log(renovacoesComerciaisDuplicadas.rows);
    console.log(
      `Total: ${renovacoesComerciaisDuplicadas.rows.length} documentos com renovações comerciais duplicadas\n`,
    );

    // Resumo
    console.log('\n📊 RESUMO:');
    console.log('='.repeat(80));
    console.log(
      `✓ ${renovacoesDuplicadas.rows.length} documento(s) com renovações duplicadas`,
    );
    console.log(
      `✓ ${aprovacoesMultiplas.rows.length} documento(s) com aprovações múltiplas no histórico`,
    );
    console.log(
      `✓ ${renovacoesComerciaisDuplicadas.rows.length} documento(s) com renovações comerciais duplicadas`,
    );

    const temProblemas =
      renovacoesDuplicadas.rows.length > 0 ||
      aprovacoesMultiplas.rows.length > 0 ||
      renovacoesComerciaisDuplicadas.rows.length > 0;

    if (temProblemas) {
      console.log(
        '\n⚠️  Foram encontradas duplicações que precisam ser corrigidas.',
      );
      console.log(
        'Execute o script com o parâmetro --fix para aplicar as correções.\n',
      );
    } else {
      console.log('\n✅ Nenhuma duplicação encontrada!\n');
    }
  } catch (error) {
    console.error('❌ Erro ao analisar duplicações:', error);
  } finally {
    await pool.end();
  }
}

async function fixDuplications() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  const db = drizzle(pool);

  console.log('🔧 Corrigindo duplicações...\n');

  try {
    // 1. Deletar renovações duplicadas (mantém apenas a primeira)
    console.log('1️⃣ Removendo renovações duplicadas...');
    const renovacoesRemovidas = await db.execute(sql`
      WITH renovacoes_para_manter AS (
          SELECT DISTINCT ON (metadata->>'documentoOrigemId')
              id,
              metadata->>'documentoOrigemId' as documento_origem_id
          FROM documento_venda
          WHERE metadata->>'documentoOrigemId' IS NOT NULL
              AND deleted_at IS NULL
          ORDER BY metadata->>'documentoOrigemId', created_at ASC
      ),
      renovacoes_para_deletar AS (
          SELECT r.id, r.numero_documento, r.metadata->>'documentoOrigemId' as origem
          FROM documento_venda r
          WHERE r.metadata->>'documentoOrigemId' IS NOT NULL
              AND r.deleted_at IS NULL
              AND r.id NOT IN (SELECT id FROM renovacoes_para_manter)
      )
      UPDATE documento_venda
      SET deleted_at = NOW(),
          updated_at = NOW()
      WHERE id IN (SELECT id FROM renovacoes_para_deletar)
      RETURNING id, numero_documento, metadata->>'documentoOrigemId' as origem
    `);
    console.log(
      `✓ ${renovacoesRemovidas.rows.length} renovação(ões) removida(s):`,
    );
    console.log(renovacoesRemovidas.rows);
    console.log('');

    // 2. Deletar renovações comerciais duplicadas
    console.log('2️⃣ Removendo renovações comerciais duplicadas...');
    const renovacoesComerciaisRemovidas = await db.execute(sql`
      WITH renovacoes_comerciais_para_manter AS (
          SELECT DISTINCT ON (documento_venda_anterior_id)
              id
          FROM renovacao_comercial
          ORDER BY documento_venda_anterior_id, created_at ASC
      ),
      renovacoes_comerciais_para_deletar AS (
          SELECT id, documento_venda_anterior_id
          FROM renovacao_comercial
          WHERE id NOT IN (SELECT id FROM renovacoes_comerciais_para_manter)
      )
      DELETE FROM renovacao_comercial
      WHERE id IN (SELECT id FROM renovacoes_comerciais_para_deletar)
      RETURNING id, documento_venda_anterior_id
    `);
    console.log(
      `✓ ${renovacoesComerciaisRemovidas.rows.length} renovação(ões) comercial(is) removida(s):`,
    );
    console.log(renovacoesComerciaisRemovidas.rows);
    console.log('');

    // 3. Limpar histórico duplicado
    console.log('3️⃣ Limpando histórico de aprovações duplicadas...');
    const historicoRemovido = await db.execute(sql`
      WITH historico_para_manter AS (
          SELECT DISTINCT ON (documento_venda_id)
              id
          FROM historico_documento_venda
          WHERE tipo_evento = 'APROVACAO_CADASTRO'
          ORDER BY documento_venda_id, created_at ASC
      ),
      historico_para_deletar AS (
          SELECT id, documento_venda_id, descricao
          FROM historico_documento_venda
          WHERE tipo_evento = 'APROVACAO_CADASTRO'
              AND id NOT IN (SELECT id FROM historico_para_manter)
      )
      DELETE FROM historico_documento_venda
      WHERE id IN (SELECT id FROM historico_para_deletar)
      RETURNING id, documento_venda_id, descricao
    `);
    console.log(
      `✓ ${historicoRemovido.rows.length} entrada(s) de histórico removida(s):`,
    );
    console.log(historicoRemovido.rows);
    console.log('');

    console.log('✅ Correções aplicadas com sucesso!\n');
  } catch (error) {
    console.error('❌ Erro ao corrigir duplicações:', error);
  } finally {
    await pool.end();
  }
}

// Verificar se deve executar correções
const shouldFix = process.argv.includes('--fix');

if (shouldFix) {
  fixDuplications();
} else {
  analyzeDuplications();
}
