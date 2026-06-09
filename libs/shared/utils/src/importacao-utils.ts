/**
 * Converte um número serial de data do Excel para string ISO YYYY-MM-DD.
 * Lida com o bug do ano bissexto de 1900 do Excel.
 */
export function excelSerialToDate(serial: number): string {
  const utcDays = Math.floor(serial - 25569);
  const date = new Date(utcDays * 86400 * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converte um valor bruto de célula de vigência para string ISO YYYY-MM-DD.
 * Aceita: serial Excel (5–6 dígitos), DD/MM/AAAA, ou YYYY-MM-DD.
 * Lança Error descritivo para formatos não reconhecidos ou datas fora do intervalo.
 */
export function parseVigencia(raw: string): string {
  const v = raw.toString().trim();
  let result: string;

  if (/^\d{5,6}$/.test(v)) {
    result = excelSerialToDate(Number(v));
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)) {
    const [d, m, a] = v.split('/');
    result = `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    result = v;
  } else {
    throw new Error(
      `Formato não reconhecido: "${v}" — use DD/MM/AAAA ou deixe a célula formatada como data no Excel`,
    );
  }

  const ano = parseInt(result.split('-')[0], 10);
  if (ano < 2000 || ano > 2100) {
    throw new Error(`Data fora do intervalo esperado: ${result} (ano ${ano})`);
  }
  return result;
}

/**
 * Encontra o ID de um produto pelo nome (correspondência bidirecional).
 */
export function findProdutoId(
  nome: string,
  todosProdutos: Array<{ id: string; nomeProduto: string }>,
): string | null {
  if (!nome) return null;
  const nomeLower = nome.toLowerCase();
  const p1 = todosProdutos.find((p) =>
    p.nomeProduto.toLowerCase().includes(nomeLower),
  );
  if (p1) return p1.id;
  const p2 = todosProdutos.find((p) =>
    nomeLower.includes(p.nomeProduto.toLowerCase()),
  );
  return p2?.id ?? null;
}

/**
 * Normaliza valor monetário vindo de célula de planilha para string decimal (ex: "1500.00").
 * Detecta formato BR (ponto=milhar, vírgula=decimal): "1.500,00" → "1500.00".
 * Detecta formato US (vírgula=milhar, ponto=decimal): "1,500.00" → "1500.00".
 * Sem separadores mistos, trata vírgula isolada como decimal BR.
 * Remove símbolos (R$, espaços). Retorna null para vazio, inválido ou negativo.
 */
export function parsePremioLiquido(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  let str = raw.toString().trim();
  if (!str) return null;
  // Remove tudo exceto dígitos, pontos, vírgulas e sinal negativo
  str = str.replace(/[^\d.,\-]/g, '');
  if (str.startsWith('-')) return null;
  if (str.includes(',') && str.includes('.')) {
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');
    if (lastComma > lastDot) {
      // BR: pontos são milhares, vírgula é decimal
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US: vírgulas são milhares
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Só vírgula: decimal BR
    str = str.replace(',', '.');
  }
  const num = parseFloat(str);
  if (isNaN(num) || num < 0) return null;
  return num.toFixed(2);
}

/**
 * Normaliza percentual vindo de célula de planilha para raw percentage (24.00).
 * Célula formatada como "24%" no Excel devolve 0.24 — multiplica por 100.
 * Aceita vírgula decimal ("0,24") e símbolos ("R$", "%"), que são removidos.
 * Retorna null para vazio, inválido ou negativo.
 */
export function parsePercentualPlanilha(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  const asString = raw.toString().trim();
  // Rejeita negativo antes de stripar o sinal (senão "-1" virava "1")
  if (asString.startsWith('-')) return null;
  const str = asString.replace(/[^\d.,]/g, '').replace(',', '.');
  if (!str) return null;
  const num = parseFloat(str);
  if (isNaN(num) || num < 0) return null;
  const normalizado = num > 0 && num < 1 ? num * 100 : num;
  return normalizado.toFixed(2);
}
