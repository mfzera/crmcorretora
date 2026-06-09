#!/usr/bin/env node
/**
 * Script simples para verificar anexos que precisam migração
 * Uso: node scripts/verificar-anexos.mjs
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Client } = pkg;

const __dirname = dirname(fileURLToPath(import.meta.url));

// Carregar variáveis de ambiente
config({ path: resolve(__dirname, '..', '.env.development') });

async function verificarAnexos() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados\n');

    // Contar anexos que precisam migração
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM anexo
      WHERE entidade_tipo = 'documento_venda'
        AND r2_key LIKE 'cotacaos/%'
        AND deleted_at IS NULL
    `);

    const total = parseInt(countResult.rows[0].total);

    if (total === 0) {
      console.log('✅ Nenhum anexo precisa ser migrado. Tudo está correto!\n');
      return;
    }

    console.log(`📦 Encontrados ${total} anexos que precisam migração:\n`);

    // Listar anexos
    const anexosResult = await client.query(`
      SELECT
        id,
        nome_original,
        entidade_id,
        r2_key,
        upload_em,
        tamanho
      FROM anexo
      WHERE entidade_tipo = 'documento_venda'
        AND r2_key LIKE 'cotacaos/%'
        AND deleted_at IS NULL
      ORDER BY upload_em DESC
      LIMIT 10
    `);

    anexosResult.rows.forEach((anexo, index) => {
      const partes = anexo.r2_key.split('/');
      const nomeArquivo = partes.pop();
      const corretoraId = partes[0];
      const novoR2Key = `${corretoraId}/documento_vendas/${anexo.entidade_id}/${nomeArquivo}`;

      console.log(`${index + 1}. ${anexo.nome_original}`);
      console.log(`   ID: ${anexo.id}`);
      console.log(`   Atual:   ${anexo.r2_key}`);
      console.log(`   Deveria: ${novoR2Key}`);
      console.log(`   Tamanho: ${(anexo.tamanho / 1024).toFixed(2)} KB`);
      console.log('');
    });

    if (total > 10) {
      console.log(`... e mais ${total - 10} anexos\n`);
    }

    console.log('💡 Para migrar esses anexos, você pode:');
    console.log(
      '   1. Usar a API administrativa: POST /api/admin/migrar-anexos/executar',
    );
    console.log(
      '   2. Ou aguardar a próxima confirmação de venda que fará a migração automaticamente\n',
    );
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

verificarAnexos()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
