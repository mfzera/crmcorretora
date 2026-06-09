/**
 * Diagnóstico de planilha de importação de renovações.
 *
 * Uso:
 *   npx tsx scripts/diagnostico-importacao.ts caminho/para/planilha.xlsx [corretoraId]
 *
 * Se corretoraId for fornecido, busca os produtos reais do banco.
 * Sem ele, mostra apenas a estrutura da planilha e simula o parsing.
 */
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

// ── Utilitários inline (mesma lógica do import real) ────────────────────────

function parsePercentualPlanilha(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  const asString = raw.toString().trim();
  if (asString.startsWith('-')) return null;
  const str = asString.replace(/[^\d.,]/g, '').replace(',', '.');
  if (!str) return null;
  const num = parseFloat(str);
  if (isNaN(num) || num < 0) return null;
  const normalizado = num > 0 && num < 1 ? num * 100 : num;
  return normalizado.toFixed(2);
}

/** Parsing ATUAL (com bug): não lida com separador de milhar brasileiro */
function parsePremioAtual(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  const premioStr = raw.toString().replace(/[^\d.,]/g, '').replace(',', '.');
  return premioStr || null;
}

/** Parsing CORRIGIDO: detecta formato BR (ponto=milhar, vírgula=decimal) */
function parsePremioCorrigido(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  let str = raw.toString().trim();
  if (!str) return null;

  // Remove símbolos (R$, espaços, etc.) mas mantém dígitos, pontos, vírgulas e hífen
  str = str.replace(/[^\d.,\-]/g, '');
  if (str.startsWith('-')) return null;

  if (str.includes(',') && str.includes('.')) {
    // Ambos: formato BR (1.500,00) vs US (1,500.00) — detecta pelo último separador
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');
    if (lastComma > lastDot) {
      // BR: ponto é milhar, vírgula é decimal → remove pontos, troca vírgula
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US: vírgula é milhar → remove vírgulas
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Só vírgula: trata como decimal BR
    str = str.replace(',', '.');
  }
  // Só ponto ou nenhum separador: mantém como está

  const num = parseFloat(str);
  if (isNaN(num) || num < 0) return null;
  return num.toFixed(2);
}

function findProdutoId(
  nome: string,
  todosProdutos: Array<{ id: string; nomeProduto: string }>,
): { id: string; nomeProduto: string } | null {
  if (!nome) return null;
  const nomeLower = nome.toLowerCase();
  const p1 = todosProdutos.find((p) =>
    p.nomeProduto.toLowerCase().includes(nomeLower),
  );
  if (p1) return p1;
  const p2 = todosProdutos.find((p) =>
    nomeLower.includes(p.nomeProduto.toLowerCase()),
  );
  return p2 ?? null;
}

// ── Cabeçalhos esperados pelo import real ───────────────────────────────────

const COLUNAS_ESPERADAS: { variantes: string[]; obrigatoria: boolean; descricao: string }[] = [
  { variantes: ['CLIENTE'], obrigatoria: true, descricao: 'Nome do cliente' },
  { variantes: ['VIGÊNCIA FINAL', 'VIGENCIA FINAL'], obrigatoria: true, descricao: 'Data de vencimento' },
  { variantes: ['PRÊMIO LÍQUIDO', 'PREMIO LIQUIDO'], obrigatoria: false, descricao: 'Prêmio líquido (R$)' },
  { variantes: ['COMISSÃO', 'COMISSAO'], obrigatoria: false, descricao: 'Percentual de comissão (%)' },
  { variantes: ['PRODUTO'], obrigatoria: false, descricao: 'Produto (ramo de seguro)' },
  { variantes: ['ITEM'], obrigatoria: false, descricao: 'Descrição do item segurado' },
  { variantes: ['SEGURADORA'], obrigatoria: false, descricao: 'Nome da seguradora' },
  { variantes: ['DOCUMENTO DO CLIENTE'], obrigatoria: false, descricao: 'CPF ou CNPJ' },
  { variantes: ['STATUS'], obrigatoria: false, descricao: 'Status original na planilha' },
  { variantes: ['TIPO DE PESSOA'], obrigatoria: false, descricao: 'PF ou PJ' },
  { variantes: ['E-MAIL'], obrigatoria: false, descricao: 'E-mail do cliente' },
  { variantes: ['TELEFONE'], obrigatoria: false, descricao: 'Telefone do cliente' },
];

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const arquivoPath = args[0];
  const corretoraId = args[1] ?? null;

  if (!arquivoPath) {
    console.error('Uso: npx tsx scripts/diagnostico-importacao.ts <planilha.xlsx> [corretoraId]');
    process.exit(1);
  }

  if (!fs.existsSync(arquivoPath)) {
    console.error(`Arquivo não encontrado: ${arquivoPath}`);
    process.exit(1);
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`DIAGNÓSTICO DE IMPORTAÇÃO`);
  console.log(`Arquivo: ${path.basename(arquivoPath)}`);
  console.log(`${'═'.repeat(70)}\n`);

  // Parse do Excel
  const buffer = fs.readFileSync(arquivoPath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) { console.error('Planilha vazia'); process.exit(1); }
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

  console.log(`Total de linhas (exceto cabeçalho): ${rows.length}`);
  if (rows.length === 0) { console.error('Nenhum dado'); process.exit(1); }

  // ── 1. Diagnóstico de colunas ────────────────────────────────────────────
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`1. COLUNAS DA PLANILHA`);
  console.log(`${'─'.repeat(70)}`);

  const cabecalhos = Object.keys(rows[0] as Record<string, unknown>).filter(
    (c) => !/^__EMPTY/.test(c),
  );
  const cabecalhosSet = new Set(cabecalhos);

  console.log(`\nColunas encontradas (${cabecalhos.length}):`);
  cabecalhos.forEach((c) => console.log(`  • "${c}"`));

  console.log(`\nMapeamento esperado vs encontrado:`);
  COLUNAS_ESPERADAS.forEach(({ variantes, obrigatoria, descricao }) => {
    const encontrada = variantes.find((v) => cabecalhosSet.has(v));
    const status = encontrada
      ? `✅ "${encontrada}"`
      : obrigatoria
        ? `❌ AUSENTE (${variantes.join(' ou ')})`
        : `⚠️  não encontrada (${variantes.join(' ou ')})`;
    const obs = !encontrada && !obrigatoria ? ' → será ignorada no import' : '';
    console.log(`  [${obrigatoria ? 'obrig.' : 'opcion.'}] ${descricao}: ${status}${obs}`);
  });

  // Detectar coluna exata de cada campo crítico
  const colPremio = cabecalhos.find((c) => ['PRÊMIO LÍQUIDO', 'PREMIO LIQUIDO'].includes(c));
  const colComissao = cabecalhos.find((c) => ['COMISSÃO', 'COMISSAO'].includes(c));
  const colProduto = cabecalhos.find((c) => c === 'PRODUTO');
  const colItem = cabecalhos.find((c) => c === 'ITEM');

  // ── 2. Produtos ──────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`2. MAPEAMENTO DE PRODUTOS`);
  console.log(`${'─'.repeat(70)}`);

  // Produtos do banco (se corretoraId fornecido)
  let produtosBanco: Array<{ id: string; nomeProduto: string }> = [];
  if (corretoraId) {
    try {
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/saas_seguradoras',
      });
      const result = await pool.query(
        'SELECT id, nome_produto as "nomeProduto" FROM produto WHERE corretora_id = $1 AND deleted_at IS NULL ORDER BY nome_produto',
        [corretoraId],
      );
      produtosBanco = result.rows;
      await pool.end();
      console.log(`\nProdutos no banco para esta corretora (${produtosBanco.length}):`);
      produtosBanco.forEach((p) => console.log(`  • ${p.nomeProduto}`));
    } catch (e: any) {
      console.warn(`\n⚠️  Não foi possível conectar ao banco: ${e.message}`);
      console.warn('   Passe DATABASE_URL como variável de ambiente ou forneça o corretoraId correto.');
    }
  } else {
    console.log('\n(Sem corretoraId: mostrando apenas nomes brutos da planilha)');
  }

  // Nomes únicos de produto na planilha
  const nomesSet = new Set<string>();
  rows.forEach((row: any) => {
    const prod = (row[colProduto ?? 'PRODUTO'] || '').toString().trim();
    const item = (row[colItem ?? 'ITEM'] || '').toString().trim();
    if (prod) nomesSet.add(prod);
    if (item) nomesSet.add(item);
  });

  const nomesOrdenados = Array.from(nomesSet).sort();
  console.log(`\nNomes únicos na planilha (${nomesOrdenados.length}):`);
  nomesOrdenados.forEach((nome) => {
    if (produtosBanco.length > 0) {
      const match = findProdutoId(nome, produtosBanco);
      const status = match
        ? `→ "${match.nomeProduto}" ✅`
        : '→ SEM MATCH ❌ (produto não cadastrado ou nome muito diferente)';
      console.log(`  "${nome}" ${status}`);
    } else {
      console.log(`  • "${nome}"`);
    }
  });

  // ── 3. Diagnóstico de prêmio e comissão ─────────────────────────────────
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`3. DIAGNÓSTICO DE PRÊMIO LÍQUIDO E COMISSÃO`);
  console.log(`${'─'.repeat(70)}`);

  if (!colPremio) {
    console.log('\n⚠️  Coluna PRÊMIO LÍQUIDO não encontrada → todas as linhas usarão fallback do banco!');
  }
  if (!colComissao) {
    console.log('⚠️  Coluna COMISSÃO não encontrada → todas as linhas usarão fallback do banco!');
  }

  // Amostrar até 20 linhas com valores distintos
  const amostras: any[] = [];
  const valoresPremioVistos = new Set<string>();
  for (const row of rows) {
    const rawPremio = colPremio ? row[colPremio] : undefined;
    const rawComissao = colComissao ? row[colComissao] : undefined;
    const chave = `${rawPremio}|${rawComissao}`;
    if (!valoresPremioVistos.has(chave)) {
      valoresPremioVistos.add(chave);
      amostras.push({ rawPremio, rawComissao });
      if (amostras.length >= 25) break;
    }
  }

  console.log(`\nValores únicos encontrados (amostra de até 25):\n`);
  console.log(
    `${'Valor bruto prêmio'.padEnd(25)} ${'Atual (bug)'.padEnd(15)} ${'Corrigido'.padEnd(15)} | ${'Valor bruto comissão'.padEnd(25)} ${'Resultado (%)'.padEnd(12)}`,
  );
  console.log('─'.repeat(100));

  let temProblema = false;
  amostras.forEach(({ rawPremio, rawComissao }) => {
    const premioAtual = parsePremioAtual(rawPremio);
    const premioCorr = parsePremioCorrigido(rawPremio);
    const comissao = parsePercentualPlanilha(rawComissao);

    const diverge = premioAtual !== premioCorr;
    if (diverge) temProblema = true;

    const rawP = rawPremio != null ? String(rawPremio) : '(vazio)';
    const rawC = rawComissao != null ? String(rawComissao) : '(vazio)';
    const marcador = diverge ? ' ⚠️' : '';

    console.log(
      `${rawP.padEnd(25)} ${(premioAtual ?? 'null').padEnd(15)} ${(premioCorr ?? 'null').padEnd(15)}${marcador} | ${rawC.padEnd(25)} ${comissao ?? 'null'}`,
    );
  });

  if (temProblema) {
    console.log(`\n⚠️  ATENÇÃO: há divergência entre parsing atual e corrigido.`);
    console.log(`   Valores com separador de milhar (ex: 1.500,00) estão sendo salvos errados.`);
    console.log(`   A coluna "Atual (bug)" é o que está sendo salvo no banco atualmente.`);
  } else {
    console.log(`\n✅ Nenhuma divergência de parsing detectada nesta amostra.`);
  }

  // ── 4. Resumo de linhas por produto ─────────────────────────────────────
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`4. CONTAGEM POR PRODUTO`);
  console.log(`${'─'.repeat(70)}\n`);

  const contagem = new Map<string, number>();
  rows.forEach((row: any) => {
    const prod = (row[colProduto ?? 'PRODUTO'] || row[colItem ?? 'ITEM'] || '(sem produto)').toString().trim();
    contagem.set(prod, (contagem.get(prod) ?? 0) + 1);
  });

  Array.from(contagem.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([nome, total]) => {
      const match = produtosBanco.length > 0 ? findProdutoId(nome, produtosBanco) : null;
      const matchStr = match ? ` → "${match.nomeProduto}"` : produtosBanco.length > 0 ? ' → SEM MATCH' : '';
      console.log(`  ${String(total).padStart(4)} linhas  "${nome}"${matchStr}`);
    });

  console.log(`\n${'═'.repeat(70)}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
