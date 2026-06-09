#!/usr/bin/env tsx
/**
 * Script de migração para mover anexos de cotações convertidas
 * para as pastas corretas de documentos de venda no R2
 *
 * Problema: Quando uma cotação é convertida em documento de venda,
 * os anexos ficavam vinculados mas os arquivos permaneciam em cotacaos/
 *
 * Este script:
 * 1. Busca anexos vinculados a documentos_venda mas com r2Key em cotacaos/
 * 2. Move os arquivos fisicamente no R2
 * 3. Atualiza o r2Key no banco de dados
 *
 * Uso: npx tsx scripts/migrar-anexos-documentos-venda.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Carregar variáveis de ambiente
config({ path: resolve(process.cwd(), '.env.development') });

import { db, anexos } from '../libs/shared/database/src/index.js';
import { storageClient } from '../libs/shared/storage/src/index.js';
import { eq, and, like, isNull } from 'drizzle-orm';

async function migrarAnexosDocumentosVenda() {
  console.log(
    '🔍 Buscando anexos de documentos de venda em pastas incorretas...\n',
  );

  // Buscar anexos que:
  // - Estão vinculados a documento_venda
  // - Mas o r2Key ainda aponta para cotacaos/
  const anexosParaMigrar = await db.query.anexos.findMany({
    where: and(
      eq(anexos.entidadeTipo, 'documento_venda'),
      like(anexos.r2Key, 'cotacaos/%'),
      isNull(anexos.deletedAt),
    ),
  });

  if (anexosParaMigrar.length === 0) {
    console.log('✅ Nenhum anexo precisa ser migrado. Tudo está correto!\n');
    return;
  }

  console.log(
    `📦 Encontrados ${anexosParaMigrar.length} anexos para migrar:\n`,
  );

  let sucessos = 0;
  let erros = 0;

  for (const anexo of anexosParaMigrar) {
    try {
      // Extrair o nome do arquivo do r2Key original
      // Formato: cotacaos/{cotacaoId}/{nomeArquivo}
      const partes = anexo.r2Key.split('/');
      const nomeArquivo = partes.pop();
      const cotacaoId = partes[1]; // Apenas para log

      // Construir nova key para documento_vendas
      const novoR2Key = `documento_vendas/${anexo.entidadeId}/${nomeArquivo}`;

      console.log(`🔄 Migrando: ${anexo.nomeOriginal}`);
      console.log(`   De:   ${anexo.r2Key}`);
      console.log(`   Para: ${novoR2Key}`);

      // Verificar se o arquivo existe no R2
      const exists = await storageClient.exists(anexo.r2Key);
      if (!exists) {
        console.log(`   ⚠️  Arquivo não encontrado no R2, pulando...`);
        erros++;
        continue;
      }

      // Mover arquivo fisicamente no R2
      await storageClient.move(anexo.r2Key, novoR2Key);

      // Atualizar metadados no banco
      await db
        .update(anexos)
        .set({
          r2Key: novoR2Key,
        })
        .where(eq(anexos.id, anexo.id));

      console.log(`   ✅ Migrado com sucesso!\n`);
      sucessos++;
    } catch (error) {
      console.error(`   ❌ Erro ao migrar anexo ${anexo.nomeOriginal}:`, error);
      erros++;
    }
  }

  console.log('\n📊 Resumo da migração:');
  console.log(`   ✅ Sucessos: ${sucessos}`);
  console.log(`   ❌ Erros: ${erros}`);
  console.log(`   📦 Total: ${anexosParaMigrar.length}\n`);
}

// Executar migração
migrarAnexosDocumentosVenda()
  .then(() => {
    console.log('✅ Migração concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  });
