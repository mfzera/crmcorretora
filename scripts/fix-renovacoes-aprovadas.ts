import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/saas_seguradoras';

async function fixRenovacoesAprovadas() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  const db = drizzle(pool);

  console.log('🔍 Analisando renovações de documentos já aprovados...\n');

  try {
    // 1. Encontrar renovações que foram criadas automaticamente quando o cadastro foi aprovado
    // mas que ainda estão com status NAO_TRABALHADO
    console.log('1️⃣ Buscando renovações de documentos aprovados com status incorreto:');
    console.log('='.repeat(80));

    const renovacoesParaCorrigir = await db.execute(sql`
      SELECT
        rc.id as renovacao_id,
        rc.status as status_renovacao,
        rc.documento_venda_anterior_id,
        dv_anterior.numero_documento as documento_anterior,
        dv_anterior.status as status_documento_anterior,
        dv_anterior.data_aprovacao_cadastro,
        dv_renovacao.id as documento_renovacao_id,
        dv_renovacao.numero_documento as documento_renovacao,
        dv_renovacao.status as status_documento_renovacao
      FROM renovacao_comercial rc
      JOIN documento_venda dv_anterior ON rc.documento_venda_anterior_id = dv_anterior.id
      LEFT JOIN documento_venda dv_renovacao ON dv_renovacao.metadata->>'documentoOrigemId' = dv_anterior.id::text
      WHERE rc.status = 'NAO_TRABALHADO'
        AND dv_anterior.status = 'ATIVO'
        AND dv_anterior.data_aprovacao_cadastro IS NOT NULL
        AND dv_renovacao.id IS NOT NULL
        AND dv_renovacao.status = 'ATIVO'
        AND dv_anterior.deleted_at IS NULL
        AND dv_renovacao.deleted_at IS NULL
      ORDER BY dv_anterior.data_aprovacao_cadastro DESC
    `);

    console.log(`Encontradas ${renovacoesParaCorrigir.rows.length} renovação(ões) para corrigir:`);
    console.table(renovacoesParaCorrigir.rows);
    console.log('');

    if (renovacoesParaCorrigir.rows.length === 0) {
      console.log('✅ Nenhuma renovação precisa ser corrigida!\n');
      return;
    }

    // 2. Explicar o problema
    console.log('📝 Explicação:');
    console.log('='.repeat(80));
    console.log('Quando um documento é aprovado no cadastro, automaticamente é criado:');
    console.log('  1. Um novo documento de renovação (com status ATIVO)');
    console.log('  2. Um registro na tabela renovacao_comercial (com status NAO_TRABALHADO)');
    console.log('');
    console.log('O problema: A renovação comercial fica como "NAO_TRABALHADO", então aparece');
    console.log('como pendente na área de trabalho mesmo já tendo sido aprovada.\n');
    console.log('');

    // 3. Aplicar correção
    const shouldFix = process.argv.includes('--fix');

    if (!shouldFix) {
      console.log('⚠️  Para aplicar a correção, execute novamente com: --fix\n');
      console.log('Exemplo: npx tsx scripts/fix-renovacoes-aprovadas.ts --fix\n');
      return;
    }

    console.log('3️⃣ Aplicando correção...');
    console.log('='.repeat(80));

    // Marcar estas renovações como RENOVADO (pois o documento de renovação já está ATIVO)
    const resultado = await db.execute(sql`
      WITH renovacoes_para_corrigir AS (
        SELECT rc.id
        FROM renovacao_comercial rc
        JOIN documento_venda dv_anterior ON rc.documento_venda_anterior_id = dv_anterior.id
        JOIN documento_venda dv_renovacao ON dv_renovacao.metadata->>'documentoOrigemId' = dv_anterior.id::text
        WHERE rc.status = 'NAO_TRABALHADO'
          AND dv_anterior.status = 'ATIVO'
          AND dv_anterior.data_aprovacao_cadastro IS NOT NULL
          AND dv_renovacao.id IS NOT NULL
          AND dv_renovacao.status = 'ATIVO'
          AND dv_anterior.deleted_at IS NULL
          AND dv_renovacao.deleted_at IS NULL
      )
      UPDATE renovacao_comercial rc
      SET
        status = 'RENOVADO',
        documento_venda_novo_id = (
          SELECT dv_renovacao.id
          FROM documento_venda dv_renovacao
          WHERE dv_renovacao.metadata->>'documentoOrigemId' = rc.documento_venda_anterior_id::text
            AND dv_renovacao.deleted_at IS NULL
          LIMIT 1
        ),
        data_finalizacao = NOW(),
        updated_at = NOW()
      WHERE rc.id IN (SELECT id FROM renovacoes_para_corrigir)
      RETURNING
        rc.id,
        rc.documento_venda_anterior_id,
        rc.documento_venda_novo_id,
        rc.status
    `);

    console.log(`✅ ${resultado.rows.length} renovação(ões) corrigida(s):`);
    console.table(resultado.rows);
    console.log('');

    console.log('✨ Correção concluída com sucesso!\n');
    console.log('As renovações não aparecerão mais como pendentes na área de trabalho.\n');

  } catch (error) {
    console.error('❌ Erro ao corrigir renovações:', error);
  } finally {
    await pool.end();
  }
}

fixRenovacoesAprovadas();
